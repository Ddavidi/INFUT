// Seletor de foto de perfil: mostra avatar atual e permite trocar ou remover
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from './Avatar';
import { pickSquarePhoto } from '../../utils/imagePicker';
import { colors, fonts, spacing, borderRadius, themed } from '../../constants/theme';

interface PhotoPickerProps {
  name: string;
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  size?: number;
}

export function PhotoPicker({ name, value, onChange, size = 88 }: PhotoPickerProps) {
  const [busy, setBusy] = useState(false);

  async function handlePick() {
    setBusy(true);
    try {
      const picked = await pickSquarePhoto(256);
      if (picked) onChange(picked);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.row}>
      <TouchableOpacity
        onPress={handlePick}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={value ? 'Trocar foto de perfil' : 'Adicionar foto de perfil'}
      >
        <Avatar name={name || '?'} photoUrl={value} size={size} borderColor={colors.borderStrong} />
        <View style={styles.cameraBadge}>
          {busy ? (
            <ActivityIndicator size="small" color={colors.textInverse} />
          ) : (
            <Ionicons name="camera" size={15} color={colors.textInverse} />
          )}
        </View>
      </TouchableOpacity>
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text style={styles.title}>Foto de perfil</Text>
        <Text style={styles.subtitle}>Aparece no campo da pelada e nas escalações.</Text>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.linkBtn} onPress={handlePick} disabled={busy}>
            <Text style={styles.linkText}>{value ? 'Trocar foto' : 'Escolher foto'}</Text>
          </TouchableOpacity>
          {value ? (
            <TouchableOpacity style={styles.linkBtn} onPress={() => onChange(null)} disabled={busy}>
              <Text style={[styles.linkText, { color: colors.textMuted }]}>Remover</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.card,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.sm,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  linkBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    minHeight: 34,
    justifyContent: 'center',
  },
  linkText: {
    color: colors.primary,
    fontSize: fonts.sizes.xs,
    fontWeight: '700',
  },
}));
