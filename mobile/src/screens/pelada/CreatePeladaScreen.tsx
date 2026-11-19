// Create Pelada Screen (with Pix, Public/Private visibility, Team size, and Goalkeeper exemption)
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { createPelada } from '../../services/peladaService';
import { SPORTS } from '../../constants/sports';
import { colors, fonts, spacing, borderRadius, shadows } from '../../constants/theme';
import { showMessage } from '../../utils/alerts';
import {
  DURATION_PRESETS,
  calculateEndTimeText,
  parseDurationHours,
} from '../../utils/dateTime';
import { useResponsive } from '../../hooks/useResponsive';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

const DAYS = [
  { label: 'Segunda', value: 'monday' },
  { label: 'Terça', value: 'tuesday' },
  { label: 'Quarta', value: 'wednesday' },
  { label: 'Quinta', value: 'thursday' },
  { label: 'Sexta', value: 'friday' },
  { label: 'Sábado', value: 'saturday' },
  { label: 'Domingo', value: 'sunday' },
];

export function CreatePeladaScreen({ navigation }: Props) {
  const { isDesktop, containerMaxWidth, pagePadding, topSpace } = useResponsive();
  const [title, setTitle] = useState('');
  const [selectedSport, setSelectedSport] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [durationHours, setDurationHours] = useState('2');
  const [location, setLocation] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [whatsappGroupUrl, setWhatsappGroupUrl] = useState('');
  const [price, setPrice] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('');
  const [playersPerTeam, setPlayersPerTeam] = useState('5');
  const [cancelDeadlineHours, setCancelDeadlineHours] = useState('4');
  const [pixKey, setPixKey] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [goalkeepersExempt, setGoalkeepersExempt] = useState(true);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceDay, setRecurrenceDay] = useState('');
  const [loading, setLoading] = useState(false);

  function resetForm() {
    setTitle('');
    setSelectedSport('');
    setDate('');
    setTime('');
    setDurationHours('2');
    setLocation('');
    setLocationAddress('');
    setWhatsappGroupUrl('');
    setPrice('');
    setMaxPlayers('');
    setPlayersPerTeam('5');
    setCancelDeadlineHours('4');
    setPixKey('');
    setIsPublic(true);
    setGoalkeepersExempt(true);
    setIsRecurring(false);
    setRecurrenceDay('');
  }

  async function handleCreate() {
    if (!title.trim() || !selectedSport || !date || !time || !location.trim()) {
      showMessage(
        'Campos obrigatorios',
        'Preencha titulo, esporte, data, hora e local da pelada.'
      );
      return;
    }

    const [day, month, year] = date.split('/');
    const [hours, minutes] = time.split(':');
    const dateTime = new Date(
      parseInt(year || '2026', 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      parseInt(hours, 10),
      parseInt(minutes, 10)
    );

    if (isNaN(dateTime.getTime())) {
      showMessage('Data invalida', 'Use os formatos DD/MM/AAAA e HH:MM');
      return;
    }

    const parsedPrice = price.trim()
      ? parseFloat(price.replace(',', '.'))
      : null;
    const parsedDuration = parseDurationHours(durationHours);

    setLoading(true);
    try {
      const created = await createPelada({
        title: title.trim(),
        sport: selectedSport,
        dateTime: dateTime.toISOString(),
        durationHours: parsedDuration,
        whatsappGroupUrl: whatsappGroupUrl.trim() || null,
        location: location.trim(),
        locationAddress: locationAddress.trim() || null,
        price: parsedPrice !== null && !isNaN(parsedPrice) ? parsedPrice : null,
        maxPlayers: maxPlayers.trim() ? parseInt(maxPlayers, 10) : null,
        playersPerTeam: playersPerTeam.trim() ? parseInt(playersPerTeam, 10) : 5,
        cancelDeadlineHours: cancelDeadlineHours.trim() ? parseInt(cancelDeadlineHours, 10) : 4,
        pixKey: pixKey.trim() || null,
        isPublic,
        goalkeepersExempt,
        isRecurring,
        recurrenceDay: isRecurring ? recurrenceDay || null : null,
      });

      resetForm();
      showMessage(
        'Peladinha criada!',
        `Codigo de convite: ${created.inviteCode}`
      );
      navigation.navigate('PeladaDetails', { peladaId: created.id });
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Erro ao criar peladinha';
      showMessage('Erro', msg);
    } finally {
      setLoading(false);
    }
  }

  const section1And2 = (
    <>
      {/* Secao 1: Modalidade e Identificacao */}
      <View style={styles.sectionCard}>
        <Text style={styles.cardStepLabel}>1. MODALIDADE E IDENTIFICAÇÃO</Text>
        <Input
          label="Título *"
          placeholder="Ex: Pelada da Quinta"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.sectionLabel}>Esporte *</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sportScroll}>
          {SPORTS.map((s) => (
            <TouchableOpacity
              key={s.sport}
              style={[styles.sportChip, selectedSport === s.sport && styles.sportChipSelected]}
              onPress={() => setSelectedSport(s.sport)}
              accessibilityRole="button"
              accessibilityLabel={s.sport}
              accessibilityState={{ selected: selectedSport === s.sport }}
            >
              <Text style={[styles.sportName, selectedSport === s.sport && styles.sportNameSelected]}>
                {s.sport}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Secao 2: Data e Localizacao */}
      <View style={styles.sectionCard}>
        <Text style={styles.cardStepLabel}>2. DATA E LOCALIZAÇÃO</Text>
        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Input
              label="Data * (DD/MM/AAAA)"
              placeholder="20/11/2026"
              value={date}
              onChangeText={setDate}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.halfInput}>
            <Input
              label="Início * (HH:MM)"
              placeholder="20:00"
              value={time}
              onChangeText={setTime}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Input
              label="Duração (horas)"
              placeholder="2"
              value={durationHours}
              onChangeText={setDurationHours}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>Duração rápida</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sportScroll}>
          {DURATION_PRESETS.map((h) => {
            const selected = parseDurationHours(durationHours) === h;
            return (
              <TouchableOpacity
                key={h}
                style={[styles.sportChip, selected && styles.sportChipSelected]}
                onPress={() => setDurationHours(String(h))}
                accessibilityRole="button"
                accessibilityLabel={`Duração de ${h} horas`}
                accessibilityState={{ selected }}
              >
                <Text style={[styles.sportName, selected && styles.sportNameSelected]}>
                  {String(h).replace('.', ',')}h
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {calculateEndTimeText(time, durationHours) ? (
          <View style={styles.endTimeBanner}>
            <Text style={styles.endTimeBannerText}>
              Horário: Início às {time.trim()} • Término automático às{' '}
              {calculateEndTimeText(time, durationHours)}
            </Text>
          </View>
        ) : null}

        <Input
          label="Local *"
          placeholder="Quadra do SESI"
          value={location}
          onChangeText={setLocation}
        />
        <Input
          label="Endereço / Bairro (opcional)"
          placeholder="Av. do Contorno, 1234 - Centro"
          value={locationAddress}
          onChangeText={setLocationAddress}
        />
      </View>
    </>
  );

  const section3 = (
    <View style={styles.sectionCard}>
      <Text style={styles.cardStepLabel}>3. REGRAS, TIME E FINANCEIRO</Text>
      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Input
            label="Valor (R$)"
            placeholder="15.00"
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
          />
        </View>
        <View style={styles.halfInput}>
          <Input
            label="Max jogadores linha"
            placeholder="14"
            value={maxPlayers}
            onChangeText={setMaxPlayers}
            keyboardType="number-pad"
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Input
            label="Linha por time"
            placeholder="5"
            value={playersPerTeam}
            onChangeText={setPlayersPerTeam}
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.halfInput}>
          <Input
            label="Prazo desist. (horas)"
            placeholder="4"
            value={cancelDeadlineHours}
            onChangeText={setCancelDeadlineHours}
            keyboardType="number-pad"
          />
        </View>
      </View>

      <Input
        label="Chave Pix (opcional)"
        placeholder="CPF, email, telefone ou aleatoria"
        value={pixKey}
        onChangeText={setPixKey}
        autoCapitalize="none"
      />

      <Input
        label="Link do Grupo no WhatsApp (opcional)"
        placeholder="https://chat.whatsapp.com/..."
        value={whatsappGroupUrl}
        onChangeText={setWhatsappGroupUrl}
        autoCapitalize="none"
      />

      {/* Public toggle */}
      <View style={styles.switchRow}>
        <View style={{ flex: 1, paddingRight: spacing.sm }}>
          <Text style={styles.switchLabel}>Pelada pública</Text>
          <Text style={styles.switchSubLabel}>
            Aparece na aba Explorar para jogadores da região
          </Text>
        </View>
        <Switch
          value={isPublic}
          onValueChange={setIsPublic}
          trackColor={{ false: colors.border, true: colors.primaryDark }}
          thumbColor={isPublic ? colors.primary : colors.textMuted}
        />
      </View>

      {/* Goalkeepers exempt toggle */}
      <View style={styles.switchRow}>
        <View style={{ flex: 1, paddingRight: spacing.sm }}>
          <Text style={styles.switchLabel}>Goleiros isentos</Text>
          <Text style={styles.switchSubLabel}>Goleiros não pagam taxa da quadra</Text>
        </View>
        <Switch
          value={goalkeepersExempt}
          onValueChange={setGoalkeepersExempt}
          trackColor={{ false: colors.border, true: colors.primaryDark }}
          thumbColor={goalkeepersExempt ? colors.primary : colors.textMuted}
        />
      </View>

      {/* Recurring toggle */}
      <View style={[styles.switchRow, !isRecurring && { marginBottom: 0 }]}>
        <View style={{ flex: 1, paddingRight: spacing.sm }}>
          <Text style={styles.switchLabel}>Peladinha recorrente</Text>
          <Text style={styles.switchSubLabel}>Repete semanalmente (cria próximas 4)</Text>
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
          <Text style={[styles.sectionLabel, { marginTop: spacing.sm }]}>Dia da semana</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.sportScroll, { marginBottom: 0 }]}>
            {DAYS.map((d) => (
              <TouchableOpacity
                key={d.value}
                style={[styles.sportChip, recurrenceDay === d.value && styles.sportChipSelected]}
                onPress={() => setRecurrenceDay(d.value)}
                accessibilityRole="button"
                accessibilityLabel={d.label}
                accessibilityState={{ selected: recurrenceDay === d.value }}
              >
                <Text style={[styles.sportName, recurrenceDay === d.value && styles.sportNameSelected]}>
                  {d.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingHorizontal: pagePadding,
          paddingTop: topSpace,
          paddingBottom: isDesktop ? spacing.xxl : 100,
        },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.pageContainer, { maxWidth: containerMaxWidth }]}>
        <View style={styles.headerBlock}>
          <Text style={styles.title}>Nova Peladinha</Text>
          <Text style={styles.subtitle}>
            Configure local, vagas, sorteio e financeiro em segundos
          </Text>
        </View>

        {isDesktop ? (
          <View style={styles.desktopColumns}>
            <View style={styles.desktopCol}>{section1And2}</View>
            <View style={styles.desktopCol}>
              {section3}
              <Button
                title="Criar Peladinha"
                onPress={handleCreate}
                loading={loading}
                style={{ marginTop: spacing.sm }}
              />
            </View>
          </View>
        ) : (
          <>
            {section1And2}
            {section3}
            <Button
              title="Criar Peladinha"
              onPress={handleCreate}
              loading={loading}
              style={{ marginTop: spacing.sm, marginBottom: spacing.xxl }}
            />
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: {},
  pageContainer: {
    width: '100%',
    alignSelf: 'center',
  },
  desktopColumns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.lg,
  },
  desktopCol: {
    flex: 1,
    minWidth: 0,
  },
  headerBlock: {
    marginBottom: spacing.lg,
  },
  title: { fontSize: fonts.sizes.xxl, fontWeight: '900', color: colors.textPrimary },
  subtitle: { fontSize: fonts.sizes.sm, color: colors.textSecondary, marginTop: 4 },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md + 2,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md + 2,
    ...shadows.card,
  },
  cardStepLabel: {
    color: colors.primary,
    fontSize: fonts.sizes.xs,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs,
    marginBottom: spacing.sm,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  sportScroll: { marginBottom: spacing.xs, flexGrow: 0 },
  sportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    minHeight: 40,
    marginRight: spacing.sm,
  },
  sportChipSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  sportEmoji: { fontSize: 18, marginRight: spacing.xs },
  sportName: { fontSize: fonts.sizes.xs, color: colors.textSecondary, fontWeight: '600' },
  sportNameSelected: { color: colors.primary, fontWeight: '800' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  halfInput: { flex: 1, minWidth: 130 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm + 2,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  switchLabel: { color: colors.textPrimary, fontSize: fonts.sizes.sm, fontWeight: '700' },
  switchSubLabel: { color: colors.textMuted, fontSize: fonts.sizes.xs, marginTop: 2 },
  endTimeBanner: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  endTimeBannerText: {
    color: colors.primary,
    fontSize: fonts.sizes.xs,
    fontWeight: '700',
  },
});
