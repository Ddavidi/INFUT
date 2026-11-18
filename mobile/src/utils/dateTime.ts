// Date & Duration helpers for Pelada start and automatic end times

const DURATION_PRESETS = [1, 1.5, 2, 2.5, 3];
export { DURATION_PRESETS };

export function parseDurationHours(raw: string | number | null | undefined): number {
  if (typeof raw === 'number') {
    return isNaN(raw) || raw <= 0 ? 2 : raw;
  }
  if (!raw) return 2;
  const parsed = parseFloat(String(raw).replace(',', '.'));
  if (isNaN(parsed) || parsed <= 0) return 2;
  return parsed;
}

export function calculateEndTimeText(startTimeHHMM: string, durationHoursRaw: string | number): string | null {
  const parts = startTimeHHMM.trim().split(':');
  if (parts.length !== 2) return null;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  const duration = parseDurationHours(durationHoursRaw);
  const totalMinutes = hours * 60 + minutes + Math.round(duration * 60);
  const endHours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const endMins = totalMinutes % 60;
  return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
}

export function formatPeladaSchedule(
  dateStr: string,
  durationHours?: number | null,
  includeYear = true
): string {
  const start = new Date(dateStr);
  if (isNaN(start.getTime())) return '';

  const day = start.getDate().toString().padStart(2, '0');
  const month = (start.getMonth() + 1).toString().padStart(2, '0');
  const year = start.getFullYear();
  const startH = start.getHours().toString().padStart(2, '0');
  const startM = start.getMinutes().toString().padStart(2, '0');

  const duration = durationHours && durationHours > 0 ? durationHours : 2;
  const end = new Date(start.getTime() + Math.round(duration * 60) * 60000);
  const endH = end.getHours().toString().padStart(2, '0');
  const endM = end.getMinutes().toString().padStart(2, '0');

  const datePart = includeYear ? `${day}/${month}/${year}` : `${day}/${month}`;
  const durationLabel = Number.isInteger(duration) ? `${duration}h` : `${String(duration).replace('.', ',')}h`;
  return `${datePart} • ${startH}:${startM} às ${endH}:${endM} (${durationLabel})`;
}
