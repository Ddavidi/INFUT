// Reusable Terms of Use & Privacy Policy Modal (LGPD & Google Play Store compliance)
import React from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { colors, fonts, spacing, borderRadius, layout, shadows, themed } from '../../constants/theme';

interface LegalModalProps {
  visible: boolean;
  onClose: () => void;
}

export function LegalModal({ visible, onClose }: LegalModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Termos de Uso e Privacidade</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtnBox}
              accessibilityRole="button"
              accessibilityLabel="Fechar termos de uso"
            >
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator>
            <Text style={styles.heading}>1. Coleta e Uso de Dados (LGPD)</Text>
            <Text style={styles.paragraph}>
              O INFUT coleta apenas os dados essenciais para funcionamento das peladas: nome,
              e-mail, esporte favorito, posição de jogo e região informada voluntariamente. Esses
              dados permitem organizar listas de presença, sorteios equilibrados de equipes,
              estatísticas esportivas e descoberta regional de jogos.
            </Text>

            <Text style={styles.heading}>2. Compartilhamento de Informações</Text>
            <Text style={styles.paragraph}>
              Seu nome, posição e confirmação de presença ficam visíveis apenas aos participantes das
              peladas em que você ingressar ou nos rankings internos da plataforma. Não vendemos nem
              compartilhamos dados pessoais com terceiros para fins publicitários.
            </Text>

            <Text style={styles.heading}>3. Pagamentos via Pix</Text>
            <Text style={styles.paragraph}>
              O INFUT atua apenas como facilitador visual exibindo a chave Pix cadastrada pelo
              organizador da pelada e permitindo o controle manual de baixa. Toda transação
              financeira ocorre diretamente entre os usuários nos aplicativos de seus respectivos
              bancos.
            </Text>

            <Text style={styles.heading}>4. Exclusão de Conta e Direitos do Titular</Text>
            <Text style={styles.paragraph}>
              Em conformidade com a LGPD e com as diretrizes da Google Play Store, você pode excluir
              sua conta e todos os seus dados pessoais permanentemente a qualquer momento através de
              Perfil &gt; Excluir Minha Conta e Dados (LGPD).
            </Text>

            <Text style={styles.heading}>5. Regras de Convivência Esportiva</Text>
            <Text style={styles.paragraph}>
              Os participantes comprometem-se a respeitar os prazos de desistência definidos por
              cada organizador. Cancelamentos de última hora fora do prazo podem impactar seu
              Índice de Assiduidade dentro do aplicativo.
            </Text>
          </ScrollView>

          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Entendi e Fechar"
          >
            <Text style={styles.confirmBtnText}>Entendi e Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = themed(() => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: layout.maxWidth,
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: '85%',
    padding: spacing.lg,
    ...shadows.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.lg,
    fontWeight: '800',
    flex: 1,
    minWidth: 0,
  },
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
  closeBtn: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.lg,
    fontWeight: '700',
  },
  body: {
    marginBottom: spacing.md,
  },
  heading: {
    color: colors.textPrimary,
    fontSize: fonts.sizes.sm,
    fontWeight: '700',
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  paragraph: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs,
    lineHeight: 19,
    marginBottom: spacing.xs,
  },
  confirmBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    minHeight: 48,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: colors.textInverse,
    fontWeight: '800',
    fontSize: fonts.sizes.sm,
  },
}));
