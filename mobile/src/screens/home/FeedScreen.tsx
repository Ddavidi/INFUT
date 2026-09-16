// Feed Screen - Pelada listing (Issue #26)
import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl, Share, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { listPeladas, joinPelada } from '../../services/peladaService';
import { Pelada } from '../../types';
import { AuthContext } from '../../contexts/AuthContext';
import { useContext } from 'react';
import { colors, fonts, spacing, borderRadius } from '../../constants/theme';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const mins = date.getMinutes().toString().padStart(2, '0');
  return day + '/' + month + ' as ' + hours + ':' + mins;
}

function PeladaCard({ pelada, isOrganizer }: { pelada: Pelada, isOrganizer: boolean }) {
  const sportEmojis: Record<string, string> = {
    'Futebol': '\u26BD', 'Futsal': '\uD83C\uDFDF\uFE0F', 'Volei': '\uD83C\uDFD0',
    'Basquete': '\uD83C\uDFC0', 'Handebol': '\uD83E\uDD3E', 'Beach Tennis': '\uD83C\uDFBE',
  };
  const emoji = sportEmojis[pelada.sport] || '\uD83C\uDFAF';

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardEmoji}>{emoji}</Text>
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardTitle}>{pelada.title}</Text>
          <Text style={styles.cardSport}>{pelada.sport}</Text>
        </View>
        {pelada.isRecurring && (
          <View style={styles.recurringBadge}>
            <Text style={styles.recurringText}>Recorrente</Text>
          </View>
        )}
      </View>

      <View style={styles.cardBody}>
        <View style={styles.cardRow}>
          <Text style={styles.cardIcon}>{'\uD83D\uDCC5'}</Text>
          <Text style={styles.cardInfo}>{formatDate(pelada.dateTime)}</Text>
        </View>
        <View style={styles.cardRow}>
          <Text style={styles.cardIcon}>{'\uD83D\uDCCD'}</Text>
          <Text style={styles.cardInfo}>{pelada.location}</Text>
        </View>
        {pelada.price != null && pelada.price > 0 && (
          <View style={styles.cardRow}>
            <Text style={styles.cardIcon}>{'\uD83D\uDCB0'}</Text>
            <Text style={styles.cardInfo}>R$ {pelada.price.toFixed(2)}</Text>
          </View>
        )}
        {pelada.maxPlayers && (
          <View style={styles.cardRow}>
            <Text style={styles.cardIcon}>{'\uD83D\uDC65'}</Text>
            <Text style={styles.cardInfo}>Max {pelada.maxPlayers} jogadores</Text>
          </View>
        )}
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.organizerText}>Organizado por {pelada.organizer.name}</Text>
        {isOrganizer && pelada.inviteCode && (
          <TouchableOpacity 
            style={styles.shareButton} 
            onPress={async () => {
              try {
                await Share.share({
                  message: `Vem jogar na minha pelada "${pelada.title}"! \nBaixe o app INFUT e insira o código: ${pelada.inviteCode}`,
                });
              } catch (e) {}
            }}
          >
            <Text style={styles.shareButtonText}>{'\uD83D\uDCE4'} Convite</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

export function FeedScreen({ navigation }: Props) {
  const { user } = useContext(AuthContext);
  const [peladas, setPeladas] = useState<Pelada[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadPeladas();
  }, [loadPeladas]);

  const handleJoin = async () => {
    if (!inviteCode || inviteCode.length < 5) {
      Alert.alert('Erro', 'Código inválido');
      return;
    }
    setIsJoining(true);
    try {
      await joinPelada(inviteCode.trim().toUpperCase());
      Alert.alert('Sucesso!', 'Você entrou na peladinha!');
      setModalVisible(false);
      setInviteCode('');
      loadPeladas();
    } catch (error: any) {
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao entrar na pelada');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>INFUT</Text>
            <Text style={styles.headerSubtitle}>Suas peladinhas</Text>
          </View>
          <TouchableOpacity style={styles.joinButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.joinButtonText}>+ Entrar</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={peladas}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PeladaCard pelada={item} isOrganizer={user?.id === item.organizerId} />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>{'\u26BD'}</Text>
            <Text style={styles.emptyTitle}>Nenhuma peladinha ainda</Text>
            <Text style={styles.emptySubtitle}>Crie sua primeira peladinha!</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Entrar na Pelada</Text>
            <Text style={styles.modalSubtitle}>Digite o código recebido do organizador.</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: AB12C"
              placeholderTextColor={colors.textMuted}
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
              maxLength={8}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmit} onPress={handleJoin} disabled={isJoining}>
                {isJoining ? <ActivityIndicator color={colors.background} /> : <Text style={styles.modalSubmitText}>Entrar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: 60, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  headerTitle: { fontSize: fonts.sizes.xxxl, fontWeight: '900', color: colors.primary, letterSpacing: 2 },
  headerSubtitle: { fontSize: fonts.sizes.md, color: colors.textSecondary, marginTop: spacing.xs },
  list: { paddingHorizontal: spacing.md, paddingBottom: 100 },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  cardEmoji: { fontSize: 36, marginRight: spacing.md },
  cardHeaderText: { flex: 1 },
  cardTitle: { fontSize: fonts.sizes.lg, fontWeight: '700', color: colors.textPrimary },
  cardSport: { fontSize: fonts.sizes.sm, color: colors.textSecondary, marginTop: 2 },
  recurringBadge: { backgroundColor: colors.darkTeal, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  recurringText: { fontSize: fonts.sizes.xs, color: colors.primary, fontWeight: '600' },
  cardBody: { marginBottom: spacing.md },
  cardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  cardIcon: { fontSize: 16, marginRight: spacing.sm, width: 24 },
  cardInfo: { fontSize: fonts.sizes.sm, color: colors.textSecondary },
  organizerText: { fontSize: fonts.sizes.xs, color: colors.textMuted },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 64, marginBottom: spacing.md },
  emptyTitle: { fontSize: fonts.sizes.xl, fontWeight: '700', color: colors.textPrimary },
  emptySubtitle: { fontSize: fonts.sizes.md, color: colors.textSecondary, marginTop: spacing.xs },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  joinButton: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.md },
  joinButtonText: { color: colors.background, fontWeight: '700', fontSize: fonts.sizes.sm },
  shareButton: { backgroundColor: colors.lightTeal, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.sm },
  shareButtonText: { color: colors.primary, fontWeight: '600', fontSize: fonts.sizes.xs },
  cardFooter: { borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: spacing.sm, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: colors.card, padding: spacing.lg, borderRadius: borderRadius.lg, width: '85%' },
  modalTitle: { fontSize: fonts.sizes.xl, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xs },
  modalSubtitle: { fontSize: fonts.sizes.sm, color: colors.textSecondary, marginBottom: spacing.md },
  modalInput: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.borderLight, borderRadius: borderRadius.md, padding: spacing.md, fontSize: fonts.sizes.lg, color: colors.textPrimary, textAlign: 'center', letterSpacing: 3 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.lg, gap: spacing.md },
  modalCancel: { padding: spacing.sm },
  modalCancelText: { color: colors.textSecondary, fontWeight: '600', fontSize: fonts.sizes.md },
  modalSubmit: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.md, justifyContent: 'center' },
  modalSubmitText: { color: colors.background, fontWeight: '700', fontSize: fonts.sizes.md },
});