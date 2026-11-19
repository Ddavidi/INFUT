// Pelada Config Modal (Gear Button) — Game rules, queue rotation, draw setup & pelada details
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  TextInput,
} from 'react-native';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { updatePelada, updatePeladaGameConfig } from '../../services/peladaService';
import { Pelada, PeladaDrawMode, PeladaGameMode } from '../../types';
import { colors, fonts, spacing, borderRadius, layout, shadows } from '../../constants/theme';
import { showMessage } from '../../utils/alerts';
import {
  DURATION_PRESETS,
  calculateEndTimeText,
  parseDurationHours,
} from '../../utils/dateTime';

export type ConfigModalTab = 'rules' | 'details';

interface PeladaConfigModalProps {
  visible: boolean;
  pelada: Pelada;
  initialTab?: ConfigModalTab;
  onClose: () => void;
  onSaved: (updated: Pelada) => void;
}

const MATCH_TIME_PRESETS = [7, 10, 12, 15];
const PLAYERS_PER_TEAM_PRESETS = [4, 5, 6, 7];
const FIXED_TEAMS_COUNTS = [2, 3, 4, 5, 6];
const TEAM_PRESET_NAMES = [
  'Time Amarelo',
  'Time Azul',
  'Time Vermelho',
  'Time Verde',
  'Time Preto',
  'Time Branco',
];

