// ==========================================================================
// StellarChart - Application entry point
// 役割: アプリケーションの起動エントリポイント。
//       initApp() はログイン成功後に呼び出され、Flatpickr の初期化、
//       全イベントリスナーの登録、初回レンダリング、サイドバー設定を行う
// ==========================================================================
//
// 関数一覧:
//   initApp() - アプリ初期化（Flatpickr・イベントリスナー・初回レンダリング）
//
// ==========================================================================

// --- アプリケーション起動時の処理 ---
document.addEventListener('DOMContentLoaded', () => {
  showLoginDialog();
});

// --- アプリ初期化 ---
// 初回レンダリング・Flatpickr初期化・全イベントリスナー登録・
// サイドバーナビゲーション設定を行う
// ログイン後に一度だけ実行される
function initApp() {
  // 初回レンダリング
  renderProjects();
  populateEffortProjectSelect();

  // サイドバーのユーザー情報を動的に更新
  const sidebarAvatar = document.querySelector('.user-avatar');
  const sidebarUserName = document.querySelector('.user-name');
  const sidebarUserRole = document.querySelector('.user-role');
  if (sidebarAvatar) {
    const initials = currentUser.name.split(' ').map(s => s[0]).join('').slice(0, 2);
    sidebarAvatar.textContent = initials;
  }
  if (sidebarUserName) sidebarUserName.textContent = currentUser.name;
  if (sidebarUserRole) sidebarUserRole.textContent = RANK_LABELS[currentUser.rank] || '';

  // Flatpickr config (moved to utils/flatpickr.js)

  filterStartFp = flatpickr("#filter-start-date", {
    ...fpConfig,
    onChange: () => renderProjects()
  });

  filterEndFp = flatpickr("#filter-end-date", {
    ...fpConfig,
    position: "auto right",
    onChange: () => renderProjects()
  });

  projStartFp = flatpickr("#proj-start-date", {
    ...fpConfig,
    static: true,
    onChange: function(selectedDates) {
      if (selectedDates[0]) {
        projEndFp.set('minDate', selectedDates[0]);
      } else {
        projEndFp.set('minDate', null);
      }
    }
  });

  projEndFp = flatpickr("#proj-end-date", {
    ...fpConfig,
    static: true,
    position: "auto right",
    onChange: function(selectedDates) {
      if (selectedDates[0]) {
        projStartFp.set('maxDate', selectedDates[0]);
      } else {
        projStartFp.set('maxDate', null);
      }
    }
  });

  // 検索・フィルタリングのイベントリスナー
  searchKeywordInput.addEventListener('input', renderProjects);
  filterStatusSelect.addEventListener('change', renderProjects);
  
  // フィルターリセット
  btnResetFilters.addEventListener('click', resetFilters);

  // プロジェクトダイアログ制御
  btnCreateProject.addEventListener('click', openCreateDialog);
  btnCloseDialog.addEventListener('click', closeCreateDialog);
  btnCancelProject.addEventListener('click', closeCreateDialog);
  
  // 文字数カウント
  projNameInput.addEventListener('input', () => {
    countName.textContent = `${projNameInput.value.length} / 30`;
  });
  projDescInput.addEventListener('input', () => {
    countDescription.textContent = `${projDescInput.value.length} / 200`;
  });

  // 進捗スライダー変更時の表示更新
  projProgressInput.addEventListener('input', (e) => {
    progressValDisplay.textContent = `${e.target.value}%`;
  });

  // 社員選択ダイアログの起動
  btnSelectMembers.addEventListener('click', openEmployeeDialog);
  btnCloseEmpDialog.addEventListener('click', () => employeeDialog.close());
  btnCancelEmp.addEventListener('click', () => employeeDialog.close());
  btnConfirmEmp.addEventListener('click', confirmSelectedEmployees);

  // 社員検索キーワード入力
  empSearchKeywordInput.addEventListener('input', () => {
    renderEmployees(empSearchKeywordInput.value.toLowerCase().trim());
  });

  // プロジェクトフォーム送信
  projectForm.addEventListener('submit', handleFormSubmit);

  // --- タスク関連の初期化 ---

  // タスク用Flatpickr (開始日・終了日)
  taskStartDateFp = flatpickr("#task-start-date", {
    ...fpConfig,
    static: true,
    onChange: function(selectedDates) {
      if (selectedDates[0]) {
        taskEndDateFp.set('minDate', selectedDates[0]);
      } else {
        taskEndDateFp.set('minDate', null);
      }
    }
  });

  taskEndDateFp = flatpickr("#task-end-date", {
    ...fpConfig,
    static: true,
    position: "auto right",
    onChange: function(selectedDates) {
      if (selectedDates[0]) {
        taskStartDateFp.set('maxDate', selectedDates[0]);
      } else {
        taskStartDateFp.set('maxDate', null);
      }
      updateTaskEndDateWarning();
    }
  });

  // プロジェクトセレクトボックス初期構築
  populateProjectSelects();
  populateWBSProjectSelect();

  // 担当者セレクトボックス初期構築
  populateAssigneeSelect();

  // タスクフィルターのイベント
  taskSearchKeywordInput.addEventListener('input', renderTasks);
  taskFilterProject.addEventListener('change', renderTasks);
  taskFilterStatus.addEventListener('change', renderTasks);
  taskFilterPriority.addEventListener('change', renderTasks);
  btnResetTaskFilters.addEventListener('click', resetTaskFilters);

  // タスクダイアログ制御
  btnCloseTaskDialog.addEventListener('click', () => { creatingChildParentTaskId = null; taskEndDateBoundary = null; taskEndDateBoundaryLabel = ''; taskDialog.close(); });
  btnCancelTask.addEventListener('click', () => { creatingChildParentTaskId = null; taskEndDateBoundary = null; taskEndDateBoundaryLabel = ''; taskDialog.close(); });

  // タスク文字数カウント
  taskNameInput.addEventListener('input', () => {
    countTaskName.textContent = `${taskNameInput.value.length} / 50`;
  });
  taskDescInput.addEventListener('input', () => {
    countTaskDesc.textContent = `${taskDescInput.value.length} / 300`;
  });

  // タスク進捗スライダー
  taskProgressInput.addEventListener('input', (e) => {
    taskProgressValDisplay.textContent = `${e.target.value}%`;
  });

  // タスクフォーム送信
  taskForm.addEventListener('submit', handleTaskFormSubmit);

  // タスク詳細モーダル制御
  btnCloseTaskDetail.addEventListener('click', () => taskDetailDialog.close());

  // 要課題パネル制御
  btnIssues.addEventListener('click', openIssuePanel);
  btnCloseIssuePanel.addEventListener('click', closeIssuePanel);
  issueOverlay.addEventListener('click', closeIssuePanel);

  // 転送ダイアログ制御
  btnCloseTransfer.addEventListener('click', () => transferDialog.close());
  btnCancelTransfer.addEventListener('click', () => transferDialog.close());
  transferTarget.addEventListener('change', () => {
    errorTransferTarget.textContent = '';
    transferTarget.classList.remove('input-error');
  });
  btnConfirmTransfer.addEventListener('click', confirmTransfer);

  // 要課題バッジの初期更新
  updateIssueBadge();

  // ランクに応じてUI制御
  applyRankBasedUI();

  // サイドバーナビゲーション
  navProjects.addEventListener('click', (e) => {
    e.preventDefault();
    switchView('projects');
  });
  navTasks.addEventListener('click', (e) => {
    e.preventDefault();
    switchView('tasks');
  });
  navWBS.addEventListener('click', (e) => {
    e.preventDefault();
    switchView('wbs');
  });
  navEffort.addEventListener('click', (e) => {
    e.preventDefault();
    switchView('effort');
  });

  // WBSビューイベント
  wbsProjectSelect.addEventListener('change', renderWBS);
  wbsMyTasksOnly.addEventListener('change', renderWBS);

  // 工数集計イベント
  effortProjectSelect.addEventListener('change', renderEffortSummary);

  wbsTreeContainer.addEventListener('click', (e) => {
    const toggle = e.target.closest('[data-toggle]');
    if (toggle) {
      const childrenContainer = toggle.closest('.wbs-tree-node').querySelector('.wbs-children');
      if (childrenContainer) {
        childrenContainer.classList.toggle('collapsed');
        toggle.classList.toggle('collapsed');
        toggle.classList.toggle('expanded');
        toggle.textContent = childrenContainer.classList.contains('collapsed') ? '▶' : '▼';
      }
      return;
    }

    const childBtn = e.target.closest('.wbs-btn-child');
    if (childBtn) {
      if (!canEditTask()) return;
      const parentId = childBtn.dataset.parentId;
      openCreateChildTaskDialog(parentId);
      return;
    }

    // ノード本体クリックでタスク詳細
    const nodeRow = e.target.closest('.wbs-node-row');
    if (nodeRow) {
      const taskId = nodeRow.closest('.wbs-tree-node').dataset.taskId;
      if (taskId) {
        openTaskDetail(taskId);
      }
    }
  });
}
