import { supabase } from '@/lib/supabase';
import { MessageAttachment } from '@/types';
import * as FileSystem from 'expo-file-system';

export class UploadService {
  static async uploadAttachment(attachment: MessageAttachment): Promise<MessageAttachment> {
    try {
      // If already has a valid URL (not local file), return as is
      if (attachment.url.startsWith('http')) {
        return attachment;
      }

      const bucketName = 'chat-attachments';
      
      console.log('Starting file upload to Supabase Storage...');
      console.log('Local file URI:', attachment.url);

      // Read file as base64
      console.log('Reading file as base64...');
      const base64Data = await FileSystem.readAsStringAsync(attachment.url, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      console.log(`Base64 data length: ${base64Data.length}`);

      // Convert base64 to array buffer
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const arrayBuffer = bytes.buffer;

      // Generate unique filename
      const timestamp = Date.now();
      const extension = attachment.filename.split('.').pop() || 'jpg';
      const fileName = `${timestamp}_${Math.random().toString(36).substring(7)}.${extension}`;
      console.log(`Generated filename: ${fileName}`);

      // Upload to Supabase Storage using array buffer
      console.log(`Uploading to bucket: ${bucketName}...`);
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, arrayBuffer, {
          contentType: attachment.mimeType || 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error details:', {
          error,
          message: error.message,
          statusCode: error.statusCode,
          details: error.details
        });
        
        // Check if it's a bucket not found error
        if (error.message?.includes('not found') || error.statusCode === 404) {
          console.error('❌ Storage bucket "chat-attachments" does not exist!');
          console.error('Please create the bucket in your Supabase Dashboard:');
          console.error('1. Go to Storage section');
          console.error('2. Create new bucket named "chat-attachments"');
          console.error('3. Make it public');
        }
        
        throw error;
      }

      console.log('Upload successful:', data);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);

      console.log('Successfully uploaded to:', publicUrl);

      // Return attachment with public URL
      return {
        ...attachment,
        url: publicUrl
      };
    } catch (error) {
      console.error('Failed to upload attachment:', error);
      
      // If it's a module not found error, provide instructions
      if (error instanceof Error && error.message.includes('expo-file-system')) {
        console.error('Please install expo-file-system: npx expo install expo-file-system');
      }
      
      console.log('Falling back to local file URL');
      // Return original attachment if upload fails
      return attachment;
    }
  }

  static async uploadMultipleAttachments(attachments: MessageAttachment[]): Promise<MessageAttachment[]> {
    const uploadPromises = attachments.map(att => this.uploadAttachment(att));
    return Promise.all(uploadPromises);
  }
}