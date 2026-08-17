CREATE TABLE IF NOT EXISTS departments (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    parent_id   INT,
    type        VARCHAR(20) NOT NULL COMMENT 'COMPANY / DEPARTMENT / TEAM',
    created_at  DATETIME DEFAULT NOW(),
    updated_at  DATETIME DEFAULT NOW(),
    FOREIGN KEY (parent_id) REFERENCES departments(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS users (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    employee_number VARCHAR(20) NOT NULL UNIQUE,
    name            VARCHAR(50) NOT NULL,
    department_id   INT,
    role            VARCHAR(20) NOT NULL COMMENT 'MEMBER / TEAM_LEAD / DIVISION_HEAD / CEO',
    position_rank   VARCHAR(20) COMMENT '직급 (사원/대리/과장/팀장/본부장/대표이사)',
    email           VARCHAR(100),
    phone           VARCHAR(30),
    hire_date       DATE,
    contract_type   VARCHAR(20) COMMENT '정규직 / 계약직',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'false면 로그인 차단',
    resigned_at     DATE,
    created_at      DATETIME DEFAULT NOW(),
    updated_at      DATETIME DEFAULT NOW(),
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS projects (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(200) NOT NULL,
    description TEXT,
    owner_id    INT NOT NULL COMMENT '프로젝트 소유자 (생성자)',
    start_date  DATE,
    end_date    DATE,
    status      VARCHAR(20) NOT NULL DEFAULT 'PLANNED' COMMENT 'PLANNED / IN_PROGRESS / DONE / ON_HOLD',
    is_deleted  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  DATETIME DEFAULT NOW(),
    updated_at  DATETIME DEFAULT NOW(),
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS project_members (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    project_id  INT NOT NULL,
    user_id     INT NOT NULL,
    role        VARCHAR(20) NOT NULL COMMENT 'ADMIN / MEMBER',
    joined_at   DATETIME NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, user_id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS categories (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    user_id       INT COMMENT '개인 카테고리 소유자',
    department_id INT COMMENT '팀 공용 카테고리의 소속 팀',
    name          VARCHAR(50) NOT NULL,
    color         VARCHAR(20) COMMENT '#FF5733 형식의 색상 코드',
    created_at    DATETIME DEFAULT NOW(),
    updated_at    DATETIME DEFAULT NOW(),
    FOREIGN KEY (user_id)       REFERENCES users(id)       ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tasks (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    project_id      INT      COMMENT '소속 프로젝트 (개인 투두는 NULL)',
    parent_task_id  INT      COMMENT 'WBS 계층: 상위 작업 ID (최상위면 NULL)',
    creator_id      INT NOT NULL,
    category_id     INT,
    task_type       VARCHAR(20) NOT NULL COMMENT 'TODO / EVENT / WBS_TASK',
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    deliverable     VARCHAR(300) COMMENT 'WBS 산출물 (예: ERD, 화면설계서)',
    start_date      DATETIME,
    end_date        DATETIME,
    is_all_day      BOOLEAN NOT NULL DEFAULT FALSE,
    visibility      VARCHAR(20) NOT NULL DEFAULT 'PUBLIC'  COMMENT 'PUBLIC / PRIVATE',
    status          VARCHAR(20) NOT NULL DEFAULT 'TODO'    COMMENT 'TODO / IN_PROGRESS / DONE / CANCELLED',
    priority        VARCHAR(20) NOT NULL DEFAULT 'MEDIUM'  COMMENT 'LOW / MEDIUM / HIGH',
    progress_rate   INT NOT NULL DEFAULT 0 COMMENT '진행률 0~100 (직접 입력)',
    sort_order      INT NOT NULL DEFAULT 0 COMMENT '같은 목록(형제/투두) 안에서의 표시 순서 - 작을수록 위',
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      DATETIME DEFAULT NOW(),
    updated_at      DATETIME DEFAULT NOW(),
    FOREIGN KEY (project_id)     REFERENCES projects(id)   ON DELETE RESTRICT,
    FOREIGN KEY (parent_task_id) REFERENCES tasks(id)      ON DELETE SET NULL,
    FOREIGN KEY (creator_id)     REFERENCES users(id)      ON DELETE RESTRICT,
    FOREIGN KEY (category_id)    REFERENCES categories(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS task_assignees (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    task_id     INT NOT NULL,
    user_id     INT NOT NULL,
    assigned_at DATETIME NOT NULL DEFAULT NOW(),
    UNIQUE (task_id, user_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS task_participants (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    task_id         INT NOT NULL,
    user_id         INT NOT NULL,
    is_required     BOOLEAN NOT NULL DEFAULT FALSE  COMMENT '필수 참석 여부',
    response_status VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING / ACCEPTED / DECLINED / TENTATIVE',
    responded_at    DATETIME,
    created_at      DATETIME DEFAULT NOW(),
    UNIQUE (task_id, user_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL  COMMENT '수신자',
    task_id     INT           COMMENT '관련 작업 (없으면 NULL)',
    type        VARCHAR(30) NOT NULL COMMENT 'ASSIGN / INVITE / CANCEL / DEADLINE',
    message     VARCHAR(500) NOT NULL,
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    read_at     DATETIME,
    created_at  DATETIME DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activity_logs (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    task_id     INT NOT NULL,
    user_id     INT NOT NULL  COMMENT '행동한 사람',
    action      VARCHAR(20) NOT NULL COMMENT 'CREATE / UPDATE / DELETE / STATUS_CHANGE / PROGRESS_CHANGE / PARENT_CHANGE',
    created_at  DATETIME DEFAULT NOW(),
    -- 활동 이력은 보존해야 하므로 참조 대상의 실제 삭제를 막는다 (작업/사용자 모두 소프트 삭제 사용)
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE RESTRICT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
);

CREATE INDEX idx_users_dept ON users(department_id);
CREATE INDEX idx_tasks_project    ON tasks(project_id);
CREATE INDEX idx_tasks_creator    ON tasks(creator_id);
CREATE INDEX idx_tasks_parent     ON tasks(parent_task_id);
CREATE INDEX idx_tasks_type       ON tasks(task_type);
CREATE INDEX idx_tasks_dates      ON tasks(start_date, end_date);
CREATE INDEX idx_tasks_created    ON tasks(created_at);
CREATE INDEX idx_tasks_deleted    ON tasks(is_deleted);
CREATE INDEX idx_assignees_user   ON task_assignees(user_id);
CREATE INDEX idx_participants_user ON task_participants(user_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_logs_task ON activity_logs(task_id);

-- CREATE TABLE IF NOT EXISTS는 이미 만들어진 테이블을 고치지 않으므로 별도 보정.
-- 재실행 시 나는 "컬럼 중복" 에러는 continue-on-error: true로 무시된다.
ALTER TABLE tasks ADD COLUMN deliverable VARCHAR(300) COMMENT 'WBS 산출물 (예: ERD, 화면설계서)' AFTER description;
ALTER TABLE tasks ADD COLUMN sort_order INT NOT NULL DEFAULT 0 COMMENT '같은 목록(형제/투두) 안에서의 표시 순서 - 작을수록 위' AFTER progress_rate;