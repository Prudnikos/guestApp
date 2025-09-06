// Безопасная обертка для push-уведомлений
// Автоматически определяет окружение и отключает push в Expo Go

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

// Проверяем, работаем ли мы в Expo Go
const isExpoGo = Constants.appOwnership === 'expo' || !Constants.executionEnvironment?.startsWith('standalone');

class SafePushNotificationService {
  
  static async registerForPushNotifications() {
    if (isExpoGo) {
      console.log('📵 Push notifications disabled in Expo Go. Using fallback.');
      return null;
    }
    
    // Если это dev build, используем настоящие push
    const { PushNotificationService } = await import('./pushNotifications');
    return PushNotificationService.registerForPushNotifications();
  }
  
  static async saveGuestPushToken(guestId: string) {
    if (isExpoGo) {
      console.log('📵 Mock token saved for testing in Expo Go');
      return;
    }
    
    const { PushNotificationService } = await import('./pushNotifications');
    return PushNotificationService.saveGuestPushToken(guestId);
  }
  
  static subscribeToMessages(guestId: string, onMessage: (message: any) => void) {
    if (isExpoGo) {
      console.log('📵 Using polling for messages in Expo Go');
      // Можно добавить polling для получения сообщений
      return () => {}; // Возвращаем пустую функцию отписки
    }
    
    return import('./pushNotifications').then(({ PushNotificationService }) => {
      return PushNotificationService.subscribeToMessages(guestId, onMessage);
    });
  }
  
  static async handleIncomingNotification(notification: any) {
    if (isExpoGo) return;
    
    const { PushNotificationService } = await import('./pushNotifications');
    return PushNotificationService.handleIncomingNotification(notification);
  }
  
  static async getLastNotificationResponse() {
    if (isExpoGo) return null;
    
    const { PushNotificationService } = await import('./pushNotifications');
    return PushNotificationService.getLastNotificationResponse();
  }
  
  static async clearAllNotifications() {
    if (isExpoGo) return;
    
    const { PushNotificationService } = await import('./pushNotifications');
    return PushNotificationService.clearAllNotifications();
  }
  
  static async setBadgeCount(count: number) {
    if (isExpoGo) return;
    
    const { PushNotificationService } = await import('./pushNotifications');
    return PushNotificationService.setBadgeCount(count);
  }
  
  static async scheduleCheckInReminder(checkInDate: Date, roomNumber: string) {
    if (isExpoGo) {
      console.log('📵 Check-in reminder scheduled (mock)');
      return;
    }
    
    const { PushNotificationService } = await import('./pushNotifications');
    return PushNotificationService.scheduleCheckInReminder(checkInDate, roomNumber);
  }
}

// Экспортируем интерфейсы для совместимости
export enum NotificationType {
  BOOKING_CONFIRMED = 'booking_confirmed',
  CHECK_IN_REMINDER = 'check_in_reminder', 
  ROOM_READY = 'room_ready',
  NEW_MESSAGE = 'new_message',
  ORDER_READY = 'order_ready',
  SERVICE_CONFIRMED = 'service_confirmed',
  COMPLAINT_RESPONSE = 'complaint_response',
}

export const PushNotificationService = SafePushNotificationService;
export default SafePushNotificationService;