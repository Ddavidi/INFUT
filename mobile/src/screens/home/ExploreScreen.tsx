// Explore Screen — Night Pitch Redesign with Vector Icons, Occupancy Bar & Smooth Motion
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { explorePeladas } from '../../services/peladaService';
import { Pelada } from '../../types';
import { colors, fonts, spacing, borderRadius, shadows } from '../../constants/theme';
import { formatPeladaSchedule } from '../../utils/dateTime';
import { useResponsive } from '../../hooks/useResponsive';
import { FadeInView, ScalePressable } from '../../components/ui/Motion';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

const SPORT_FILTERS = ['Todos', 'Futebol', 'Futsal', 'Vôlei', 'Basquete', 'Beach Tennis'];

function getSportIconName(sport: string): keyof typeof Ionicons.glyphMap {
  const s = sport.toLowerCase();
  if (s.includes('fut') || s.includes('soc')) return 'football-outline';
  if (s.includes('basq')) return 'basketball-outline';
  if (s.includes('tênis') || s.includes('tenis') || s.includes('beach')) return 'tennisball-outline';
  if (s.includes('vôlei') || s.includes('volei')) return 'baseball-outline';
  return 'trophy-outline';
}

export function ExploreScreen({ navigation }: Props) {
  const { isDesktop, numColumns, containerMaxWidth, pagePadding, topSpace } = useResponsive();
  const [peladas, setPeladas] = useState<Pelada[]>([]);
  const [selectedSport, setSelectedSport] = useState('Todos');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPublicPeladas = useCallback(async () => {
    try {
      const data = await explorePeladas({
        sport: selectedSport === 'Todos' ? undefined : selectedSport,
        search: search.trim() || undefined,
      });
      setPeladas(data);
    } catch (error) {
      console.error('Error exploring peladas:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedSport, search]);

  useFocusEffect(
    useCallback(() => {
      loadPublicPeladas();
    }, [loadPublicPeladas])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadPublicPeladas();
  };

  const hasActiveFilter = selectedSport !== 'Todos' || search.trim() !== '';

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
        <Text style={styles.headerTitle}>Explorar</Text>
        <Text style={styles.headerSubtitle}>Encontre peladas públicas abertas na sua região</Text>

        <View style={styles.searchCard}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} style={{ marginLeft: 12 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nome, quadra ou bairro…"
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            onSubmitEditing={loadPublicPeladas}
            accessibilityLabel="Buscar peladas por nome, quadra ou região"
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearch('')}
              style={styles.clearSearchBtn}
              accessibilityRole="button"
              accessibilityLabel="Limpar busca"
            >
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterWrapGrid}>
          {SPORT_FILTERS.map((sport) => {
            const active = selectedSport === sport;
            return (
              <ScalePressable
                key={sport}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setSelectedSport(sport)}
                accessibilityRole="button"
                accessibilityLabel={`Filtrar por ${sport}`}
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {sport}
                </Text>
              </ScalePressable>
            );
          })}
        </View>
      </View>

      {loading && peladas.length === 0 ? (
        <View
          style={[
            styles.loadingContainer,
            { maxWidth: containerMaxWidth, paddingHorizontal: pagePadding },
          ]}
        >
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Buscando peladas públicas na região…</Text>
          </View>
        </View>
      ) : (
        <FlatList
          key={`explore-${numColumns}`}
          data={peladas}
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          renderItem={({ item, index }) => {
            const vagasLabel = item.maxPlayers
              ? `${item.confirmedFieldCount}/${item.maxPlayers} vagas`
              : `${item.confirmedCount} confirmados`;
            const occupancyPct =
              item.maxPlayers && item.maxPlayers > 0
                ? Math.min(100, Math.round((item.confirmedFieldCount / item.maxPlayers) * 100))
                : null;

            return (
              <FadeInView
                delay={Math.min(index * 45, 220)}
                style={[styles.cardMotionWrap, numColumns > 1 && styles.cardGrid]}
              >
                <ScalePressable
                  style={styles.card}
                  onPress={() => navigation.navigate('PeladaDetails', { peladaId: item.id })}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver detalhes de ${item.title}`}
                >
                  <View style={styles.cardTop}>
                    <View style={styles.sportIconBox}>
                      <Ionicons
                        name={getSportIconName(item.sport)}
                        size={20}
                        color={colors.primary}
                      />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <View style={styles.subMetaRow}>
                        <Text style={styles.cardSport}>{item.sport}</Text>
                        <Text style={styles.metaDot}>•</Text>
                        <Text style={styles.codeText}>#{item.inviteCode}</Text>
                        {item.recurrenceDays && item.recurrenceDays.includes(',') ? (
                          <View style={styles.recurringBadge}>
                            <Text style={styles.recurringText}>2x/sem</Text>
                          </View>
                        ) : item.isRecurring ? (
                          <View style={styles.recurringBadge}>
                            <Text style={styles.recurringText}>Semanal</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <View style={styles.spotsBadge}>
                      <Text style={styles.spotsText}>{vagasLabel}</Text>
                    </View>
                  </View>

                  <View style={styles.metaSection}>
                    <View style={styles.metaRow}>
                      <Ionicons name="calendar-outline" size={15} color={colors.textMuted} />
                      <Text style={styles.cardInfo}>
                        {formatPeladaSchedule(item.dateTime, item.durationHours, false)}
                      </Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Ionicons name="location-outline" size={15} color={colors.textMuted} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardInfo} numberOfLines={1}>
                          {item.location}
                        </Text>
                        {item.locationAddress ? (
                          <Text style={styles.cardSubInfo} numberOfLines={1}>
                            {item.locationAddress}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    {occupancyPct !== null && (
                      <View style={styles.occupancyTrack}>
                        <View
                          style={[
                            styles.occupancyFill,
                            {
                              width: `${occupancyPct}%`,
                              backgroundColor:
                                occupancyPct >= 100 ? colors.warning : colors.primary,
                            },
                          ]}
                        />
                      </View>
                    )}
                  </View>

                  <View style={styles.cardFooter}>
                    <View style={styles.pricePill}>
                      <Text style={styles.priceText}>
                        {item.price && item.price > 0 ? `R$ ${item.price.toFixed(2)}` : 'Gratuita'}
                      </Text>
                    </View>
                    <View style={styles.actionHintRow}>
                      <Text style={styles.actionHint}>Ver detalhes</Text>
                      <Ionicons name="arrow-forward" size={14} color={colors.primary} />
                    </View>
                  </View>
                </ScalePressable>
              </FadeInView>
            );
          }}
          ListEmptyComponent={
            <FadeInView style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="compass-outline" size={28} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>Nenhuma pelada encontrada</Text>
              <Text style={styles.emptySubtitle}>
                {hasActiveFilter
                  ? 'Nenhum jogo público corresponde aos filtros aplicados no momento.'
                  : 'Ainda não há peladas públicas disponíveis na região. Que tal criar a primeira?'}
              </Text>
              <View style={styles.emptyActionsRow}>
                {hasActiveFilter && (
                  <ScalePressable
                    style={styles.emptySecondaryBtn}
                    onPress={() => {
                      setSelectedSport('Todos');
                      setSearch('');
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Limpar Filtros"
                  >
                    <Text style={styles.emptySecondaryBtnText}>Limpar Filtros</Text>
                  </ScalePressable>
                )}
                <ScalePressable
                  style={styles.emptyPrimaryBtn}
                  onPress={() => navigation.navigate('Nova Pelada')}
                  accessibilityRole="button"
                  accessibilityLabel="Criar Pelada"
                >
                  <Ionicons name="add" size={18} color={colors.textInverse} />
                  <Text style={styles.emptyPrimaryBtnText}>Criar Pelada</Text>
                </ScalePressable>
              </View>
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
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md + 2,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    marginBottom: spacing.md,
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: fonts.sizes.sm,
  },
  clearSearchBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filterWrapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.md,
    minHeight: 36,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs + 1,
    fontWeight: '700',
  },
  filterTextActive: {
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
    marginBottom: spacing.md,
  },
  cardGrid: {
    flex: 1,
    maxWidth: '49%',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md + 2,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    gap: spacing.sm + 4,
  },
  sportIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: fonts.sizes.md + 1,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.25,
  },
  subMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 5,
  },
  cardSport: { fontSize: fonts.sizes.xs, color: colors.textSecondary, fontWeight: '600' },
  metaDot: { fontSize: fonts.sizes.xs, color: colors.textMuted },
  codeText: { fontSize: fonts.sizes.xs, color: colors.textMuted, fontWeight: '700' },
  recurringBadge: {
    backgroundColor: colors.infoSoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  recurringText: { fontSize: 11, color: colors.info, fontWeight: '700' },
  spotsBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    flexShrink: 0,
  },
  spotsText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  metaSection: {
    paddingTop: spacing.sm + 4,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  cardInfo: {
    flex: 1,
    fontSize: fonts.sizes.sm,
    lineHeight: 20,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  cardSubInfo: {
    fontSize: fonts.sizes.xs,
    lineHeight: 17,
    color: colors.textMuted,
    marginTop: 1,
  },
  occupancyTrack: {
    height: 4,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginTop: 4,
  },
  occupancyFill: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm + 4,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.sm,
  },
  pricePill: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  priceText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: fonts.sizes.xs,
    fontVariant: ['tabular-nums'],
  },
  actionHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionHint: {
    color: colors.primary,
    fontSize: fonts.sizes.xs + 1,
    fontWeight: '800',
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
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.lg,
    fontWeight: '800',
    marginBottom: spacing.xs + 2,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.sm,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 380,
    marginBottom: spacing.lg,
  },
  emptyActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm + 2,
    width: '100%',
  },
  emptyPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
    minHeight: 46,
    ...shadows.primaryGlow,
  },
  emptyPrimaryBtnText: {
    color: colors.textInverse,
    fontWeight: '800',
    fontSize: fonts.sizes.sm,
  },
  emptySecondaryBtn: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: borderRadius.md,
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
    minHeight: 46,
    justifyContent: 'center',
  },
  emptySecondaryBtnText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: fonts.sizes.sm,
  },
});
