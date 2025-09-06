import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList, ActivityIndicator, Image, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
// import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

// Тип для сообщений
interface ChatMessage {
    id: string;
    user_id: string;
    message: string;
    response: string | null;
    created_at: string;
}

const WIDGET_BUTTON_SIZE = 60;
const CHAT_WINDOW_WIDTH = 350;
const CHAT_WINDOW_HEIGHT = 500;
const SCREEN_PADDING = 20;

export function ChatWidget() {
    // Отключаем для веб-платформы из-за проблем с GestureDetector
    if (Platform.OS === 'web') {
        return null;
    }
    
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messageText, setMessageText] = useState('');
    const [history, setHistory] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const flatListRef = useRef<FlatList>(null);
    const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
    
    const translateX = useSharedValue(screenWidth / 2 - WIDGET_BUTTON_SIZE / 2 - SCREEN_PADDING);
    const translateY = useSharedValue(screenHeight / 2 - CHAT_WINDOW_HEIGHT / 1.5 - SCREEN_PADDING);
    const context = useSharedValue({ x: 0, y: 0 });

    // Загрузка истории при открытии
    useEffect(() => {
        if (isOpen && user) {
            const loadHistory = async () => {
                const { data, error } = await supabase
                    .from('chat_messages')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: true });

                if (error) console.error("Error loading AI history:", error);
                else setHistory(data || []);
            };
            loadHistory();
        }
    }, [isOpen, user]);
    
    // Отправка сообщения
    const handleSendMessage = async () => {
        if (!messageText.trim() || !user) return;

        const userMessage = messageText.trim();
        setMessageText('');
        setLoading(true);

        const tempId = `temp-${Date.now()}`;
        const optimisticMessage: ChatMessage = {
            id: tempId,
            user_id: user.id,
            message: userMessage,
            response: '...',
            created_at: new Date().toISOString(),
        };
        setHistory(prev => [...prev, optimisticMessage]);

        try {
            const response = await fetch('https://moody-apples-stay.loca.lt/webhook-test/f1a7c5c4-2a81-40f3-9552-39ce8c4e55b0', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMessage, userId: user.id })
            });

            if (!response.ok) throw new Error(`Webhook failed: ${response.status}`);
            
            const aiResponseData = await response.json();
            const aiReply = aiResponseData.reply || 'Sorry, I could not process that.';
            
            const { data: savedMessage, error } = await supabase
                .from('chat_messages')
                .insert({ user_id: user.id, message: userMessage, response: aiReply })
                .select()
                .single();

            if (error) throw error;
            
            setHistory(prev => prev.map(msg => msg.id === tempId ? savedMessage : msg));
        } catch (error) {
            console.error("Error communicating with AI:", error);
            setHistory(prev => prev.filter(msg => msg.id !== tempId));
        } finally {
            setLoading(false);
        }
    };
    
    // Рендер сообщения
    const renderMessage = ({ item }: { item: ChatMessage }) => (
        <View>
            <View style={[styles.messageContainer, styles.userMessage]}>
                <Text style={styles.messageText}>{item.message}</Text>
            </View>
            {item.response && (
                <View style={[styles.messageContainer, styles.staffMessage]}>
                    <Text style={styles.staffMessageText}>{item.response}</Text>
                </View>
            )}
        </View>
    );
    
    // --- НАЧАЛО ИСПРАВЛЕНИЙ: Разделяем жесты ---
    // Жест перетаскивания (будет применяться к шапке и кнопке)
    const panGesture = Gesture.Pan()
        .onStart(() => { context.value = { x: translateX.value, y: translateY.value }; })
        .onUpdate((event) => {
            translateX.value = event.translationX + context.value.x;
            translateY.value = event.translationY + context.value.y;
        })
        .onEnd(() => {
            const widgetWidth = isOpen ? CHAT_WINDOW_WIDTH : WIDGET_BUTTON_SIZE;
            if (translateX.value > 0) {
                translateX.value = withSpring(screenWidth / 2 - widgetWidth / 2 - SCREEN_PADDING);
            } else {
                translateX.value = withSpring(-screenWidth / 2 + widgetWidth / 2 + SCREEN_PADDING);
            }
        });
    
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
    }));
    // --- КОНЕЦ ИСПРАВЛЕНИЙ ---

    if (!user) return null;

    return (
        <Animated.View style={[styles.widgetContainer, animatedStyle]}>
            {!isOpen && (
                <GestureDetector gesture={panGesture}>
                    <TouchableOpacity style={styles.widgetButton} onPress={() => setIsOpen(true)}>
                         <Image
                            source={{ uri: 'https://zbhvwxpvlxqxadqzshfc.supabase.co/storage/v1/object/public/image//0001%206.svg' }}
                            style={styles.widgetIcon}
                        />
                    </TouchableOpacity>
                </GestureDetector>
            )}

            {isOpen && (
                <KeyboardAvoidingView 
                    style={styles.keyboardView}
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                >
                    <View style={styles.chatWindow}>
                        <GestureDetector gesture={panGesture}>
                            <View style={styles.header}>
                                <Text style={styles.headerTitle}>AI Assistant</Text>
                                <TouchableOpacity onPress={() => setIsOpen(false)}><Text style={{color: '#fff'}}>✕</Text></TouchableOpacity>
                            </View>
                        </GestureDetector>
                        
                        <FlatList
                            ref={flatListRef}
                            data={history}
                            renderItem={renderMessage}
                            keyExtractor={item => item.id.toString()}
                            style={styles.messagesArea}
                            contentContainerStyle={{ padding: 10 }}
                            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                        />
                        
                        <View style={styles.inputContainer}>
                            <TextInput style={styles.input} placeholder="Ask the AI..." value={messageText} onChangeText={setMessageText} multiline/>
                            <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage} disabled={loading}>
                                {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{color: '#fff'}}>→</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    widgetContainer: { position: 'absolute', top: '50%', left: '50%', zIndex: 1000 },
    widgetButton: { width: WIDGET_BUTTON_SIZE, height: WIDGET_BUTTON_SIZE, borderRadius: WIDGET_BUTTON_SIZE / 2, marginLeft: -WIDGET_BUTTON_SIZE / 2, marginTop: -WIDGET_BUTTON_SIZE / 2, backgroundColor: '#1a2b47', justifyContent: 'center', alignItems: 'center', elevation: 8 },
    widgetIcon: { width: 35, height: 35 },
    keyboardView: {
        width: CHAT_WINDOW_WIDTH,
        height: CHAT_WINDOW_HEIGHT,
        marginLeft: -CHAT_WINDOW_WIDTH / 2,
        marginTop: -CHAT_WINDOW_HEIGHT / 2,
    },
    chatWindow: { flex: 1, backgroundColor: '#fff', borderRadius: 20, elevation: 10, flexDirection: 'column', overflow: 'hidden' }, // overflow hidden важен
    header: { backgroundColor: '#1a2b47', padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
    messagesArea: { flex: 1, backgroundColor: '#f0f2f5' },
    inputContainer: { flexDirection: 'row', padding: 10, borderTopWidth: 1, borderTopColor: '#e1e5eb', backgroundColor: '#fff' },
    input: { flex: 1, borderWidth: 1, borderColor: '#ccc', borderRadius: 20, paddingHorizontal: 15, paddingVertical: 10, fontSize: 16, maxHeight: 100 },
    sendButton: { marginLeft: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: '#1a2b47', justifyContent: 'center', alignItems: 'center', alignSelf: 'flex-end' },
    messageContainer: { padding: 12, borderRadius: 16, marginBottom: 10, maxWidth: '85%' },
    userMessage: { backgroundColor: '#1a2b47', alignSelf: 'flex-end', borderBottomRightRadius: 4 },
    staffMessage: { backgroundColor: '#fff', alignSelf: 'flex-start', borderBottomLeftRadius: 4, elevation: 1, borderWidth: 1, borderColor: '#e1e5eb' },
    messageText: { color: '#fff', fontSize: 16 },
    staffMessageText: { color: '#000', fontSize: 16 },
});