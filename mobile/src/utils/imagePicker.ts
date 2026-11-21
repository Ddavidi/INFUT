// Escolhe uma imagem da galeria, corta em quadrado e reduz para enviar como data URL leve
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { showMessage } from './alerts';

/**
 * Abre a galeria e devolve "data:image/jpeg;base64,..." (~10-30 KB) ou null se cancelado.
 * @param size lado final da imagem em pixels
 */
export async function pickSquarePhoto(size = 256): Promise<string | null> {
  try {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted && permission.canAskAgain === false) {
      showMessage('Permissão necessária', 'Libere o acesso às fotos nas configurações do aparelho.');
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (result.canceled || !result.assets?.length) return null;
    const asset = result.assets[0];

    const side = Math.min(asset.width || size, asset.height || size);
    const actions: any[] = [];
    if (asset.width && asset.height && asset.width !== asset.height) {
      actions.push({
        crop: {
          originX: Math.floor((asset.width - side) / 2),
          originY: Math.floor((asset.height - side) / 2),
          width: side,
          height: side,
        },
      });
    }
    actions.push({ resize: { width: size, height: size } });

    const manipulated = await manipulateAsync(asset.uri, actions, {
      compress: 0.72,
      format: SaveFormat.JPEG,
      base64: true,
    });

    if (!manipulated.base64) {
      showMessage('Erro', 'Não foi possível processar a imagem.');
      return null;
    }
    return `data:image/jpeg;base64,${manipulated.base64}`;
  } catch (error) {
    console.warn('pickSquarePhoto failed', error);
    showMessage('Erro', 'Não foi possível abrir a galeria de fotos.');
    return null;
  }
}
