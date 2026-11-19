// Pelada Details Screen - Clean Presence Hub, Member Navigation, Lifecycle & Finance
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Share,
  Platform,
  Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation';
import { PeladaConfigModal, ConfigModalTab } from '../../components/pelada/PeladaConfigModal';
import {
  deletePelada,
  getPeladaById,
  rsvpPelada,
  updatePeladaStatus,
  updatePlayerPayment,
} from '../../services/peladaService';
import { PaymentStatus, Pelada, PeladaPlayer } from '../../types';
import { colors, fonts, spacing, borderRadius, shadows } from '../../constants/theme';
import { showConfirm, showMessage } from '../../utils/alerts';
import { formatPeladaSchedule } from '../../utils/dateTime';
import { buildInviteUrl, shareOrCopyText } from '../../utils/inviteLink';
import { getPositionsForSport } from '../../constants/sports';
import { useResponsive } from '../../hooks/useResponsive';

type Props = NativeStackScreenProps<AppStackParamList, 'PeladaDetails'>;

type DetailTab = 'attendance' | 'finance';

const HIT_SLOP = { top: 4, bottom: 4, left: 4, right: 4 };

function getPaymentLabel(status: PaymentStatus): { text: string; color: string; bg: string } {
  switch (status) {
    case 'PAID':
      return { text: 'Pago', color: colors.success, bg: colors.successSoft };
    case 'WAITING_CONFIRMATION':
      return { text: 'Em análise', color: colors.warning, bg: colors.warningSoft };
    case 'EXEMPT':
      return { text: 'Isento', color: colors.info, bg: colors.infoSoft };
    default:
      return { text: 'Pendente', color: colors.error, bg: colors.errorSoft };
  }
}

