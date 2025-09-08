-- Проверка и настройка политик для bucket chat-attachments
-- Выполните этот скрипт в Supabase SQL Editor

-- Сначала удалим старые политики если они есть
DROP POLICY IF EXISTS "Anyone can view chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own chat attachments" ON storage.objects;

-- Создаем новые политики
-- 1. Разрешаем всем просматривать файлы
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'chat-attachments');

-- 2. Разрешаем аутентифицированным пользователям загружать файлы
CREATE POLICY "Authenticated users can upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-attachments');

-- 3. Разрешаем пользователям обновлять свои файлы
CREATE POLICY "Users can update own files" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'chat-attachments' AND auth.uid() = owner)
WITH CHECK (bucket_id = 'chat-attachments');

-- 4. Разрешаем пользователям удалять свои файлы
CREATE POLICY "Users can delete own files" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'chat-attachments' AND auth.uid() = owner);

-- Проверяем результат
SELECT * FROM storage.buckets WHERE id = 'chat-attachments';

-- Проверяем политики
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage';