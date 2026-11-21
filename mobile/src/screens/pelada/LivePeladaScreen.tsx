// Live Pelada Screen — Compact Unified Match Card, Pop-up Call/Stats/Manual Modals, 2-Col Teams & Ties 'Saem Ambos'
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation';
import { PeladaConfigModal } from '../../components/pelada/PeladaConfigModal';
import {
  addLiveGoal,
  batchUpdatePlayerCheckin,
  controlLiveTimer,
  drawPeladaTeams,
  getPeladaById,
  recordPeladaMatch,
  removeLiveGoal,
  setLiveMatchup,
  setManualPeladaTeams,
  setTeamPhoto,
  updatePeladaStatus,
  updatePlayerCheckin,
  updatePlayerStats,
} from '../../services/peladaService';
import { AttendanceStatus, LiveGoalEvent, Pelada, PeladaPlayer } from '../../types';
import { MatchPitch } from '../../components/pelada/MatchPitch';
import { Avatar } from '../../components/ui/Avatar';
import { usePeladaLiveSync } from '../../hooks/usePeladaLiveSync';
import { pickSquarePhoto } from '../../utils/imagePicker';
import { colors, fonts, spacing, borderRadius, shadows, layout, themed } from '../../constants/theme';
import { showConfirm, showMessage } from '../../utils/alerts';
import { buildInviteUrl, shareOrCopyText } from '../../utils/inviteLink';
import { useResponsive } from '../../hooks/useResponsive';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { FadeInView, PulseDot } from '../../components/ui/Motion';

type Props = NativeStackScreenProps<AppStackParamList, 'LivePelada'>;
type TieDecision = 'TEAM_A' | 'TEAM_B' | 'BOTH';

const HIT_SLOP = { top: 4, bottom: 4, left: 4, right: 4 };

