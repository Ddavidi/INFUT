// Edit Profile Screen - Athlete stats, region, logout and account deletion (Play Store compliance)
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { updateProfile, changeUserPassword, deleteAccount } from '../../services/userService';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { LegalModal } from '../../components/ui/LegalModal';
import { SPORTS, getPositionsForSport } from '../../constants/sports';
import { colors, fonts, spacing, borderRadius, shadows } from '../../constants/theme';
import { showConfirm, showMessage } from '../../utils/alerts';
import { useResponsive } from '../../hooks/useResponsive';

export function EditProfileScreen() {
  const { user, refreshUser, signOut } = useAuth();
  const { isDesktop, containerMaxWidth, pagePadding, topSpace } = useResponsive();

  const [name, setName] = useState('');
  const [region, setRegion] = useState('');
  const [selectedSport, setSelectedSport] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [positions, setPositions] = useState<string[]>([]);
  const [showLegal, setShowLegal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshUser();
    }, [refreshUser])
  );

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setRegion(user.region || '');
      setSelectedSport(user.sport || '');
      setSelectedPosition(user.position || '');
    }
  }, [user]);

  useEffect(() => {
    if (selectedSport) {
      setPositions(getPositionsForSport(selectedSport));
    } else {
      setPositions([]);
    }
  }, [selectedSport]);

  async function handleSave() {
    if (name.trim().length < 2) {
      showMessage('Erro', 'Nome deve ter pelo menos 2 caracteres');
      return;
    }

    setLoading(true);
    try {
      await updateProfile({
        name: name.trim(),
        sport: selectedSport || undefined,
        position: selectedPosition || undefined,
        region: region.trim() || null,
      });
      await refreshUser();
      showMessage('Sucesso', 'Perfil atualizado com sucesso!');
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Erro ao atualizar perfil';
      showMessage('Erro', msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePassword() {
    if (!currentPassword || !newPassword) {
      showMessage('Campos obrigatórios', 'Informe sua senha atual e a nova senha.');
      return;
    }
    if (newPassword.length < 6) {
      showMessage('Senha curta', 'A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setChangingPassword(true);
    try {
      await changeUserPassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      showMessage('Pronto!', 'Sua senha foi atualizada com sucesso.');
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Não foi possível alterar a senha';
      showMessage('Erro', msg);
    } finally {
      setChangingPassword(false);
    }
  }

  function handleLogout() {
    showConfirm(
      'Sair da conta',
      'Deseja encerrar sua sessao no INFUT?',
      () => {
        signOut();
      },
      'Sair'
    );
  }

  function handleDeleteAccount() {
    showConfirm(
      'Excluir Conta e Dados',
      'Tem certeza? Todos os seus dados, historico e peladas organizadas serao excluidos permanentemente.',
      async () => {
        try {
          await deleteAccount();
          await signOut();
        } catch (error: any) {
          showMessage('Erro', error.response?.data?.error || 'Erro ao excluir conta');
        }
      },
      'Excluir Conta'
    );
  }

  if (!user) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando seu perfil…</Text>
      </View>
    );
  }

  const stats = user.stats || {
    totalGames: 0,
    totalGoals: 0,
    totalAssists: 0,
    totalWins: 0,
    organizedCount: 0,
    mvpVotes: 0,
    goalkeeperVotes: 0,
    noShows: 0,
    attendanceRate: 100,
  };

  const identityAndStats = (
    <>
      {/* Cabecalho de Identidade */}
      <View style={styles.profileHeaderCard}>
        <View style={styles.avatarRing}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(name || user.name).charAt(0).toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.displayName}>{name || user.name}</Text>
        <Text style={styles.email}>{user.email}</Text>
        {selectedSport ? (
          <View style={styles.sportTagPill}>
            <Text style={styles.sportTagText}>
              {selectedSport}
              {selectedPosition ? ` • ${selectedPosition}` : ''}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Athlete Stats */}
      <View style={styles.statsCard}>
        <View style={styles.statsHeaderRow}>
          <Text style={styles.statsTitle}>ESTATÍSTICAS DE ATLETA</Text>
          <View style={styles.attendancePill}>
            <Text style={styles.attendanceBadge}>Assiduidade {stats.attendanceRate}%</Text>
          </View>
        </View>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.totalGames}</Text>
            <Text style={styles.statLabel}>Jogos</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.totalWins}</Text>
            <Text style={styles.statLabel}>Vitórias</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.totalGoals}</Text>
            <Text style={styles.statLabel}>Gols</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.totalAssists}</Text>
            <Text style={styles.statLabel}>Assist.</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.primary }]}>{stats.mvpVotes}</Text>
            <Text style={styles.statLabel}>MVP</Text>
          </View>
        </View>
      </View>
    </>
  );

  const formAndActions = (
    <>
      {/* Cartao de Dados do Perfil */}
      <View style={styles.formCard}>
        <Text style={styles.cardSectionHeading}>DADOS E PREFERÊNCIAS</Text>
        <Input label="Nome" placeholder="Seu nome" value={name} onChangeText={setName} />
        <Input
          label="Região / Bairro"
          placeholder="Ex: Savassi - Belo Horizonte"
          value={region}
          onChangeText={setRegion}
        />

        <Text style={styles.sectionLabel}>Esporte Favorito</Text>
        <View style={styles.chipsWrapGrid}>
          {SPORTS.map((s) => (
            <TouchableOpacity
              key={s.sport}
              style={[styles.chip, selectedSport === s.sport && styles.chipSelected]}
              onPress={() => {
                setSelectedSport(s.sport);
                setSelectedPosition('');
              }}
              accessibilityRole="button"
              accessibilityLabel={s.sport}
              accessibilityState={{ selected: selectedSport === s.sport }}
            >
              <Text style={[styles.chipText, selectedSport === s.sport && styles.chipTextSelected]}>
                {s.sport}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {positions.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Posição Preferida</Text>
            <View style={styles.positionsGrid}>
              {positions.map((pos) => (
                <TouchableOpacity
                  key={pos}
                  style={[styles.positionChip, selectedPosition === pos && styles.chipSelected]}
                  onPress={() => setSelectedPosition(pos)}
                  accessibilityRole="button"
                  accessibilityLabel={pos}
                  accessibilityState={{ selected: selectedPosition === pos }}
                >
                  <Text style={[styles.positionText, selectedPosition === pos && styles.chipTextSelected]}>
                    {pos}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <Button
          title="Salvar Alterações"
          onPress={handleSave}
          loading={loading}
          style={{ marginTop: spacing.lg }}
        />
      </View>

      {/* Alteração de Senha */}
      <View style={styles.formCard}>
        <Text style={styles.cardSectionHeading}>SEGURANÇA — ALTERAR SENHA</Text>
        <Input
          label="Senha Atual"
          placeholder="Digite sua senha atual"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
        />
        <Input
          label="Nova Senha"
          placeholder="Mínimo 6 caracteres"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
        />
        <Button
          title="Atualizar Senha"
          onPress={handleChangePassword}
          loading={changingPassword}
          variant="outline"
          style={{ marginTop: spacing.xs }}
        />
      </View>

      <Button
        title="Sair da Conta"
        onPress={handleLogout}
        variant="outline"
        style={{ marginTop: spacing.sm }}
      />

      <Button
        title="Termos de Uso e Privacidade"
        onPress={() => setShowLegal(true)}
        variant="ghost"
        style={{ marginTop: spacing.xs }}
      />

      <TouchableOpacity
        style={styles.deleteAccountBtn}
        onPress={handleDeleteAccount}
        accessibilityRole="button"
        accessibilityLabel="Excluir Minha Conta e Dados (LGPD)"
      >
        <Text style={styles.deleteAccountText}>Excluir Minha Conta e Dados (LGPD)</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingHorizontal: pagePadding,
          paddingTop: topSpace,
          paddingBottom: isDesktop ? spacing.xxl : 100,
        },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={[styles.pageContainer, { maxWidth: containerMaxWidth }]}>
        <Text style={styles.title}>Seu Perfil</Text>

        {isDesktop ? (
          <View style={styles.desktopColumns}>
            <View style={styles.desktopLeftCol}>{identityAndStats}</View>
            <View style={styles.desktopRightCol}>{formAndActions}</View>
          </View>
        ) : (
          <>
            {identityAndStats}
            {formAndActions}
          </>
        )}
      </View>
      <LegalModal visible={showLegal} onClose={() => setShowLegal(false)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.sm,
    fontWeight: '600',
  },
  container: { flex: 1, backgroundColor: colors.background },
  content: {},
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
    flex: 1.25,
    minWidth: 0,
  },
  title: { fontSize: fonts.sizes.xxl, fontWeight: '900', color: colors.textPrimary, marginBottom: spacing.md },
  profileHeaderCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  avatarRing: {
    padding: 3,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: colors.primary,
    marginBottom: spacing.sm + 2,
  },
  avatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 30, fontWeight: '900', color: colors.textInverse },
  displayName: { fontSize: fonts.sizes.xl, fontWeight: '800', color: colors.textPrimary },
  email: { color: colors.textSecondary, fontSize: fonts.sizes.xs, marginTop: 2 },
  sportTagPill: {
    marginTop: spacing.sm,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  sportTagText: { color: colors.primary, fontSize: fonts.sizes.xs, fontWeight: '700' },
  statsCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  statsHeaderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  statsTitle: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  attendancePill: {
    backgroundColor: colors.successSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  attendanceBadge: {
    color: colors.success,
    fontSize: fonts.sizes.xs,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statBox: {
    alignItems: 'center',
    flex: 1,
    minWidth: '28%',
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  statValue: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.xl,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  statLabel: { color: colors.textMuted, fontSize: fonts.sizes.xs, marginTop: 2, fontWeight: '600' },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md + 2,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  cardSectionHeading: {
    color: colors.primary,
    fontSize: fonts.sizes.xs,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs,
    marginBottom: spacing.sm,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: spacing.xs,
  },
  horizontalScroll: { marginBottom: spacing.md, flexGrow: 0 },
  chipsWrapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    marginBottom: spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    minHeight: 38,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  chipEmoji: { fontSize: 18, marginRight: spacing.xs },
  chipText: { fontSize: fonts.sizes.xs, color: colors.textSecondary, fontWeight: '600' },
  chipTextSelected: { color: colors.primary, fontWeight: '800' },
  positionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  positionChip: {
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  positionText: { fontSize: fonts.sizes.xs, color: colors.textSecondary, fontWeight: '600' },
  deleteAccountBtn: {
    marginTop: spacing.lg,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  deleteAccountText: {
    color: colors.error,
    fontSize: fonts.sizes.xs,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
