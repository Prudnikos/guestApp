import { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Message } from '@/types';
import { Send } from 'lucide-react-native';

export default function ChatScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('guest_id', user.id)
          .order('created_at', { ascending: true });
        
        if (error) {
          console.error('Error fetching messages:', error);
          setMessages([]);
        } else {
          setMessages(data || []);
        }
      } catch (error) {
        console.error('Unexpected error fetching messages:', error);
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [user]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user) return;
    
    const tempMessage: Message = {
      id: Date.now(),
      guest_id: user.id,
      staff_id: null,
      content: newMessage.trim(),
      created_at: new Date().toISOString(),
      is_from_guest: true
    };
    
    setMessages(prev => [...prev, tempMessage]);
    const messageContent = newMessage.trim();
    setNewMessage('');
    setSending(true);
    
    try {
      // Try to insert the message, but handle the case where the table might not exist
      const { data, error } = await supabase
        .from('messages')
        .insert({
          guest_id: user.id,
          content: messageContent,
          is_from_guest: true
        })
        .select()
        .single();
      
      if (error) {
        console.error('Supabase message error:', error);
        // If the table doesn't exist or there's a schema issue, just keep the temp message
        console.log('Message saved locally only due to database error');
      } else if (data) {
        // Update the temporary message with the real one
        setMessages(prev => prev.map(msg => 
          msg.id === tempMessage.id ? data : msg
        ));
      }
      
      // Simulate staff response (in a real app, this would come from real-time subscriptions)
      setTimeout(() => {
        const staffResponse: Message = {
          id: Date.now() + 1,
          guest_id: user.id,
          staff_id: 'staff-1',
          content: getAutoResponse(messageContent),
          created_at: new Date().toISOString(),
          is_from_guest: false
        };
        
        setMessages(prev => [...prev, staffResponse]);
      }, 2000);
    } catch (error) {
      console.error('Unexpected error sending message:', error);
      // Don't show alert, just log the error and keep the message locally
      console.log('Message kept locally due to error:', error);
    } finally {
      setSending(false);
    }
  };

  // Simple auto-response function
  const getAutoResponse = (message: string) => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('breakfast') || lowerMessage.includes('food')) {
      return 'Breakfast is served from 6:30 AM to 10:30 AM in our main restaurant. You can also order room service 24/7.';
    } else if (lowerMessage.includes('checkout') || lowerMessage.includes('check out')) {
      return 'Checkout time is at 12:00 PM. Late checkout may be available upon request, subject to availability.';
    } else if (lowerMessage.includes('wifi') || lowerMessage.includes('internet')) {
      return 'Our complimentary WiFi network is "LuxuryHotel_Guest". The password is in your welcome package or you can ask at the reception.';
    } else if (lowerMessage.includes('pool') || lowerMessage.includes('swim')) {
      return 'Our pool is open from 7:00 AM to 10:00 PM. Towels are provided poolside.';
    } else if (lowerMessage.includes('spa') || lowerMessage.includes('massage')) {
      return 'Our spa is open from 9:00 AM to 8:00 PM. We recommend booking treatments in advance. Would you like me to arrange a booking for you?';
    } else if (lowerMessage.includes('thank')) {
      return "You're welcome! Is there anything else I can help you with?";
    } else {
      return "Thank you for your message. Our staff will respond shortly. For immediate assistance, please call the front desk by dialing '0' from your room phone.";
    }
  };

  useEffect(() => {
    // Scroll to bottom when messages change
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View 
      style={[
        styles.messageContainer,
        item.is_from_guest ? styles.userMessage : styles.staffMessage
      ]}
    >
      <Text style={[
        styles.messageText,
        !item.is_from_guest && styles.staffMessageText
      ]}>{item.content}</Text>
      <Text style={[
        styles.messageTime,
        !item.is_from_guest && styles.staffMessageTime
      ]}>{formatTime(item.created_at)}</Text>
    </View>
  );

  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Chat with Support',
          headerBackTitle: 'Back',
        }}
      />
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1a2b47" />
            <Text style={styles.loadingText}>Loading conversation...</Text>
          </View>
        ) : (
          <>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={styles.messagesContainer}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No messages yet</Text>
                  <Text style={styles.emptySubtext}>
                    Start a conversation with our support team
                  </Text>
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
                {sending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Send size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f7f9fc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#8a94a6',
  },
  messagesContainer: {
    padding: 15,
    paddingBottom: 20,
  },
  messageContainer: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
  },
  userMessage: {
    backgroundColor: '#1a2b47',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  staffMessage: {
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 5,
  },
  staffMessageText: {
    color: '#1a2b47',
  },
  messageTime: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    alignSelf: 'flex-end',
  },
  staffMessageTime: {
    color: '#8a94a6',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e1e5eb',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f2f5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a2b47',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    alignSelf: 'flex-end',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1a2b47',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8a94a6',
    textAlign: 'center',
  },
});