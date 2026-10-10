const timeFmt = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' });
const dayFmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
const dayYearFmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
const shortFmt = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' });

const startOfDay = (ts: number) => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const DAY = 24 * 60 * 60 * 1000;

export const formatTime = (ts: number) => timeFmt.format(ts);

export const dayKey = (ts: number) => startOfDay(ts);

export function formatDay(ts: number, now = Date.now()): string {
  const diff = startOfDay(now) - startOfDay(ts);
  if (diff === 0) return 'Сегодня';
  if (diff === DAY) return 'Вчера';
  const sameYear = new Date(ts).getFullYear() === new Date(now).getFullYear();
  return (sameYear ? dayFmt : dayYearFmt).format(ts);
}

export function formatListTime(ts: number, now = Date.now()): string {
  return startOfDay(ts) === startOfDay(now) ? formatTime(ts) : shortFmt.format(ts);
}

export function initials(title: string): string {
  const letters = title
    .split(/\s+/)
    .map((w) => w.match(/\p{L}/u)?.[0] ?? '')
    .filter(Boolean)
    .slice(0, 2)
    .join('');
  return letters ? letters.toUpperCase() : '#';
}

/** Стабильный оттенок аватара по id чата. */
export function hueFor(id: string): number {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}
