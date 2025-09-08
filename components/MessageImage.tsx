import React, { useState } from 'react';
import { 
  View, 
  Image, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions,
  Text,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MessageAttachment } from '@/types';
import ImageViewer from './ImageViewer';

interface MessageImageProps {
  attachment: MessageAttachment;
  isOwnMessage?: boolean;
  senderName?: string;
  timestamp?: string;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function MessageImage({ attachment, isOwnMessage, senderName, timestamp }: MessageImageProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const handleImagePress = () => {
    if (!imageError) {
      setModalVisible(true);
    }
  };

  const handleClose = () => {
    setModalVisible(false);
  };

  // Calculate image dimensions (80% width)
  const imageWidth = screenWidth * 0.8;
  const maxImageHeight = 300;

  return (
    <>
      <TouchableOpacity 
        onPress={handleImagePress}
        activeOpacity={0.9}
        style={[styles.imageContainer, isOwnMessage && styles.ownImageContainer]}
      >
        <Image
          source={{ uri: attachment.url }}
          style={[styles.messageImage, { width: imageWidth }]}
          resizeMode="cover"
          onLoadStart={() => setImageLoading(true)}
          onLoadEnd={() => setImageLoading(false)}
          onError={() => {
            setImageError(true);
            setImageLoading(false);
          }}
        />
        {imageLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color="#fff" />
          </View>
        )}
        {imageError && (
          <View style={styles.errorOverlay}>
            <Ionicons name="image-outline" size={40} color="#8a94a6" />
            <Text style={styles.errorText}>Failed to load image</Text>
          </View>
        )}
      </TouchableOpacity>

      <ImageViewer
        visible={modalVisible}
        imageUrl={attachment.url}
        senderName={senderName || (isOwnMessage ? 'You' : 'Hotel')}
        timestamp={timestamp}
        onClose={handleClose}
        onReply={() => {
          handleClose();
          // Reply functionality can be added here
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    marginVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f2f5',
  },
  ownImageContainer: {
    alignSelf: 'flex-end',
  },
  messageImage: {
    height: 200,
    maxHeight: 300,
    borderRadius: 12,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f0f2f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    color: '#8a94a6',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  imageWrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: screenWidth,
    height: screenHeight * 0.8,
  },
  filenameContainer: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 8,
  },
  filenameText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
});