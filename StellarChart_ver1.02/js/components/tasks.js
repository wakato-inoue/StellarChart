// ==========================================================================
// StellarChart - Task list component
// 役割: タスク一覧画面の描画・フィルタリング・削除・
//       担当者セレクトボックスの構築を行う
// ==========================================================================
// データアクセスは repository.js に集約（taskRepo / projectRepo / transferRepo）
//
// 関数一覧:
//   populateAssigneeSelect(projectId) - タスクフォームの担当者セレクトを構築（プロジェクトメンバーで絞り込み）
//   resetTaskFilters                  - タスク検索フィルターをすべて初期値に戻す
//   renderTasks                       - タスクカード一覧をフィルター条件で絞り込み描画（ランク可視性対応）
//   deleteTask(taskId)                - タスクと子タスクを再帰的に削除（確認ダイアログ付き）
//
// ==========================================================================

// --- 担当者セレクトボックスの構築 ---
function populateAssigneeSelect(projectId) {
  taskAssigneeSelect.innerHTML = '<option value="">選択してください</option>';

  let candidates = employeeMaster;
  if (projectId) {
    const proj = projectRepo.findById(projectId);
    if (proj && proj.members) {
      candidates = employeeMaster.filter(emp => proj.members.includes(emp.name));
    }
  }

  candidates.forEach(emp => {
    const opt = document.createElement('option');
    opt.value = emp.name;
    opt.textContent = `${emp.name} (${emp.department})`;
    taskAssigneeSelect.appendChild(opt);
  });
}

// --- タスクフィルターリセット ---
function resetTaskFilters() {
  taskSearchKeywordInput.value = '';
  taskFilterProject.value = 'all';
  taskFilterStatus.value = 'all';
  taskFilterPriority.value = 'all';
  taskFilterDone.checked = false;
  renderTasks();
}

// --- ルート先祖を検索（最上位の親タスク） ---
function findRootAncestor(task) {
  let t = task;
  const seen = new Set();
  while (t.parentTaskId) {
    if (seen.has(t.id)) break;
    seen.add(t.id);
    const p = taskRepo.findById(t.parentTaskId);
    if (!p) break;
    t = p;
  }
  return t;
}

