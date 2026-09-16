import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getPeladaById } from '../../services/peladaService';
import { Pelada } from '../../types';
import { REGIONS } from '../../constants/regions';
import { colors, fonts, spacing } from '../../constants/theme';

type Props = NativeStackScreenProps<any, 'PeladaMap'>;

export function PeladaMapScreen({ route, navigation }: Props) {
  const { peladaId } = route.params;
  const [pelada, setPelada] = useState<Pelada | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getPeladaById(peladaId);
        setPelada(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [peladaId]);

  if (loading || !pelada) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Filtrar apenas os confirmados que possuem região válida
  const confirmedWithRegion = (pelada.participants || [])
    .filter(p => p.status === 'CONFIRMED' && p.user.region)
    .map(p => {
      const regionData = REGIONS.find(r => r.id === p.user.region);
      return {
        ...p,
        regionData
      };
    })
    .filter(p => p.regionData);

  // Calcular centro do mapa ou usar o centro de BH como fallback
  const initialRegion = confirmedWithRegion.length > 0 
    ? {
        latitude: confirmedWithRegion.reduce((sum, p) => sum + p.regionData!.latitude, 0) / confirmedWithRegion.length,
        longitude: confirmedWithRegion.reduce((sum, p) => sum + p.regionData!.longitude, 0) / confirmedWithRegion.length,
        latitudeDelta: 0.15,
        longitudeDelta: 0.15,
      }
    : {
        latitude: -19.9190, // Centro de BH
        longitude: -43.9386,
        latitudeDelta: 0.15,
        longitudeDelta: 0.15,
      };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>{'<'} Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Mapa de Jogadores</Text>
        <Text style={styles.subtitle}>{pelada.title}</Text>
      </View>

      <MapView 
        style={styles.map} 
        initialRegion={initialRegion}
      >
        {confirmedWithRegion.map((p) => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.regionData!.latitude, longitude: p.regionData!.longitude }}
            title={p.user.name}
            description={`Região: ${p.regionData!.name}`}
            pinColor={colors.primary}
          />
        ))}
      </MapView>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Mostrando {confirmedWithRegion.length} jogador(es) que definiram região.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: spacing.lg, paddingTop: 60, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.borderLight },
  backButton: { marginBottom: spacing.sm },
  backButtonText: { color: colors.primary, fontWeight: '600', fontSize: fonts.sizes.md },
  title: { fontSize: fonts.sizes.xl, fontWeight: '800', color: colors.textPrimary },
  subtitle: { fontSize: fonts.sizes.md, color: colors.textSecondary },
  map: { flex: 1 },
  footer: { padding: spacing.md, backgroundColor: colors.surface, alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.borderLight },
  footerText: { fontSize: fonts.sizes.sm, color: colors.textMuted },
});
