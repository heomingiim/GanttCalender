// ─────────────────────────────────────────────────────────────
// 날짜 변환 유틸
//
// ★ 이 파일이 존재하는 이유 ★
// 백엔드가 받는 타입은 java.time.LocalDateTime 이라 "시간대(zone)" 개념이 없다.
//
// 자바스크립트의 Date.toISOString()은 값을 UTC로 "변환"해서 문자열을 만든다.
//     new Date(2026, 7, 12, 9, 0)  →  '2026-08-12T00:00:00.000Z'   (KST 09:00 = UTC 00:00)
//
// 문제는 서버가 이걸 거부하지 않는다는 것이다. Spring/Jackson은 뒤의 Z(오프셋)를
// 그냥 떼어내고 앞의 숫자만 LocalDateTime으로 받는다. 즉 09시 일정이 00시로,
// **에러 없이 9시간 어긋난 채 저장된다.** 400이 뜨면 차라리 금방 알아챌 텐데
// 조용히 틀리기 때문에 더 위험하다.
//
// 그래서 서버로 보내는 모든 날짜는 UTC 변환 없이 로컬 시각의 숫자를 그대로 찍는
// toLocalDateTimeString()을 거친다.
// ─────────────────────────────────────────────────────────────

const pad = (n) => String(n).padStart(2, '0');

/** Date → '2026-08-11T09:00:00' (서버 전송용. UTC 변환 없이 로컬 시각 그대로) */
export function toLocalDateTimeString(date) {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

/** Date → '2026-08-11' (LocalDate 필드 전송용: 프로젝트 시작일/종료일) */
export function toLocalDateString(date) {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 'YYYY-MM-DD' → Date (로컬 자정) */
export function parseDateOnly(dateStr) {
  if (!dateStr) return undefined;
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Date | 'YYYY-MM-DD...' → 'M/D' */
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

/** <input type="date"> 용 'YYYY-MM-DD' */
export function toDateInputValue(value) {
  if (!value) return '';
  return String(value).slice(0, 10);
}

/**
 * datetime-local input 값('2026-08-11T09:00') → 서버 전송 형식('...T09:00:00')
 * 빈 문자열이면 null을 반환한다 (서버에서 날짜 없는 작업을 허용하므로).
 */
export function fromDateTimeInputValue(value) {
  if (!value) return null;
  return value.length === 16 ? `${value}:00` : value;
}

/** date input 값 → 그대로. 빈 값은 null */
export function fromDateInputValue(value) {
  return value ? value : null;
}

/** 화면 표시용: '2026-08-11T09:00:00' → '2026-08-11 09:00' */
export function formatDateTime(value) {
  if (!value) return '-';
  return String(value).slice(0, 16).replace('T', ' ');
}

/** 화면 표시용: '2026-08-11' */
export function formatDate(value) {
  if (!value) return '-';
  return String(value).slice(0, 10);
}

/** 그 달의 1일 00:00:00 */
export function startOfMonth(year, month /* 1~12 */) {
  return new Date(year, month - 1, 1, 0, 0, 0);
}

/** 그 달의 마지막 날 23:59:59 */
export function endOfMonth(year, month /* 1~12 */) {
  return new Date(year, month, 0, 23, 59, 59);
}

/** 오늘 00:00:00 / 23:59:59 */
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

/** 두 값이 같은 날짜(Y-M-D)인지 */
export function isSameDay(a, b) {
  if (!a || !b) return false;
  return toLocalDateString(a) === toLocalDateString(b);
}
