// Edit Pelada Modal for Organizers
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { updatePelada } from '../../services/peladaService';
import { Pelada } from '../../types';
import { colors, fonts, spacing, borderRadius, layout, shadows } from '../../constants/theme';
import { showMessage } from '../../utils/alerts';

interface EditPeladaModalProps {
  visible: boolean;
  pelada: Pelada;
  onClose: () => void;
  onSaved: (updated: Pelada) => void;
}

export function EditPeladaModal({ visible, pelada, onClose, onSaved }: EditPeladaModalProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [price, setPrice] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('');
  const [playersPerTeam, setPlayersPerTeam] = useState('5');
  const [cancelDeadlineHours, setCancelDeadlineHours] = useState('4');
  const [pixKey, setPixKey] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [goalkeepersExempt, setGoalkeepersExempt] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && pelada) {
      const d = new Date(pelada.dateTime);
      setTitle(pelada.title);
      setDate(
        `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
          .toString()
          .padStart(2, '0')}/${d.getFullYear()}`
      );
      setTime(
        `${d.getHours().toString().padStart(2, '0')}:${d
          .getMinutes()
          .toString()
          .padStart(2, '0')}`
      );
      setLocation(pelada.location || '');
      setLocationAddress(pelada.locationAddress || '');
      setPrice(pelada.price != null ? String(pelada.price) : '');
      setMaxPlayers(pelada.maxPlayers != null ? String(pelada.maxPlayers) : '');
      setPlayersPerTeam(String(pelada.playersPerTeam || 5));
      setCancelDeadlineHours(String(pelada.cancelDeadlineHours ?? 4));
      setPixKey(pelada.pixKey || '');
      setIsPublic(pelada.isPublic);
      setGoalkeepersExempt(pelada.goalkeepersExempt);
    }
  }, [visible, pelada]);

  async function handleSave() {
    if (!title.trim() || !location.trim() || !date || !time) {
      showMessage('Erro', 'Preencha título, data, hora e local');
      return;
    }

    const [day, month, year] = date.split('/');
    const [hours, minutes] = time.split(':');
    const dateTime = new Date(
      parseInt(year || '2026', 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      parseInt(hours, 10),
      parseInt(minutes, 10)
    );

    if (isNaN(dateTime.getTime())) {
      showMessage('Data inválida', 'Use DD/MM/AAAA e HH:MM');
      return;
    }

    const parsedPrice = price.trim() ? parseFloat(price.replace(',', '.')) : null;

    setSaving(true);
    try {
      const updated = await updatePelada(pelada.id, {
        title: title.trim(),
        dateTime: dateTime.toISOString(),
        location: location.trim(),
        locationAddress: locationAddress.trim() || null,
        price: parsedPrice !== null && !isNaN(parsedPrice) ? parsedPrice : null,
        maxPlayers: maxPlayers.trim() ? parseInt(maxPlayers, 10) : null,
        playersPerTeam: playersPerTeam.trim() ? parseInt(playersPerTeam, 10) : 5,
        cancelDeadlineHours: cancelDeadlineHours.trim() ? parseInt(cancelDeadlineHours, 10) : 4,
        pixKey: pixKey.trim() || null,
        isPublic,
        goalkeepersExempt,
      });
      onSaved(updated);
      onClose();
      showMessage('Sucesso', 'Pelada atualizada!');
    } catch (error: any) {
      showMessage('Erro', error.response?.data?.error || 'Erro ao atualizar pelada');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Editar Pelada</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtnBox}
              accessibilityRole="button"
              accessibilityLabel="Fechar edição da pelada"
            >
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator keyboardShouldPersistTaps="handled">
            <Input label="Título *" value={title} onChangeText={setTitle} />

            <View style={styles.row}>
              <View style={styles.half}>
                <Input label="Data (DD/MM/AAAA)" value={date} onChangeText={setDate} keyboardType="numeric" />
              </View>
              <View style={styles.half}>
                <Input label="Hora (HH:MM)" value={time} onChangeText={setTime} keyboardType="numeric" />
              </View>
            </View>

            <Input label="Local *" value={location} onChangeText={setLocation} />
            <Input label="Endereço" value={locationAddress} onChangeText={setLocationAddress} />

            <View style={styles.row}>
              <View style={styles.half}>
                <Input label="Valor (R$)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
              </View>
              <View style={styles.half}>
                <Input label="Máx. linha" value={maxPlayers} onChangeText={setMaxPlayers} keyboardType="number-pad" />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.half}>
                <Input label="Linha/time" value={playersPerTeam} onChangeText={setPlayersPerTeam} keyboardType="number-pad" />
              </View>
              <View style={styles.half}>
                <Input label="Prazo desist. (h)" value={cancelDeadlineHours} onChangeText={setCancelDeadlineHours} keyboardType="number-pad" />
              </View>
            </View>

            <Input label="Chave Pix" value={pixKey} onChangeText={setPixKey} autoCapitalize="none" />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Pelada pública (Explorar)</Text>
              <Switch
                value={isPublic}
                onValueChange={setIsPublic}
                accessibilityLabel="Pelada pública na aba Explorar"
                trackColor={{ false: colors.border, true: colors.primaryDark }}
                thumbColor={isPublic ? colors.primary : colors.textMuted}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Goleiros isentos</Text>
              <Switch
                value={goalkeepersExempt}
                onValueChange={setGoalkeepersExempt}
                accessibilityLabel="Goleiros isentos de pagamento"
                trackColor={{ false: colors.border, true: colors.primaryDark }}
                thumbColor={goalkeepersExempt ? colors.primary : colors.textMuted}
              />
            </View>

            <Button title="Salvar Alterações" onPress={handleSave} loading={saving} style={{ marginTop: spacing.sm }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.md,
  },
  card: {
    width: '100%',
    maxWidth: layout.maxWidth,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    maxHeight: '90%',
    ...shadows.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  title: { color: colors.textPrimary, fontSize: fonts.sizes.xl, fontWeight: '900', flex: 1 },
  closeBtnBox: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  closeBtn: { color: colors.textSecondary, fontSize: fonts.sizes.lg, fontWeight: '700' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  half: { flex: 1, minWidth: 130 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 52,
  },
  switchLabel: { color: colors.textPrimary, fontSize: fonts.sizes.sm, fontWeight: '600', flex: 1, paddingRight: spacing.sm },
});
