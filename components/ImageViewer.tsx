import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  StatusBar,
  Share,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';

interface ImageViewerProps {
  visible: boolean;
  imageUrl: string;
  onClose: () => void;
  onReply?: () => void;
  senderName?: string;
  timestamp?: string;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function ImageViewer({
  visible,
  imageUrl,
  onClose,
  onReply,
  senderName = 'Guest',
  timestamp,
}: ImageViewerProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const [loading, setLoading] = useState(true);
  const [showActions, setShowActions] = useState(true);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleShare = async () => {
    try {
      if (Platform.OS === 'web') {
        await Share.share({
          message: `Check out this image: ${imageUrl}`,
        });
      } else {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          // Download image to temp directory
          const filename = imageUrl.split('/').pop() || 'image.jpg';
          const downloadPath = `${FileSystem.cacheDirectory}${filename}`;
          await FileSystem.downloadAsync(imageUrl, downloadPath);
          await Sharing.shareAsync(downloadPath);
        } else {
          Alert.alert('Sharing not available', 'Sharing is not available on this device');
        }
      }
    } catch (error) {
      console.error('Error sharing image:', error);
      Alert.alert('Error', 'Failed to share image');
    }
  };

  const handleSave = async () => {
    try {
      if (Platform.OS === 'web') {
        // For web, open image in new tab
        window.open(imageUrl, '_blank');
        Alert.alert('Success', 'Image opened in new tab');
      } else {
        // Request permissions
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Please grant permission to save images');
          return;
        }

        // Download and save image
        const filename = imageUrl.split('/').pop() || 'image.jpg';
        const downloadPath = `${FileSystem.documentDirectory}${filename}`;
        const downloadResult = await FileSystem.downloadAsync(imageUrl, downloadPath);
        
        const asset = await MediaLibrary.createAssetAsync(downloadResult.uri);
        await MediaLibrary.createAlbumAsync('Hotel Chat', asset, false);
        
        Alert.alert('Success', 'Image saved to gallery');
      }
    } catch (error) {
      console.error('Error saving image:', error);
      Alert.alert('Error', 'Failed to save image');
    }
  };

  const handleForward = () => {
    Alert.alert('Forward', 'Forward functionality coming soon');
  };

  const formatTime = (timestamp?: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar hidden={visible} />
      
      <Animated.View 
        style={[
          styles.container,
          {
            opacity: fadeAnim,
          }
        ]}
      >
        <BlurView intensity={95} tint="dark" style={StyleSheet.absoluteFillObject} />
        
        {/* Header */}
        {showActions && (
          <Animated.View 
            style={[
              styles.header,
              {
                transform: [
                  {
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-50, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <TouchableOpacity onPress={onClose} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            
            <View style={styles.headerInfo}>
              <Text style={styles.senderName}>{senderName}</Text>
              {timestamp && (
                <Text style={styles.timestamp}>{formatTime(timestamp)}</Text>
              )}
            </View>
            
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={handleShare} style={styles.headerButton}>
                <Ionicons name="share-outline" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={styles.headerButton}>
                <Ionicons name="download-outline" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
        
        {/* Image */}
        <TouchableOpacity 
          activeOpacity={1} 
          style={styles.imageContainer}
          onPress={() => setShowActions(!showActions)}
        >
          <Animated.View
            style={{
              transform: [{ scale: scaleAnim }],
            }}
          >
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              resizeMode="contain"
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
            />
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#fff" />
              </View>
            )}
          </Animated.View>
        </TouchableOpacity>
        
        {/* Bottom Actions */}
        {showActions && (
          <Animated.View 
            style={[
              styles.bottomActions,
              {
                transform: [
                  {
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [100, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {onReply && (
              <TouchableOpacity onPress={onReply} style={styles.actionButton}>
                <Ionicons name="arrow-undo" size={22} color="#fff" />
                <Text style={styles.actionText}>Reply</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity onPress={handleForward} style={styles.actionButton}>
              <Ionicons name="arrow-redo" size={22} color="#fff" />
              <Text style={styles.actionText}>Forward</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
              <Ionicons name="share-social" size={22} color="#fff" />
              <Text style={styles.actionText}>Share</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={handleSave} style={styles.actionButton}>
              <Ionicons name="download" size={22} color="#fff" />
              <Text style={styles.actionText}>Save</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight || 30,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 10,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  senderName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  timestamp: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  headerButton: {
    padding: 8,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: screenWidth,
    height: screenHeight * 0.8,
  },
  loadingContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -25 }, { translateY: -25 }],
  },
  bottomActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  actionButton: {
    alignItems: 'center',
    padding: 10,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
});