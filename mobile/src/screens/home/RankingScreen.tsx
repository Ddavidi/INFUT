// Ranking Screen — Night Pitch Redesign with Championship Gold Podium & Vector Icons
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getRanking } from '../../services/userService';
import { RankingPlayer } from '../../types';
import { colors, fonts, spacing, borderRadius, shadows } from '../../constants/theme';
import { useResponsive } from '../../hooks/useResponsive';
import { FadeInView, ScalePressable } from '../../components/ui/Motion';

type RankingCategory = 'goals' | 'wins' | 'assists' | 'mvp';

const CATEGORIES: {
  key: RankingCategory;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'goals', label: 'Artilharia', icon: 'football-outline' },
  { key: 'wins', label: 'Vitórias', icon: 'flame-outline' },
  { key: 'assists', label: 'Assist.', icon: 'git-compare-outline' },
  { key: 'mvp', label: 'MVP', icon: 'trophy-outline' },
];

export function RankingScreen() {
  const { isDesktop, numColumns, containerMaxWidth, pagePadding, topSpace } = useResponsive();
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
      <View
        style={[
          styles.headerWrapper,
          {
            maxWidth: containerMaxWidth,
            paddingHorizontal: pagePadding,
            paddingTop: topSpace,
          },
        ]}
      >
        <Text style={styles.headerTitle}>Ranking INFUT</Text>
        <Text style={styles.headerSubtitle}>Destaques da temporada e assiduidade em quadra</Text>

        <View style={styles.categoryRow}>
          {CATEGORIES.map((c) => {
            const active = category === c.key;
            return (
              <ScalePressable
                key={c.key}
                style={[styles.categoryChip, active && styles.categoryChipActive]}
                onPress={() => setCategory(c.key)}
                accessibilityRole="tab"
                accessibilityLabel={c.label}
                accessibilityState={{ selected: active }}
              >
                <Ionicons
                  name={c.icon}
                  size={15}
                  color={active ? colors.textInverse : colors.textSecondary}
                />
                <Text style={[styles.categoryText, active && styles.categoryTextActive]}>
                  {c.label}
                </Text>
              </ScalePressable>
            );
          })}
        </View>
      </View>

      {loading && players.length === 0 ? (
        <View
          style={[
            styles.loadingContainer,
            { maxWidth: containerMaxWidth, paddingHorizontal: pagePadding },
          ]}
        >
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Calculando estatísticas e ranking…</Text>
          </View>
        </View>
      ) : (
        <FlatList
          key={`ranking-${numColumns}`}
          data={sortedPlayers}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? styles.gridRow : undefined}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.list,
            {
              maxWidth: containerMaxWidth,
              paddingHorizontal: pagePadding,
              paddingBottom: isDesktop ? spacing.xxl : 104,
            },
          ]}
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
            const rankNum = String(index + 1).padStart(2, '0');
            const isLeader = index === 0;
            const isSecond = index === 1;
            const isThird = index === 2;
            const isTop3 = index < 3;
            const initial = (item.name || 'J').charAt(0).toUpperCase();

            const medalColor = isLeader
              ? colors.gold
              : isSecond
                ? '#CBD5E1'
                : isThird
                  ? '#D97706'
                  : colors.textMuted;

            return (
              <FadeInView
                delay={Math.min(index * 40, 220)}
                style={[styles.cardMotionWrap, numColumns > 1 && styles.cardGrid]}
              >
                <View
                  style={[
                    styles.card,
                    isLeader && styles.cardLeader,
                  ]}
                >
                  <View
                    style={[
                      styles.rankBadge,
                      isLeader && styles.rankBadgeLeader,
                      isTop3 && !isLeader && { borderColor: medalColor },
                    ]}
                  >
                    {isLeader ? (
                      <Ionicons name="trophy" size={16} color={colors.gold} />
                    ) : (
                      <Text
                        style={[
                          styles.rankBadgeText,
                          isTop3 && { color: medalColor },
                        ]}
                      >
                        {rankNum}
                      </Text>
                    )}
                  </View>

                  <View style={[styles.avatar, isLeader && styles.avatarLeader]}>
                    <Text style={[styles.avatarText, isLeader && { color: colors.gold }]}>
                      {initial}
                    </Text>
                  </View>

                  <View style={styles.info}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.subInfo} numberOfLines={1}>
                      {item.position || 'Linha'} • {item.totalGames} jogos • {item.attendanceRate}% pres.
                    </Text>
                  </View>

                  <View style={styles.metricCol}>
                    <Text
                      style={[
                        styles.metricValue,
                        isLeader && { color: colors.gold },
                      ]}
                    >
                      {getMetricValue(item)}
                    </Text>
                    <Text style={styles.metricLabel}>{getMetricLabel()}</Text>
                  </View>
                </View>
              </FadeInView>
            );
          }}
          ListEmptyComponent={
            <FadeInView style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="trophy-outline" size={28} color={colors.gold} />
              </View>
              <Text style={styles.emptyTitle}>Ranking ainda vazio</Text>
              <Text style={styles.emptySubtitle}>
                Finalize uma pelada e registre gols, vitórias e votos de MVP para inaugurar o ranking geral.
              </Text>
            </FadeInView>
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
    alignSelf: 'center',
    paddingBottom: spacing.sm + 4,
  },
  headerTitle: {
    fontSize: fonts.sizes.xxl,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: fonts.sizes.sm,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    minHeight: 38,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryText: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs + 1,
    fontWeight: '700',
  },
  categoryTextActive: {
    color: colors.textInverse,
    fontWeight: '800',
  },
  loadingContainer: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    paddingTop: spacing.xl,
  },
  loadingCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
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
    alignSelf: 'center',
    paddingTop: spacing.sm,
  },
  gridRow: {
    gap: spacing.md,
    alignItems: 'stretch',
  },
  cardMotionWrap: {
    marginBottom: spacing.sm + 2,
  },
  cardGrid: {
    flex: 1,
    maxWidth: '49%',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm + 4,
    ...shadows.card,
  },
  cardLeader: {
    borderColor: colors.goldBorder,
    backgroundColor: '#161B22',
  },
  rankBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankBadgeLeader: {
    backgroundColor: colors.goldSoft,
    borderColor: colors.goldBorder,
  },
  rankBadgeText: {
    color: colors.textMuted,
    fontSize: fonts.sizes.xs + 1,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLeader: {
    backgroundColor: colors.goldSoft,
    borderColor: colors.goldBorder,
  },
  avatarText: {
    color: colors.primary,
    fontSize: fonts.sizes.md,
    fontWeight: '800',
  },
  info: { flex: 1, minWidth: 0 },
  name: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.md,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  subInfo: {
    color: colors.textMuted,
    fontSize: fonts.sizes.xs,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  metricCol: {
    alignItems: 'flex-end',
    minWidth: 58,
  },
  metricValue: {
    color: colors.primary,
    fontSize: fonts.sizes.xl,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.goldSoft,
    borderWidth: 1,
    borderColor: colors.goldBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.lg,
    fontWeight: '800',
    marginBottom: spacing.xs + 2,
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.sm,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 380,
  },
});
