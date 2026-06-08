// ==========================================================================
// StellarChart - Global variables and DOM element references
// 役割: アプリケーション全体で共有するグローバル状態変数と
//       DOM要素参照を定義する。このファイルは helpers.js の前に読み込むこと
// ==========================================================================
// データアクセスは repository.js に集約（taskRepo / projectRepo / transferRepo）
//
// 状態変数:
//   currentUser             - ログインユーザー { name, department, rank }
//   currentView             - 現在の表示ビュー ('projects'|'tasks'|'wbs'|'effort')
//   editingProjectId        - 編集中のプロジェクトID
//   editingTaskId           - 編集中のタスクID
//   currentTaskProjectId    - タスク作成・編集時のプロジェクトID
//   selectedEmployeeNames   - 社員選択用の一時的な状態（Set）
//   wbsCurrentProjectId     - WBS表示中のプロジェクトID
//   creatingChildParentTaskId - 子タスク作成時の親タスクID
//   taskEndDateBoundary     - タスク終了日の上限
//   taskEndDateBoundaryLabel - 上限ラベル
//
// DOM要素: 全画面の各input/select/button/dialogへの参照
//
// ==========================================================================

// --- 現在のユーザー (ログイン後に設定) ---
let currentUser = null;

// 既存タスクにWBSコードを初期化（移行用：未設定のタスクにのみ採番）
taskRepo.syncWBSCodes();

// 現在の表示ビュー
let currentView = 'projects';

// 編集対象プロジェクトID (新規作成時は null)
let editingProjectId = null;
// 編集対象タスクID (新規作成時は null)
let editingTaskId = null;
// タスク作成・編集時のプロジェクトID
let currentTaskProjectId = null;
// 社員選択用の一時的な状態
let selectedEmployeeNames = new Set();
// WBS状態
let wbsCurrentProjectId = null;
let creatingChildParentTaskId = null;
let taskEndDateBoundary = null;
let taskEndDateBoundaryLabel = '';

// --- DOM 要素の取得 ---
const projectGrid = document.getElementById('project-list-grid');
const emptyState = document.getElementById('empty-state');

// 検索・フィルター要素
const searchKeywordInput = document.getElementById('search-keyword');
const filterStatusSelect = document.getElementById('filter-status');
const filterStartDateInput = document.getElementById('filter-start-date');
const filterEndDateInput = document.getElementById('filter-end-date');
const btnResetFilters = document.getElementById('btn-reset-filters');

// プロジェクト用ダイアログ要素
const projectDialog = document.getElementById('project-dialog');
const projectDialogTitle = document.getElementById('project-dialog-title');
const btnSubmitProject = document.getElementById('btn-submit-project');
const btnCreateProject = document.getElementById('btn-create-project');
const btnCloseDialog = document.getElementById('btn-close-dialog');
const btnCancelProject = document.getElementById('btn-cancel-project');
const projectForm = document.getElementById('project-form');

// ダイアログ内の要素
const projNameInput = document.getElementById('proj-name');
const countName = document.getElementById('count-name');
const projDescInput = document.getElementById('proj-description');
const countDescription = document.getElementById('count-description');
const projProgressInput = document.getElementById('proj-progress');
const progressValDisplay = document.getElementById('progress-val-display');
const projMembersInput = document.getElementById('proj-members');
const projCreatorInput = document.getElementById('proj-creator');
const btnSelectMembers = document.getElementById('btn-select-members');
const projPlannedHoursInput = document.getElementById('proj-planned-hours');

// 社員選択ダイアログ要素
const employeeDialog = document.getElementById('employee-dialog');
const btnCloseEmpDialog = document.getElementById('btn-close-emp-dialog');
const btnCancelEmp = document.getElementById('btn-cancel-emp');
const btnConfirmEmp = document.getElementById('btn-confirm-emp');
const empSearchKeywordInput = document.getElementById('emp-search-keyword');
const empListContainer = document.getElementById('emp-list');

