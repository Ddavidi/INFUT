// Feed Screen - Pelada listing and quick join by invite code
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
import { listPeladas, joinPeladaByCode } from '../../services/peladaService';
import { Pelada } from '../../types';
import { colors, fonts, spacing, borderRadius, shadows } from '../../constants/theme';
import { showMessage } from '../../utils/alerts';
import { formatPeladaSchedule } from '../../utils/dateTime';
import { clearInviteCodeFromUrl, getInviteCodeFromUrl } from '../../utils/inviteLink';
import { useResponsive } from '../../hooks/useResponsive';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

function getStatusBadge(pelada: Pelada): { label: string; color: string; bg: string } {
  if (pelada.myRole === 'ORGANIZER') {
    return { label: 'Organizador', color: colors.primary, bg: colors.primarySoft };
  }
  if (pelada.myRole === 'CO_ORGANIZER') {
    return { label: 'Co-organizador', color: colors.info, bg: colors.infoSoft };
  }
  if (pelada.myStatus === 'CONFIRMED') {
    return { label: 'Confirmado', color: colors.success, bg: colors.successSoft };
  }
  if (pelada.myStatus === 'WAITLIST') {
    return { label: 'Lista de Espera', color: colors.warning, bg: colors.warningSoft };
  }
  if (pelada.myStatus === 'DECLINED') {
    return { label: 'Baixa', color: colors.error, bg: colors.errorSoft };
  }
  return { label: 'Membro', color: colors.textSecondary, bg: colors.surfaceLight };
}

