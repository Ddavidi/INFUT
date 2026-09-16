import React, { useState, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getPeladaById, rsvpPelada, togglePayment, updateStats, voteMvp } from '../../services/peladaService';
import { Pelada } from '../../types';
import { AuthContext } from '../../contexts/AuthContext';
import { colors, fonts, spacing, borderRadius } from '../../constants/theme';

type Props = NativeStackScreenProps<any, 'PeladaDetails'>;

export function PeladaDetailsScreen({ route, navigation }: Props) {
  const { peladaId } = route.params;
  const { user } = useContext(AuthContext);
  const [pelada, setPelada] = useState<Pelada | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Stats Modal
  const [statsModalVisible, setStatsModalVisible] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<any>(null);
  const [editGoals, setEditGoals] = useState('0');
  const [editAssists, setEditAssists] = useState('0');
  const [editDefenses, setEditDefenses] = useState('0');

  // MVP Modal
  const [mvpModalVisible, setMvpModalVisible] = useState(false);

  const loadPelada = useCallback(async () => {
    try {
      const data = await getPeladaById(peladaId);
      setPelada(data);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar a pelada');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [peladaId, navigation]);

  useFocusEffect(
    useCallback(() => {
      loadPelada();
    }, [loadPelada])
  );

  const handleRSVP = async (status: 'CONFIRMED' | 'CANCELLED', rsvpReason?: string) => {
    setIsSubmitting(true);
    try {
      await rsvpPelada(peladaId, status, rsvpReason);
      Alert.alert('Sucesso', 'Sua resposta foi registrada!');
      setModalVisible(false);
      setReason('');
      loadPelada();
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao registrar presença');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePayment = async (paid: boolean) => {
    setIsSubmitting(true);
    try {
      await togglePayment(peladaId, paid);
      Alert.alert('Sucesso', paid ? 'Marcado como pago!' : 'Pagamento desmarcado.');
      loadPelada();
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao atualizar pagamento');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openStatsModal = (participant: any) => {
    setEditingParticipant(participant);
    setEditGoals(participant.goals.toString());
    setEditAssists(participant.assists.toString());
    setEditDefenses(participant.defenses.toString());
    setStatsModalVisible(true);
  };

  const handleSaveStats = async () => {
    if (!editingParticipant) return;
    setIsSubmitting(true);
    try {
      await updateStats(peladaId, editingParticipant.id, {
        goals: parseInt(editGoals, 10) || 0,
        assists: parseInt(editAssists, 10) || 0,
        defenses: parseInt(editDefenses, 10) || 0,
      });
      setStatsModalVisible(false);
      loadPelada();
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao salvar estatísticas');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoteMvp = async (candidateId: string) => {
    setIsSubmitting(true);
    try {
      await voteMvp(peladaId, candidateId);
      Alert.alert('Sucesso', 'Voto registrado!');
      setMvpModalVisible(false);
      loadPelada();
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao votar');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !pelada) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const currentUserParticipant = pelada.participants?.find(p => p.user.id === user?.id);
  const isOrganizer = user?.id === pelada.organizerId;
  const confirmedParticipants = pelada.participants?.filter(p => p.status === 'CONFIRMED') || [];

  // Calcular o atual MVP (quem tem mais votos)
  let currentMvp: any = null;
  let maxVotes = 0;
  confirmedParticipants.forEach(p => {
    const votes = p._count?.receivedVotes || 0;
    if (votes > maxVotes) {
      maxVotes = votes;
      currentMvp = p;
    }
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>{'<'} Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{pelada.title}</Text>
        <Text style={styles.subtitle}>{pelada.sport} - {new Date(pelada.dateTime).toLocaleString()}</Text>
        <Text style={styles.subtitle}>{pelada.location}</Text>
        {pelada.price != null && pelada.price > 0 && (
          <Text style={styles.priceTag}>Valor: R$ {pelada.price.toFixed(2)} por pessoa</Text>
        )}
      </View>

      <View style={styles.rsvpSection}>
        <Text style={styles.sectionTitle}>Sua Presença</Text>
        {currentUserParticipant?.status === 'CONFIRMED' ? (
          <Text style={styles.statusConfirmed}>Você está confirmado! {'\u2705'}</Text>
        ) : currentUserParticipant?.status === 'CANCELLED' ? (
          <Text style={styles.statusCancelled}>Você não vai {'\u274C'}</Text>
        ) : (
          <Text style={styles.statusPending}>Você ainda não respondeu</Text>
        )}

        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={[styles.btn, styles.btnConfirm]} 
            onPress={() => handleRSVP('CONFIRMED')}
            disabled={isSubmitting}
          >
            <Text style={styles.btnText}>Confirmar Presença</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.btn, styles.btnCancel]} 
            onPress={() => setModalVisible(true)}
            disabled={isSubmitting}
          >
            <Text style={styles.btnText}>Não Vou</Text>
          </TouchableOpacity>
        </View>
      </View>

      {currentUserParticipant?.status === 'CONFIRMED' && pelada.price != null && pelada.price > 0 && (
        <View style={styles.paymentSection}>
          <Text style={styles.sectionTitle}>Pagamento da Cota</Text>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentText}>Total: R$ {pelada.price.toFixed(2)}</Text>
            {currentUserParticipant.paid ? (
              <TouchableOpacity style={styles.btnPaid} onPress={() => handlePayment(false)} disabled={isSubmitting}>
                <Text style={styles.btnPaidText}>{'✅'} Já Paguei</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.btnPay} onPress={() => handlePayment(true)} disabled={isSubmitting}>
                <Text style={styles.btnPayText}>Marcar como Pago</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Seção de MVP */}
      {confirmedParticipants.length > 0 && (
        <View style={styles.mvpSection}>
          <Text style={styles.sectionTitle}>👑 Craque da Pelada (MVP)</Text>
          
          {currentMvp ? (
            <View style={styles.currentMvpBox}>
              <Text style={styles.currentMvpName}>{currentMvp.user.name}</Text>
              <Text style={styles.currentMvpVotes}>{currentMvp._count?.receivedVotes} votos recebidos</Text>
            </View>
          ) : (
            <Text style={styles.statusPending}>Nenhum voto registrado ainda.</Text>
          )}

          {currentUserParticipant?.status === 'CONFIRMED' && !currentUserParticipant.votedForMvpId && (
            <TouchableOpacity style={styles.voteButton} onPress={() => setMvpModalVisible(true)}>
              <Text style={styles.voteButtonText}>Votar no MVP</Text>
            </TouchableOpacity>
          )}
          {currentUserParticipant?.votedForMvpId && (
            <Text style={styles.votedText}>Você já votou no MVP desta pelada.</Text>
          )}
        </View>
      )}

      <View style={styles.participantsSection}>
        <Text style={styles.sectionTitle}>Confirmados</Text>
        {isOrganizer && <Text style={styles.hintText}>Toque num jogador para editar as estatísticas dele.</Text>}
        
        {confirmedParticipants.map(p => (
          <TouchableOpacity 
            key={p.id} 
            style={styles.participantRow}
            disabled={!isOrganizer}
            onPress={() => openStatsModal(p)}
          >
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{p.user.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.participantName}>{p.user.name}</Text>
              <View style={styles.statsRow}>
                <Text style={styles.statItem}>⚽ {p.goals}</Text>
                <Text style={styles.statItem}>👟 {p.assists}</Text>
                <Text style={styles.statItem}>🧤 {p.defenses}</Text>
              </View>
            </View>
            {pelada.price != null && pelada.price > 0 && p.paid && (
              <View style={styles.paidBadge}>
                <Text style={styles.paidBadgeText}>{'✅'} Pago</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
        {confirmedParticipants.length === 0 && (
           <Text style={styles.statusPending}>Ninguém confirmado ainda.</Text>
        )}
      </View>

      <TouchableOpacity 
        style={styles.mapButton} 
        onPress={() => navigation.navigate('PeladaMap', { peladaId: pelada.id })}
      >
        <Text style={styles.mapButtonText}>{'📍'} Ver Mapa de Jogadores</Text>
      </TouchableOpacity>

      {/* Modal de Cancelamento */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Por que não vai?</Text>
            <Text style={styles.modalSubtitle}>Justificativa (opcional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Estou viajando"
              placeholderTextColor={colors.textMuted}
              value={reason}
              onChangeText={setReason}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={() => handleRSVP('CANCELLED', reason)} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color={colors.background} /> : <Text style={styles.modalSubmitText}>Confirmar Falta</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Estatísticas (Apenas Organizador) */}
      <Modal visible={statsModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Lançar Estatísticas</Text>
            <Text style={styles.modalSubtitle}>{editingParticipant?.user.name}</Text>
            
            <View style={styles.statInputRow}>
              <Text style={styles.statLabel}>⚽ Gols</Text>
              <TextInput style={styles.statInput} keyboardType="number-pad" value={editGoals} onChangeText={setEditGoals} />
            </View>
            <View style={styles.statInputRow}>
              <Text style={styles.statLabel}>👟 Assistências</Text>
              <TextInput style={styles.statInput} keyboardType="number-pad" value={editAssists} onChangeText={setEditAssists} />
            </View>
            <View style={styles.statInputRow}>
              <Text style={styles.statLabel}>🧤 Defesas</Text>
              <TextInput style={styles.statInput} keyboardType="number-pad" value={editDefenses} onChangeText={setEditDefenses} />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setStatsModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handleSaveStats} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color={colors.background} /> : <Text style={styles.modalSubmitText}>Salvar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Votação do MVP */}
      <Modal visible={mvpModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>Votar no Craque</Text>
            <Text style={styles.modalSubtitle}>Quem foi o destaque desta pelada?</Text>
            <ScrollView style={{ marginVertical: spacing.md }}>
              {confirmedParticipants.map(p => (
                <TouchableOpacity 
                  key={p.id} 
                  style={styles.voteOption}
                  onPress={() => handleVoteMvp(p.id)}
                >
                  <Text style={styles.voteOptionText}>{p.user.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setMvpModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: spacing.lg, paddingTop: 60, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  backButton: { marginBottom: spacing.sm, paddingVertical: spacing.xs },
  backButtonText: { color: colors.primary, fontWeight: '600', fontSize: fonts.sizes.md },
  title: { fontSize: fonts.sizes.xxl, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: fonts.sizes.md, color: colors.textSecondary, marginTop: 4 },
  priceTag: { fontSize: fonts.sizes.lg, fontWeight: '700', color: colors.primary, marginTop: spacing.sm },
  rsvpSection: { padding: spacing.lg, backgroundColor: colors.card, margin: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.borderLight },
  sectionTitle: { fontSize: fonts.sizes.lg, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  statusConfirmed: { color: colors.success, fontWeight: '600', marginBottom: spacing.md, fontSize: fonts.sizes.md },
  statusCancelled: { color: colors.danger, fontWeight: '600', marginBottom: spacing.md, fontSize: fonts.sizes.md },
  statusPending: { color: colors.textSecondary, fontWeight: '600', marginBottom: spacing.md, fontSize: fonts.sizes.md },
  actionButtons: { flexDirection: 'row', gap: spacing.md },
  btn: { flex: 1, padding: spacing.md, borderRadius: borderRadius.md, alignItems: 'center' },
  btnConfirm: { backgroundColor: colors.success },
  btnCancel: { backgroundColor: colors.danger },
  btnText: { color: '#FFF', fontWeight: '700', fontSize: fonts.sizes.sm },
  
  participantsSection: { padding: spacing.lg },
  participantRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, backgroundColor: colors.surface, padding: spacing.sm, borderRadius: borderRadius.md },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.lightTeal, justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm },
  avatarText: { color: colors.primary, fontWeight: '700', fontSize: fonts.sizes.md },
  participantName: { fontSize: fonts.sizes.md, color: colors.textPrimary, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: 4 },
  statItem: { fontSize: fonts.sizes.xs, color: colors.textSecondary, fontWeight: '600' },
  hintText: { fontSize: fonts.sizes.xs, color: colors.textSecondary, marginBottom: spacing.md, fontStyle: 'italic' },
  
  paymentSection: { padding: spacing.lg, backgroundColor: colors.surfaceLight, marginHorizontal: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.borderLight, marginBottom: spacing.md },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  paymentText: { fontSize: fonts.sizes.md, color: colors.textPrimary, fontWeight: '600' },
  btnPaid: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.success, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  btnPaidText: { color: colors.success, fontWeight: '700', fontSize: fonts.sizes.sm },
  btnPay: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  btnPayText: { color: '#FFF', fontWeight: '700', fontSize: fonts.sizes.sm },
  paidBadge: { backgroundColor: colors.surfaceLight, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm, borderWidth: 1, borderColor: colors.success },
  paidBadgeText: { color: colors.success, fontSize: fonts.sizes.xs, fontWeight: '700' },

  mvpSection: { padding: spacing.lg, backgroundColor: colors.card, marginHorizontal: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.borderLight, marginBottom: spacing.md },
  currentMvpBox: { backgroundColor: '#FFD70022', padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: '#FFD700', marginBottom: spacing.md },
  currentMvpName: { fontSize: fonts.sizes.lg, fontWeight: '800', color: '#B8860B' },
  currentMvpVotes: { fontSize: fonts.sizes.sm, color: '#B8860B', marginTop: 4 },
  voteButton: { backgroundColor: colors.primary, padding: spacing.md, borderRadius: borderRadius.md, alignItems: 'center' },
  voteButtonText: { color: '#FFF', fontWeight: '700', fontSize: fonts.sizes.md },
  votedText: { color: colors.textSecondary, fontSize: fonts.sizes.sm, fontStyle: 'italic', textAlign: 'center' },
  voteOption: { padding: spacing.md, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.borderLight, borderRadius: borderRadius.md, marginBottom: spacing.sm },
  voteOptionText: { fontSize: fonts.sizes.md, color: colors.textPrimary, fontWeight: '600' },

  mapButton: { backgroundColor: colors.darkTeal, margin: spacing.lg, padding: spacing.md, borderRadius: borderRadius.md, alignItems: 'center' },
  mapButtonText: { color: colors.textInverse, fontWeight: '700', fontSize: fonts.sizes.md },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: colors.card, padding: spacing.lg, borderRadius: borderRadius.lg, width: '85%' },
  modalTitle: { fontSize: fonts.sizes.xl, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xs },
  modalSubtitle: { fontSize: fonts.sizes.sm, color: colors.textSecondary, marginBottom: spacing.md },
  modalInput: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.borderLight, borderRadius: borderRadius.md, padding: spacing.md, fontSize: fonts.sizes.md, color: colors.textPrimary },
  
  statInputRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  statLabel: { fontSize: fonts.sizes.md, color: colors.textPrimary, fontWeight: '600' },
  statInput: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.borderLight, borderRadius: borderRadius.md, padding: spacing.xs, fontSize: fonts.sizes.md, color: colors.textPrimary, width: 80, textAlign: 'center' },

  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.lg, gap: spacing.md },
  modalCancel: { padding: spacing.sm },
  modalCancelText: { color: colors.textSecondary, fontWeight: '600', fontSize: fonts.sizes.md },
  modalSubmit: { backgroundColor: colors.danger, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.md, justifyContent: 'center' },
  modalSubmitText: { color: '#FFF', fontWeight: '700', fontSize: fonts.sizes.md },
});
