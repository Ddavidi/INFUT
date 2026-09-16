export interface Region {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

// Coordenadas aproximadas de regiões de Belo Horizonte
export const REGIONS: Region[] = [
  { id: 'centro', name: 'Centro', latitude: -19.9190, longitude: -43.9386 },
  { id: 'savassi', name: 'Savassi', latitude: -19.9386, longitude: -43.9348 },
  { id: 'pampulha', name: 'Pampulha', latitude: -19.8583, longitude: -43.9723 },
  { id: 'barreiro', name: 'Barreiro', latitude: -19.9754, longitude: -44.0173 },
  { id: 'venda-nova', name: 'Venda Nova', latitude: -19.8149, longitude: -43.9678 },
  { id: 'zona-leste', name: 'Zona Leste', latitude: -19.9142, longitude: -43.8966 },
  { id: 'zona-oeste', name: 'Zona Oeste', latitude: -19.9482, longitude: -43.9760 },
  { id: 'zona-norte', name: 'Zona Norte', latitude: -19.8390, longitude: -43.9360 },
];
