// Tres valores da pelada: avulso (diarista), goleiro e mensalista
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Input } from '../ui/Input';
import { colors, fonts, spacing } from '../../constants/theme';
import { formatCurrencyInput, parseCurrency } from '../../utils/masks';

export interface PriceFieldsValue {
  diarista: string;
  goalkeeper: string;
  monthly: string;
}

interface Props {
  value: PriceFieldsValue;
  onChange: (next: PriceFieldsValue) => void;
}

export function PriceFields({ value, onChange }: Props) {
  const set = (patch: Partial<PriceFieldsValue>) => onChange({ ...value, ...patch });
  return (
    <View>
      <Text style={styles.heading}>Valores</Text>
      <View style={styles.row}>
        <View style={styles.col}>
          <Input
            label="Avulso"
            prefix="R$"
            mask="currency"
            value={value.diarista}
            onChangeText={(diarista) => set({ diarista })}
            hint="Por pelada"
          />
        </View>
        <View style={styles.col}>
          <Input
            label="Goleiro"
            prefix="R$"
            mask="currency"
            value={value.goalkeeper}
            onChangeText={(goalkeeper) => set({ goalkeeper })}
            hint="Vazio = não paga"
          />
        </View>
        <View style={styles.col}>
          <Input
            label="Mensalista"
            prefix="R$"
            mask="currency"
            value={value.monthly}
            onChangeText={(monthly) => set({ monthly })}
            hint="Vazio = igual ao avulso"
          />
        </View>
      </View>
    </View>
  );
}

export function priceFieldsFromPelada(p: {
  price?: number | null;
  priceGoalkeeper?: number | null;
  priceMonthly?: number | null;
  goalkeepersExempt?: boolean;
}): PriceFieldsValue {
  const goalkeeper =
    p.priceGoalkeeper !== null && p.priceGoalkeeper !== undefined
      ? p.priceGoalkeeper
      : p.goalkeepersExempt
        ? null
        : p.price ?? null;
  return {
    diarista: formatCurrencyInput(p.price ?? null),
    goalkeeper: goalkeeper && goalkeeper > 0 ? formatCurrencyInput(goalkeeper) : '',
    monthly: formatCurrencyInput(p.priceMonthly ?? null),
  };
}

export function priceFieldsToPayload(v: PriceFieldsValue) {
  const goalkeeper = parseCurrency(v.goalkeeper) ?? 0;
  return {
    price: parseCurrency(v.diarista),
    priceGoalkeeper: goalkeeper,
    priceMonthly: parseCurrency(v.monthly),
    goalkeepersExempt: goalkeeper <= 0,
  };
}

const styles = StyleSheet.create({
  heading: {
    color: colors.textSecondary,
    fontSize: fonts.sizes.xs,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  col: {
    flex: 1,
    minWidth: 120,
  },
});
