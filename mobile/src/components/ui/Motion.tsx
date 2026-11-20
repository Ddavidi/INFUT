// Reusable Motion Primitives — INFUT Night Pitch Design System
// Respects AccessibilityInfo.isReduceMotionEnabled across iOS, Android, and Web
import React, { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { colors, motion } from '../../constants/theme';

let reduceMotionCached = false;
AccessibilityInfo.isReduceMotionEnabled()
  .then((enabled) => {
    reduceMotionCached = enabled;
  })
  .catch(() => {});

interface FadeInViewProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  offsetY?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Smooth exponential ease-out entrance with subtle vertical settle.
 * Starts visible-friendly and falls back immediately when Reduce Motion is active.
 */
export function FadeInView({
  children,
  delay = 0,
  duration = motion.normal,
  offsetY = 10,
  style,
}: FadeInViewProps) {
  const opacity = useRef(new Animated.Value(reduceMotionCached ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(reduceMotionCached ? 0 : offsetY)).current;

  useEffect(() => {
    if (reduceMotionCached) {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }

    const anim = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    anim.start();
    return () => anim.stop();
  }, [delay, duration, opacity, translateY]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

interface ScalePressableProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
}

/**
 * Tactile spring-scale press feedback without shifting layout bounds.
 */
export function ScalePressable({
  children,
  style,
  scaleTo = motion.pressScale,
  disabled,
  onPressIn,
  onPressOut,
  ...rest
}: ScalePressableProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (toValue: number) => {
    if (reduceMotionCached) return;
    Animated.timing(scale, {
      toValue,
      duration: motion.fast,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      disabled={disabled}
      onPressIn={(e) => {
        if (!disabled) animateTo(scaleTo);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        animateTo(1);
        onPressOut?.(e);
      }}
      {...rest}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

interface PulseDotProps {
  color?: string;
  size?: number;
  active?: boolean;
}

/**
 * Live breathing indicator dot for matches in progress or active status.
 */
export function PulseDot({ color = colors.error, size = 8, active = true }: PulseDotProps) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!active || reduceMotionCached) {
      pulse.setValue(1);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.32,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 750,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [active, pulse]);

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: pulse,
      }}
    />
  );
}
