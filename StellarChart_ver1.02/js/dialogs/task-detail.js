// ==========================================================================
// StellarChart - Task detail dialog
// 役割: タスク詳細モーダルの表示・更新・コメント・作業履歴削除を担当する
// ==========================================================================
// データアクセスは repository.js に集約（taskRepo / projectRepo / transferRepo）
//
// 関数一覧:
//   currentDetailTaskId (変数)      - 現在開いているタスク詳細のタスクID
//   renderTaskDetail(taskId)        - タスク詳細を描画（HTML生成・イベントバインドのみ）
//   openTaskDetail(taskId)          - タスク詳細モーダルを開く（renderTaskDetail + showModal）
//   deleteEffortLogEntry(taskId, logId) - 作業履歴エントリを削除し再計算・再描画
//   addComment(taskId, content)     - スレッドにコメントを追加し再描画
//   updateTaskFromDetail(taskId)    - 詳細画面からステータス・工数・進捗を更新
//
// ==========================================================================

// --- 現在開いているタスク詳細のID ---
let currentDetailTaskId = null;

// --- タスク詳細を描画 ---
// HTML生成・値設定・イベントバインドのみ行う（showModalは行わない）
// ダイアログが既に開いている状態での再描画（コメント追加・転送完了など）でも使用する
function renderTaskDetail(taskId) {
  const task = taskRepo.findById(taskId);
  if (!task) return;

  const _isLeaf = isLeafTask(taskId);
  const computedStatus = _isLeaf ? task.status : getComputedStatus(taskId);
  const computedAssignees = getComputedAssignees(taskId);
  const computedAssigneeLabel = getComputedAssigneeLabel(taskId);
  const computedActualHours = getComputedActualHours(taskId);
  const hoursBreakdown = getActualHoursBreakdown(taskId);
  const computedProgress = getComputedProgress(taskId);

  currentDetailTaskId = taskId;
  const proj = projectRepo.findById(task.projectId);
  const projName = proj ? proj.name : '不明';
  const _canTransfer = canTransfer();
  const _canChangeStatus = _isLeaf && canChangeStatus(task);
  const _isAssignee = currentUser && currentUser.name === task.assignee;

  taskDetailTitle.textContent = task.name;

  let html = `
    <div class="detail-section">
      <div class="detail-field-row" style="align-items: center;">
        ${task.wbsCode ? `<div class="detail-field"><span class="detail-wbs-code">${escapeHTML(task.wbsCode)}</span></div>` : ''}
        ${task.parentTaskId ? (() => { const pt = taskRepo.findById(task.parentTaskId); return pt ? `<div class="detail-field"><span class="detail-label">親タスク</span><span class="detail-value">${escapeHTML(pt.name)}</span></div>` : ''; })() : ''}
        <div class="detail-field">
          <span class="detail-label">種別</span>
          <span class="detail-value">${_isLeaf ? '作業ノード' : '管理ノード'}</span>
        </div>
      </div>
      <div class="detail-field-row">
        <div class="detail-field">
          <span class="detail-label">プロジェクト</span>
          <span class="detail-value">${escapeHTML(projName)}</span>
        </div>
        <div class="detail-field">
          <span class="detail-label">担当者</span>
          <span class="detail-value">${_isLeaf ? (task.assignee ? escapeHTML(task.assignee) : '未割り当て') : escapeHTML(computedAssigneeLabel)}</span>
        </div>
      </div>
      <div class="detail-field-row">
        <div class="detail-field">
          <span class="detail-label">優先度</span>
          <span class="priority-badge ${task.priority}">${getPriorityLabel(task.priority)}</span>
        </div>
        <div class="detail-field">
          <span class="detail-label">難易度</span>
          <span class="difficulty-badge ${task.difficulty || 'medium'}">${getDifficultyLabel(task.difficulty)}</span>
        </div>
        <div class="detail-field">
          <span class="detail-label">ステータス</span>
          <span class="status-badge ${computedStatus}">${getStatusLabel(computedStatus)}</span>
          ${!_isLeaf ? `<span class="detail-auto-badge">自動算出</span>` : ''}
        </div>
      </div>
      <div class="detail-field-row">
        <div class="detail-field">
          <span class="detail-label">期間</span>
          <span class="detail-value">${formatDate(task.startDate)} 〜 ${formatDate(task.endDate)}</span>
        </div>
        <div class="detail-field">
          <span class="detail-label">作成者</span>
          <span class="detail-value">${escapeHTML(task.createdBy || '')}</span>
        </div>
      </div>
      <div class="detail-description">
        <span class="detail-label">概要</span>
        <p>${escapeHTML(task.description || '（説明なし）')}</p>
      </div>
      <div class="detail-field-row">
        <div class="detail-field">
          <span class="detail-label">進捗率</span>
          <div class="detail-progress-area">
            <span class="progress-track-mini detail-progress-bar">
              <span class="progress-bar-mini" style="width:${computedProgress}%"></span>
            </span>
            <span class="progress-text-mini">${computedProgress}%</span>
          </div>
        </div>
        <div class="detail-field">
          <span class="detail-label">工数</span>
          <span class="detail-value">実績 ${computedActualHours}h${!_isLeaf ? ` <span class="detail-hours-breakdown">（親${hoursBreakdown.own}h / 子${hoursBreakdown.children}h）</span>` : ''} / 予定 ${task.estimatedHours}h</span>
        </div>
      </div>
    </div>
  `;

  // ステータス・工数更新セクション（末端タスクのみ表示）
  if (_canChangeStatus) {
    html += `
    <div class="detail-section detail-edit-section">
      <h4 class="detail-section-title">ステータス・工数更新</h4>
      <div class="detail-field-row">
        <div class="detail-field">
          <label class="detail-label" for="detail-status">ステータス</label>
          <select id="detail-status" class="detail-select">
            <option value="not_started" ${task.status === 'not_started' ? 'selected' : ''}>未着手</option>
            <option value="in_progress" ${task.status === 'in_progress' ? 'selected' : ''}>進行中</option>
            <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>完了</option>
            <option value="suspended" ${task.status === 'suspended' ? 'selected' : ''}>中断</option>
            <option value="needs_action" ${task.status === 'needs_action' ? 'selected' : ''}>要対応</option>
          </select>
        </div>
        <div class="detail-field">
          <label class="detail-label" for="detail-progress">進捗率</label>
          <div class="detail-progress-input-row">
            <input type="range" id="detail-progress" min="0" max="100" step="5" value="${task.progress}">
            <span id="detail-progress-val">${task.progress}%</span>
          </div>
        </div>
      </div>
      <div class="detail-field-row">
        <div class="detail-field" style="flex: 1;">
          <label class="detail-label">実績工数 合計</label>
          <div class="detail-effort-total">${task.actualHours}h</div>
        </div>
        <div class="detail-field" style="flex: 1;">
          <label class="detail-label" for="detail-est-hours">予定工数 (h)</label>
          <input type="number" id="detail-est-hours" class="detail-input" min="0" max="9999" value="${task.estimatedHours}">
        </div>
      </div>
      <div class="detail-field-row">
        <div class="detail-field" style="flex:1;">
          <label class="detail-label" for="detail-today-hours">今日の作業時間 (h)</label>
          <input type="number" id="detail-today-hours" class="detail-input detail-today-input" min="0" max="24" placeholder="0" value="" ${_isAssignee ? '' : 'disabled'}>
        </div>
      </div>
      <div class="detail-btn-row">
        <button id="btn-detail-update" class="btn btn-primary">更新</button>
      </div>
    </div>`;
  }

  // 要対応アクション（末端タスク・自分宛ての要対応のみ表示）
  if (_isLeaf && task.status === 'needs_action' && _isAssignee) {
    const myTransfers = transferRepo.findByTaskId(taskId);
    const latest = myTransfers.find(tr => tr.to === currentUser.name);
    html += `
    <div class="detail-section detail-edit-section">
      <h4 class="detail-section-title">要対応アクション</h4>
      ${latest ? `
      <div class="detail-field-row">
        <div class="detail-field">
          <span class="detail-label">転送元</span>
          <span class="detail-value">${escapeHTML(latest.from)}</span>
        </div>
      </div>
      <div class="detail-field-row">
        <div class="detail-field">
          <span class="detail-label">転送理由</span>
          <span class="detail-value">${escapeHTML(latest.reason)}</span>
        </div>
      </div>` : ''}
      <div class="detail-field" style="margin-top:8px;">
        <label class="detail-label" for="resolve-message">対応メッセージ（任意）</label>
        <textarea id="resolve-message" class="thread-input" rows="2" placeholder="対応内容を入力..."></textarea>
      </div>
      <div class="detail-btn-row" style="margin-top:8px;">
        <button id="btn-detail-resolve" class="btn btn-primary">対応済み（差し戻す）</button>
        <button id="btn-detail-transfer" class="btn btn-secondary">転送する</button>
      </div>
    </div>`;
  }

  // 管理アクション（末端・非末端共通: 子タスク作成）
  if (getTaskDepth(task.id) < 3 && canEditTask()) {
    html += `<div class="detail-section">
      <div class="detail-btn-row" style="margin-top:0;border-top:none;padding-top:0;">
        <button id="btn-detail-create-child" class="btn btn-secondary">＋子タスク作成</button>
      </div>
    </div>`;
  }

  // 作業履歴
  if (_isLeaf) {
    ensureEffortLog(task);
  }
  if (task.effortLog && task.effortLog.length > 0) {
    const logsReversed = [...task.effortLog].reverse();
    html += `<div class="detail-section">
      <h4 class="detail-section-title">作業履歴</h4>
      <div class="effort-log-table">
        <div class="effort-log-header">
          <span class="effort-log-col-date">日付</span>
          <span class="effort-log-col-hours">時間</span>
          <span class="effort-log-col-action"></span>
        </div>`;
    logsReversed.forEach(entry => {
      html += `<div class="effort-log-row">
        <span class="effort-log-col-date">${escapeHTML(entry.date)}</span>
        <span class="effort-log-col-hours">${entry.hours}h</span>
        <span class="effort-log-col-action">${_isLeaf && _isAssignee ? `<button class="btn-effort-log-delete" data-log-id="${entry.id}" data-task-id="${task.id}">削除</button>` : ''}</span>
      </div>`;
    });
    html += `</div></div>`;
  }

  // ステータス履歴
  if (task.statusHistory && task.statusHistory.length > 0) {
    html += `<div class="detail-section">
      <h4 class="detail-section-title">ステータス履歴</h4>
      <div class="status-history">`;
    task.statusHistory.forEach(h => {
      html += `<div class="history-entry">
        <span class="history-date">${escapeHTML(h.timestamp)}</span>
        <span class="history-arrow">
          <span class="status-badge ${h.from}">${getStatusLabel(h.from)}</span>
          <span class="history-arrow-icon">→</span>
          <span class="status-badge ${h.to}">${getStatusLabel(h.to)}</span>
        </span>
        <span class="history-author">${escapeHTML(h.changedBy)}</span>
        ${h.comment ? `<span class="history-comment">${escapeHTML(h.comment)}</span>` : ''}
      </div>`;
    });
    html += `</div></div>`;
  }

  // スレッドセクション
  html += `<div class="detail-section detail-thread-section">
    <h4 class="detail-section-title">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      スレッド (${task.thread ? task.thread.length : 0})
    </h4>
    <div id="detail-thread" class="thread-container">`;

  if (task.thread && task.thread.length > 0) {
    task.thread.forEach(c => {
      const isOwn = c.author === currentUser.name;
      html += `
        <div class="thread-message ${isOwn ? 'thread-mine' : ''}">
          <div class="thread-msg-header">
            <span class="thread-author">${escapeHTML(c.author)}</span>
            <span class="thread-time">${escapeHTML(c.timestamp)}</span>
          </div>
          <div class="thread-msg-body">${escapeHTML(c.content)}</div>
        </div>
      `;
    });
  } else {
    html += `<div class="thread-empty">まだコメントはありません。</div>`;
  }

  html += `</div>
    <div class="thread-input-row">
      <textarea id="thread-input" class="thread-input" rows="2" placeholder="コメントを入力..."></textarea>
        <button id="btn-thread-send" class="btn btn-primary">送信</button>
    </div>
  </div>`;

  taskDetailBody.innerHTML = html;
  taskDetailDialog.scrollTop = 0;

  // スレッド送信イベント
  const btnSend = document.getElementById('btn-thread-send');
  const threadInput = document.getElementById('thread-input');
  if (btnSend) {
    btnSend.addEventListener('click', () => {
      const content = threadInput.value.trim();
      if (!content) return;
      addComment(taskId, content);
    });
  }
  threadInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      btnSend.click();
    }
  });

  // 進捗スライダー連動
  const detailProgress = document.getElementById('detail-progress');
  const detailProgressVal = document.getElementById('detail-progress-val');
  if (detailProgress) {
    detailProgress.addEventListener('input', () => {
      detailProgressVal.textContent = `${detailProgress.value}%`;
    });
  }

  // 更新ボタン
  const btnUpdate = document.getElementById('btn-detail-update');
  if (btnUpdate) {
    btnUpdate.addEventListener('click', () => {
      updateTaskFromDetail(taskId);
    });
  }

  // 子タスク作成ボタン
  const btnCreateChild = document.getElementById('btn-detail-create-child');
  if (btnCreateChild) {
    btnCreateChild.addEventListener('click', () => {
      openCreateChildTaskDialog(taskId);
    });
  }

  // 要対応: 対応済み（差し戻し）ボタン
  const btnResolve = document.getElementById('btn-detail-resolve');
  if (btnResolve) {
    btnResolve.addEventListener('click', () => {
      resolveNeedsAction(taskId);
    });
  }

  // 要対応: 転送するボタン
  const btnTransferFromDetail = document.getElementById('btn-detail-transfer');
  if (btnTransferFromDetail) {
    btnTransferFromDetail.addEventListener('click', () => {
      openTransferDialog(taskId);
    });
  }

  // 作業履歴 削除ボタン
  document.querySelectorAll('.btn-effort-log-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const taskId = btn.dataset.taskId;
      const logId = btn.dataset.logId;
      showConfirmDialog('この作業履歴を削除してもよろしいですか？', () => {
        deleteEffortLogEntry(taskId, logId);
      });
    });
  });
}

