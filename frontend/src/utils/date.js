// toISOString()은 UTC로 변환하므로 KST 기준 LocalDateTime 서버에 보내면 9시간 어긋남.
// 서버로 보내는 날짜는 UTC 변환 없이 로컬 시각 그대로 직렬화하는 함수를 거친다.

const pad = (n) => String(n).padStart(2, '0');

// Date → '2026-08-11T09:00:00' (서버 전송용)
export function toLocalDateTimeString(date) {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

// Date → 'YYYY-MM-DD' (LocalDate 필드 전송용)
export function toLocalDateString(date) {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 'YYYY-MM-DD' → Date (로컬 자정)
export function parseDateOnly(dateStr) {
  if (!dateStr) return undefined;
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Date | 'YYYY-MM-DD...' → 'M/D'
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

// <input type="date"> 용 'YYYY-MM-DD'
export function toDateInputValue(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

// datetime-local input 값 → 서버 전송 형식. 빈 값은 null
export function fromDateTimeInputValue(value) {
  if (!value) return null;
  return value.length === 16 ? `${value}:00` : value;
}

// date input 값 → 그대로. 빈 값은 null
export function fromDateInputValue(value) {
  return value ? value : null;
}

// '2026-08-11T09:00:00' → '2026-08-11 09:00'
export function formatDateTime(value) {
  if (!value) return '-';
  return String(value).slice(0, 16).replace('T', ' ');
}

// '2026-08-11' 포맷으로 표시
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

// 두 값이 같은 날(Y-M-D)인지
export function isSameDay(a, b) {
  if (!a || !b) return false;
  return toLocalDateString(a) === toLocalDateString(b);
}