// タスクビュー要素
const taskListView = document.getElementById('task-list-view');
const taskGrid = document.getElementById('task-list-grid');
const taskEmptyState = document.getElementById('task-empty-state');
const taskSearchKeywordInput = document.getElementById('task-search-keyword');
const taskFilterProject = document.getElementById('task-filter-project');
const taskFilterStatus = document.getElementById('task-filter-status');
const taskFilterPriority = document.getElementById('task-filter-priority');
const btnResetTaskFilters = document.getElementById('btn-reset-task-filters');

// タスクダイアログ要素
const taskDialog = document.getElementById('task-dialog');
const taskDialogTitle = document.getElementById('task-dialog-title');
const btnSubmitTask = document.getElementById('btn-submit-task');
const btnCloseTaskDialog = document.getElementById('btn-close-task-dialog');
const btnCancelTask = document.getElementById('btn-cancel-task');
const taskForm = document.getElementById('task-form');
const taskNameInput = document.getElementById('task-name');
const countTaskName = document.getElementById('count-task-name');
const taskDescInput = document.getElementById('task-description');
const countTaskDesc = document.getElementById('count-task-desc');
const taskProjectDisplay = document.getElementById('task-project-display');
const taskAssigneeSelect = document.getElementById('task-assignee');
const taskStartDateInput = document.getElementById('task-start-date');
const taskEndDateInput = document.getElementById('task-end-date');
const taskPrioritySelect = document.getElementById('task-priority');
const taskDifficultySelect = document.getElementById('task-difficulty');
const taskStatusSelect = document.getElementById('task-status');
const taskEstHoursInput = document.getElementById('task-est-hours');
const taskActHoursInput = document.getElementById('task-act-hours');
const taskProgressInput = document.getElementById('task-progress');
const taskProgressValDisplay = document.getElementById('task-progress-val-display');
const formGroupStatus = document.getElementById('form-group-status');
const formGroupActualHours = document.getElementById('form-group-actual-hours');
const formGroupProgress = document.getElementById('form-group-progress');

// タスク詳細モーダル要素
const taskDetailDialog = document.getElementById('task-detail-dialog');
const taskDetailTitle = document.getElementById('task-detail-title');
const taskDetailBody = document.getElementById('task-detail-body');
const btnCloseTaskDetail = document.getElementById('btn-close-task-detail');

// 要課題要素
const btnIssues = document.getElementById('btn-issues');
const issueBadge = document.getElementById('issue-badge');
const issuePanel = document.getElementById('issue-panel');
const issueList = document.getElementById('issue-list');
const btnCloseIssuePanel = document.getElementById('btn-close-issue-panel');
const issueOverlay = document.getElementById('issue-overlay');

// 転送ダイアログ要素
const transferDialog = document.getElementById('transfer-dialog');
const transferReason = document.getElementById('transfer-reason');
const transferTarget = document.getElementById('transfer-target');
const errorTransferTarget = document.getElementById('error-transfer-target');
const btnCloseTransfer = document.getElementById('btn-close-transfer');
const btnCancelTransfer = document.getElementById('btn-cancel-transfer');
const btnConfirmTransfer = document.getElementById('btn-confirm-transfer');

// サイドバーナビゲーション
const navProjects = document.getElementById('nav-projects');
const navTasks = document.getElementById('nav-tasks');
const navWBS = document.getElementById('nav-wbs');
const navEffort = document.getElementById('nav-effort');

// WBSビュー要素
const wbsView = document.getElementById('wbs-view');
const wbsProjectSelect = document.getElementById('wbs-project-select');
const wbsTreeContainer = document.getElementById('wbs-tree-container');
const wbsEmptyState = document.getElementById('wbs-empty-state');
const wbsMyTasksOnly = document.getElementById('wbs-my-tasks-only');

const effortSummaryView = document.getElementById('effort-summary-view');
const effortSummaryGrid = document.getElementById('effort-summary-grid');
const effortProjectSelect = document.getElementById('effort-project-select');
