-- Migration to add attachments column to messages table
-- Run this in Supabase SQL Editor

ALTER TABLE messages 
ADD COLUMN attachments JSONB;

-- Add comment to column
COMMENT ON COLUMN messages.attachments IS 'JSON array of message attachments (images, videos, documents)';

-- Create index for better performance when querying by attachments
CREATE INDEX idx_messages_attachments ON messages USING GIN (attachments);

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'messages' 
ORDER BY ordinal_position;