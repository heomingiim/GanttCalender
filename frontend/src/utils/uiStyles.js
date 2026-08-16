export const segmentedToggleSx = {
  bgcolor: '#EEF3EC',
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 999,
  p: 0.5,
  gap: 0.5,
  '& .MuiToggleButtonGroup-grouped': {
    border: 'none',
    borderRadius: '999px !important',
    color: 'text.secondary',
  },
  '& .MuiToggleButton-root.Mui-selected': {
    bgcolor: '#3AAEA9',
    color: '#fff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
    '&:hover': { bgcolor: '#2C8B87' },
  },
};

export const pillSearchSx = {
  '& .MuiOutlinedInput-root': { borderRadius: 999, height: 40 },
};
