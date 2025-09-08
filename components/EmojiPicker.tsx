import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EmojiPickerProps {
  onEmojiSelected: (emoji: string) => void;
  onClose: () => void;
  visible: boolean;
}

const EMOJI_CATEGORIES = {
  recent: {
    title: 'Recent',
    icon: 'time' as const,
    emojis: ['😊', '❤️', '👍', '😂', '🔥', '✨', '🎉', '💯'],
  },
  smileys: {
    title: 'Smileys',
    icon: 'happy' as const,
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃',
      '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜',
      '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟',
      '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠',
      '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
    ]
  },
  gestures: {
    title: 'Gestures',
    icon: 'hand-left' as const,
    emojis: [
      '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙',
      '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '👊', '✊', '🤛', '🤜',
      '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿',
    ]
  },
  hearts: {
    title: 'Hearts',
    icon: 'heart' as const,
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍', '♥️', '💕', '💞',
      '💓', '💗', '💖', '💘', '💝', '💟', '♥️', '💔', '❣️', '💋', '💯', '💢',
    ]
  },
  animals: {
    title: 'Animals',
    icon: 'paw' as const,
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮',
      '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤',
      '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛',
    ]
  },
  food: {
    title: 'Food',
    icon: 'restaurant' as const,
    emojis: [
      '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🫐', '🍈', '🍒', '🍑',
      '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🫑',
      '🌽', '🥕', '🫒', '🧄', '🧅', '🥔', '🍠', '🥐', '🥖', '🍞', '🥨', '🥯',
    ]
  },
  activities: {
    title: 'Activities',
    icon: 'football' as const,
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓',
      '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿',
      '🥊', '🥋', '🎽', '🛹', '🛼', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂',
    ]
  },
  travel: {
    title: 'Travel',
    icon: 'airplane' as const,
    emojis: [
      '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🛻', '🚚',
      '🚛', '🚜', '🛴', '🚲', '🛵', '🏍️', '✈️', '🛩️', '🛫', '🛬', '🪂', '💺',
      '🚁', '🚟', '🚠', '🚡', '🛰️', '🚀', '🛸', '🚢', '⛵', '🚤', '🛥️', '🛳️',
    ]
  },
};

export default function EmojiPicker({ onEmojiSelected, onClose, visible }: EmojiPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState('recent');
  const [slideAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }
  }, [visible]);

  const handleEmojiPress = (emoji: string) => {
    onEmojiSelected(emoji);
    onClose();
  };

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  });

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.backdrop} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <Animated.View 
          style={[
            styles.container,
            {
              transform: [{ translateY }]
            }
          ]}
        >
          <TouchableOpacity activeOpacity={1}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.handle} />
              <Text style={styles.title}>Choose Emoji</Text>
            </View>
            
            {/* Categories */}
            <ScrollView 
              horizontal 
              style={styles.categoriesContainer}
              showsHorizontalScrollIndicator={false}
            >
              {Object.entries(EMOJI_CATEGORIES).map(([key, category]) => (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.categoryButton,
                    selectedCategory === key && styles.categoryButtonActive
                  ]}
                  onPress={() => setSelectedCategory(key)}
                >
                  <Ionicons 
                    name={category.icon} 
                    size={20} 
                    color={selectedCategory === key ? '#1a2b47' : '#8a94a6'} 
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            {/* Emojis Grid */}
            <ScrollView style={styles.emojiContainer} showsVerticalScrollIndicator={false}>
              <View style={styles.emojiGrid}>
                {EMOJI_CATEGORIES[selectedCategory as keyof typeof EMOJI_CATEGORIES]?.emojis.map((emoji, index) => (
                  <TouchableOpacity
                    key={`${emoji}-${index}`}
                    style={styles.emojiButton}
                    onPress={() => handleEmojiPress(emoji)}
                  >
                    <Text style={styles.emoji}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 34, // Safe area padding
  },
  header: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#e1e5eb',
    borderRadius: 2,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a2b47',
  },
  categoriesContainer: {
    maxHeight: 60,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  categoryButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: '#f8fafc',
  },
  categoryButtonActive: {
    backgroundColor: '#e2e8f0',
  },
  emojiContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 16,
  },
  emojiButton: {
    width: '12.5%', // 8 columns
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  emoji: {
    fontSize: 24,
  },
});