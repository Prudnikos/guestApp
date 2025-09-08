-- СУПЕР ОТКРЫТЫЕ ПОЛИТИКИ - РАЗРЕШАЕМ ВСЁ ВСЕМ!
-- Только для тестирования!

-- 1. Удаляем ВСЕ существующие политики для storage.objects
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
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- 2. Создаем супер открытые политики - РАЗРЕШАЕМ ВСЁ!
-- Политика для SELECT (просмотр)
CREATE POLICY "Allow ALL select" ON storage.objects
FOR SELECT TO public
USING (true);

-- Политика для INSERT (загрузка)
CREATE POLICY "Allow ALL insert" ON storage.objects
FOR INSERT TO public
WITH CHECK (true);

-- Политика для UPDATE (обновление)
CREATE POLICY "Allow ALL update" ON storage.objects
FOR UPDATE TO public
USING (true)
WITH CHECK (true);

-- Политика для DELETE (удаление)
CREATE POLICY "Allow ALL delete" ON storage.objects
FOR DELETE TO public
USING (true);

-- 3. Даем права всем
GRANT ALL ON storage.objects TO public;
GRANT ALL ON storage.buckets TO public;
GRANT USAGE ON SCHEMA storage TO public;

-- 4. Убеждаемся что bucket публичный и без ограничений
UPDATE storage.buckets 
SET 
    public = true,
    file_size_limit = null,
    allowed_mime_types = null
WHERE id = 'chat-attachments';

-- 5. Проверяем политики
SELECT 
    policyname,
    cmd,
    roles,
    permissive
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects'
ORDER BY policyname;

-- 6. Проверяем bucket
SELECT 
    id, 
    name, 
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE id = 'chat-attachments';

-- 7. Проверяем права
SELECT 
    grantee,
    privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'storage'
AND table_name = 'objects'
AND grantee IN ('public', 'authenticated', 'anon');