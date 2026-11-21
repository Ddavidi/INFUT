// Post-Game Screen — 2-Step MVP Voting (Pop-up Modal), Compact Stats & Weekly Cycle
import React, { useState, useCallback } from 'react';
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
import {
  getPeladaById,
  startNextPeladaCycle,
  updatePeladaStatus,
  updatePeladaVotingStatus,
  updatePlayerCheckin,
  voteMvp,
} from '../../services/peladaService';
import { Pelada, PeladaPlayer } from '../../types';
import { colors, fonts, spacing, borderRadius, shadows, layout } from '../../constants/theme';
import { showConfirm, showMessage } from '../../utils/alerts';
import { formatPeladaSchedule } from '../../utils/dateTime';
import { buildInviteUrl, shareOrCopyText } from '../../utils/inviteLink';
import { useResponsive } from '../../hooks/useResponsive';
import { usePeladaLiveSync } from '../../hooks/usePeladaLiveSync';
import { Ionicons } from '@expo/vector-icons';

type Props = NativeStackScreenProps<AppStackParamList, 'PostGame'>;

const HIT_SLOP = { top: 4, bottom: 4, left: 4, right: 4 };

export function PostGameScreen({ navigation, route }: Props) {
  const { peladaId } = route.params;
  const { isDesktop, containerMaxWidth, pagePadding, topSpace } = useResponsive();

  const [pelada, setPelada] = useState<Pelada | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Pop-ups & Collapsibles to keep vertical screen compact
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [voteSearch, setVoteSearch] = useState('');
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [expandRankingList, setExpandRankingList] = useState(false);
  const [expandMatches, setExpandMatches] = useState(true);
  const [showAllStats, setShowAllStats] = useState(false);

  const loadPelada = useCallback(async () => {
    try {
      const data = await getPeladaById(peladaId);
      setPelada(data);
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Erro ao carregar pós-jogo';
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

  // Tempo real: quando alguem muda algo na pelada, atualiza esta tela sozinha
  const silentReload = useCallback(async () => {
    try {
      setPelada(await getPeladaById(peladaId));
    } catch {
      // ignora falhas pontuais; tenta no proximo ciclo
    }
  }, [peladaId]);
  usePeladaLiveSync(peladaId, { currentVersion: pelada?.syncVersion, reload: silentReload });

  const canManage = pelada?.myRole === 'ORGANIZER' || pelada?.myRole === 'CO_ORGANIZER';

  async function runAction(fn: () => Promise<Pelada>, successToast?: string) {
    setActionLoading(true);
    try {
      const updated = await fn();
      setPelada(updated);
      if (successToast) {
        showMessage('Pronto', successToast);
      }
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Não foi possível concluir a ação';
      showMessage('Erro', msg);
    } finally {
      setActionLoading(false);
    }
  }

  function handleReopenLive() {
    if (!pelada) return;
    showConfirm(
      'Reabrir Pelada ao Vivo',
      'Deseja voltar a pelada para "Em andamento" caso ainda falte registrar gols ou partidas?',
      async () => {
        setActionLoading(true);
        try {
          await updatePeladaStatus(pelada.id, 'IN_PROGRESS');
          navigation.replace('LivePelada', { peladaId: pelada.id });
        } catch (error: any) {
          showMessage('Erro', error.response?.data?.error || 'Não foi possível reabrir');
        } finally {
          setActionLoading(false);
        }
      },
      'Reabrir'
    );
  }

  function handleCloseVoting() {
    if (!pelada) return;
    const votesCast = pelada.votesCastCount ?? 0;
    showConfirm(
      'Encerrar Votação e Revelar MVP',
      votesCast === 0
        ? 'Nenhum voto foi registrado ainda. Deseja encerrar a votação mesmo assim?'
        : `${votesCast} voto(s) já foram registrados. Ao encerrar, o vencedor do MVP será revelado para todos os participantes.`,
      () =>
        runAction(
          () => updatePeladaVotingStatus(pelada.id, 'CLOSED'),
          'Resultado oficial publicado.'
        ),
      'Encerrar e Revelar'
    );
  }

  function handleReopenVoting() {
    if (!pelada) return;
    showConfirm(
      'Reabrir Votação',
      'A votação voltará a ficar aberta e os resultados ficarão ocultos até o novo encerramento.',
      () => runAction(() => updatePeladaVotingStatus(pelada.id, 'OPEN')),
      'Reabrir Votação'
    );
  }

  async function handleSharePostGameWhatsApp() {
    if (!pelada) return;
    const confirmed = pelada.players.filter((p) => p.status === 'CONFIRMED');
    const ranked = [...confirmed].sort(
      (a, b) =>
        b.goals * 3 + b.assists * 2 + b.wins - (a.goals * 3 + a.assists * 2 + a.wins)
    );
    const highlights = ranked
      .filter((p) => p.goals > 0 || p.assists > 0 || p.wins > 0)
      .slice(0, 5);

    const mvpLine =
      pelada.mvpRanking.length > 0
        ? `\n\n*MVP da Pelada:* ${pelada.mvpRanking[0].displayName} (${pelada.mvpRanking[0].votes} voto(s))`
        : '';

    const matchesBlock =
      pelada.matches.length > 0
        ? `\n\n*Placares da Rodada:*\n` +
          pelada.matches
            .map(
              (m) =>
                `• ${m.teamAName} ${m.scoreA} x ${m.scoreB} ${m.teamBName} (${
                  m.winner === 'EMPATE' ? 'Empate' : m.winner
                })`
            )
            .join('\n')
        : '';

    const highlightsBlock =
      highlights.length > 0
        ? `\n\n*Destaques em Campo:*\n` +
          highlights
            .map(
              (p, idx) =>
                `${idx + 1}. ${p.displayName} — ${p.goals}G • ${p.assists}A • ${p.wins}V`
            )
            .join('\n')
        : '';

    const message =
      `*Resenha Pós-Jogo — ${pelada.title}*\n` +
      `${formatPeladaSchedule(pelada.dateTime, pelada.durationHours)}` +
      mvpLine +
      matchesBlock +
      highlightsBlock +
      `\n\nConfira no INFUT: ${buildInviteUrl(pelada.inviteCode)}`;

    await shareOrCopyText(
      'Resenha copiada',
      message,
      'Resumo pós-jogo e MVP copiados para colar no WhatsApp.'
    );
  }

  function handleStartNextCycle() {
    if (!pelada) return;
    showConfirm(
      'Preparar Próxima Pelada (+7 dias)',
      `Será criada a pelada da próxima semana mantendo o código #${pelada.inviteCode}, os membros do grupo e todas as regras configuradas. Os dados e votos desta edição continuam salvos no histórico.`,
      async () => {
        setActionLoading(true);
        try {
          const nextPelada = await startNextPeladaCycle(pelada.id);
          showMessage(
            'Próxima semana criada',
            `Pelada aberta para a próxima semana com o código #${nextPelada.inviteCode}.`
          );
          navigation.replace('PeladaDetails', { peladaId: nextPelada.id });
        } catch (error: any) {
          showMessage(
            'Erro',
            error.response?.data?.error || 'Não foi possível preparar a próxima pelada'
          );
        } finally {
          setActionLoading(false);
        }
      },
      'Criar Próxima Semana'
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <View style={styles.stateCard}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateText}>Carregando pós-jogo…</Text>
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
  const eligibleForVoting = allConfirmed.filter((p) => p.attendanceStatus !== 'NO_SHOW');
  const sortedStats = [...allConfirmed].sort(
    (a, b) =>
      b.goals * 3 +
      b.assists * 2 +
      b.wins -
      (a.goals * 3 + a.assists * 2 + a.wins)
  );
  const displayedStats = showAllStats ? sortedStats : sortedStats.slice(0, 5);
  const noShowCount = allConfirmed.filter((p) => p.attendanceStatus === 'NO_SHOW').length;

  const votingStatus = pelada.votingStatus || 'OPEN';
  const isVotingOpen = votingStatus === 'OPEN';
  const canVote = Boolean(
    (pelada.myPlayer &&
      pelada.myStatus !== 'DECLINED' &&
      pelada.myPlayer.attendanceStatus !== 'NO_SHOW') ||
      canManage
  );
  const hasVotedMvp = Boolean(pelada.myPlayer?.votedMvpForId);
  const myMvpTarget = allConfirmed.find((p) => p.id === pelada.myPlayer?.votedMvpForId);

  const votesCast = pelada.votesCastCount ?? 0;
  const eligibleCount = pelada.eligibleVotersCount ?? eligibleForVoting.length;
  const voteProgressPct =
    eligibleCount > 0 ? Math.min(100, Math.round((votesCast / eligibleCount) * 100)) : 0;

  const filteredVoteCandidates = eligibleForVoting.filter((p) => {
    const q = voteSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      p.displayName.toLowerCase().includes(q) ||
      (p.position || '').toLowerCase().includes(q)
    );
  });

  const mvpColumn = (
    <>
      {isVotingOpen ? (
        <View style={styles.stepBannerCard}>
          <View style={styles.stepTopRow}>
            <Text style={styles.stepEyebrow}>
              {hasVotedMvp ? 'ETAPA 2 DE 2 • VOTO REGISTRADO' : 'ETAPA 1 DE 2 • VOTAÇÃO DO MVP'}
            </Text>
            <Text style={styles.voteProgressCount}>
              {votesCast}/{eligibleCount} voto(s)
            </Text>
          </View>

          <Text style={styles.stepTitle}>
            {hasVotedMvp ? `Seu voto: ${myMvpTarget?.displayName || 'Registrado'}` : 'Votação de MVP Aberta'}
          </Text>

          <Text style={styles.stepSubtitle}>
            {hasVotedMvp
              ? 'O vencedor permanece oculto até todos votarem ou o organizador encerrar a votação.'
              : 'Os votos são secretos. O MVP só será revelado após o encerramento da votação.'}
          </Text>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${voteProgressPct}%` }]} />
          </View>

          <View style={styles.votingButtonsStack}>
            {canVote && (
              <TouchableOpacity
                style={[styles.primaryActionBtn, hasVotedMvp && styles.secondaryActionBtn]}
                onPress={() => {
                  setVoteSearch('');
                  setShowVoteModal(true);
                }}
                accessibilityRole="button"
                accessibilityLabel={hasVotedMvp ? 'Alterar meu voto de MVP' : 'Abrir votação de MVP'}
              >
                <Text style={hasVotedMvp ? styles.secondaryActionBtnText : styles.primaryActionBtnText}>
                  {hasVotedMvp ? 'Alterar Meu Voto no MVP' : 'Votar no MVP da Pelada'}
                </Text>
              </TouchableOpacity>
            )}

            {canManage && (
              <TouchableOpacity
                style={hasVotedMvp ? styles.primaryActionBtn : styles.secondaryActionBtn}
                disabled={actionLoading}
                onPress={handleCloseVoting}
                accessibilityRole="button"
                accessibilityLabel="Encerrar votação e revelar MVP"
              >
                <Text
                  style={
                    hasVotedMvp ? styles.primaryActionBtnText : styles.secondaryActionBtnText
                  }
                >
                  Encerrar Votação e Revelar Vencedor
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        <>
          <View style={styles.winnersHighlightCard}>
            <View style={styles.stepTopRow}>
              <Text style={styles.winnersEyebrow}>RESULTADO OFICIAL • MVP DA PELADA</Text>
              <Text style={styles.voteProgressCount}>{votesCast} voto(s)</Text>
            </View>

            {pelada.mvpRanking.length > 0 ? (
              <View style={styles.winnerRow}>
                <View style={styles.winnerBadge}>
                  <Text style={styles.winnerBadgeText}>MVP</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.winnerName}>{pelada.mvpRanking[0].displayName}</Text>
                  <Text style={styles.winnerVotes}>
                    {pelada.mvpRanking[0].votes} voto(s) computado(s)
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.emptyText}>Nenhum voto foi registrado nesta pelada.</Text>
            )}

            {pelada.mvpRanking.length > 1 && (
              <TouchableOpacity
                style={styles.accordionSubBtn}
                onPress={() => setExpandRankingList((v) => !v)}
              >
                <Text style={styles.accordionSubBtnText}>
                  {expandRankingList
                    ? 'Ocultar classificação de votos ▴'
                    : `Ver classificação completa (${pelada.mvpRanking.length}) ▾`}
                </Text>
              </TouchableOpacity>
            )}

            {expandRankingList && pelada.mvpRanking.length > 0 && (
              <View style={styles.rankListBox}>
                {pelada.mvpRanking.map((entry, idx) => (
                  <View key={entry.playerId} style={styles.rankRow}>
                    <Text style={styles.rankName}>
                      {idx + 1}º {entry.displayName}
                    </Text>
                    <Text style={styles.rankVotes}>{entry.votes} voto(s)</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {canManage && (
            <TouchableOpacity style={styles.reopenBtn} onPress={handleReopenVoting}>
              <Text style={styles.reopenBtnText}>Reabrir Votação de MVP</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* Weekly Cycle + Reopen Live (placed compactly) */}
      {canManage && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Ciclo Semanal</Text>
          <Text style={styles.helperText}>
            Crie a edição da próxima semana (+7 dias) mantendo o código #{pelada.inviteCode}, os
            membros e todas as regras configuradas.
          </Text>
          <TouchableOpacity
            style={styles.nextCycleBtn}
            disabled={actionLoading}
            onPress={handleStartNextCycle}
            accessibilityRole="button"
            accessibilityLabel="Preparar próxima pelada em 7 dias"
          >
            <Text style={styles.nextCycleBtnText}>Preparar Próxima Pelada (+7 dias)</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  const statsAndManageColumn = (
    <>
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Estatísticas da Pelada</Text>

        {pelada.matches.length > 0 && (
          <View style={styles.matchesSummaryBox}>
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={() => setExpandMatches((v) => !v)}
            >
              <Text style={styles.subLabel}>
                Placares registrados ({pelada.matches.length})
              </Text>
              <Text style={styles.accordionChevron}>{expandMatches ? '▴' : '▾'}</Text>
            </TouchableOpacity>

            {expandMatches &&
              pelada.matches.map((m) => (
                <View key={m.id} style={styles.matchHistoryRow}>
                  <Text style={styles.matchScoreText}>
                    {m.teamAName} {m.scoreA} x {m.scoreB} {m.teamBName}
                  </Text>
                  <View style={styles.winnerPill}>
                    <Text style={styles.matchWinnerText}>
                      {m.winner === 'EMPATE' ? 'Empate' : m.winner}
                    </Text>
                  </View>
                </View>
              ))}
          </View>
        )}

        <Text style={[styles.subLabel, { marginTop: pelada.matches.length > 0 ? spacing.sm : 0 }]}>
          Destaques em campo:
        </Text>
        {sortedStats.length === 0 ? (
          <Text style={styles.emptyText}>Nenhuma estatística registrada.</Text>
        ) : (
          <>
            {displayedStats.map((player, idx) => (
              <View key={player.id} style={styles.statLineRow}>
                <Text style={styles.statRankNum}>{idx + 1}º</Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.playerName} numberOfLines={1}>
                    {player.displayName}
                    {player.attendanceStatus === 'NO_SHOW' ? ' (Faltou)' : ''}
                  </Text>
                  <Text style={styles.statsLabel}>
                    {player.goals} gol(s) • {player.assists} assist. • {player.wins} vit.
                  </Text>
                </View>
              </View>
            ))}

            {sortedStats.length > 5 && (
              <TouchableOpacity
                style={styles.accordionSubBtn}
                onPress={() => setShowAllStats((v) => !v)}
              >
                <Text style={styles.accordionSubBtnText}>
                  {showAllStats
                    ? 'Mostrar apenas Top 5 ▴'
                    : `Ver todos os ${sortedStats.length} atletas ▾`}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {!isVotingOpen && (
          <TouchableOpacity
            style={styles.whatsappShareBtn}
            onPress={handleSharePostGameWhatsApp}
            accessibilityRole="button"
            accessibilityLabel="Compartilhar resenha pós-jogo e MVP no WhatsApp"
          >
            <Text style={styles.whatsappShareBtnText}>
              Compartilhar Resenha e MVP no WhatsApp
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {canManage && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitleNoMargin}>Controle de Faltas</Text>
              <Text style={styles.helperTextNoMargin}>
                {noShowCount === 0
                  ? 'Nenhuma falta marcada entre os confirmados.'
                  : `${noShowCount} jogador(es) marcado(s) como falta.`}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.compactOpenBtn}
              onPress={() => setShowAbsenceModal(true)}
            >
              <Text style={styles.compactOpenBtnText}>Gerenciar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {canManage && (
        <TouchableOpacity
          style={styles.reopenBtn}
          disabled={actionLoading}
          onPress={handleReopenLive}
        >
          <Text style={styles.reopenBtnText}>Reabrir Pelada ao Vivo</Text>
        </TouchableOpacity>
      )}
    </>
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
          <View
            style={[
              styles.finishedPill,
              isVotingOpen && { borderColor: colors.primary, backgroundColor: colors.primarySoft },
            ]}
          >
            <Text
              style={[
                styles.finishedPillText,
                isVotingOpen && { color: colors.primary },
              ]}
            >
              {isVotingOpen ? 'VOTAÇÃO ABERTA' : 'FINALIZADA'}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: pagePadding }]}
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
              <View style={styles.desktopLeftCol}>{mvpColumn}</View>
              <View style={styles.desktopRightCol}>{statsAndManageColumn}</View>
            </View>
          ) : (
            <>
              {mvpColumn}
              {statsAndManageColumn}
            </>
          )}
        </View>
      </ScrollView>

      {/* POP-UP MODAL: VOTAÇÃO DE MVP */}
      <Modal
        visible={showVoteModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowVoteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepEyebrow}>ESCOLHA O CRAQUE DA RODADA</Text>
                <Text style={styles.modalTitle}>Votar no MVP da Pelada</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setShowVoteModal(false)}
                accessibilityRole="button"
                accessibilityLabel="Fechar votação de MVP"
              >
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalSearchInput}
              placeholder="Buscar jogador por nome ou posição..."
              placeholderTextColor={colors.textMuted}
              value={voteSearch}
              onChangeText={setVoteSearch}
            />

            <ScrollView showsVerticalScrollIndicator={false} style={{ flexShrink: 1 }}>
              {filteredVoteCandidates.length === 0 ? (
                <Text style={styles.emptyText}>Nenhum jogador encontrado.</Text>
              ) : (
                filteredVoteCandidates.map((player) => {
                  const isSelected = pelada.myPlayer?.votedMvpForId === player.id;
                  return (
                    <View key={player.id} style={styles.modalRow}>
                      <View style={{ flex: 1, minWidth: 120 }}>
                        <Text style={styles.playerName} numberOfLines={1}>
                          {player.displayName}
                          {player.isGoalkeeper ? ' (GOL)' : ''}
                        </Text>
                        <Text style={styles.statsLabel}>
                          {player.position ? `${player.position} • ` : ''}
                          {player.goals}G • {player.assists}A • {player.wins}V
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.voteBtn, isSelected && styles.voteBtnActive]}
                        disabled={actionLoading}
                        onPress={() =>
                          runAction(async () => {
                            const updated = await voteMvp(pelada.id, player.id);
                            setShowVoteModal(false);
                            return updated;
                          })
                        }
                      >
                        <Text
                          style={[
                            styles.voteBtnText,
                            isSelected && { color: colors.textInverse },
                          ]}
                        >
                          {isSelected ? 'Selecionado ✓' : 'Votar MVP'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* POP-UP MODAL: CONTROLE DE FALTAS */}
      {canManage && (
        <Modal
          visible={showAbsenceModal}
          animationType="fade"
          transparent
          onRequestClose={() => setShowAbsenceModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepEyebrow}>ORGANIZADOR</Text>
                  <Text style={styles.modalTitle}>Controle de Faltas</Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setShowAbsenceModal(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Fechar controle de faltas"
                >
                  <Ionicons name="close" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ flexShrink: 1 }}>
                {allConfirmed.map((player) => {
                  const isNoShow = player.attendanceStatus === 'NO_SHOW';
                  return (
                    <View key={player.id} style={styles.modalRow}>
                      <View style={{ flex: 1, minWidth: 120 }}>
                        <Text style={styles.playerName} numberOfLines={1}>
                          {player.displayName}
                        </Text>
                        <Text
                          style={[
                            styles.absenceSub,
                            { color: isNoShow ? colors.error : colors.success },
                          ]}
                        >
                          {isNoShow
                            ? 'Marcado como falta'
                            : player.attendanceStatus === 'INJURED'
                            ? 'Compareceu (saiu por lesão)'
                            : 'Compareceu'}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.absenceBtn, isNoShow && styles.absenceBtnActive]}
                        disabled={actionLoading}
                        onPress={() =>
                          runAction(() =>
                            updatePlayerCheckin(pelada.id, player.id, {
                              attendanceStatus: isNoShow ? 'PRESENT' : 'NO_SHOW',
                            })
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.absenceBtnText,
                            isNoShow && { color: colors.error },
                          ]}
                        >
                          {isNoShow ? 'Desmarcar' : 'Faltou'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
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
  finishedPill: {
    backgroundColor: colors.successSoft,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.success,
  },
  finishedPillText: {
    color: colors.success,
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
  stepBannerCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.md + 2,
    marginBottom: spacing.md,
    gap: spacing.xs + 2,
    ...shadows.card,
  },
  stepTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepEyebrow: {
    color: colors.primary,
    fontSize: fonts.sizes.xs,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  voteProgressCount: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  stepTitle: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.xl,
    fontWeight: '800',
  },
  stepSubtitle: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs + 1,
    lineHeight: 19,
  },
  progressTrack: {
    height: 6,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  votingButtonsStack: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  primaryActionBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 5,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  primaryActionBtnText: {
    color: colors.textInverse,
    fontSize: fonts.sizes.sm,
    fontWeight: '800',
    textAlign: 'center',
  },
  secondaryActionBtn: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  secondaryActionBtnText: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.sm,
    fontWeight: '700',
    textAlign: 'center',
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
    flex: 1,
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
  sectionTitle: {
    fontSize: fonts.sizes.md,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  sectionTitleNoMargin: {
    fontSize: fonts.sizes.md,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  helperText: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs + 1,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  helperTextNoMargin: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs,
    marginTop: 2,
  },
  subLabel: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs + 1,
    fontWeight: '700',
    marginBottom: spacing.xs + 2,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fonts.sizes.sm,
    fontStyle: 'italic',
  },
  winnersHighlightCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    padding: spacing.md + 2,
    marginBottom: spacing.md,
    gap: spacing.sm + 2,
    ...shadows.card,
  },
  winnersEyebrow: {
    color: colors.primary,
    fontSize: fonts.sizes.xs,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  winnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  winnerBadge: {
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    backgroundColor: colors.goldSoft,
    minWidth: 54,
    alignItems: 'center',
  },
  winnerBadgeText: {
    color: colors.gold,
    fontSize: fonts.sizes.xs,
    fontWeight: '800',
  },
  winnerName: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.lg,
    fontWeight: '800',
  },
  winnerVotes: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs,
    fontWeight: '600',
  },
  rankListBox: {
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  rankName: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.sm,
    fontWeight: '700',
  },
  rankVotes: {
    color: colors.primary,
    fontSize: fonts.sizes.xs + 1,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accordionChevron: {
    color: colors.primary,
    fontSize: fonts.sizes.md,
    fontWeight: '800',
  },
  accordionSubBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  accordionSubBtnText: {
    color: colors.primary,
    fontSize: fonts.sizes.xs,
    fontWeight: '800',
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
  matchesSummaryBox: {
    marginBottom: spacing.xs,
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
    fontSize: fonts.sizes.sm,
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
  statLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingVertical: spacing.xs + 4,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  statRankNum: {
    width: 26,
    color: colors.primary,
    fontSize: fonts.sizes.sm,
    fontWeight: '800',
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
  reopenBtn: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 3,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    marginBottom: spacing.md,
  },
  reopenBtnText: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.sm,
    fontWeight: '700',
  },
  whatsappShareBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  whatsappShareBtnText: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.xs + 1,
    fontWeight: '700',
    textAlign: 'center',
  },
  nextCycleBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 5,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  nextCycleBtnText: {
    color: colors.textInverse,
    fontSize: fonts.sizes.sm,
    fontWeight: '800',
    textAlign: 'center',
  },
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
    marginBottom: spacing.md,
    gap: spacing.sm,
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
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.sm,
  },
  voteBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voteBtnActive: {
    backgroundColor: colors.primary,
  },
  voteBtnText: {
    color: colors.primary,
    fontSize: fonts.sizes.xs + 1,
    fontWeight: '800',
  },
  absenceSub: {
    fontSize: fonts.sizes.xs,
    fontWeight: '700',
    marginTop: 2,
  },
  absenceBtn: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    minHeight: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  absenceBtnActive: {
    borderColor: colors.error,
    backgroundColor: colors.errorSoft,
  },
  absenceBtnText: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.xs,
    fontWeight: '700',
  },
});
