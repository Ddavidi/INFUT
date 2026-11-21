// Avatar circular: foto quando existir, senao iniciais sobre cor estavel por nome
import React from 'react';
import { View, Text, Image, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors } from '../../constants/theme';

const PALETTE = ['#2563EB', '#16A34A', '#DC2626', '#9333EA', '#EA580C', '#0891B2', '#CA8A04', '#DB2777'];

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

interface AvatarProps {
  name: string;
  photoUrl?: string | null;
  size?: number;
  /** quadrado com cantos arredondados (como nas escalacoes) em vez de circulo */
  rounded?: boolean;
  borderColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function Avatar({ name, photoUrl, size = 40, rounded = false, borderColor, style }: AvatarProps) {
  const radius = rounded ? Math.round(size * 0.28) : size / 2;
  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: photoUrl ? colors.surfaceLight : colorFor(name || '?'),
          borderColor: borderColor || 'rgba(255,255,255,0.85)',
        },
        style,
      ]}
      accessibilityLabel={`Foto de ${name}`}
    >
      {photoUrl ? (
        <Image
          source={{ uri: photoUrl }}
          style={{ width: size - 2, height: size - 2, borderRadius: radius }}
          resizeMode="cover"
        />
      ) : (
        <Text style={[styles.initials, { fontSize: Math.max(10, Math.round(size * 0.38)) }]}>
          {getInitials(name || '?')}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});
