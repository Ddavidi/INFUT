// Helpers for direct invite deep-links on Web (?code=QUINTA)
import { Platform } from 'react-native';

export const APP_WEB_URL = 'https://infut.vercel.app';

export function buildInviteUrl(inviteCode: string): string {
  return `${APP_WEB_URL}/?code=${encodeURIComponent(inviteCode.trim().toUpperCase())}`;
}

export function getInviteCodeFromUrl(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code')?.trim().toUpperCase();
    return code && code.length >= 3 ? code : null;
  } catch {
    return null;
  }
}

export function clearInviteCodeFromUrl(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.history?.replaceState) {
    return;
  }
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has('code')) {
      url.searchParams.delete('code');
      const next = `${url.pathname}${url.search}${url.hash}`;
      window.history.replaceState({}, '', next || '/');
    }
  } catch {
    // ignore URL errors
  }
}
