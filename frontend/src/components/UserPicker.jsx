import { useEffect, useMemo, useState } from 'react';
import { Autocomplete, CircularProgress, TextField } from '@mui/material';

import { searchUsers } from '../api/users';
import { USER_ROLE } from '../utils/constants';

export default function UserPicker({
  value,
  onChange,
  multiple = false,
  label = '사용자 검색',
  size = 'small',
  disabled = false,
}) {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (inputValue.trim().length < 1) {
      setOptions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timerId = setTimeout(() => {
      searchUsers(inputValue.trim())
        .then((list) => setOptions(Array.isArray(list) ? list : []))
        .catch(() => setOptions([]))
        .finally(() => setLoading(false));
    }, 300);

    return () => clearTimeout(timerId);
  }, [inputValue]);

  const getLabel = (u) =>
    u ? `${u.name} (${u.employeeNumber}${u.positionRank ? ' · ' + u.positionRank : ''})` : '';

  const selectedIds = useMemo(() => {
    if (multiple) return new Set((value ?? []).map((u) => u.id));
    return new Set(value ? [value.id] : []);
  }, [value, multiple]);

  return (
    <Autocomplete
      multiple={multiple}
      disabled={disabled}
      value={value ?? (multiple ? [] : null)}
      onChange={(_e, newValue) => onChange(newValue)}
      inputValue={inputValue}
      onInputChange={(_e, v) => setInputValue(v)}
      options={options.filter((o) => !selectedIds.has(o.id))}
      getOptionLabel={getLabel}
      isOptionEqualToValue={(option, val) => option.id === val.id}
      filterOptions={(x) => x}
      loading={loading}
      noOptionsText={inputValue ? '검색 결과가 없습니다' : '이름 또는 사원번호를 입력하세요'}
      renderOption={(props, option) => {
        const { key, ...rest } = props;
        return (
          <li key={option.id} {...rest}>
            {option.name} · {option.employeeNumber}
            {option.role ? ` · ${USER_ROLE[option.role] ?? option.role}` : ''}
          </li>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          size={size}
          slotProps={{
            input: {
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress size={16} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
    />
  );
}
