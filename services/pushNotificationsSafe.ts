// Безопасная обертка для push-уведомлений
// Работает как в Expo Go, так и в dev builds

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';

// Проверяем, доступны ли push-уведомления
const isPushAvailable = () => {
  // Push работают только на реальных устройствах
  if (!Device.isDevice) {
    return false;
  }
  
  // В Expo Go с SDK 51+ push не работают
  const isExpoGo = Constants.appOwnership === 'expo';
  if (isExpoGo && Platform.OS === 'android') {
    console.log('⚠️ Push notifications disabled in Expo Go. Use development build for full functionality.');
    return false;
  }
  
  return true;
};

class SafePushNotificationService {
  static async saveGuestPushToken(guestId: string) {
    if (!isPushAvailable()) {
      console.log('📵 Push notifications not available in current environment');
      return;
    }
    
    // Динамически импортируем только если доступно
    try {
      const { PushNotificationService } = await import('./pushNotifications');
      await PushNotificationService.saveGuestPushToken(guestId);
    } catch (error) {
      console.log('Push notifications module not available:', error);
    }
  }

  static subscribeToMessages(guestId: string, onMessage: (message: any) => void) {
    if (!isPushAvailable()) {
      console.log('📵 Using fallback messaging without push notifications');
      // Можно добавить альтернативный механизм через polling
      return () => {}; // Возвращаем пустую функцию отписки
    }
    
    // Если push доступны, используем полную версию
    return import('./pushNotifications').then(({ PushNotificationService }) => {
      return PushNotificationService.subscribeToMessages(guestId, onMessage);
    }).catch(() => {
      return () => {};
    });
  }

  static async handleIncomingNotification(notification: any) {
    if (!isPushAvailable()) return;
    
    try {
      const { PushNotificationService } = await import('./pushNotifications');
      await PushNotificationService.handleIncomingNotification(notification);
    } catch (error) {
      console.log('Cannot handle notification:', error);
    }
  }

  static async handleNotificationResponse(response: any) {
    if (!isPushAvailable()) return;
    
    try {
      const { PushNotificationService } = await import('./pushNotifications');
      await PushNotificationService.handleNotificationResponse(response);
    } catch (error) {
      console.log('Cannot handle notification response:', error);
    }
  }

  static async getLastNotificationResponse() {
    if (!isPushAvailable()) return null;
    
    try {
      const { PushNotificationService } = await import('./pushNotifications');
      return await PushNotificationService.getLastNotificationResponse();
    } catch (error) {
      console.log('Cannot get last notification:', error);
      return null;
    }
  }
}

export default SafePushNotificationService;