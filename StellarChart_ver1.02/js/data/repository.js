// ==========================================================================
// StellarChart - Data Repository (データアクセス層)
// 役割: アプリケーション全体のデータアクセスをこのファイルに集約する。
//       Phase2 より内部実装をグローバル配列 → SQLite (api-client) に切り替え。
//       全コンポーネントは repository 経由でのみデータを読み書きする。
//
// 変換ルール:
//   蛇 <-> キャメル: DBのsnake_caseとJSのcamelCaseを自動変換
//   社員名 <-> ID: DBはemployees.id（数値）、JSは名前（文字列）
//   ネストデータ: thread / effortLog / statusHistory は
//     別テーブルから都度JOIN・アセンブルする
// ==========================================================================

// ========================================================================
// 共通ヘルパー
// ========================================================================

// snake_case → camelCase 変換（例: project_id → projectId）
function snakeToCamel(str) {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

// camelCase → snake_case 変換（例: projectId → project_id）
function camelToSnake(str) {
  return str.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
}

// 社員名から employees.id を取得
function empNameToId(name) {
  const emp = employeeMaster.find(e => e.name === name);
  return emp ? employeeMaster.indexOf(emp) + 1 : null;
}

// employees.id から社員名を取得
function empIdToName(id) {
  const emp = employeeMaster[id - 1];
  return emp ? emp.name : null;
}

// DB行オブジェクト（snake_case）のキーを camelCase に変換
function rowToCamel(row) {
  const obj = {};
  Object.keys(row).forEach(key => {
    obj[snakeToCamel(key)] = row[key];
  });
  return obj;
}

// JSオブジェクト（camelCase）のキーを snake_case に変換
// 指定した keys のみ変換（DBに存在するカラムだけを抽出）
function objToSnake(obj, keys) {
  const data = {};
  keys.forEach(key => {
    const snakeKey = camelToSnake(key);
    if (obj[key] !== undefined) {
      data[snakeKey] = obj[key];
    }
  });
  return data;
}

// DBに保存する用のタスクデータに変換（snake_case + ID解決）
function taskToDbRow(taskData) {
  const dbRow = objToSnake(taskData, [
    'projectId', 'parentTaskId', 'wbsCode', 'name', 'description',
    'status', 'progress', 'priority', 'difficulty',
    'estimatedHours', 'startDate', 'endDate'
  ]);
  if (taskData.assignee !== undefined) {
    dbRow.assignee_id = empNameToId(taskData.assignee);
  }
  if (taskData.createdBy !== undefined) {
    dbRow.created_by_id = empNameToId(taskData.createdBy);
  }
  if (taskData.issueOwnerId !== undefined) {
    dbRow.issue_owner_id = empNameToId(taskData.issueOwnerId);
  }
  return dbRow;
}

// DB行（snake_case）からタスクオブジェクトをアセンブル
function assembleTask(row) {
  const task = rowToCamel(row);
  task.assignee = empIdToName(row.assignee_id) || '';
  task.createdBy = empIdToName(row.created_by_id) || '';
  task.issueOwnerId = empIdToName(row.issue_owner_id) || '';
  task.parentTaskId = row.parent_task_id || null;

  // ネストデータを子テーブルから読み込み
  task.thread = api.query(
    'SELECT tc.*, e.name AS author_name FROM task_comments tc LEFT JOIN employees e ON tc.author_id = e.id WHERE tc.task_id = ? ORDER BY tc.id',
    [row.id]
  ).map(c => ({
    id: `tc-${c.id}`,
    author: empIdToName(c.author_id) || '',
    content: c.content,
    timestamp: c.created_at || ''
  }));

  task.statusHistory = api.query(
    'SELECT * FROM task_status_history WHERE task_id = ? ORDER BY id',
    [row.id]
  ).map(h => ({
    timestamp: h.created_at || '',
    from: h.from_status || '',
    to: h.to_status || '',
    changedBy: empIdToName(h.changed_by_id) || '',
    comment: h.comment || ''
  }));

  task.effortLog = api.query(
    'SELECT * FROM effort_log WHERE task_id = ? ORDER BY id',
    [row.id]
  ).map(e => ({
    id: `log-${e.id}`,
    date: e.work_date || '',
    hours: e.hours || 0,
    timestamp: e.created_at || ''
  }));

  // actualHours は effortLog から集計
  const totalActual = task.effortLog.reduce((sum, e) => sum + (e.hours || 0), 0);
  task.actualHours = totalActual;

  // JS内部状態（DBには保存しないがJS上は維持）
  if (task.savedProgress === undefined) task.savedProgress = null;

  return task;
}

// DB行（snake_case）からプロジェクトオブジェクトをアセンブル
function assembleProject(row) {
  const proj = rowToCamel(row);
  proj.creator = empIdToName(row.creator_id) || '';
  // メンバー一覧を project_members + employees から取得
  const memberRows = api.query(
    'SELECT e.name FROM project_members pm JOIN employees e ON pm.employee_id = e.id WHERE pm.project_id = ?',
    [row.id]
  );
  proj.members = memberRows.map(r => r.name);
  return proj;
}

// DB行（snake_case）から転送レコードをアセンブル
function assembleTransfer(row) {
  return {
    id: row.id,
    taskId: row.task_id,
    from: empIdToName(row.from_employee_id) || '',
    to: empIdToName(row.to_employee_id) || '',
    reason: row.comment || '',
    timestamp: row.created_at || '',
    read: !!row.is_read
  };
}

// ネストデータ個別追加・削除（差分更新用）
// 従来の saveNestedData（全削除→再INSERT）に代わり、
// repository.js 内でのみ shortid から DB id を解決する

// (taskRepo 内に同名メソッドあり。外からは taskRepo.addComment で呼ぶ)

// ========================================================================
// taskRepo
// ========================================================================
const taskRepo = {
  // --- 参照系 ---

  findById(id) {
    const row = api.findById('tasks', id);
    if (!row) return null;
    return assembleTask(row);
  },

  findByProject(projectId) {
    const rows = api.findWhere('tasks', { project_id: projectId });
    return rows.map(r => assembleTask(r));
  },

  findByParent(parentTaskId) {
    const rows = parentTaskId
      ? api.findWhere('tasks', { parent_task_id: parentTaskId })
      : api.query('SELECT * FROM tasks WHERE parent_task_id IS NULL');
    return rows.map(r => assembleTask(r));
  },

  hasChildren(taskId) {
    const rows = api.query('SELECT COUNT(*) as cnt FROM tasks WHERE parent_task_id = ?', [taskId]);
    return rows[0] && rows[0].cnt > 0;
  },

  findAll() {
    const rows = api.query('SELECT * FROM tasks ORDER BY id');
    return rows.map(r => assembleTask(r));
  },

  getLeaves(taskId) {
    const directChildren = this.findByParent(taskId);
    const result = [];
    directChildren.forEach(child => {
      if (this.hasChildren(child.id)) {
        result.push(...this.getLeaves(child.id));
      } else {
        result.push(child);
      }
    });
    return result;
  },

  // --- 書込系 ---

  save(taskData) {
    const dbRow = taskToDbRow(taskData);
    if (taskData.id) {
      // 既存タスクの更新（タスク列のみ。ネストデータは別途追加）
      const existing = this.findById(taskData.id);
      if (existing) {
        api.update('tasks', taskData.id, dbRow);
      }
      return this.findById(taskData.id);
    }
    // 新規タスク作成
    const newId = api.insert('tasks', {
      ...dbRow,
      created_by_id: dbRow.created_by_id || 1,
      wbs_code: dbRow.wbs_code || ''
    });
    // 初期 effortLog があれば保存
    if (taskData.effortLog && taskData.effortLog.length > 0) {
      (taskData.effortLog).forEach(e => {
        api.insert('effort_log', {
          task_id: newId,
          work_date: e.date || '',
          hours: e.hours || 0,
          created_by_id: dbRow.created_by_id || 1,
          created_at: e.timestamp || ''
        });
      });
    }
    return this.findById(newId);
  },

  // タスクオブジェクトのプロパティ変更をDBに反映（タスク列のみ。ネストデータは別途追加）
  saveProperty(task) {
    if (!task.id) return;
    const dbRow = taskToDbRow(task);
    api.update('tasks', task.id, dbRow);
  },

  delete(id) {
    api.delete('tasks', id);
  },

  deleteWithChildren(id) {
    const childIds = this.findByParent(id).map(t => t.id);
    childIds.forEach(cid => this.deleteWithChildren(cid));
    this.delete(id);
  },

  deleteByProject(projectId) {
    api.execute('DELETE FROM tasks WHERE project_id = ?', [projectId]);
  },

  // --- WBSコード管理 ---

  // 既存のWBSコード一覧から最小の欠番を見つける（案B: 欠番埋め）
  _nextChildCode(existingCodes) {
    const nums = existingCodes.map(c => parseInt(c, 10)).filter(n => !isNaN(n));
    nums.sort((a, b) => a - b);
    let next = 1;
    for (const n of nums) {
      if (n === next) {
        next++;
      } else if (n > next) {
        break;
      }
    }
    return next;
  },

  nextWBSCode(parentTaskId) {
    if (parentTaskId) {
      const parent = this.findById(parentTaskId);
      if (!parent || !parent.wbsCode) {
        // フォールバック: 全体の最大WBSコードから生成
        const rows = api.query('SELECT wbs_code FROM tasks WHERE parent_task_id IS NULL AND wbs_code IS NOT NULL AND wbs_code != \'\'');
        const codes = rows.map(r => r.wbs_code);
        return String(this._nextChildCode(codes));
      }
      const siblings = this.findByParent(parentTaskId);
      const codes = siblings.map(s => s.wbsCode.split('.').pop());
      const nextNum = this._nextChildCode(codes);
      return `${parent.wbsCode}.${nextNum}`;
    }
    const rows = api.query('SELECT wbs_code FROM tasks WHERE parent_task_id IS NULL AND wbs_code IS NOT NULL AND wbs_code != \'\'');
    const codes = rows.map(r => r.wbs_code);
    return String(this._nextChildCode(codes));
  },

  syncWBSCodes() {
    // 全タスクの parent_task_id を正規化
    api.execute("UPDATE tasks SET parent_task_id = NULL WHERE parent_task_id = 0");

    // トップレベルの最大WBSコードを取得
    const maxRow = api.query("SELECT COALESCE(MAX(CAST(wbs_code AS INTEGER)), 0) as max_code FROM tasks WHERE parent_task_id IS NULL");
    let counter = maxRow[0]?.max_code || 0;

    // WBSコード未設定のトップレベルタスクに採番
    const unsetTop = api.query("SELECT id FROM tasks WHERE parent_task_id IS NULL AND (wbs_code IS NULL OR wbs_code = '') ORDER BY id");
    unsetTop.forEach(row => {
      counter++;
      api.execute("UPDATE tasks SET wbs_code = ?, parent_task_id = NULL WHERE id = ?", [String(counter), row.id]);
    });

    // 子タスクにも同様に採番（再帰的に処理）
    const assignChildCodes = (parentId, parentCode) => {
      const children = api.query("SELECT id FROM tasks WHERE parent_task_id = ? AND (wbs_code IS NULL OR wbs_code = '') ORDER BY id", [parentId]);
      children.forEach((child, i) => {
        const code = `${parentCode}.${i + 1}`;
        api.execute("UPDATE tasks SET wbs_code = ? WHERE id = ?", [code, child.id]);
        assignChildCodes(child.id, code);
      });
    };

    // 全トップレベルタスクの子を処理
    const topLevel = api.query("SELECT id, wbs_code FROM tasks WHERE parent_task_id IS NULL AND wbs_code IS NOT NULL AND wbs_code != ''");
    topLevel.forEach(row => {
      assignChildCodes(row.id, row.wbs_code);
    });
    // まだ処理されてない子タスクも処理
    const anyUnset = api.query("SELECT id, parent_task_id FROM tasks WHERE wbs_code IS NULL OR wbs_code = ''");
    if (anyUnset.length > 0) {
      const topRow = api.query("SELECT COALESCE(MAX(CAST(wbs_code AS INTEGER)), 0) as max_code FROM tasks WHERE parent_task_id IS NULL");
      let fallbackCounter = topRow[0]?.max_code || 0;
      anyUnset.forEach(row => {
        // 親を探す
        const parent = api.findById('tasks', row.parent_task_id);
        if (parent && parent.wbs_code) {
          const siblings = api.query("SELECT COUNT(*) as cnt FROM tasks WHERE parent_task_id = ?", [row.parent_task_id]);
          const code = `${parent.wbs_code}.${siblings[0].cnt + 1}`;
          api.execute("UPDATE tasks SET wbs_code = ? WHERE id = ?", [code, row.id]);
        } else {
          fallbackCounter++;
          api.execute("UPDATE tasks SET wbs_code = ? WHERE id = ?", [String(fallbackCounter), row.id]);
        }
      });
    }
  },

  // --- ネストデータ個別追加・削除（差分更新） ---

  addComment(taskId, commentData) {
    api.insert('task_comments', {
      task_id: taskId,
      author_id: empNameToId(commentData.author) || 1,
      content: commentData.content,
      created_at: commentData.timestamp || ''
    });
  },

  addStatusHistory(taskId, entry) {
    api.insert('task_status_history', {
      task_id: taskId,
      from_status: entry.from || '',
      to_status: entry.to || '',
      changed_by_id: empNameToId(entry.changedBy) || 1,
      comment: entry.comment || '',
      created_at: entry.timestamp || ''
    });
  },

  addEffortLog(taskId, entry) {
    api.insert('effort_log', {
      task_id: taskId,
      work_date: entry.date || '',
      hours: entry.hours || 0,
      created_by_id: empNameToId(currentUser.name) || 1,
      created_at: entry.timestamp || ''
    });
  },

  deleteEffortLog(taskId, logId) {
    const dbId = String(logId).replace('log-', '');
    api.execute('DELETE FROM effort_log WHERE id = ? AND task_id = ?', [dbId, taskId]);
  }
};

// ========================================================================
// projectRepo
// ========================================================================
const projectRepo = {
  findById(id) {
    const row = api.findById('projects', id);
    if (!row) return null;
    return assembleProject(row);
  },

  findAll() {
    const rows = api.query('SELECT * FROM projects ORDER BY id');
    return rows.map(r => assembleProject(r));
  },

  findVisible(user) {
    const rows = api.query(
      `SELECT DISTINCT p.* FROM projects p
       JOIN project_members pm ON p.id = pm.project_id
       JOIN employees e ON pm.employee_id = e.id
       WHERE e.name = ?
       ORDER BY p.id`,
      [user.name]
    );
    return rows.map(r => assembleProject(r));
  },

  save(projectData) {
    const dbRow = objToSnake(projectData, [
      'name', 'description', 'status', 'plannedHours',
      'startDate', 'endDate', 'progress'
    ]);
    if (projectData.creator) {
      dbRow.creator_id = empNameToId(projectData.creator) || 1;
    }
    if (projectData.id) {
      // 更新
      const existing = this.findById(projectData.id);
      if (existing) {
        api.update('projects', projectData.id, dbRow);
        // メンバー再同期
        api.execute('DELETE FROM project_members WHERE project_id = ?', [projectData.id]);
        (projectData.members || []).forEach(m => {
          const eid = empNameToId(m);
          if (eid) {
            api.insert('project_members', { project_id: projectData.id, employee_id: eid });
          }
        });
      }
      return this.findById(projectData.id);
    }
    // 新規作成
    const newId = api.insert('projects', dbRow);
    // メンバー同期
    projectData.members = projectData.members || [];
    if (projectData.creator && !projectData.members.includes(projectData.creator)) {
      projectData.members.unshift(projectData.creator);
    }
    (projectData.members || []).forEach(m => {
      const eid = empNameToId(m);
      if (eid) {
        api.insert('project_members', { project_id: newId, employee_id: eid });
      }
    });
    return this.findById(newId);
  },

  delete(id) {
    api.delete('projects', id);
    taskRepo.deleteByProject(id);
  }
};

// ========================================================================
// transferRepo
// ========================================================================
const transferRepo = {
  findById(id) {
    const row = api.findById('transfers', id);
    if (!row) return null;
    return assembleTransfer(row);
  },

  findByTaskId(taskId) {
    const rows = api.query(
      'SELECT * FROM transfers WHERE task_id = ? ORDER BY id DESC',
      [taskId]
    );
    return rows.map(r => assembleTransfer(r));
  },

  findByTargetUser(userName) {
    const empId = empNameToId(userName);
    if (!empId) return [];
    const rows = api.findWhere('transfers', { to_employee_id: empId });
    return rows.map(r => assembleTransfer(r));
  },

  findAll() {
    const rows = api.query('SELECT * FROM transfers ORDER BY id');
    return rows.map(r => assembleTransfer(r));
  },

  save(transferData) {
    const dbRow = {
      task_id: transferData.taskId,
      from_employee_id: empNameToId(transferData.from) || 1,
      to_employee_id: empNameToId(transferData.to) || 1,
      comment: transferData.reason || '',
      is_read: transferData.read ? 1 : 0,
      created_at: transferData.timestamp || ''
    };
    if (transferData.id) {
      api.update('transfers', transferData.id, dbRow);
      return this.findById(transferData.id);
    }
    const newId = api.insert('transfers', dbRow);
    return this.findById(newId);
  }
};
