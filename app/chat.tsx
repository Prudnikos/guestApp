import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import MessageNotificationService from '@/services/MessageNotificationService';

// --- ИЗМЕНЕНИЕ 1: Обновляем тип Message ---
export interface Message {
  id: number;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_type: 'guest' | 'staff';
}

export default function ChatScreen() {
  const auth = useAuth();
  const user = auth?.user;
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  // --- ИЗМЕНЕНИЕ 2: Переписанная логика загрузки ---
  useEffect(() => {
    const setupConversation = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        // Сначала ищем существующий чат для этого гостя
        const { data: convoData, error: convoError } = await supabase
          .from('conversations')
          .select('id')
          .eq('guest_id', user.id)
          .single();

        if (convoError && convoError.code !== 'PGRST116') { // Игнорируем ошибку "не найдено"
          throw convoError;
        }

        if (convoData) {
          // Если чат найден, загружаем его сообщения
          setConversationId(convoData.id);
          const { data: messageData, error: messageError } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', convoData.id)
            .order('created_at', { ascending: true });

          if (messageError) throw messageError;
          setMessages(messageData || []);
        } else {
          // Если чат не найден, сообщений нет
          setMessages([]);
        }
      } catch (error) {
        console.error('Error setting up conversation:', error);
      } finally {
        setLoading(false);
      }
    };

    setupConversation();
  }, [user]);
  
  // --- ИЗМЕНЕНИЕ 3: Подписка на Real-time ---
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          // Добавляем сообщение, только если его отправил НЕ текущий пользователь
          if (newMessage.sender_id !== user?.id) {
            setMessages((prevMessages) => [...prevMessages, newMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id]);


  // --- ИЗМЕНЕНИЕ 4: Переписанная логика отправки ---
  const handleSend = async () => {
    if (!newMessage.trim() || !user) return;
    
    setSending(true);
    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      let currentConversationId = conversationId;

      // Если чата еще нет, создаем его
      if (!currentConversationId) {
        const { data: newConvo, error: createError } = await supabase
          .from('conversations')
          .insert({ guest_id: user.id, channel: 'guest_app', status: 'active' })
          .select('id')
          .single();
        
        if (createError) throw createError;
        currentConversationId = newConvo.id;
        setConversationId(currentConversationId); // Сохраняем ID для подписки
      }

      // Оптимистичное обновление
      const tempMessage: Message = {
        id: Date.now(),
        conversation_id: currentConversationId!,
        sender_id: user.id,
        content: messageContent,
        created_at: new Date().toISOString(),
        sender_type: 'guest'
      };
      setMessages(prev => [...prev, tempMessage]);
      
      // Отправка в базу
      const { error } = await supabase.from('messages').insert({
        conversation_id: currentConversationId,
        sender_id: user.id,
        content: messageContent,
        sender_type: 'guest'
      });

      if (error) {
        console.error('Supabase message error:', error);
        // Откатываем оптимистичное обновление в случае ошибки
        setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
      } else {
        // Отправляем push-уведомление менеджерам отеля
        // Получаем имя гостя из профиля
        const { data: profileData } = await supabase
          .from('users')
          .select('email')
          .eq('id', user.id)
          .single();
        
        const guestName = profileData?.email?.split('@')[0] || 'Guest';
        
        await MessageNotificationService.notifyHotelStaffNewMessage(
          user.id,
          guestName,
          messageContent,
          currentConversationId!
        );
      }
    } catch (error) {
      console.error('Unexpected error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // --- ИЗМЕНЕНИЕ 5: Упрощаем рендер, используя sender_id ---
  const renderMessage = ({ item }: { item: Message }) => {
    const isUserMessage = item.sender_id === user?.id;
    return (
      <View style={[styles.messageContainer, isUserMessage ? styles.userMessage : styles.staffMessage]}>
        <Text style={[styles.messageText, !isUserMessage && styles.staffMessageText]}>{item.content}</Text>
        <Text style={[styles.messageTime, !isUserMessage && styles.staffMessageTime]}>{formatTime(item.created_at)}</Text>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Chat with Support', headerBackTitle: 'Back' }} />
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1a2b47" />
          </View>
        ) : (
          <>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={styles.messagesContainer}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Start a conversation with our support team</Text>
                </View>
              }
            />
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Type a message..."
                value={newMessage}
                onChangeText={setNewMessage}
                multiline
              />
              <TouchableOpacity 
                style={styles.sendButton}
                onPress={handleSend}
                disabled={!newMessage.trim() || sending}
              >
                {sending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{color: '#fff'}}>→</Text>}
              </TouchableOpacity>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  // ... ваши стили остаются без изменений ...
  container: { flex: 1, backgroundColor: '#f7f9fc' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messagesContainer: { padding: 15, paddingBottom: 20 },
  messageContainer: { maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 10 },
  userMessage: { backgroundColor: '#1a2b47', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  staffMessage: { backgroundColor: '#fff', alignSelf: 'flex-start', borderBottomLeftRadius: 4, elevation: 2 },
  messageText: { fontSize: 16, color: '#fff', marginBottom: 5 },
  staffMessageText: { color: '#1a2b47' },
  messageTime: { fontSize: 12, color: 'rgba(255, 255, 255, 0.7)', alignSelf: 'flex-end' },
  staffMessageTime: { color: '#8a94a6' },
  inputContainer: { flexDirection: 'row', padding: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e1e5eb' },
  input: { flex: 1, backgroundColor: '#f0f2f5', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, maxHeight: 100, fontSize: 16 },
  sendButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1a2b47', justifyContent: 'center', alignItems: 'center', marginLeft: 10, alignSelf: 'flex-end' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyText: { fontSize: 18, fontWeight: '500', color: '#1a2b47', marginBottom: 10 },
});