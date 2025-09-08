-- ВРЕМЕННО ОТКЛЮЧАЕМ RLS ПОЛНОСТЬЮ ДЛЯ ТЕСТИРОВАНИЯ
-- ВАЖНО: Это только для теста! Потом нужно включить обратно!

-- 1. Сначала удаляем ВСЕ политики для storage.objects
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
    END LOOP;
END $$;

-- 2. Отключаем RLS для таблицы storage.objects
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- 3. Даем полные права всем аутентифицированным пользователям
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.objects TO anon;
GRANT ALL ON storage.buckets TO authenticated;
GRANT ALL ON storage.buckets TO anon;

-- 4. Убеждаемся что bucket публичный
UPDATE storage.buckets 
SET public = true 
WHERE id = 'chat-attachments';

-- 5. Проверяем статус RLS
SELECT 
    schemaname, 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE schemaname = 'storage' 
AND tablename = 'objects';

-- 6. Проверяем что политик больше нет
SELECT COUNT(*) as policy_count 
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects';

-- 7. Проверяем bucket
SELECT id, name, public, created_at 
FROM storage.buckets 
WHERE id = 'chat-attachments';