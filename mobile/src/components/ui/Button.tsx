// Botao padrao: primary = acao principal (cor da paleta); outline = secundaria (neutra); ghost = link
import React from 'react';
import { Text, StyleSheet, ActivityIndicator, ViewStyle, StyleProp } from 'react-native';
import { colors, fonts, spacing, borderRadius, shadows, themed } from '../../constants/theme';
import { ScalePressable } from './Motion';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ title, onPress, variant = 'primary', loading, disabled, style }: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <ScalePressable
      style={[
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'outline' && styles.outline,
        variant === 'ghost' && styles.ghost,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.textInverse : colors.textPrimary} />
      ) : (
        <Text
          style={[
            styles.text,
            variant === 'primary' && styles.textPrimary,
            variant === 'outline' && styles.textOutline,
            variant === 'ghost' && styles.textGhost,
          ]}
        >
          {title}
        </Text>
      )}
    </ScalePressable>
  );
}

const styles = themed(() => StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  primary: {
    backgroundColor: colors.primary,
    ...shadows.card,
  },
  outline: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  ghost: {
    backgroundColor: 'transparent',
    minHeight: 44,
    paddingVertical: spacing.sm,
  },
  disabled: {
    opacity: 0.48,
  },
  text: {
    fontSize: fonts.sizes.md,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  textPrimary: {
    color: colors.textInverse,
  },
  textOutline: {
    color: colors.textPrimary,
  },
  textGhost: {
    color: colors.primary,
    fontSize: fonts.sizes.sm,
    fontWeight: '700',
  },
}));
