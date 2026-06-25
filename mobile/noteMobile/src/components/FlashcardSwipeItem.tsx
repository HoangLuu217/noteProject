import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  Pressable,
} from 'react-native';
import { Pointer } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 120;

export interface FlashcardSwipeItemProps {
  question: string;
  answer: string;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  colors: any;
}

export function FlashcardSwipeItem({
  question,
  answer,
  onSwipeLeft,
  onSwipeRight,
  colors,
}: FlashcardSwipeItemProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const position = useRef(new Animated.ValueXY()).current;
  const flipAnim = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Chỉ bắt đầu vuốt khi người dùng kéo tay quá 5px (tránh lỗi vuốt nhầm khi đang bấm chạm)
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        position.setValue({ x: gestureState.dx, y: gestureState.dy });
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
      {...panResponder.panHandlers}
      style={[
        styles.cardContainer,
        {
          transform: [
            { translateX: position.x },
            { translateY: position.y },
            { rotate: rotate },
          ],
        },
      ]}
    >
      <Pressable onPress={handleFlip} style={styles.pressable}>
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
            <View style={styles.tagContainer}>
              <Text style={styles.tagText}>CÂU HỎI</Text>
            </View>
            <View style={styles.centerContent}>
              <Text
                style={[styles.textMain, { color: colors.onSurface }]}
                adjustsFontSizeToFit={true}
                numberOfLines={10}
                minimumFontScale={0.5}
              >
                {question}
              </Text>
            </View>
            <View style={styles.hintContainer}>
              <Pointer size={28} color="#0B525B" style={{ marginBottom: 8 }} />
              <Text style={[styles.hint, { color: '#0B525B' }]}>Chạm để xem đáp án</Text>
            </View>

            <Animated.View style={[styles.stampContainer, styles.stampRight, { opacity: likeOpacity }]}>
              <Text style={[styles.stampText, { color: '#4cc9f0', borderColor: '#4cc9f0' }]}>NHỚ</Text>
            </Animated.View>
            <Animated.View style={[styles.stampContainer, styles.stampLeft, { opacity: nopeOpacity }]}>
              <Text style={[styles.stampText, { color: '#ffb4ab', borderColor: '#ffb4ab' }]}>QUÊN</Text>
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
          >
            <View style={[styles.tagContainer, { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
              <Text style={[styles.tagText, { color: colors.onPrimaryContainer }]}>ĐÁP ÁN</Text>
            </View>
            <View style={styles.centerContent}>
              <Text
                style={[styles.textMain, { color: colors.onPrimaryContainer }]}
                adjustsFontSizeToFit={true}
                numberOfLines={10}
                minimumFontScale={0.5}
              >
                {answer}
              </Text>
            </View>

            <Animated.View style={[styles.stampContainer, styles.stampRight, { opacity: likeOpacity }]}>
              <Text style={[styles.stampText, { color: '#4cc9f0', borderColor: '#4cc9f0' }]}>NHỚ</Text>
            </Animated.View>
            <Animated.View style={[styles.stampContainer, styles.stampLeft, { opacity: nopeOpacity }]}>
              <Text style={[styles.stampText, { color: '#ffb4ab', borderColor: '#ffb4ab' }]}>QUÊN</Text>
            </Animated.View>
          </Animated.View>
        </View>
      </Pressable>
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
    alignSelf: 'flex-start',
  },
  tagText: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 12,
    color: '#4B5563',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 10,
  },
  textMain: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 32,
    textAlign: 'center',
    lineHeight: 40,
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
