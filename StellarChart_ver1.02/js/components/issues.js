// ==========================================================================
// StellarChart - Issues and transfer components
// 役割: 依頼（needs_action）の一覧表示・バッジ更新・
//       タスク転送（たらいまわし）ダイアログの制御を行う
// ==========================================================================
// データアクセスは repository.js に集約（taskRepo / projectRepo / transferRepo）
//
// 関数一覧:
//   getActiveIssues()                   - 自分宛ての未処理依頼一覧を取得
//   updateIssueBadge()                  - サイドバーの依頼バッジ数を更新
//   openIssuePanel()                    - 依頼パネル（スライドアウト）を開く
//   closeIssuePanel()                   - 依頼パネルを閉じる
//   openTransferDialog(taskId)          - 転送ダイアログを開く（転送先セレクト構築）
//   confirmTransfer()                   - 転送を確定（バリデーション後 completeNeedsAction を呼ぶ）
//   completeNeedsAction(taskId, targetUser, comment) - 要対応化に伴う全更新処理を実施
//   cancelTransfer()                    - 転送キャンセル（状態リセット + タスク詳細再描画）
//
// グローバル変数:
//   transferTaskId - 現在転送処理中のタスクID
//
// ==========================================================================

let transferTaskId = null;

// --- 依頼機能 ---
function getActiveIssues() {
  const allTransfers = transferRepo.findByTargetUser(currentUser.name);
  // 同じタスクの転送レコードは最新（id最大）のものだけに絞る
  const latestPerTask = {};
  allTransfers.forEach(tr => {
    const existing = latestPerTask[tr.taskId];
    if (!existing || tr.id > existing.id) {
      latestPerTask[tr.taskId] = tr;
    }
  });
  return Object.values(latestPerTask).filter(t => {
    const task = taskRepo.findById(t.taskId);
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
    issueList.innerHTML = '<div class="issue-empty">依頼はありません</div>';
  } else {
    myIssues.forEach(tr => {
      const task = taskRepo.findById(tr.taskId);
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
  const task = taskRepo.findById(taskId);
  if (!task) return;

  transferTaskId = taskId;
  transferDialog.dataset.mode = 'needs_action';
  transferDialog.dataset.taskId = taskId;
  delete transferDialog.dataset.completed;
  transferReason.value = '';
  transferReason.classList.remove('input-error');
  errorTransferTarget.textContent = '';
  transferTarget.classList.remove('input-error');
  const reasonErrorEl = document.getElementById('error-transfer-reason');
  if (reasonErrorEl) reasonErrorEl.textContent = '';

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

  const reason = transferReason.value.trim();
  if (!reason) {
    const errorEl = document.getElementById('error-transfer-reason');
    if (errorEl) errorEl.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:2px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>転送理由を入力してください。';
    transferReason.classList.add('input-error');
    return;
  }

  completeNeedsAction(transferTaskId, target, reason);
}

// --- 要対応化に伴う全更新処理 ---
// 責務: ステータス変更・担当者変更・履歴追加・スレッド追加・DB保存
function completeNeedsAction(taskId, targetUser, comment) {
  try {
    const task = taskRepo.findById(taskId);
    if (!task) return;
    const prevAssignee = task.assignee;
    const prevStatus = task.status;

    task.status = 'needs_action';
    task.assignee = targetUser;

    if (!task.issueOwnerId) {
      task.issueOwnerId = prevAssignee;
    }

    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

    taskRepo.saveProperty(task);

    taskRepo.addStatusHistory(taskId, {
      from: prevStatus,
      to: 'needs_action',
      changedBy: currentUser.name,
      comment: comment,
      timestamp: timestamp
    });

    taskRepo.addComment(taskId, {
      author: currentUser.name,
      content: `【転送】${escapeHTML(prevAssignee)} → ${escapeHTML(targetUser)}。理由：${escapeHTML(comment)}`,
      timestamp: timestamp
    });

    const transferRecord = {
      taskId: taskId,
      from: currentUser.name,
      to: targetUser,
      reason: comment,
      timestamp: timestamp,
      read: false
    };
    transferRepo.save(transferRecord);
    updateIssueBadge();

    transferDialog.dataset.completed = '1';
    transferDialog.close();
    renderTasks();
    if (currentView === 'wbs') renderWBS();

    showCompleteDialog('転送しました。', () => {
      if (taskDetailDialog.open) {
        taskDetailDialog.close();
      }
    });
  } catch (err) {
    console.error('[StellarChart] completeNeedsAction error:', err);
    showCompleteDialog('転送処理中にエラーが発生しました。コンソールログを確認してください。', null, 'エラー');
  }
}

// --- 転送キャンセル ---
// キャンセルボタン・閉じるボタン・Escキーで呼ばれる
function cancelTransfer() {
  transferDialog.close();
}

// --- 要対応の解決（差し戻し） ---
// 転送されてきたタスクを「対応済み」として元の担当者に差し戻す
function resolveNeedsAction(taskId) {
  const task = taskRepo.findById(taskId);
  if (!task) return;

  if (!task.issueOwnerId) {
    showCompleteDialog('問題提起者の情報が見つかりません。', null, 'エラー');
    return;
  }

  const messageEl = document.getElementById('resolve-message');
  const userMessage = messageEl ? messageEl.value.trim() : '';

  showConfirmDialog('対応済みとして差し戻しますか？', () => {
    const prevAssignee = task.assignee;
    const issueOwner = task.issueOwnerId;
    const prevStatus = task.status;

    const now = new Date();
    const timestamp = formatTimestamp(now);

    let threadContent = `【対応済み】${escapeHTML(prevAssignee)} が対応しました。${escapeHTML(issueOwner)} に差し戻します。`;
    if (userMessage) {
      threadContent += `\nメッセージ: ${escapeHTML(userMessage)}`;
    }

    task.status = 'in_progress';
    task.assignee = issueOwner;
    task.issueOwnerId = null;

    taskRepo.saveProperty(task);

    taskRepo.addStatusHistory(taskId, {
      from: prevStatus,
      to: 'in_progress',
      changedBy: currentUser.name,
      comment: '対応済み（差し戻し）',
      timestamp: timestamp
    });

    taskRepo.addComment(taskId, {
      author: currentUser.name,
      content: threadContent,
      timestamp: timestamp
    });

    // 差し戻しも転送レコードとして記録（転送チェーン保存用）
    const returnTransfer = {
      taskId: taskId,
      from: currentUser.name,
      to: issueOwner,
      reason: '対応済み（差し戻し）',
      timestamp: timestamp,
      read: false
    };
    transferRepo.save(returnTransfer);

    updateIssueBadge();

    renderTasks();
    if (currentView === 'wbs') renderWBS();
    if (currentDetailTaskId === taskId) {
      renderTaskDetail(taskId);
    }
  });
}
