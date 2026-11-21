// Reusable Input component — Night Pitch Recessed Field (com mascaras de digitacao)
import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import { colors, fonts, spacing, borderRadius, themed } from '../../constants/theme';
import { applyMask, maskInteger, MaskType, MASK_DEFAULTS } from '../../utils/masks';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  icon?: string;
  /** Aplica mascara enquanto digita e ajusta teclado/tamanho maximo. */
  mask?: MaskType;
  /** Texto fixo antes do campo, ex.: "R$" */
  prefix?: string;
}

export function Input({
  label,
  error,
  hint,
  style,
  onFocus,
  onBlur,
  mask,
  prefix,
  onChangeText,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const maskDefaults = mask ? MASK_DEFAULTS[mask] : undefined;
  // Com mascara, o limite vale para o texto JA formatado (assim colar "ab28/11x2026" ainda funciona)
  const { maxLength, ...inputProps } = props;
  const limit = maxLength ?? maskDefaults?.maxLength;

  function handleChange(text: string) {
    if (!mask) {
      onChangeText?.(text);
      return;
    }
    let masked = mask === 'integer' ? maskInteger(text, limit ?? 3) : applyMask(mask, text);
    if (limit) masked = masked.slice(0, limit);
    onChangeText?.(masked);
  }

  const field = (
    <TextInput
      keyboardType={maskDefaults?.keyboardType}
      autoCapitalize={maskDefaults?.autoCapitalize}
      placeholder={maskDefaults?.placeholder}
      maxLength={mask ? undefined : maxLength}
      {...inputProps}
      style={[
        styles.input,
        prefix ? styles.inputWithPrefix : null,
        isFocused && styles.inputFocused,
        error ? styles.inputError : null,
        style,
      ]}
      placeholderTextColor={colors.textMuted}
      accessibilityLabel={label || props.placeholder}
      onChangeText={handleChange}
      onFocus={(e) => {
        setIsFocused(true);
        onFocus?.(e);
      }}
      onBlur={(e) => {
        setIsFocused(false);
        onBlur?.(e);
      }}
    />
  );

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, isFocused && styles.labelFocused]}>{label}</Text>}
      {prefix ? (
        <View
          style={[
            styles.prefixWrap,
            isFocused && styles.inputFocused,
            error ? styles.inputError : null,
          ]}
        >
          <Text style={styles.prefixText}>{prefix}</Text>
          {field}
        </View>
      ) : (
        field
      )}
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs,
    lineHeight: 18,
    marginBottom: 6,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  labelFocused: {
    color: colors.textPrimary,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    color: colors.textPrimary,
    fontSize: fonts.sizes.md,
  },
  inputWithPrefix: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingLeft: spacing.xs,
  },
  prefixWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: borderRadius.md,
    paddingLeft: spacing.md,
  },
  prefixText: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.md,
    fontWeight: '700',
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.card,
  },
  inputError: {
    borderColor: colors.error,
  },
  error: {
    color: colors.error,
    fontSize: fonts.sizes.xs,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  hint: {
    color: colors.textMuted,
    fontSize: fonts.sizes.xs,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
}));
