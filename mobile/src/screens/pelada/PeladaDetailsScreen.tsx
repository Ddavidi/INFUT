import React, { useState, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { getPeladaById, rsvpPelada, togglePayment } from '../../services/peladaService';
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

  if (loading || !pelada) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const currentUserParticipant = pelada.participants?.find(p => p.user.id === user?.id);

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

      <View style={styles.participantsSection}>
        <Text style={styles.sectionTitle}>Confirmados</Text>
        {pelada.participants?.filter(p => p.status === 'CONFIRMED').map(p => (
          <View key={p.id} style={styles.participantRow}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{p.user.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.participantName}>{p.user.name}</Text>
            </View>
            {pelada.price != null && pelada.price > 0 && p.paid && (
              <View style={styles.paidBadge}>
                <Text style={styles.paidBadgeText}>{'✅'} Pago</Text>
              </View>
            )}
          </View>
        ))}
        {(!pelada.participants || pelada.participants.filter(p => p.status === 'CONFIRMED').length === 0) && (
           <Text style={styles.statusPending}>Ninguém confirmado ainda.</Text>
        )}
      </View>

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
  participantName: { fontSize: fonts.sizes.md, color: colors.textPrimary, fontWeight: '500' },
  
  paymentSection: { padding: spacing.lg, backgroundColor: colors.surfaceLight, marginHorizontal: spacing.md, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.borderLight, marginBottom: spacing.md },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  paymentText: { fontSize: fonts.sizes.md, color: colors.textPrimary, fontWeight: '600' },
  btnPaid: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.success, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  btnPaidText: { color: colors.success, fontWeight: '700', fontSize: fonts.sizes.sm },
  btnPay: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  btnPayText: { color: '#FFF', fontWeight: '700', fontSize: fonts.sizes.sm },
  paidBadge: { backgroundColor: colors.surfaceLight, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm, borderWidth: 1, borderColor: colors.success },
  paidBadgeText: { color: colors.success, fontSize: fonts.sizes.xs, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: colors.card, padding: spacing.lg, borderRadius: borderRadius.lg, width: '85%' },
  modalTitle: { fontSize: fonts.sizes.xl, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xs },
  modalSubtitle: { fontSize: fonts.sizes.sm, color: colors.textSecondary, marginBottom: spacing.md },
  modalInput: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.borderLight, borderRadius: borderRadius.md, padding: spacing.md, fontSize: fonts.sizes.md, color: colors.textPrimary },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.lg, gap: spacing.md },
  modalCancel: { padding: spacing.sm },
  modalCancelText: { color: colors.textSecondary, fontWeight: '600', fontSize: fonts.sizes.md },
  modalSubmit: { backgroundColor: colors.danger, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.md, justifyContent: 'center' },
  modalSubmitText: { color: '#FFF', fontWeight: '700', fontSize: fonts.sizes.md },
});
