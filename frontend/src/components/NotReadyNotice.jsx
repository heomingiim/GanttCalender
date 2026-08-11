import { Alert, AlertTitle, Box } from '@mui/material';

/**
 * STEP 12~17 처럼 "프론트는 만들었지만 백엔드 API가 아직 없는" 영역에 띄우는 안내.
 *
 * 그냥 에러 토스트를 띄우면 사용자는 자기가 뭘 잘못한 줄 안다.
 * 여기서는 "무엇을 만들면 이 화면이 살아나는지"를 명시해 준다.
 */
export default function NotReadyNotice({ step, api, children }) {
  return (
    <Box sx={{ py: 2 }}>
      <Alert severity="info" variant="outlined">
        <AlertTitle>백엔드 준비 중 ({step})</AlertTitle>
        <Box component="div" sx={{ fontSize: 14 }}>
          이 화면은 <code>{api}</code> 를 호출합니다. 해당 API를 구현하면 별도 수정 없이
          바로 동작합니다.
        </Box>
        {children}
      </Alert>
    </Box>
  );
}