function PeladaCard({
  pelada,
  onPress,
  isGrid,
}: {
  pelada: Pelada;
  onPress: () => void;
  isGrid?: boolean;
}) {
  const sportMonograms: Record<string, string> = {
    Futebol: 'FUT',
    Futsal: 'SAL',
    'Vôlei': 'VOL',
    Volei: 'VOL',
    Basquete: 'BAS',
    Handebol: 'HAN',
    'Beach Tennis': 'BCH',
    'Tênis de Mesa': 'TEN',
  };
  const monogram = sportMonograms[pelada.sport] || 'JOG';
  const badge = getStatusBadge(pelada);
  const spotsLabel = pelada.maxPlayers
    ? `${pelada.confirmedFieldCount}/${pelada.maxPlayers} linha`
    : `${pelada.confirmedCount} confirmados`;

  return (
    <TouchableOpacity
      style={[styles.card, isGrid && styles.cardGrid]}
      activeOpacity={0.8}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Abrir pelada ${pelada.title}`}
    >
      {/* Zona 1: Identidade */}
      <View style={styles.cardHeader}>
        <View style={styles.sportSquircle}>
          <Text style={styles.cardMonogram}>{monogram}</Text>
        </View>
        <View style={styles.cardHeaderText}>
          <View style={styles.titleRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {pelada.title}
            </Text>
          </View>
          <View style={styles.subBadgeRow}>
            <Text style={styles.cardSport}>{pelada.sport}</Text>
            <View style={styles.codeTag}>
              <Text style={styles.codeTagText}>#{pelada.inviteCode}</Text>
            </View>
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
        <View style={[styles.roleBadge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.roleBadgeText, { color: badge.color }]}>{badge.label}</Text>
        </View>
      </View>

      {/* Zona 2: Informacoes Internas */}
      <View style={styles.cardInfoBlock}>
        <View style={styles.cardRow}>
          <Text style={styles.cardKey}>DATA</Text>
          <Text style={styles.cardInfo}>
            {formatPeladaSchedule(pelada.dateTime, pelada.durationHours, false)}
          </Text>
        </View>
        <View style={styles.cardRow}>
          <Text style={styles.cardKey}>LOCAL</Text>
          <Text style={styles.cardInfo} numberOfLines={1}>
            {pelada.location}
          </Text>
        </View>
        <View style={styles.cardRow}>
          <Text style={styles.cardKey}>VAGAS</Text>
          <Text style={styles.cardInfo}>
            {spotsLabel}
            {pelada.confirmedGoalkeepersCount > 0
              ? ` • ${pelada.confirmedGoalkeepersCount} gol.`
              : ''}
            {pelada.waitlistCount > 0 ? ` • ${pelada.waitlistCount} espera` : ''}
          </Text>
        </View>
      </View>

      {/* Zona 3: Rodape */}
      <View style={styles.cardFooter}>
        <Text style={styles.organizerText} numberOfLines={1}>
          Por {pelada.organizer.name}
        </Text>
        <View style={styles.footerRight}>
          <View style={styles.pricePill}>
            <Text style={styles.priceText}>
              {pelada.price != null && pelada.price > 0
                ? `R$ ${pelada.price.toFixed(2)}`
                : 'Gratuita'}
            </Text>
          </View>
          <Text style={styles.openLink}>Abrir →</Text>
        </View>
      </View>
    </TouchableOpacity>
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
      'No iPhone (Safari): toque em Compartilhar (↑) e depois em "Adicionar à Tela de Início".\n\nNo Android (Chrome): toque no menu (⋮) no canto superior e escolha "Instalar aplicativo".'
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
              <Text style={styles.headerTitle}>INFUT</Text>
              <Text style={styles.headerSubtitle}>Minhas peladas e convites</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              {Platform.OS === 'web' && !isStandalonePwa && (
                <TouchableOpacity
                  style={styles.installAppPill}
                  onPress={handleInstallApp}
                  accessibilityRole="button"
                  accessibilityLabel="Instalar aplicativo INFUT na tela inicial"
                >
                  <Text style={styles.installAppPillText}>Instalar App</Text>
                </TouchableOpacity>
              )}
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>{peladas.length} jogos</Text>
              </View>
            </View>
          </View>

          <View style={[styles.joinCard, isDesktop && { width: 380 }]}>
            <Text style={styles.joinLabel}>ENTRAR COM CÓDIGO DE CONVITE</Text>
            <View style={styles.joinBox}>
              <TextInput
                style={styles.joinInput}
                placeholder="Código (ex: QUINTA)"
                placeholderTextColor={colors.textMuted}
                value={inviteCode}
                onChangeText={setInviteCode}
                autoCapitalize="characters"
                autoCorrect={false}
                accessibilityLabel="Código de convite da pelada"
              />
              <TouchableOpacity
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
              </TouchableOpacity>
            </View>
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
          renderItem={({ item }) => (
            <PeladaCard
              pelada={item}
              isGrid={numColumns > 1}
              onPress={() => navigation.navigate('PeladaDetails', { peladaId: item.id })}
            />
          )}
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
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Nenhuma pelada ainda</Text>
              <Text style={styles.emptySubtitle}>
                Crie sua primeira pelada, explore jogos públicos na sua região ou digite um código de convite acima.
              </Text>
              <View style={styles.emptyActionsRow}>
                <TouchableOpacity
                  style={styles.emptyPrimaryBtn}
                  onPress={() => navigation.navigate('Nova Pelada')}
                  accessibilityRole="button"
                  accessibilityLabel="Criar Nova Pelada"
                >
                  <Text style={styles.emptyPrimaryBtnText}>+ Criar Nova Pelada</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.emptySecondaryBtn}
                  onPress={() => navigation.navigate('Explorar')}
                  accessibilityRole="button"
                  accessibilityLabel="Explorar Peladas Públicas"
                >
                  <Text style={styles.emptySecondaryBtnText}>Explorar Públicas</Text>
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
  desktopHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.lg,
  },
  headerTopRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  headerTitle: {
    fontSize: fonts.sizes.xxxl,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 3,
  },
  headerSubtitle: {
    fontSize: fonts.sizes.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  countPill: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  countPillText: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  installAppPill: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
  },
  installAppPillText: {
    color: colors.primary,
    fontSize: fonts.sizes.xs,
    fontWeight: '800',
  },
  joinCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  joinLabel: {
    color: colors.textMuted,
    fontSize: fonts.sizes.xs,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: spacing.xs + 2,
  },
  joinBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  joinInput: {
    flex: 1,
    minWidth: 140,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    color: colors.textPrimary,
    fontSize: fonts.sizes.md,
    fontWeight: '700',
  },
  joinButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md + 4,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 84,
    minHeight: 46,
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm + 4,
    gap: spacing.sm + 4,
  },
  sportSquircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMonogram: { fontSize: 11, fontWeight: '900', color: colors.primary, letterSpacing: 0.6 },
  cardEmoji: { fontSize: 22 },
  cardHeaderText: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: {
    fontSize: fonts.sizes.lg,
    fontWeight: '800',
    color: colors.textPrimary,
    flex: 1,
  },
  subBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  cardSport: { fontSize: fonts.sizes.xs, color: colors.textSecondary, fontWeight: '600' },
  codeTag: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  codeTagText: { fontSize: fonts.sizes.xs, color: colors.textSecondary, fontWeight: '800' },
  recurringBadge: {
    backgroundColor: colors.infoSoft,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recurringText: { fontSize: fonts.sizes.xs, color: colors.info, fontWeight: '700' },
  historyBadge: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  historyBadgeText: { fontSize: fonts.sizes.xs, color: colors.textSecondary, fontWeight: '700' },
  roleBadge: {
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    flexShrink: 0,
  },
  roleBadgeText: { fontSize: fonts.sizes.xs, fontWeight: '800' },
  cardInfoBlock: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm + 4,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.sm + 4,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cardKey: { fontSize: 10, fontWeight: '800', color: colors.textMuted, width: 42, letterSpacing: 0.4 },
  cardIcon: { fontSize: 14, marginRight: spacing.sm, width: 20 },
  cardInfo: {
    fontSize: fonts.sizes.sm,
    lineHeight: 20,
    color: colors.textSecondary,
    flex: 1,
    minWidth: 0,
    fontVariant: ['tabular-nums'],
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  organizerText: {
    fontSize: fonts.sizes.xs,
    color: colors.textMuted,
    fontWeight: '600',
    flex: 1,
    minWidth: 0,
  },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 0 },
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
  openLink: {
    fontSize: fonts.sizes.xs,
    fontWeight: '800',
    color: colors.primary,
  },
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
  emptyTitle: { fontSize: fonts.sizes.xl, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  emptySubtitle: {
    fontSize: fonts.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
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
