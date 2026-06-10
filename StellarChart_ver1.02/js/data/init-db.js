// ==========================================================================
// StellarChart - Database Initializer (sql.js)
// 役割: sql.js WASM の初期化、メモリ上のSQLiteデータベース作成、
//       テーブル作成、および既存モックデータ（data.js）のシード投入を行う。
//       アプリ起動時に app.js から async 関数として呼び出される。
//
// 永続化:
//   ブラウザのリロードでデータが失われないよう、db.export() でバイナリを
//   localStorage に保存する。次回起動時にlocalStorageがあればそれを復元し、
//   なければ新規作成＋シードデータ投入を行う。
//   将来、サーバーサイドDBに移行する際は「本番DB移行時のTODO」を参照。
//
// 処理フロー（初回起動時）:
//   1. initSqlJs() でWASMエンジンをロード
//   2. localStorage に保存済みDBがあれば → それをロード（シードはスキップ）
//   3. なければ → new SQL.Database() → db.exec(DB_SCHEMA) → seedData()
//
// グローバル変数:
//   db - アプリ全体から参照可能なSQLiteデータベースインスタンス
//         Phase2 以降で api-client.js がこの変数を介してSQLを実行する
// ==========================================================================

// localStorage にDBを保存する際のキー
const STORAGE_KEY = 'stellar_db';

// アプリケーション全体で共有するSQLiteデータベースインスタンス
// repository.js の内部実装がグローバル配列からSQLiteに切り替わった際に、
// この変数を介してクエリを実行する
let db = null;

// --- DBバイナリを localStorage に保存 ---
// ログアウト時など、DBの内容を永続化したいタイミングで呼び出す
function saveDatabase() {
  if (!db) return;
  const uint8 = db.export();
  const binary = String.fromCharCode.apply(null, uint8);
  try {
    localStorage.setItem(STORAGE_KEY, btoa(binary));
  } catch (e) {
    console.warn('[StellarChart] localStorage への保存に失敗しました:', e);
  }
}

// --- localStorage からDBバイナリを復元 ---
// 保存済みデータがあれば Uint8Array として返す。なければ null
function loadDatabase() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  try {
    const binary = atob(stored);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch (e) {
    console.warn('[StellarChart] localStorage からの復元に失敗しました:', e);
    return null;
  }
}

// --- DBスキーママイグレーション ---
// localStorageから復元したDBが古いスキーマの場合、ALTER TABLEでカラムを追加する
function migrateDatabase() {
  if (!db) return;
  // issue_owner_id カラムの有無を確認
  const cols = db.exec("PRAGMA table_info(tasks)");
  const colNames = cols[0] ? cols[0].values.map(v => v[1]) : [];
  if (!colNames.includes('issue_owner_id')) {
    db.run("ALTER TABLE tasks ADD COLUMN issue_owner_id INTEGER REFERENCES employees(id)");
  }
}

// --- データベース初期化（非同期処理） ---
// sql.js のWASMバイナリをCDNからロードしてからDBインスタンスを作成するため、
// この関数は async で定義されている。app.js の DOMContentLoaded ハンドラ内で
// await initDatabase() として呼び出され、完了後にログインダイアログを表示する
async function initDatabase() {
  // sql.js のWASMエンジンを初期化（CDNからバイナリを非同期的に読み込む）
  const SQL = await initSqlJs({
    locateFile: file => `https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/${file}`
  });

  // localStorage に保存済みのDBがあれば復元する
  const saved = loadDatabase();
  if (saved) {
    db = new SQL.Database(saved);
    migrateDatabase();
    return;
  }

  // 保存済みDBがなければ新規作成＋シード投入
  db = new SQL.Database();
  db.exec(DB_SCHEMA);
  seedData();
}

