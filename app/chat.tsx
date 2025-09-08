import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import MessageNotificationService from '@/services/MessageNotificationService';
import { UploadService } from '@/services/uploadService';
import ChatAttachmentPicker from '@/components/ChatAttachmentPicker';
import MessageAttachmentRenderer from '@/components/MessageAttachmentRenderer';
import EmojiPicker from '@/components/EmojiPicker';
import { MessageAttachment } from '@/types';

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
  const [pendingAttachments, setPendingAttachments] = useState<MessageAttachment[]>([]);
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const textInputRef = useRef<any>(null);

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
          
          // Парсим вложения для каждого сообщения
          const messagesWithAttachments = (messageData || []).map(message => ({
            ...message,
            attachments: message.attachments 
              ? (typeof message.attachments === 'string' ? JSON.parse(message.attachments) : message.attachments)
              : []
          }));
          
          setMessages(messagesWithAttachments);
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
          // Парсим вложения
          const messageWithAttachments = {
            ...newMessage,
            attachments: newMessage.attachments 
              ? (typeof newMessage.attachments === 'string' ? JSON.parse(newMessage.attachments as string) : newMessage.attachments)
              : []
          };
          // Добавляем сообщение, только если его отправил НЕ текущий пользователь
          if (newMessage.sender_id !== user?.id) {
            setMessages((prevMessages) => [...prevMessages, messageWithAttachments]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id]);


  // --- ИЗМЕНЕНИЕ 4: Переписанная логика отправки с поддержкой вложений ---
  const handleSend = async () => {
    if ((!newMessage.trim() && pendingAttachments.length === 0) || !user) return;
    
    setSending(true);
    const messageContent = newMessage.trim();
    const attachmentsToSend = [...pendingAttachments];
    
    setNewMessage('');
    setPendingAttachments([]);

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

      // Upload attachments to Supabase Storage first
      let uploadedAttachments = [];
      if (attachmentsToSend.length > 0) {
        console.log('Uploading attachments...');
        uploadedAttachments = await UploadService.uploadMultipleAttachments(attachmentsToSend);
        console.log('Uploaded attachments:', uploadedAttachments);
      }
      
      // Оптимистичное обновление с вложениями
      const tempMessage: Message = {
        id: Date.now(),
        conversation_id: currentConversationId!,
        sender_id: user.id,
        content: messageContent,
        attachments: uploadedAttachments,
        created_at: new Date().toISOString(),
        sender_type: 'guest'
      };
      setMessages(prev => [...prev, tempMessage]);
      
      // Отправка в базу с загруженными вложениями
      const messageData = {
        conversation_id: currentConversationId,
        sender_id: user.id,
        content: messageContent,
        sender_type: 'guest',
        attachments: uploadedAttachments.length > 0 ? JSON.stringify(uploadedAttachments) : null
      };

      const { error } = await supabase.from('messages').insert(messageData);

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
      // Скролл при добавлении новых сообщений
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 300);
    }
  }, [messages]);

  // Скролл к последнему сообщению при завершении загрузки
  useEffect(() => {
    if (!loading && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 500);
    }
  }, [loading]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleAttachmentSelected = (attachment: MessageAttachment) => {
    setPendingAttachments(prev => [...prev, attachment]);
  };

  const handleEmojiSelected = (emoji: string) => {
    console.log('Emoji selected:', emoji);
    console.log('Current message before:', newMessage);
    
    // Прямая установка нового значения
    const updatedText = newMessage + emoji;
    console.log('Setting new text:', updatedText);
    
    // Сначала обновляем state
    setNewMessage(updatedText);
    
    // Затем принудительно устанавливаем значение через native props
    setTimeout(() => {
      if (textInputRef.current) {
        console.log('Setting via nativeProps:', updatedText);
        textInputRef.current.setNativeProps({ text: updatedText });
        textInputRef.current.focus();
      }
    }, 10);
    
    console.log('New message state will be:', updatedText);
  };

  const removePendingAttachment = (attachmentId: string) => {
    setPendingAttachments(prev => prev.filter(att => att.id !== attachmentId));
  };
  
  // --- ИЗМЕНЕНИЕ 5: Рендер сообщений с поддержкой вложений ---
  const renderMessage = ({ item }: { item: Message }) => {
    const isUserMessage = item.sender_id === user?.id;
    return (
      <View style={[styles.messageContainer, isUserMessage ? styles.userMessage : styles.staffMessage]}>
        {/* Рендерим вложения если есть */}
        {item.attachments?.map((attachment) => (
          <MessageAttachmentRenderer
            key={attachment.id}
            attachment={attachment}
            isUserMessage={isUserMessage}
          />
        ))}
        
        {/* Рендерим текст если есть */}
        {item.content.trim() && (
          <Text style={[styles.messageText, !isUserMessage && styles.staffMessageText]}>
            {item.content}
          </Text>
        )}
        
        <Text style={[styles.messageTime, !isUserMessage && styles.staffMessageTime]}>
          {formatTime(item.created_at)}
        </Text>
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
            
            {/* Pending Attachments Preview */}
            {pendingAttachments.length > 0 && (
              <View style={styles.attachmentPreviewContainer}>
                <FlatList
                  horizontal
                  data={pendingAttachments}
                  keyExtractor={(item) => item.id}
                  showsHorizontalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <View style={styles.attachmentPreview}>
                      <MessageAttachmentRenderer
                        attachment={item}
                        isUserMessage={true}
                      />
                      <TouchableOpacity
                        style={styles.removeAttachmentButton}
                        onPress={() => removePendingAttachment(item.id)}
                      >
                        <Ionicons name="close" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  )}
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <TouchableOpacity
                style={styles.attachButton}
                onPress={() => setShowAttachmentPicker(true)}
              >
                <Ionicons name="attach" size={22} color="#8a94a6" />
              </TouchableOpacity>

              <TextInput
                ref={textInputRef}
                style={styles.input}
                placeholder="Type a message..."
                value={newMessage}
                onChangeText={setNewMessage}
                multiline
              />

              <TouchableOpacity
                style={styles.emojiButton}
                onPress={() => setShowEmojiPicker(true)}
              >
                <Ionicons name="happy" size={22} color="#8a94a6" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.sendButton}
                onPress={handleSend}
                disabled={(!newMessage.trim() && pendingAttachments.length === 0) || sending}
              >
                {sending ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
              </TouchableOpacity>
            </View>

            {/* Attachment Picker Modal */}
            <ChatAttachmentPicker
              visible={showAttachmentPicker}
              onAttachmentSelected={handleAttachmentSelected}
              onClose={() => setShowAttachmentPicker(false)}
            />

            {/* Emoji Picker Modal */}
            <EmojiPicker
              visible={showEmojiPicker}
              onEmojiSelected={handleEmojiSelected}
              onClose={() => setShowEmojiPicker(false)}
            />
          </>
        )}
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f7f9fc' 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  messagesContainer: { 
    padding: 15, 
    paddingBottom: 20 
  },
  messageContainer: { 
    maxWidth: '80%', 
    padding: 12, 
    borderRadius: 16, 
    marginBottom: 10 
  },
  userMessage: { 
    backgroundColor: '#1a2b47', 
    alignSelf: 'flex-end', 
    borderBottomRightRadius: 4 
  },
  staffMessage: { 
    backgroundColor: '#fff', 
    alignSelf: 'flex-start', 
    borderBottomLeftRadius: 4, 
    elevation: 2 
  },
  messageText: { 
    fontSize: 16, 
    color: '#fff', 
    marginBottom: 5 
  },
  staffMessageText: { 
    color: '#1a2b47' 
  },
  messageTime: { 
    fontSize: 12, 
    color: 'rgba(255, 255, 255, 0.7)', 
    alignSelf: 'flex-end' 
  },
  staffMessageTime: { 
    color: '#8a94a6' 
  },
  
  // Attachment preview styles
  attachmentPreviewContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e1e5eb',
    paddingVertical: 12,
    paddingHorizontal: 16,
    maxHeight: 120,
  },
  attachmentPreview: {
    position: 'relative',
    marginRight: 12,
  },
  removeAttachmentButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f44336',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },

  // Input container styles  
  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'flex-end',
    padding: 12, 
    backgroundColor: '#fff', 
    borderTopWidth: 1, 
    borderTopColor: '#e1e5eb' 
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f2f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  input: { 
    flex: 1, 
    backgroundColor: '#f0f2f5', 
    borderRadius: 20, 
    paddingHorizontal: 15, 
    paddingVertical: 10, 
    maxHeight: 100, 
    fontSize: 16,
    marginHorizontal: 4,
  },
  emojiButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f2f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#1a2b47', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginLeft: 8 
  },
  
  emptyContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    paddingTop: 100 
  },
  emptyText: { 
    fontSize: 18, 
    fontWeight: '500', 
    color: '#1a2b47', 
    marginBottom: 10 
  },
});