function formatTimer(seconds: number): string {
  const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

export function LivePeladaScreen({ navigation, route }: Props) {
  const { peladaId, openConfigOnStart } = route.params;
  const { isDesktop, isCompact, containerMaxWidth, pagePadding, topSpace } = useResponsive();

  const [pelada, setPelada] = useState<Pelada | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Pop-up Modals
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [modalSearch, setModalSearch] = useState('');
  const hasAutoOpenedConfig = useRef(false);

  // Accordion states
  const [expandQueue, setExpandQueue] = useState(true);
  const [expandLoserPool, setExpandLoserPool] = useState(true);
  const [expandMatches, setExpandMatches] = useState(false);

  // Tie state (placar e cronometro agora vem da sumula ao vivo no servidor)
  const [tieDecision, setTieDecision] = useState<TieDecision>('TEAM_B');

  // Manual builder assignments
  const [manualAssignments, setManualAssignments] = useState<Record<string, number>>({});

  const loadPelada = useCallback(async () => {
    try {
      const data = await getPeladaById(peladaId);
      setPelada(data);
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

  const canManage = pelada?.myRole === 'ORGANIZER' || pelada?.myRole === 'CO_ORGANIZER';

  useEffect(() => {
    if (
      openConfigOnStart &&
      canManage &&
      pelada &&
      !hasAutoOpenedConfig.current
    ) {
      hasAutoOpenedConfig.current = true;
      setShowConfigModal(true);
    }
  }, [openConfigOnStart, canManage, pelada]);

  // ===== Súmula ao vivo (estado vem do servidor, igual para todos) =====
  const clockOffsetRef = useRef(0);
  const [tick, setTick] = useState(0);
  const timeUpAlertKey = useRef<string | null>(null);
  const [goalModal, setGoalModal] = useState<{ teamName: string } | null>(null);
  const [goalScorerId, setGoalScorerId] = useState<string | null>(null);
  const [goalAssistId, setGoalAssistId] = useState<string | null>(null);
  const [goalOwnGoal, setGoalOwnGoal] = useState(false);

  useEffect(() => {
    if (pelada?.serverNow) {
      clockOffsetRef.current = pelada.serverNow - Date.now();
    }
  }, [pelada]);

  function getLiveElapsedMs(): number {
    const lm = pelada?.liveMatch;
    if (!lm) return 0;
    const t = lm.timer;
    const serverNowEstimate = Date.now() + clockOffsetRef.current;
    const running = t.running && t.startedAt ? serverNowEstimate - t.startedAt : 0;
    return Math.max(0, (t.accumulatedMs || 0) + running);
  }

  const liveTimerRunning = Boolean(pelada?.liveMatch?.timer.running);
  useEffect(() => {
    if (!liveTimerRunning) return undefined;
    const id = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, [liveTimerRunning]);

  useEffect(() => {
    const lm = pelada?.liveMatch;
    if (!pelada || !lm || !canManage || !liveTimerRunning) return;
    const limitMs = (pelada.gameConfig?.matchDurationMinutes || 10) * 60000;
    const key = `${pelada.matches.length}-${lm.teamAName}-${lm.teamBName}`;
    if (getLiveElapsedMs() >= limitMs && timeUpAlertKey.current !== key) {
      timeUpAlertKey.current = key;
      showMessage('Tempo esgotado', 'Fim do tempo da partida. Encerre a partida para registrar o placar.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, liveTimerRunning, canManage]);

  // Tempo real: quem só está assistindo vê gols, placar e cronômetro mudando na hora
  const silentReload = useCallback(async () => {
    try {
      setPelada(await getPeladaById(peladaId));
    } catch {
      // ignora falhas pontuais; tenta no proximo ciclo
    }
  }, [peladaId]);
  usePeladaLiveSync(peladaId, {
    currentVersion: pelada?.syncVersion,
    reload: silentReload,
    intervalMs: 2000,
  });

  function openGoalModal(teamName: string) {
    setGoalScorerId(null);
    setGoalAssistId(null);
    setGoalOwnGoal(false);
    setGoalModal({ teamName });
  }

  function handleConfirmGoal() {
    if (!pelada || !goalModal) return;
    const payload = {
      teamName: goalModal.teamName,
      scorerId: goalScorerId,
      assistId: goalOwnGoal ? null : goalAssistId,
      ownGoal: goalOwnGoal,
    };
    setGoalModal(null);
    runAction(() => addLiveGoal(pelada.id, payload));
  }

  function handleRemoveGoal(ev: LiveGoalEvent) {
    if (!pelada) return;
    showConfirm(
      'Apagar gol',
      `Remover o gol ${ev.scorerName ? `de ${ev.scorerName} ` : ''}da súmula? As estatísticas do jogador também voltam.`,
      () => runAction(() => removeLiveGoal(pelada.id, ev.id)),
      'Apagar'
    );
  }

  async function handlePickTeamPhoto(teamName: string) {
    if (!pelada) return;
    const photo = await pickSquarePhoto(192);
    if (!photo) return;
    runAction(() => setTeamPhoto(pelada.id, teamName, photo), 'Foto do time atualizada.');
  }

  function handleRemoveTeamPhoto(teamName: string) {
    if (!pelada) return;
    showConfirm(
      'Remover foto',
      `Remover a foto do ${teamName}?`,
      () => runAction(() => setTeamPhoto(pelada.id, teamName, null)),
      'Remover'
    );
  }

  function cycleMatchupTeam(side: 'A' | 'B') {
    const lm = pelada?.liveMatch;
    if (!pelada || !lm) return;
    const names = pelada.teams.map((t) => t.name);
    const current = side === 'A' ? lm.teamAName : lm.teamBName;
    const other = side === 'A' ? lm.teamBName : lm.teamAName;
    const idx = names.indexOf(current);
    for (let i = 1; i <= names.length; i++) {
      const candidate = names[(idx + i) % names.length];
      if (candidate !== other) {
        runAction(() =>
          setLiveMatchup(
            pelada.id,
            side === 'A'
              ? { teamAName: candidate, teamBName: other }
              : { teamAName: other, teamBName: candidate }
          )
        );
        return;
      }
    }
  }

  async function runAction(fn: () => Promise<Pelada>, successToast?: string) {
    setActionLoading(true);
    try {
      const updated = await fn();
      setPelada(updated);
      if (successToast) {
        showMessage('Atualizado', successToast);
      }
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Não foi possível concluir a ação';
      showMessage('Erro', msg);
    } finally {
      setActionLoading(false);
    }
  }

  function handleConfigSaved(updated: Pelada) {
    setPelada(updated);
  }

  function getConfiguredTeamNames(): string[] {
    if (!pelada) return ['Time Amarelo', 'Time Azul'];
    const cfg = pelada.gameConfig;
    const count =
      cfg?.gameMode === 'FIXED_TEAMS' ? Math.max(2, cfg.fixedTeamsCount || 3) : 2;
    const base = cfg?.teamNames && cfg.teamNames.length >= 2
      ? [...cfg.teamNames]
      : ['Time Amarelo', 'Time Azul', 'Time Vermelho'];
    while (base.length < count) {
      base.push(`Time ${base.length + 1}`);
    }
    return base.slice(0, count);
  }

  function handleDrawOrOpenManual() {
    if (!pelada) return;
    const cfg = pelada.gameConfig;
    const drawMode = cfg?.drawMode || 'POSITION';

    if (drawMode === 'MANUAL') {
      const nextMap: Record<string, number> = {};
      if (pelada.teams.length >= 2) {
        pelada.teams.forEach((team, idx) => {
          team.players.forEach((tp) => {
            nextMap[tp.id] = idx;
          });
        });
      }
      setManualAssignments(nextMap);
      setShowManualModal(true);
      return;
    }

    const configuredNames = getConfiguredTeamNames();
    runAction(async () => {
      return drawPeladaTeams(pelada.id, {
        playersPerTeam: cfg?.playersPerTeam || pelada.playersPerTeam,
        gameMode: cfg?.gameMode || 'WINNER_STAYS_QUEUE',
        drawMode,
        fixedTeamsCount: cfg?.fixedTeamsCount || 3,
        teamNames: configuredNames,
      });
    }, 'Times formados com os jogadores presentes.');
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
    const names = getConfiguredTeamNames();
    const builtTeams = names
      .map((name, idx) => ({
        name,
        playerIds: Object.entries(manualAssignments)
          .filter(([, assignedIdx]) => assignedIdx === idx)
          .map(([playerId]) => playerId),
      }))
      .filter((t) => t.playerIds.length > 0);

    if (builtTeams.length < 2) {
      showMessage('Times incompletos', 'Distribua jogadores em pelo menos 2 times antes de salvar.');
      return;
    }

    runAction(async () => {
      const updated = await setManualPeladaTeams(pelada.id, builtTeams);
      setShowManualModal(false);
      return updated;
    }, 'Times definidos manualmente.');
  }

  function handleRecordMatch() {
    const lm = pelada?.liveMatch;
    if (!pelada || !lm) return;

    const isQueueMode =
      (pelada.gameConfig?.gameMode || 'WINNER_STAYS_QUEUE') === 'WINNER_STAYS_QUEUE';

    let leavingTeamName: string | undefined;
    if (isQueueMode && lm.scoreA === lm.scoreB) {
      if (tieDecision === 'BOTH') {
        leavingTeamName = 'AMBOS';
      } else if (tieDecision === 'TEAM_A') {
        leavingTeamName = lm.teamAName;
      } else {
        leavingTeamName = lm.teamBName;
      }
    }

    showConfirm(
      'Encerrar partida',
      `${lm.teamAName} ${lm.scoreA} x ${lm.scoreB} ${lm.teamBName}. Confirmar o resultado?`,
      () =>
        runAction(() =>
          recordPeladaMatch(pelada.id, {
            teamAName: lm.teamAName,
            teamBName: lm.teamBName,
            scoreA: lm.scoreA,
            scoreB: lm.scoreB,
            ...(leavingTeamName ? { leavingTeamName } : {}),
          })
        ),
      'Encerrar'
    )
  }

  function handleFinishPelada() {
    if (!pelada) return;
    showConfirm(
      'Finalizar Pelada',
      'A pelada será encerrada e abrirá a Etapa 1 da votação do MVP para todos os participantes confirmados.',
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
      'Finalizar e Abrir Votação'
    );
  }

  async function handleShareTeamsWhatsApp() {
    if (!pelada || pelada.teams.length === 0) return;

    const waitingQueue = pelada.waitingQueue || [];
    const lastLoserPool = pelada.lastLoserPool || [];

    const teamsBlock = pelada.teams
      .map((team) => {
        const playersLines = team.players
          .map(
            (tp, idx) =>
              `${idx + 1}. ${tp.isGoalkeeper ? '[GOL] ' : ''}${tp.name}${tp.position ? ` (${tp.position})` : ''
              }`
          )
          .join('\n');
        return `*${team.name}* (${team.players.length} atletas)\n${playersLines}`;
      })
      .join('\n\n');

    const queueBlock =
      waitingQueue.length > 0
        ? `\n\n*Fila de Próximos (${waitingQueue.length})*\n` +
        waitingQueue
          .map(
            (p, idx) =>
              `${idx + 1}. ${p.isGoalkeeper ? '[GOL] ' : ''}${p.name}${p.position ? ` (${p.position})` : ''
              }`
          )
          .join('\n')
        : '';

    const poolBlock =
      lastLoserPool.length > 0
        ? `\n\n*Sorteio das vagas faltantes (Perdedor anterior):*\n` +
        lastLoserPool.map((p) => `- ${p.name}`).join('\n')
        : '';

    const message =
      `*${pelada.title} — Escalação*\n\n` +
      `${teamsBlock}${queueBlock}${poolBlock}\n\n` +
      `Acompanhe ao vivo no INFUT: ${buildInviteUrl(pelada.inviteCode)}`;

    await shareOrCopyText(
      'Escalação copiada',
      message,
      'Escalação dos times copiada para colar no WhatsApp.'
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
          <Text style={styles.stateText}>Pelada não encontrada.</Text>
          <TouchableOpacity style={styles.backPillBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backBtnText}>← Voltar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const allConfirmed: PeladaPlayer[] = pelada.players.filter((p) => p.status === 'CONFIRMED');
  const presentPlayers = allConfirmed.filter((p) => p.attendanceStatus === 'PRESENT');
  const pendingPlayers = allConfirmed.filter((p) => p.attendanceStatus === 'PENDING');
  const injuredPlayers = allConfirmed.filter((p) => p.attendanceStatus === 'INJURED');

  const cfg = pelada.gameConfig || {
    matchDurationMinutes: 10,
    playersPerTeam: pelada.playersPerTeam || 5,
    gameMode: 'WINNER_STAYS_QUEUE' as const,
    drawMode: 'POSITION' as const,
    fixedTeamsCount: 3,
    teamNames: ['Time Amarelo', 'Time Azul', 'Time Vermelho'],
  };

  const isQueueMode = cfg.gameMode === 'WINNER_STAYS_QUEUE';
  const waitingQueue = pelada.waitingQueue || [];
  const lastLoserPool = pelada.lastLoserPool || [];
  const hasOutsideQueue = waitingQueue.length > 0 || lastLoserPool.length > 0;

  const modeLabel = isQueueMode
    ? '2 Times + Fila'
    : `${cfg.fixedTeamsCount} Times Fixos`;
  const drawLabel =
    cfg.drawMode === 'POSITION'
      ? 'Por Posição'
      : cfg.drawMode === 'RANDOM'
        ? 'Aleatório'
        : 'Manual';

  // ===== Súmula ao vivo: placar, cronômetro compartilhado e gols =====
  const live = pelada.liveMatch || null;
  const liveTeamA = live ? pelada.teams.find((t) => t.name === live.teamAName) || null : null;
  const liveTeamB = live ? pelada.teams.find((t) => t.name === live.teamBName) || null : null;
  const teamPhotos = cfg.teamPhotos || {};
  const durationMs = (cfg.matchDurationMinutes || 10) * 60000;
  const elapsedMs = getLiveElapsedMs();
  const remainingMs = durationMs - elapsedMs;
  const timerRunning = Boolean(live?.timer.running);
  const timerStarted = Boolean(live && (live.timer.running || live.timer.accumulatedMs > 0));
  const clockText =
    remainingMs >= 0
      ? formatTimer(Math.ceil(remainingMs / 1000))
      : `+${formatTimer(Math.floor(-remainingMs / 1000))}`;
  const currentMinute = Math.floor(elapsedMs / 60000) + 1;
  const scoreA = live?.scoreA ?? 0;
  const scoreB = live?.scoreB ?? 0;

  const renderCrest = (teamName: string) => {
    const photo = teamPhotos[teamName];
    const crest = (
      <View>
        <Avatar name={teamName.replace(/^time\s+/i, '')} photoUrl={photo} size={56} rounded borderColor={colors.borderStrong} />
        {canManage ? (
          <View style={styles.crestEditBadge}>
            <Ionicons name="camera" size={11} color={colors.textInverse} />
          </View>
        ) : null}
      </View>
    );
    if (!canManage) return crest;
    return (
      <TouchableOpacity
        onPress={() => handlePickTeamPhoto(teamName)}
        onLongPress={() => photo && handleRemoveTeamPhoto(teamName)}
        accessibilityRole="button"
        accessibilityLabel={`Alterar foto do ${teamName}`}
        accessibilityHint="Toque para escolher uma foto. Segure para remover."
      >
        {crest}
      </TouchableOpacity>
    );
  };

  const renderTeamScoreCol = (teamName: string, consecutiveWins: number | undefined, score: number) => (
    <View style={styles.liveTeamCol}>
      {renderCrest(teamName)}
      <Text style={styles.liveTeamName} numberOfLines={2}>
        {teamName}
      </Text>
      {consecutiveWins && consecutiveWins > 0 ? (
        <Text style={styles.teamStreakLabel} numberOfLines={1}>
          {consecutiveWins}ª vitória seguida
          {cfg.maxConsecutiveWins && cfg.maxConsecutiveWins > 0 && consecutiveWins >= cfg.maxConsecutiveWins
            ? ' (limite)'
            : ''}
        </Text>
      ) : null}
      {canManage ? (
        <TouchableOpacity
          style={styles.goalBtn}
          disabled={actionLoading}
          onPress={() => openGoalModal(teamName)}
          accessibilityRole="button"
          accessibilityLabel={`Marcar gol do ${teamName}`}
        >
          <Ionicons name="football" size={14} color={colors.textInverse} />
          <Text style={styles.goalBtnText}>Gol</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  const matchCardSection = (
    <View style={styles.sectionCard}>
      {!live || !liveTeamA || !liveTeamB ? (
        <View style={styles.inlineEmptyBox}>
          <Text style={styles.inlineEmptyTitle}>Placar ao vivo</Text>
          <Text style={styles.inlineEmptySubtitle}>
            Sorteie ou monte os times para começar a súmula da partida.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.liveClockRow}>
            <View style={[styles.liveMinutePill, timerRunning && styles.liveMinutePillRunning]}>
              {timerRunning ? <PulseDot color={colors.error} size={6} /> : null}
              <Text style={styles.liveMinuteText}>
                {timerStarted ? `${currentMinute}'` : 'Não iniciada'}
              </Text>
            </View>
            <Text style={[styles.liveClockText, remainingMs < 0 && { color: colors.error }]}>{clockText}</Text>
            {canManage ? (
              <View style={styles.timerControlsRow}>
                <TouchableOpacity
                  style={[styles.timerControlBtn, { backgroundColor: timerRunning ? colors.warning : colors.primary }]}
                  disabled={actionLoading}
                  onPress={() =>
                    runAction(() => controlLiveTimer(pelada.id, timerRunning ? 'PAUSE' : 'START'))
                  }
                >
                  <Text style={styles.timerControlBtnPrimaryText}>
                    {timerRunning ? 'Pausar' : timerStarted ? 'Continuar' : 'Iniciar'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.timerResetBtn}
                  disabled={actionLoading}
                  onPress={() => runAction(() => controlLiveTimer(pelada.id, 'RESET'))}
                >
                  <Text style={styles.timerResetBtnText}>Zerar</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          <View style={styles.liveScoreRow}>
            {renderTeamScoreCol(liveTeamA.name, liveTeamA.consecutiveWins, scoreA)}
            <View style={styles.liveScoreCenter}>
              <Text style={styles.liveScoreText} accessibilityLabel={`Placar ${scoreA} a ${scoreB}`}>
                {scoreA}
                <Text style={styles.liveScoreX}> × </Text>
                {scoreB}
              </Text>
            </View>
            {renderTeamScoreCol(liveTeamB.name, liveTeamB.consecutiveWins, scoreB)}
          </View>

          {canManage && pelada.teams.length > 2 && live.events.length === 0 ? (
            <View style={styles.matchupRow}>
              <Text style={styles.helperText}>Trocar confronto:</Text>
              <TouchableOpacity
                style={styles.matchupChip}
                disabled={actionLoading}
                onPress={() => cycleMatchupTeam('A')}
              >
                <Text style={styles.matchupChipText}>{live.teamAName} ↻</Text>
              </TouchableOpacity>
              <Text style={styles.helperText}>x</Text>
              <TouchableOpacity
                style={styles.matchupChip}
                disabled={actionLoading}
                onPress={() => cycleMatchupTeam('B')}
              >
                <Text style={styles.matchupChipText}>{live.teamBName} ↻</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Lances da partida (súmula) */}
          <View style={styles.eventsBox}>
            {live.events.length === 0 ? (
              <Text style={styles.eventsEmpty}>
                {canManage ? 'Toque em "Gol" no time que marcou para lançar na súmula.' : 'Nenhum gol ainda.'}
              </Text>
            ) : (
              live.events.map((ev) => {
                const isA = ev.teamName === live.teamAName;
                return (
                  <View key={ev.id} style={[styles.eventRow, !isA && styles.eventRowRight]}>
                    <Text style={styles.eventMinute}>{ev.minute ? `${ev.minute}'` : '–'}</Text>
                    <Ionicons name="football" size={14} color={ev.ownGoal ? colors.error : colors.textPrimary} />
                    <View style={[styles.eventTextCol, !isA && { alignItems: 'flex-end' }]}>
                      <Text style={styles.eventScorer} numberOfLines={1}>
                        {ev.scorerName || 'Gol'}
                        {ev.ownGoal ? ' (contra)' : ''}
                      </Text>
                      {ev.assistName ? (
                        <Text style={styles.eventAssist} numberOfLines={1}>
                          assist. {ev.assistName}
                        </Text>
                      ) : null}
                    </View>
                    {canManage ? (
                      <TouchableOpacity
                        hitSlop={HIT_SLOP}
                        disabled={actionLoading}
                        onPress={() => handleRemoveGoal(ev)}
                        accessibilityRole="button"
                        accessibilityLabel={`Apagar gol de ${ev.scorerName || ev.teamName}`}
                      >
                        <Ionicons name="trash-outline" size={15} color={colors.textMuted} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                );
              })
            )}
          </View>

          {canManage ? (
            <>
              {isQueueMode && hasOutsideQueue && scoreA === scoreB && (
                <View style={styles.tieBox}>
                  <Text style={styles.tieLabel}>No empate, qual time dá lugar à fila?</Text>
                  <View style={styles.tieBtnsRow}>
                    {(
                      [
                        { key: 'TEAM_A', label: `Sai ${live.teamAName}` },
                        { key: 'TEAM_B', label: `Sai ${live.teamBName}` },
                        { key: 'BOTH', label: 'Saem Ambos' },
                      ] as { key: TieDecision; label: string }[]
                    ).map((opt) => {
                      const active = tieDecision === opt.key;
                      return (
                        <TouchableOpacity
                          key={opt.key}
                          style={[styles.tieBtn, active && styles.tieBtnActive]}
                          onPress={() => setTieDecision(opt.key)}
                        >
                          <Text
                            style={[styles.tieBtnText, active && { color: colors.primary, fontWeight: '800' }]}
                            numberOfLines={1}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {isQueueMode && cfg.maxConsecutiveWins && cfg.maxConsecutiveWins > 0
                ? (() => {
                    const nextA = (liveTeamA.consecutiveWins || 0) + 1;
                    const nextB = (liveTeamB.consecutiveWins || 0) + 1;
                    const limitTeam =
                      scoreA > scoreB && nextA >= cfg.maxConsecutiveWins
                        ? liveTeamA.name
                        : scoreB > scoreA && nextB >= cfg.maxConsecutiveWins
                          ? liveTeamB.name
                          : null;
                    if (!limitTeam) return null;
                    return (
                      <View style={styles.winLimitAlert}>
                        <Text style={styles.winLimitAlertText}>
                          Vitória do {limitTeam}: atinge o limite de {cfg.maxConsecutiveWins} vitórias seguidas e o
                          time inteiro sai. Entram os próximos da fila, na ordem.
                        </Text>
                      </View>
                    );
                  })()
                : null}

              <TouchableOpacity
                style={[styles.primaryBtnFull, { marginTop: spacing.sm + 2 }]}
                disabled={actionLoading}
                onPress={handleRecordMatch}
              >
                <Text style={styles.primaryBtnText}>
                  {isQueueMode && hasOutsideQueue ? 'Encerrar Partida e Rotacionar Fila' : 'Encerrar Partida'}
                </Text>
              </TouchableOpacity>
            </>
          ) : null}
        </>
      )}

      {pelada.matches.length > 0 && (
        <View style={{ marginTop: spacing.sm + 2 }}>
          <TouchableOpacity style={styles.accordionHeader} onPress={() => setExpandMatches((v) => !v)}>
            <Text style={styles.helperText}>Partidas registradas hoje ({pelada.matches.length})</Text>
            <Text style={styles.accordionChevron}>{expandMatches ? '▴' : '▾'}</Text>
          </TouchableOpacity>
          {expandMatches &&
            [...pelada.matches].reverse().map((m) => (
              <View key={m.id} style={styles.matchHistoryBlock}>
                <View style={styles.matchHistoryRow}>
                  <Text style={styles.matchScoreText}>
                    {m.teamAName} {m.scoreA} x {m.scoreB} {m.teamBName}
                  </Text>
                  <View style={styles.winnerPill}>
                    <Text style={styles.matchWinnerText}>{m.winner === 'EMPATE' ? 'Empate' : m.winner}</Text>
                  </View>
                </View>
                {m.events && m.events.length > 0 ? (
                  <Text style={styles.matchEventsText}>
                    {m.events
                      .map(
                        (ev) =>
                          `${ev.scorerName || 'Gol'}${ev.ownGoal ? ' (contra)' : ''}${ev.minute ? ` ${ev.minute}'` : ''}`
                      )
                      .join(' • ')}
                  </Text>
                ) : null}
              </View>
            ))}
        </View>
      )}
    </View>
  );

  const photoByPlayerId: Record<string, string | null | undefined> = {};
  for (const p of pelada.players) {
    photoByPlayerId[p.id] = p.user?.photoUrl;
  }

  const pitchSection =
    live && liveTeamA && liveTeamB ? (
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitleNoMargin}>Em campo</Text>
          <Text style={styles.helperText}>
            {liveTeamA.name} {scoreA} x {scoreB} {liveTeamB.name}
          </Text>
        </View>
        <View style={{ marginTop: spacing.sm }}>
          <MatchPitch
            teamA={liveTeamA}
            teamB={liveTeamB}
            events={live.events}
            photoByPlayerId={photoByPlayerId}
            teamPhotos={teamPhotos}
          />
        </View>
      </View>
    ) : null;

  // Modal de gol: jogadores do time que marcou (ou do adversario, se gol contra)
  const goalTeam = goalModal ? pelada.teams.find((t) => t.name === goalModal.teamName) : null;
  const opponentName = goalModal && live
    ? goalModal.teamName === live.teamAName
      ? live.teamBName
      : live.teamAName
    : null;
  const opponentTeam = opponentName ? pelada.teams.find((t) => t.name === opponentName) : null;
  const scorerCandidates = (goalOwnGoal ? opponentTeam?.players : goalTeam?.players) || [];
  const assistCandidates = (goalTeam?.players || []).filter((p) => p.id !== goalScorerId);

  // Compact Call & Draw Launcher (opens Pop-up Modals instead of crowding screen)
  const callAndDrawCard = (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitleNoMargin}>Chamada e Sorteio</Text>
          <Text style={styles.helperText}>
            Presentes: {presentPlayers.length} • Atrasados: {pendingPlayers.length} • Machucados:{' '}
            {injuredPlayers.length}
          </Text>
          <Text style={styles.ruleBadgeText}>
            {modeLabel} • {cfg.playersPerTeam} na linha • {drawLabel}
          </Text>
        </View>
      </View>

      {canManage && (
        <View style={styles.callActionsRow}>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => {
              setModalSearch('');
              setShowCallModal(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Abrir pop-up da chamada de jogadores"
          >
            <Text style={styles.secondaryBtnText}>
              Chamada ({presentPlayers.length}/{allConfirmed.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            disabled={actionLoading}
            onPress={handleDrawOrOpenManual}
            accessibilityRole="button"
            accessibilityLabel="Sortear ou montar times"
          >
            <Text style={styles.primaryBtnText}>
              {cfg.drawMode === 'MANUAL'
                ? 'Montar Times'
                : pelada.teams.length > 0
                  ? 'Novo Sorteio'
                  : 'Sortear Times'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // 2-Column Teams Display + Collapsible Queue / Pool
  const teamsSection = (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitleNoMargin}>Times em Quadra</Text>
        {pelada.teams.length > 0 && (
          <TouchableOpacity onPress={handleShareTeamsWhatsApp}>
            <Text style={styles.inlineLinkText}>Enviar no WhatsApp</Text>
          </TouchableOpacity>
        )}
      </View>

      {pelada.teams.length === 0 ? (
        <View style={styles.inlineEmptyBox}>
          <Text style={styles.inlineEmptyTitle}>Nenhum time sorteado</Text>
          <Text style={styles.inlineEmptySubtitle}>
            Abra a Chamada para marcar quem chegou e toque em Sortear Times. As regras ficam na
            engrenagem (⚙).
          </Text>
        </View>
      ) : (
        <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
          {pelada.lastRotationSummary ? (
            <View style={styles.rotationBanner}>
              <Text style={styles.rotationBannerLabel}>ÚLTIMA ROTAÇÃO</Text>
              <Text style={styles.rotationBannerText}>{pelada.lastRotationSummary}</Text>
            </View>
          ) : null}

          <View style={styles.teamsGrid}>
            {pelada.teams.map((team, idx) => (
              <View
                key={`${team.name}-${idx}`}
                style={[styles.teamCard, !isCompact && styles.teamCardHalf]}
              >
                <View style={styles.teamHeaderRow}>
                  <Text style={styles.teamTitle} numberOfLines={1}>
                    {team.name}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {team.consecutiveWins && team.consecutiveWins > 0 ? (
                      <View style={styles.streakPill}>
                        <Text style={styles.streakPillText}>
                          {team.consecutiveWins} {team.consecutiveWins === 1 ? 'vitória' : 'vitórias'}
                        </Text>
                      </View>
                    ) : null}
                    <Text style={styles.teamCountText}>{team.players.length}</Text>
                  </View>
                </View>
                {team.players.map((tp) => (
                  <Text key={tp.id} style={styles.teamPlayerLine} numberOfLines={1}>
                    {tp.isGoalkeeper ? '[GOL] ' : '• '}
                    {tp.name}
                  </Text>
                ))}
              </View>
            ))}
          </View>

          {waitingQueue.length > 0 && (
            <View style={[styles.teamCard, { borderColor: colors.infoBorder }]}>
              <TouchableOpacity
                style={styles.accordionHeader}
                onPress={() => setExpandQueue((v) => !v)}
              >
                <Text style={[styles.teamTitle, { color: colors.info }]}>
                  Fila de Próximos ({waitingQueue.length}) — Entram com certeza
                </Text>
                <Text style={styles.accordionChevron}>{expandQueue ? '▴' : '▾'}</Text>
              </TouchableOpacity>
              {expandQueue && (
                <View style={{ marginTop: spacing.xs }}>
                  {waitingQueue.map((p, idx) => (
                    <Text key={p.id} style={styles.teamPlayerLine}>
                      {idx + 1}. {p.isGoalkeeper ? '[GOL] ' : ''}
                      {p.name}
                      {p.position && !p.isGoalkeeper ? ` (${p.position})` : ''}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}

          {lastLoserPool.length > 0 && (
            <View style={[styles.teamCard, { borderColor: colors.warningBorder }]}>
              <TouchableOpacity
                style={styles.accordionHeader}
                onPress={() => setExpandLoserPool((v) => !v)}
              >
                <Text style={[styles.teamTitle, { color: colors.warning }]}>
                  Pool do Perdedor Anterior ({lastLoserPool.length})
                </Text>
                <Text style={styles.accordionChevron}>{expandLoserPool ? '▴' : '▾'}</Text>
              </TouchableOpacity>
              {expandLoserPool && (
                <View style={{ marginTop: spacing.xs }}>
                  <Text style={[styles.helperText, { marginBottom: spacing.xs }]}>
                    Caso faltem vagas na fila acima para completar {cfg.playersPerTeam}, as vagas
                    restantes são sorteadas entre estes atletas:
                  </Text>
                  {lastLoserPool.map((p) => (
                    <Text key={p.id} style={styles.teamPlayerLine}>
                      • {p.name}
                      {p.position ? ` (${p.position})` : ''}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );

  // Compact Stats Card -> Pop-up Modal
  const activeStatsSummary = allConfirmed
    .filter((p) => p.goals > 0 || p.assists > 0)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists);

  const statsCompactCard = (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitleNoMargin}>Súmula — Gols e Assistências</Text>
          <Text style={styles.helperText}>
            {activeStatsSummary.length === 0
              ? 'Nenhum gol ou assistência lançado ainda.'
              : activeStatsSummary
                .slice(0, 4)
                .map((p) => `${p.displayName} (${p.goals}G ${p.assists}A)`)
                .join(' • ')}
          </Text>
        </View>
        {canManage && (
          <TouchableOpacity
            style={styles.compactOpenBtn}
            onPress={() => {
              setModalSearch('');
              setShowStatsModal(true);
            }}
          >
            <Text style={styles.compactOpenBtnText}>Ajustar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const finishSection = canManage ? (
    <TouchableOpacity
      style={styles.finishPeladaBtn}
      disabled={actionLoading}
      onPress={handleFinishPelada}
      accessibilityRole="button"
      accessibilityLabel="Finalizar pelada e iniciar votação do MVP"
    >
      <Text style={styles.finishPeladaText}>Finalizar Pelada e Iniciar Votação MVP</Text>
    </TouchableOpacity>
  ) : null;

  const filteredConfirmedForModal = allConfirmed.filter((p) => {
    const q = modalSearch.trim().toLowerCase();
    if (!q) return true;
    return p.displayName.toLowerCase().includes(q) || (p.position || '').toLowerCase().includes(q);
  });

  const statsCandidates = filteredConfirmedForModal.filter(
    (p) =>
      p.attendanceStatus === 'PRESENT' ||
      p.attendanceStatus === 'INJURED' ||
      p.goals > 0 ||
      p.assists > 0
  );

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
            style={[styles.backBtn, { flexDirection: 'row', alignItems: 'center', gap: 5 }]}
            accessibilityRole="button"
            accessibilityLabel="Voltar para detalhes da pelada"
          >
            <Ionicons name="arrow-back" size={16} color={colors.textPrimary} />
            <Text style={styles.backBtnText}>Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle} numberOfLines={1}>
            {pelada.title}
          </Text>
          <View style={styles.topBarRight}>
            <View style={styles.livePill}>
              <PulseDot color={colors.error} size={7} />
              <Text style={styles.livePillText}>AO VIVO</Text>
            </View>
            {canManage && (
              <TouchableOpacity
                style={styles.gearBtn}
                onPress={() => setShowConfigModal(true)}
                accessibilityRole="button"
                accessibilityLabel="Abrir configurações e regras da pelada"
              >
                <Ionicons name="settings-outline" size={18} color={colors.textPrimary} />
              </TouchableOpacity>
            )}
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
                {matchCardSection}
                {callAndDrawCard}
                {finishSection}
              </View>
              <View style={styles.desktopRightCol}>
                {pitchSection}
                {teamsSection}
                {statsCompactCard}
              </View>
            </View>
          ) : (
            <>
              {matchCardSection}
              {pitchSection}
              {callAndDrawCard}
              {teamsSection}
              {statsCompactCard}
              {finishSection}
            </>
          )}
        </View>
      </ScrollView>

      {/* POP-UP MODAL: CHAMADA DE PRESENTES */}
      {canManage && (
        <Modal
          visible={showCallModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowCallModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalEyebrow}>CHAMADA PARA O SORTEIO</Text>
                  <Text style={styles.modalTitle}>
                    Presentes ({presentPlayers.length}/{allConfirmed.length})
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setShowCallModal(false)}
                >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.batchActionsRow}>
                <TouchableOpacity
                  style={styles.batchBtn}
                  disabled={actionLoading}
                  onPress={() =>
                    runAction(() =>
                      batchUpdatePlayerCheckin(pelada.id, { attendanceStatus: 'PRESENT' })
                    )
                  }
                >
                  <Text style={styles.batchBtnText}>Marcar todos presentes</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.batchBtn}
                  disabled={actionLoading}
                  onPress={() =>
                    runAction(() =>
                      batchUpdatePlayerCheckin(pelada.id, { attendanceStatus: 'PENDING' })
                    )
                  }
                >
                  <Text style={styles.batchBtnText}>Limpar chamada</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.modalSearchInput}
                placeholder="Buscar jogador..."
                placeholderTextColor={colors.textMuted}
                value={modalSearch}
                onChangeText={setModalSearch}
              />

              <ScrollView showsVerticalScrollIndicator={false} style={{ flexShrink: 1 }}>
                {filteredConfirmedForModal.map((player) => {
                  const status = player.attendanceStatus;
                  return (
                    <View key={player.id} style={styles.callRow}>
                      <View style={{ flex: 1, minWidth: 110 }}>
                        <View style={styles.playerNameLine}>
                          <Text style={styles.playerName} numberOfLines={1}>
                            {player.displayName}
                          </Text>
                          {player.isGoalkeeper && (
                            <View style={styles.gkTag}>
                              <Text style={styles.gkTagText}>GOL</Text>
                            </View>
                          )}
                        </View>
                        {player.position ? (
                          <Text style={styles.statsLabel}>{player.position}</Text>
                        ) : null}
                      </View>

                      <View style={styles.statusSegmented}>
                        {(
                          [
                            { key: 'PRESENT', label: 'Presente', activeStyle: styles.segPresentActive, textColor: colors.success },
                            { key: 'PENDING', label: 'Atrasou', activeStyle: styles.segPendingActive, textColor: colors.warning },
                            { key: 'INJURED', label: 'Machucou', activeStyle: styles.segInjuredActive, textColor: colors.error },
                          ] as { key: AttendanceStatus; label: string; activeStyle: any; textColor: string }[]
                        ).map((opt) => {
                          const active = status === opt.key;
                          return (
                            <TouchableOpacity
                              key={opt.key}
                              style={[styles.segBtn, active && opt.activeStyle]}
                              disabled={actionLoading}
                              hitSlop={HIT_SLOP}
                              onPress={() =>
                                runAction(() =>
                                  updatePlayerCheckin(pelada.id, player.id, {
                                    attendanceStatus: opt.key,
                                  })
                                )
                              }
                            >
                              <Text
                                style={[
                                  styles.segBtnText,
                                  active && { color: opt.textColor, fontWeight: '800' },
                                ]}
                              >
                                {opt.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* POP-UP MODAL: ESCOLHA MANUAL */}
      {canManage && (
        <Modal
          visible={showManualModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowManualModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalEyebrow}>ESCALAÇÃO MANUAL</Text>
                  <Text style={styles.modalTitle}>Distribuir Jogadores Presentes</Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setShowManualModal(false)}
                >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ flexShrink: 1 }}>
                {presentPlayers.length === 0 ? (
                  <Text style={styles.emptyText}>
                    Nenhum jogador marcado como Presente na chamada.
                  </Text>
                ) : (
                  presentPlayers.map((player) => {
                    const assignedTeam = manualAssignments[player.id];
                    return (
                      <View key={player.id} style={styles.manualPlayerRow}>
                        <Text style={styles.manualPlayerName} numberOfLines={1}>
                          {player.isGoalkeeper ? '[GOL] ' : ''}
                          {player.displayName}
                        </Text>
                        <View style={styles.manualTeamBtns}>
                          {getConfiguredTeamNames().map((tName, idx) => {
                            const selected = assignedTeam === idx;
                            const shortLabel =
                              tName.replace(/^Time\s+/i, '').slice(0, 7) || `T${idx + 1}`;
                            return (
                              <TouchableOpacity
                                key={idx}
                                style={[styles.teamPickPill, selected && styles.teamPickPillActive]}
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
              </ScrollView>

              <TouchableOpacity
                style={[styles.primaryBtnFull, { marginTop: spacing.md }]}
                disabled={actionLoading}
                onPress={handleSaveManualTeams}
              >
                <Text style={styles.primaryBtnText}>Salvar Escalações</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* POP-UP MODAL: SÚMULA DE GOLS E ASSISTÊNCIAS */}
      {canManage && (
        <Modal
          visible={showStatsModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowStatsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalEyebrow}>SÚMULA DA RODADA</Text>
                  <Text style={styles.modalTitle}>Gols e Assistências</Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setShowStatsModal(false)}
                >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.modalSearchInput}
                placeholder="Buscar jogador..."
                placeholderTextColor={colors.textMuted}
                value={modalSearch}
                onChangeText={setModalSearch}
              />

              <ScrollView showsVerticalScrollIndicator={false} style={{ flexShrink: 1 }}>
                {statsCandidates.length === 0 ? (
                  <Text style={styles.emptyText}>
                    Marque jogadores como Presente na chamada para lançar estatísticas.
                  </Text>
                ) : (
                  statsCandidates.map((player) => (
                    <View key={player.id} style={styles.statsRow}>
                      <View style={{ flex: 1, minWidth: 120 }}>
                        <Text style={styles.playerName} numberOfLines={1}>
                          {player.displayName}
                          {player.isGoalkeeper ? ' (GOL)' : ''}
                        </Text>
                        <Text style={styles.statsLabel}>
                          {player.goals}G • {player.assists}A • {player.wins}V
                        </Text>
                      </View>
                      <View style={styles.counterGroup}>
                        <TouchableOpacity
                          style={styles.counterBtn}
                          hitSlop={HIT_SLOP}
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
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* POP-UP MODAL: MARCAR GOL NA SÚMULA */}
      {canManage && goalModal && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setGoalModal(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalEyebrow}>
                    SÚMULA{timerStarted ? ` • ${currentMinute}'` : ''}
                  </Text>
                  <Text style={styles.modalTitle}>Gol do {goalModal.teamName}</Text>
                </View>
                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setGoalModal(null)}>
                  <Ionicons name="close" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ flexShrink: 1 }}>
                <Text style={styles.goalSectionLabel}>
                  {goalOwnGoal ? `Quem fez contra? (${opponentName})` : 'Quem fez o gol?'}
                </Text>
                <View style={styles.goalChipsWrap}>
                  {scorerCandidates.map((p) => {
                    const selected = goalScorerId === p.id;
                    return (
                      <TouchableOpacity
                        key={p.id}
                        style={[styles.goalChip, selected && styles.goalChipActive]}
                        onPress={() => {
                          setGoalScorerId(selected ? null : p.id);
                          if (goalAssistId === p.id) setGoalAssistId(null);
                        }}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                      >
                        <Avatar name={p.name} photoUrl={photoByPlayerId[p.id]} size={26} />
                        <Text style={[styles.goalChipText, selected && styles.goalChipTextActive]} numberOfLines={1}>
                          {p.isGoalkeeper ? '🧤 ' : ''}
                          {p.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TouchableOpacity
                  style={[styles.goalToggle, goalOwnGoal && styles.goalToggleActive]}
                  onPress={() => {
                    setGoalOwnGoal((v) => !v);
                    setGoalScorerId(null);
                    setGoalAssistId(null);
                  }}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: goalOwnGoal }}
                >
                  <Ionicons
                    name={goalOwnGoal ? 'checkbox' : 'square-outline'}
                    size={18}
                    color={goalOwnGoal ? colors.error : colors.textSecondary}
                  />
                  <Text style={styles.goalToggleText}>Foi gol contra (jogador do {opponentName})</Text>
                </TouchableOpacity>

                {!goalOwnGoal ? (
                  <>
                    <Text style={styles.goalSectionLabel}>Assistência (opcional)</Text>
                    <View style={styles.goalChipsWrap}>
                      {assistCandidates.map((p) => {
                        const selected = goalAssistId === p.id;
                        return (
                          <TouchableOpacity
                            key={p.id}
                            style={[styles.goalChip, selected && styles.goalChipActive]}
                            onPress={() => setGoalAssistId(selected ? null : p.id)}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                          >
                            <MaterialCommunityIcons
                              name="shoe-cleat"
                              size={15}
                              color={selected ? colors.primary : colors.textMuted}
                            />
                            <Text
                              style={[styles.goalChipText, selected && styles.goalChipTextActive]}
                              numberOfLines={1}
                            >
                              {p.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </>
                ) : null}
              </ScrollView>

              <TouchableOpacity
                style={[styles.primaryBtnFull, { marginTop: spacing.md }]}
                disabled={actionLoading}
                onPress={handleConfirmGoal}
              >
                <Text style={styles.primaryBtnText}>
                  {goalScorerId ? 'Confirmar gol' : 'Confirmar gol sem autor'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* POP-UP MODAL: ENGRENAGEM DE REGRAS */}
      {canManage && (
        <PeladaConfigModal
          visible={showConfigModal}
          pelada={pelada}
          initialTab="rules"
          onClose={() => setShowConfigModal(false)}
          onSaved={handleConfigSaved}
        />
      )}
    </View>
  );
}

const styles = themed(() => StyleSheet.create({
  liveClockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  liveMinutePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  liveMinutePillRunning: {
    borderColor: colors.error,
    backgroundColor: colors.errorSoft,
  },
  liveMinuteText: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.xs,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  liveClockText: {
    fontFamily: fonts.display,
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  liveScoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  liveTeamCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  liveTeamName: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.sm,
    fontWeight: '800',
    textAlign: 'center',
  },
  liveScoreCenter: {
    paddingTop: 10,
    minWidth: 96,
    alignItems: 'center',
  },
  liveScoreText: {
    color: colors.textPrimary,
    fontSize: 40,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  liveScoreX: {
    color: colors.textMuted,
    fontSize: 24,
    fontWeight: '700',
  },
  crestEditBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.card,
  },
  goalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.success,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    minHeight: 36,
    marginTop: 2,
  },
  goalBtnText: {
    color: colors.textInverse,
    fontSize: fonts.sizes.sm,
    fontWeight: '800',
  },
  matchupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    marginTop: spacing.sm,
    justifyContent: 'center',
  },
  matchupChip: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm + 2,
    minHeight: 32,
    justifyContent: 'center',
  },
  matchupChipText: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.xs,
    fontWeight: '700',
  },
  eventsBox: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.sm,
    gap: 6,
  },
  eventsEmpty: {
    color: colors.textMuted,
    fontSize: fonts.sizes.xs,
    textAlign: 'center',
    paddingVertical: spacing.xs,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '78%',
  },
  eventRowRight: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  eventMinute: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs,
    fontWeight: '800',
    minWidth: 26,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  eventTextCol: {
    flexShrink: 1,
  },
  eventScorer: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.sm,
    fontWeight: '700',
  },
  eventAssist: {
    color: colors.textMuted,
    fontSize: fonts.sizes.xs,
  },
  matchHistoryBlock: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  matchEventsText: {
    color: colors.textMuted,
    fontSize: fonts.sizes.xs,
    paddingBottom: spacing.sm,
  },
  goalSectionLabel: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  goalChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  goalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.full,
    paddingLeft: 4,
    paddingRight: spacing.sm + 2,
    minHeight: 36,
    maxWidth: '100%',
  },
  goalChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  goalChipText: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs + 1,
    fontWeight: '700',
    flexShrink: 1,
  },
  goalChipTextActive: {
    color: colors.primary,
  },
  goalToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  goalToggleActive: {
    borderColor: colors.error,
    backgroundColor: colors.errorSoft,
  },
  goalToggleText: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.xs + 1,
    fontWeight: '600',
    flexShrink: 1,
  },
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
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  backBtn: {
    paddingVertical: spacing.sm,
    paddingRight: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  backBtnText: { color: colors.textPrimary, fontSize: fonts.sizes.md, fontWeight: '700' },
  topTitle: {
    flex: 1,
    minWidth: 100,
    color: colors.textPrimary,
    fontSize: fonts.sizes.md,
    fontWeight: '800',
    textAlign: 'center',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.errorSoft,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.error,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
  livePillText: {
    color: colors.error,
    fontSize: fonts.sizes.xs,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  gearBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gearBtnText: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
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
    flex: 1.25,
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
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitleNoMargin: {
    fontSize: fonts.sizes.md,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  inlineLinkText: {
    color: colors.primary,
    fontSize: fonts.sizes.xs,
    fontWeight: '800',
  },
  ruleBadgeText: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs,
    fontWeight: '700',
    marginTop: 4,
  },
  helperText: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs,
    marginTop: 2,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fonts.sizes.sm,
    fontStyle: 'italic',
  },
  timerCompactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timerLeft: {
    gap: 2,
  },
  timerMiniLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  timerDisplayCompact: {
    fontFamily: fonts.display,
    fontSize: 34,
    fontWeight: '800',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  timerControlsRow: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
  },
  timerControlBtn: {
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerControlBtnPrimaryText: {
    color: colors.textInverse,
    fontSize: fonts.sizes.xs + 1,
    fontWeight: '800',
  },
  timerResetBtn: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm + 4,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerResetBtnText: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs + 1,
    fontWeight: '700',
  },
  scoreboardIntegrated: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  callActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm + 4,
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  primaryBtnFull: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm + 5,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
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
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  secondaryBtnText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: fonts.sizes.sm,
    textAlign: 'center',
  },
  compactOpenBtn: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactOpenBtnText: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.xs,
    fontWeight: '800',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  accordionChevron: {
    color: colors.textMuted,
    fontSize: fonts.sizes.md,
    fontWeight: '800',
  },
  inlineEmptyBox: {
    marginTop: spacing.sm + 2,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md + 2,
    alignItems: 'center',
    gap: spacing.xs,
  },
  inlineEmptyTitle: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.sm,
    fontWeight: '700',
    textAlign: 'center',
  },
  inlineEmptySubtitle: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs,
    textAlign: 'center',
    lineHeight: 18,
  },
  rotationBanner: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.sm + 4,
    gap: 2,
  },
  rotationBannerLabel: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  rotationBannerText: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.xs,
    lineHeight: 18,
  },
  teamsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  teamCard: {
    width: '100%',
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftColor: colors.border,
    padding: spacing.sm + 4,
  },
  teamCardHalf: {
    flex: 1,
    minWidth: '46%',
  },
  teamHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  teamTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fonts.sizes.sm + 1,
    fontWeight: '800',
  },
  teamCountText: {
    color: colors.textMuted,
    fontSize: fonts.sizes.xs,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  teamPlayerLine: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs + 1,
    paddingVertical: 2,
  },
  scoreboardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm + 4,
  },
  scoreboardBoxCompact: {
    flexDirection: 'column',
    gap: spacing.sm,
  },
  scoreTeamCol: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  teamPickerChip: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    minHeight: 32,
    justifyContent: 'center',
    maxWidth: '95%',
  },
  teamPickerText: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.xs,
    fontWeight: '700',
  },
  scoreControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  scoreStepBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
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
    fontFamily: fonts.display,
    color: colors.textPrimary,
    fontSize: 36,
    fontWeight: '800',
    minWidth: 34,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  scoreVs: {
    color: colors.textMuted,
    fontSize: fonts.sizes.md,
    fontWeight: '800',
    marginHorizontal: spacing.xs,
  },
  tieBox: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm + 2,
    gap: spacing.xs + 2,
  },
  tieLabel: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs,
    fontWeight: '700',
  },
  tieBtnsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  tieBtn: {
    flex: 1,
    minWidth: 96,
    minHeight: 38,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs + 2,
  },
  tieBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  tieBtnText: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs,
    fontWeight: '700',
  },
  streakPill: {
    backgroundColor: colors.goldSoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.goldBorder,
  },
  streakPillText: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: '800',
  },
  teamStreakLabel: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 2,
  },
  winLimitAlert: {
    marginTop: spacing.sm,
    backgroundColor: colors.warningSoft,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 3,
  },
  winLimitAlertText: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.xs,
    fontWeight: '600',
    textAlign: 'center',
  },
  matchHistoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs + 4,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.sm,
  },
  matchScoreText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: fonts.sizes.xs + 1,
    fontWeight: '600',
  },
  winnerPill: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  matchWinnerText: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.xs,
    fontWeight: '700',
  },
  finishPeladaBtn: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    marginBottom: spacing.md,
  },
  finishPeladaText: {
    color: colors.primary,
    fontSize: fonts.sizes.sm + 1,
    fontWeight: '800',
    textAlign: 'center',
  },
  // Pop-up modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: layout.maxWidth,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.lg,
    maxHeight: '88%',
    overflow: 'hidden',
    ...shadows.card,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm + 4,
    gap: spacing.sm,
  },
  modalEyebrow: {
    color: colors.textMuted,
    fontSize: fonts.sizes.xs,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.lg,
    fontWeight: '800',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.md,
    fontWeight: '700',
  },
  modalSearchInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: fonts.sizes.sm,
    marginBottom: spacing.sm + 2,
  },
  batchActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm + 2,
  },
  batchBtn: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 7,
    minHeight: 36,
    justifyContent: 'center',
  },
  batchBtnText: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.xs,
    fontWeight: '700',
  },
  callRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.sm,
  },
  playerNameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
  },
  gkTag: {
    backgroundColor: colors.infoSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  gkTagText: {
    color: colors.info,
    fontSize: 10,
    fontWeight: '800',
  },
  statusSegmented: {
    flexDirection: 'row',
    gap: 4,
  },
  segBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm + 2,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segPresentActive: {
    borderColor: colors.success,
    backgroundColor: colors.successSoft,
  },
  segPendingActive: {
    borderColor: colors.warning,
    backgroundColor: colors.warningSoft,
  },
  segInjuredActive: {
    borderColor: colors.error,
    backgroundColor: colors.errorSoft,
  },
  segBtnText: {
    color: colors.textMuted,
    fontSize: fonts.sizes.xs,
    fontWeight: '700',
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  playerName: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.sm,
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
    minHeight: 38,
    minWidth: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnText: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.xs + 1,
    fontWeight: '800',
  },
}));
