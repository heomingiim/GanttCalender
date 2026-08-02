# GanttCalender

간트차트 + 캘린더 기반 그룹웨어.

## 폴더 구조

```
GanttCalender/
├── backend/          Spring Boot 3.3.2 + MyBatis + MySQL (Java 17)
│   ├── build.gradle
│   ├── settings.gradle
│   ├── gradlew / gradlew.bat / gradle/
│   └── src/
│       ├── main/java/com/durian/groupware/
│       │   ├── GroupwareApplication.java
│       │   ├── config/          WebConfig (인터셉터 / ArgumentResolver / CORS)
│       │   ├── global/auth/     세션 인증, @Login, 예외 처리
│       │   └── user/            사용자 도메인
│       └── main/resources/
│           ├── application.yaml
│           ├── schema.sql
│           └── mapper/          MyBatis XML
└── frontend/         (예정) Vite 개발 서버 :5173
```

## 실행

### 백엔드

```bash
cd backend
./gradlew bootRun          # http://localhost:8080
```

### 프론트엔드

아직 미구성. 백엔드 CORS 설정은 `http://localhost:5173`(Vite 기본 포트)을 허용합니다.
