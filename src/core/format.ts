/** Display helpers shared by components and scripts. Dates are plain `YYYY-MM-DD` strings. */

const money = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0, minimumFractionDigits: 0 });

/** 179 → "$179"; 1284 → "$1,284". Whole dollars only. */
export function formatMoney(amount: number): string {
  return money.format(Math.round(amount)).replace(/^A\$/, '$');
}

const dayFormat = new Intl.DateTimeFormat('en-AU', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

/** "2026-10-09" → "Fri 9 Oct". */
export function formatDay(date: string): string {
  const parts = Object.fromEntries(dayFormat.formatToParts(new Date(`${date}T00:00:00Z`)).map((p) => [p.type, p.value]));
  return `${parts.weekday} ${parts.day} ${parts.month}`;
}

/** Today's date in a time zone, as `YYYY-MM-DD` (en-CA formats dates that way). */
export function todayIn(timeZone: string, now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** "07 5550 1234" → "tel:+61755501234". */
export function formatPhoneHref(phone: string): string {
  return `tel:+61${phone.replace(/\D/g, '').replace(/^0/, '')}`;
}

/** "0491570110" → "0491 570 110"; "0755501234" → "07 5550 1234". Unknown shapes are returned unchanged. */
export function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, '');
  if (/^04\d{8}$/.test(d)) return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  if (/^0[2378]\d{8}$/.test(d)) return `${d.slice(0, 2)} ${d.slice(2, 6)} ${d.slice(6)}`;
  return raw;
}

/** "2026-10-05T09:02:00+10:00" → "Mon 5 Oct, 9:02am" in the given time zone. */
export function formatDateTime(iso: string, timeZone: string): string {
  const d = new Date(iso);
  const date = formatDay(todayIn(timeZone, d));
  const time = new Intl.DateTimeFormat('en-AU', { timeZone, hour: 'numeric', minute: '2-digit', hour12: true })
    .format(d)
    .replace(/\s/g, '')
    .toLowerCase();
  return `${date}, ${time}`;
}

/** "+10:00" / "+11:00": the time zone's UTC offset at that moment. */
export function utcOffset(at: Date, timeZone: string): string {
  const name = new Intl.DateTimeFormat('en-AU', { timeZone, timeZoneName: 'longOffset' })
    .formatToParts(at)
    .find((p) => p.type === 'timeZoneName')?.value;
  const offset = name?.replace('GMT', '') ?? '';
  return offset === '' ? '+00:00' : offset;
}

/** A moment as local ISO time with its offset: "2026-10-05T09:00:00+10:00". */
export function zonedIso(at: Date, timeZone: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${utcOffset(at, timeZone)}`;
}
