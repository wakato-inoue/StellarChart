// ==========================================================================
// StellarChart - WBS and effort summary components
// 役割: WBSツリー表示・工数集計画面の描画、および
//       各画面で使用するプロジェクトセレクトボックスの構築を行う
// ==========================================================================
// データアクセスは repository.js に集約（taskRepo / projectRepo / transferRepo）
//
// 関数一覧:
//   populateEffortProjectSelect      - 工数集計画面のプロジェクトセレクト構築
//   populateWBSProjectSelect         - WBS画面のプロジェクトセレクト構築
//   renderWBS                        - WBSツリーを描画（「自分の担当のみ」フィルター対応）
//   filterTreeByVisible(nodes, myTaskIds) - 担当タスクのみにツリーを絞り込む（再帰）
//   renderTreeNodes(nodes, depth, myTaskIds) - WBSツリーノードをHTML生成（再帰）
//   renderEffortSummary              - 工数集計サマリー（計画/実績/差異/担当者別/WBS別）を描画
//   renderEffortWBSTree(projectId, parentTaskId, visibleTasks) - WBS別工数ツリーをHTML生成（再帰）
//
// ==========================================================================

// --- 工数集計プロジェクトセレクトの構築 ---
function populateEffortProjectSelect() {
  const currentValue = effortProjectSelect.value;
  effortProjectSelect.innerHTML = '<option value="">プロジェクトを選択してください</option>';

  const visibleProjects = getVisibleProjects();
  visibleProjects.forEach(proj => {
    const opt = document.createElement('option');
    opt.value = proj.id;
    opt.textContent = proj.name;
    effortProjectSelect.appendChild(opt);
  });
  effortProjectSelect.value = currentValue;
}

// --- WBSプロジェクトセレクトの構築 ---
function populateWBSProjectSelect() {
  const currentValue = wbsProjectSelect.value;
  wbsProjectSelect.innerHTML = '<option value="">選択してください</option>';

  getVisibleProjects().forEach(proj => {
    const opt = document.createElement('option');
    opt.value = proj.id;
    opt.textContent = proj.name;
    wbsProjectSelect.appendChild(opt);
  });
  if (currentValue && projectRepo.findById(currentValue)) {
    wbsProjectSelect.value = currentValue;
  }
}

// --- WBS描画 ---
function renderWBS() {
  const projectId = wbsProjectSelect.value;
  wbsCurrentProjectId = projectId;

  if (!projectId) {
    wbsTreeContainer.innerHTML = '';
    wbsEmptyState.classList.remove('hidden');
    wbsTreeContainer.classList.add('hidden');
    return;
  }

  wbsEmptyState.classList.add('hidden');
  wbsTreeContainer.classList.remove('hidden');

  const tree = buildTaskTree(projectId, null);
  let html;

  if (wbsMyTasksOnly.checked && currentUser) {
    const myTaskIds = new Set(
      taskRepo.findByProject(projectId)
        .filter(t => t.assignee === currentUser.name)
        .map(t => t.id)
    );
    const filteredTree = filterTreeByVisible(tree, myTaskIds);
    html = renderTreeNodes(filteredTree, 1, myTaskIds);
    wbsTreeContainer.innerHTML = html ? `<div class="wbs-tree">${html}</div>` : '<div class="wbs-empty-projects">表示するタスクがありません。</div>';
  } else {
    html = renderTreeNodes(tree, 1);
    wbsTreeContainer.innerHTML = html ? `<div class="wbs-tree">${html}</div>` : '<div class="wbs-empty-projects">このプロジェクトにはタスクがありません。</div>';
  }

  wbsTreeContainer.querySelectorAll('.wbs-children').forEach(el => el.classList.remove('collapsed'));
  wbsTreeContainer.querySelectorAll('.wbs-toggle').forEach(el => el.classList.remove('collapsed'));
}

function filterTreeByVisible(nodes, myTaskIds) {
  const result = [];
  nodes.forEach(n => {
    const filteredChildren = filterTreeByVisible(n.children, myTaskIds);
    if (myTaskIds.has(n.task.id) || filteredChildren.length > 0) {
      result.push({ task: n.task, children: filteredChildren });
    }
  });
  return result;
}

function renderTreeNodes(nodes, depth, myTaskIds) {
  if (!nodes || nodes.length === 0) return '';
  let html = '';
  const levelLabels = { 1: '親', 2: '子', 3: '孫' };
  nodes.forEach(({ task, children }) => {
    const hasChild = children && children.length > 0;
    const depthLevel = getTaskDepth(task.id);
    const isDimmed = myTaskIds && !myTaskIds.has(task.id);
    const _isLeaf = !hasChild;
    const computedStatus = _isLeaf ? task.status : getComputedStatus(task.id);
    const computedAssignee = _isLeaf ? (task.assignee || '担当者なし') : getComputedAssigneeLabel(task.id);
    const computedProgress = _isLeaf ? task.progress : getComputedProgress(task.id);
    html += `<div class="wbs-tree-node${isDimmed ? ' wbs-node-dimmed' : ''}" data-task-id="${task.id}" data-depth="${depthLevel}">
      <div class="wbs-node-row" style="padding-left: ${(depthLevel - 1) * 1.5 + 0.5}rem">
        ${hasChild
          ? `<span class="wbs-toggle expanded" data-toggle>▼</span>`
          : `<span class="wbs-toggle-placeholder"></span>`}
        <span class="wbs-code">${escapeHTML(task.wbsCode || '')}</span>
        <span class="wbs-level-badge level-${depthLevel}">${levelLabels[depthLevel] || ''}</span>
        <span class="wbs-name">${escapeHTML(task.name)}</span>
        <span class="wbs-assignee">${escapeHTML(computedAssignee)}</span>
        <span class="status-badge ${computedStatus}">${getStatusLabel(computedStatus)}</span>
        <span class="wbs-node-progress">${computedProgress}%</span>
        ${depthLevel < 3 && canEditTask() && !isDimmed ? `<span class="wbs-node-actions"><button class="wbs-btn-child" data-parent-id="${task.id}">＋子</button></span>` : ''}
      </div>
      ${hasChild ? `<div class="wbs-children">${renderTreeNodes(children, depth + 1, myTaskIds)}</div>` : ''}
    </div>`;
  });
  return html;
}

// --- 工数集計 ---
function renderEffortSummary() {
  effortSummaryGrid.innerHTML = '';
  const projectId = effortProjectSelect.value;

  if (!projectId) {
    effortSummaryGrid.innerHTML = '<div class="effort-empty">プロジェクトを選択してください</div>';
    return;
  }

  const proj = projectRepo.findById(projectId);
  if (!proj) {
    effortSummaryGrid.innerHTML = '<div class="effort-empty">プロジェクトが見つかりません</div>';
    return;
  }

  const visibleTasks = getVisibleTasksForEffort(projectId);

  const planned = proj.plannedHours || 0;
  const totalActual = visibleTasks.reduce((sum, t) => sum + (t.actualHours || 0), 0);
  const taskEstimated = visibleTasks.reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
  const variance = totalActual - planned;
  const varianceClass = variance <= 0 ? 'negative' : 'positive';
  const varianceSign = variance <= 0 ? '' : '+';

  let html = `<div class="effort-card effort-card-summary">
    <div class="effort-card-title">${escapeHTML(proj.name)}</div>
    <div class="effort-row">
      <span class="effort-label">プロジェクト予定工数</span>
      <span class="effort-value">${planned}h</span>
    </div>
    <div class="effort-row">
      <span class="effort-label">タスク予定工数合計</span>
      <span class="effort-value">${taskEstimated}h</span>
    </div>
    <div class="effort-row">
      <span class="effort-label">タスク実績工数合計</span>
      <span class="effort-value">${totalActual}h</span>
    </div>
    <div class="effort-row">
      <span class="effort-label">差異（実績ー計画）</span>
      <span class="effort-value effort-variance ${varianceClass}">${varianceSign}${variance}h</span>
    </div>
  </div>`;

  const personMap = {};
  visibleTasks.forEach(t => {
    const person = t.assignee || '未割り当て';
    personMap[person] = (personMap[person] || 0) + (t.actualHours || 0);
  });
  const personEntries = Object.entries(personMap).filter(([_, h]) => h > 0);
  if (personEntries.length > 0) {
    html += `<div class="effort-card effort-card-breakdown">
      <div class="effort-card-title">担当者別実績工数</div>`;
    personEntries.forEach(([person, hours]) => {
      html += `<div class="effort-row">
        <span class="effort-label">${escapeHTML(person)}</span>
        <span class="effort-value">${hours}h</span>
      </div>`;
    });
    html += `</div>`;
  }

  html += `<div class="effort-card effort-card-breakdown">
    <div class="effort-card-title">WBS別工数（実績）</div>
    <div class="effort-wbs-tree">${renderEffortWBSTree(projectId, null, visibleTasks)}</div>
  </div>`;

  effortSummaryGrid.innerHTML = html;
}

// --- WBS別工数集計 ---
function renderEffortWBSTree(projectId, parentTaskId, visibleTasks) {
  const children = taskRepo.findByProject(projectId)
    .filter(t => t.parentTaskId === parentTaskId)
    .sort(sortByWBSCode);

  if (children.length === 0 && parentTaskId === null) {
    return '<div class="effort-wbs-empty">タスクがありません</div>';
  }

  function calcVisibleDescendantHours(taskId) {
    const directChildren = taskRepo.findByProject(projectId).filter(t => t.parentTaskId === taskId);
    let est = 0;
    let act = 0;
    directChildren.forEach(dc => {
      if (visibleTasks.some(vt => vt.id === dc.id)) {
        est += dc.estimatedHours || 0;
        act += dc.actualHours || 0;
      }
      const sub = calcVisibleDescendantHours(dc.id);
      est += sub.est;
      act += sub.act;
    });
    return { est, act };
  }

  let html = '<ul class="effort-wbs-list">';
  children.forEach(child => {
    const childHtml = renderEffortWBSTree(projectId, child.id, visibleTasks);
    const hasChildren = childHtml.includes('<li');
    const isVisible = visibleTasks.some(t => t.id === child.id);

    let actualSum = 0;
    let breakdownHtml = '';

    if (hasChildren) {
      const sub = calcVisibleDescendantHours(child.id);
      const own = child.actualHours || 0;
      actualSum = own + sub.act;
      if (sub.act > 0 || own > 0) {
        breakdownHtml = ` <span class="effort-hours-breakdown">（親${own}h / 子${sub.act}h）</span>`;
      }
    } else {
      actualSum = isVisible ? (child.actualHours || 0) : 0;
    }

    html += `<li class="effort-wbs-node${!isVisible && parentTaskId !== null ? ' effort-wbs-dimmed' : ''}">
      <div class="effort-wbs-row">
        <span class="effort-wbs-code">${escapeHTML(child.wbsCode || '')}</span>
        <span class="effort-wbs-name">${escapeHTML(child.name)}</span>
        <span class="effort-wbs-hours">${actualSum}h${breakdownHtml}</span>
      </div>
      ${hasChildren ? childHtml : ''}
    </li>`;
  });
  html += '</ul>';
  return html;
}
