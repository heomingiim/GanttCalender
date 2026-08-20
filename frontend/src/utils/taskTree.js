// 백엔드 재귀 children 구조 → <table> 렌더용 depth 포함 1차원 배열 변환 유틸

import { toLocalDateString } from './date';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function flattenTree(nodes, depth = 0, acc = []) {
  if (!Array.isArray(nodes)) return acc;
  for (const node of nodes) {
    const children = node.children ?? [];
    acc.push({ ...node, depth, hasChildren: children.length > 0 });
    flattenTree(children, depth + 1, acc);
  }
  return acc;
}

export function countTree(nodes) {
  return flattenTree(nodes).length;
}

// flattenTree 결과에 계층 번호("1", "1.1"...)와 소요일수(days)를 붙인다
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

// 기간을 N주차 그룹 + 날짜 컬럼 배열로 변환 (주말 포함)
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

// 작업 기간을 days 배열 인덱스 범위로 변환
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

// 자기 자신·자손은 부모 후보에서 제외 (백엔드도 막지만 UI에서도 선택 못 하게)
export function selectableParents(flatTasks, taskId) {
  if (taskId == null) return flatTasks;

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
