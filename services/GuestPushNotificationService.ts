import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import Constants from 'expo-constants';

// Импортируем expo-notifications безопасно
let Notifications: any;
try {
  Notifications = require('expo-notifications');
  
  // Настройка обработчика уведомлений только если доступно
  if (Notifications && Notifications.setNotificationHandler) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }
} catch (error) {
  console.log('📵 expo-notifications not available');
}

export interface NotificationData {
  type: 'booking_confirmed' | 'message_reply' | 'check_in_reminder' | 'special_offer' | 'service_update';
  bookingId?: string;
  conversationId?: string;
  messageId?: string;
  title?: string;
  message?: string;
}

class GuestPushNotificationService {
  
  /**
   * Запрос разрешения и регистрация push токена
   */
  static async registerForPushNotifications(): Promise<string | null> {
    try {
      // Проверяем доступность Notifications
      if (!Notifications) {
        console.log('📵 expo-notifications not available');
        return null;
      }

      // Проверяем, что это физическое устройство
      if (!Device.isDevice) {
        console.log('⚠️ Push notifications work only on physical devices');
        return null;
      }

      // Проверяем и запрашиваем разрешение
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('❌ Permission for push notifications not granted');
        return null;
      }

      // Получаем Push токен
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        console.error('❌ EAS projectId not found in app.json');
        return null;
      }

      const tokenResponse = await Notifications.getExpoPushTokenAsync({
        projectId: projectId
      });
      
      const token = tokenResponse.data;
      console.log('✅ Push token obtained:', token);

