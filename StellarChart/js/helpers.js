// ==========================================================================
// StellarChart - Helper functions (pure logic, no DOM manipulation)
// 役割: タスクの状態計算・表示用フォーマット・ツリー構築など、
//       DOM操作を含まない純粋関数群
// ==========================================================================
//
// 関数一覧:
//   isLeafTask                - 末端タスク判定
//   getLeafDescendants        - 末端タスク一覧取得（再帰）
//   getComputedActualHours    - 実績工数（非末端は子の合計）
//   getComputedStatus         - ステータス（非末端は子から算出）
//   getComputedAssignees      - 担当者一覧（非末端は子から収集）
//   getComputedAssigneeLabel  - 担当者表示ラベル生成
//   getComputedProgress       - 進捗率（非末端は子の平均）
//   getActualHoursBreakdown   - 実績工数の親/子内訳
//   getVisibleProjects        - 表示可能プロジェクト一覧
//   getVisibleTasksForEffort  - 工数集計で表示可能なタスク一覧
//   formatDate                - 日付フォーマット (YYYY/MM/DD)
//   getStatusLabel            - ステータス表示ラベル変換
//   getDifficultyLabel        - 難易度表示ラベル変換
//   getPriorityLabel          - 優先度表示ラベル変換
//   escapeHTML                - HTMLエスケープ（XSS対策）
//   hasChildren               - 子タスク有無判定
//   getTaskDepth              - タスク階層深さ取得
//   getNextWBSCode            - WBSコード自動採番
//   sortByWBSCode             - WBSコード順ソート
//   buildTaskTree             - タスクツリー構築
//   ensureEffortLog           - effortLog配列初期化
//   recalcActualHours         - 実績工数再計算
//   formatTimestamp           - タイムスタンプフォーマット
//   applyStatusAutoProgress   - ステータス自動進捗適用
//   addStatusHistory          - ステータス履歴追加
//
// ==========================================================================

// --- 末端タスク判定 ---
// 子タスクを持たないタスク（実際に作業ができるタスク）かどうかを返す
function isLeafTask(taskId) {
  return !tasks.some(t => t.parentTaskId === taskId);
}

// --- 全末端タスク取得 ---
// 指定タスク以下の末端タスクを再帰的に収集して返す
function getLeafDescendants(taskId) {
  const directChildren = tasks.filter(t => t.parentTaskId === taskId);
  const result = [];
  directChildren.forEach(child => {
    if (isLeafTask(child.id)) {
      result.push(child);
    } else {
      result.push(...getLeafDescendants(child.id));
    }
  });
  return result;
}

// --- 実績時間 (再帰的集計) ---
function getComputedActualHours(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return 0;
  if (isLeafTask(taskId)) return task.actualHours || 0;
  const directChildren = tasks.filter(t => t.parentTaskId === taskId);
  const childrenSum = directChildren.reduce((sum, t) => sum + getComputedActualHours(t.id), 0);
  return (task.actualHours || 0) + childrenSum;
}

// --- ステータス (子孫から最優先) ---
function getComputedStatus(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return 'not_started';
  if (isLeafTask(taskId)) return task.status;
  const leaves = getLeafDescendants(taskId);
  if (leaves.length === 0) return 'not_started';
  let highest = 'completed';
  leaves.forEach(t => {
    if (STATUS_PRIORITY.indexOf(t.status) < STATUS_PRIORITY.indexOf(highest)) {
      highest = t.status;
    }
  });
  return highest;
}

// --- 担当者一覧取得 ---
function getComputedAssignees(taskId) {
  if (isLeafTask(taskId)) {
    const task = tasks.find(t => t.id === taskId);
    return task && task.assignee ? [task.assignee] : [];
  }
  const leaves = getLeafDescendants(taskId);
  return [...new Set(leaves.filter(t => t.assignee).map(t => t.assignee))];
}

// --- 担当者ラベル ---
function getComputedAssigneeLabel(taskId) {
  const assignees = getComputedAssignees(taskId);
  if (assignees.length === 0) return '未割り当て';
  if (assignees.length <= 2) return assignees.join('、');
  return `${assignees.length}名`;
}

// --- 進捗率 (子孫の平均) ---
function getComputedProgress(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return 0;
  if (isLeafTask(taskId)) return task.progress || 0;
  const leaves = getLeafDescendants(taskId);
  if (leaves.length === 0) return 0;
  const total = leaves.reduce((sum, t) => sum + (t.progress || 0), 0);
  return Math.round(total / leaves.length);
}

// --- 実績時間の内訳 (Own / Children) ---
function getActualHoursBreakdown(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return { own: 0, children: 0, total: 0 };
  const own = task.actualHours || 0;
  if (isLeafTask(taskId)) return { own, children: 0, total: own };
  const directChildren = tasks.filter(t => t.parentTaskId === taskId);
  const children = directChildren.reduce((sum, t) => sum + getComputedActualHours(t.id), 0);
  return { own, children, total: own + children };
}