// --- シードデータ投入処理 ---
// data.js に定義されたグローバル配列（projects, tasks, transfers）および
// employeeMaster のデータを読み取り、SQLiteの各テーブルにINSERTする。
// camelCase（JS）→ snake_case（DB）のカラム名変換と、
// 文字列の名前（例: "星野 太郎"）→ employees.id（数値）の外部キー変換を行う。
//
// 投入順序（外部キー制約を考慮）:
//   1. employees       - 他テーブルからFK参照されるため最優先
//   2. projects        - project_members より先（FK: creator_id）
//   3. project_members - projects と employees の両方が必要
//   4. tasks           - FK: project_id, assignee_id, created_by_id
//   5. task_comments   - タスクに紐づくコメント（FK: task_id, author_id）
//   6. effort_log      - タスクに紐づく作業履歴（FK: task_id）
//   7. status_history  - タスクに紐づくステータス履歴（FK: task_id）
//   8. transfers       - タスク転送レコード（FK: task_id, from/to）
function seedData() {
  // ====================================================================
  // Step 1: 社員マスタ（employeeMaster）の投入
  // ====================================================================
  // モックデータの社員名（例: "星野 太郎"）をキーに、
  // SQLite上の employees.id（数値）を引けるようにするためのマップを構築する
  const empNameToId = {};
  employeeMaster.forEach((emp, index) => {
    const dbId = index + 1;
    empNameToId[emp.name] = dbId;
    // employees テーブルにINSERT（employee_no は "EMP001" 形式で自動生成）
    db.run(
      `INSERT INTO employees (id, employee_no, name, department, rank)
       VALUES (?, ?, ?, ?, ?)`,
      [dbId, `EMP${String(dbId).padStart(3, '0')}`, emp.name, emp.department, emp.rank]
    );
  });

  // ====================================================================
  // Step 2: プロジェクト + プロジェクトメンバーの投入
  // ====================================================================
  // モックデータのプロジェクトID（"proj-1" など）をDBの数値IDに変換するマップ
  const projIdMap = {};
  projects.forEach((proj, projIdx) => {
    const dbId = projIdx + 1;
    projIdMap[proj.id] = dbId;
    // projectsテーブルにINSERT
    // creator（名前文字列）を empNameToId で社員IDに変換する
    db.run(
      `INSERT INTO projects (id, name, description, status, progress, planned_hours, creator_id, start_date, end_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dbId, proj.name, proj.description, proj.status, proj.progress || 0, proj.plannedHours,
        empNameToId[proj.creator] || 1, proj.startDate, proj.endDate
      ]
    );
    // プロジェクトメンバー（project.members[]）を project_members テーブルに投入
    // プロジェクトごとにメンバー名を社員IDに変換してINSERTする
    (proj.members || []).forEach(memberName => {
      const empId = empNameToId[memberName];
      if (empId) {
        db.run(
          `INSERT INTO project_members (project_id, employee_id) VALUES (?, ?)`,
          [dbId, empId]
        );
      }
    });
  });

  // ====================================================================
  // Step 3: タスク + 関連テーブル（コメント/工数/履歴）の投入
  // ====================================================================
  // モックデータのタスクID（"task-1" など）をDBの数値IDに変換するマップ
  const taskIdMap = {};
  tasks.forEach((task, taskIdx) => {
    const dbId = taskIdx + 1;
    taskIdMap[task.id] = dbId;
    // tasksテーブルにINSERT
    // parentTaskId がある場合は、再帰的にモックデータ配列内を検索して
    // 対応するDBの数値IDに変換する
    db.run(
      `INSERT INTO tasks (id, project_id, parent_task_id, wbs_code, name, description,
        assignee_id, created_by_id, issue_owner_id, status, progress, priority, difficulty,
        estimated_hours, start_date, end_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        dbId,
        projIdMap[task.projectId] || 1,
        task.parentTaskId ? (tasks.findIndex(t => t.id === task.parentTaskId) + 1) : null,
        task.wbsCode, task.name, task.description || '',
        empNameToId[task.assignee] || null,
        empNameToId[task.createdBy] || 1,
        null, // issue_owner_id - シードデータは全て未設定
        task.status, task.progress || 0, task.priority, task.difficulty,
        task.estimatedHours || 0, task.startDate || '', task.endDate || ''
      ]
    );

    // タスクスレッド（task.thread[]）→ task_comments テーブル
    // 各コメントの author（名前文字列）を社員IDに変換して投入する
    (task.thread || []).forEach(comment => {
      db.run(
        `INSERT INTO task_comments (task_id, author_id, content, created_at)
         VALUES (?, ?, ?, ?)`,
        [dbId, empNameToId[comment.author] || 1, comment.content, comment.timestamp || '']
      );
    });

    // 作業工数実績（task.effortLog[]）→ effort_log テーブル
    // created_by_id はタスク作成者（task.createdBy）を準用する
    // effortLog が空でも actualHours > 0 なら移行用エントリを作成する
    if (task.effortLog && task.effortLog.length > 0) {
      task.effortLog.forEach(log => {
        db.run(
          `INSERT INTO effort_log (task_id, work_date, hours, created_by_id, created_at)
           VALUES (?, ?, ?, ?, ?)`,
          [dbId, log.date, log.hours, empNameToId[task.createdBy] || 1, log.timestamp || '']
        );
      });
    } else if (task.actualHours > 0) {
      // actualHours があるが effortLog がない場合は移行用エントリを作成
      db.run(
        `INSERT INTO effort_log (task_id, work_date, hours, created_by_id, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [dbId, '移行データ', task.actualHours, empNameToId[task.createdBy] || 1, '']
      );
    }

    // ステータス変更履歴（task.statusHistory[]）→ task_status_history テーブル
    // changedBy（名前文字列）を社員IDに変換して投入する
    (task.statusHistory || []).forEach(hist => {
      db.run(
        `INSERT INTO task_status_history (task_id, from_status, to_status, changed_by_id, comment, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [dbId, hist.from, hist.to, empNameToId[hist.changedBy] || 1, hist.comment || '', hist.timestamp || '']
      );
    });
  });

  // ====================================================================
  // Step 4: 転送レコード（transfers）の投入
  // ====================================================================
  // transfers[] 配列の各要素を transfers テーブルにINSERTする
  // from / to（名前文字列）を社員IDに変換する
  transfers.forEach((tr, trIdx) => {
    const dbId = trIdx + 1;
    db.run(
      `INSERT INTO transfers (id, task_id, from_employee_id, to_employee_id, comment, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        dbId,
        taskIdMap[tr.taskId],
        empNameToId[tr.from] || 1,
        empNameToId[tr.to] || 1,
        tr.reason || '',
        tr.read ? 1 : 0,
        tr.timestamp || ''
      ]
    );
  });
}
