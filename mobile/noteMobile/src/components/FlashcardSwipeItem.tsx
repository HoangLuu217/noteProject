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
      onStartShouldSetPanResponder: () => true,
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
            <Text style={[styles.title, { color: colors.onSurface }]}>Câu hỏi</Text>
            <Text style={[styles.text, { color: colors.onSurfaceVariant }]}>{question}</Text>
            <Text style={[styles.hint, { color: colors.primary }]}>Chạm để xem đáp án</Text>

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
            <Text style={[styles.title, { color: colors.onPrimaryContainer }]}>Đáp án</Text>
            <Text style={[styles.text, { color: colors.onPrimaryContainer }]}>{answer}</Text>

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
    height: 400,
    alignSelf: 'center',
    top: 50,
  },
  pressable: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  cardFace: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backfaceVisibility: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  cardBack: {
    transform: [{ rotateX: '180deg' }],
  },
  title: {
    fontFamily: 'Quicksand-Bold',
    fontSize: 18,
    marginBottom: 20,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  text: {
    fontFamily: 'Quicksand-Medium',
    fontSize: 24,
    textAlign: 'center',
    lineHeight: 34,
  },
  hint: {
    position: 'absolute',
    bottom: 24,
    fontFamily: 'Quicksand-SemiBold',
    fontSize: 14,
  },
  stampContainer: {
    position: 'absolute',
    top: 40,
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
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
});