export function PeladaConfigModal({
  visible,
  pelada,
  initialTab = 'rules',
  onClose,
  onSaved,
}: PeladaConfigModalProps) {
  const isOrganizer = pelada.myRole === 'ORGANIZER';
  const [activeTab, setActiveTab] = useState<ConfigModalTab>(initialTab);
  const [saving, setSaving] = useState(false);

  // Tab 1: Game rules & Draw config
  const [matchDurationMinutes, setMatchDurationMinutes] = useState('10');
  const [playersPerTeam, setPlayersPerTeam] = useState('5');
  const [gameMode, setGameMode] = useState<PeladaGameMode>('WINNER_STAYS_QUEUE');
  const [drawMode, setDrawMode] = useState<PeladaDrawMode>('POSITION');
  const [fixedTeamsCount, setFixedTeamsCount] = useState(3);
  const [maxConsecutiveWins, setMaxConsecutiveWins] = useState<number>(0);
  const [teamNames, setTeamNames] = useState<string[]>([
    'Time Amarelo',
    'Time Azul',
    'Time Vermelho',
  ]);

  // Tab 2: Pelada info & Finance
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [durationHours, setDurationHours] = useState('2');
  const [location, setLocation] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [whatsappGroupUrl, setWhatsappGroupUrl] = useState('');
  const [price, setPrice] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('');
  const [cancelDeadlineHours, setCancelDeadlineHours] = useState('4');
  const [pixKey, setPixKey] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [goalkeepersExempt, setGoalkeepersExempt] = useState(true);

  useEffect(() => {
    if (!visible || !pelada) return;
    setActiveTab(initialTab);

    const cfg = pelada.gameConfig || {
      matchDurationMinutes: 10,
      playersPerTeam: pelada.playersPerTeam || 5,
      gameMode: 'WINNER_STAYS_QUEUE' as PeladaGameMode,
      drawMode: 'POSITION' as PeladaDrawMode,
      fixedTeamsCount: 3,
      teamNames: ['Time Amarelo', 'Time Azul', 'Time Vermelho'],
    };

    setMatchDurationMinutes(String(cfg.matchDurationMinutes || 10));
    setPlayersPerTeam(String(cfg.playersPerTeam || pelada.playersPerTeam || 5));
    setGameMode(cfg.gameMode || 'WINNER_STAYS_QUEUE');
    setDrawMode(cfg.drawMode || 'POSITION');
    setFixedTeamsCount(cfg.fixedTeamsCount || 3);
    setMaxConsecutiveWins(cfg.maxConsecutiveWins || 0);
    setTeamNames(
      cfg.teamNames && cfg.teamNames.length >= 2
        ? [...cfg.teamNames]
        : ['Time Amarelo', 'Time Azul', 'Time Vermelho']
    );

    const d = new Date(pelada.dateTime);
    setTitle(pelada.title);
    setDate(
      `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
        .toString()
        .padStart(2, '0')}/${d.getFullYear()}`
    );
    setTime(
      `${d.getHours().toString().padStart(2, '0')}:${d
        .getMinutes()
        .toString()
        .padStart(2, '0')}`
    );
    setDurationHours(String(pelada.durationHours ?? 2));
    setLocation(pelada.location || '');
    setLocationAddress(pelada.locationAddress || '');
    setWhatsappGroupUrl(pelada.whatsappGroupUrl || '');
    setPrice(pelada.price != null ? String(pelada.price) : '');
    setMaxPlayers(pelada.maxPlayers != null ? String(pelada.maxPlayers) : '');
    setCancelDeadlineHours(String(pelada.cancelDeadlineHours ?? 4));
    setPixKey(pelada.pixKey || '');
    setIsPublic(pelada.isPublic);
    setGoalkeepersExempt(pelada.goalkeepersExempt);
  }, [visible, pelada, initialTab]);

  const displayedTeamCount = gameMode === 'WINNER_STAYS_QUEUE' ? 2 : fixedTeamsCount;

  function ensureTeamNamesLength(count: number, current: string[]): string[] {
    const next = [...current];
    while (next.length < count) {
      const candidate =
        TEAM_PRESET_NAMES.find((p) => !next.includes(p)) || `Time ${next.length + 1}`;
      next.push(candidate);
    }
    return next.slice(0, Math.max(count, 2));
  }

  function handleSelectFixedCount(count: number) {
    setFixedTeamsCount(count);
    setTeamNames((prev) => ensureTeamNamesLength(count, prev));
  }

  async function handleSaveRules() {
    const parsedMinutes = Math.max(1, Math.min(120, parseInt(matchDurationMinutes, 10) || 10));
    const parsedPerTeam = Math.max(1, Math.min(20, parseInt(playersPerTeam, 10) || 5));
    const finalNames = ensureTeamNamesLength(displayedTeamCount, teamNames).map(
      (n, idx) => n.trim() || `Time ${idx + 1}`
    );

    setSaving(true);
    try {
      const updated = await updatePeladaGameConfig(pelada.id, {
        matchDurationMinutes: parsedMinutes,
        playersPerTeam: parsedPerTeam,
        gameMode,
        drawMode,
        fixedTeamsCount: gameMode === 'FIXED_TEAMS' ? fixedTeamsCount : 2,
        teamNames: finalNames,
        maxConsecutiveWins,
      });
      onSaved(updated);
      onClose();
      showMessage('Regras salvas', 'As configurações de jogo e sorteio ficarão salvas para esta e as próximas peladas.');
    } catch (error: any) {
      showMessage('Erro', error.response?.data?.error || 'Não foi possível salvar as regras.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveDetails() {
    if (!title.trim() || !location.trim() || !date || !time) {
      showMessage('Campos obrigatórios', 'Preencha título, data, horário e local.');
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
      showMessage('Data inválida', 'Use DD/MM/AAAA e HH:MM.');
      return;
    }

    const parsedPrice = price.trim() ? parseFloat(price.replace(',', '.')) : null;
    const parsedDuration = parseDurationHours(durationHours);

    setSaving(true);
    try {
      const updated = await updatePelada(pelada.id, {
        title: title.trim(),
        dateTime: dateTime.toISOString(),
        durationHours: parsedDuration,
        location: location.trim(),
        locationAddress: locationAddress.trim() || null,
        whatsappGroupUrl: whatsappGroupUrl.trim() || null,
        price: parsedPrice !== null && !isNaN(parsedPrice) ? parsedPrice : null,
        maxPlayers: maxPlayers.trim() ? parseInt(maxPlayers, 10) : null,
        playersPerTeam: playersPerTeam.trim() ? parseInt(playersPerTeam, 10) : 5,
        cancelDeadlineHours: cancelDeadlineHours.trim() ? parseInt(cancelDeadlineHours, 10) : 4,
        pixKey: pixKey.trim() || null,
        isPublic,
        goalkeepersExempt,
      });
      onSaved(updated);
      onClose();
      showMessage('Dados salvos', 'Informações da pelada atualizadas.');
    } catch (error: any) {
      showMessage('Erro', error.response?.data?.error || 'Erro ao atualizar dados da pelada.');
    } finally {
      setSaving(false);
    }
  }

  const visibleNames = ensureTeamNamesLength(displayedTeamCount, teamNames);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.eyebrow}>CONFIGURAÇÕES DA PELADA</Text>
              <Text style={styles.title} numberOfLines={1}>
                {pelada.title}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtnBox}
              accessibilityRole="button"
              accessibilityLabel="Fechar configurações"
            >
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabItem, activeTab === 'rules' && styles.tabItemActive]}
              onPress={() => setActiveTab('rules')}
              accessibilityRole="tab"
              accessibilityState={{ selected: activeTab === 'rules' }}
            >
              <Text style={[styles.tabText, activeTab === 'rules' && styles.tabTextActive]}>
                Regras e Sorteio
              </Text>
            </TouchableOpacity>
            {isOrganizer && (
              <TouchableOpacity
                style={[styles.tabItem, activeTab === 'details' && styles.tabItemActive]}
                onPress={() => setActiveTab('details')}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === 'details' }}
              >
                <Text style={[styles.tabText, activeTab === 'details' && styles.tabTextActive]}>
                  Dados e Caixa
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator keyboardShouldPersistTaps="handled">
            {activeTab === 'rules' ? (
              <View style={styles.sectionStack}>
                {/* Match Time */}
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>Tempo de cada partida (minutos)</Text>
                  <View style={styles.pillsRow}>
                    {MATCH_TIME_PRESETS.map((mins) => {
                      const active = parseInt(matchDurationMinutes, 10) === mins;
                      return (
                        <TouchableOpacity
                          key={mins}
                          style={[styles.pillChip, active && styles.pillChipActive]}
                          onPress={() => setMatchDurationMinutes(String(mins))}
                        >
                          <Text style={[styles.pillText, active && styles.pillTextActive]}>
                            {mins} min
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    <TextInput
                      style={styles.inlineNumInput}
                      value={matchDurationMinutes}
                      onChangeText={setMatchDurationMinutes}
                      keyboardType="number-pad"
                      placeholder="10"
                      placeholderTextColor={colors.textMuted}
                      accessibilityLabel="Duração customizada da partida em minutos"
                    />
                  </View>
                </View>

                {/* Players per team */}
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>Jogadores de linha por time (+ 1 goleiro)</Text>
                  <View style={styles.pillsRow}>
                    {PLAYERS_PER_TEAM_PRESETS.map((qty) => {
                      const active = parseInt(playersPerTeam, 10) === qty;
                      return (
                        <TouchableOpacity
                          key={qty}
                          style={[styles.pillChip, active && styles.pillChipActive]}
                          onPress={() => setPlayersPerTeam(String(qty))}
                        >
                          <Text style={[styles.pillText, active && styles.pillTextActive]}>
                            {qty} na linha
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                    <TextInput
                      style={styles.inlineNumInput}
                      value={playersPerTeam}
                      onChangeText={setPlayersPerTeam}
                      keyboardType="number-pad"
                      placeholder="5"
                      placeholderTextColor={colors.textMuted}
                      accessibilityLabel="Quantidade customizada de linha por time"
                    />
                  </View>
                </View>

                {/* Game mode (Queue vs Fixed Teams) */}
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>Dinâmica dos times</Text>
                  <TouchableOpacity
                    style={[
                      styles.radioCard,
                      gameMode === 'WINNER_STAYS_QUEUE' && styles.radioCardActive,
                    ]}
                    onPress={() => setGameMode('WINNER_STAYS_QUEUE')}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: gameMode === 'WINNER_STAYS_QUEUE' }}
                  >
                    <Text
                      style={[
                        styles.radioTitle,
                        gameMode === 'WINNER_STAYS_QUEUE' && { color: colors.primary },
                      ]}
                    >
                      2 Times + Fila de Próximos (Quem perde sai)
                    </Text>
                    <Text style={styles.radioDesc}>
                      Jogam 2 times. Ao encerrar a partida, entra quem aguarda na fila garantida. Se
                      faltarem vagas para completar o time, o sistema sorteia aleatoriamente do time
                      que perdeu anteriormente e garante os restantes na próxima.
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.radioCard,
                      gameMode === 'FIXED_TEAMS' && styles.radioCardActive,
                    ]}
                    onPress={() => setGameMode('FIXED_TEAMS')}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: gameMode === 'FIXED_TEAMS' }}
                  >
                    <Text
                      style={[
                        styles.radioTitle,
                        gameMode === 'FIXED_TEAMS' && { color: colors.primary },
                      ]}
                    >
                      Times Fixos até o Final
                    </Text>
                    <Text style={styles.radioDesc}>
                      Sorteia os times completos no início e mantém as escalações fixas durante todo
                      o jogo (ex.: 3 times).
                    </Text>
                  </TouchableOpacity>

                  {gameMode === 'FIXED_TEAMS' && (
                    <View style={{ marginTop: spacing.xs }}>
                      <Text style={styles.subLabel}>Quantidade de times fixos:</Text>
                      <View style={styles.pillsRow}>
                        {FIXED_TEAMS_COUNTS.map((cnt) => {
                          const active = fixedTeamsCount === cnt;
                          return (
                            <TouchableOpacity
                              key={cnt}
                              style={[styles.pillChip, active && styles.pillChipActive]}
                              onPress={() => handleSelectFixedCount(cnt)}
                            >
                              <Text style={[styles.pillText, active && styles.pillTextActive]}>
                                {cnt} times
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </View>

                {/* Consecutive win limit */}
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>Limite de vitórias seguidas por time</Text>
                  <Text style={styles.radioDesc}>
                    Evita que o mesmo time domine a quadra a pelada inteira. Ao atingir o limite, o vencedor roda para a fila e dá lugar aos próximos.
                  </Text>
                  <View style={styles.pillsRow}>
                    {[
                      { val: 0, label: 'Sem limite' },
                      { val: 2, label: '2 vitórias' },
                      { val: 3, label: '3 vitórias' },
                      { val: 4, label: '4 vitórias' },
                      { val: 5, label: '5 vitórias' },
                    ].map((opt) => {
                      const active = maxConsecutiveWins === opt.val;
                      return (
                        <TouchableOpacity
                          key={opt.val}
                          style={[styles.pillChip, active && styles.pillChipActive]}
                          onPress={() => setMaxConsecutiveWins(opt.val)}
                        >
                          <Text style={[styles.pillText, active && styles.pillTextActive]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Draw mode */}
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>Critério do sorteio inicial</Text>
                  <View style={styles.pillsRow}>
                    {(
                      [
                        { key: 'POSITION', label: 'Por Posição' },
                        { key: 'RANDOM', label: 'Aleatório' },
                        { key: 'MANUAL', label: 'Manual' },
                      ] as { key: PeladaDrawMode; label: string }[]
                    ).map((opt) => {
                      const active = drawMode === opt.key;
                      return (
                        <TouchableOpacity
                          key={opt.key}
                          style={[styles.pillChip, active && styles.pillChipActive]}
                          onPress={() => setDrawMode(opt.key)}
                        >
                          <Text style={[styles.pillText, active && styles.pillTextActive]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Team Names */}
                <View style={styles.block}>
                  <Text style={styles.blockTitle}>
                    Nomes / Cores dos {displayedTeamCount} times em disputa
                  </Text>
                  {visibleNames.map((tName, idx) => (
                    <View key={idx} style={styles.teamNameRow}>
                      <Text style={styles.teamIdx}>{idx + 1}.</Text>
                      <TextInput
                        style={styles.teamNameInput}
                        value={tName}
                        onChangeText={(txt) =>
                          setTeamNames((prev) => {
                            const next = ensureTeamNamesLength(displayedTeamCount, prev);
                            next[idx] = txt;
                            return next;
                          })
                        }
                        placeholder={`Nome do Time ${idx + 1}`}
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                  ))}
                </View>

                <Text style={styles.persistHint}>
                  Essas configurações ficam salvas automaticamente para as próximas edições semanais desta pelada.
                </Text>

                <Button
                  title="Salvar Regras da Pelada"
                  onPress={handleSaveRules}
                  loading={saving}
                  style={{ marginTop: spacing.xs }}
                />
              </View>
            ) : (
              <View>
                <Input label="Título *" value={title} onChangeText={setTitle} />

                <View style={styles.row}>
                  <View style={styles.half}>
                    <Input label="Data (DD/MM/AAAA)" value={date} onChangeText={setDate} keyboardType="numeric" />
                  </View>
                  <View style={styles.half}>
                    <Input label="Início (HH:MM)" value={time} onChangeText={setTime} keyboardType="numeric" />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={styles.half}>
                    <Input
                      label="Duração (horas)"
                      value={durationHours}
                      onChangeText={setDurationHours}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>

                <View style={styles.pillsRow}>
                  {DURATION_PRESETS.map((h) => {
                    const selected = parseDurationHours(durationHours) === h;
                    return (
                      <TouchableOpacity
                        key={h}
                        style={[styles.pillChip, selected && styles.pillChipActive]}
                        onPress={() => setDurationHours(String(h))}
                      >
                        <Text style={[styles.pillText, selected && styles.pillTextActive]}>
                          {String(h).replace('.', ',')}h
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {calculateEndTimeText(time, durationHours) ? (
                  <View style={styles.endTimeBanner}>
                    <Text style={styles.endTimeBannerText}>
                      Término calculado: {calculateEndTimeText(time, durationHours)}
                    </Text>
                  </View>
                ) : null}

                <Input label="Local *" value={location} onChangeText={setLocation} />
                <Input label="Endereço" value={locationAddress} onChangeText={setLocationAddress} />

                <View style={styles.row}>
                  <View style={styles.half}>
                    <Input label="Valor (R$)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
                  </View>
                  <View style={styles.half}>
                    <Input label="Máx. linha" value={maxPlayers} onChangeText={setMaxPlayers} keyboardType="number-pad" />
                  </View>
                </View>

                <View style={styles.row}>
                  <View style={styles.half}>
                    <Input
                      label="Prazo desist. (h)"
                      value={cancelDeadlineHours}
                      onChangeText={setCancelDeadlineHours}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>

                <Input label="Chave Pix" value={pixKey} onChangeText={setPixKey} autoCapitalize="none" />
                <Input
                  label="Link do Grupo WhatsApp"
                  placeholder="https://chat.whatsapp.com/..."
                  value={whatsappGroupUrl}
                  onChangeText={setWhatsappGroupUrl}
                  autoCapitalize="none"
                />

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Pelada pública (aba Explorar)</Text>
                  <Switch
                    value={isPublic}
                    onValueChange={setIsPublic}
                    trackColor={{ false: colors.border, true: colors.primaryDark }}
                    thumbColor={isPublic ? colors.primary : colors.textMuted}
                  />
                </View>

                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Goleiros isentos de taxa</Text>
                  <Switch
                    value={goalkeepersExempt}
                    onValueChange={setGoalkeepersExempt}
                    trackColor={{ false: colors.border, true: colors.primaryDark }}
                    thumbColor={goalkeepersExempt ? colors.primary : colors.textMuted}
                  />
                </View>

                <Button
                  title="Salvar Dados e Caixa"
                  onPress={handleSaveDetails}
                  loading={saving}
                  style={{ marginTop: spacing.sm }}
                />
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.md,
  },
  card: {
    width: '100%',
    maxWidth: layout.maxWidth,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    maxHeight: '92%',
    ...shadows.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: fonts.sizes.xs,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.xl,
    fontWeight: '800',
    marginTop: 2,
  },
  closeBtnBox: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: { color: colors.textSecondary, fontSize: fonts.sizes.lg, fontWeight: '700' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    minHeight: 40,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemActive: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  tabText: {
    color: colors.textMuted,
    fontSize: fonts.sizes.xs,
    fontWeight: '700',
  },
  tabTextActive: {
    color: colors.textPrimary,
    fontWeight: '800',
  },
  sectionStack: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  block: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    padding: spacing.md,
    gap: spacing.sm,
  },
  blockTitle: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.sm,
    fontWeight: '700',
  },
  subLabel: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    alignItems: 'center',
  },
  pillChip: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm + 4,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  pillText: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs,
    fontWeight: '700',
  },
  pillTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  inlineNumInput: {
    width: 64,
    minHeight: 40,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    color: colors.textPrimary,
    fontSize: fonts.sizes.sm,
    fontWeight: '700',
    textAlign: 'center',
  },
  radioCard: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: 4,
  },
  radioCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  radioTitle: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.sm,
    fontWeight: '800',
  },
  radioDesc: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs,
    lineHeight: 18,
  },
  teamNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  teamIdx: {
    color: colors.textMuted,
    fontSize: fonts.sizes.xs,
    fontWeight: '800',
    width: 18,
  },
  teamNameInput: {
    flex: 1,
    minHeight: 42,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm + 4,
    color: colors.textPrimary,
    fontSize: fonts.sizes.sm,
    fontWeight: '700',
  },
  persistHint: {
    color: colors.textMuted,
    fontSize: fonts.sizes.xs,
    lineHeight: 18,
    textAlign: 'center',
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  half: { flex: 1, minWidth: 130 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 52,
  },
  switchLabel: { color: colors.textPrimary, fontSize: fonts.sizes.sm, fontWeight: '600', flex: 1, paddingRight: spacing.sm },
  endTimeBanner: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginVertical: spacing.sm,
  },
  endTimeBannerText: {
    color: colors.primary,
    fontSize: fonts.sizes.xs,
    fontWeight: '700',
  },
});
