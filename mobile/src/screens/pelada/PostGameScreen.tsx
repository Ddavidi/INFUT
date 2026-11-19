// Post-Game Screen - Statistics, MVP Voting (Open to All) & Organizer Absence Check
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation';
import {
  getPeladaById,
  startNextPeladaCycle,
  updatePeladaStatus,
  updatePlayerCheckin,
  voteGoalkeeper,
  voteMvp,
} from '../../services/peladaService';
import { Pelada, PeladaPlayer } from '../../types';
import { colors, fonts, spacing, borderRadius, shadows } from '../../constants/theme';
import { showConfirm, showMessage } from '../../utils/alerts';
import { formatPeladaSchedule } from '../../utils/dateTime';
import { buildInviteUrl, shareOrCopyText } from '../../utils/inviteLink';
import { useResponsive } from '../../hooks/useResponsive';

type Props = NativeStackScreenProps<AppStackParamList, 'PostGame'>;

const HIT_SLOP = { top: 4, bottom: 4, left: 4, right: 4 };

export function PostGameScreen({ navigation, route }: Props) {
  const { peladaId } = route.params;
  const { isDesktop, containerMaxWidth, pagePadding, topSpace } = useResponsive();

  const [pelada, setPelada] = useState<Pelada | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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
        ? `\n\n👑 *MVP da Pelada:* ${pelada.mvpRanking[0].displayName} (${pelada.mvpRanking[0].votes} voto(s))`
        : '';
    const gkLine =
      pelada.goalkeeperRanking.length > 0
        ? `\n🧤 *Goleiro Paredão:* ${pelada.goalkeeperRanking[0].displayName} (${pelada.goalkeeperRanking[0].votes} voto(s))`
        : '';

    const matchesBlock =
      pelada.matches.length > 0
        ? `\n\n⚽ *Placares da Rodada:*\n` +
          pelada.matches
            .map(
              (m) =>
                `• ${m.teamAName} ${m.scoreA} x ${m.scoreB} ${m.teamBName} (${
                  m.winner === 'EMPATE' ? 'Empate' : `🏆 ${m.winner}`
                })`
            )
            .join('\n')
        : '';

    const highlightsBlock =
      highlights.length > 0
        ? `\n\n🔥 *Destaques da Rodada:*\n` +
          highlights
            .map(
              (p, idx) =>
                `${idx + 1}º ${p.displayName} — ⚽ ${p.goals}G • 👟 ${p.assists}A • 🏆 ${p.wins}V`
            )
            .join('\n')
        : '';

    const message =
      `🏁 *Resenha Pós-Jogo — ${pelada.title}*\n` +
      `📅 ${formatPeladaSchedule(pelada.dateTime, pelada.durationHours)}` +
      mvpLine +
      gkLine +
      matchesBlock +
      highlightsBlock +
      `\n\n🔗 Veja as estatísticas e vote no MVP: ${buildInviteUrl(pelada.inviteCode)}`;

    await shareOrCopyText(
      'Resenha copiada! 📲',
      message,
      'Resumo pós-jogo e MVP copiados para colar no grupo do WhatsApp!'
    );
  }

  function handleStartNextCycle() {
    if (!pelada) return;
    showConfirm(
      'Preparar Próxima Pelada (+7 dias)',
      `Vamos abrir a pelada da próxima semana mantendo o código #${pelada.inviteCode} e os membros cadastrados (mensalistas já entram confirmados e com stats zerados). O histórico desta pelada e os votos de MVP continuam salvos!`,
      async () => {
        setActionLoading(true);
        try {
          const nextPelada = await startNextPeladaCycle(pelada.id);
          showMessage(
            'Próxima semana aberta! 🔄',
            `Pelada criada para a próxima semana com o código #${nextPelada.inviteCode}.`
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
          <Text style={styles.stateText}>Carregando estatísticas e votação de MVP…</Text>
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
  const eligibleForVoting = allConfirmed.filter((p) => p.attendanceStatus !== 'NO_SHOW');
  const sortedStats = [...allConfirmed].sort(
    (a, b) =>
      b.goals * 3 +
      b.assists * 2 +
      b.wins -
      (a.goals * 3 + a.assists * 2 + a.wins)
  );
  const canVote = pelada.myStatus === 'CONFIRMED';

  const votingColumn = (
    <>
      {/* 1. MVP Leaderboard (if any votes) */}
      {pelada.mvpRanking.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🏆 Ranking MVP da Pelada</Text>
          {pelada.mvpRanking.map((entry, idx) => (
            <View key={entry.playerId} style={styles.rankRow}>
              <Text style={styles.rankName}>
                {idx === 0 ? '👑 ' : `${idx + 1}º `}
                {entry.displayName}
              </Text>
              <Text style={styles.rankVotes}>{entry.votes} voto(s)</Text>
            </View>
          ))}
        </View>
      )}

      {pelada.goalkeeperRanking.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🧤 Ranking Goleiro Paredão</Text>
          {pelada.goalkeeperRanking.map((entry, idx) => (
            <View key={entry.playerId} style={styles.rankRow}>
              <Text style={styles.rankName}>
                {idx === 0 ? '🧤 ' : `${idx + 1}º `}
                {entry.displayName}
              </Text>
              <Text style={styles.rankVotes}>{entry.votes} voto(s)</Text>
            </View>
          ))}
        </View>
      )}

      {/* 2. Open MVP Voting */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>⭐ Votação de MVP da Pelada</Text>
        <Text style={styles.helperText}>
          {canVote
            ? 'Votação aberta para todos os participantes! Escolha o melhor jogador em campo:'
            : 'Apenas participantes confirmados desta pelada podem registrar voto no MVP.'}
        </Text>

        {eligibleForVoting.length === 0 ? (
          <Text style={[styles.emptyText, { marginTop: spacing.sm }]}>
            Nenhum jogador elegível para votação.
          </Text>
        ) : (
          eligibleForVoting.map((player) => {
            const isMyMvpVote = pelada.myPlayer?.votedMvpForId === player.id;
            const isMyGkVote = pelada.myPlayer?.votedGoalkeeperForId === player.id;
            return (
              <View key={player.id} style={styles.voteRow}>
                <View style={{ flex: 1, minWidth: 140 }}>
                  <Text style={styles.playerName} numberOfLines={1}>
                    {player.displayName} {player.isGoalkeeper ? '🧤' : ''}
                  </Text>
                  <Text style={styles.statsLabel}>
                    ⚽ {player.goals} gols • 👟 {player.assists} assist. • 🏆 {player.wins} vit.
                  </Text>
                </View>

                {canVote && (
                  <View style={styles.voteActions}>
                    <TouchableOpacity
                      style={[styles.voteBtn, isMyMvpVote && styles.voteBtnActive]}
                      disabled={actionLoading}
                      hitSlop={HIT_SLOP}
                      accessibilityRole="button"
                      accessibilityLabel={`Votar em ${player.displayName} como MVP`}
                      accessibilityState={{ selected: isMyMvpVote }}
                      onPress={() =>
                        runAction(
                          () => voteMvp(pelada.id, player.id),
                          `Voto de MVP registrado em ${player.displayName}!`
                        )
                      }
                    >
                      <Text
                        style={[
                          styles.voteBtnText,
                          isMyMvpVote && { color: colors.textInverse },
                        ]}
                      >
                        {isMyMvpVote ? '★ MVP' : 'Votar MVP'}
                      </Text>
                    </TouchableOpacity>

                    {player.isGoalkeeper && (
                      <TouchableOpacity
                        style={[
                          styles.voteBtn,
                          { borderColor: colors.info },
                          isMyGkVote && { backgroundColor: colors.info },
                        ]}
                        disabled={actionLoading}
                        hitSlop={HIT_SLOP}
                        accessibilityRole="button"
                        accessibilityLabel={`Votar em ${player.displayName} como Goleiro Paredão`}
                        accessibilityState={{ selected: isMyGkVote }}
                        onPress={() =>
                          runAction(
                            () => voteGoalkeeper(pelada.id, player.id),
                            `Voto de Paredão registrado em ${player.displayName}!`
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.voteBtnText,
                            { color: colors.info },
                            isMyGkVote && { color: colors.textInverse },
                          ]}
                        >
                          {isMyGkVote ? '🧤 Paredão' : '🧤'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </View>
    </>
  );

  const statsAndManageColumn = (
    <>
      {/* 3. Match History & Pelada Statistics */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>📊 Estatísticas da Pelada</Text>

        {pelada.matches.length > 0 && (
          <View style={styles.matchesSummaryBox}>
            <Text style={styles.subLabel}>Placares registrados:</Text>
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

        <Text style={[styles.subLabel, { marginTop: pelada.matches.length > 0 ? spacing.md : 0 }]}>
          Desempenho dos atletas:
        </Text>
        {sortedStats.length === 0 ? (
          <Text style={styles.emptyText}>Nenhuma estatística registrada.</Text>
        ) : (
          sortedStats.map((player, idx) => (
            <View key={player.id} style={styles.statLineRow}>
              <Text style={styles.statRankNum}>{idx + 1}º</Text>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.playerName} numberOfLines={1}>
                  {player.displayName}
                  {player.attendanceStatus === 'NO_SHOW' ? ' (Não foi)' : ''}
                </Text>
                <Text style={styles.statsLabel}>
                  ⚽ {player.goals} gols • 👟 {player.assists} assist. • 🏆 {player.wins} vit.
                </Text>
              </View>
            </View>
          ))
        )}

        <TouchableOpacity
          style={styles.whatsappShareBtn}
          onPress={handleSharePostGameWhatsApp}
          accessibilityRole="button"
          accessibilityLabel="Compartilhar resenha pós-jogo e MVP no WhatsApp"
        >
          <Text style={styles.whatsappShareBtnText}>
            📲 Compartilhar Resenha e MVP no WhatsApp
          </Text>
        </TouchableOpacity>
      </View>

      {/* 4. Organizer Only: Who Did Not Attend */}
      {canManage && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>📋 Quem Não Foi (Faltas)</Text>
          <Text style={styles.helperText}>
            Marque apenas quem confirmou vaga e não compareceu à pelada:
          </Text>

          {allConfirmed.length === 0 ? (
            <Text style={[styles.emptyText, { marginTop: spacing.sm }]}>
              Nenhum jogador confirmado nesta lista.
            </Text>
          ) : (
            allConfirmed.map((player) => {
              const isNoShow = player.attendanceStatus === 'NO_SHOW';
              return (
                <View key={player.id} style={styles.absenceRow}>
                  <View style={{ flex: 1, minWidth: 140 }}>
                    <Text style={styles.playerName} numberOfLines={1}>
                      {player.displayName}
                    </Text>
                    <Text
                      style={[
                        styles.absenceSub,
                        { color: isNoShow ? colors.error : colors.success },
                      ]}
                    >
                      {isNoShow ? 'Marcado como falta ❌' : 'Compareceu ✅'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.absenceBtn, isNoShow && styles.absenceBtnActive]}
                    disabled={actionLoading}
                    hitSlop={HIT_SLOP}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isNoShow
                        ? `Desmarcar falta de ${player.displayName}`
                        : `Marcar que ${player.displayName} não foi`
                    }
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
                      {isNoShow ? 'Desmarcar falta' : 'Marcar falta'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>
      )}

      {/* 5. Weekly Cycle + Reopen Live Pelada (Organizer / Co-org) */}
      {canManage && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🔄 Ciclo Semanal da Pelada</Text>
          <Text style={styles.helperText}>
            Crie a pelada da próxima semana (+7 dias) mantendo o mesmo código #{pelada.inviteCode} e
            os membros do grupo. O histórico e votos de MVP desta partida continuam salvos!
          </Text>
          <TouchableOpacity
            style={styles.nextCycleBtn}
            disabled={actionLoading}
            onPress={handleStartNextCycle}
            accessibilityRole="button"
            accessibilityLabel="Preparar próxima pelada em 7 dias"
          >
            <Text style={styles.nextCycleBtnText}>
              🔄 Preparar Próxima Pelada (+7 dias)
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {canManage && (
        <TouchableOpacity
          style={styles.reopenBtn}
          disabled={actionLoading}
          onPress={handleReopenLive}
          accessibilityRole="button"
          accessibilityLabel="Reabrir pelada ao vivo"
        >
          <Text style={styles.reopenBtnText}>↩️ Reabrir Pelada ao Vivo</Text>
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
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Voltar para detalhes da pelada"
          >
            <Text style={styles.backBtnText}>← Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.topTitle} numberOfLines={1}>
            {pelada.title}
          </Text>
          <View style={styles.finishedPill}>
            <Text style={styles.finishedPillText}>🏁 FINALIZADA</Text>
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
              <View style={styles.desktopLeftCol}>{votingColumn}</View>
              <View style={styles.desktopRightCol}>{statsAndManageColumn}</View>
            </View>
          ) : (
            <>
              {votingColumn}
              {statsAndManageColumn}
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
  sectionTitle: {
    fontSize: fonts.sizes.md,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.sm + 2,
  },
  helperText: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs + 1,
    lineHeight: 18,
    marginBottom: spacing.sm,
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
  rankRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  rankName: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.sm + 1,
    fontWeight: '700',
  },
  rankVotes: {
    color: colors.primary,
    fontSize: fonts.sizes.sm,
    fontWeight: '800',
  },
  voteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm + 4,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.sm,
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
  voteActions: {
    flexDirection: 'row',
    gap: spacing.xs + 2,
    alignItems: 'center',
  },
  voteBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 3,
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
  matchesSummaryBox: {
    marginBottom: spacing.xs,
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
  statLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  statRankNum: {
    width: 28,
    color: colors.primary,
    fontSize: fonts.sizes.sm,
    fontWeight: '800',
  },
  absenceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.sm,
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
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 3,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  absenceBtnActive: {
    borderColor: colors.error,
    backgroundColor: colors.errorSoft,
  },
  absenceBtnText: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs + 1,
    fontWeight: '700',
  },
  reopenBtn: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
    marginBottom: spacing.md,
  },
  reopenBtnText: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.sm,
    fontWeight: '700',
  },
  whatsappShareBtn: {
    marginTop: spacing.md,
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
  nextCycleBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 6,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  nextCycleBtnText: {
    color: colors.textInverse,
    fontSize: fonts.sizes.sm + 1,
    fontWeight: '800',
    textAlign: 'center',
  },
});

