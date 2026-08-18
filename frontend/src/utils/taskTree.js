// 백엔드 TaskTreeResponse(재귀 children 구조) ↔ 화면에서 쓰기 좋은 1차원 배열 변환.
//
// 서버가 주는 모양:
//   [{ id:1, title:'설계', children:[ { id:2, title:'DB 설계', children:[] } ] }]
// 표/간트에서 필요한 모양:
//   [{ id:1, depth:0, ... }, { id:2, depth:1, ... }]
// 트리 구조 그대로는 <table>에 한 줄씩 못 그리기 때문에 depth를 들고 평탄화한다.

import { toLocalDateString } from './date';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * 트리 → 평탄화 배열. 각 노드에 depth(들여쓰기 단계)와 hasChildren을 붙인다.
 * 재귀 함수의 기본형: "나를 담고, 자식들에 대해 나 자신을 다시 호출"
 */
export function flattenTree(nodes, depth = 0, acc = []) {
  if (!Array.isArray(nodes)) return acc;
  for (const node of nodes) {
    const children = node.children ?? [];
    acc.push({ ...node, depth, hasChildren: children.length > 0 });
    flattenTree(children, depth + 1, acc); // ← 재귀
  }
  return acc;
}

/** 트리 전체 노드 수 */
export function countTree(nodes) {
  return flattenTree(nodes).length;
}

/** flattenTree 결과에 계층 번호(displayNo: "1", "1.1"...)와 소요일수(days)를 붙인다 */
export function withDisplayNumbers(flatTasks) {
  const counters = [];
  return flatTasks.map((t) => {
    counters.length = t.depth + 1;
    counters[t.depth] = (counters[t.depth] ?? 0) + 1;
    const displayNo = counters.slice(0, t.depth + 1).join('.');

    let days = null;
    if (t.startDate && t.endDate) {
      const start = new Date(toLocalDateString(t.startDate));
      const end = new Date(toLocalDateString(t.endDate));
      days = Math.round((end - start) / MS_PER_DAY) + 1;
    }

    return { ...t, displayNo, days };
  });
}

/** 기간을 "N주차" 그룹과 날짜 컬럼(days)으로 변환한다. 주말도 포함한다. */
export function buildWorkdayColumns(rangeStart, rangeEnd) {
  if (!rangeStart || !rangeEnd) return { days: [], weeks: [] };

  const start = new Date(toLocalDateString(rangeStart));
  const end = new Date(toLocalDateString(rangeEnd));
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return { days: [], weeks: [] };
  }

  const days = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const day = cursor.getDay();
    days.push({
      date: new Date(cursor),
      label: `${cursor.getMonth() + 1}/${cursor.getDate()}`,
      weekend: day === 0 || day === 6,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  const weeks = [];
  let weekNo = 0;
  let lastWeekKey = null;
  for (const d of days) {
    const monday = new Date(d.date);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7)); // 그 주의 월요일
    const weekKey = toLocalDateString(monday);
    if (weekKey !== lastWeekKey) {
      weekNo += 1;
      lastWeekKey = weekKey;
      weeks.push({ label: `${weekNo}주차`, span: 1 });
    } else {
      weeks[weeks.length - 1].span += 1;
    }
  }

  return { days, weeks };
}

/** 작업 기간을 days 배열 안 인덱스 범위로 변환 */
export function dayRangeIndex(days, startDate, endDate) {
  if (!startDate || !endDate || days.length === 0) return null;
  const startKey = toLocalDateString(startDate);
  const endKey = toLocalDateString(endDate);

  let startIdx = days.findIndex((d) => toLocalDateString(d.date) >= startKey);
  let endIdx = -1;
  for (let i = days.length - 1; i >= 0; i -= 1) {
    if (toLocalDateString(days[i].date) <= endKey) {
      endIdx = i;
      break;
    }
  }

  if (startIdx === -1 || endIdx === -1 || startIdx > endIdx) return null;
  return { startIdx, endIdx };
}

/**
 * 부모 선택 드롭다운용 목록.
 * 자기 자신과 자기 자손은 부모가 될 수 없다(순환). 백엔드도 CIRCULAR_PARENT로 막지만,
 * 애초에 고를 수 없게 걸러주는 편이 사용자 입장에서 낫다.
 */
export function selectableParents(flatTasks, taskId) {
  if (taskId == null) return flatTasks;

  // taskId의 자손 id를 모은다
  const descendants = new Set();
  const childrenOf = new Map();
  for (const t of flatTasks) {
    const list = childrenOf.get(t.parentTaskId) ?? [];
    list.push(t.id);
    childrenOf.set(t.parentTaskId, list);
  }
  const stack = [taskId];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const childId of childrenOf.get(current) ?? []) {
      if (!descendants.has(childId)) {
        descendants.add(childId);
        stack.push(childId);
      }
    }
  }

  return flatTasks.filter((t) => t.id !== taskId && !descendants.has(t.id));
}