// --- タスク一覧の描画 ---
function renderTasks() {
  const keyword = taskSearchKeywordInput.value.toLowerCase().trim();
  const projectFilter = taskFilterProject.value;
  const statusFilter = taskFilterStatus.value;
  const priorityFilter = taskFilterPriority.value;

  const filteredTasks = taskRepo.findAll().filter(task => {
    if (keyword) {
      const nameMatch = task.name.toLowerCase().includes(keyword);
      const descMatch = (task.description || '').toLowerCase().includes(keyword);
      if (!nameMatch && !descMatch) return false;
    }
    if (projectFilter !== 'all' && String(task.projectId) !== projectFilter) return false;
    if (statusFilter !== 'all' && getComputedStatus(task.id) !== statusFilter) return false;
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
    if (!taskFilterDone.checked && getComputedStatus(task.id) === 'completed') return false;

    if (hasRank('RankS')) {
    } else if (hasRank('RankA')) {
      const proj = projectRepo.findById(task.projectId);
      if (!proj || !proj.members.includes(currentUser.name)) return false;
    } else {
      if (task.assignee !== currentUser.name) return false;
    }

    return true;
  });

  filteredTasks.sort(sortByWBSCode);

  taskGrid.innerHTML = '';

  if (filteredTasks.length === 0) {
    taskEmptyState.classList.remove('hidden');
    taskGrid.classList.add('hidden');
    return;
  }

  taskEmptyState.classList.add('hidden');
  taskGrid.classList.remove('hidden');

  // ルート先祖でグループ化（WBSソート順を維持）
  const groups = new Map();
  filteredTasks.forEach(t => {
    const root = findRootAncestor(t);
    const key = root ? root.id : 'roots';
    if (!groups.has(key)) {
      groups.set(key, {
        rootName: root ? root.name : 'ルート',
        rootWbs: root ? root.wbsCode : '',
        tasks: []
      });
    }
    groups.get(key).tasks.push(t);
  });

  const _canEdit = canEditTask();
  const _canDelete = canDeleteTask();

  groups.forEach((group) => {
    const header = document.createElement('div');
    header.className = 'task-group-header';
    const wbsHtml = group.rootWbs
      ? `<span class="task-wbs-code">${escapeHTML(group.rootWbs)}</span> `
      : '';
    header.innerHTML = wbsHtml + escapeHTML(group.rootName);
    taskGrid.appendChild(header);

    group.tasks.forEach(t => {
      const _isLeaf = isLeafTask(t.id);
      const computedStatus = getComputedStatus(t.id);
      const computedAssigneeLabel = getComputedAssigneeLabel(t.id);
      const computedActual = getComputedActualHours(t.id);
      const computedProgress = getComputedProgress(t.id);
      const proj = projectRepo.findById(t.projectId);
      const projName = proj ? proj.name : '不明なプロジェクト';

      const card = document.createElement('div');
      card.className = 'task-card';
      card.dataset.id = t.id;

      const difficultyLabel = getDifficultyLabel(t.difficulty);
      const diffClass = t.difficulty || 'medium';

      card.innerHTML = `
      <div class="task-card-header">
        <span class="task-card-title">${t.wbsCode ? `<span class="task-wbs-code">${escapeHTML(t.wbsCode)}</span>` : ''}${escapeHTML(t.name)}${!_isLeaf ? `<span class="leaf-badge">管理</span>` : ''}</span>
        <span class="priority-badge ${t.priority}">${getPriorityLabel(t.priority)}</span>
      </div>
      <p class="task-card-desc">${escapeHTML(t.description || '')}</p>
      <div class="task-card-meta">
        <span class="task-card-meta-item">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          ${escapeHTML(projName)}
        </span>
        <span class="task-card-meta-item">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          ${escapeHTML(computedAssigneeLabel)}
        </span>
        <span class="task-card-meta-item">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          ${formatDate(t.startDate)} 〜 ${formatDate(t.endDate)}
        </span>
        <span class="task-card-meta-item">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          <span class="difficulty-badge ${diffClass}">${difficultyLabel}</span>
        </span>
      </div>
      <div class="task-card-progress-row">
        <span class="task-progress-mini">
          <span class="progress-track-mini">
            <span class="progress-bar-mini" style="width:${computedProgress}%"></span>
          </span>
          <span class="progress-text-mini">${computedProgress}%</span>
        </span>
        <span class="status-badge ${computedStatus}">${getStatusLabel(computedStatus)}</span>
      </div>
      <div class="task-card-footer">
        <div class="task-card-actions">
          <button class="btn btn-sm btn-task-detail">詳細</button>
          ${_canEdit && _isLeaf ? `<button class="btn btn-sm btn-secondary btn-task-edit">編集</button>` : ''}
          ${_canDelete ? `<button class="btn btn-sm btn-danger btn-task-delete">削除</button>` : ''}
        </div>
      </div>`;

      const detailBtn = card.querySelector('.btn-task-detail');
      if (detailBtn) {
        detailBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openTaskDetail(t.id);
        });
      }

      const editBtn = card.querySelector('.btn-task-edit');
      if (editBtn) {
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openEditTaskDialog(t.id);
        });
      }

      const deleteBtn = card.querySelector('.btn-task-delete');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteTask(t.id);
        });
      }

      card.addEventListener('click', () => {
        openTaskDetail(t.id);
      });

      taskGrid.appendChild(card);
    });
  });
}

// --- タスク削除 ---
function deleteTask(taskId) {
  const hasChildTasks = taskRepo.hasChildren(taskId);
  const msg = hasChildTasks
    ? 'このタスクには子タスクが存在します。\n子タスクも含めてすべて削除してもよろしいですか？'
    : 'このタスクを削除してもよろしいですか？';

  showConfirmDialog(msg, () => {
    if (hasChildTasks) {
      taskRepo.deleteWithChildren(taskId);
    } else {
      taskRepo.delete(taskId);
    }
    renderTasks();
    if (currentView === 'wbs') renderWBS();
    showCompleteDialog('削除が完了しました。');
  });
}
