import { supabase } from '@/lib/supabase';

export class MessageNotificationService {
  // Отправка уведомления менеджерам отеля о новом сообщении от гостя
  static async notifyHotelStaffNewMessage(
    guestId: string, 
    guestName: string, 
    messageContent: string,
    conversationId: string
  ) {
    try {
      // Получаем токены менеджеров
      // PMS токены сохраняются без user_type или с user_type != 'guest'
      console.log('Fetching staff tokens for guest:', guestId);
      const { data: staffTokens, error } = await supabase
        .from('push_tokens')
        .select('token, user_id, user_type')
        .or('user_type.is.null,user_type.neq.guest'); // Токены без user_type или не гостевые

      console.log('Staff tokens query result:', { staffTokens, error });

      if (!staffTokens || staffTokens.length === 0) {
        console.log('No staff tokens found for notifications');
        return;
      }

      // Убираем дубликаты токенов
      const uniqueTokens = [...new Set(staffTokens.map(t => t.token))];
      console.log('Unique staff tokens to notify:', uniqueTokens);
      
      // Формируем уведомление
      const title = `💬 Новое сообщение от ${guestName}`;
      const body = messageContent.length > 100 
        ? messageContent.substring(0, 100) + '...' 
        : messageContent;

      // Отправляем push уведомления
      const messages = uniqueTokens.map(token => ({
        to: token,
        sound: 'default',
        title,
        body,
        data: {
          type: 'new_message',
          guestId,
          guestName,
          conversationId
        },
        priority: 'high',
        badge: 1,
      }));

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      const result = await response.json();
      console.log('Push notifications sent to hotel staff:', result);
    } catch (error) {
      console.error('Error sending notification to hotel staff:', error);
    }
  }

  // Отправка уведомления гостю о новом сообщении от отеля
  static async notifyGuestNewMessage(
    guestId: string,
    staffName: string,
    messageContent: string,
    conversationId: string
  ) {
    try {
      // Получаем токены гостя только по user_id
      console.log('Fetching guest tokens for user:', guestId);
      const { data: guestTokens, error } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('user_id', guestId); // Токены конкретного гостя

      console.log('Guest tokens query result:', { guestTokens, error });

      if (!guestTokens || guestTokens.length === 0) {
        console.log('No guest tokens found for notifications');
        return;
      }

      // Формируем уведомление
      const title = `💬 ${staffName || 'Hotel Support'}`;
      const body = messageContent.length > 100 
        ? messageContent.substring(0, 100) + '...' 
        : messageContent;

      // Отправляем push уведомления
      const messages = guestTokens.map(token => ({
        to: token.token,
        sound: 'default',
        title,
        body,
        data: {
          type: 'new_message',
          staffName,
          conversationId
        },
        priority: 'high',
        badge: 1,
      }));

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messages),
      });

      const result = await response.json();
      console.log('Push notification sent to guest:', result);
    } catch (error) {
      console.error('Error sending notification to guest:', error);
    }
  }
}

export default MessageNotificationService;