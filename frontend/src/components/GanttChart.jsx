import { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import Gantt from 'frappe-gantt';
// frappe-gantt 1.2.x는 package.json exports가 "." 하나뿐이라
// 'frappe-gantt/dist/frappe-gantt.css' 를 직접 import하면 번들러가 막는다.
// vite.config.js의 resolve.alias로 뚫어둔 별칭을 쓴다.
import 'frappe-gantt-css';

// ─────────────────────────────────────────────────────────────
// STEP 11 — 간트차트
//
// ★ 이 파일이 이 프로젝트에서 유일하게 "React 밖에서 DOM을 직접 만지는" 곳이다 ★
//
// frappe-gantt는 React를 모르는 바닐라 라이브러리다. 넘겨준 DOM 요소 안에
// 자기가 직접 <svg>를 만들어 넣는다. React도 자기가 관리하는 DOM을 마음대로 지우고
// 다시 그리기 때문에, 둘이 같은 요소를 건드리면 충돌한다.
//
// 그래서 규칙이 셋 있다.
//   1. 빈 <div>를 하나 만들고 useRef로 그 실제 DOM 노드를 붙잡는다.
//      → React는 이 div 안쪽에 아무것도 렌더링하지 않는다 (children 없음).
//   2. 라이브러리 초기화는 useEffect 안에서 한다.
//      → 렌더링 함수 본문에서 하면 아직 div가 화면에 없어서 ref.current가 null이다.
//   3. cleanup에서 innerHTML을 비운다.
//      → StrictMode(개발 모드)는 effect를 일부러 두 번 실행한다. 안 비우면
//        차트가 두 개 겹쳐 그려진다. 데이터가 바뀔 때도 마찬가지다.
// ─────────────────────────────────────────────────────────────

export default function GanttChart({
  tasks,                 // toGanttTasks()로 변환된 배열
  viewMode = 'Week',     // Day / Week / Month
  onTaskClick,
  onDateChange,          // 막대를 드래그해 기간을 바꿨을 때
  onProgressChange,      // 진행률 핸들을 끌었을 때
}) {
  const containerRef = useRef(null);   // 실제 <div> DOM 노드
  const ganttRef = useRef(null);       // 생성된 Gantt 인스턴스 (리렌더와 무관하게 보관)

  // 콜백을 ref에 담아두는 이유:
  // 부모가 리렌더될 때마다 onTaskClick은 새 함수가 된다. 이걸 아래 useEffect의
  // 의존성에 넣으면 차트가 매번 파괴 → 재생성되어 스크롤 위치가 튄다.
  // ref에 최신 함수만 갈아끼우면 차트는 그대로 두고 동작만 최신으로 유지된다.
  const callbacksRef = useRef({});
  callbacksRef.current = { onTaskClick, onDateChange, onProgressChange };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!tasks || tasks.length === 0) return;

    // 혹시 남아있을 이전 SVG 제거 (StrictMode 이중 실행 대비)
    container.innerHTML = '';

    ganttRef.current = new Gantt(container, tasks, {
      view_mode: viewMode,
      language: 'ko',        // 내부적으로 Intl.DateTimeFormat에 그대로 넘어간다
      bar_height: 24,
      padding: 16,
      popup: false,          // 라이브러리 기본 말풍선 대신 우리 상세 다이얼로그를 쓴다
      infinite_padding: false, // 작업 기간 바깥으로 무한 스크롤되지 않게 범위를 고정
      today_button: true,
      // 콜백 이름은 'on_' + 이벤트명 규칙이다 (trigger_event 구현 참고).
      // 넘어오는 task는 우리가 넣어준 객체 그대로라서 id가 문자열이다 → Number로 복원.
      on_click: (task) => callbacksRef.current.onTaskClick?.(Number(task.id)),
      on_date_change: (task, start, end) =>
        callbacksRef.current.onDateChange?.(Number(task.id), start, end),
      on_progress_change: (task, progress) =>
        callbacksRef.current.onProgressChange?.(Number(task.id), progress),
    });

    // ★ cleanup ★ 의존성이 바뀌거나 언마운트될 때 SVG를 통째로 걷어낸다
    return () => {
      container.innerHTML = '';
      ganttRef.current = null;
    };
  }, [tasks, viewMode]); // 데이터나 보기 모드가 바뀌면 다시 그린다

  if (!tasks || tasks.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography color="text.secondary">
          표시할 작업이 없습니다. 시작일·종료일이 있는 작업만 간트차트에 그려집니다.
        </Typography>
      </Box>
    );
  }

  // 이 div는 React 입장에서 "내용이 없는 빈 상자"다. 안쪽은 frappe-gantt 소유.
  // (라이브러리가 이 안에 .gantt-container > svg.gantt 구조를 직접 만든다)
  return <Box ref={containerRef} sx={{ width: '100%', minHeight: 240 }} />;
}
