import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

// Импортируем expo-notifications, но НЕ вызываем setNotificationHandler глобально
let Notifications: any;
try {
  Notifications = require('expo-notifications');
} catch (error) {
  console.log('📵 expo-notifications not available');
}

// Типы уведомлений для гостей
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
  private static realtimeChannel: RealtimeChannel | null = null;
  private static notificationCache = new Map<string, number>();
  private static notificationHandlerSet = false;

  // Инициализация обработчика уведомлений (вызывается только при необходимости)
  private static initializeNotificationHandler() {
    if (!this.notificationHandlerSet && Notifications && Notifications.setNotificationHandler) {
      try {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        });
        this.notificationHandlerSet = true;
      } catch (error) {
        console.log('Cannot set notification handler:', error);
      }
    }
  }

  // Регистрация устройства для получения уведомлений
  static async registerForPushNotifications() {
    let token;

    if (!Device.isDevice) {
      console.log('Push notifications работают только на реальных устройствах');
      return;
    }

    if (!Notifications) {
      console.log('📵 Notifications module not available');
      return;
    }

    // Инициализируем обработчик только когда нужно
    this.initializeNotificationHandler();

    // Запрашиваем разрешения
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log('📱 Current permission status:', existingStatus);
    
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      console.log('🔔 Requesting push notification permissions...');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log('📱 New permission status:', finalStatus);
    }
    
    if (finalStatus !== 'granted') {
      console.log('❌ Push notifications permission denied by user');
      alert('Для получения уведомлений о сообщениях и бронированиях, пожалуйста, разрешите уведомления в настройках.');
      return;
    }
    
    console.log('✅ Push notifications permission granted');

    // Получаем Expo Push Token
    try {
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      console.log('Push token:', token);
    } catch (error) {
      console.error('Ошибка получения push token:', error);
      return;
    }

    // Настраиваем канал для Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });

      // Дополнительный канал для сообщений
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Messages',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
      });
    }

    return token;
  }

  // Сохранение токена гостя в базе данных
  static async saveGuestPushToken(guestId: string) {
    const token = await this.registerForPushNotifications();
    
    if (!token) return;

    try {
      // Сначала удаляем старые токены для этого пользователя и устройства
      await supabase
        .from('push_tokens')
        .delete()
        .eq('user_id', guestId)
        .eq('platform', Platform.OS);
      
      // Сохраняем новый токен
      const { error } = await supabase
        .from('push_tokens')
        .insert({
          user_id: guestId,
          token: token,
          user_type: 'guest',
          platform: Platform.OS,
          created_at: new Date().toISOString(),
          last_active: new Date().toISOString()
        });
      
      if (error) throw error;
      console.log('Push token гостя сохранен успешно:', token);
    } catch (error) {
      console.error('Ошибка сохранения push token:', error);
    }
  }

  // Подписка на realtime события для гостя
  static async subscribeToRealtimeEvents(guestId: string) {
    try {
      // Отписываемся от предыдущих подписок
      if (this.realtimeChannel) {
        await supabase.removeChannel(this.realtimeChannel);
      }

      // Создаем новый канал для realtime
      this.realtimeChannel = supabase
        .channel(`guest-${guestId}-${Date.now()}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=in.(SELECT id FROM conversations WHERE guest_id='${guestId}')`
        }, async (payload) => {
          console.log('📨 Новое сообщение получено:', payload);
          
          // Проверяем, что это сообщение от отеля (staff)
          if (payload.new.sender_type === 'staff') {
            // Проверяем кэш, чтобы избежать дубликатов
            const messageId = payload.new.id;
            const now = Date.now();
            const lastSent = this.notificationCache.get(messageId);
            
            if (!lastSent || now - lastSent > 5000) { // 5 секунд дебаунс
              this.notificationCache.set(messageId, now);
              
              // Получаем информацию о чате
              const { data: conversation } = await supabase
                .from('conversations')
                .select('*')
                .eq('id', payload.new.conversation_id)
                .single();
              
              // Отправляем локальное уведомление
              await this.sendMessageNotification({
                messageId: payload.new.id,
                conversationId: payload.new.conversation_id,
                message: payload.new.content,
                senderName: 'Администратор отеля',
                roomNumber: conversation?.room_number
              });
            }
          }
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `guest_id=eq.${guestId}`
        }, async (payload) => {
          console.log('📋 Обновление бронирования:', payload);
          
          // Уведомление об изменении статуса бронирования
          if (payload.new.status === 'confirmed' && payload.old.status !== 'confirmed') {
            await this.sendBookingConfirmationNotification({
              bookingId: payload.new.id,
              roomNumber: payload.new.room_number,
              checkIn: payload.new.check_in,
              checkOut: payload.new.check_out,
              totalPrice: payload.new.total_price
            });
          }
        })
        .subscribe((status) => {
          console.log('📡 Realtime subscription status:', status);
        });

      return () => {
        // Функция отписки
        if (this.realtimeChannel) {
          supabase.removeChannel(this.realtimeChannel);
        }
      };
    } catch (error) {
      console.error('❌ Ошибка подписки на realtime:', error);
      return () => {};
    }
  }

  // Отправка уведомления о новом сообщении
  static async sendMessageNotification(data: {
    messageId: string;
    conversationId: string;
    message: string;
    senderName: string;
    roomNumber?: string;
  }) {
    try {
      // Регистрируем действия для iOS
      await this.registerMessageActions();

      const title = `💬 ${data.senderName}`;
      const subtitle = data.roomNumber ? `Номер ${data.roomNumber}` : undefined;
      const body = data.message.length > 150 
        ? data.message.substring(0, 150) + '...' 
        : data.message;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: title,
          subtitle: subtitle,
          body: body,
          data: {
            type: NotificationType.NEW_MESSAGE,
            conversationId: data.conversationId,
            messageId: data.messageId
          },
          categoryIdentifier: 'MESSAGE_NOTIFICATION',
          sound: 'default',
          badge: 1,
        },
        trigger: { seconds: 1 },
      });

      console.log('✅ Уведомление о сообщении отправлено');
    } catch (error) {
      console.error('❌ Ошибка отправки уведомления:', error);
    }
  }

  // Отправка уведомления о подтверждении бронирования
  static async sendBookingConfirmationNotification(data: {
    bookingId: string;
    roomNumber: string;
    checkIn: string;
    checkOut: string;
    totalPrice: number;
  }) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '✅ Бронирование подтверждено!',
          body: `Номер ${data.roomNumber} • ${data.checkIn} - ${data.checkOut}\nСумма: ${data.totalPrice} GBP`,
          data: {
            type: NotificationType.BOOKING_CONFIRMED,
            bookingId: data.bookingId
          },
          sound: 'default',
          badge: 1,
        },
        trigger: { seconds: 1 },
      });

      console.log('✅ Уведомление о бронировании отправлено');
    } catch (error) {
      console.error('❌ Ошибка отправки уведомления:', error);
    }
  }

  // Регистрация действий для сообщений (iOS)
  private static async registerMessageActions() {
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
      console.error('Ошибка регистрации действий:', error);
    }
  }

  // Обработка ответа на уведомление
  static async handleNotificationResponse(response: Notifications.NotificationResponse) {
    const { actionIdentifier, notification } = response;
    const data = notification.request.content.data;

    console.log('📱 Обработка действия:', actionIdentifier);

    switch (actionIdentifier) {
      case 'REPLY':
        // Обработка быстрого ответа
        const replyText = (response as any).userText;
        if (replyText && data?.conversationId) {
          await this.sendQuickReply(data.conversationId, replyText);
        }
        break;

      case 'VIEW':
        // Открытие чата - обрабатывается в навигации
        console.log('Открытие чата:', data?.conversationId);
        break;

      default:
        // Обычное нажатие на уведомление
        console.log('Уведомление нажато:', data?.type);
        break;
    }
  }

  // Отправка быстрого ответа
  private static async sendQuickReply(conversationId: string, replyText: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('Нет авторизованного пользователя');
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
        console.error('Ошибка отправки ответа:', error);
      } else {
        console.log('✅ Быстрый ответ отправлен');
        
        // Показываем подтверждение
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '✅ Ответ отправлен',
            body: replyText.length > 50 ? replyText.substring(0, 50) + '...' : replyText,
            sound: null,
          },
          trigger: { seconds: 1 },
        });
      }
    } catch (error) {
      console.error('Ошибка в sendQuickReply:', error);
    }
  }

  // Подписка на уведомления о новых сообщениях
  static subscribeToMessages(guestId: string, onMessage: (message: any) => void) {
    // Подписываемся на realtime события
    const unsubscribeRealtime = this.subscribeToRealtimeEvents(guestId);
    // Подписываемся на получение уведомлений
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      const data = notification.request.content.data;
      
      if (data?.type === NotificationType.NEW_MESSAGE) {
        onMessage(data);
      }
    });

    // Подписываемся на реакцию на уведомления (когда пользователь нажимает на них)
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      
      if (data?.type === NotificationType.NEW_MESSAGE) {
        // Переход к чату
        onMessage(data);
      }
    });

    // Возвращаем функцию отписки
    return () => {
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }

  // Обработка входящих уведомлений
  static async handleIncomingNotification(notification: Notifications.Notification) {
    const { title, body, data } = notification.request.content;
    
    console.log('Получено уведомление:', { title, body, data });
    
    // Здесь можно добавить специфическую логику для разных типов уведомлений
    switch (data?.type) {
      case NotificationType.NEW_MESSAGE:
        // Обновить счетчик непрочитанных сообщений
        break;
      case NotificationType.BOOKING_CONFIRMED:
        // Обновить статус бронирования
        break;
      case NotificationType.ROOM_READY:
        // Показать специальное уведомление о готовности номера
        break;
      default:
        break;
    }
  }

  // Получение последнего уведомления (если приложение было открыто через уведомление)
  static async getLastNotificationResponse() {
    const response = await Notifications.getLastNotificationResponseAsync();
    
    if (response) {
      const data = response.notification.request.content.data;
      return data;
    }
    
    return null;
  }

  // Очистка всех уведомлений
  static async clearAllNotifications() {
    await Notifications.dismissAllNotificationsAsync();
  }

  // Установка счетчика на иконке приложения
  static async setBadgeCount(count: number) {
    await Notifications.setBadgeCountAsync(count);
  }

  // Планирование локального уведомления (например, напоминание о заселении)
  static async scheduleCheckInReminder(checkInDate: Date, roomNumber: string) {
    // Напоминание за день до заселения
    const reminderDate = new Date(checkInDate);
    reminderDate.setDate(reminderDate.getDate() - 1);
    reminderDate.setHours(10, 0, 0, 0); // 10:00 утра

    if (reminderDate > new Date()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🏨 Напоминание о заселении',
          body: `Завтра ваше заселение в номер ${roomNumber}. Ждем вас!`,
          data: { type: NotificationType.CHECK_IN_REMINDER, roomNumber },
        },
        trigger: reminderDate,
      });
    }
  }

  // Отмена запланированного уведомления
  static async cancelScheduledNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
}

export default PushNotificationService;