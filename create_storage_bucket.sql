-- Run this in Supabase SQL Editor to create the chat-attachments bucket
-- Go to your Supabase Dashboard > SQL Editor and run this script

-- First, ensure storage schema exists
CREATE SCHEMA IF NOT EXISTS storage;

-- Create the bucket (this needs to be done by an admin)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments', 
  true, -- Make it public so images can be viewed
  10485760, -- 10MB limit per file
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own chat attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own chat attachments" ON storage.objects;

-- Create RLS policies for the bucket
-- Allow anyone to view files
CREATE POLICY "Anyone can view chat attachments" ON storage.objects
  FOR SELECT USING (bucket_id = 'chat-attachments');

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload chat attachments" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'chat-attachments' 
    AND auth.role() = 'authenticated'
  );

-- Allow users to update their own files
CREATE POLICY "Users can update their own chat attachments" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'chat-attachments' 
    AND auth.uid() = owner
  );

-- Allow users to delete their own files  
CREATE POLICY "Users can delete their own chat attachments" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'chat-attachments' 
    AND auth.uid() = owner
  );

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

-- Verify bucket was created
SELECT * FROM storage.buckets WHERE id = 'chat-attachments';