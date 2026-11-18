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

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      showMessage('Erro', 'Preencha todos os campos');
      return;
    }

    if (password !== confirmPassword) {
      showMessage('Erro', 'As senhas não coincidem');
      return;
    }

    if (password.length < 6) {
      showMessage('Erro', 'A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      await signUp(name.trim(), email.trim(), password);
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

          <View style={styles.authCard}>
            <Input
              label="Nome"
              placeholder="Seu nome completo ou apelido"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
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
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <Input
              label="Confirmar Senha"
              placeholder="Repita a senha"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />

            <Button title="Cadastrar" onPress={handleRegister} loading={loading} style={{ marginTop: spacing.xs }} />

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
