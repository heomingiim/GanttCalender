# GanttCalender

간트차트 + 캘린더 기반 그룹웨어.

# 처음 세팅하기 (아무것도 설치 안 된 PC 기준)

Windows 11 기준입니다. **순서대로 따라가면 됩니다.**

## 0. 설치해야 하는 것 3가지

| 프로그램 | 버전 | 용도 |
|---|---|---|
| **JDK** | 21 | 백엔드 실행 (Gradle이 이 버전을 요구) |
| **MySQL** | 8.4.8 | 데이터베이스 |
| **Node.js** | 20 이상 | 프론트엔드 빌드/개발 서버 |

> Gradle은 따로 설치하지 않습니다. 프로젝트 안의 `gradlew`가 알아서 받아옵니다.

---

## 1. JDK 21 설치

[Eclipse Temurin 21](https://adoptium.net/temurin/releases/?version=21) 에서
**JDK 21 · Windows · x64 · .msi** 를 받아 설치합니다.

설치 중 **"Set JAVA_HOME variable"** 항목을 반드시 켜 주세요. (기본값이 꺼져 있습니다)

확인:

```cmd
java -version
```

`openjdk version "21.x.x"` 가 나오면 됩니다.

---

## 2. MySQL 설치

[MySQL Installer for Windows](https://dev.mysql.com/downloads/installer/) 에서
`mysql-installer-community-8.4.8.msi` 를 받아 실행합니다.

설치 마법사에서 이렇게 선택합니다.

| 단계 | 선택 |
|---|---|
| Choosing a Setup Type | **Server only** (Workbench까지 쓰려면 Custom) |
| Type and Networking | Development Computer / Port **3306** (기본값 그대로) |
| Authentication Method | **Use Strong Password Encryption** (기본값) |
| Accounts and Roles | **← 여기서 root 비밀번호를 정합니다. 반드시 기억하세요.** |
| Windows Service | Start at System Startup 체크 (기본값) |

### ⚠️ root 비밀번호는 이 단계에서만 정해집니다

**MySQL 계정과 비밀번호는 애플리케이션이 만들어 주지 못합니다.**
계정을 만드는 것도 SQL 명령이라, 그걸 실행하려면 이미 로그인이 되어 있어야 하기 때문입니다.
그래서 이 설치 단계에서 정한 값을 뒤에서 `.env`에 그대로 적어야 합니다.

`groupware` **데이터베이스와 테이블은** 앱이 자동으로 만들어 줍니다. 계정만 미리 있으면 됩니다.

확인:

```cmd
sc query MySQL84
"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" -u root -p
```

비밀번호를 넣고 `mysql>` 프롬프트가 뜨면 성공입니다. `exit` 으로 나옵니다.

> 비밀번호를 잊어버렸다면 MySQL Installer를 다시 실행해
> MySQL Server 옆 **Reconfigure → Accounts and Roles** 에서 새로 정할 수 있습니다.

---

## 3. Node.js 설치

[nodejs.org](https://nodejs.org/) 에서 **LTS** 버전 `.msi` 를 받아 설치합니다 (기본값 그대로 진행).

확인:

```cmd
node -v
npm -v
```

---

## 4. 프로젝트 설정

### 4-1. DB 접속 정보 입력

```cmd
cd backend
copy .env.example .env
```

`backend/.env` 를 열어 **2단계에서 정한 root 비밀번호**를 적습니다.

```ini
DB_PASSWORD=여기에_MySQL_비밀번호
DB_USERNAME=root
DB_URL=jdbc:mysql://localhost:3306/groupware?createDatabaseIfNotExist=true&serverTimezone=Asia/Seoul&characterEncoding=UTF-8
DB_DRIVER=com.mysql.cj.jdbc.Driver
```

`.env` 는 `.gitignore` 에 등록되어 있어 커밋되지 않습니다.

> 스프링은 `.env` 를 기본 지원하지 않습니다. `application.yaml` 의 `spring.config.import` 가
> `.env` 를 properties 파일로 읽도록 설정해 둔 것입니다.
>
> **H2는 지원하지 않습니다.** 통계·대시보드 쿼리가 `DATE_FORMAT` / `FIELD` / `DATE_ADD` 같은
> MySQL 전용 문법을 쓰기 때문에, H2로 띄우면 앱은 떠도 `/api/stats/personal` 과
> `/api/dashboard` 가 500으로 실패합니다. MySQL을 사용해 주세요.

---

## 5. 실행

```cmd
cd frontend
npm install
npm run build
cd ..\backend
gradlew bootRun
```

> - `npm install` 은 첫 실행 때만 필요합니다.
> - `npm run build` 결과물은 `backend/src/main/resources/static/` 에 들어갑니다.
> - 접속 주소: http://localhost:8080
> - 두 번째 실행부터는 프론트 코드 변경이 없으면 `./gradlew bootRun` 만 치면 됩니다.

첫 실행 때 이 순서로 자동 처리됩니다.
**DB 생성 → 테이블 10개 생성(`schema.sql`) → 직원 2,000명 적재(`employees.csv`)**
직원 적재 때문에 20~30초 정도 걸립니다. `[DataSeeder] 시드 완료` 가 뜨면 끝입니다.

브라우저에서 **http://localhost:8080** 을 열고 사원번호 **`EMP0001`** 로 로그인합니다.
(비밀번호 없이 사원번호만으로 로그인하는 사내 데모 방식입니다)

두 번째 실행부터는 프론트 코드 변경이 없으면 `./gradlew bootRun` 만 다시 치면 됩니다.

---

## 6. 문제 해결

| 증상 | 원인과 해결 |
|---|---|
| `Access denied for user 'root'@'localhost' (using password: **NO**)` | `.env` 가 없거나 `DB_PASSWORD` 가 비어 있음 → 4-1 확인 |
| `Access denied ... (using password: **YES**)` | 비밀번호가 틀림 → `.env` 값 확인. 모르면 MySQL Installer에서 Reconfigure |
| `Communications link failure` / 연결 거부 | MySQL 서비스가 꺼져 있음 → `Get-Service MySQL*` 로 확인 후 시작 |
| `Web server failed to start. Port 8080 was already in use` | 백엔드가 이미 떠 있음. 기존 터미널을 끄거나 그 프로세스를 종료 |
| `문서 루트 요소 "mapper"은(는) DOCTYPE 루트 "null"과(와) 일치해야 합니다` | `resources/mapper/*.xml` 맨 위에 XML 선언 + DOCTYPE 2줄이 빠짐 |
| 화면은 뜨는데 모든 요청이 401 | 로그인이 안 된 상태. 백엔드를 재시작하면 세션이 사라지므로 다시 로그인 |
| `npm run dev` 후 API가 전부 실패 | 백엔드(8080)가 안 떠 있음. 프론트는 `/api` 를 8080으로 넘길 뿐임 |

---

## 폴더 구조

```
GanttCalender/
├── employees.csv     직원 시드 데이터 (2,000명), 첫 실행 시 DataSeeder가 읽음
├── backend/          Spring Boot 3.5.16 + MyBatis 3.0.5 + MySQL (Java 21 / Gradle 8.14.5)
│   ├── build.gradle
│   ├── settings.gradle
│   ├── gradlew / gradlew.bat / gradle/
│   └── src/
│       ├── main/java/com/durian/groupware/
│       │   ├── GroupwareApplication.java
│       │   ├── config/          WebConfig (인터셉터 / ArgumentResolver / CORS)
│       │   ├── global/auth/     세션 인증, @Login, 예외 처리
│       │   ├── auth/            로그인/세션
│       │   ├── department/      조직도 도메인
│       │   ├── user/            사용자 도메인
│       │   ├── project/         프로젝트/멤버 도메인
│       │   ├── task/            일정/투두/WBS 도메인
│       │   ├── category/        카테고리 도메인
│       │   ├── notification/    알림 도메인
│       │   ├── stats/           통계/대시보드 도메인
│       │   └── seed/            DataSeeder (employees.csv 적재)
│       └── main/resources/
│           ├── application.yaml
│           ├── schema.sql
│           └── mapper/          MyBatis XML
└── frontend/         React 19 + Vite + MUI (개발 서버 :5173)
    ├── package.json
    ├── vite.config.js       /api 프록시 → :8080, 빌드 산출물 → backend static
    └── src/
        ├── api/          axios 인스턴스 + 도메인별 API 함수
        ├── contexts/     Auth / Toast / Notification
        ├── components/   AppLayout, TaskFormDialog, WbsGanttTable, UserPicker …
        ├── pages/        Login, Dashboard, Calendar, Todo, Project, Category, Org, Stats
        └── utils/        date(LocalDateTime 변환), taskTree(트리↔평탄화), constants
```

---

## 참고 — 프론트엔드 구조

Vite dev 서버가 `/api` 요청을 `http://localhost:8080` 으로 프록시하므로, 브라우저 입장에서는
같은 출처가 되어 세션 쿠키(JSESSIONID)가 그대로 실립니다. CORS 설정이 따로 필요 없습니다.

라우팅은 `HashRouter`(`/#/calendar` 형태)를 씁니다. 배포 시 백엔드에 SPA 포워딩 설정을
추가하지 않아도 새로고침이 깨지지 않습니다.

### 스택

React 19 · Vite · MUI 7 · React Router 7 · Context API · axios(`withCredentials`) ·
FullCalendar(캘린더) · react-day-picker(기간 선택) · recharts(통계 차트) ·
@mui/x-date-pickers + dayjs(날짜 선택 UI) · @dnd-kit(드래그앤드롭)

---

## 개발 서버 실행 (개발 중일 때만)

프론트 코드를 수정하면서 바로 반영하려면 터미널 **2개**를 띄웁니다.

```cmd
cd backend
gradlew bootRun
```

```cmd
cd frontend
npm run dev
```

브라우저는 **http://localhost:5173** 으로 접속합니다.

