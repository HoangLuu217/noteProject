import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  Pressable,
  ScrollView,
  TouchableWithoutFeedback,
  TouchableOpacity,
} from 'react-native';
import { Pointer } from 'lucide-react-native';
import { useLanguage } from './LanguageProvider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 120;

export interface FlashcardSwipeItemProps {
  question: string;
  options?: string[];
  answer: string;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  colors: any;
  stackedIndex?: number;
}

export function FlashcardSwipeItem({
  question,
  options = [],
  answer,
  onSwipeLeft,
  onSwipeRight,
  colors,
  stackedIndex = 0,
}: FlashcardSwipeItemProps) {
  const { t } = useLanguage();
  const [isFlipped, setIsFlipped] = useState(false);
  const position = useRef(new Animated.ValueXY()).current;
  const flipAnim = useRef(new Animated.Value(0)).current;

  // Lưu vị trí chạm tay để phân biệt Tap (lật) và Scroll (cuộn)
  const touchY = useRef(0);
  const touchX = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderMove: (_, gestureState) => {
        position.setValue({ x: gestureState.dx, y: 0 });
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
          forceSwipe('right');
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          forceSwipe('left');
        } else {
          resetPosition();
        }
      },
    })
  ).current;

  const forceSwipe = (direction: 'left' | 'right') => {
    const x = direction === 'right' ? SCREEN_WIDTH : -SCREEN_WIDTH;
    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: 250,
      useNativeDriver: false,
    }).start(() => {
      if (direction === 'right') {
        onSwipeRight();
      } else {
        onSwipeLeft();
      }
    });
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      friction: 5,
      useNativeDriver: false,
    }).start();
  };

  const handleFlip = () => {
    Animated.timing(flipAnim, {
      toValue: isFlipped ? 0 : 180,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsFlipped(!isFlipped);
    });
  };

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp',
  });

  const rotateX = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });

  const rotateXBack = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  const frontOpacity = flipAnim.interpolate({
    inputRange: [89, 90],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const backOpacity = flipAnim.interpolate({
    inputRange: [89, 90],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const nopeOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={[
        styles.cardContainer,
        {
          transform: [
            { translateX: position.x },
            { translateY: position.y },
            { rotate: rotate },
            { scale: stackedIndex === 1 ? 0.95 : stackedIndex === 2 ? 0.9 : 1 },
            { translateY: stackedIndex === 1 ? 15 : stackedIndex === 2 ? 30 : 0 }
          ],
          zIndex: 3 - stackedIndex, // Đảm bảo thẻ trên cùng đè lên thẻ dưới
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View style={styles.pressable}>
        <View style={styles.contentWrapper}>
          {/* FRONT (QUESTION) */}
          <Animated.View
            style={[
              styles.cardFace,
              { backgroundColor: colors.surfaceContainerLowest },
              {
                opacity: frontOpacity,
                transform: [{ rotateX: rotateX }],
              },
            ]}
          >
            <Pressable style={styles.tagContainer} onPress={handleFlip}>
              <Text style={styles.tagText}>{t('flashcardQuestion')}</Text>
            </Pressable>
            <ScrollView
              style={styles.centerContent}
              contentContainerStyle={styles.centerContentContainer}
              showsVerticalScrollIndicator={true}
            >
              <View style={{ width: '100%', alignItems: 'center', paddingBottom: 20 }}>
                <Text
                  style={[
                    styles.textMain,
                    { 
                      color: colors.onSurface, 
                      marginBottom: options && options.length > 0 ? 20 : 0,
                      fontSize: question.length > 100 ? 20 : (question.length > 50 ? 24 : 28),
                      lineHeight: question.length > 100 ? 28 : (question.length > 50 ? 32 : 36)
                    }
                  ]}
                >
                  {question}
                </Text>

                {options && options.length > 0 && (
                  <View style={styles.optionsContainer}>
                    {options.map((opt, idx) => (
                      <View key={idx} style={[styles.optionItem, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.optionLetter, { color: colors.primary }]}>
                          {String.fromCharCode(65 + idx)}
                        </Text>
                        <Text style={[styles.optionText, { color: colors.onSurface }]} numberOfLines={2}>
                          {opt}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                <TouchableOpacity style={styles.hintContainer} onPress={handleFlip}>
                  <Pointer size={28} color="#0B525B" style={{ marginBottom: 8 }} />
                  <Text style={[styles.hint, { color: '#0B525B' }]}>{t('flashcardTapToView')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <Animated.View style={[styles.stampContainer, styles.stampRight, { opacity: likeOpacity }]}>
              <Text style={[styles.stampText, { color: '#4cc9f0', borderColor: '#4cc9f0' }]}>{t('flashcardRemember')}</Text>
            </Animated.View>
            <Animated.View style={[styles.stampContainer, styles.stampLeft, { opacity: nopeOpacity }]}>
              <Text style={[styles.stampText, { color: '#ffb4ab', borderColor: '#ffb4ab' }]}>{t('flashcardForgot')}</Text>
            </Animated.View>
          </Animated.View>

          {/* BACK (ANSWER) */}
          <Animated.View
            style={[
              styles.cardFace,
              styles.cardBack,
              { backgroundColor: colors.primaryContainer },
              {
                opacity: backOpacity,
                transform: [{ rotateX: rotateXBack }],
              },
            ]}
            pointerEvents={isFlipped ? 'auto' : 'none'}
          >
            <TouchableOpacity style={[styles.tagContainer, { backgroundColor: 'rgba(255,255,255,0.3)' }]} onPress={handleFlip}>
              <Text style={[styles.tagText, { color: colors.onPrimaryContainer }]}>{t('flashcardAnswer')}</Text>
            </TouchableOpacity>
            <ScrollView
              style={styles.centerContent}
              contentContainerStyle={styles.centerContentContainer}
              showsVerticalScrollIndicator={true}
            >
              <View style={{ width: '100%', alignItems: 'center', paddingBottom: 20, flexGrow: 1, justifyContent: 'center' }}>
                <Text
                  style={[
                    styles.textMain,
                    { 
                      color: colors.onPrimaryContainer,
                      fontSize: answer.length > 100 ? 20 : (answer.length > 50 ? 24 : 28),
                      lineHeight: answer.length > 100 ? 28 : (answer.length > 50 ? 32 : 36)
                    }
                  ]}
                >
                  {answer}
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.hintContainer} onPress={handleFlip}>
                <Text style={[styles.hint, { color: colors.onPrimaryContainer }]}>{t('flashcardTapToView')}</Text>
            </TouchableOpacity>

            <Animated.View style={[styles.stampContainer, styles.stampRight, { opacity: likeOpacity }]}>
              <Text style={[styles.stampText, { color: '#4cc9f0', borderColor: '#4cc9f0' }]}>{t('flashcardRemember')}</Text>
            </Animated.View>
            <Animated.View style={[styles.stampContainer, styles.stampLeft, { opacity: nopeOpacity }]}>
              <Text style={[styles.stampText, { color: '#ffb4ab', borderColor: '#ffb4ab' }]}>{t('flashcardForgot')}</Text>
            </Animated.View>
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    position: 'absolute',
    width: SCREEN_WIDTH - 40,
    height: '90%',
    alignSelf: 'center',
    top: 10,
  },
  pressable: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 8,
  },
  cardFace: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    padding: 24,
    justifyContent: 'space-between',
    alignItems: 'center',
    backfaceVisibility: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardBack: {
    transform: [{ rotateX: '180deg' }],
  },
  tagContainer: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
  },
  tagText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 12,
    color: '#4B5563',
  },
  centerContent: {
    flex: 1,
    width: '100%',
    marginTop: 60,
    marginBottom: 20,
  },
  centerContentContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  textMain: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 28,
    textAlign: 'center',
    lineHeight: 36,
  },
  optionsContainer: {
    width: '100%',
    marginTop: 10,
    gap: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  optionLetter: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 16,
    width: 24,
    marginRight: 8,
  },
  optionText: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 14,
    flex: 1,
  },
  hintContainer: {
    alignItems: 'center',
    marginBottom: 10,
  },
  hint: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 14,
  },
  stampContainer: {
    position: 'absolute',
    top: 80,
    transform: [{ rotate: '-15deg' }],
  },
  stampRight: {
    left: 40,
  },
  stampLeft: {
    right: 40,
    transform: [{ rotate: '15deg' }],
  },
  stampText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 32,
    borderWidth: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
});