// --- 可視プロジェクト一覧 ---
function getVisibleProjects() {
  return hasRank('RankS')
    ? projects
    : projects.filter(p => p.members && p.members.includes(currentUser.name));
}

// --- 可視タスク一覧 (工数) ---
function getVisibleTasksForEffort(projectId) {
  const projectTasks = tasks.filter(t => t.projectId === projectId);
  if (hasRank('RankS') || hasRank('RankA')) {
    return projectTasks;
  }
    return projectTasks.filter(t => t.assignee === currentUser.name);
}

// --- 日付フォーマット ---
// "YYYY-MM-DD" → "YYYY/MM/DD" に変換。無効な日付は空文字
function formatDate(dateStr) {
  if (!dateStr) return '';
  return dateStr.replace(/-/g, '/');
}

// --- ステータス名変換 ---
function getStatusLabel(status) {
  switch (status) {
    case 'not_started': return '未着手';
    case 'in_progress': return '進行中';
    case 'suspended': return '中断';
    case 'completed': return '完了';
    case 'needs_action': return '要対応';
    default: return '不明';
  }
}

// --- 難易度ラベル変換 ---
function getDifficultyLabel(difficulty) {
  switch (difficulty) {
    case 'hard': return '高';
    case 'medium': return '中';
    case 'easy': return '低';
    default: return '不明';
  }
}

// --- 優先度ラベル変換 ---
function getPriorityLabel(priority) {
  switch (priority) {
    case 'high': return '高';
    case 'medium': return '中';
    case 'low': return '低';
    default: return '不明';
  }
}

// --- HTMLエスケープ ---
function escapeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// --- WBSヘルパー ---

function hasChildren(taskId) {
  return tasks.some(t => t.parentTaskId === taskId);
}

function getTaskDepth(taskId) {
  let depth = 1;
  let current = tasks.find(t => t.id === taskId);
  while (current && current.parentTaskId) {
    depth++;
    current = tasks.find(t => t.id === current.parentTaskId);
    if (depth > 10) break;
  }
  return depth;
}

function getNextWBSCode(projectId, parentTaskId) {
  const siblings = tasks.filter(t =>
    t.projectId === projectId &&
    t.parentTaskId === parentTaskId
  );
  const parent = parentTaskId ? tasks.find(t => t.id === parentTaskId) : null;
  const parentCode = parent ? parent.wbsCode : '';
  const nextNumber = siblings.length + 1;
  return parentCode ? `${parentCode}.${nextNumber}` : `${nextNumber}`;
}

function sortByWBSCode(a, b) {
  const partsA = (a.wbsCode || '').split('.').map(Number);
  const partsB = (b.wbsCode || '').split('.').map(Number);
  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] || 0;
    const numB = partsB[i] || 0;
    if (numA !== numB) return numA - numB;
  }
  return 0;
}

function buildTaskTree(projectId, parentTaskId) {
  const children = tasks
    .filter(t => t.projectId === projectId && t.parentTaskId === parentTaskId)
    .sort(sortByWBSCode);
  return children.map(task => ({
    task,
    children: buildTaskTree(projectId, task.id)
  }));
}

// --- 工数管理ヘルパー ---

function ensureEffortLog(task) {
  if (!task.effortLog) task.effortLog = [];
  if (task.effortLog.length === 0 && task.actualHours > 0) {
    task.effortLog.push({
      id: `log-${Date.now()}`,
      date: '移行データ',
      hours: task.actualHours,
      timestamp: task.createdAt || ''
    });
  }
}

function recalcActualHours(task) {
  task.actualHours = task.effortLog.reduce((s, e) => s + (e.hours || 0), 0);
}

// --- タイムスタンプ ---
function formatTimestamp(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// --- ステータス自動反映 ---
function applyStatusAutoProgress(task, newStatus) {
  const oldStatus = task.status;

  if (oldStatus === 'in_progress') {
    task.savedProgress = task.progress;
  }

  if (newStatus === 'not_started') {
    task.progress = 0;
  } else if (newStatus === 'completed') {
    task.progress = 100;
  } else if (newStatus === 'in_progress' || newStatus === 'needs_action') {
    if (task.savedProgress != null) {
      task.progress = task.savedProgress;
    }
  }
}

// --- ステータス履歴追加 ---
function addStatusHistory(task, prevStatus, newStatus, comment) {
  const now = new Date();
  const entry = {
    timestamp: formatTimestamp(now),
    from: prevStatus,
    to: newStatus,
    changedBy: currentUser.name,
    comment: comment || ''
  };
  if (!task.statusHistory) task.statusHistory = [];
  task.statusHistory.push(entry);
}
