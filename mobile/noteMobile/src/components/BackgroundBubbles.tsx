import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { theme } from '../theme';

export function BackgroundBubbles() {
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;
  const anim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createAnimation = (animValue: Animated.Value, delay: number = 0) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(animValue, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: true,
          }),
        ])
      );
    };

    createAnimation(anim1, 0).start();
    createAnimation(anim2, 1000).start();
    createAnimation(anim3, 2000).start();
  }, []);

  const getTransform = (animValue: Animated.Value) => {
    return {
      transform: [
        {
          translateY: animValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -20],
          }),
        },
      ],
    };
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        style={[
          styles.bubble1,
          getTransform(anim1),
        ]}
      />
      <Animated.View
        style={[
          styles.bubble2,
          getTransform(anim2),
        ]}
      />
      <Animated.View
        style={[
          styles.bubble3,
          getTransform(anim3),
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bubble1: {
    position: 'absolute',
    top: 80,
    left: 40,
    width: 48,
    height: 48,
    backgroundColor: theme.colors.primaryContainer,
    opacity: 0.2,
    borderRadius: 24,
  },
  bubble2: {
    position: 'absolute',
    top: '50%',
    right: -20,
    width: 96,
    height: 96,
    backgroundColor: theme.colors.secondaryContainer,
    opacity: 0.2,
    borderRadius: 48,
  },
  bubble3: {
    position: 'absolute',
    bottom: 160,
    left: '25%',
    width: 32,
    height: 32,
    backgroundColor: theme.colors.tertiaryContainer,
    opacity: 0.3,
    borderRadius: 16,
  },
});
