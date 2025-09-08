# Настройка Storage Bucket для загрузки изображений

## Способ 1: Через Supabase Dashboard (РЕКОМЕНДУЕТСЯ)

1. Откройте ваш проект в [Supabase Dashboard](https://app.supabase.com)
2. Перейдите в раздел **Storage** в левом меню
3. Нажмите кнопку **"New bucket"**
4. Введите следующие настройки:
   - **Name**: `chat-attachments`
   - **Public bucket**: ✅ включить (обязательно!)
   - **File size limit**: 10MB
   - **Allowed MIME types**: оставить пустым (разрешить все)
5. Нажмите **"Save"**

## Способ 2: Через SQL Editor

Если первый способ не работает, используйте SQL:

1. Откройте **SQL Editor** в Supabase Dashboard
2. Выполните этот запрос:

```sql
-- Создать bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-attachments', 'chat-attachments', true);
```

## Проверка

После создания bucket:
1. Перезапустите приложение GuestApp
2. Попробуйте отправить изображение в чате
3. В логах должно появиться: "Successfully uploaded to: https://..."

## Возможные проблемы

### Ошибка "Network request failed"
- Убедитесь, что bucket создан и является публичным
- Проверьте интернет-соединение на устройстве
- Перезапустите приложение полностью (не просто reload)

### Ошибка "Bucket not found"
- Bucket еще не создан - создайте через Dashboard
- Имя bucket должно быть точно: `chat-attachments`

### Ошибка "Row-level security policy"
- Это нормально при создании bucket через код
- Используйте Dashboard для создания bucket вместо SQL