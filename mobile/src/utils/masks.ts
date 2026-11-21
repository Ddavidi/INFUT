// Mascaras de digitacao para os campos do app (datas, horas, dinheiro, numeros, @instagram)

export type MaskType =
  | 'date' // DD/MM/AAAA
  | 'time' // HH:MM
  | 'currency' // 1.234,56
  | 'integer' // so digitos
  | 'decimal' // 1,5
  | 'instagram' // @usuario
  | 'inviteCode'; // ABC123

const onlyDigits = (value: string) => value.replace(/\D/g, '');

export function maskDate(value: string): string {
  const d = onlyDigits(value).slice(0, 8);
  let day = d.slice(0, 2);
  let month = d.slice(2, 4);
  const year = d.slice(4, 8);

  // Corrige enquanto digita: dia 4..9 vira 04..09, mes 2..9 vira 02..09
  if (day.length === 1 && Number(day) > 3) day = `0${day}`;
  if (day.length === 2 && Number(day) > 31) day = '31';
  if (day === '00') day = '01';
  if (month.length === 1 && Number(month) > 1) month = `0${month}`;
  if (month.length === 2 && Number(month) > 12) month = '12';
  if (month === '00') month = '01';

  if (!month) return day;
  if (!year) return `${day}/${month}`;
  return `${day}/${month}/${year}`;
}

export function maskTime(value: string): string {
  const d = onlyDigits(value).slice(0, 4);
  let hours = d.slice(0, 2);
  let minutes = d.slice(2, 4);
  if (hours.length === 1 && Number(hours) > 2) hours = `0${hours}`;
  if (hours.length === 2 && Number(hours) > 23) hours = '23';
  if (minutes.length === 1 && Number(minutes) > 5) minutes = `0${minutes}`;
  if (!minutes) return hours;
  return `${hours}:${minutes}`;
}

/** Dinheiro em centavos: digitar 1500 => "15,00" */
export function maskCurrency(value: string): string {
  const d = onlyDigits(value).replace(/^0+/, '').slice(0, 8);
  if (!d) return '';
  const cents = d.padStart(3, '0');
  const intPart = cents.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${intPart},${cents.slice(-2)}`;
}

export function maskInteger(value: string, maxDigits = 3): string {
  return onlyDigits(value).slice(0, maxDigits);
}

export function maskDecimal(value: string, maxIntDigits = 2, maxFractionDigits = 1): string {
  const cleaned = value.replace(/\./g, ',').replace(/[^\d,]/g, '');
  const [intRaw, ...rest] = cleaned.split(',');
  const intPart = intRaw.slice(0, maxIntDigits);
  if (rest.length === 0) return intPart;
  const fraction = rest.join('').slice(0, maxFractionDigits);
  return `${intPart || '0'},${fraction}`;
}

export function maskInstagram(value: string): string {
  const handle = value
    .replace(/\s/g, '')
    .replace(/^@+/, '')
    .replace(/[^A-Za-z0-9._]/g, '')
    .slice(0, 30)
    .toLowerCase();
  return handle ? `@${handle}` : '';
}

export function maskInviteCode(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 12);
}

export function applyMask(mask: MaskType, value: string): string {
  switch (mask) {
    case 'date':
      return maskDate(value);
    case 'time':
      return maskTime(value);
    case 'currency':
      return maskCurrency(value);
    case 'integer':
      return maskInteger(value);
    case 'decimal':
      return maskDecimal(value);
    case 'instagram':
      return maskInstagram(value);
    case 'inviteCode':
      return maskInviteCode(value);
    default:
      return value;
  }
}

export const MASK_DEFAULTS: Record<
  MaskType,
  { keyboardType: 'default' | 'number-pad' | 'decimal-pad' | 'numeric'; maxLength?: number; placeholder?: string; autoCapitalize?: 'none' | 'characters' }
> = {
  date: { keyboardType: 'number-pad', maxLength: 10, placeholder: 'DD/MM/AAAA' },
  time: { keyboardType: 'number-pad', maxLength: 5, placeholder: 'HH:MM' },
  currency: { keyboardType: 'number-pad', maxLength: 12, placeholder: '0,00' },
  integer: { keyboardType: 'number-pad', maxLength: 3 },
  decimal: { keyboardType: 'decimal-pad', maxLength: 4 },
  instagram: { keyboardType: 'default', maxLength: 31, placeholder: '@seuperfil', autoCapitalize: 'none' },
  inviteCode: { keyboardType: 'default', maxLength: 12, autoCapitalize: 'characters' },
};

// ---------- Conversoes / validacoes ----------

/** "15,00" -> 15 ; "" -> null */
export function parseCurrency(value: string): number | null {
  if (!value || !value.trim()) return null;
  const n = Number(value.replace(/\./g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
}

/** 15 -> "15,00" ; null -> "" */
export function formatCurrencyInput(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '';
  return maskCurrency(Math.round(value * 100).toString());
}

export function formatBRL(value: number | null | undefined): string {
  const n = value || 0;
  return `R$ ${n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

export function parseIntOrNull(value: string): number | null {
  const d = onlyDigits(value);
  return d ? parseInt(d, 10) : null;
}

/**
 * Converte "DD/MM/AAAA" + "HH:MM" em Date valida (rejeita 31/02, 25:00 etc.).
 * Retorna null quando invalido.
 */
export function parseDateTimeBR(date: string, time: string): Date | null {
  const dm = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date.trim());
  const tm = /^(\d{2}):(\d{2})$/.exec(time.trim());
  if (!dm || !tm) return null;
  const day = Number(dm[1]);
  const month = Number(dm[2]);
  const year = Number(dm[3]);
  const hours = Number(tm[1]);
  const minutes = Number(tm[2]);
  if (year < 2000 || year > 2100 || hours > 23 || minutes > 59) return null;
  const result = new Date(year, month - 1, day, hours, minutes);
  if (
    result.getFullYear() !== year ||
    result.getMonth() !== month - 1 ||
    result.getDate() !== day
  ) {
    return null;
  }
  return result;
}

export function isValidDateBR(date: string): boolean {
  return parseDateTimeBR(date, '00:00') !== null;
}

export function isValidTime(time: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time.trim());
}

export function formatDateBR(d: Date): string {
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, '0')}/${d.getFullYear()}`;
}

export function formatTimeHHMM(d: Date): string {
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export function isValidHttpUrl(value: string): boolean {
  return /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(value.trim());
}
