// Ranking Screen - Global leaderboard for Goals, Wins, Assists, and MVP Awards
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getRanking } from '../../services/userService';
import { RankingPlayer } from '../../types';
import { colors, fonts, spacing, borderRadius, layout, shadows } from '../../constants/theme';

type RankingCategory = 'goals' | 'wins' | 'assists' | 'mvp';

const CATEGORIES: { key: RankingCategory; label: string; emoji: string }[] = [
  { key: 'goals', label: 'Artilharia', emoji: '⚽' },
  { key: 'wins', label: 'Vitórias', emoji: '🏆' },
  { key: 'assists', label: 'Assist.', emoji: '👟' },
  { key: 'mvp', label: 'MVP', emoji: '👑' },
];

export function RankingScreen() {
  const [players, setPlayers] = useState<RankingPlayer[]>([]);
  const [category, setCategory] = useState<RankingCategory>('goals');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRanking = useCallback(async () => {
    try {
      const data = await getRanking();
      setPlayers(data);
    } catch (error) {
      console.error('Error loading ranking:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRanking();
    }, [loadRanking])
  );

  const getMetricValue = (p: RankingPlayer) => {
    switch (category) {
      case 'wins':
        return p.totalWins;
      case 'assists':
        return p.totalAssists;
      case 'mvp':
        return p.mvpVotes;
      default:
        return p.totalGoals;
    }
  };

  const getMetricLabel = () => {
    switch (category) {
      case 'wins':
        return 'vitória(s)';
      case 'assists':
        return 'assist.';
      case 'mvp':
        return 'voto(s)';
      default:
        return 'gol(s)';
    }
  };

  const sortedPlayers = [...players].sort((a, b) => {
    const diff = getMetricValue(b) - getMetricValue(a);
    if (diff !== 0) return diff;
    return b.totalGames - a.totalGames;
  });

  return (
    <View style={styles.container}>
      <View style={styles.headerWrapper}>
        <Text style={styles.headerTitle}>Ranking INFUT</Text>
        <Text style={styles.headerSubtitle}>Destaques da temporada e assiduidade</Text>

        <View style={styles.categoryRow}>
          {CATEGORIES.map((c) => {
            const active = category === c.key;
            return (
              <TouchableOpacity
                key={c.key}
                style={[styles.categoryChip, active && styles.categoryChipActive]}
                onPress={() => setCategory(c.key)}
                accessibilityRole="tab"
                accessibilityLabel={c.label}
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.categoryText, active && styles.categoryTextActive]}>
                  {c.emoji} {c.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {loading && players.length === 0 ? (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Calculando estatísticas e ranking…</Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={sortedPlayers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadRanking();
              }}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item, index }) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`;
            const isLeader = index === 0;
            const isTop3 = index < 3;

            return (
              <View style={[styles.card, isLeader && styles.leaderCard]}>
                <View style={[styles.rankBadge, isTop3 && styles.rankBadgeTop]}>
                  <Text style={styles.rankPos}>{medal}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.playerName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.playerMeta} numberOfLines={1}>
                    {item.sport || 'Multi-esportes'}
                    {item.position ? ` • ${item.position}` : ''}
                  </Text>
                  <View style={styles.subMetaRow}>
                    <Text style={styles.gamesCount}>{item.totalGames} jogo(s)</Text>
                    <View style={styles.attendancePill}>
                      <Text style={styles.attendanceText}>
                        Assiduidade {item.attendanceRate}%
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.scoreBox}>
                  <Text style={[styles.scoreValue, isLeader && { color: colors.primaryLight }]}>
                    {getMetricValue(item)}
                  </Text>
                  <Text style={styles.scoreLabel}>{getMetricLabel()}</Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>🏆</Text>
              <Text style={styles.emptyTitle}>Ranking ainda vazio</Text>
              <Text style={styles.emptySubtitle}>
                Participe de peladas, registre gols e assistências na súmula e vote nos destaques para pontuar aqui.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerWrapper: {
    width: '100%',
    maxWidth: layout.maxWidth,
    alignSelf: 'center',
    paddingTop: 52,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerTitle: { fontSize: fonts.sizes.xxl, fontWeight: '900', color: colors.textPrimary },
  headerSubtitle: {
    fontSize: fonts.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: colors.surface,
    padding: 4,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  categoryChip: {
    flex: 1,
    minWidth: 72,
    minHeight: 40,
    borderRadius: borderRadius.sm,
    paddingVertical: 9,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryChipActive: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  categoryText: { color: colors.textSecondary, fontSize: fonts.sizes.xs, fontWeight: '700' },
  categoryTextActive: { color: colors.primary, fontWeight: '800' },
  loadingContainer: {
    flex: 1,
    width: '100%',
    maxWidth: layout.maxWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  loadingCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.sm,
    fontWeight: '600',
  },
  list: {
    width: '100%',
    maxWidth: layout.maxWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: 100,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm + 4,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    ...shadows.card,
  },
  leaderCard: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceElevated,
  },
  rankBadge: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    flexShrink: 0,
  },
  rankBadgeTop: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  rankPos: {
    fontSize: fonts.sizes.lg,
    fontWeight: '900',
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  playerName: { fontSize: fonts.sizes.md, fontWeight: '800', color: colors.textPrimary },
  playerMeta: { fontSize: fonts.sizes.xs, color: colors.textSecondary, marginTop: 2 },
  subMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 6,
  },
  gamesCount: {
    fontSize: fonts.sizes.xs,
    color: colors.textMuted,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  attendancePill: {
    backgroundColor: colors.successSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  attendanceText: {
    fontSize: fonts.sizes.xs,
    color: colors.success,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  scoreBox: {
    alignItems: 'center',
    minWidth: 66,
    backgroundColor: colors.surface,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    flexShrink: 0,
  },
  scoreValue: {
    fontSize: fonts.sizes.xxl,
    fontWeight: '900',
    color: colors.primary,
    fontVariant: ['tabular-nums'],
  },
  scoreLabel: { fontSize: fonts.sizes.xs, color: colors.textMuted, fontWeight: '700' },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.md,
    ...shadows.card,
  },
  emptyEmoji: { fontSize: 52, marginBottom: spacing.md },
  emptyTitle: { fontSize: fonts.sizes.lg, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  emptySubtitle: {
    fontSize: fonts.sizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 21,
  },
});
