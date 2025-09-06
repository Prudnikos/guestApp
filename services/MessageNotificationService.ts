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
      // Получаем токены менеджеров и сотрудников reception
      const { data: staffTokens } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('user_type', 'staff')
        .or('department.eq.management,department.eq.reception');

      if (!staffTokens || staffTokens.length === 0) {
        console.log('No staff tokens found for notifications');
        return;
      }

      // Убираем дубликаты токенов
      const uniqueTokens = [...new Set(staffTokens.map(t => t.token))];
      
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
      // Получаем токены гостя
      const { data: guestTokens } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('user_id', guestId)
        .eq('user_type', 'guest');

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