// --- タスク詳細モーダルを開く ---
// renderTaskDetail()を呼び出し、未OPENの場合のみshowModal()する
function openTaskDetail(taskId) {
  renderTaskDetail(taskId);
  if (!taskDetailDialog.open) {
    taskDetailDialog.showModal();
  }
  taskDetailDialog.scrollTop = 0;
}

// --- effortLog 削除 ---
// 指定された作業履歴エントリを削除し、再描画する
function deleteEffortLogEntry(taskId, logId) {
  taskRepo.deleteEffortLog(taskId, logId);
  renderTasks();
  if (currentView === 'wbs') renderWBS();
  renderTaskDetail(taskId);
}

// --- スレッドコメント追加 ---
// タスクのスレッドにコメントを追加し、詳細ダイアログを再描画する
function addComment(taskId, content) {
  const task = taskRepo.findById(taskId);
  if (!task) return;

  const now = new Date();
  const timestamp = formatTimestamp(now);

  const comment = {
    id: `tc-${Date.now()}`,
    author: currentUser.name,
    content: content,
    timestamp: timestamp
  };

  if (!task.thread) task.thread = [];
  task.thread.push(comment);
  taskRepo.addComment(taskId, comment);

  renderTaskDetail(taskId);
  renderTasks();
  if (currentView === 'wbs') renderWBS();
}

