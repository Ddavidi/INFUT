// Manage Members Screen - Configure Mensalista/Avulso, Co-organizers, Guests & Removals
import React, { useState, useCallback } from 'react';
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
  addGuestPlayer,
  getPeladaById,
  removePlayerFromPelada,
  updatePlayerCheckin,
  updatePlayerRole,
} from '../../services/peladaService';
import { Pelada, PeladaPlayer } from '../../types';
import { colors, fonts, spacing, borderRadius, layout, shadows } from '../../constants/theme';
import { showConfirm, showMessage } from '../../utils/alerts';

type Props = NativeStackScreenProps<AppStackParamList, 'ManageMembers'>;

const HIT_SLOP = { top: 4, bottom: 4, left: 4, right: 4 };

export function ManageMembersScreen({ navigation, route }: Props) {
  const { peladaId } = route.params;

  const [pelada, setPelada] = useState<Pelada | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [guestName, setGuestName] = useState('');
  const [guestGoalkeeper, setGuestGoalkeeper] = useState(false);

  const loadPelada = useCallback(async () => {
    try {
      const data = await getPeladaById(peladaId);
      setPelada(data);
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Erro ao carregar membros';
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

  const isOrganizer = pelada?.myRole === 'ORGANIZER';
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

  function handleAddGuest() {
    if (!pelada) return;
    if (guestName.trim().length < 2) {
      showMessage('Nome inválido', 'Digite o nome do convidado');
      return;
    }
    runAction(async () => {
      const updated = await addGuestPlayer(pelada.id, {
        guestName: guestName.trim(),
        isGoalkeeper: guestGoalkeeper,
      });
      setGuestName('');
      setGuestGoalkeeper(false);
      return updated;
    });
  }

  function handleRemoveMember(player: PeladaPlayer) {
    if (!pelada) return;
    showConfirm(
      'Remover do Grupo',
      `Deseja remover "${player.displayName}" desta pelada?`,
      () => runAction(() => removePlayerFromPelada(pelada.id, player.id), `${player.displayName} removido(a).`),
      'Remover'
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <View style={styles.stateCard}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateText}>Carregando membros da pelada…</Text>
        </View>
      </View>
    );
  }

  if (!pelada || !canManage) {
    return (
      <View style={styles.centered}>
        <View style={styles.stateCard}>
          <Text style={{ fontSize: 38 }}>🔒</Text>
          <Text style={styles.stateTitle}>Acesso Restrito</Text>
          <Text style={styles.stateText}>
            Apenas o organizador e os co-organizadores podem configurar os membros desta pelada.
          </Text>
          <TouchableOpacity
            style={styles.backPillBtn}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Voltar para detalhes da pelada"
          >
            <Text style={styles.backBtnText}>← Voltar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const confirmedGoalkeepers = pelada.players.filter(
    (p) => p.status === 'CONFIRMED' && p.isGoalkeeper
  );
  const confirmedLine = pelada.players.filter(
    (p) => p.status === 'CONFIRMED' && !p.isGoalkeeper
  );
  const waitlist = pelada.players.filter((p) => p.status === 'WAITLIST');
  const declined = pelada.players.filter((p) => p.status === 'DECLINED');

  function renderMemberCard(player: PeladaPlayer, index: number) {
    const initial = (player.displayName || 'J').charAt(0).toUpperCase();
    const isMensalista = player.memberType === 'MENSALISTA';
    const roleLabel =
      player.role === 'ORGANIZER'
        ? 'Organizador'
        : player.role === 'CO_ORGANIZER'
        ? 'Co-organizador'
        : player.guestName
        ? 'Convidado'
        : 'Jogador';

    return (
      <View key={player.id} style={styles.memberRow}>
        <View style={styles.memberInfoRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.memberName} numberOfLines={1}>
              {index + 1}. {player.displayName}
            </Text>
            <Text style={styles.memberMeta}>
              {player.isGoalkeeper ? '🧤 Goleiro' : player.position || 'Jogador de linha'} • {roleLabel}
            </Text>
          </View>
        </View>

        <View style={styles.actionsWrap}>
          <TouchableOpacity
            style={[
              styles.actionChip,
              isMensalista ? styles.mensalistaChip : styles.avulsoChip,
            ]}
            disabled={actionLoading}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={`Alternar ${player.displayName} entre Mensalista e Avulso`}
            onPress={() =>
              runAction(() =>
                updatePlayerCheckin(pelada!.id, player.id, {
                  memberType: isMensalista ? 'DIARISTA' : 'MENSALISTA',
                })
              )
            }
          >
            <Text
              style={[
                styles.actionChipText,
                { color: isMensalista ? colors.info : colors.textSecondary },
              ]}
            >
              {isMensalista ? '★ Mensalista' : 'Avulso'}
            </Text>
          </TouchableOpacity>

          {isOrganizer && player.userId && player.role !== 'ORGANIZER' && (
            <TouchableOpacity
              style={[
                styles.actionChip,
                styles.coOrgChip,
                player.role === 'CO_ORGANIZER' && styles.coOrgChipActive,
              ]}
              disabled={actionLoading}
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel={
                player.role === 'CO_ORGANIZER'
                  ? `Remover cargo de co-organizador de ${player.displayName}`
                  : `Promover ${player.displayName} a co-organizador`
              }
              onPress={() =>
                runAction(() =>
                  updatePlayerRole(
                    pelada!.id,
                    player.id,
                    player.role === 'CO_ORGANIZER' ? 'PLAYER' : 'CO_ORGANIZER'
                  )
                )
              }
            >
              <Text
                style={[
                  styles.actionChipText,
                  { color: player.role === 'CO_ORGANIZER' ? colors.primary : colors.textSecondary },
                ]}
              >
                {player.role === 'CO_ORGANIZER' ? 'Co-org ✓' : '+ Co-org'}
              </Text>
            </TouchableOpacity>
          )}

          {player.role !== 'ORGANIZER' && (
            <TouchableOpacity
              style={[styles.actionChip, styles.removeChip]}
              disabled={actionLoading}
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel={`Remover ${player.displayName} do grupo`}
              onPress={() => handleRemoveMember(player)}
            >
              <Text style={[styles.actionChipText, { color: colors.error }]}>Remover</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Voltar aos detalhes da pelada"
        >
          <Text style={styles.backBtnText}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>
          Configurar Membros
        </Text>
        <View style={styles.codePill}>
          <Text style={styles.codePillText}>#{pelada.inviteCode}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
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
        <View style={styles.pageContainer}>
          <View style={styles.infoBanner}>
            <Text style={styles.infoBannerTitle}>Gestão do Grupo — {pelada.title}</Text>
            <Text style={styles.infoBannerText}>
              Defina quem é <Text style={styles.boldAccent}>Mensalista</Text> ou{' '}
              <Text style={styles.boldAccent}>Avulso</Text>, gerencie{' '}
              <Text style={styles.boldAccent}>Co-organizadores</Text>, adicione convidados ou remova
              participantes.
            </Text>
          </View>

          {/* Add Guest Card */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Adicionar Convidado Avulso</Text>
            <View style={styles.guestForm}>
              <TextInput
                style={styles.guestInput}
                placeholder="Nome do amigo (ex: Carlos)"
                placeholderTextColor={colors.textMuted}
                value={guestName}
                onChangeText={setGuestName}
                accessibilityLabel="Nome do convidado avulso"
              />
              <TouchableOpacity
                style={[styles.gkToggle, guestGoalkeeper && styles.gkToggleActive]}
                onPress={() => setGuestGoalkeeper((v) => !v)}
                accessibilityRole="button"
                accessibilityLabel="Marcar convidado como goleiro"
                accessibilityState={{ selected: guestGoalkeeper }}
              >
                <Text
                  style={[
                    styles.gkToggleText,
                    guestGoalkeeper && { color: colors.primary },
                  ]}
                >
                  🧤 Gol
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addGuestBtn}
                onPress={handleAddGuest}
                disabled={actionLoading}
                accessibilityRole="button"
                accessibilityLabel="Adicionar convidado"
              >
                <Text style={styles.addGuestBtnText}>+ Add</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Goalkeepers */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitleNoMargin}>🧤 Goleiros Confirmados</Text>
              <View style={styles.countTag}>
                <Text style={styles.countTagText}>{confirmedGoalkeepers.length}</Text>
              </View>
            </View>
            {confirmedGoalkeepers.length === 0 ? (
              <Text style={styles.emptyText}>Nenhum goleiro confirmado.</Text>
            ) : (
              confirmedGoalkeepers.map((p, i) => renderMemberCard(p, i))
            )}
          </View>

          {/* Line Players */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitleNoMargin}>⚽ Jogadores de Linha</Text>
              <View style={styles.countTag}>
                <Text style={styles.countTagText}>
                  {confirmedLine.length}
                  {pelada.maxPlayers ? `/${pelada.maxPlayers}` : ''}
                </Text>
              </View>
            </View>
            {confirmedLine.length === 0 ? (
              <Text style={styles.emptyText}>Nenhum jogador de linha confirmado.</Text>
            ) : (
              confirmedLine.map((p, i) => renderMemberCard(p, i))
            )}
          </View>

          {/* Waitlist */}
          {waitlist.length > 0 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitleNoMargin, { color: colors.warning }]}>
                  ⏳ Lista de Espera
                </Text>
                <View style={[styles.countTag, { backgroundColor: colors.warningSoft }]}>
                  <Text style={[styles.countTagText, { color: colors.warning }]}>
                    {waitlist.length}
                  </Text>
                </View>
              </View>
              {waitlist.map((p, i) => renderMemberCard(p, i))}
            </View>
          )}

          {/* Declined */}
          {declined.length > 0 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitleNoMargin, { color: colors.textMuted }]}>
                  Não vão
                </Text>
                <View style={styles.countTag}>
                  <Text style={styles.countTagText}>{declined.length}</Text>
                </View>
              </View>
              {declined.map((p, i) => renderMemberCard(p, i))}
            </View>
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
  stateTitle: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.lg,
    fontWeight: '800',
  },
  stateText: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.sm,
    textAlign: 'center',
    lineHeight: 20,
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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    color: colors.textPrimary,
    fontSize: fonts.sizes.md,
    fontWeight: '800',
    textAlign: 'center',
  },
  codePill: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  codePillText: {
    color: colors.primary,
    fontSize: fonts.sizes.xs,
    fontWeight: '800',
    letterSpacing: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  pageContainer: {
    width: '100%',
    maxWidth: layout.maxWidth,
    alignSelf: 'center',
  },
  infoBanner: {
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoBannerTitle: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.md,
    fontWeight: '800',
    marginBottom: 4,
  },
  infoBannerText: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.sm,
    lineHeight: 20,
  },
  boldAccent: {
    color: colors.textPrimary,
    fontWeight: '700',
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm + 4,
  },
  sectionTitle: {
    fontSize: fonts.sizes.md,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.sm + 4,
  },
  sectionTitleNoMargin: {
    fontSize: fonts.sizes.md,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  countTag: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  countTagText: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.xs,
    fontWeight: '800',
  },
  guestForm: {
    flexDirection: 'row',
    gap: spacing.xs + 4,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  guestInput: {
    flex: 1,
    minWidth: 170,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm + 2,
    color: colors.textPrimary,
    fontSize: fonts.sizes.md,
    minHeight: 46,
  },
  gkToggle: {
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceLight,
    minHeight: 46,
    justifyContent: 'center',
  },
  gkToggleActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  gkToggleText: { color: colors.textSecondary, fontSize: fonts.sizes.sm, fontWeight: '700' },
  addGuestBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    minHeight: 46,
    justifyContent: 'center',
  },
  addGuestBtnText: { color: colors.textInverse, fontWeight: '800', fontSize: fonts.sizes.sm },
  emptyText: {
    color: colors.textMuted,
    fontSize: fonts.sizes.sm,
    fontStyle: 'italic',
  },
  memberRow: {
    paddingVertical: spacing.sm + 4,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    gap: spacing.sm + 2,
  },
  memberInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.primary,
    fontSize: fonts.sizes.sm,
    fontWeight: '800',
  },
  memberName: { color: colors.textPrimary, fontSize: fonts.sizes.sm + 1, fontWeight: '700' },
  memberMeta: { color: colors.textMuted, fontSize: fonts.sizes.xs, marginTop: 2 },
  actionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
  },
  actionChip: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.xs + 3,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mensalistaChip: {
    borderColor: colors.info,
    backgroundColor: colors.infoSoft,
  },
  avulsoChip: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceLight,
  },
  coOrgChip: {
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceLight,
  },
  coOrgChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  removeChip: {
    borderColor: colors.error,
    backgroundColor: colors.errorSoft,
  },
  actionChipText: {
    fontSize: fonts.sizes.xs + 1,
    fontWeight: '700',
  },
});

