import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import { MessageAttachment } from '@/types';
import MessageImage from './MessageImage';

interface MessageAttachmentRendererProps {
  attachment: MessageAttachment;
  isUserMessage: boolean;
}

export default function MessageAttachmentRenderer({ 
  attachment, 
  isUserMessage 
}: MessageAttachmentRendererProps) {
  
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType?: string): keyof typeof Ionicons.glyphMap => {
    if (!mimeType) return 'document';
    
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'videocam';
    if (mimeType.includes('pdf')) return 'document-text';
    if (mimeType.includes('word') || mimeType.includes('doc')) return 'document-text';
    if (mimeType.includes('excel') || mimeType.includes('sheet')) return 'grid';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'easel';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return 'archive';
    
    return 'document';
  };

  const handlePress = async () => {
    try {
      if (attachment.type === 'image' || attachment.type === 'video') {
        // Для изображений и видео используем sharing
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(attachment.url);
        } else {
          Alert.alert('Error', 'Sharing not available on this device');
        }
      } else {
        // Для документов пробуем Linking
        const supported = await Linking.canOpenURL(attachment.url);
        if (supported) {
          await Linking.openURL(attachment.url);
        } else {
          Alert.alert('Error', 'Cannot open this file type');
        }
      }
    } catch (error) {
      console.error('Error opening file:', error);
      Alert.alert('Error', 'Failed to open file');
    }
  };

  const renderImageAttachment = () => (
    <MessageImage 
      attachment={attachment} 
      isOwnMessage={isUserMessage}
    />
  );

  const renderVideoAttachment = () => (
    <TouchableOpacity style={styles.videoContainer} activeOpacity={0.8} onPress={handlePress}>
      <Image 
        source={{ uri: attachment.url }} 
        style={styles.attachmentImage}
        resizeMode="cover"
      />
      <View style={styles.videoPlayButton}>
        <Ionicons name="play" size={24} color="#fff" />
      </View>
    </TouchableOpacity>
  );

  const renderDocumentAttachment = () => (
    <TouchableOpacity 
      style={[
        styles.documentContainer,
        isUserMessage ? styles.documentContainerUser : styles.documentContainerStaff
      ]} 
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={[
        styles.documentIconContainer,
        isUserMessage ? styles.documentIconUser : styles.documentIconStaff
      ]}>
        <Ionicons 
          name={getFileIcon(attachment.mimeType)} 
          size={20} 
          color={isUserMessage ? "#fff" : "#1a2b47"}
        />
      </View>
      <View style={styles.documentInfo}>
        <Text 
          style={[
            styles.documentFilename,
            isUserMessage ? styles.documentTextUser : styles.documentTextStaff
          ]} 
          numberOfLines={1}
        >
          {attachment.filename}
        </Text>
        <Text 
          style={[
            styles.documentSize,
            isUserMessage ? styles.documentSizeUser : styles.documentSizeStaff
          ]}
        >
          {formatFileSize(attachment.size)}
        </Text>
      </View>
      <Ionicons 
        name="download" 
        size={16} 
        color={isUserMessage ? "rgba(255, 255, 255, 0.7)" : "#8a94a6"}
      />
    </TouchableOpacity>
  );

  switch (attachment.type) {
    case 'image':
      return renderImageAttachment();
    case 'video':
      return renderVideoAttachment();
    case 'document':
      return renderDocumentAttachment();
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  // Image styles
  imageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 2,
  },
  attachmentImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
  },
  
  // Video styles
  videoContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginVertical: 4,
    position: 'relative',
  },
  videoPlayButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateX: -24 }, { translateY: -24 }],
  },
  videoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoFilename: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
    flex: 1,
  },
  
  // Document styles
  documentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginVertical: 4,
    minWidth: 200,
  },
  documentContainerUser: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  documentContainerStaff: {
    backgroundColor: 'rgba(26, 43, 71, 0.05)',
  },
  documentIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  documentIconUser: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  documentIconStaff: {
    backgroundColor: 'rgba(26, 43, 71, 0.1)',
  },
  documentInfo: {
    flex: 1,
  },
  documentFilename: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  documentTextUser: {
    color: '#fff',
  },
  documentTextStaff: {
    color: '#1a2b47',
  },
  documentSize: {
    fontSize: 12,
  },
  documentSizeUser: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  documentSizeStaff: {
    color: '#8a94a6',
  },
});