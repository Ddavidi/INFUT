// Explore Screen - Discover public peladas by region and sport
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { explorePeladas } from '../../services/peladaService';
import { Pelada } from '../../types';
import { SPORTS } from '../../constants/sports';
import { colors, fonts, spacing, borderRadius, shadows } from '../../constants/theme';
import { formatPeladaSchedule } from '../../utils/dateTime';
import { useResponsive } from '../../hooks/useResponsive';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

const SPORT_FILTERS = ['Todos', ...SPORTS.map((s) => s.sport)];

const SPORT_EMOJIS: Record<string, string> = {
  Futebol: '⚽',
  Futsal: '🏟️',
  'Vôlei': '🏐',
  Volei: '🏐',
  Basquete: '🏀',
  Handebol: '🤾',
  'Beach Tennis': '🎾',
  'Tênis de Mesa': '🏓',
};

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
        sport: selectedSport !== 'Todos' ? selectedSport : undefined,
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
        <Text style={styles.headerSubtitle}>Encontre peladas públicas na sua região</Text>

        <View style={styles.searchCard}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nome, quadra ou bairro/região…"
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            onSubmitEditing={loadPublicPeladas}
            accessibilityLabel="Buscar peladas por nome, quadra ou região"
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
        >
          {SPORT_FILTERS.map((sport) => {
            const active = selectedSport === sport;
            return (
              <TouchableOpacity
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
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
          contentContainerStyle={[
            styles.list,
            {
              maxWidth: containerMaxWidth,
              paddingHorizontal: pagePadding,
              paddingBottom: isDesktop ? spacing.xxl : 100,
            },
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          renderItem={({ item }) => {
            const vagasLabel = item.maxPlayers
              ? `${item.confirmedFieldCount}/${item.maxPlayers} vagas`
              : `${item.confirmedCount} confirmados`;
            const emoji = SPORT_EMOJIS[item.sport] || '🎯';

            return (
              <TouchableOpacity
                style={[styles.card, numColumns > 1 && styles.cardGrid]}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('PeladaDetails', { peladaId: item.id })}
                accessibilityRole="button"
                accessibilityLabel={`Ver detalhes de ${item.title}`}
              >
                <View style={styles.cardTop}>
                  <View style={styles.sportSquircle}>
                    <Text style={styles.sportEmoji}>{emoji}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.cardSport}>
                      {item.sport} • #{item.inviteCode}
                    </Text>
                  </View>
                  <View style={styles.spotsBadge}>
                    <Text style={styles.spotsText}>{vagasLabel}</Text>
                  </View>
                </View>

                <View style={styles.infoBlock}>
                  <Text style={styles.cardInfo}>
                    📅 {formatPeladaSchedule(item.dateTime, item.durationHours, false)}
                  </Text>
                  <Text style={styles.cardInfo} numberOfLines={1}>
                    📍 {item.location}
                  </Text>
                  {item.locationAddress ? (
                    <Text style={styles.cardSubInfo} numberOfLines={1}>
                      {item.locationAddress}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.pricePill}>
                    <Text style={styles.priceText}>
                      {item.price && item.price > 0 ? `R$ ${item.price.toFixed(2)}` : 'Gratuita'}
                    </Text>
                  </View>
                  <Text style={styles.actionHint}>Ver detalhes →</Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>🗺️</Text>
              <Text style={styles.emptyTitle}>Nenhuma pelada encontrada</Text>
              <Text style={styles.emptySubtitle}>
                {hasActiveFilter
                  ? 'Nenhum jogo público corresponde aos filtros aplicados no momento.'
                  : 'Ainda não há peladas públicas disponíveis na região. Que tal criar a primeira?'}
              </Text>
              <View style={styles.emptyActionsRow}>
                {hasActiveFilter && (
                  <TouchableOpacity
                    style={styles.emptySecondaryBtn}
                    onPress={() => {
                      setSelectedSport('Todos');
                      setSearch('');
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Limpar Filtros"
                  >
                    <Text style={styles.emptySecondaryBtnText}>Limpar Filtros</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.emptyPrimaryBtn}
                  onPress={() => navigation.navigate('Nova Pelada')}
                  accessibilityRole="button"
                  accessibilityLabel="Criar Pelada"
                >
                  <Text style={styles.emptyPrimaryBtnText}>+ Criar Pelada</Text>
                </TouchableOpacity>
              </View>
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
    alignSelf: 'center',
    paddingBottom: spacing.sm,
  },
  headerTitle: { fontSize: fonts.sizes.xxl, fontWeight: '900', color: colors.textPrimary },
  headerSubtitle: {
    fontSize: fonts.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
    marginBottom: spacing.md,
  },
  searchCard: {
    marginBottom: spacing.sm + 4,
  },
  searchInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.textPrimary,
    fontSize: fonts.sizes.md,
  },
  filterScroll: { flexGrow: 0, marginBottom: spacing.xs },
  filterChip: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  filterText: { color: colors.textSecondary, fontSize: fonts.sizes.xs, fontWeight: '700' },
  filterTextActive: { color: colors.primary },
  loadingContainer: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
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
    alignSelf: 'center',
    paddingTop: spacing.sm,
  },
  gridRow: {
    gap: spacing.md,
    alignItems: 'stretch',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardGrid: {
    flex: 1,
    maxWidth: '49%',
  },
  cardTop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    marginBottom: spacing.sm + 4,
    gap: spacing.sm + 4,
  },
  sportSquircle: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sportEmoji: { fontSize: 20 },
  cardTitle: { fontSize: fonts.sizes.lg, fontWeight: '800', color: colors.textPrimary },
  cardSport: { fontSize: fonts.sizes.xs, color: colors.primary, fontWeight: '700', marginTop: 2 },
  spotsBadge: {
    backgroundColor: colors.infoSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    flexShrink: 0,
  },
  spotsText: {
    fontSize: fonts.sizes.xs,
    color: colors.info,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  infoBlock: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm + 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: 5,
    marginBottom: spacing.sm + 4,
  },
  cardInfo: {
    fontSize: fonts.sizes.sm,
    lineHeight: 20,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  cardSubInfo: { fontSize: fonts.sizes.xs, lineHeight: 18, color: colors.textMuted, paddingLeft: 20 },
  cardFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pricePill: {
    backgroundColor: colors.successSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  priceText: {
    fontSize: fonts.sizes.xs,
    fontWeight: '800',
    color: colors.success,
    fontVariant: ['tabular-nums'],
  },
  actionHint: { fontSize: fonts.sizes.xs, color: colors.primary, fontWeight: '800' },
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
    marginBottom: spacing.lg,
  },
  emptyActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    width: '100%',
  },
  emptyPrimaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md + 4,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyPrimaryBtnText: {
    color: colors.textInverse,
    fontWeight: '800',
    fontSize: fonts.sizes.sm,
  },
  emptySecondaryBtn: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md + 4,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptySecondaryBtnText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: fonts.sizes.sm,
  },
});
