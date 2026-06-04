// ==========================================================================
// StellarChart - Project list component
// 役割: プロジェクト一覧画面の描画・フィルタリング・削除・
//       プロジェクトセレクトボックス（タスクフィルター用）の構築を行う
// ==========================================================================
//
// 関数一覧:
//   applyRankBasedUI       - ランクに応じて「新規プロジェクト」ボタンの表示/非表示を制御
//   resetFilters           - プロジェクト検索フィルターをすべて初期値に戻す
//   renderProjects         - プロジェクトカード一覧をフィルター条件で絞り込み描画
//   deleteProject(projectId) - プロジェクトと配下タスクを削除（確認ダイアログ付き）
//   populateProjectSelects - タスクフィルター用のプロジェクトセレクトボックスを構築
//
// ==========================================================================

function applyRankBasedUI() {
  btnCreateProject.style.display = canCreateProject() ? '' : 'none';
}

// フィルターリセット
function resetFilters() {
  searchKeywordInput.value = '';
  filterStatusSelect.value = 'all';
  if (filterStartFp) filterStartFp.clear();
  if (filterEndFp) filterEndFp.clear();
  renderProjects();
}

// プロジェクト一覧の描画
function renderProjects() {
  const keyword = searchKeywordInput.value.toLowerCase().trim();
  const statusFilter = filterStatusSelect.value;
  const startDateFilter = filterStartDateInput.value;
  const endDateFilter = filterEndDateInput.value;

  const filteredProjects = projects.filter(proj => {
    if (keyword) {
      const nameMatch = proj.name.toLowerCase().includes(keyword);
      const descMatch = proj.description.toLowerCase().includes(keyword);
      if (!nameMatch && !descMatch) return false;
    }

    if (statusFilter !== 'all' && proj.status !== statusFilter) {
      return false;
    }

    if (startDateFilter && proj.startDate < startDateFilter) {
      return false;
    }

    if (endDateFilter && proj.endDate > endDateFilter) {
      return false;
    }

    if (!hasRank('RankS')) {
      if (!proj.members.includes(currentUser.name)) return false;
    }

    return true;
  });

  projectGrid.innerHTML = '';

  if (filteredProjects.length === 0) {
    emptyState.classList.remove('hidden');
    projectGrid.classList.add('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  projectGrid.classList.remove('hidden');

  filteredProjects.forEach(proj => {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.dataset.id = proj.id;

    const memberChips = proj.members && proj.members.length > 0
      ? proj.members.map(m => `<span class="member-chip" data-tooltip="${escapeHTML(m)}"><span class="member-name-text">${escapeHTML(m)}</span></span>`).join('')
      : '<span class="member-chip empty">メンバーなし</span>';

    card.innerHTML = `
      <div class="card-header">
        <h3 class="project-title">${escapeHTML(proj.name)}</h3>
        <span class="status-badge ${proj.status}">${getStatusLabel(proj.status)}</span>
      </div>
      <p class="project-desc">${escapeHTML(proj.description)}</p>
      <div class="project-dates">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <span>${formatDate(proj.startDate)}</span>
        <span class="date-separator">〜</span>
        <span>${formatDate(proj.endDate)}</span>
      </div>
      <div class="project-progress-area">
        <div class="progress-info">
          <span class="progress-label">進捗率</span>
          <span class="progress-val">${proj.progress}%</span>
        </div>
        <div class="progress-track">
          <div class="progress-bar" style="width: ${proj.progress}%"></div>
        </div>
      </div>
      <div class="card-footer">
        <div class="project-members-list">
          ${memberChips}
        </div>
        <div class="project-card-actions">
          ${canEditProject() ? `<button class="btn btn-secondary btn-edit-project" data-proj-id="${proj.id}">編集</button>` : ''}
          ${canDeleteProject() ? `<button class="btn btn-project-delete" data-proj-id="${proj.id}">削除</button>` : ''}
        </div>
      </div>
    `;

    const editBtn = card.querySelector('.btn-edit-project');
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        openEditDialog(proj.id);
      });
    }

    const deleteBtn = card.querySelector('.btn-project-delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        deleteProject(proj.id);
      });
    }

    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-edit-project') || e.target.closest('.btn-project-delete')) return;
      if (hasRank('RankA')) {
        openCreateTaskDialogForProject(proj.id);
      }
    });

    projectGrid.appendChild(card);
  });
}

// --- プロジェクト削除 ---
function deleteProject(projectId) {
  if (!confirm('このプロジェクトを削除してもよろしいですか？\n関連するタスクもすべて削除されます。')) return;
  projects = projects.filter(p => p.id !== projectId);
  tasks = tasks.filter(t => t.projectId !== projectId);
  renderProjects();
  populateProjectSelects();
  populateWBSProjectSelect();
  if (currentView === 'tasks') renderTasks();
  if (currentView === 'wbs') renderWBS();
}

// --- プロジェクトセレクトボックスの構築 ---
function populateProjectSelects() {
  const currentValue = taskFilterProject.value;
  taskFilterProject.innerHTML = '<option value="all">すべてのプロジェクト</option>';

  getVisibleProjects().forEach(proj => {
    const opt = document.createElement('option');
    opt.value = proj.id;
    opt.textContent = proj.name;
    taskFilterProject.appendChild(opt);
  });
  taskFilterProject.value = currentValue;
}
