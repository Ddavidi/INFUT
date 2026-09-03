// Create Pelada Screen (Issue #25)
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Switch } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { createPelada } from '../../services/peladaService';
import { SPORTS } from '../../constants/sports';
import { colors, fonts, spacing, borderRadius } from '../../constants/theme';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

const DAYS = [
  { label: 'Segunda', value: 'monday' },
  { label: 'Terca', value: 'tuesday' },
  { label: 'Quarta', value: 'wednesday' },
  { label: 'Quinta', value: 'thursday' },
  { label: 'Sexta', value: 'friday' },
  { label: 'Sabado', value: 'saturday' },
  { label: 'Domingo', value: 'sunday' },
];

export function CreatePeladaScreen({ navigation }: Props) {
  const [title, setTitle] = useState('');
  const [selectedSport, setSelectedSport] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [price, setPrice] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceDay, setRecurrenceDay] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!title.trim() || !selectedSport || !date || !time || !location.trim()) {
      Alert.alert('Erro', 'Preencha os campos obrigatorios (titulo, esporte, data, hora, local)');
      return;
    }

    // Parse date/time
    const [day, month, year] = date.split('/');
    const [hours, minutes] = time.split(':');
    const dateTime = new Date(
      parseInt(year || '2026'),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hours),
      parseInt(minutes)
    );

    if (isNaN(dateTime.getTime())) {
      Alert.alert('Erro', 'Data ou hora invalida. Use DD/MM/AAAA e HH:MM');
      return;
    }

    setLoading(true);
    try {
      await createPelada({
        title: title.trim(),
        sport: selectedSport,
        dateTime: dateTime.toISOString(),
        location: location.trim(),
        locationAddress: locationAddress.trim() || null,
        price: price ? parseFloat(price) : null,
        maxPlayers: maxPlayers ? parseInt(maxPlayers) : null,
        isRecurring,
        recurrenceDay: isRecurring ? recurrenceDay : null,
      });

      Alert.alert('Sucesso', 'Peladinha criada!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Erro ao criar peladinha';
      Alert.alert('Erro', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Nova Peladinha</Text>

      <Input label="Titulo *" placeholder="Ex: Pelada da Quinta" value={title} onChangeText={setTitle} />

      {/* Sport selection */}
      <Text style={styles.sectionLabel}>Esporte *</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sportScroll}>
        {SPORTS.map((s) => (
          <TouchableOpacity
            key={s.sport}
            style={[styles.sportChip, selectedSport === s.sport && styles.sportChipSelected]}
            onPress={() => setSelectedSport(s.sport)}
          >
            <Text style={styles.sportEmoji}>{s.emoji}</Text>
            <Text style={[styles.sportName, selectedSport === s.sport && styles.sportNameSelected]}>
              {s.sport}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Input label="Data * (DD/MM/AAAA)" placeholder="06/09/2026" value={date} onChangeText={setDate} keyboardType="numeric" />
        </View>
        <View style={styles.halfInput}>
          <Input label="Hora * (HH:MM)" placeholder="18:00" value={time} onChangeText={setTime} keyboardType="numeric" />
        </View>
      </View>

      <Input label="Local *" placeholder="Quadra do SESI" value={location} onChangeText={setLocation} />
      <Input label="Endereco (opcional)" placeholder="Av. do Contorno, 1234" value={locationAddress} onChangeText={setLocationAddress} />

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Input label="Valor (R$)" placeholder="15.00" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
        </View>
        <View style={styles.halfInput}>
          <Input label="Max jogadores" placeholder="14" value={maxPlayers} onChangeText={setMaxPlayers} keyboardType="number-pad" />
        </View>
      </View>

      {/* Recurring toggle */}
      <View style={styles.switchRow}>
        <View>
          <Text style={styles.switchLabel}>Peladinha recorrente</Text>
          <Text style={styles.switchSubLabel}>Repete semanalmente</Text>
        </View>
        <Switch
          value={isRecurring}
          onValueChange={setIsRecurring}
          trackColor={{ false: colors.border, true: colors.primaryDark }}
          thumbColor={isRecurring ? colors.primary : colors.textMuted}
        />
      </View>

      {isRecurring && (
        <>
          <Text style={styles.sectionLabel}>Dia da semana</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sportScroll}>
            {DAYS.map((d) => (
              <TouchableOpacity
                key={d.value}
                style={[styles.sportChip, recurrenceDay === d.value && styles.sportChipSelected]}
                onPress={() => setRecurrenceDay(d.value)}
              >
                <Text style={[styles.sportName, recurrenceDay === d.value && styles.sportNameSelected]}>
                  {d.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      <Button title="Criar Peladinha" onPress={handleCreate} loading={loading} style={{ marginTop: spacing.lg, marginBottom: spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingTop: 60 },
  title: { fontSize: fonts.sizes.xxl, fontWeight: '900', color: colors.textPrimary, marginBottom: spacing.lg },
  sectionLabel: { color: colors.textSecondary, fontSize: fonts.sizes.sm, marginBottom: spacing.sm, fontWeight: '500' },
  sportScroll: { marginBottom: spacing.md },
  sportChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.xl, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    marginRight: spacing.sm,
  },
  sportChipSelected: { borderColor: colors.primary, backgroundColor: colors.darkTeal },
  sportEmoji: { fontSize: 20, marginRight: spacing.xs },
  sportName: { fontSize: fonts.sizes.sm, color: colors.textSecondary },
  sportNameSelected: { color: colors.primary, fontWeight: '600' },
  row: { flexDirection: 'row', gap: spacing.md },
  halfInput: { flex: 1 },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.surfaceLight, borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  switchLabel: { color: colors.textPrimary, fontSize: fonts.sizes.md, fontWeight: '600' },
  switchSubLabel: { color: colors.textMuted, fontSize: fonts.sizes.sm, marginTop: 2 },
});