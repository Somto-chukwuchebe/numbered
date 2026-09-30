/* Small helpers: ids, local-safe dates, formatting. */

export function uid(prefix = 'id') {
  return prefix + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
}

export function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

/* ---------- dates -----------------------------------------------------
   Every date in the app is a plain local 'YYYY-MM-DD' string. We never
   parse them with `new Date(str)` (that treats them as UTC and shifts a
   day in negative offsets) — always via fromKey().
   -------------------------------------------------------------------- */

export function toKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey() {
  return toKey(new Date());
}

export function addDays(key, n) {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

/** Whole days from a -> b (b - a). Both are date keys. */
export function daysBetween(a, b) {
  const ms = fromKey(b).setHours(12, 0, 0, 0) - fromKey(a).setHours(12, 0, 0, 0);
  return Math.round(ms / 86400000);
}

export function isValidKey(key) {
  if (typeof key !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  const d = fromKey(key);
  return !Number.isNaN(d.getTime()) && toKey(d) === key;
}

/** Inclusive list of date keys from start to end. */
export function dateRange(start, end) {
  const out = [];
  if (!isValidKey(start) || !isValidKey(end)) return out;
  let cur = start;
  let guard = 0;
  while (daysBetween(cur, end) >= 0 && guard++ < 20000) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

export function clampKey(key, min, max) {
  if (daysBetween(min, key) < 0) return min;
  if (daysBetween(key, max) < 0) return max;
  return key;
}

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function dowShort(key) {
  return DOW[fromKey(key).getDay()];
}

/** 0 = Sunday … 6 = Saturday */
export function fromKeyDow(key) {
  return fromKey(key).getDay();
}

/** 'Sat 8 Aug' */
export function fmtShort(key) {
  const d = fromKey(key);
  return `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
}

/** '8 Aug 2026' */
export function fmtMedium(key) {
  const d = fromKey(key);
  return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
}

/** '8 Aug' — for dense axes */
export function fmtAxis(key) {
  const d = fromKey(key);
  return `${d.getDate()} ${MON[d.getMonth()]}`;
}

/** Monday-start week key, e.g. '2026-08-03'. */
export function weekStart(key) {
  const d = fromKey(key);
  const shift = (d.getDay() + 6) % 7; // Mon = 0
  d.setDate(d.getDate() - shift);
  return toKey(d);
}

export function weekLabel(startKey) {
  return `${fmtAxis(startKey)} – ${fmtAxis(addDays(startKey, 6))}`;
}

/* ---------- numbers -------------------------------------------------- */

export function fmtInt(n) {
  return Math.round(n || 0).toLocaleString('en-US');
}

/** 95 -> '1h 35m', 40 -> '40m', 0 -> '0m' */
export function fmtDuration(mins) {
  const m = Math.max(0, Math.round(mins || 0));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

/** Compact for stat tiles: 1284 -> '1,284', 12900 -> '12.9K' */
export function fmtCompact(n) {
  const v = Math.round(n || 0);
  if (Math.abs(v) >= 1000000) return (v / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (Math.abs(v) >= 10000) return (v / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return v.toLocaleString('en-US');
}

export function pct(part, whole) {
  if (!whole) return 0;
  return clamp((part / whole) * 100, 0, 100);
}

export function fmtPct(n, digits = 0) {
  return `${(n || 0).toFixed(digits)}%`;
}

export function csvEscape(v) {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function toCsv(rows) {
  return rows.map((r) => r.map(csvEscape).join(',')).join('\r\n') + '\r\n';
}

export function download(filename, text, mime = 'text/plain') {
  const blob = new Blob([text], { type: mime + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function slug(s) {
  return (s || 'export')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'export';
}
