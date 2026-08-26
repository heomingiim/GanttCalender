// toISOString()은 UTC 변환이 일어나므로 로컬 시각 그대로 직렬화
const pad = (n) => String(n).padStart(2, '0');

export function toLocalDateTimeString(date) {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

export function toLocalDateString(date) {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDateOnly(dateStr) {
  if (!dateStr) return undefined;
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatShortDate(value) {
  if (!value) return '-';
  const dateStr = typeof value === 'string' ? value : toLocalDateString(value);
  const [, m, d] = dateStr.slice(0, 10).split('-');
  return `${Number(m)}/${Number(d)}`;
}

export function toDateTimeInputValue(value) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

export function toDateInputValue(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

export function fromDateTimeInputValue(value) {
  if (!value) return null;
  return value.length === 16 ? `${value}:00` : value;
}

export function fromDateInputValue(value) {
  return value ? value : null;
}

export function formatDateTime(value) {
  if (!value) return '-';
  return String(value).slice(0, 16).replace('T', ' ');
}

export function formatDate(value) {
  if (!value) return '-';
  return String(value).slice(0, 10);
}

export function startOfMonth(year, month /* 1~12 */) {
  return new Date(year, month - 1, 1, 0, 0, 0);
}

export function endOfMonth(year, month /* 1~12 */) {
  return new Date(year, month, 0, 23, 59, 59);
}

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 0);
  return d;
}

export function isSameDay(a, b) {
  if (!a || !b) return false;
  return toLocalDateString(a) === toLocalDateString(b);
}
