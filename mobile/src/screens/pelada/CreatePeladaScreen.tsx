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
import { colors, fonts, spacing, borderRadius, shadows, themed } from '../../constants/theme';
import { showMessage } from '../../utils/alerts';
import {
  DURATION_PRESETS,
  calculateEndTimeText,
  parseDurationHours,
} from '../../utils/dateTime';
import { useResponsive } from '../../hooks/useResponsive';
import { PriceFields, PriceFieldsValue, priceFieldsToPayload } from '../../components/pelada/PriceFields';
import { isValidHttpUrl, parseDateTimeBR, parseIntOrNull } from '../../utils/masks';

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
  const [prices, setPrices] = useState<PriceFieldsValue>({ diarista: '', goalkeeper: '', monthly: '' });
  const [maxPlayers, setMaxPlayers] = useState('');
  const [playersPerTeam, setPlayersPerTeam] = useState('5');
  const [cancelDeadlineHours, setCancelDeadlineHours] = useState('4');
  const [pixKey, setPixKey] = useState('');
  const [isPublic, setIsPublic] = useState(true);
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
    setPrices({ diarista: '', goalkeeper: '', monthly: '' });
    setMaxPlayers('');
    setPlayersPerTeam('5');
    setCancelDeadlineHours('4');
    setPixKey('');
    setIsPublic(true);
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

    const dateTime = parseDateTimeBR(date, time);
    if (!dateTime) {
      showMessage('Data inválida', 'Confira a data (DD/MM/AAAA) e o horário (HH:MM).');
      return;
    }
    if (dateTime.getTime() < Date.now() - 60 * 60 * 1000) {
      showMessage('Data no passado', 'Escolha uma data e horário a partir de agora.');
      return;
    }
    if (whatsappGroupUrl.trim() && !isValidHttpUrl(whatsappGroupUrl)) {
      showMessage('Link inválido', 'O link do grupo deve começar com https://');
      return;
    }
    const perTeam = parseIntOrNull(playersPerTeam) ?? 5;
    if (perTeam < 1 || perTeam > 20) {
      showMessage('Jogadores por time', 'Use um número entre 1 e 20.');
      return;
    }
    const max = parseIntOrNull(maxPlayers);
    if (max !== null && max < 2) {
      showMessage('Máximo de jogadores', 'O mínimo é 2 jogadores de linha.');
      return;
    }

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
        ...priceFieldsToPayload(prices),
        maxPlayers: max,
        playersPerTeam: perTeam,
        cancelDeadlineHours: Math.min(72, parseIntOrNull(cancelDeadlineHours) ?? 4),
        pixKey: pixKey.trim() || null,
        isPublic,
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
          maxLength={60}
        />

        <Text style={styles.sectionLabel}>Esporte *</Text>
        <View style={styles.chipsWrapGrid}>
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
        </View>
      </View>

      {/* Secao 2: Data e Localizacao */}
      <View style={styles.sectionCard}>
        <Text style={styles.cardStepLabel}>2. DATA E LOCALIZAÇÃO</Text>
        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Input label="Data *" mask="date" value={date} onChangeText={setDate} />
          </View>
          <View style={styles.halfInput}>
            <Input label="Início *" mask="time" value={time} onChangeText={setTime} />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Input
              label="Duração (horas)"
              placeholder="2"
              mask="decimal"
              value={durationHours}
              onChangeText={setDurationHours}
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>Duração rápida</Text>
        <View style={styles.chipsWrapGrid}>
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
        </View>

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
      <PriceFields value={prices} onChange={setPrices} />

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Input
            label="Max jogadores linha"
            placeholder="14"
            mask="integer"
            maxLength={2}
            value={maxPlayers}
            onChangeText={setMaxPlayers}
          />
        </View>
      </View>

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <Input
            label="Linha por time"
            placeholder="5"
            mask="integer"
            maxLength={2}
            value={playersPerTeam}
            onChangeText={setPlayersPerTeam}
          />
        </View>
        <View style={styles.halfInput}>
          <Input
            label="Prazo desist. (horas)"
            placeholder="4"
            mask="integer"
            maxLength={2}
            value={cancelDeadlineHours}
            onChangeText={setCancelDeadlineHours}
          />
        </View>
      </View>

      <Input
        label="Chave Pix (opcional)"
        placeholder="CPF, email, telefone ou aleatoria"
        value={pixKey}
        onChangeText={setPixKey}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={77}
      />

      <Input
        label="Link do Grupo no WhatsApp (opcional)"
        placeholder="https://chat.whatsapp.com/..."
        value={whatsappGroupUrl}
        onChangeText={(v) => setWhatsappGroupUrl(v.trim())}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        error={
          whatsappGroupUrl && !isValidHttpUrl(whatsappGroupUrl)
            ? 'O link deve começar com https://'
            : undefined
        }
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
          <View style={[styles.chipsWrapGrid, { marginBottom: 0 }]}>
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
          </View>
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

const styles = themed(() => StyleSheet.create({
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
    color: colors.textMuted,
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
  chipsWrapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    marginBottom: spacing.xs,
  },
  sportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    minHeight: 38,
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
    backgroundColor: colors.infoSoft,
    borderWidth: 1,
    borderColor: colors.infoBorder,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  endTimeBannerText: {
    color: colors.info,
    fontSize: fonts.sizes.xs,
    fontWeight: '700',
  },
}));
