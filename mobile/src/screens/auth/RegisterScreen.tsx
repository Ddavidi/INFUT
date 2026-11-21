// Register Screen
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { LegalModal } from '../../components/ui/LegalModal';
import { useAuth } from '../../hooks/useAuth';
import { colors, fonts, spacing, borderRadius, layout, shadows } from '../../constants/theme';
import { showMessage } from '../../utils/alerts';
import { useResponsive } from '../../hooks/useResponsive';
import { SPORTS, getPositionsForSport } from '../../constants/sports';
import {
  EMPTY_PROFILE_EXTRAS,
  ProfileExtrasFields,
  ProfileExtrasValue,
  profileExtrasToPayload,
} from '../../components/profile/ProfileExtrasFields';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

export function RegisterScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const { pagePadding } = useResponsive();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [sport, setSport] = useState('');
  const [position, setPosition] = useState('');
  const [extras, setExtras] = useState<ProfileExtrasValue>(EMPTY_PROFILE_EXTRAS);

  function validateStepOne(): boolean {
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      showMessage('Erro', 'Preencha todos os campos');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      showMessage('E-mail inválido', 'Confira o e-mail digitado.');
      return false;
    }
    if (password !== confirmPassword) {
      showMessage('Erro', 'As senhas não coincidem');
      return false;
    }
    if (password.length < 6) {
      showMessage('Erro', 'A senha deve ter pelo menos 6 caracteres');
      return false;
    }
    return true;
  }

  function handleNext() {
    if (validateStepOne()) setStep(2);
  }

  async function handleRegister() {
    if (!validateStepOne()) {
      setStep(1);
      return;
    }

    setLoading(true);
    try {
      await signUp(name.trim(), email.trim().toLowerCase(), password, {
        ...profileExtrasToPayload(extras),
        sport: sport || null,
        position: position || null,
      });
    } catch (error: any) {
      const msg = error.response?.data?.error || 'Erro ao criar conta';
      showMessage('Erro', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingHorizontal: pagePadding }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.authContainer}>
          <View style={styles.header}>
            <View style={styles.logoEmblem}>
              <Text style={styles.emoji}>⚽</Text>
            </View>
            <Text style={styles.title}>Criar Conta</Text>
            <Text style={styles.subtitle}>Junte-se a peladas da sua região no INFUT</Text>
          </View>

          <View style={styles.stepper}>
            <View style={[styles.stepDot, styles.stepDotActive]} />
            <View style={[styles.stepDot, step === 2 && styles.stepDotActive]} />
          </View>

          {step === 1 ? (
            <View style={styles.authCard}>
              <Text style={styles.stepTitle}>1. Dados de acesso</Text>
              <Input
                label="Nome"
                placeholder="Seu nome completo ou apelido"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                maxLength={60}
              />
              <Input
                label="E-mail"
                placeholder="seu@email.com"
                value={email}
                onChangeText={(v) => setEmail(v.replace(/\s/g, ''))}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={120}
              />
              <Input
                label="Senha"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                maxLength={64}
              />
              <Input
                label="Confirmar Senha"
                placeholder="Repita a senha"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                maxLength={64}
                error={
                  confirmPassword && password !== confirmPassword ? 'As senhas não coincidem' : undefined
                }
              />

              <Button title="Continuar" onPress={handleNext} style={{ marginTop: spacing.xs }} />

              <TouchableOpacity onPress={() => setShowLegal(true)} style={styles.legalLink}>
                <Text style={styles.legalLinkText}>
                  Ao cadastrar, você concorda com os Termos de Uso e Privacidade
                </Text>
              </TouchableOpacity>

              <Button
                title="Já tenho conta"
                onPress={() => navigation.goBack()}
                variant="ghost"
                style={{ marginTop: spacing.xs }}
              />
            </View>
          ) : (
            <View style={styles.authCard}>
              <Text style={styles.stepTitle}>2. Complete seu perfil</Text>
              <Text style={styles.stepSubtitle}>Opcional — dá pra preencher depois no Perfil.</Text>

              <Text style={styles.sectionLabel}>Esporte principal</Text>
              <View style={styles.chipsWrap}>
                {SPORTS.map((s) => {
                  const selected = sport === s.sport;
                  return (
                    <TouchableOpacity
                      key={s.sport}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => {
                        setSport(selected ? '' : s.sport);
                        setPosition('');
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{s.sport}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {sport ? (
                <>
                  <Text style={styles.sectionLabel}>Posição</Text>
                  <View style={styles.chipsWrap}>
                    {getPositionsForSport(sport).map((pos) => {
                      const selected = position === pos;
                      return (
                        <TouchableOpacity
                          key={pos}
                          style={[styles.chip, selected && styles.chipSelected]}
                          onPress={() => setPosition(selected ? '' : pos)}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                        >
                          <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{pos}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              ) : null}

              <ProfileExtrasFields name={name} sport={sport} value={extras} onChange={setExtras} />

              <Button title="Criar conta" onPress={handleRegister} loading={loading} />
              <Button
                title="Voltar"
                onPress={() => setStep(1)}
                variant="ghost"
                style={{ marginTop: spacing.xs }}
              />
            </View>
          )}
        </View>
      </ScrollView>
      <LegalModal visible={showLegal} onClose={() => setShowLegal(false)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  authContainer: {
    width: '100%',
    maxWidth: layout.authMaxWidth,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoEmblem: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    ...shadows.card,
  },
  emoji: {
    fontSize: 32,
  },
  title: {
    fontSize: fonts.sizes.xxl,
    fontWeight: '900',
    color: colors.textPrimary,
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
  stepper: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  stepDot: {
    width: 28,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  stepDotActive: {
    backgroundColor: colors.primary,
  },
  stepTitle: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.md,
    fontWeight: '800',
    marginBottom: spacing.md,
  },
  stepSubtitle: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
    marginBottom: spacing.md,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    minHeight: 36,
    justifyContent: 'center',
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: colors.primary,
    fontWeight: '800',
  },
  legalLink: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  legalLinkText: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
});
