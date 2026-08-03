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
            System.out.println("[DataSeeder] employees.csv 없음, 기본 테스트 데이터 삽입");
            seedDefault();
            return;
        }

        // 1. 조직도 미리 생성 (회사 > 부 > 팀)
        //    CSV에서 부서/팀 이름을 수집해서 departments 테이블에 INSERT
        Map<String, Long> deptIdMap = buildDepartments();

        // 2. CSV 읽어서 사용자 INSERT
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

                // 팀 ID 찾기
                String teamName = record.get("팀");
                Long deptId = deptIdMap.get(teamName);
                user.setDepartmentId(deptId);

                userMapper.insert(user);
            }
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
        return map;
    }

    // employees.csv가 없을 때 테스트용 기본 데이터 삽입
    private void seedDefault() {
        Department company = new Department(); company.setName("두리안(주)"); company.setType("COMPANY");
        departmentMapper.insert(company);
        Department dev = new Department(); dev.setName("개발부"); dev.setParentId(company.getId()); dev.setType("DEPARTMENT");
        departmentMapper.insert(dev);
        Department sales = new Department(); sales.setName("영업부"); sales.setParentId(company.getId()); sales.setType("DEPARTMENT");
        departmentMapper.insert(sales);
        Department dev1 = new Department(); dev1.setName("개발1팀"); dev1.setParentId(dev.getId()); dev1.setType("TEAM");
        departmentMapper.insert(dev1);
        Department dev2 = new Department(); dev2.setName("개발2팀"); dev2.setParentId(dev.getId()); dev2.setType("TEAM");
        departmentMapper.insert(dev2);
        Department sales1 = new Department(); sales1.setName("영업1팀"); sales1.setParentId(sales.getId()); sales1.setType("TEAM");
        departmentMapper.insert(sales1);

        String[][] users = {
            {"EMP001", "김대표",  String.valueOf(company.getId()), "CEO",           "대표이사"},
            {"EMP002", "박본부",  String.valueOf(dev.getId()),     "DIVISION_HEAD", "본부장"},
            {"EMP003", "이팀장",  String.valueOf(dev1.getId()),    "TEAM_LEAD",     "팀장"},
            {"EMP004", "최사원",  String.valueOf(dev1.getId()),    "MEMBER",        "사원"},
            {"EMP005", "정사원",  String.valueOf(dev1.getId()),    "MEMBER",        "사원"},
            {"EMP006", "강팀장",  String.valueOf(dev2.getId()),    "TEAM_LEAD",     "팀장"},
            {"EMP007", "윤사원",  String.valueOf(sales1.getId()),  "MEMBER",        "사원"},
        };
        for (String[] u : users) {
            User user = new User();
            user.setEmployeeNumber(u[0]); user.setName(u[1]);
            user.setDepartmentId(Long.parseLong(u[2])); user.setRole(u[3]);
            user.setPositionRank(u[4]); user.setActive(true);
            userMapper.insert(user);
        }
        System.out.println("[DataSeeder] 기본 테스트 데이터 삽입 완료 (7명)");
    }
}
