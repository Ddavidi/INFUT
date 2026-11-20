// Feed Screen — Night Pitch Redesign with Vector Icons, Occupancy Bar & Smooth Motion
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { listPeladas, joinPeladaByCode } from '../../services/peladaService';
import { Pelada } from '../../types';
import { colors, fonts, spacing, borderRadius, shadows } from '../../constants/theme';
import { showMessage } from '../../utils/alerts';
import { formatPeladaSchedule } from '../../utils/dateTime';
import { clearInviteCodeFromUrl, getInviteCodeFromUrl } from '../../utils/inviteLink';
import { useResponsive } from '../../hooks/useResponsive';
import { FadeInView, ScalePressable, PulseDot } from '../../components/ui/Motion';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

function getSportIconName(sport: string): keyof typeof Ionicons.glyphMap {
  const s = sport.toLowerCase();
  if (s.includes('fut') || s.includes('soc')) return 'football-outline';
  if (s.includes('basq')) return 'basketball-outline';
  if (s.includes('tênis') || s.includes('tenis') || s.includes('beach')) return 'tennisball-outline';
  if (s.includes('vôlei') || s.includes('volei')) return 'baseball-outline';
  return 'trophy-outline';
}

function getStatusBadge(pelada: Pelada): { label: string; color: string; bg: string } {
  if (pelada.myRole === 'ORGANIZER') {
    return { label: 'Organizador', color: colors.primary, bg: colors.primarySoft };
  }
  if (pelada.myRole === 'CO_ORGANIZER') {
    return { label: 'Co-org', color: colors.info, bg: colors.infoSoft };
  }
  if (pelada.myStatus === 'CONFIRMED') {
    return { label: 'Confirmado', color: colors.success, bg: colors.successSoft };
  }
  if (pelada.myStatus === 'WAITLIST') {
    return { label: 'Espera', color: colors.warning, bg: colors.warningSoft };
  }
  if (pelada.myStatus === 'DECLINED') {
    return { label: 'Baixa', color: colors.error, bg: colors.errorSoft };
  }
  return { label: 'Membro', color: colors.textSecondary, bg: colors.surfaceLight };
}

