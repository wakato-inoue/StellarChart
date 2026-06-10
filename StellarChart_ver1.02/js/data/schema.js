// ==========================================================================
// StellarChart - Database Schema (SQLite / sql.js)
// 役割: アプリケーションで使用する全テーブルのDDL（CREATE TABLE文）を
//       一箇所に定義する。このファイルは init-db.js から参照され、
//       アプリ起動時にメモリ上のSQLiteデータベースにテーブルを作成する。
//
// テーブル一覧:
//   1. employees         - 社員マスタ（ログイン認証・担当者表示に使用）
//   2. projects          - プロジェクト一覧
//   3. project_members   - プロジェクトと社員の多対多関連（中間テーブル）
//   4. tasks             - タスク一覧（WBS階層構造を parent_task_id で表現）
//   5. task_comments     - タスクのスレッドコメント（旧 task.thread）
//   6. task_status_history - ステータス変更履歴（旧 task.statusHistory）
//   7. effort_log        - 作業工数実績（旧 task.effortLog）
//   8. transfers         - タスク転送（たらいまわし）レコード
//
// 命名規則:
//   テーブル名・カラム名は snake_case で統一。
//   フロントエンドJSの camelCase（例: taskId, startDate）とは
//   api-client.js / repository.js で変換する。
// ==========================================================================