export function PeladaDetailsScreen({ navigation, route }: Props) {
  const { peladaId } = route.params;
  const { isDesktop, containerMaxWidth, pagePadding, topSpace } = useResponsive();

  const [pelada, setPelada] = useState<Pelada | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>('attendance');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configInitialTab, setConfigInitialTab] = useState<ConfigModalTab>('rules');
  const [rsvpPosition, setRsvpPosition] = useState<string>('');
  const [expandGoalkeepers, setExpandGoalkeepers] = useState(true);
  const [expandLineList, setExpandLineList] = useState(true);
  const [showAllLinePlayers, setShowAllLinePlayers] = useState(false);
  const [expandWaitlist, setExpandWaitlist] = useState(false);
  const [expandDeclined, setExpandDeclined] = useState(false);
  const [financeFilter, setFinanceFilter] = useState<'PENDING' | 'PAID' | 'ALL'>('PENDING');
  const [expandFinanceList, setExpandFinanceList] = useState(true);

  const loadPelada = useCallback(async () => {
    try {
      const data = await getPeladaById(peladaId);
      setPelada(data);
      if (data.myPlayer?.position) {
        setRsvpPosition(data.myPlayer.position);
      }
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Erro ao carregar pelada';
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
      const msg = error.response?.data?.error || 'Nao foi possivel concluir a acao';
      showMessage('Erro', msg);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleShareInvite() {
    if (!pelada) return;
    const priceInfo = pelada.price && pelada.price > 0 ? `R$ ${pelada.price.toFixed(2)}` : 'Gratuita';
    const whatsappLine = pelada.whatsappGroupUrl
      ? `\n💬 Grupo WhatsApp: ${pelada.whatsappGroupUrl}`
      : '';
    const inviteUrl = buildInviteUrl(pelada.inviteCode);
    const message =
      `⚽ *${pelada.title}* (${pelada.sport})\n` +
      `📅 ${formatPeladaSchedule(pelada.dateTime, pelada.durationHours)}\n` +
      `📍 ${pelada.location}${pelada.locationAddress ? ` - ${pelada.locationAddress}` : ''}\n` +
      `💰 ${priceInfo}${whatsappLine}\n\n` +
      `🔗 Entre direto pelo link: ${inviteUrl}\n` +
      `Ou digite o código no app INFUT: *${pelada.inviteCode}*`;

    await shareOrCopyText(
      'Convite copiado!',
      message,
      'Texto do convite copiado para colar no WhatsApp.'
    );
  }

  async function handleSharePendingPaymentsWhatsApp() {
    if (!pelada) return;
    const confirmed = pelada.players.filter((p) => p.status === 'CONFIRMED');
    const pendingList = confirmed.filter((p) => p.paymentStatus === 'PENDING');
    const waitingList = confirmed.filter((p) => p.paymentStatus === 'WAITING_CONFIRMATION');

    if (pendingList.length === 0 && waitingList.length === 0) {
      showMessage(
        'Caixa 100% em dia! 🎉',
        'Todos os jogadores confirmados já estão com pagamento quitado ou isento.'
      );
      return;
    }

    const pixLine = pelada.pixKey ? `\n🔑 *Chave Pix:* ${pelada.pixKey}` : '';
    const pendingBlock =
      pendingList.length > 0
        ? `\n\n⏳ *Pendentes de pagamento (${pendingList.length}):*\n` +
          pendingList.map((p) => `• ${p.displayName}`).join('\n')
        : '';
    const waitingBlock =
      waitingList.length > 0
        ? `\n\n🟡 *Em análise pelo organizador (${waitingList.length}):*\n` +
          waitingList.map((p) => `• ${p.displayName}`).join('\n')
        : '';

    const message =
      `💰 *Caixa da Pelada — ${pelada.title}*\n` +
      `📅 ${formatPeladaSchedule(pelada.dateTime, pelada.durationHours)}\n` +
      `💵 *Valor por atleta:* R$ ${(pelada.price || 0).toFixed(2)}` +
      pixLine +
      pendingBlock +
      waitingBlock +
      `\n\n🔗 Avise que pagou no app: ${buildInviteUrl(pelada.inviteCode)}`;

    await shareOrCopyText(
      'Cobrança copiada! 💸',
      message,
      'Lista de cobrança Pix copiada para colar no grupo do WhatsApp!'
    );
  }

  async function handleCopyPix() {
    if (!pelada?.pixKey) return;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(pelada.pixKey);
        showMessage('Pix copiado!', `Chave Pix: ${pelada.pixKey}`);
        return;
      } catch {
        // Fallback
      }
    }
    try {
      await Share.share({ message: pelada.pixKey });
    } catch {
      showMessage('Chave Pix', pelada.pixKey);
    }
  }

  async function handleOpenMaps() {
    if (!pelada) return;
    const query = encodeURIComponent(
      `${pelada.location}${pelada.locationAddress ? ` ${pelada.locationAddress}` : ''}`
    );
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    try {
      await Linking.openURL(url);
    } catch {
      showMessage('Mapa', 'Nao foi possivel abrir o Google Maps neste dispositivo.');
    }
  }

  async function handleOpenWhatsAppGroup() {
    if (!pelada?.whatsappGroupUrl) return;
    let url = pelada.whatsappGroupUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    try {
      await Linking.openURL(url);
    } catch {
      showMessage('WhatsApp', 'Não foi possível abrir o link do grupo do WhatsApp.');
    }
  }

  function handleStartPelada() {
    if (!pelada) return;
    showConfirm(
      'Iniciar Pelada',
      'Ao iniciar, você irá para a tela Ao Vivo com a chamada de presentes e poderá revisar as regras do jogo e do sorteio na engrenagem.',
      async () => {
        setActionLoading(true);
        try {
          const updated = await updatePeladaStatus(pelada.id, 'IN_PROGRESS');
          setPelada(updated);
          navigation.navigate('LivePelada', {
            peladaId: pelada.id,
            openConfigOnStart: true,
          });
        } catch (error: any) {
          showMessage('Erro', error.response?.data?.error || 'Não foi possível iniciar a pelada');
        } finally {
          setActionLoading(false);
        }
      },
      'Iniciar Pelada'
    );
  }

  function handleDeletePelada() {
    if (!pelada) return;
    showConfirm(
      'Cancelar Pelada',
      `Tem certeza que deseja excluir "${pelada.title}"? Essa acao nao pode ser desfeita.`,
      async () => {
        try {
          await deletePelada(pelada.id);
          navigation.goBack();
        } catch (error: any) {
          showMessage('Erro', error.response?.data?.error || 'Erro ao excluir pelada');
        }
      },
      'Excluir'
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <View style={styles.loadingStateCard}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingStateText}>Carregando detalhes da pelada…</Text>
        </View>
      </View>
    );
  }

  if (!pelada) {
    return (
      <View style={styles.centered}>
        <View style={styles.loadingStateCard}>
          <Text style={{ fontSize: 40 }}>⚽</Text>
          <Text style={styles.errorText}>Pelada não encontrada.</Text>
          <TouchableOpacity style={styles.backBtnPill} onPress={() => navigation.goBack()}>
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
  const allConfirmed = pelada.players.filter((p) => p.status === 'CONFIRMED');

  const paymentProgressPct =
    pelada.financialSummary.totalExpected > 0
      ? Math.min(
          100,
          Math.round(
            (pelada.financialSummary.totalPaid / pelada.financialSummary.totalExpected) * 100
          )
        )
      : 100;

  const peladaStatus = pelada.status || 'OPEN';
  const showPaymentStatusOnList = Boolean(pelada.price && pelada.price > 0);
  const effectiveTab: DetailTab = canManage ? activeTab : 'attendance';

  function renderPlayerRow(player: PeladaPlayer, index: number, showPayment = false) {
    return (
      <PlayerRow
        key={player.id}
        index={index + 1}
        player={player}
        showPayment={showPayment}
      />
    );
  }

  const cfg = pelada.gameConfig;
  const rulesSummary = cfg
    ? `${cfg.playersPerTeam} na linha • Partida de ${cfg.matchDurationMinutes} min • ${
        cfg.gameMode === 'FIXED_TEAMS'
          ? `${cfg.fixedTeamsCount} times fixos`
          : '2 times + Fila'
      }`
    : `${pelada.playersPerTeam} na linha`;

  const headerCardContent = (
    <View style={styles.headerCard}>
      <View style={styles.heroTagsRow}>
        <View style={styles.sportTag}>
          <Text style={styles.sportTagText}>{pelada.sport}</Text>
        </View>
        {pelada.isRecurring && (
          <View style={styles.neutralTag}>
            <Text style={styles.neutralTagText}>Semanal</Text>
          </View>
        )}
        <View style={styles.neutralTag}>
          <Text style={styles.neutralTagText}>
            Desist. até {pelada.cancelDeadlineHours}h antes
          </Text>
        </View>
      </View>

      <Text style={styles.title}>{pelada.title}</Text>
      <Text style={styles.organizerLine}>Organizado por {pelada.organizer.name}</Text>

      <View style={styles.heroMetaBox}>
        <View style={styles.metaLineRow}>
          <Text style={styles.metaKey}>DATA</Text>
          <Text style={styles.metaText}>
            {formatPeladaSchedule(pelada.dateTime, pelada.durationHours)}
          </Text>
        </View>
        <View style={styles.metaLineRow}>
          <Text style={styles.metaKey}>LOCAL</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.metaText}>{pelada.location}</Text>
            {pelada.locationAddress ? (
              <Text style={styles.metaSubTextClean}>{pelada.locationAddress}</Text>
            ) : null}
          </View>
        </View>
        <View style={styles.metaLineRow}>
          <Text style={styles.metaKey}>TAXA</Text>
          <Text style={styles.metaText}>
            {pelada.price && pelada.price > 0
              ? `R$ ${pelada.price.toFixed(2)}`
              : 'Gratuita'}
            {pelada.goalkeepersExempt ? ' (Goleiros isentos)' : ''}
          </Text>
        </View>
        <View style={styles.metaLineRow}>
          <Text style={styles.metaKey}>REGRAS</Text>
          <Text style={styles.metaText}>{rulesSummary}</Text>
        </View>
      </View>

      <View style={styles.headerActionRow}>
        <TouchableOpacity
          style={[styles.secondaryActionBtn, styles.headerBtnBase, { flex: 1 }]}
          onPress={handleShareInvite}
          accessibilityRole="button"
          accessibilityLabel="Compartilhar convite no WhatsApp"
        >
          <Text style={styles.secondaryActionText}>Compartilhar Convite</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.mapsBtn}
          onPress={handleOpenMaps}
          accessibilityRole="button"
          accessibilityLabel="Abrir endereço no Google Maps"
        >
          <Text style={styles.mapsBtnText}>Abrir Maps</Text>
        </TouchableOpacity>
      </View>

      {pelada.whatsappGroupUrl ? (
        <TouchableOpacity
          style={styles.whatsappGroupBtn}
          onPress={handleOpenWhatsAppGroup}
          accessibilityRole="button"
          accessibilityLabel="Entrar no grupo do WhatsApp da pelada"
        >
          <Text style={styles.whatsappGroupBtnText}>Grupo do WhatsApp</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  const lifecycleCardContent = (
    <View style={styles.lifecycleCard}>
      <View style={styles.lifecycleHeader}>
        <View style={styles.lifecycleTitleRow}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor:
                  peladaStatus === 'OPEN'
                    ? colors.primary
                    : peladaStatus === 'IN_PROGRESS'
                    ? colors.error
                    : colors.success,
              },
            ]}
          />
          <Text style={styles.lifecycleTitle}>
            {peladaStatus === 'OPEN'
              ? 'Lista de presença aberta'
              : peladaStatus === 'IN_PROGRESS'
              ? 'Pelada em andamento'
              : pelada.votingStatus === 'CLOSED'
              ? 'Finalizada — Resultado publicado'
              : 'Finalizada — Votação de MVP aberta'}
          </Text>
        </View>
        <Text style={styles.lifecycleSubtitle}>
          {peladaStatus === 'OPEN'
            ? canManage
              ? 'Quando a galera chegar em quadra, inicie a pelada para fazer a chamada e sortear os times.'
              : 'Aguarde o organizador iniciar a pelada no horário do jogo.'
            : peladaStatus === 'IN_PROGRESS'
            ? 'Entre na tela ao vivo para acompanhar times, fila de próximos, cronômetro e placar.'
            : pelada.votingStatus === 'CLOSED'
            ? 'Confira os vencedores de MVP, o goleiro destaque e as estatísticas completas.'
            : 'Participe da votação aberta para eleger o MVP e o goleiro destaque da rodada.'}
        </Text>
      </View>

      {peladaStatus === 'OPEN' && canManage && (
        <TouchableOpacity
          style={styles.lifecycleActionBtn}
          disabled={actionLoading}
          onPress={handleStartPelada}
          accessibilityRole="button"
          accessibilityLabel="Iniciar pelada"
        >
          <Text style={styles.lifecycleActionBtnText}>Iniciar Pelada</Text>
        </TouchableOpacity>
      )}

      {peladaStatus === 'IN_PROGRESS' && (
        <TouchableOpacity
          style={[styles.lifecycleActionBtn, { backgroundColor: colors.error }]}
          onPress={() => navigation.navigate('LivePelada', { peladaId: pelada.id })}
          accessibilityRole="button"
          accessibilityLabel="Entrar na pelada ao vivo"
        >
          <Text style={styles.lifecycleActionBtnText}>Entrar na Pelada ao Vivo</Text>
        </TouchableOpacity>
      )}

      {peladaStatus === 'FINISHED' && (
        <TouchableOpacity
          style={styles.lifecycleActionBtn}
          onPress={() => navigation.navigate('PostGame', { peladaId: pelada.id })}
          accessibilityRole="button"
          accessibilityLabel={
            pelada.votingStatus === 'CLOSED'
              ? 'Ver resultado oficial da pelada'
              : 'Votar no MVP da pelada'
          }
        >
          <Text style={styles.lifecycleActionBtnText}>
            {pelada.votingStatus === 'CLOSED'
              ? 'Ver Resultado Oficial e Estatísticas'
              : 'Votar no MVP e Ver Estatísticas'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const tabsBarContent = canManage ? (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tabItem, effectiveTab === 'attendance' && styles.tabItemActive]}
        onPress={() => setActiveTab('attendance')}
        accessibilityRole="tab"
        accessibilityLabel={`Presença (${pelada.confirmedCount})`}
        accessibilityState={{ selected: effectiveTab === 'attendance' }}
      >
        <Text style={[styles.tabText, effectiveTab === 'attendance' && styles.tabTextActive]}>
          Presença ({pelada.confirmedCount})
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tabItem, effectiveTab === 'finance' && styles.tabItemActive]}
        onPress={() => setActiveTab('finance')}
        accessibilityRole="tab"
        accessibilityLabel="Financeiro"
        accessibilityState={{ selected: effectiveTab === 'finance' }}
      >
        <Text style={[styles.tabText, effectiveTab === 'finance' && styles.tabTextActive]}>
          Financeiro (Caixa)
        </Text>
      </TouchableOpacity>
    </View>
  ) : null;

  const pixCardContent =
    pelada.pixKey || (pelada.price && pelada.price > 0) ? (
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitleNoMargin}>Chave Pix</Text>
          {pelada.myPlayer && pelada.myStatus === 'CONFIRMED' && (
            <View
              style={[
                styles.paymentPill,
                { backgroundColor: getPaymentLabel(pelada.myPlayer.paymentStatus).bg },
              ]}
            >
              <Text
                style={[
                  styles.paymentStatusText,
                  { color: getPaymentLabel(pelada.myPlayer.paymentStatus).color },
                ]}
              >
                Você: {getPaymentLabel(pelada.myPlayer.paymentStatus).text}
              </Text>
            </View>
          )}
        </View>

        {pelada.pixKey ? (
          <>
            <Text style={styles.pixKeyText} selectable>
              {pelada.pixKey}
            </Text>
            <View style={[styles.rsvpRow, { marginTop: spacing.sm + 4 }]}>
              <TouchableOpacity
                style={[styles.rsvpBtn, styles.secondaryActionBtn]}
                onPress={handleCopyPix}
              >
                <Text style={styles.secondaryActionText}>Copiar Chave Pix</Text>
              </TouchableOpacity>
              {pelada.myPlayer &&
                pelada.myStatus === 'CONFIRMED' &&
                pelada.myPlayer.paymentStatus === 'PENDING' && (
                  <TouchableOpacity
                    style={[styles.rsvpBtn, { backgroundColor: colors.primary }]}
                    disabled={actionLoading}
                    onPress={() =>
                      runAction(
                        () =>
                          updatePlayerPayment(
                            pelada.id,
                            pelada.myPlayer!.id,
                            'WAITING_CONFIRMATION'
                          ),
                        'Pagamento informado! Aguardando baixa do organizador.'
                      )
                    }
                  >
                    <Text style={styles.rsvpBtnDarkText}>Já Paguei via Pix</Text>
                  </TouchableOpacity>
                )}
            </View>
          </>
        ) : (
          <Text style={styles.emptyListText}>
            Chave Pix ainda não cadastrada pelo organizador.
          </Text>
        )}
      </View>
    ) : null;

  const rsvpCardContent = (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Sua Presença</Text>
      <Text style={styles.myStatusText}>
        Status atual:{' '}
        <Text style={{ color: colors.primary, fontWeight: '800' }}>
          {pelada.myStatus === 'CONFIRMED'
            ? pelada.myPlayer?.isGoalkeeper
              ? 'Confirmado (Goleiro)'
              : 'Confirmado (Linha)'
            : pelada.myStatus === 'WAITLIST'
            ? 'Na Lista de Espera'
            : pelada.myStatus === 'DECLINED'
            ? 'Não vou'
            : 'Ainda não respondeu'}
        </Text>
      </Text>

      {peladaStatus === 'OPEN' ? (
        <>
          <Text style={styles.deadlineNotice}>
            Cancelamento sem falta até {pelada.cancelDeadlineHours}h antes do jogo
          </Text>

          {(() => {
            const linePositions = getPositionsForSport(pelada.sport).filter(
              (pos) => !pos.toLowerCase().includes('goleir')
            );
            if (linePositions.length === 0) return null;
            return (
              <View style={styles.positionPickerBlock}>
                <Text style={styles.positionPickerLabel}>Posição nesta pelada (opcional):</Text>
                <View style={styles.positionWrapGrid}>
                  {linePositions.map((pos) => {
                    const selected = rsvpPosition === pos;
                    return (
                      <TouchableOpacity
                        key={pos}
                        style={[styles.positionChip, selected && styles.positionChipSelected]}
                        disabled={actionLoading}
                        onPress={() => {
                          setRsvpPosition(pos);
                          if (pelada.myStatus === 'CONFIRMED' && !pelada.myPlayer?.isGoalkeeper) {
                            runAction(() =>
                              rsvpPelada(pelada.id, {
                                status: 'CONFIRMED',
                                isGoalkeeper: false,
                                position: pos,
                              })
                            );
                          }
                        }}
                        accessibilityRole="button"
                        accessibilityLabel={`Selecionar posição ${pos}`}
                        accessibilityState={{ selected }}
                      >
                        <Text
                          style={[
                            styles.positionChipText,
                            selected && styles.positionChipTextSelected,
                          ]}
                        >
                          {pos}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })()}

          <View style={styles.rsvpRow}>
            <TouchableOpacity
              style={[styles.rsvpBtn, { backgroundColor: colors.primary }]}
              disabled={actionLoading}
              onPress={() =>
                runAction(() =>
                  rsvpPelada(pelada.id, {
                    status: 'CONFIRMED',
                    isGoalkeeper: false,
                    ...(rsvpPosition ? { position: rsvpPosition } : {}),
                  })
                )
              }
            >
              <Text style={styles.rsvpBtnDarkText}>Confirmar Linha</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.rsvpBtn, styles.secondaryActionBtn]}
              disabled={actionLoading}
              onPress={() =>
                runAction(() =>
                  rsvpPelada(pelada.id, { status: 'CONFIRMED', isGoalkeeper: true })
                )
              }
            >
              <Text style={styles.secondaryActionText}>Sou Goleiro</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.rsvpBtn, styles.declineBtn]}
              disabled={actionLoading}
              onPress={() =>
                runAction(() => rsvpPelada(pelada.id, { status: 'DECLINED' }))
              }
            >
              <Text style={styles.declineBtnText}>Não vou</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <Text style={styles.deadlineNotice}>
          Lista de confirmações fechada pois a pelada já foi{' '}
          {peladaStatus === 'IN_PROGRESS' ? 'iniciada.' : 'finalizada.'}
        </Text>
      )}
    </View>
  );

  const displayedLinePlayers = showAllLinePlayers
    ? confirmedLine
    : confirmedLine.slice(0, 6);

  const rostersContent = (
    <>
      {/* Goalkeepers */}
      <View style={styles.sectionCard}>
        <TouchableOpacity
          style={styles.accordionHeader}
          onPress={() => setExpandGoalkeepers((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel="Expandir ou recolher lista de goleiros"
        >
          <Text style={styles.sectionTitleNoMargin}>Goleiros</Text>
          <View style={styles.accordionRight}>
            <View style={styles.countTag}>
              <Text style={styles.countTagText}>{confirmedGoalkeepers.length}</Text>
            </View>
            <Text style={styles.accordionChevron}>{expandGoalkeepers ? '▴' : '▾'}</Text>
          </View>
        </TouchableOpacity>
        {expandGoalkeepers && (
          confirmedGoalkeepers.length === 0 ? (
            <Text style={[styles.emptyListText, { marginTop: spacing.sm }]}>
              Nenhum goleiro confirmado ainda.
            </Text>
          ) : (
            <View style={{ marginTop: spacing.xs }}>
              {confirmedGoalkeepers.map((player, index) =>
                renderPlayerRow(player, index, showPaymentStatusOnList)
              )}
            </View>
          )
        )}
      </View>

      {/* Confirmed Line Players */}
      <View style={styles.sectionCard}>
        <TouchableOpacity
          style={styles.accordionHeader}
          onPress={() => setExpandLineList((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel="Expandir ou recolher confirmados na linha"
        >
          <Text style={styles.sectionTitleNoMargin}>Confirmados na Linha</Text>
          <View style={styles.accordionRight}>
            <View style={styles.countTag}>
              <Text style={styles.countTagText}>
                {confirmedLine.length}
                {pelada.maxPlayers ? `/${pelada.maxPlayers}` : ''}
              </Text>
            </View>
            <Text style={styles.accordionChevron}>{expandLineList ? '▴' : '▾'}</Text>
          </View>
        </TouchableOpacity>
        {expandLineList && (
          confirmedLine.length === 0 ? (
            <Text style={[styles.emptyListText, { marginTop: spacing.sm }]}>
              Nenhum jogador de linha confirmado.
            </Text>
          ) : (
            <View style={{ marginTop: spacing.xs }}>
              {displayedLinePlayers.map((player, index) =>
                renderPlayerRow(player, index, showPaymentStatusOnList)
              )}
              {confirmedLine.length > 6 && (
                <TouchableOpacity
                  style={styles.expandListBtn}
                  onPress={() => setShowAllLinePlayers((v) => !v)}
                >
                  <Text style={styles.expandListBtnText}>
                    {showAllLinePlayers
                      ? 'Recolher lista ▴'
                      : `Ver todos os ${confirmedLine.length} confirmados ▾`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )
        )}
      </View>

      {/* Waitlist */}
      {waitlist.length > 0 && (
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.accordionHeader}
            onPress={() => setExpandWaitlist((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel="Expandir ou recolher lista de espera"
          >
            <Text style={[styles.sectionTitleNoMargin, { color: colors.warning }]}>
              Lista de Espera (Suplentes)
            </Text>
            <View style={styles.accordionRight}>
              <View style={[styles.countTag, { backgroundColor: colors.warningSoft }]}>
                <Text style={[styles.countTagText, { color: colors.warning }]}>
                  {waitlist.length}
                </Text>
              </View>
              <Text style={styles.accordionChevron}>{expandWaitlist ? '▴' : '▾'}</Text>
            </View>
          </TouchableOpacity>
          {expandWaitlist && (
            <View style={{ marginTop: spacing.xs }}>
              {waitlist.map((player, index) => renderPlayerRow(player, index))}
            </View>
          )}
        </View>
      )}

      {/* Declined */}
      {declined.length > 0 && (
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.accordionHeader}
            onPress={() => setExpandDeclined((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel="Expandir ou recolher jogadores que não vão"
          >
            <Text style={[styles.sectionTitleNoMargin, { color: colors.textMuted }]}>
              Não vão
            </Text>
            <View style={styles.accordionRight}>
              <View style={styles.countTag}>
                <Text style={styles.countTagText}>{declined.length}</Text>
              </View>
              <Text style={styles.accordionChevron}>{expandDeclined ? '▴' : '▾'}</Text>
            </View>
          </TouchableOpacity>
          {expandDeclined && (
            <View style={{ marginTop: spacing.xs }}>
              {declined.map((player, index) => renderPlayerRow(player, index))}
            </View>
          )}
        </View>
      )}
    </>
  );

  return (
    <View style={styles.container}>
      {/* Top Bar */}
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
          accessibilityLabel="Voltar para a lista anterior"
        >
          <Text style={styles.backBtnText}>← Voltar</Text>
        </TouchableOpacity>
        <View style={styles.topBarRight}>
          {canManage && (
            <TouchableOpacity
              style={styles.membersTopBtn}
              onPress={() => navigation.navigate('ManageMembers', { peladaId: pelada.id })}
              accessibilityRole="button"
              accessibilityLabel="Configurar membros da pelada"
            >
              <Text style={styles.membersTopBtnText}>Membros</Text>
            </TouchableOpacity>
          )}
          {canManage && (
            <TouchableOpacity
              style={styles.gearTopBtn}
              onPress={() => {
                setConfigInitialTab('rules');
                setShowConfigModal(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Configurar regras de jogo, sorteio e dados da pelada"
            >
              <Text style={styles.gearTopBtnText}>⚙</Text>
            </TouchableOpacity>
          )}
          <View style={styles.codePill}>
            <Text style={styles.codePillText}>#{pelada.inviteCode}</Text>
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
          {effectiveTab === 'attendance' ? (
            isDesktop ? (
              <View style={styles.desktopColumns}>
                <View style={styles.desktopLeftCol}>
                  {headerCardContent}
                  {lifecycleCardContent}
                  {tabsBarContent}
                  {rsvpCardContent}
                  {pixCardContent}
                </View>
                <View style={styles.desktopRightCol}>
                  {rostersContent}
                </View>
              </View>
            ) : (
              <>
                {headerCardContent}
                {lifecycleCardContent}
                {tabsBarContent}
                {pixCardContent}
                {rsvpCardContent}
                {rostersContent}
              </>
            )
          ) : (
            <>
              {headerCardContent}
              {lifecycleCardContent}
              {tabsBarContent}
            </>
          )}

          {/* TAB 2: FINANCEIRO (EXCLUSIVO PARA ORGANIZADORES) */}
          {canManage && effectiveTab === 'finance' && (
            <View>
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitleNoMargin}>Resumo do Caixa</Text>
                  <Text style={styles.progressPctText}>{paymentProgressPct}% pago</Text>
                </View>

                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${paymentProgressPct}%` }]} />
                </View>

                <View style={styles.financeGrid}>
                  <View style={styles.financeBox}>
                    <Text style={styles.financeLabel}>Arrecadado</Text>
                    <Text style={[styles.financeValue, { color: colors.success }]}>
                      R$ {pelada.financialSummary.totalPaid.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.financeBox}>
                    <Text style={styles.financeLabel}>Previsto</Text>
                    <Text style={styles.financeValue}>
                      R$ {pelada.financialSummary.totalExpected.toFixed(2)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.helperText}>
                  Pagos: {pelada.financialSummary.paidCount} • Em análise:{' '}
                  {pelada.financialSummary.waitingCount} • Pendentes:{' '}
                  {pelada.financialSummary.pendingCount} • Isentos:{' '}
                  {pelada.financialSummary.exemptCount}
                </Text>

                {(pelada.financialSummary.pendingCount > 0 ||
                  pelada.financialSummary.waitingCount > 0) && (
                  <TouchableOpacity
                    style={styles.whatsappGroupBtn}
                    onPress={handleSharePendingPaymentsWhatsApp}
                    accessibilityRole="button"
                    accessibilityLabel="Copiar cobrança dos jogadores pendentes no WhatsApp"
                  >
                    <Text style={styles.whatsappGroupBtnText}>
                      Cobrar Pendentes no WhatsApp ({pelada.financialSummary.pendingCount + pelada.financialSummary.waitingCount})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Pix Card */}
              {pelada.pixKey ? (
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>Chave Pix</Text>
                  <Text style={styles.pixKeyText}>{pelada.pixKey}</Text>
                  <View style={[styles.rsvpRow, { marginTop: spacing.sm + 4 }]}>
                    <TouchableOpacity
                      style={[styles.rsvpBtn, styles.secondaryActionBtn]}
                      onPress={handleCopyPix}
                    >
                      <Text style={styles.secondaryActionText}>Copiar Chave Pix</Text>
                    </TouchableOpacity>
                    {pelada.myPlayer &&
                      pelada.myStatus === 'CONFIRMED' &&
                      pelada.myPlayer.paymentStatus === 'PENDING' && (
                        <TouchableOpacity
                          style={[styles.rsvpBtn, { backgroundColor: colors.primary }]}
                          disabled={actionLoading}
                          onPress={() =>
                            runAction(
                              () =>
                                updatePlayerPayment(
                                  pelada.id,
                                  pelada.myPlayer!.id,
                                  'WAITING_CONFIRMATION'
                                ),
                              'Pagamento informado! Aguardando baixa do organizador.'
                            )
                          }
                        >
                          <Text style={styles.rsvpBtnDarkText}>Já Paguei via Pix</Text>
                        </TouchableOpacity>
                      )}
                  </View>
                </View>
              ) : null}

              {/* Payment List (Filterable & Collapsible) */}
              <View style={styles.sectionCard}>
                <TouchableOpacity
                  style={styles.accordionHeader}
                  onPress={() => setExpandFinanceList((v) => !v)}
                  accessibilityRole="button"
                  accessibilityLabel="Expandir ou recolher lista de pagamentos"
                >
                  <Text style={styles.sectionTitleNoMargin}>
                    Status por Jogador ({allConfirmed.length})
                  </Text>
                  <Text style={styles.accordionChevron}>{expandFinanceList ? '▴' : '▾'}</Text>
                </TouchableOpacity>

                {expandFinanceList && (() => {
                  const filteredFinance = allConfirmed.filter((p) => {
                    if (financeFilter === 'PENDING') {
                      return p.paymentStatus === 'PENDING' || p.paymentStatus === 'WAITING_CONFIRMATION';
                    }
                    if (financeFilter === 'PAID') {
                      return p.paymentStatus === 'PAID' || p.paymentStatus === 'EXEMPT';
                    }
                    return true;
                  });
                  return (
                    <View style={{ marginTop: spacing.sm }}>
                      <View style={styles.filterPillsRow}>
                        {(
                          [
                            { key: 'PENDING', label: `Pendentes (${pelada.financialSummary.pendingCount + pelada.financialSummary.waitingCount})` },
                            { key: 'PAID', label: `Pagos/Isentos (${pelada.financialSummary.paidCount + pelada.financialSummary.exemptCount})` },
                            { key: 'ALL', label: `Todos (${allConfirmed.length})` },
                          ] as { key: 'PENDING' | 'PAID' | 'ALL'; label: string }[]
                        ).map((opt) => {
                          const active = financeFilter === opt.key;
                          return (
                            <TouchableOpacity
                              key={opt.key}
                              style={[styles.filterPillChip, active && styles.filterPillChipActive]}
                              onPress={() => setFinanceFilter(opt.key)}
                            >
                              <Text
                                style={[
                                  styles.filterPillText,
                                  active && styles.filterPillTextActive,
                                ]}
                              >
                                {opt.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {filteredFinance.length === 0 ? (
                        <Text style={styles.emptyListText}>Nenhum jogador neste filtro.</Text>
                      ) : (
                        filteredFinance.map((player) => {
                          const pLabel = getPaymentLabel(player.paymentStatus);
                          return (
                            <View key={player.id} style={styles.financePlayerRow}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.playerName}>
                                  {player.displayName}
                                  {player.isGoalkeeper ? ' (Goleiro)' : ''}
                                </Text>
                                <View style={styles.paymentBadgeWrap}>
                                  <View style={[styles.paymentPill, { backgroundColor: pLabel.bg }]}>
                                    <Text style={[styles.paymentStatusText, { color: pLabel.color }]}>
                                      {pLabel.text}
                                    </Text>
                                  </View>
                                </View>
                              </View>

                              {canManage && (
                                <View style={styles.counterGroup}>
                                  <TouchableOpacity
                                    style={[styles.miniPayBtn, { borderColor: colors.success }]}
                                    hitSlop={HIT_SLOP}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Marcar pagamento de ${player.displayName} como Pago`}
                                    onPress={() =>
                                      runAction(() =>
                                        updatePlayerPayment(pelada.id, player.id, 'PAID')
                                      )
                                    }
                                  >
                                    <Text style={{ color: colors.success, fontSize: fonts.sizes.xs, fontWeight: '700' }}>
                                      Pago
                                    </Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={[styles.miniPayBtn, { borderColor: colors.error }]}
                                    hitSlop={HIT_SLOP}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Marcar pagamento de ${player.displayName} como Pendente`}
                                    onPress={() =>
                                      runAction(() =>
                                        updatePlayerPayment(pelada.id, player.id, 'PENDING')
                                      )
                                    }
                                  >
                                    <Text style={{ color: colors.error, fontSize: fonts.sizes.xs, fontWeight: '700' }}>
                                      Pend.
                                    </Text>
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    style={[styles.miniPayBtn, { borderColor: colors.info }]}
                                    hitSlop={HIT_SLOP}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Marcar ${player.displayName} como Isento`}
                                    onPress={() =>
                                      runAction(() =>
                                        updatePlayerPayment(pelada.id, player.id, 'EXEMPT')
                                      )
                                    }
                                  >
                                    <Text style={{ color: colors.info, fontSize: fonts.sizes.xs, fontWeight: '700' }}>
                                      Isento
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              )}
                            </View>
                          );
                        })
                      )}
                    </View>
                  );
                })()}
              </View>
            </View>
          )}

          {/* Organizer Delete Pelada */}
          {isOrganizer && (
            <TouchableOpacity style={styles.deletePeladaBtn} onPress={handleDeletePelada}>
              <Text style={styles.deletePeladaText}>Cancelar / Excluir Pelada</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {canManage && (
        <PeladaConfigModal
          visible={showConfigModal}
          pelada={pelada}
          initialTab={configInitialTab}
          onClose={() => setShowConfigModal(false)}
          onSaved={(updated) => setPelada(updated)}
        />
      )}
    </View>
  );
}

function PlayerRow({
  index,
  player,
  showPayment = false,
}: {
  index: number;
  player: PeladaPlayer;
  showPayment?: boolean;
}) {
  const roleTag =
    player.role === 'ORGANIZER'
      ? 'Organizador'
      : player.role === 'CO_ORGANIZER'
      ? 'Co-organizador'
      : player.guestName
      ? 'Convidado'
      : null;

  const initial = (player.displayName || 'J').charAt(0).toUpperCase();
  const paymentBadge = showPayment ? getPaymentLabel(player.paymentStatus) : null;

  return (
    <View style={styles.playerRow}>
      <View style={styles.playerLeft}>
        <View style={styles.playerAvatar}>
          <Text style={styles.playerAvatarText}>{initial}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.playerName} numberOfLines={1}>
            {index}. {player.displayName}
          </Text>
          <Text style={styles.playerMeta}>
            {player.isGoalkeeper ? 'Goleiro' : player.position || 'Jogador de linha'}
            {roleTag ? ` • ${roleTag}` : ''}
            {` • ${player.memberType === 'MENSALISTA' ? 'Mensalista' : 'Avulso'}`}
          </Text>
        </View>
        {paymentBadge ? (
          <View style={[styles.paymentPill, { backgroundColor: paymentBadge.bg, flexShrink: 0 }]}>
            <Text style={[styles.paymentStatusText, { color: paymentBadge.color }]}>
              {paymentBadge.text}
            </Text>
          </View>
        ) : null}
      </View>
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
  loadingStateCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    width: '100%',
    maxWidth: 360,
  },
  loadingStateText: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorText: { color: colors.textSecondary, fontSize: fonts.sizes.md, textAlign: 'center' },
  backBtnPill: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  topBar: {
    width: '100%',
    alignSelf: 'center',
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.xs,
  },
  backBtn: { minHeight: 44, justifyContent: 'center', paddingRight: spacing.md },
  backBtnText: { color: colors.primary, fontSize: fonts.sizes.md, fontWeight: '800' },
  topBarRight: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
  gearTopBtn: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: borderRadius.md,
    width: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gearTopBtnText: { color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  membersTopBtn: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm + 4,
    minHeight: 44,
    justifyContent: 'center',
  },
  membersTopBtnText: { color: colors.textPrimary, fontSize: fonts.sizes.xs, fontWeight: '700' },
  codePill: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  codePillText: { color: colors.primary, fontWeight: '900', fontSize: fonts.sizes.xs },
  scrollContent: { paddingVertical: spacing.md, paddingBottom: 80 },
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
    flex: 1.2,
    minWidth: 0,
  },
  headerCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.md + 4,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md + 2,
    ...shadows.card,
  },
  heroTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.sm,
  },
  sportTag: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  sportTagText: {
    color: colors.primary,
    fontSize: fonts.sizes.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  infoTag: {
    backgroundColor: colors.infoSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  infoTagText: { color: colors.info, fontSize: fonts.sizes.xs, fontWeight: '700' },
  neutralTag: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  neutralTagText: { color: colors.textSecondary, fontSize: fonts.sizes.xs, fontWeight: '600' },
  title: { fontSize: fonts.sizes.xxl, fontWeight: '900', color: colors.textPrimary },
  organizerLine: {
    fontSize: fonts.sizes.xs,
    color: colors.textSecondary,
    marginTop: 3,
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  heroMetaBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm + 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.xs + 4,
  },
  metaLineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  metaKey: {
    width: 58,
    fontSize: fonts.sizes.xs,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.4,
    paddingTop: 2,
  },
  metaText: {
    flex: 1,
    fontSize: fonts.sizes.sm,
    color: colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  metaSubText: { fontSize: fonts.sizes.xs, color: colors.textMuted, paddingLeft: 20 },
  metaSubTextClean: { fontSize: fonts.sizes.xs, color: colors.textMuted, marginTop: 2 },
  headerBtnBase: {
    borderRadius: borderRadius.md,
    minHeight: 44,
    paddingVertical: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  shareBtn: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: borderRadius.md,
    minHeight: 44,
    paddingVertical: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareBtnText: { color: colors.textPrimary, fontWeight: '700', fontSize: fonts.sizes.xs },
  mapsBtn: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    paddingVertical: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapsBtnText: { color: colors.textPrimary, fontWeight: '700', fontSize: fonts.sizes.xs },
  whatsappGroupBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: borderRadius.md,
    minHeight: 44,
    paddingVertical: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  whatsappGroupBtnText: { color: colors.textPrimary, fontWeight: '700', fontSize: fonts.sizes.xs },
  lifecycleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: 5,
    marginBottom: spacing.md + 2,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    minHeight: 42,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: borderRadius.md,
  },
  tabItemActive: { backgroundColor: colors.primary },
  tabText: { color: colors.textSecondary, fontWeight: '700', fontSize: fonts.sizes.xs },
  tabTextActive: { color: colors.textInverse, fontWeight: '800' },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md + 2,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm + 2,
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
  countTag: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  countTagText: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  myStatusText: { color: colors.textSecondary, fontSize: fonts.sizes.sm, marginBottom: 4 },
  deadlineNotice: { color: colors.textMuted, fontSize: fonts.sizes.xs, marginBottom: spacing.md },
  positionPickerBlock: {
    marginBottom: spacing.md,
  },
  positionPickerLabel: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs,
    fontWeight: '700',
    marginBottom: spacing.xs + 2,
  },
  positionWrapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  positionChip: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  accordionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  accordionChevron: {
    color: colors.primary,
    fontSize: fonts.sizes.md,
    fontWeight: '800',
  },
  expandListBtn: {
    marginTop: spacing.sm + 2,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    minHeight: 40,
    justifyContent: 'center',
  },
  expandListBtnText: {
    color: colors.primary,
    fontSize: fonts.sizes.xs,
    fontWeight: '800',
  },
  filterPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.sm,
  },
  filterPillChip: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 6,
  },
  filterPillChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  filterPillText: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs,
    fontWeight: '700',
  },
  filterPillTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  positionChipSelected: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  positionChipText: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs,
    fontWeight: '700',
  },
  positionChipTextSelected: {
    color: colors.primary,
    fontWeight: '800',
  },
  rsvpRow: { flexDirection: 'row', gap: spacing.xs + 2, flexWrap: 'wrap' },
  rsvpBtn: {
    flex: 1,
    minWidth: 100,
    minHeight: 42,
    paddingVertical: 11,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rsvpBtnDarkText: { color: colors.textInverse, fontWeight: '800', fontSize: fonts.sizes.xs },
  goalkeeperRsvpBtn: {
    backgroundColor: colors.infoSoft,
    borderWidth: 1,
    borderColor: colors.info,
  },
  goalkeeperRsvpText: { color: colors.info, fontWeight: '800', fontSize: fonts.sizes.xs },
  secondaryActionBtn: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  secondaryActionText: { color: colors.textPrimary, fontWeight: '700', fontSize: fonts.sizes.xs },
  declineBtn: {
    backgroundColor: colors.errorSoft,
    borderWidth: 1,
    borderColor: colors.error,
  },
  declineBtnText: { color: colors.error, fontWeight: '800', fontSize: fonts.sizes.xs },
  guestForm: { flexDirection: 'row', gap: spacing.xs + 2, alignItems: 'center' },
  guestInput: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: fonts.sizes.md,
  },
  gkToggle: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm + 2,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
  },
  gkToggleActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  gkToggleText: { color: colors.textSecondary, fontSize: fonts.sizes.xs, fontWeight: '700' },
  addGuestBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addGuestBtnText: { color: colors.textInverse, fontWeight: '800', fontSize: fonts.sizes.xs },
  emptyListText: { color: colors.textMuted, fontSize: fonts.sizes.sm, lineHeight: 20, fontStyle: 'italic' },
  inlineEmptyBox: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  inlineEmptyEmoji: { fontSize: 32, marginBottom: spacing.xs },
  inlineEmptyTitle: { color: colors.textPrimary, fontSize: fonts.sizes.sm, fontWeight: '800', textAlign: 'center' },
  inlineEmptySubtitle: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 4,
  },
  playerRow: {
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.sm,
  },
  playerLeft: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm + 2,
  },
  playerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  playerAvatarText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: fonts.sizes.sm,
  },
  playerName: { color: colors.textPrimary, fontSize: fonts.sizes.sm, fontWeight: '700' },
  playerMeta: { color: colors.textSecondary, fontSize: fonts.sizes.xs, lineHeight: 18, marginTop: 2 },
  actionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  counterGroup: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  miniTagBtn: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 10,
    minHeight: 38,
    minWidth: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniTagText: { color: colors.textSecondary, fontSize: fonts.sizes.xs, fontWeight: '700' },
  roleActionBtn: {
    borderWidth: 1,
    borderColor: colors.info,
    backgroundColor: colors.infoSoft,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 10,
    minHeight: 38,
    minWidth: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleActionText: { color: colors.info, fontSize: fonts.sizes.xs, fontWeight: '700' },
  removeBtn: {
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: colors.errorSoft,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 10,
    minHeight: 38,
    minWidth: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeBtnText: { color: colors.error, fontSize: fonts.sizes.xs, fontWeight: '800' },
  timerBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  timerDisplay: {
    fontSize: 48,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 3,
    fontVariant: ['tabular-nums'],
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  presetChip: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  presetText: { color: colors.textSecondary, fontSize: fonts.sizes.xs, fontWeight: '800' },
  helperText: { color: colors.textSecondary, fontSize: fonts.sizes.xs },
  teamCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  teamHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  teamTitle: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: fonts.sizes.sm,
  },
  teamCountText: {
    color: colors.textMuted,
    fontSize: fonts.sizes.xs,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  teamPlayerLine: { color: colors.textPrimary, fontSize: fonts.sizes.xs, marginBottom: 3 },
  scoreboardBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  scoreTeamCol: { flex: 1, alignItems: 'center' },
  teamPickerChip: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    marginBottom: spacing.sm,
  },
  teamPickerText: { color: colors.primary, fontSize: fonts.sizes.xs, fontWeight: '800' },
  scoreControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  scoreStepBtn: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: borderRadius.sm,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreStepText: { color: colors.textPrimary, fontSize: fonts.sizes.md, fontWeight: '900' },
  scoreNumber: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.xxl,
    fontWeight: '900',
    minWidth: 28,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  scoreVs: { color: colors.textMuted, fontSize: fonts.sizes.lg, fontWeight: '900', paddingTop: 22 },
  matchHistoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  matchScoreText: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.xs,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  winnerPill: {
    backgroundColor: colors.successSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  matchWinnerText: { color: colors.success, fontSize: fonts.sizes.xs, fontWeight: '800' },
  mvpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  mvpName: { color: colors.textPrimary, fontWeight: '700', fontSize: fonts.sizes.sm },
  mvpVotes: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: fonts.sizes.sm,
    fontVariant: ['tabular-nums'],
  },
  statsRow: {
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.xs + 2,
  },
  statsLabel: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  counterBtn: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 6,
    paddingHorizontal: 10,
    minHeight: 38,
    minWidth: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterBtnText: { color: colors.textPrimary, fontSize: fonts.sizes.xs, fontWeight: '800' },
  voteBtn: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 12,
    minHeight: 38,
    minWidth: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voteBtnActive: { backgroundColor: colors.primary },
  voteBtnText: { color: colors.primary, fontSize: fonts.sizes.xs, fontWeight: '800' },
  progressPctText: {
    color: colors.success,
    fontSize: fonts.sizes.xs,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: borderRadius.full,
  },
  financeGrid: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm + 2 },
  financeBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  financeLabel: { color: colors.textSecondary, fontSize: fonts.sizes.xs, fontWeight: '600' },
  financeValue: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.xl,
    fontWeight: '900',
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  pixKeyText: {
    color: colors.primary,
    fontSize: fonts.sizes.md,
    fontWeight: '800',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  financePlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.sm,
  },
  paymentBadgeWrap: {
    flexDirection: 'row',
    marginTop: 4,
  },
  paymentPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  paymentStatusText: { fontSize: fonts.sizes.xs, fontWeight: '700' },
  miniPayBtn: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    minHeight: 38,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deletePeladaBtn: {
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: colors.errorSoft,
    alignItems: 'center',
  },
  deletePeladaText: { color: colors.error, fontWeight: '800', fontSize: fonts.sizes.sm },
  lifecycleCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.md + 2,
    marginBottom: spacing.md + 2,
    gap: spacing.sm + 4,
    ...shadows.card,
  },
  lifecycleHeader: {
    gap: 4,
  },
  lifecycleTitle: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.md,
    fontWeight: '800',
  },
  lifecycleSubtitle: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.sm,
    lineHeight: 20,
  },
  lifecycleActionBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 6,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  lifecycleActionBtnText: {
    color: colors.textInverse,
    fontSize: fonts.sizes.sm + 1,
    fontWeight: '800',
    textAlign: 'center',
  },
});
