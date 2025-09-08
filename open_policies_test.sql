-- ВРЕМЕННЫЕ ОТКРЫТЫЕ ПОЛИТИКИ ДЛЯ ТЕСТИРОВАНИЯ
-- После успешного теста нужно будет ужесточить!

-- Удаляем ВСЕ существующие политики для bucket
DROP POLICY IF EXISTS "Anyone can view chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;

-- Создаем ОДНУ максимально открытую политику для всех операций
CREATE POLICY "Allow all operations for testing" ON storage.objects
FOR ALL 
USING (bucket_id = 'chat-attachments')
WITH CHECK (bucket_id = 'chat-attachments');

-- Проверяем что bucket публичный
UPDATE storage.buckets 
SET public = true 
WHERE id = 'chat-attachments';

-- Проверяем результат
SELECT id, name, public, created_at 
FROM storage.buckets 
WHERE id = 'chat-attachments';

-- Показываем текущие политики
SELECT policyname, cmd, permissive 
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND qual LIKE '%chat-attachments%';