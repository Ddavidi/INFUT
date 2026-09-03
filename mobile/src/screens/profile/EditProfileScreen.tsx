// Edit Profile Screen (Issue #20)
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { updateProfile } from '../../services/userService';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { SPORTS, getPositionsForSport } from '../../constants/sports';
import { colors, fonts, spacing, borderRadius } from '../../constants/theme';

export function EditProfileScreen() {
  const { user, refreshUser } = useAuth();
  
  const [name, setName] = useState('');
  const [selectedSport, setSelectedSport] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('');
  const [loading, setLoading] = useState(false);
  const [positions, setPositions] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setSelectedSport(user.sport || '');
      setSelectedPosition(user.position || '');
    }
  }, [user]);

  useEffect(() => {
    if (selectedSport) {
      setPositions(getPositionsForSport(selectedSport));
    } else {
      setPositions([]);
    }
  }, [selectedSport]);

  async function handleSave() {
    setLoading(true);
    try {
      await updateProfile({
        name: name.trim(),
        sport: selectedSport || undefined,
        position: selectedPosition || undefined,
      });
      await refreshUser();
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Erro ao atualizar perfil';
      Alert.alert('Erro', msg);
    } finally {
      setLoading(false);
    }
  }

  if (!user) return <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Seu Perfil</Text>
      
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.email}>{user.email}</Text>
      </View>

      <Input label="Nome" placeholder="Seu nome" value={name} onChangeText={setName} />

      <Text style={styles.sectionLabel}>Esporte Favorito</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
        {SPORTS.map((s) => (
          <TouchableOpacity
            key={s.sport}
            style={[styles.chip, selectedSport === s.sport && styles.chipSelected]}
            onPress={() => {
              setSelectedSport(s.sport);
              setSelectedPosition('');
            }}
          >
            <Text style={styles.chipEmoji}>{s.emoji}</Text>
            <Text style={[styles.chipText, selectedSport === s.sport && styles.chipTextSelected]}>
              {s.sport}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {positions.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Posição Preferida</Text>
          <View style={styles.positionsGrid}>
            {positions.map((pos) => (
              <TouchableOpacity
                key={pos}
                style={[styles.positionChip, selectedPosition === pos && styles.chipSelected]}
                onPress={() => setSelectedPosition(pos)}
              >
                <Text style={[styles.positionText, selectedPosition === pos && styles.chipTextSelected]}>
                  {pos}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <Button title="Salvar Alterações" onPress={handleSave} loading={loading} style={{ marginTop: spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: 60 },
  title: { fontSize: fonts.sizes.xxl, fontWeight: '900', color: colors.textPrimary, marginBottom: spacing.lg },
  avatarContainer: { alignItems: 'center', marginBottom: spacing.xl },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: colors.textInverse },
  email: { color: colors.textSecondary, fontSize: fonts.sizes.md },
  sectionLabel: { color: colors.textSecondary, fontSize: fonts.sizes.sm, marginBottom: spacing.sm, fontWeight: '500', marginTop: spacing.md },
  horizontalScroll: { marginBottom: spacing.md, flexGrow: 0 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.xl, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    marginRight: spacing.sm,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.darkTeal },
  chipEmoji: { fontSize: 20, marginRight: spacing.xs },
  chipText: { fontSize: fonts.sizes.sm, color: colors.textSecondary },
  chipTextSelected: { color: colors.primary, fontWeight: '600' },
  positionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  positionChip: {
    backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  positionText: { fontSize: fonts.sizes.sm, color: colors.textSecondary },
});