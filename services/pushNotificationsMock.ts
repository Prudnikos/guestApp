// Mock версия push-уведомлений для тестирования без dev build
// Показывает уведомления через Alert вместо push

import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';

export enum NotificationType {
  BOOKING_CONFIRMED = 'booking_confirmed',
  CHECK_IN_REMINDER = 'check_in_reminder',
  ROOM_READY = 'room_ready',
  NEW_MESSAGE = 'new_message',
  ORDER_READY = 'order_ready',
  SERVICE_CONFIRMED = 'service_confirmed',
  COMPLAINT_RESPONSE = 'complaint_response',
}

export class PushNotificationService {
  private static mockToken = `MockPushToken_${Date.now()}`;
  
  // Имитация регистрации для push
  static async registerForPushNotifications() {
    console.log('📱 MOCK: Push registration (using alerts instead)');
    return this.mockToken;
  }

  // Сохранение токена гостя в базе данных
  static async saveGuestPushToken(guestId: string) {
    console.log('💾 MOCK: Saving push token for guest:', guestId);
    
    try {
      // Сохраняем mock токен в БД для тестирования
      await supabase
        .from('push_tokens')
        .delete()
        .eq('user_id', guestId)
        .eq('platform', 'mock');
      
      const { error } = await supabase
        .from('push_tokens')
        .insert({
          user_id: guestId,
          token: this.mockToken,
          user_type: 'guest',
          platform: 'mock',
          created_at: new Date().toISOString(),
          last_active: new Date().toISOString()
        });
      
      if (error) throw error;
      console.log('✅ MOCK: Token saved');
    } catch (error) {
      console.error('Error saving mock token:', error);
    }
  }

  // Подписка на уведомления с использованием realtime
  static subscribeToMessages(guestId: string, onMessage: (message: any) => void) {
    console.log('📨 MOCK: Subscribing to messages for guest:', guestId);
    
    // Подписываемся на realtime события
    const channel = supabase
      .channel(`guest-messages-${guestId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=in.(SELECT id FROM conversations WHERE guest_id='${guestId}')`
      }, (payload) => {
        // Показываем Alert вместо push
        if (payload.new.sender_type === 'staff') {
          Alert.alert(
            '💬 Новое сообщение от отеля',
            payload.new.content.substring(0, 100),
            [
              { text: 'Закрыть', style: 'cancel' },
              { text: 'Открыть чат', onPress: () => onMessage(payload.new) }
            ]
          );
        }
      })
      .subscribe();

    // Возвращаем функцию отписки
    return () => {
      supabase.removeChannel(channel);
    };
  }

  // Обработка входящих уведомлений (mock)
  static async handleIncomingNotification(notification: any) {
    console.log('📱 MOCK: Handling notification:', notification);
  }

  // Получение последнего уведомления
  static async getLastNotificationResponse() {
    return null;
  }

  // Очистка всех уведомлений
  static async clearAllNotifications() {
    console.log('🧹 MOCK: Clearing notifications');
  }

  // Установка счетчика на иконке приложения
  static async setBadgeCount(count: number) {
    console.log('🔢 MOCK: Badge count:', count);
  }

  // Планирование локального уведомления (mock через setTimeout)
  static async scheduleCheckInReminder(checkInDate: Date, roomNumber: string) {
    const reminderDate = new Date(checkInDate);
    reminderDate.setDate(reminderDate.getDate() - 1);
    
    const msUntilReminder = reminderDate.getTime() - Date.now();
    
    if (msUntilReminder > 0) {
      setTimeout(() => {
        Alert.alert(
          '🏨 Напоминание о заселении',
          `Завтра ваше заселение в номер ${roomNumber}. Ждем вас!`,
          [{ text: 'OK' }]
        );
      }, msUntilReminder);
      
      console.log('⏰ MOCK: Check-in reminder scheduled');
    }
  }

  // Показать тестовое уведомление
  static async showTestNotification(type: string, message: string) {
    Alert.alert(
      `🔔 ${type}`,
      message,
      [{ text: 'OK' }]
    );
  }
}

export default PushNotificationService;