const DB_SCHEMA = `
  -- 外部キー制約を有効化（ON DELETE CASCADE などを機能させるため）
  -- sql.js はデフォルトで外部キーが無効のため、毎回明示的にONにする
  PRAGMA foreign_keys = ON;

  -- 1. EMPLOYEES（社員マスタ）
  -- 社員ID: employees.id を外部キーとして他テーブルから参照する
  -- employee_no: 社員番号（"EMP001"形式。現状はモック用に自動生成）
  -- rank: RankC(一般) / RankB(ジュニアリーダー) / RankA(リーダー) / RankS(管理職) / Admin(管理者)
  CREATE TABLE IF NOT EXISTS employees (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_no TEXT NOT NULL,
    name        TEXT NOT NULL,
    department  TEXT NOT NULL,
    rank        TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  -- 2. PROJECTS（プロジェクト一覧）
  -- creator_id: プロジェクト作成者（employees.id への外部キー）
  -- planned_hours: プロジェクト全体の予定工数（タスク予定工数の上限目安）
  -- status: not_started / in_progress / suspended / completed
  -- start_date / end_date: プロジェクト期間（YYYY-MM-DD形式の文字列）
  CREATE TABLE IF NOT EXISTS projects (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    description   TEXT,
    status        TEXT NOT NULL,
    progress      INTEGER DEFAULT 0,
    planned_hours INTEGER DEFAULT 0,
    creator_id    INTEGER NOT NULL REFERENCES employees(id),
    start_date    TEXT NOT NULL,
    end_date      TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  -- 3. PROJECT_MEMBERS（プロジェクト-社員 多対多関連）
  -- 1つのプロジェクトに複数の社員が属し、1人の社員が複数のプロジェクトに参加する
  -- 複合主キー (project_id, employee_id) で同一組み合わせの重複を防ぐ
  -- ON DELETE CASCADE: プロジェクト削除時に自動で関連レコードも削除
  CREATE TABLE IF NOT EXISTS project_members (
    project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    employee_id INTEGER NOT NULL REFERENCES employees(id),
    PRIMARY KEY (project_id, employee_id)
  );

  -- 4. TASKS（タスク一覧）
  -- WBS階層構造:
  --   parent_task_id が NULL → トップレベルタスク
  --   parent_task_id に値あり → 子タスク（親のIDを指す自己参照FK）
  --   wbs_code: "1", "1.1", "1.1.1" 形式のWBS項番。表示用・ソート用
  --   assignee_id: 担当者（末端タスクのみ設定。管理ノードは子から自動算出）
  --   status/progress/priority/difficulty: タスクの状態管理
  --   管理ノード（子あり）の status/progress は子タスクから自動計算する
  CREATE TABLE IF NOT EXISTS tasks (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id        INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_task_id    INTEGER REFERENCES tasks(id),
    wbs_code          TEXT NOT NULL,
    name              TEXT NOT NULL,
    description       TEXT,
    assignee_id       INTEGER REFERENCES employees(id),
    created_by_id     INTEGER NOT NULL REFERENCES employees(id),
    issue_owner_id    INTEGER REFERENCES employees(id),
    status            TEXT NOT NULL DEFAULT 'not_started',
    progress          INTEGER DEFAULT 0,
    priority          TEXT NOT NULL DEFAULT 'medium',
    difficulty        TEXT NOT NULL DEFAULT 'medium',
    estimated_hours   INTEGER DEFAULT 0,
    start_date        TEXT,
    end_date          TEXT,
    created_at        TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at        TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  -- 5. TASK_COMMENTS（タスクスレッド/コメント）
  -- 従来の task.thread[] を正規化したテーブル
  -- 1タスクに対して複数のコメントが紐づく（1対多）
  -- author_id: コメント投稿者（employees.id）
  -- content: コメント本文。転送通知などシステムメッセージもここに記録
  CREATE TABLE IF NOT EXISTS task_comments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id     INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    author_id   INTEGER NOT NULL REFERENCES employees(id),
    content     TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  -- 6. TASK_STATUS_HISTORY（ステータス変更履歴）
  -- 従来の task.statusHistory[] を正規化したテーブル
  -- タスクのステータスが変更されるたびにレコードが追加される
  -- from_status / to_status: 変更前後のステータス値
  -- changed_by_id: 変更を行った社員
  -- comment: 変更理由（任意）
  CREATE TABLE IF NOT EXISTS task_status_history (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id         INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    from_status     TEXT,
    to_status       TEXT NOT NULL,
    changed_by_id   INTEGER NOT NULL REFERENCES employees(id),
    comment         TEXT,
    created_at      TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  -- 7. EFFORT_LOG（作業工数実績）
  -- 従来の task.effortLog[] を正規化したテーブル
  -- 末端タスクに対して、日付ごとの作業時間を記録する
  -- hours: 作業時間（小数点対応のためREAL型）
  -- created_by_id: 作業を報告した社員
  -- タスクの actualHours はこのテーブルの hours 合計として動的に計算する
  CREATE TABLE IF NOT EXISTS effort_log (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id         INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    work_date       TEXT NOT NULL,
    hours           REAL NOT NULL DEFAULT 0,
    created_by_id   INTEGER NOT NULL REFERENCES employees(id),
    created_at      TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  -- 8. TRANSFERS（タスク転送レコード）
  -- 従来の transfers[] を正規化したテーブル
  -- 担当者が対応できないタスクを別の社員に転送（たらいまわし）した際に記録
  -- from_employee_id: 転送元（以前の担当者）
  -- to_employee_id: 転送先（新しい担当者）
  -- comment: 転送理由
  -- is_read: 転送先が未読かどうか（0=未読, 1=既読）
  CREATE TABLE IF NOT EXISTS transfers (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id             INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    from_employee_id    INTEGER NOT NULL REFERENCES employees(id),
    to_employee_id      INTEGER NOT NULL REFERENCES employees(id),
    comment             TEXT,
    is_read             INTEGER NOT NULL DEFAULT 0,
    created_at          TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );

  -- インデックス: テーブル結合やWHERE検索で頻繁に使用するカラムに設定
  -- これらがないと、プロジェクト一覧や担当者検索時にフルスキャンが発生する
  CREATE INDEX IF NOT EXISTS idx_tasks_project  ON tasks(project_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_parent   ON tasks(parent_task_id);
  CREATE INDEX IF NOT EXISTS idx_tc_task        ON task_comments(task_id);
  CREATE INDEX IF NOT EXISTS idx_tsh_task       ON task_status_history(task_id);
  CREATE INDEX IF NOT EXISTS idx_el_task        ON effort_log(task_id);
  CREATE INDEX IF NOT EXISTS idx_tr_task        ON transfers(task_id);
  CREATE INDEX IF NOT EXISTS idx_tr_to          ON transfers(to_employee_id);
`;
