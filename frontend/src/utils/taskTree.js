// 백엔드 TaskTreeResponse(재귀 children 구조) ↔ 화면에서 쓰기 좋은 1차원 배열 변환.
//
// 서버가 주는 모양:
//   [{ id:1, title:'설계', children:[ { id:2, title:'DB 설계', children:[] } ] }]
// 표/간트에서 필요한 모양:
//   [{ id:1, depth:0, ... }, { id:2, depth:1, ... }]
// 트리 구조 그대로는 <table>에 한 줄씩 못 그리기 때문에 depth를 들고 평탄화한다.

import { toLocalDateString } from './date';

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

/**
 * 평탄화된 작업 배열 → frappe-gantt가 요구하는 형식.
 *
 * frappe-gantt 규칙 (지키지 않으면 조용히 빈 차트가 나오거나 예외가 난다):
 *   - id는 문자열
 *   - start / end 는 'YYYY-MM-DD' 문자열 (또는 Date)
 *   - start > end 이면 막대가 깨지므로 뒤집혀 있으면 보정
 *   - 날짜가 아예 없는 작업은 그릴 수 없으므로 제외한다
 *   - progress는 0~100 숫자
 */
export function toGanttTasks(flatTasks) {
  return flatTasks
    .filter((t) => t.startDate || t.endDate)
    .map((t) => {
      // 한쪽 날짜만 있으면 같은 날로 채워 1일짜리 막대로 만든다
      let start = toLocalDateString(t.startDate ?? t.endDate);
      let end = toLocalDateString(t.endDate ?? t.startDate);
      if (start > end) [start, end] = [end, start]; // 뒤집힘 보정

      return {
        id: String(t.id),
        name: `${'　'.repeat(t.depth)}${t.title}`, // 전각 공백으로 계층 들여쓰기 표현
        start,
        end,
        progress: Number(t.progressRate ?? 0),
        // 마일스톤/상태별로 CSS 클래스를 달아 색을 구분한다 (gantt.css에서 정의)
        custom_class:
          t.taskType === 'MILESTONE'
            ? 'bar-milestone'
            : `bar-${String(t.status || 'TODO').toLowerCase()}`,
      };
    });
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
