# Исправление Push-уведомлений в PMS

## Файл для изменения:
`C:\PMSApp\components\ChatInterface.tsx`

## Что нужно сделать:
В методе `sendMessage` после строки 176 (где заменяется оптимистичное сообщение) добавить код отправки push-уведомления гостю.

## Найти этот код (строки 169-177):
```typescript
      if (error) throw error;
      
      // Заменяем оптимистичное сообщение на реальное (как в PMSweb)
      if (data) {
        setMessages(prev => prev.map(msg => 
          msg.id === tempMessage.id ? data : msg
        ));
      }
      
      // Update conversation's last message
```

## Заменить на:
```typescript
      if (error) throw error;
      
      // Заменяем оптимистичное сообщение на реальное (как в PMSweb)
      if (data) {
        setMessages(prev => prev.map(msg => 
          msg.id === tempMessage.id ? data : msg
        ));
      }

      // Отправляем push-уведомление гостю
      try {
        // Получаем push токены гостя
        console.log('Sending push notification to guest:', conversation.guest_id);
        const { data: guestTokens } = await supabase
          .from('push_tokens')
          .select('token')
          .eq('user_id', conversation.guest_id);

        console.log('Guest tokens found:', guestTokens);

        if (guestTokens && guestTokens.length > 0) {
          // Формируем уведомление
          const staffName = user?.email?.split('@')[0] || 'Hotel Support';
          const title = `💬 ${staffName}`;
          const body = messageText.length > 100 
            ? messageText.substring(0, 100) + '...' 
            : messageText;

          // Отправляем push уведомления
          const messages = guestTokens.map(tokenData => ({
            to: tokenData.token,
            sound: 'default',
            title,
            body,
            data: {
              type: 'new_message',
              staffName,
              conversationId: conversation.id
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
        }
      } catch (pushError) {
        console.error('Error sending push notification:', pushError);
        // Не прерываем процесс отправки сообщения из-за ошибки push
      }
      
      // Update conversation's last message
```

## После изменения:
1. Сохраните файл
2. Перезапустите PMS приложение на телефоне
3. Отправьте сообщение из PMS в GuestApp
4. Push-уведомление должно прийти на телефон с GuestApp!

## Проверка в консоли:
При отправке сообщения из PMS вы увидите:
- `Sending push notification to guest: [guest_id]`
- `Guest tokens found: [array of tokens]`
- `Push notification sent to guest: [response]`