function PeladaCard({
  pelada,
  index,
  onPress,
  isGrid,
}: {
  pelada: Pelada;
  index: number;
  onPress: () => void;
  isGrid?: boolean;
}) {
  const badge = getStatusBadge(pelada);
  const isLive = pelada.status === 'IN_PROGRESS';
  const spotsLabel = pelada.maxPlayers
    ? `${pelada.confirmedFieldCount}/${pelada.maxPlayers} linha`
    : `${pelada.confirmedCount} confirmados`;

  const occupancyPct =
    pelada.maxPlayers && pelada.maxPlayers > 0
      ? Math.min(100, Math.round((pelada.confirmedFieldCount / pelada.maxPlayers) * 100))
      : null;

  const barColor =
    occupancyPct !== null && occupancyPct >= 100
      ? colors.warning
      : colors.primary;

  return (
    <FadeInView
      delay={Math.min(index * 45, 220)}
      style={[styles.cardMotionWrap, isGrid && styles.cardGrid]}
    >
      <ScalePressable
        style={[styles.card, isLive && styles.cardLive]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Abrir pelada ${pelada.title}`}
      >
        {/* Top Identity Row */}
        <View style={styles.cardHeader}>
          <View style={[styles.sportIconBox, isLive && styles.sportIconBoxLive]}>
            <Ionicons
              name={getSportIconName(pelada.sport)}
              size={20}
              color={isLive ? colors.error : colors.primary}
            />
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {pelada.title}
            </Text>
            <View style={styles.subBadgeRow}>
              <Text style={styles.cardSport}>{pelada.sport}</Text>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.codeTagText}>#{pelada.inviteCode}</Text>
              {pelada.recurrenceDays && pelada.recurrenceDays.includes(',') ? (
                <View style={styles.recurringBadge}>
                  <Text style={styles.recurringText}>2x/sem</Text>
                </View>
              ) : pelada.isRecurring ? (
                <View style={styles.recurringBadge}>
                  <Text style={styles.recurringText}>Semanal</Text>
                </View>
              ) : null}
              {Boolean(pelada.pastEditionsCount && pelada.pastEditionsCount > 0) && (
                <View style={styles.historyBadge}>
                  <Text style={styles.historyBadgeText}>
                    {pelada.pastEditionsCount} anteriores
                  </Text>
                </View>
              )}
            </View>
          </View>

          {isLive ? (
            <View style={styles.liveBadge}>
              <PulseDot color={colors.error} size={7} />
              <Text style={styles.liveBadgeText}>AO VIVO</Text>
            </View>
          ) : (
            <View style={[styles.roleBadge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.roleBadgeText, { color: badge.color }]}>{badge.label}</Text>
            </View>
          )}
        </View>

        {/* Clean Metadata Rows (No Nested Box) */}
        <View style={styles.metaSection}>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={15} color={colors.textMuted} />
            <Text style={styles.cardInfo}>
              {formatPeladaSchedule(pelada.dateTime, pelada.durationHours, false)}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={15} color={colors.textMuted} />
            <Text style={styles.cardInfo} numberOfLines={1}>
              {pelada.location}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="people-outline" size={15} color={colors.textMuted} />
            <Text style={styles.cardInfo}>
              <Text style={styles.spotsStrong}>{spotsLabel}</Text>
              {pelada.confirmedGoalkeepersCount > 0
                ? `  •  ${pelada.confirmedGoalkeepersCount} gol.`
                : ''}
              {pelada.waitlistCount > 0 ? `  •  ${pelada.waitlistCount} espera` : ''}
            </Text>
          </View>

          {occupancyPct !== null && (
            <View style={styles.occupancyTrack}>
              <View
                style={[
                  styles.occupancyFill,
                  { width: `${occupancyPct}%`, backgroundColor: barColor },
                ]}
              />
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <Text style={styles.organizerText} numberOfLines={1}>
            Org. {pelada.organizer.name}
          </Text>
          <View style={styles.footerRight}>
            <View style={styles.pricePill}>
              <Text style={styles.priceText}>
                {pelada.price != null && pelada.price > 0
                  ? `R$ ${pelada.price.toFixed(2)}`
                  : 'Gratuita'}
              </Text>
            </View>
            <View style={styles.openLinkRow}>
              <Text style={styles.openLink}>Abrir</Text>
              <Ionicons name="arrow-forward" size={14} color={colors.primary} />
            </View>
          </View>
        </View>
      </ScalePressable>
    </FadeInView>
  );
}

export function FeedScreen({ navigation }: Props) {
  const { isDesktop, numColumns, containerMaxWidth, pagePadding, topSpace } = useResponsive();
  const [peladas, setPeladas] = useState<Pelada[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isStandalonePwa, setIsStandalonePwa] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const standalone =
      window.matchMedia?.('(display-mode: standalone)')?.matches ||
      Boolean((window.navigator as any).standalone);
    setIsStandalonePwa(standalone);

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  async function handleInstallApp() {
    if (installPrompt) {
      try {
        installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        if (choice?.outcome === 'accepted') {
          setInstallPrompt(null);
          setIsStandalonePwa(true);
        }
        return;
      } catch {
        // Fallback to manual instructions below
      }
    }
    showMessage(
      'Instalar INFUT no Celular',
      'No iPhone (Safari): toque em Compartilhar e depois em "Adicionar à Tela de Início".\n\nNo Android (Chrome): toque no menu (⋮) no canto superior e escolha "Instalar aplicativo".'
    );
  }

  const loadPeladas = useCallback(async () => {
    try {
      const data = await listPeladas();
      setPeladas(data);
    } catch (error) {
      console.error('Error loading peladas:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPeladas();
    }, [loadPeladas])
  );

  useEffect(() => {
    const codeFromUrl = getInviteCodeFromUrl();
    if (!codeFromUrl) return;
    clearInviteCodeFromUrl();
    setJoining(true);
    joinPeladaByCode(codeFromUrl)
      .then(async (pelada) => {
        await loadPeladas();
        navigation.navigate('PeladaDetails', { peladaId: pelada.id });
      })
      .catch((error: any) => {
        const msg = error.response?.data?.error || 'Não foi possível entrar pelo link de convite';
        showMessage('Convite', msg);
      })
      .finally(() => setJoining(false));
  }, [loadPeladas, navigation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPeladas();
  }, [loadPeladas]);

  async function handleJoinByCode() {
    const code = inviteCode.trim().toUpperCase();
    if (code.length < 3) {
      showMessage('Código inválido', 'Digite o código de convite da pelada (ex: QUINTA)');
      return;
    }

    setJoining(true);
    try {
      const pelada = await joinPeladaByCode(code);
      setInviteCode('');
      await loadPeladas();
      navigation.navigate('PeladaDetails', { peladaId: pelada.id });
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Não foi possível entrar com este código';
      showMessage('Erro', msg);
    } finally {
      setJoining(false);
    }
  }

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
        <View style={[isDesktop && styles.desktopHeaderRow]}>
          <View style={[styles.headerTopRow, isDesktop && { flex: 1, marginBottom: 0 }]}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.brandRow}>
                <View style={styles.brandMark}>
                  <Ionicons name="football" size={16} color={colors.textInverse} />
                </View>
                <Text style={styles.headerTitle}>INFUT</Text>
              </View>
              <Text style={styles.headerSubtitle}>Minhas peladas e próximas partidas</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 }}>
              {Platform.OS === 'web' && !isStandalonePwa && (
                <TouchableOpacity
                  style={styles.installAppPill}
                  onPress={handleInstallApp}
                  accessibilityRole="button"
                  accessibilityLabel="Instalar aplicativo INFUT na tela inicial"
                >
                  <Ionicons name="download-outline" size={14} color={colors.primary} />
                  <Text style={styles.installAppPillText}>Instalar</Text>
                </TouchableOpacity>
              )}
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>{peladas.length} jogos</Text>
              </View>
            </View>
          </View>

          <View style={[styles.joinBar, isDesktop && { width: 390 }]}>
            <Ionicons name="ticket-outline" size={18} color={colors.textMuted} style={{ marginLeft: 12 }} />
            <TextInput
              style={styles.joinInput}
              placeholder="Entrar com código (ex: QUINTA)"
              placeholderTextColor={colors.textMuted}
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={handleJoinByCode}
              accessibilityLabel="Código de convite da pelada"
            />
            <ScalePressable
              style={[styles.joinButton, joining && { opacity: 0.6 }]}
              onPress={handleJoinByCode}
              disabled={joining}
              accessibilityRole="button"
              accessibilityLabel="Entrar com código de convite"
            >
              {joining ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <Text style={styles.joinButtonText}>Entrar</Text>
              )}
            </ScalePressable>
          </View>
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
            <Text style={styles.loadingText}>Carregando suas peladas…</Text>
          </View>
        </View>
      ) : (
        <FlatList
          key={`feed-${numColumns}`}
          data={peladas}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? styles.gridRow : undefined}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <PeladaCard
              pelada={item}
              index={index}
              isGrid={numColumns > 1}
              onPress={() => navigation.navigate('PeladaDetails', { peladaId: item.id })}
            />
          )}
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
          ListEmptyComponent={
            <FadeInView style={styles.emptyCard}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="football-outline" size={28} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>Nenhuma pelada por aqui ainda</Text>
              <Text style={styles.emptySubtitle}>
                Crie sua primeira pelada, descubra jogos públicos na sua região ou digite um código de convite acima.
              </Text>
              <View style={styles.emptyActionsRow}>
                <ScalePressable
                  style={styles.emptyPrimaryBtn}
                  onPress={() => navigation.navigate('Nova Pelada')}
                  accessibilityRole="button"
                  accessibilityLabel="Criar Nova Pelada"
                >
                  <Ionicons name="add" size={18} color={colors.textInverse} />
                  <Text style={styles.emptyPrimaryBtnText}>Criar Pelada</Text>
                </ScalePressable>
                <ScalePressable
                  style={styles.emptySecondaryBtn}
                  onPress={() => navigation.navigate('Explorar')}
                  accessibilityRole="button"
                  accessibilityLabel="Explorar Peladas Públicas"
                >
                  <Ionicons name="compass-outline" size={16} color={colors.textPrimary} />
                  <Text style={styles.emptySecondaryBtnText}>Explorar</Text>
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
    paddingBottom: spacing.md,
  },
  desktopHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  brandMark: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fonts.sizes.xxl,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.6,
  },
  headerSubtitle: {
    fontSize: fonts.sizes.sm,
    color: colors.textMuted,
    marginTop: 4,
  },
  installAppPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    minHeight: 34,
  },
  installAppPillText: {
    color: colors.primary,
    fontSize: fonts.sizes.xs,
    fontWeight: '700',
  },
  countPill: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  countPillText: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  joinBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md + 2,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: 5,
    gap: spacing.xs,
  },
  joinInput: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: fonts.sizes.sm,
    fontWeight: '600',
    letterSpacing: 0.4,
    minHeight: 42,
  },
  joinButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md - 2,
    paddingHorizontal: spacing.md + 4,
    minHeight: 42,
    justifyContent: 'center',
    alignItems: 'center',
  },
  joinButtonText: {
    color: colors.textInverse,
    fontWeight: '800',
    fontSize: fonts.sizes.sm,
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
    paddingTop: spacing.xs,
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
  cardLive: {
    borderColor: 'rgba(244, 63, 94, 0.42)',
  },
  cardHeader: {
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
  sportIconBoxLive: {
    backgroundColor: colors.errorSoft,
    borderColor: 'rgba(244, 63, 94, 0.35)',
  },
  cardHeaderText: { flex: 1, minWidth: 0 },
  cardTitle: {
    fontSize: fonts.sizes.md + 1,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.25,
  },
  subBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginTop: 5,
  },
  cardSport: {
    fontSize: fonts.sizes.xs,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  metaDot: {
    fontSize: fonts.sizes.xs,
    color: colors.textMuted,
  },
  codeTagText: {
    fontSize: fonts.sizes.xs,
    color: colors.textMuted,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  recurringBadge: {
    backgroundColor: colors.infoSoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  recurringText: {
    fontSize: 11,
    color: colors.info,
    fontWeight: '700',
  },
  historyBadge: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  historyBadgeText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.errorSoft,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.35)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  liveBadgeText: {
    color: colors.error,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  roleBadge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    flexShrink: 0,
  },
  roleBadgeText: { fontSize: 11, fontWeight: '800' },
  metaSection: {
    paddingTop: spacing.sm + 4,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  cardInfo: {
    flex: 1,
    fontSize: fonts.sizes.sm,
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
  spotsStrong: {
    color: colors.textPrimary,
    fontWeight: '700',
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
  organizerText: {
    color: colors.textMuted,
    fontSize: fonts.sizes.xs,
    flex: 1,
    fontWeight: '600',
  },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 },
  pricePill: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  priceText: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.xs,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  openLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  openLink: {
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: borderRadius.md,
    paddingVertical: 13,
    paddingHorizontal: spacing.lg,
    minHeight: 46,
  },
  emptySecondaryBtnText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: fonts.sizes.sm,
  },
});
