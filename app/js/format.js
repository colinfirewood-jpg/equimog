// Dates stockées en « AAAA-MM-JJ », affichées en « JJ/MM/AAAA ».

const pad = (n) => String(n).padStart(2, '0');

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 2026-11-25 → 25/11/2026 */
export function day(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** Valide « JJ/MM/AAAA » : date réelle, après 1900, pas dans le futur. */
export function validDob(text) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
  if (!m) return false;
  const [d, mo, y] = [+m[1], +m[2], +m[3]];
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return false;
  return y >= 1900 && date <= new Date();
}

/** Met en forme la saisie d'une date : 02071938 → 02/07/1938 */
export function dobInput(text) {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  let out = '';
  for (let i = 0; i < digits.length; i++) {
    if (i === 2 || i === 4) out += '/';
    out += digits[i];
  }
  return out;
}

/** 0.52 → « 0,52 » */
export function vm(value) {
  return value == null ? '—' : value.toFixed(2).replace('.', ',');
}

export function parseVm(text) {
  const t = String(text).trim().replace(',', '.');
  if (!t) return null;
  const v = Number(t);
  return Number.isFinite(v) && v >= 0 && v < 10 ? v : null;
}

/** Garde chiffres et un seul séparateur décimal. */
export function vmInput(text) {
  let out = '';
  let sep = false;
  for (const c of text) {
    if (/\d/.test(c)) out += c;
    else if ((c === ',' || c === '.') && !sep) { out += ','; sep = true; }
  }
  return out.slice(0, 5);
}

export const signed = (n) => (n > 0 ? `+${n}` : `${n}`);

export const plural = (n, one, many) => `${n} ${n > 1 ? many : one}`;

export function fold(s) {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** Échappe un texte saisi avant de l'insérer dans la page. */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
