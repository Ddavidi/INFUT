// Live Pelada Screen - Timer, Random or Manual Teams, Scoreboard, Goals/Assists & Finish Match
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation';
import {
  drawPeladaTeams,
  getPeladaById,
  recordPeladaMatch,
  setManualPeladaTeams,
  updatePeladaStatus,
  updatePlayerStats,
} from '../../services/peladaService';
import { Pelada, PeladaPlayer } from '../../types';
import { colors, fonts, spacing, borderRadius, shadows } from '../../constants/theme';
import { showConfirm, showMessage } from '../../utils/alerts';
import { buildInviteUrl, shareOrCopyText } from '../../utils/inviteLink';
import { useResponsive } from '../../hooks/useResponsive';

type Props = NativeStackScreenProps<AppStackParamList, 'LivePelada'>;

const HIT_SLOP = { top: 4, bottom: 4, left: 4, right: 4 };
const TEAM_COLOR_PRESETS = [
  'Time Amarelo',
  'Time Azul',
  'Time Vermelho',
  'Time Verde',
  'Time Preto',
  'Time Branco',
  'Com Colete',
  'Sem Colete',
];

function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

export function LivePeladaScreen({ navigation, route }: Props) {
  const { peladaId } = route.params;
  const { isDesktop, isCompact, containerMaxWidth, pagePadding, topSpace } = useResponsive();

  const [pelada, setPelada] = useState<Pelada | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Match timer state
  const [timerDuration, setTimerDuration] = useState(600);
  const [timerSeconds, setTimerSeconds] = useState(600);
  const [timerRunning, setTimerRunning] = useState(false);

  // Live scoreboard state
  const [teamAIdx, setTeamAIdx] = useState(0);
  const [teamBIdx, setTeamBIdx] = useState(1);
  const [scoreA, setScoreA] = useState(0);
  const [scoreB, setScoreB] = useState(0);

  // Team names & manual team builder state
  const [teamNames, setTeamNames] = useState<string[]>(['Time Amarelo', 'Time Azul']);
  const [focusedTeamIdx, setFocusedTeamIdx] = useState<number>(0);
  const [manualMode, setManualMode] = useState(false);
  const [manualAssignments, setManualAssignments] = useState<Record<string, number>>({});

  const loadPelada = useCallback(async () => {
    try {
      const data = await getPeladaById(peladaId);
      setPelada(data);
      if (data.teams && data.teams.length >= 2) {
        setTeamNames(data.teams.map((t) => t.name));
      }
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Erro ao carregar pelada ao vivo';
      showMessage('Erro', msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [peladaId]);

  useFocusEffect(
    useCallback(() => {
      loadPelada();
    }, [loadPelada])
  );

  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          setTimerRunning(false);
          showMessage('Tempo Esgotado! ⏱️', 'Fim da partida! Hora de registrar o placar ou trocar os times.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  const canManage = pelada?.myRole === 'ORGANIZER' || pelada?.myRole === 'CO_ORGANIZER';

  async function runAction(fn: () => Promise<Pelada>, successToast?: string) {
    setActionLoading(true);
    try {
      const updated = await fn();
      setPelada(updated);
      if (successToast) {
        showMessage('Pronto!', successToast);
      }
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Não foi possível concluir a ação';
      showMessage('Erro', msg);
    } finally {
      setActionLoading(false);
    }
  }

  function getNormalizedTeamNames(): string[] {
    return teamNames.map((n, idx) => n.trim() || `Time ${idx + 1}`);
  }

  function handleAddTeamName() {
    if (teamNames.length >= 8) return;
    const nextPreset =
      TEAM_COLOR_PRESETS.find((p) => !teamNames.includes(p)) || `Time ${teamNames.length + 1}`;
    const nextList = [...teamNames, nextPreset];
    setTeamNames(nextList);
    setFocusedTeamIdx(nextList.length - 1);
  }

  function handleRemoveTeamName(idx: number) {
    if (teamNames.length <= 2) return;
    const nextList = teamNames.filter((_, i) => i !== idx);
    setTeamNames(nextList);
    setFocusedTeamIdx((prev) => Math.min(prev, nextList.length - 1));
    setManualAssignments((prev) => {
      const updated: Record<string, number> = {};
      for (const [pid, tIdx] of Object.entries(prev)) {
        if (tIdx < idx) updated[pid] = tIdx;
        else if (tIdx > idx) updated[pid] = tIdx - 1;
      }
      return updated;
    });
  }

  function handleSaveTeamNamesOnly() {
    if (!pelada || pelada.teams.length < 2) return;
    const cleaned = getNormalizedTeamNames();
    const renamedTeams = pelada.teams.map((team, idx) => ({
      name: cleaned[idx] || team.name,
      playerIds: team.players.map((p) => p.id),
    }));
    runAction(
      () => setManualPeladaTeams(pelada.id, renamedTeams),
      'Nomes dos times atualizados!'
    );
  }

  function openManualTeamBuilder() {
    if (!pelada) return;
    const nextMap: Record<string, number> = {};
    if (pelada.teams.length >= 2) {
      pelada.teams.forEach((team, idx) => {
        team.players.forEach((tp) => {
          nextMap[tp.id] = idx;
        });
      });
    }
    setManualAssignments(nextMap);
    setManualMode((prev) => !prev);
  }

  function assignPlayerToTeam(playerId: string, teamIdx: number | null) {
    setManualAssignments((prev) => {
      const next = { ...prev };
      if (teamIdx === null) {
        delete next[playerId];
      } else {
        next[playerId] = teamIdx;
      }
      return next;
    });
  }

  function handleSaveManualTeams() {
    if (!pelada) return;
    const names = getNormalizedTeamNames();
    const builtTeams = names
      .map((name, idx) => {
        const playerIds = Object.entries(manualAssignments)
          .filter(([, assignedIdx]) => assignedIdx === idx)
          .map(([playerId]) => playerId);
        return {
          name,
          playerIds,
        };
      })
      .filter((t) => t.playerIds.length > 0);

    if (builtTeams.length < 2) {
      showMessage('Times incompletos', 'Distribua jogadores em pelo menos 2 times antes de salvar.');
      return;
    }

    runAction(async () => {
      const updated = await setManualPeladaTeams(pelada.id, builtTeams);
      setManualMode(false);
      setTeamAIdx(0);
      setTeamBIdx(1);
      return updated;
    }, 'Times definidos manualmente!');
  }

  function handleRecordMatch() {
    if (!pelada || pelada.teams.length < 2) return;
    const teamA = pelada.teams[teamAIdx] || pelada.teams[0];
    const teamB = pelada.teams[teamBIdx] || pelada.teams[1];
    if (!teamA || !teamB || teamA.name === teamB.name) {
      showMessage('Times inválidos', 'Selecione dois times diferentes para registrar o placar.');
      return;
    }

    runAction(async () => {
      const updated = await recordPeladaMatch(pelada.id, {
        teamAName: teamA.name,
        teamBName: teamB.name,
        scoreA,
        scoreB,
      });
      setScoreA(0);
      setScoreB(0);
      return updated;
    }, 'Partida registrada! Vitórias atualizadas.');
  }

  function handleFinishPelada() {
    if (!pelada) return;
    showConfirm(
      'Finalizar Pelada',
      'Ao finalizar, a pelada entrará em pós-jogo para conferir quem não compareceu, ver as estatísticas e liberar a votação do MVP para todos.',
      async () => {
        setActionLoading(true);
        try {
          await updatePeladaStatus(pelada.id, 'FINISHED');
          navigation.replace('PostGame', { peladaId: pelada.id });
        } catch (error: any) {
          showMessage('Erro', error.response?.data?.error || 'Não foi possível finalizar a pelada');
        } finally {
          setActionLoading(false);
        }
      },
      'Finalizar Pelada'
    );
  }

  async function handleShareTeamsWhatsApp() {
    if (!pelada || pelada.teams.length === 0) return;

    const assignedIds = new Set(pelada.teams.flatMap((t) => t.players.map((p) => p.id)));
    const unassigned = pelada.players.filter(
      (p) => p.status === 'CONFIRMED' && !assignedIds.has(p.id)
    );

    const teamsBlock = pelada.teams
      .map((team) => {
        const playersLines = team.players
          .map(
            (tp, idx) =>
              `${idx + 1}. ${tp.isGoalkeeper ? '🧤 ' : ''}${tp.name}${
                tp.position ? ` (${tp.position})` : ''
              }`
          )
          .join('\n');
        return `👕 *${team.name}* (${team.players.length} atletas)\n${playersLines}`;
      })
      .join('\n\n');

    const unassignedBlock =
      unassigned.length > 0
        ? `\n\n🔄 *Próximo / De fora* (${unassigned.length})\n` +
          unassigned
            .map(
              (p) =>
                `• ${p.isGoalkeeper ? '🧤 ' : ''}${p.displayName}${
                  p.position ? ` (${p.position})` : ''
                }`
            )
            .join('\n')
        : '';

    const message =
      `⚽ *${pelada.title} — Escalação dos Times*\n\n` +
      `${teamsBlock}${unassignedBlock}\n\n` +
      `🔗 Acompanhe no INFUT: ${buildInviteUrl(pelada.inviteCode)}`;

    await shareOrCopyText(
      'Escalação copiada! 📲',
      message,
      'Escalação dos times copiada! Agora é só colar no grupo do WhatsApp.'
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <View style={styles.stateCard}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateText}>Carregando pelada ao vivo…</Text>
        </View>
      </View>
    );
  }

  if (!pelada) {
    return (
      <View style={styles.centered}>
        <View style={styles.stateCard}>
          <Text style={{ fontSize: 38 }}>⚽</Text>
          <Text style={styles.stateText}>Pelada não encontrada.</Text>
          <TouchableOpacity style={styles.backPillBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>← Voltar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const allConfirmed: PeladaPlayer[] = pelada.players.filter((p) => p.status === 'CONFIRMED');

  const timerSection = (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>⏱️ Cronômetro da Partida</Text>
      <View style={styles.timerBox}>
        <Text style={styles.timerDisplay}>{formatTimer(timerSeconds)}</Text>
      </View>

      <View style={styles.presetRow}>
        {[7, 10, 15].map((mins) => (
          <TouchableOpacity
            key={mins}
            style={[
              styles.presetChip,
              timerDuration === mins * 60 && styles.presetChipActive,
            ]}
            onPress={() => {
              setTimerRunning(false);
              setTimerDuration(mins * 60);
              setTimerSeconds(mins * 60);
            }}
          >
            <Text
              style={[
                styles.presetText,
                timerDuration === mins * 60 && { color: colors.primary },
              ]}
            >
              {mins} min
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[
            styles.primaryBtn,
            { backgroundColor: timerRunning ? colors.warning : colors.primary },
          ]}
          onPress={() => setTimerRunning((r) => !r)}
        >
          <Text style={styles.primaryBtnText}>
            {timerRunning ? 'Pausar' : 'Iniciar'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => {
            setTimerRunning(false);
            setTimerSeconds(timerDuration);
          }}
        >
          <Text style={styles.secondaryBtnText}>Resetar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const teamsSection = (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>👕 Formação dos Times</Text>
      <Text style={styles.helperText}>
        Base configurada: {pelada.playersPerTeam} na linha + 1 goleiro (máx.{' '}
        {pelada.playersPerTeam + 1} por time)
      </Text>

      {canManage && (
        <View style={styles.teamModeActions}>
          {/* Team Names & Count Builder */}
          <View style={styles.teamConfigBox}>
            <View style={styles.teamConfigHeader}>
              <Text style={styles.teamConfigTitle}>
                Times ({teamNames.length}) — Escolha cores ou nomes:
              </Text>
              {teamNames.length < 8 && (
                <TouchableOpacity
                  style={styles.addTeamChip}
                  onPress={handleAddTeamName}
                  accessibilityRole="button"
                  accessibilityLabel="Adicionar mais um time"
                >
                  <Text style={styles.addTeamChipText}>+ Time</Text>
                </TouchableOpacity>
              )}
            </View>

            {teamNames.map((tName, idx) => (
              <View key={idx} style={styles.teamNameRow}>
                <Text style={styles.teamIdxLabel}>{idx + 1}º</Text>
                <TextInput
                  style={[
                    styles.teamNameInput,
                    focusedTeamIdx === idx && styles.teamNameInputFocused,
                  ]}
                  value={tName}
                  onFocus={() => setFocusedTeamIdx(idx)}
                  onChangeText={(text) =>
                    setTeamNames((prev) => prev.map((v, i) => (i === idx ? text : v)))
                  }
                  placeholder={`Nome do Time ${idx + 1}`}
                  placeholderTextColor={colors.textMuted}
                  accessibilityLabel={`Nome do ${idx + 1}º time`}
                />
                {teamNames.length > 2 && (
                  <TouchableOpacity
                    style={styles.removeTeamBtn}
                    onPress={() => handleRemoveTeamName(idx)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remover ${idx + 1}º time`}
                  >
                    <Text style={styles.removeTeamBtnText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.colorPresetsScroll}
            >
              {TEAM_COLOR_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset}
                  style={styles.colorPresetChip}
                  onPress={() =>
                    setTeamNames((prev) =>
                      prev.map((v, i) => (i === focusedTeamIdx ? preset : v))
                    )
                  }
                >
                  <Text style={styles.colorPresetText}>{preset}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {pelada.teams.length === teamNames.length &&
              pelada.teams.some((t, i) => t.name !== (teamNames[i]?.trim() || `Time ${i + 1}`)) && (
                <TouchableOpacity
                  style={styles.saveNamesBtn}
                  disabled={actionLoading}
                  onPress={handleSaveTeamNamesOnly}
                >
                  <Text style={styles.saveNamesBtnText}>💾 Salvar Novos Nomes nos Times</Text>
                </TouchableOpacity>
              )}
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              disabled={actionLoading}
              onPress={() =>
                runAction(async () => {
                  setManualMode(false);
                  setTeamAIdx(0);
                  setTeamBIdx(1);
                  return drawPeladaTeams(pelada.id, {
                    playersPerTeam: pelada.playersPerTeam,
                    balancedByPosition: true,
                    teamNames: getNormalizedTeamNames(),
                  });
                }, 'Times sorteados por posição!')
              }
            >
              <Text style={styles.primaryBtnText}>Sortear p/ Posição</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              disabled={actionLoading}
              onPress={() =>
                runAction(async () => {
                  setManualMode(false);
                  setTeamAIdx(0);
                  setTeamBIdx(1);
                  return drawPeladaTeams(pelada.id, {
                    playersPerTeam: pelada.playersPerTeam,
                    balancedByPosition: false,
                    teamNames: getNormalizedTeamNames(),
                  });
                }, 'Times sorteados aleatoriamente!')
              }
            >
              <Text style={styles.secondaryBtnText}>Aleatório</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.manualToggleBtn, manualMode && styles.manualToggleBtnActive]}
            disabled={actionLoading}
            onPress={openManualTeamBuilder}
            accessibilityRole="button"
            accessibilityLabel="Escolher times manualmente"
          >
            <Text
              style={[
                styles.manualToggleText,
                manualMode && { color: colors.primary },
              ]}
            >
              {manualMode ? '✕ Fechar Escolha Manual' : '✋ Escolher Times Manualmente'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Interactive Manual Builder */}
      {canManage && manualMode && (
        <View style={styles.manualBuilderBox}>
          <View style={styles.manualHeaderRow}>
            <Text style={styles.manualTitle}>
              Distribua os jogadores nos {teamNames.length} times configurados:
            </Text>
          </View>

          {allConfirmed.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum jogador confirmado ainda.</Text>
          ) : (
            allConfirmed.map((player) => {
              const assignedTeam = manualAssignments[player.id];
              return (
                <View key={player.id} style={styles.manualPlayerRow}>
                  <Text style={styles.manualPlayerName} numberOfLines={1}>
                    {player.isGoalkeeper ? '🧤 ' : ''}
                    {player.displayName}
                    {player.position ? ` (${player.position})` : ''}
                  </Text>
                  <View style={styles.manualTeamBtns}>
                    {getNormalizedTeamNames().map((tName, idx) => {
                      const selected = assignedTeam === idx;
                      const shortLabel =
                        tName.replace(/^Time\s+/i, '').slice(0, 7) || `T${idx + 1}`;
                      return (
                        <TouchableOpacity
                          key={idx}
                          style={[
                            styles.teamPickPill,
                            selected && styles.teamPickPillActive,
                          ]}
                          onPress={() =>
                            assignPlayerToTeam(player.id, selected ? null : idx)
                          }
                        >
                          <Text
                            style={[
                              styles.teamPickText,
                              selected && { color: colors.textInverse },
                            ]}
                            numberOfLines={1}
                          >
                            {shortLabel}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.success, marginTop: spacing.sm + 4 }]}
            disabled={actionLoading}
            onPress={handleSaveManualTeams}
          >
            <Text style={styles.primaryBtnText}>💾 Salvar Times Escolhidos</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Saved Teams Preview */}
      {pelada.teams.length === 0 ? (
        <View style={styles.inlineEmptyBox}>
          <Text style={styles.inlineEmptyEmoji}>👕</Text>
          <Text style={styles.inlineEmptyTitle}>Nenhum time definido ainda</Text>
          <Text style={styles.inlineEmptySubtitle}>
            Use o sorteio automático ou escolha manualmente os jogadores de cada time acima.
          </Text>
        </View>
      ) : (
        <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
          {pelada.teams.map((team, idx) => (
            <View key={`${team.name}-${idx}`} style={styles.teamCard}>
              <View style={styles.teamHeaderRow}>
                <Text style={styles.teamTitle}>{team.name}</Text>
                <Text style={styles.teamCountText}>{team.players.length} atletas</Text>
              </View>
              {team.players.map((tp) => (
                <Text key={tp.id} style={styles.teamPlayerLine}>
                  {tp.isGoalkeeper ? '🧤 ' : '• '}
                  {tp.name}
                  {tp.position ? ` (${tp.position})` : ''}
                </Text>
              ))}
            </View>
          ))}
          {(() => {
            const assignedIds = new Set(
              pelada.teams.flatMap((t) => t.players.map((p) => p.id))
            );
            const unassigned = allConfirmed.filter((p) => !assignedIds.has(p.id));
            if (unassigned.length === 0) return null;
            return (
              <View style={[styles.teamCard, { borderColor: colors.warning }]}>
                <View style={styles.teamHeaderRow}>
                  <Text style={[styles.teamTitle, { color: colors.warning }]}>
                    🔄 Próximo / De fora dos times
                  </Text>
                  <Text style={styles.teamCountText}>{unassigned.length} atletas</Text>
                </View>
                {unassigned.map((p) => (
                  <Text key={p.id} style={styles.teamPlayerLine}>
                    {p.isGoalkeeper ? '🧤 ' : '• '}
                    {p.displayName}
                    {p.position ? ` (${p.position})` : ''}
                  </Text>
                ))}
              </View>
            );
          })()}

          <TouchableOpacity
            style={styles.whatsappShareBtn}
            onPress={handleShareTeamsWhatsApp}
            accessibilityRole="button"
            accessibilityLabel="Enviar escalação dos times no WhatsApp"
          >
            <Text style={styles.whatsappShareBtnText}>📲 Enviar Escalação no WhatsApp</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const scoreboardSection =
    pelada.teams.length >= 2 ? (
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>⚽ Placar da Partida</Text>
        {canManage && (
          <>
            <View style={[styles.scoreboardBox, isCompact && styles.scoreboardBoxCompact]}>
              <View style={styles.scoreTeamCol}>
                <TouchableOpacity
                  style={styles.teamPickerChip}
                  onPress={() => setTeamAIdx((i) => (i + 1) % pelada.teams.length)}
                >
                  <Text style={styles.teamPickerText}>
                    {(pelada.teams[teamAIdx] || pelada.teams[0]).name} ↻
                  </Text>
                </TouchableOpacity>
                <View style={styles.scoreControls}>
                  <TouchableOpacity
                    style={styles.scoreStepBtn}
                    onPress={() => setScoreA((s) => Math.max(0, s - 1))}
                    accessibilityRole="button"
                    accessibilityLabel={`Diminuir placar de ${(pelada.teams[teamAIdx] || pelada.teams[0]).name}`}
                  >
                    <Text style={styles.scoreStepText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.scoreNumber}>{scoreA}</Text>
                  <TouchableOpacity
                    style={styles.scoreStepBtn}
                    onPress={() => setScoreA((s) => s + 1)}
                    accessibilityRole="button"
                    accessibilityLabel={`Aumentar placar de ${(pelada.teams[teamAIdx] || pelada.teams[0]).name}`}
                  >
                    <Text style={styles.scoreStepText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.scoreVs}>X</Text>

              <View style={styles.scoreTeamCol}>
                <TouchableOpacity
                  style={styles.teamPickerChip}
                  onPress={() => setTeamBIdx((i) => (i + 1) % pelada.teams.length)}
                  accessibilityRole="button"
                  accessibilityLabel="Alternar Time B do placar"
                >
                  <Text style={styles.teamPickerText}>
                    {(pelada.teams[teamBIdx] || pelada.teams[1]).name} ↻
                  </Text>
                </TouchableOpacity>
                <View style={styles.scoreControls}>
                  <TouchableOpacity
                    style={styles.scoreStepBtn}
                    onPress={() => setScoreB((s) => Math.max(0, s - 1))}
                    accessibilityRole="button"
                    accessibilityLabel={`Diminuir placar de ${(pelada.teams[teamBIdx] || pelada.teams[1]).name}`}
                  >
                    <Text style={styles.scoreStepText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.scoreNumber}>{scoreB}</Text>
                  <TouchableOpacity
                    style={styles.scoreStepBtn}
                    onPress={() => setScoreB((s) => s + 1)}
                    accessibilityRole="button"
                    accessibilityLabel={`Aumentar placar de ${(pelada.teams[teamBIdx] || pelada.teams[1]).name}`}
                  >
                    <Text style={styles.scoreStepText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary, marginTop: spacing.sm + 4 }]}
              disabled={actionLoading}
              onPress={handleRecordMatch}
            >
              <Text style={styles.primaryBtnText}>Registrar Placar (+1 Vitória)</Text>
            </TouchableOpacity>
          </>
        )}

        {pelada.matches.length === 0 ? (
          <Text style={[styles.emptyText, { marginTop: spacing.md }]}>
            Nenhuma partida registrada ainda nesta pelada.
          </Text>
        ) : (
          <View style={{ marginTop: spacing.md }}>
            <Text style={styles.helperText}>Partidas registradas hoje:</Text>
            {pelada.matches.map((m) => (
              <View key={m.id} style={styles.matchHistoryRow}>
                <Text style={styles.matchScoreText}>
                  {m.teamAName} {m.scoreA} x {m.scoreB} {m.teamBName}
                </Text>
                <View style={styles.winnerPill}>
                  <Text style={styles.matchWinnerText}>
                    {m.winner === 'EMPATE' ? 'Empate' : `🏆 ${m.winner}`}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    ) : null;

  const statsSection = (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>🎯 Gols e Assistências</Text>
      {allConfirmed.length === 0 ? (
        <Text style={styles.emptyText}>Nenhum jogador confirmado ainda.</Text>
      ) : (
        allConfirmed.map((player) => (
          <View key={player.id} style={styles.statsRow}>
            <View style={{ flex: 1, minWidth: 140 }}>
              <Text style={styles.playerName}>
                {player.displayName} {player.isGoalkeeper ? '🧤' : ''}
              </Text>
              <Text style={styles.statsLabel}>
                ⚽ {player.goals} gols • 👟 {player.assists} assist. • 🏆 {player.wins} vit.
              </Text>
            </View>

            {canManage && (
              <View style={styles.counterGroup}>
                <TouchableOpacity
                  style={styles.counterBtn}
                  hitSlop={HIT_SLOP}
                  accessibilityRole="button"
                  accessibilityLabel={`Diminuir gols de ${player.displayName}`}
                  onPress={() =>
                    runAction(() =>
                      updatePlayerStats(pelada.id, player.id, {
                        goals: Math.max(0, player.goals - 1),
                        assists: player.assists,
                      })
                    )
                  }
                >
                  <Text style={styles.counterBtnText}>-G</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.counterBtn}
                  hitSlop={HIT_SLOP}
                  accessibilityRole="button"
                  accessibilityLabel={`Adicionar gol para ${player.displayName}`}
                  onPress={() =>
                    runAction(() =>
                      updatePlayerStats(pelada.id, player.id, {
                        goals: player.goals + 1,
                        assists: player.assists,
                      })
                    )
                  }
                >
                  <Text style={styles.counterBtnText}>+G</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.counterBtn}
                  hitSlop={HIT_SLOP}
                  accessibilityRole="button"
                  accessibilityLabel={`Diminuir assistências de ${player.displayName}`}
                  onPress={() =>
                    runAction(() =>
                      updatePlayerStats(pelada.id, player.id, {
                        goals: player.goals,
                        assists: Math.max(0, player.assists - 1),
                      })
                    )
                  }
                >
                  <Text style={styles.counterBtnText}>-A</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.counterBtn}
                  hitSlop={HIT_SLOP}
                  accessibilityRole="button"
                  accessibilityLabel={`Adicionar assistência para ${player.displayName}`}
                  onPress={() =>
                    runAction(() =>
                      updatePlayerStats(pelada.id, player.id, {
                        goals: player.goals,
                        assists: player.assists + 1,
                      })
                    )
                  }
                >
                  <Text style={styles.counterBtnText}>+A</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))
      )}
    </View>
  );

  const finishSection = canManage ? (
    <TouchableOpacity
      style={styles.finishPeladaBtn}
      disabled={actionLoading}
      onPress={handleFinishPelada}
      accessibilityRole="button"
      accessibilityLabel="Finalizar pelada e abrir votação de MVP"
    >
      <Text style={styles.finishPeladaText}>🏁 Finalizar Pelada e Abrir Votação MVP</Text>
    </TouchableOpacity>
  ) : null;

  return (
    <View style={styles.container}>
      <View style={styles.topBarWrapper}>
        <View
          style={[
            styles.topBar,
            {
              maxWidth: containerMaxWidth,
              paddingHorizontal: pagePadding,
              paddingTop: topSpace,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Voltar para detalhes da pelada"
          >
            <Text style={styles.backBtnText}>← Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle} numberOfLines={1}>
            {pelada.title}
          </Text>
          <View style={styles.livePill}>
            <Text style={styles.livePillText}>🔴 AO VIVO</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: pagePadding }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadPelada();
            }}
            tintColor={colors.primary}
          />
        }
      >
        <View style={[styles.pageContainer, { maxWidth: containerMaxWidth }]}>
          {isDesktop ? (
            <View style={styles.desktopColumns}>
              <View style={styles.desktopLeftCol}>
                {timerSection}
                {scoreboardSection}
                {finishSection}
              </View>
              <View style={styles.desktopRightCol}>
                {teamsSection}
                {statsSection}
              </View>
            </View>
          ) : (
            <>
              {timerSection}
              {teamsSection}
              {scoreboardSection}
              {statsSection}
              {finishSection}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  stateCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  stateText: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.sm,
    textAlign: 'center',
  },
  backPillBtn: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceLight,
    minHeight: 44,
    justifyContent: 'center',
  },
  topBarWrapper: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topBar: {
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  backBtn: {
    paddingVertical: spacing.sm,
    paddingRight: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  backBtnText: { color: colors.primary, fontSize: fonts.sizes.md, fontWeight: '700' },
  topTitle: {
    flex: 1,
    minWidth: 120,
    color: colors.textPrimary,
    fontSize: fonts.sizes.md,
    fontWeight: '800',
    textAlign: 'center',
  },
  livePill: {
    backgroundColor: colors.errorSoft,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.error,
  },
  livePillText: {
    color: colors.error,
    fontSize: fonts.sizes.xs,
    fontWeight: '800',
  },
  scrollContent: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  pageContainer: {
    width: '100%',
    alignSelf: 'center',
  },
  desktopColumns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.lg,
  },
  desktopLeftCol: {
    flex: 1,
    minWidth: 0,
  },
  desktopRightCol: {
    flex: 1.2,
    minWidth: 0,
  },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md + 2,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  sectionTitle: {
    fontSize: fonts.sizes.md,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.sm + 4,
  },
  helperText: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fonts.sizes.sm,
    fontStyle: 'italic',
  },
  timerBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm + 4,
  },
  timerDisplay: {
    fontSize: 44,
    fontWeight: '800',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
    letterSpacing: 1.5,
  },
  presetRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    marginBottom: spacing.sm + 4,
  },
  presetChip: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 3,
    backgroundColor: colors.surfaceLight,
    minHeight: 38,
    justifyContent: 'center',
  },
  presetChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  presetText: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs + 1,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 5,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  primaryBtnText: {
    color: colors.textInverse,
    fontWeight: '800',
    fontSize: fonts.sizes.sm,
    textAlign: 'center',
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingVertical: spacing.sm + 5,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  secondaryBtnText: {
    color: colors.textSecondary,
    fontWeight: '700',
    fontSize: fonts.sizes.sm,
    textAlign: 'center',
  },
  teamModeActions: {
    marginTop: spacing.sm + 4,
    gap: spacing.sm,
  },
  teamConfigBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.sm + 4,
    gap: spacing.xs + 2,
  },
  teamConfigHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  teamConfigTitle: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.xs + 1,
    fontWeight: '700',
    flex: 1,
  },
  addTeamChip: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 5,
  },
  addTeamChipText: {
    color: colors.primary,
    fontSize: fonts.sizes.xs,
    fontWeight: '800',
  },
  teamNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  teamIdxLabel: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs,
    fontWeight: '800',
    width: 24,
  },
  teamNameInput: {
    flex: 1,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 8,
    color: colors.textPrimary,
    fontSize: fonts.sizes.sm,
    fontWeight: '700',
  },
  teamNameInputFocused: {
    borderColor: colors.primary,
  },
  removeTeamBtn: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.errorSoft,
    borderWidth: 1,
    borderColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeTeamBtnText: {
    color: colors.error,
    fontSize: fonts.sizes.xs,
    fontWeight: '800',
  },
  colorPresetsScroll: {
    flexGrow: 0,
    marginTop: 4,
  },
  colorPresetChip: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    marginRight: spacing.xs + 2,
  },
  colorPresetText: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs,
    fontWeight: '700',
  },
  saveNamesBtn: {
    backgroundColor: colors.infoSoft,
    borderWidth: 1,
    borderColor: colors.info,
    borderRadius: borderRadius.sm,
    paddingVertical: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  saveNamesBtnText: {
    color: colors.info,
    fontSize: fonts.sizes.xs,
    fontWeight: '800',
  },
  manualToggleBtn: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  manualToggleBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  manualToggleText: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.sm,
    fontWeight: '700',
  },
  manualBuilderBox: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.md,
  },
  manualHeaderRow: {
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  manualTitle: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.sm,
    fontWeight: '700',
    textAlign: 'center',
  },
  manualPlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.sm,
  },
  manualPlayerName: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fonts.sizes.sm,
    fontWeight: '600',
  },
  manualTeamBtns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: spacing.xs + 2,
  },
  teamPickPill: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 3,
    minWidth: 40,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamPickPillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  teamPickText: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs + 1,
    fontWeight: '800',
  },
  inlineEmptyBox: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.xs,
  },
  inlineEmptyEmoji: { fontSize: 28 },
  inlineEmptyTitle: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.sm + 1,
    fontWeight: '700',
    textAlign: 'center',
  },
  inlineEmptySubtitle: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs + 1,
    textAlign: 'center',
    lineHeight: 18,
  },
  teamCard: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  teamHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs + 2,
  },
  teamTitle: {
    color: colors.primary,
    fontSize: fonts.sizes.md,
    fontWeight: '800',
  },
  teamCountText: {
    color: colors.textMuted,
    fontSize: fonts.sizes.xs,
    fontWeight: '700',
  },
  teamPlayerLine: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.sm,
    paddingVertical: 3,
  },
  scoreboardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  scoreboardBoxCompact: {
    flexDirection: 'column',
    gap: spacing.sm,
  },
  scoreTeamCol: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
  },
  teamPickerChip: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 4,
    borderRadius: borderRadius.full,
    minHeight: 36,
    justifyContent: 'center',
  },
  teamPickerText: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.xs + 1,
    fontWeight: '700',
  },
  scoreControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  scoreStepBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreStepText: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.lg,
    fontWeight: '800',
  },
  scoreNumber: {
    color: colors.primary,
    fontSize: 30,
    fontWeight: '800',
    minWidth: 32,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  scoreVs: {
    color: colors.textMuted,
    fontSize: fonts.sizes.md,
    fontWeight: '800',
    marginHorizontal: spacing.xs,
  },
  matchHistoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.sm,
  },
  matchScoreText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fonts.sizes.sm,
    fontWeight: '600',
  },
  winnerPill: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  matchWinnerText: {
    color: colors.primary,
    fontSize: fonts.sizes.xs,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm + 4,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  playerName: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.sm + 1,
    fontWeight: '700',
  },
  statsLabel: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  counterGroup: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    alignItems: 'center',
  },
  counterBtn: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 3,
    minHeight: 40,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnText: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.xs + 1,
    fontWeight: '800',
  },
  finishPeladaBtn: {
    backgroundColor: colors.successSoft,
    borderWidth: 1.5,
    borderColor: colors.success,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
    marginBottom: spacing.md,
  },
  finishPeladaText: {
    color: colors.success,
    fontSize: fonts.sizes.md,
    fontWeight: '800',
    textAlign: 'center',
  },
  whatsappShareBtn: {
    marginTop: spacing.xs,
    backgroundColor: colors.successSoft,
    borderWidth: 1,
    borderColor: colors.success,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  whatsappShareBtnText: {
    color: colors.success,
    fontSize: fonts.sizes.sm,
    fontWeight: '800',
    textAlign: 'center',
  },
});

