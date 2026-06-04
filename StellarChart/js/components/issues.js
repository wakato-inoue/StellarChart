// ==========================================================================
// StellarChart - Issues and transfer components
// 役割: 要課題（needs_action）の一覧表示・バッジ更新・
//       タスク転送（たらいまわし）ダイアログの制御を行う
// ==========================================================================
//
// 関数一覧:
//   getActiveIssues()                 - 自分宛ての未処理要課題一覧を取得
//   updateIssueBadge()                - サイドバーの要課題バッジ数を更新
//   openIssuePanel()                  - 要課題パネル（スライドアウト）を開く
//   closeIssuePanel()                 - 要課題パネルを閉じる
//   openTransferDialog(taskId)        - 転送ダイアログを開く（転送先セレクト構築）
//   confirmTransfer()                 - 転送を確定（担当者変更・スレッド追記・要課題レコード作成）
//
// グローバル変数:
//   transferTaskId - 現在転送処理中のタスクID
//
// ==========================================================================

let transferTaskId = null;

// --- 要課題機能 ---
function getActiveIssues() {
  return transfers.filter(t => {
    if (t.to !== currentUser.name) return false;
    const task = tasks.find(task => task.id === t.taskId);
    if (!task) return false;
    if (task.assignee !== currentUser.name) return false;
    return task.status === 'needs_action';
  });
}

function updateIssueBadge() {
  const active = getActiveIssues().length;
  if (active > 0) {
    issueBadge.textContent = active;
    issueBadge.classList.remove('hidden');
  } else {
    issueBadge.classList.add('hidden');
  }
}

function openIssuePanel() {
  const myIssues = getActiveIssues();

  issueList.innerHTML = '';

  if (myIssues.length === 0) {
    issueList.innerHTML = '<div class="issue-empty">要課題はありません</div>';
  } else {
    myIssues.forEach(tr => {
      const task = tasks.find(t => t.id === tr.taskId);
      const taskName = task ? task.name : '不明なタスク';
      const div = document.createElement('div');
      div.className = 'notif-item notif-unread';
      div.innerHTML = `
        <div class="notif-item-header">
          <span class="notif-from">${escapeHTML(tr.from)}</span>
          <span class="notif-time">${escapeHTML(tr.timestamp)}</span>
        </div>
        <div class="notif-item-body">
          <span class="notif-task-name">「${escapeHTML(taskName)}」</span>：
          <span>${escapeHTML(tr.reason)}</span>
        </div>
        <div class="notif-item-actions">
          <button class="btn btn-secondary btn-issue-open" data-task-id="${tr.taskId}">タスクを開く</button>
        </div>
      `;

      const openBtn = div.querySelector('.btn-issue-open');
      openBtn.addEventListener('click', () => {
        closeIssuePanel();
        switchView('tasks');
        openTaskDetail(tr.taskId);
      });

      issueList.appendChild(div);
    });
  }

  issuePanel.classList.remove('hidden');
  issueOverlay.classList.remove('hidden');
}

function closeIssuePanel() {
  issuePanel.classList.add('hidden');
  issueOverlay.classList.add('hidden');
  updateIssueBadge();
}

// --- 転送機能 ---
function openTransferDialog(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  transferTaskId = taskId;
  transferReason.value = '';
  errorTransferTarget.textContent = '';
  transferTarget.classList.remove('input-error');

  const currentAssignee = task.assignee;
  transferTarget.innerHTML = '<option value="">選択してください</option>';

  employeeMaster.forEach(emp => {
    if (emp.name === currentUser.name) return;
    const opt = document.createElement('option');
    opt.value = emp.name;
    opt.textContent = `${emp.name} (${emp.department})`;
    transferTarget.appendChild(opt);
  });

  transferDialog.showModal();
}

function confirmTransfer() {
  const target = transferTarget.value;
  if (!target) {
    errorTransferTarget.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:2px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>転送先を選択してください。';
    transferTarget.classList.add('input-error');
    return;
  }

  const task = tasks.find(t => t.id === transferTaskId);
  if (!task) return;

  const reason = transferReason.value.trim() || '理由の指定なし';
  const prevAssignee = task.assignee;

  task.assignee = target;

  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  if (!task.thread) task.thread = [];
  task.thread.push({
    id: `tc-${Date.now()}`,
    author: currentUser.name,
    content: `【転送】${escapeHTML(prevAssignee)} → ${escapeHTML(target)}。理由：${escapeHTML(reason)}`,
    timestamp: timestamp
  });

  const transferRecord = {
    id: `tr-${Date.now()}`,
    taskId: transferTaskId,
    from: currentUser.name,
    to: target,
    reason: reason,
    timestamp: timestamp,
    read: false
  };
  transfers.unshift(transferRecord);
  updateIssueBadge();

  transferDialog.close();
  renderTasks();
  if (currentView === 'wbs') renderWBS();

  if (currentDetailTaskId === transferTaskId) {
    openTaskDetail(transferTaskId);
  }
}
