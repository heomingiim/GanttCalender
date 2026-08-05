package com.durian.groupware.seed;

import com.durian.groupware.department.dto.Department;
import com.durian.groupware.department.mapper.DepartmentMapper;
import com.durian.groupware.user.dto.User;
import com.durian.groupware.user.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class DataSeeder implements ApplicationRunner {

    private final DepartmentMapper departmentMapper;
    private final UserMapper userMapper;

    @Value("${app.seed.enabled:true}")
    private boolean enabled;

    @Value("${app.seed.csv-path:../employees.csv}")
    private String csvPath;

    @Override
    @Transactional(rollbackFor = Exception.class)  // 시딩 중 실패하면 전부 롤백 → 반쪽 상태 방지
    public void run(ApplicationArguments args) throws Exception {
        if (!enabled) return;
        if (userMapper.count() > 0) return;  // 이미 데이터 있으면 스킵

        File file = new File(csvPath);
        if (!file.exists()) {
            // 조용히 대체 데이터를 넣지 않는다. 어느 경로를 봤는지 남기고 기동을 중단시킨다
            throw new IllegalStateException(
                    "employees.csv를 찾을 수 없습니다: " + file.getAbsolutePath());
        }

        // 1. 조직도 미리 생성 (회사 > 부 > 팀)
        //    CSV에서 부서/팀 이름을 수집해서 departments 테이블에 INSERT
        Map<String, Long> deptIdMap = buildDepartments();

        // 2. CSV 읽어서 사용자 INSERT
        int unassigned = 0;   // 소속(department_id)을 정하지 못한 인원 수
        try (Reader reader = new InputStreamReader(new FileInputStream(file), StandardCharsets.UTF_8);
             CSVParser parser = CSVFormat.DEFAULT
                     .withFirstRecordAsHeader()
                     .withTrim()
                     .parse(reader)) {

            for (CSVRecord record : parser) {
                User user = new User();
                user.setEmployeeNumber(record.get("사원번호"));
                user.setName(record.get("이름"));
                user.setPositionRank(record.get("직급"));
                user.setRole(mapRole(record.get("직책")));  // CSV의 직책 → Role enum 변환
                user.setEmail(record.get("이메일"));
                user.setPhone(record.get("전화번호"));
                user.setContractType(record.get("계약형태"));

                // 퇴직구분이 있으면 비활성 처리 → 로그인 시 USER_RESIGNED로 차단됨
                String resignType = record.get("퇴직구분");
                boolean resigned = resignType != null && !resignType.isBlank();
                user.setActive(!resigned);
                if (resigned) {
                    user.setResignedAt(LocalDate.parse(record.get("퇴직일자")));
                }

                // 팀 ID 찾기 — 팀이 비어 있으면(임원 등) 부서를 직속 소속으로 사용
                String teamName = record.get("팀");
                String deptName = record.get("부서");
                Long deptId = deptIdMap.get(teamName);
                if (deptId == null) {
                    deptId = deptIdMap.get(deptName);
                }
                if (deptId == null) {
                    unassigned++;
                    System.out.println("[DataSeeder] 경고: 소속 확인 불가 — 사원번호="
                            + record.get("사원번호") + ", 부서='" + deptName + "', 팀='" + teamName + "'");
                }
                user.setDepartmentId(deptId);

                userMapper.insert(user);
            }
        }
        if (unassigned > 0) {
            System.out.println("[DataSeeder] 경고: 소속 미지정 " + unassigned
                    + "명 (department_id = NULL) — 조직도와 부서별 인원 조회에서 누락됩니다");
        }
        System.out.println("[DataSeeder] 시드 완료");
    }

    // CSV의 직책 문자열 → Role 코드 변환
    private String mapRole(String position) {
        return switch (position) {
            case "대표이사" -> "CEO";
            case "본부장"   -> "DIVISION_HEAD";
            case "팀장"     -> "TEAM_LEAD";
            default         -> "MEMBER";
        };
    }

    // 부서/팀을 departments 테이블에 생성하고 팀이름→id 맵 반환
    private Map<String, Long> buildDepartments() throws Exception {
        File file = new File(csvPath);

        // CSV에서 (부서, 팀) 조합 수집
        Map<String, String> teamToDept = new LinkedHashMap<>();
        try (Reader reader = new InputStreamReader(new FileInputStream(file), StandardCharsets.UTF_8);
             CSVParser parser = CSVFormat.DEFAULT.withFirstRecordAsHeader().withTrim().parse(reader)) {
            for (CSVRecord record : parser) {
                String dept = record.get("부서");
                String team = record.get("팀");
                if (dept != null && !dept.isBlank() && team != null && !team.isBlank()) {
                    teamToDept.put(team, dept);
                }
            }
        }

        // 회사
        Department company = new Department();
        company.setName("두리안(주)");
        company.setType("COMPANY");
        departmentMapper.insert(company);

        // 부서
        Map<String, Long> deptNameToId = new LinkedHashMap<>();
        for (String deptName : new LinkedHashSet<>(teamToDept.values())) {
            Department dept = new Department();
            dept.setName(deptName);
            dept.setParentId(company.getId());
            dept.setType("DEPARTMENT");
            departmentMapper.insert(dept);
            deptNameToId.put(deptName, dept.getId());
        }

        // 팀
        Map<String, Long> map = new LinkedHashMap<>();
        for (Map.Entry<String, String> e : teamToDept.entrySet()) {
            Department team = new Department();
            team.setName(e.getKey());
            team.setParentId(deptNameToId.get(e.getValue()));
            team.setType("TEAM");
            departmentMapper.insert(team);
            map.put(e.getKey(), team.getId());
        }

        // 팀이 없는 인원(임원 등)이 부서로 조회할 수 있도록 부서 이름도 함께 담는다
        map.putAll(deptNameToId);
        return map;
    }
}
