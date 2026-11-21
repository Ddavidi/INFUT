// Escolha da paleta de cores do app (Perfil > Aparência).
// Cada opcao mostra uma miniatura da interface com as cores reais da paleta.
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { colors, fonts, spacing, borderRadius, themed, alpha, Palette } from '../../constants/theme';

function PalettePreview({ palette }: { palette: Palette }) {
  const b = palette.base;
  const hairline = alpha(palette.mode === 'light' ? '#111827' : '#FFFFFF', palette.mode === 'light' ? 0.1 : 0.08);
  return (
    <View style={[styles.preview, { backgroundColor: b.background, borderColor: hairline }]}>
      <View style={[styles.previewCard, { backgroundColor: b.card, borderColor: hairline }]}>
        <View style={[styles.previewLine, { backgroundColor: b.textPrimary, width: '62%' }]} />
        <View style={[styles.previewLine, { backgroundColor: b.textMuted, width: '40%', opacity: 0.8 }]} />
        <View style={styles.previewRow}>
          <View style={[styles.previewDot, { backgroundColor: b.success }]} />
          <View style={[styles.previewDot, { backgroundColor: b.gold }]} />
          <View style={[styles.previewDot, { backgroundColor: b.error }]} />
        </View>
      </View>
      <View style={[styles.previewButton, { backgroundColor: b.primary }]}>
        <View style={[styles.previewButtonText, { backgroundColor: b.textInverse }]} />
      </View>
    </View>
  );
}

export function PalettePicker() {
  const { paletteId, palettes, setPalette } = useTheme();

  return (
    <View style={styles.list} accessibilityRole="radiogroup" accessibilityLabel="Paleta de cores">
      {palettes.map((palette) => {
        const selected = palette.id === paletteId;
        return (
          <Pressable
            key={palette.id}
            onPress={() => setPalette(palette.id)}
            style={({ pressed }) => [
              styles.option,
              selected && styles.optionSelected,
              pressed && !selected && styles.optionPressed,
            ]}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={`${palette.name}. ${palette.description}`}
          >
            <PalettePreview palette={palette} />
            <View style={styles.optionText}>
              <View style={styles.optionTitleRow}>
                <Text style={styles.optionName}>{palette.name}</Text>
                {palette.mode === 'light' && (
                  <View style={styles.modeTag}>
                    <Ionicons name="sunny-outline" size={11} color={colors.textSecondary} />
                    <Text style={styles.modeTagText}>Claro</Text>
                  </View>
                )}
              </View>
              <Text style={styles.optionDescription}>{palette.description}</Text>
            </View>
            <View style={[styles.radio, selected && styles.radioSelected]}>
              {selected && <Ionicons name="checkmark" size={14} color={colors.textInverse} />}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = themed(() =>
  StyleSheet.create({
    list: {
      gap: spacing.sm,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.sm + 2,
      paddingRight: spacing.md,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      minHeight: 76,
    },
    optionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },
    optionPressed: {
      backgroundColor: colors.surfaceLight,
    },
    preview: {
      width: 76,
      height: 56,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      padding: 6,
      justifyContent: 'space-between',
      overflow: 'hidden',
    },
    previewCard: {
      borderRadius: 5,
      borderWidth: 1,
      padding: 4,
      gap: 3,
    },
    previewLine: {
      height: 3,
      borderRadius: 2,
    },
    previewRow: {
      flexDirection: 'row',
      gap: 3,
      marginTop: 1,
    },
    previewDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    previewButton: {
      height: 11,
      borderRadius: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewButtonText: {
      width: 22,
      height: 3,
      borderRadius: 2,
      opacity: 0.85,
    },
    optionText: {
      flex: 1,
      gap: 2,
    },
    optionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    optionName: {
      color: colors.textPrimary,
      fontSize: fonts.sizes.md,
      fontWeight: '700',
    },
    optionDescription: {
      color: colors.textSecondary,
      fontSize: fonts.sizes.xs + 1,
      lineHeight: 18,
    },
    modeTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: borderRadius.full,
      backgroundColor: colors.surfaceLight,
    },
    modeTagText: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '600',
    },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: colors.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
  })
);
