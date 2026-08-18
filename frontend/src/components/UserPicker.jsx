import { useEffect, useMemo, useState } from 'react';
import { Autocomplete, CircularProgress, TextField } from '@mui/material';

import { searchUsers } from '../api/users';
import { USER_ROLE } from '../utils/constants';

/**
 * 사용자 검색 자동완성. 담당자 지정 / 참석자 초대 / 프로젝트 멤버 추가에서 쓴다.
 *
 * ★ 디바운스 ★
 * 키를 누를 때마다 요청을 보내면 "김철수"를 치는 동안 3번 호출된다.
 * 마지막 입력 후 300ms 조용할 때만 실제로 호출하도록 타이머를 건다.
 * useEffect의 cleanup에서 이전 타이머를 지우는 게 핵심 — 이게 디바운스의 전부다.
 */
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
      setLoading(false); // 입력 중이던 걸 지우면 예약된 검색도 취소되므로 스피너도 꺼야 한다
      return;
    }

    setLoading(true);
    const timerId = setTimeout(() => {
      searchUsers(inputValue.trim())
        .then((list) => setOptions(Array.isArray(list) ? list : []))
        .catch(() => setOptions([]))
        .finally(() => setLoading(false));
    }, 300);

    // 다음 글자가 입력되면 이 cleanup이 먼저 돌아 예약된 요청을 취소한다
    return () => clearTimeout(timerId);
  }, [inputValue]);

  const getLabel = (u) =>
    u ? `${u.name} (${u.employeeNumber}${u.positionRank ? ' · ' + u.positionRank : ''})` : '';

  // 이미 선택된 사용자를 후보에서 빼려면 id 비교가 필요하다.
  // 객체는 참조 비교라서 isOptionEqualToValue를 반드시 넘겨야 한다.
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
      filterOptions={(x) => x} // 서버가 이미 필터링했으므로 클라이언트 필터 끔
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
