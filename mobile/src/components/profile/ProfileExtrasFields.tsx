// Campos extras do perfil: foto, Instagram, time do coracao e idolo do esporte
import React from 'react';
import { View } from 'react-native';
import { Input } from '../ui/Input';
import { PhotoPicker } from '../ui/PhotoPicker';

export interface ProfileExtrasValue {
  photoUrl: string | null;
  instagram: string;
  favoriteTeam: string;
  idol: string;
}

export const EMPTY_PROFILE_EXTRAS: ProfileExtrasValue = {
  photoUrl: null,
  instagram: '',
  favoriteTeam: '',
  idol: '',
};

interface Props {
  name: string;
  sport?: string | null;
  value: ProfileExtrasValue;
  onChange: (next: ProfileExtrasValue) => void;
}

export function ProfileExtrasFields({ name, sport, value, onChange }: Props) {
  const set = (patch: Partial<ProfileExtrasValue>) => onChange({ ...value, ...patch });
  const idolLabel = sport ? `Ídolo no ${sport.toLowerCase()}` : 'Ídolo do seu esporte';

  return (
    <View>
      <PhotoPicker name={name} value={value.photoUrl} onChange={(photoUrl) => set({ photoUrl })} />
      <Input
        label="Instagram"
        mask="instagram"
        value={value.instagram}
        onChangeText={(instagram) => set({ instagram })}
        autoCorrect={false}
        hint="Só o seu @, sem o link."
      />
      <Input
        label="Time do coração"
        placeholder="Ex: Cruzeiro"
        value={value.favoriteTeam}
        onChangeText={(favoriteTeam) => set({ favoriteTeam })}
        maxLength={60}
        autoCapitalize="words"
      />
      <Input
        label={idolLabel}
        placeholder="Ex: Ronaldo Fenômeno"
        value={value.idol}
        onChangeText={(idol) => set({ idol })}
        maxLength={60}
        autoCapitalize="words"
      />
    </View>
  );
}

/** Converte os campos para o payload da API (strings vazias viram null). */
export function profileExtrasToPayload(value: ProfileExtrasValue) {
  return {
    photoUrl: value.photoUrl,
    instagram: value.instagram.replace(/^@/, '').trim() || null,
    favoriteTeam: value.favoriteTeam.trim() || null,
    idol: value.idol.trim() || null,
  };
}