// --- タスク詳細画面からの更新 ---
// 詳細モーダル内のフォーム値（ステータス・進捗・工数）を取得し、
// 権限チェック・自動進捗適用・ステータス履歴記録を行ってタスクを更新する
// 要対応への変更時はコメント入力を必須とする
function updateTaskFromDetail(taskId) {
  try {
    const task = taskRepo.findById(taskId);
    if (!task) return;

    if (!isLeafTask(taskId)) {
      showCompleteDialog('管理ノードは直接更新できません。', () => renderTaskDetail(taskId), 'エラー');
      return;
    }

    if (!canChangeStatus(task)) {
      showCompleteDialog('ステータスを変更する権限がありません。', () => renderTaskDetail(taskId), 'エラー');
      return;
    }

    const newStatus = document.getElementById('detail-status').value;
    const todayHoursEl = document.getElementById('detail-today-hours');
    const newTodayHours = parseInt(todayHoursEl.value, 10);
    const newEstHours = parseInt(document.getElementById('detail-est-hours').value, 10);

    if (newStatus === 'needs_action') {
      if (task.assignee !== currentUser.name) {
        showCompleteDialog('要対応は担当者のみ設定できます。', () => renderTaskDetail(taskId), 'エラー');
        return;
      }
      openTransferDialog(taskId);
      return;
    }

    const prevStatus = task.status;
    const now = new Date();
    const timestamp = formatTimestamp(now);

    applyStatusAutoProgress(task, newStatus);

    task.status = newStatus;
    task.estimatedHours = isNaN(newEstHours) ? task.estimatedHours : newEstHours;
    if (newStatus === 'in_progress') {
      task.progress = parseInt(document.getElementById('detail-progress').value, 10);
    }
    if (!task.progress) task.progress = 0;

    taskRepo.saveProperty(task);

    if (prevStatus !== newStatus) {
      taskRepo.addStatusHistory(taskId, {
        from: prevStatus,
        to: newStatus,
        changedBy: currentUser.name,
        comment: '',
        timestamp: timestamp
      });
    }

    if (!todayHoursEl.disabled && !isNaN(newTodayHours) && newTodayHours > 0) {
      taskRepo.addEffortLog(taskId, {
        date: `${now.getFullYear()}/${now.getMonth()+1}/${now.getDate()}`,
        hours: newTodayHours,
        timestamp: timestamp
      });
    }
    renderTasks();
    if (currentView === 'wbs') renderWBS();
    updateIssueBadge();
    renderTaskDetail(taskId);
  } catch (err) {
    console.error('タスク詳細更新エラー:', err);
    showCompleteDialog('更新中にエラーが発生しました: ' + err.message, null, 'エラー');
  }
}
