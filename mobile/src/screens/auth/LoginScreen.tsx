// Login Screen (with Guest Invite Preview Modal)
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../hooks/useAuth';
import { getPublicPeladaByCode } from '../../services/peladaService';
import { Pelada } from '../../types';
import { colors, fonts, spacing, borderRadius, layout, shadows } from '../../constants/theme';
import { showMessage } from '../../utils/alerts';
import { getInviteCodeFromUrl } from '../../utils/inviteLink';
import { useResponsive } from '../../hooks/useResponsive';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const { isDesktop, pagePadding } = useResponsive();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [inviteCode, setInviteCode] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewPelada, setPreviewPelada] = useState<Pelada | null>(null);

  useEffect(() => {
    const codeFromUrl = getInviteCodeFromUrl();
    if (!codeFromUrl) return;
    setInviteCode(codeFromUrl);
    setPreviewLoading(true);
    getPublicPeladaByCode(codeFromUrl)
      .then((pelada) => setPreviewPelada(pelada))
      .catch(() => {
        // Silently ignore invalid code in URL on initial load
      })
      .finally(() => setPreviewLoading(false));
  }, []);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      showMessage('Erro', 'Preencha todos os campos');
      return;
    }

    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Erro ao fazer login';
      showMessage('Erro', msg);
    } finally {
      setLoading(false);
    }
  }

  async function handlePreviewInvite() {
    const code = inviteCode.trim().toUpperCase();
    if (code.length < 3) {
      showMessage('Codigo invalido', 'Digite o codigo de convite (ex: QUINTA)');
      return;
    }

    setPreviewLoading(true);
    try {
      const pelada = await getPublicPeladaByCode(code);
      setPreviewPelada(pelada);
    } catch (error: any) {
      showMessage('Convite nao encontrado', error.response?.data?.error || 'Verifique o codigo digitado');
    } finally {
      setPreviewLoading(false);
    }
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
      .toString()
      .padStart(2, '0')}/${d.getFullYear()} às ${d.getHours().toString().padStart(2, '0')}:${d
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  }

  const confirmedPlayers = previewPelada?.players.filter((p) => p.status === 'CONFIRMED') || [];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: pagePadding }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.authContainer, isDesktop && styles.authContainerDesktop]}>
          <View style={styles.header}>
            <View style={styles.logoEmblem}>
              <Text style={styles.emoji}>⚽</Text>
            </View>
            <Text style={styles.title}>INFUT</Text>
            <Text style={styles.subtitle}>Organize suas peladas sem bagunça</Text>
          </View>

          <View style={[isDesktop && styles.desktopCardsRow]}>
            <View style={[styles.authCard, isDesktop && styles.desktopCardCol]}>
              <Text style={styles.cardHeading}>Entrar na conta</Text>
              <Input
                label="E-mail"
                placeholder="seu@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Input
                label="Senha"
                placeholder="Sua senha"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <Button title="Entrar" onPress={handleLogin} loading={loading} style={{ marginTop: spacing.xs }} />

              <Button
                title="Não tem conta? Criar agora"
                onPress={() => navigation.navigate('Register')}
                variant="ghost"
                style={{ marginTop: spacing.sm }}
              />
            </View>

            {/* Visitor Invite Preview */}
            <View
              style={[
                styles.visitorBox,
                isDesktop && [styles.desktopCardCol, { marginTop: 0 }],
              ]}
            >
              <View style={styles.visitorBadgeRow}>
                <View style={styles.visitorPill}>
                  <Text style={styles.visitorPillText}>MODO VISITANTE</Text>
                </View>
              </View>
              <Text style={styles.visitorTitle}>Recebeu um código no WhatsApp?</Text>
              <Text style={styles.visitorSubtitle}>
                Confira local, horário e vagas antes mesmo de entrar.
              </Text>
              <View style={styles.visitorRow}>
                <TextInput
                  style={styles.visitorInput}
                  placeholder="Ex: QUINTA"
                  placeholderTextColor={colors.textMuted}
                  value={inviteCode}
                  onChangeText={setInviteCode}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  accessibilityLabel="Código de convite"
                />
                <TouchableOpacity
                  style={styles.visitorBtn}
                  onPress={handlePreviewInvite}
                  disabled={previewLoading}
                  accessibilityRole="button"
                  accessibilityLabel="Ver convite"
                >
                  {previewLoading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={styles.visitorBtnText}>Ver Convite</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Public Pelada Preview Modal */}
      <Modal
        visible={!!previewPelada}
        animationType="slide"
        transparent
        onRequestClose={() => setPreviewPelada(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {previewPelada && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1, paddingRight: spacing.sm }}>
                    <Text style={styles.modalSport}>
                      {previewPelada.sport} • #{previewPelada.inviteCode}
                    </Text>
                    <Text style={styles.modalTitle}>{previewPelada.title}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setPreviewPelada(null)}
                    style={styles.closeBtnBox}
                    accessibilityRole="button"
                    accessibilityLabel="Fechar prévia do convite"
                  >
                    <Ionicons name="close" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={styles.modalInfoGroup}>
                  <Text style={styles.modalInfo}>📅 {formatDate(previewPelada.dateTime)}</Text>
                  <Text style={styles.modalInfo}>📍 {previewPelada.location}</Text>
                  {previewPelada.locationAddress ? (
                    <Text style={styles.modalSubInfo}>{previewPelada.locationAddress}</Text>
                  ) : null}
                  <Text style={styles.modalInfo}>
                    💰{' '}
                    {previewPelada.price && previewPelada.price > 0
                      ? `R$ ${previewPelada.price.toFixed(2)}`
                      : 'Gratuita'}
                  </Text>
                  <Text style={styles.modalInfo}>
                    👥 Vagas:{' '}
                    {previewPelada.maxPlayers
                      ? `${previewPelada.confirmedFieldCount}/${previewPelada.maxPlayers} linha`
                      : `${previewPelada.confirmedCount} confirmados`}
                  </Text>
                </View>

                <Text style={styles.confirmedHeading}>
                  Confirmados ({confirmedPlayers.length})
                </Text>
                <ScrollView style={styles.confirmedList}>
                  {confirmedPlayers.length === 0 ? (
                    <Text style={styles.emptyConfirmedText}>
                      Nenhum jogador confirmado ainda. Seja o primeiro a entrar!
                    </Text>
                  ) : (
                    confirmedPlayers.map((p, idx) => (
                      <Text key={p.id} style={styles.confirmedItem}>
                        {idx + 1}. {p.displayName} {p.isGoalkeeper ? '🧤' : ''}
                      </Text>
                    ))
                  )}
                </ScrollView>

                <Button
                  title="Fazer Login para Participar"
                  onPress={() => {
                    setPreviewPelada(null);
                  }}
                  style={{ marginTop: spacing.md }}
                />
                <Button
                  title="Criar Nova Conta"
                  variant="outline"
                  onPress={() => {
                    setPreviewPelada(null);
                    navigation.navigate('Register');
                  }}
                  style={{ marginTop: spacing.sm }}
                />
              </>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  authContainer: {
    width: '100%',
    maxWidth: layout.authMaxWidth,
    alignSelf: 'center',
  },
  authContainerDesktop: {
    maxWidth: 900,
  },
  desktopCardsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.lg,
  },
  desktopCardCol: {
    flex: 1,
    minWidth: 0,
  },
  header: { alignItems: 'center', marginBottom: spacing.lg },
  logoEmblem: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadows.card,
  },
  emoji: { fontSize: 36 },
  title: {
    fontSize: fonts.sizes.xxxl,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: fonts.sizes.sm,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  authCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardHeading: {
    fontSize: fonts.sizes.lg,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  visitorBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  visitorBadgeRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  visitorPill: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  visitorPillText: {
    color: colors.primary,
    fontSize: fonts.sizes.xs,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  visitorTitle: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.sm,
    fontWeight: '700',
  },
  visitorSubtitle: {
    color: colors.textMuted,
    fontSize: fonts.sizes.xs,
    lineHeight: 18,
    marginTop: 2,
    marginBottom: spacing.sm + 2,
  },
  visitorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  visitorInput: {
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
  visitorBtn: {
    backgroundColor: colors.darkTeal,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  visitorBtnText: { color: colors.primary, fontWeight: '700', fontSize: fonts.sizes.xs },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: layout.authMaxWidth,
    alignSelf: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    maxHeight: '85%',
    ...shadows.card,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  modalTitle: { fontSize: fonts.sizes.xl, fontWeight: '900', color: colors.textPrimary },
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
  closeBtn: { fontSize: fonts.sizes.md, color: colors.textSecondary, fontWeight: '700' },
  modalSport: {
    fontSize: fonts.sizes.xs,
    color: colors.primary,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  modalInfoGroup: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: 6,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  modalInfo: { fontSize: fonts.sizes.sm, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
  modalSubInfo: { fontSize: fonts.sizes.xs, color: colors.textMuted, paddingLeft: 22 },
  confirmedHeading: {
    fontSize: fonts.sizes.xs,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  confirmedList: {
    maxHeight: 150,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
  },
  confirmedItem: { fontSize: fonts.sizes.sm, color: colors.textPrimary, paddingVertical: 3 },
  emptyConfirmedText: {
    fontSize: fonts.sizes.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
    lineHeight: 20,
    paddingVertical: spacing.xs,
  },
});