      // Настраиваем канал для Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          enableVibrate: true,
          enableLights: true,
          showBadge: true,
        });

        // Канал для сообщений
        await Notifications.setNotificationChannelAsync('messages', {
          name: 'Сообщения',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          enableVibrate: true,
          enableLights: true,
          showBadge: true,
        });

        // Канал для бронирований
        await Notifications.setNotificationChannelAsync('bookings', {
          name: 'Бронирования',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 500, 500, 500],
          lightColor: '#1a2b47',
          enableVibrate: true,
          enableLights: true,
          showBadge: true,
        });
      }

      return token;
    } catch (error) {
      console.error('❌ Error registering for push notifications:', error);
      return null;
    }
  }

  /**
   * Сохранение токена в базе данных
   */
  static async saveTokenToDatabase(token: string, guestId: string) {
    try {
      // Сначала проверяем, есть ли уже такой токен
      const { data: existingToken } = await supabase
        .from('push_tokens')
        .select('id')
        .eq('token', token)
        .eq('user_id', guestId)
        .single();

      if (existingToken) {
        console.log('✅ Push token already saved');
        return;
      }

      // Сохраняем новый токен
      const { error } = await supabase
        .from('push_tokens')
        .insert({
          token: token,
          user_id: guestId,
          user_type: 'guest',
          platform: Platform.OS,
          device_info: {
            brand: Device.brand,
            model: Device.modelName,
            os: Device.osName,
            osVersion: Device.osVersion,
          },
          created_at: new Date().toISOString(),
          last_used_at: new Date().toISOString()
        });

      if (error) {
        console.error('❌ Error saving push token:', error);
      } else {
        console.log('✅ Push token saved to database');
      }
    } catch (error) {
      console.error('❌ Error saving push token:', error);
    }
  }

  /**
   * Удаление токена при выходе
   */
  static async removeToken(guestId: string) {
    try {
      const { error } = await supabase
        .from('push_tokens')
        .delete()
        .eq('user_id', guestId)
        .eq('user_type', 'guest');

      if (error) {
        console.error('❌ Error removing push token:', error);
      } else {
        console.log('✅ Push token removed');
      }
    } catch (error) {
      console.error('❌ Error removing push token:', error);
    }
  }

  /**
   * Локальное уведомление о подтверждении бронирования
   */
  static async sendBookingConfirmationNotification(bookingData: {
    bookingId: string;
    roomNumber: string;
    checkIn: string;
    checkOut: string;
    totalPrice: number;
    currency?: string;
  }) {
    if (!Notifications) {
      console.log('📵 Cannot send notification - module not available');
      return;
    }
    
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '✅ Бронирование подтверждено!',
          body: `Номер ${bookingData.roomNumber} • ${bookingData.checkIn} - ${bookingData.checkOut}\nСумма: ${bookingData.totalPrice} ${bookingData.currency || 'GBP'}`,
          data: {
            type: 'booking_confirmed',
            bookingId: bookingData.bookingId
          } as NotificationData,
          categoryIdentifier: 'bookings',
          sound: 'default',
          badge: 1,
        },
        trigger: { seconds: 1 },
      });

      console.log('✅ Booking confirmation notification sent');
    } catch (error) {
      console.error('❌ Error sending booking notification:', error);
    }
  }

  /**
   * Уведомление об ответе на сообщение
   */
  static async sendMessageReplyNotification(messageData: {
    conversationId: string;
    messageId: string;
    senderName: string;
    message: string;
    roomNumber?: string;
  }) {
    if (!Notifications) {
      console.log('📵 Cannot send notification - module not available');
      return;
    }
    
    try {
      // Регистрируем действия для iOS
      await this.registerMessageActions();

      const title = `💬 ${messageData.senderName}`;
      const subtitle = messageData.roomNumber ? `Номер ${messageData.roomNumber}` : undefined;
      const body = messageData.message.length > 150 
        ? messageData.message.substring(0, 150) + '...' 
        : messageData.message;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: title,
          subtitle: subtitle,
          body: body,
          data: {
            type: 'message_reply',
            conversationId: messageData.conversationId,
            messageId: messageData.messageId
          } as NotificationData,
          categoryIdentifier: 'MESSAGE_NOTIFICATION',
          sound: 'default',
          badge: 1,
        },
        trigger: { seconds: 1 },
      });

      console.log('✅ Message reply notification sent');
    } catch (error) {
      console.error('❌ Error sending message notification:', error);
    }
  }

  /**
   * Регистрация действий для сообщений (iOS)
   */
  private static async registerMessageActions() {
    if (!Notifications) {
      return;
    }
    
    try {
      await Notifications.setNotificationCategoryAsync('MESSAGE_NOTIFICATION', [
        {
          identifier: 'REPLY',
          buttonTitle: 'Ответить',
          options: {
            opensAppToForeground: false,
            isAuthenticationRequired: false,
          },
          textInput: {
            submitButtonTitle: 'Отправить',
            placeholder: 'Введите ответ...'
          }
        },
        {
          identifier: 'VIEW',
          buttonTitle: 'Открыть чат',
          options: {
            opensAppToForeground: true,
            isAuthenticationRequired: false,
          }
        }
      ]);
    } catch (error) {
      console.error('Error registering notification actions:', error);
    }
  }

  /**
   * Напоминание о заселении
   */
  static async scheduleCheckInReminder(bookingData: {
    bookingId: string;
    roomNumber: string;
    checkInTime: Date;
  }) {
    if (!Notifications) {
      console.log('📵 Cannot schedule reminder - module not available');
      return;
    }
    
    try {
      // Планируем уведомление за день до заселения
      const reminderDate = new Date(bookingData.checkInTime);
      reminderDate.setDate(reminderDate.getDate() - 1);
      reminderDate.setHours(10, 0, 0, 0); // 10:00 утра

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🏨 Напоминание о заселении',
          body: `Завтра вы заселяетесь в номер ${bookingData.roomNumber}. Время заселения с 14:00.`,
          data: {
            type: 'check_in_reminder',
            bookingId: bookingData.bookingId
          } as NotificationData,
          categoryIdentifier: 'bookings',
          sound: 'default',
        },
        trigger: reminderDate,
      });

      console.log('✅ Check-in reminder scheduled');
    } catch (error) {
      console.error('❌ Error scheduling check-in reminder:', error);
    }
  }

  /**
   * Обработка ответа на уведомление
   */
  static async handleNotificationResponse(response: Notifications.NotificationResponse) {
    const { actionIdentifier, notification } = response;
    const data = notification.request.content.data as NotificationData;

    console.log('📱 Handling notification action:', actionIdentifier);

    switch (actionIdentifier) {
      case 'REPLY':
        // Обработка быстрого ответа
        const replyText = (response as any).userText;
        if (replyText && data.conversationId) {
          await this.sendQuickReply(data.conversationId, replyText);
        }
        break;

      case 'VIEW':
        // Открытие чата - обрабатывается в навигации
        console.log('Opening chat:', data.conversationId);
        break;

      default:
        // Обычное нажатие на уведомление
        console.log('Notification tapped:', data.type);
        break;
    }
  }

  /**
   * Отправка быстрого ответа
   */
  private static async sendQuickReply(conversationId: string, replyText: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No authenticated user for reply');
        return;
      }

      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          sender_type: 'guest',
          content: replyText,
          is_read: false,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error sending quick reply:', error);
      } else {
        console.log('✅ Quick reply sent');
        
        // Показываем подтверждение
        if (Notifications) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: '✅ Ответ отправлен',
              body: replyText.length > 50 ? replyText.substring(0, 50) + '...' : replyText,
              sound: null,
            },
            trigger: { seconds: 1 },
          });
        }
      }
    } catch (error) {
      console.error('Error in sendQuickReply:', error);
    }
  }

  /**
   * Очистка всех уведомлений
   */
  static async clearAllNotifications() {
    if (!Notifications) {
      return;
    }
    
    await Notifications.dismissAllNotificationsAsync();
    await Notifications.setBadgeCountAsync(0);
  }

  /**
   * Отмена запланированных уведомлений
   */
  static async cancelAllScheduledNotifications() {
    if (!Notifications) {
      return;
    }
    
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
}

export default GuestPushNotificationService;