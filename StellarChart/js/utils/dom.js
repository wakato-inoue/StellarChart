// ==========================================================================
// StellarChart - DOM utility functions
// 役割: フォームバリデーションエラー表示/クリアのDOM操作関数
//       プロジェクトフォーム / タスクフォーム双方で使用する
// ==========================================================================
//
// 関数一覧:
//   clearErrors              - 全エラーメッセージ・エラースタイルをクリア（プロジェクト用）
//   showFieldError           - 特定フィールドにエラーを表示（プロジェクト用）
//   clearTaskErrors          - 全エラーメッセージ・エラースタイルをクリア（タスク用）
//   showTaskError            - 特定フィールドにエラーを表示（タスク用）
//   clearTaskWarnings        - 警告メッセージをクリア（タスク用）
//   updateTaskEndDateWarning - 終了日超過警告を表示/非表示（タスク用）
//
// ==========================================================================

function clearErrors() {
  document.querySelectorAll('.error-msg').forEach(el => el.textContent = '');
  document.querySelectorAll('input, textarea, select').forEach(el => el.classList.remove('input-error'));
}

function showFieldError(fieldName, message) {
  const errorEl = document.getElementById(`error-${fieldName}`);
  const inputMap = {
    'name': 'proj-name',
    'description': 'proj-description',
    'startDate': 'proj-start-date',
    'endDate': 'proj-end-date',
    'status': 'proj-status',
    'members': 'proj-members'
  };
  const inputId = inputMap[fieldName];
  const inputEl = inputId ? document.getElementById(inputId) : null;

  if (errorEl) {
    errorEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 2px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>${message}`;
  }
  if (inputEl) {
    inputEl.classList.add('input-error');
  }
}

function clearTaskErrors() {
  document.querySelectorAll('#task-form .error-msg').forEach(el => el.textContent = '');
  document.querySelectorAll('#task-form input, #task-form textarea, #task-form select').forEach(el => el.classList.remove('input-error'));
}

function showTaskError(fieldName, message) {
  const errorEl = document.getElementById(`error-task-${fieldName}`);
  const inputMap = {
    'name': 'task-name',
    'priority': 'task-priority',
    'status': 'task-status',
    'startDate': 'task-start-date',
    'endDate': 'task-end-date',
    'difficulty': 'task-difficulty',
    'estimatedHours': 'task-est-hours'
  };
  const inputId = inputMap[fieldName];
  const inputEl = inputId ? document.getElementById(inputId) : null;

  if (errorEl) {
    errorEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 2px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>${message}`;
  }
  if (inputEl) {
    inputEl.classList.add('input-error');
  }
}

function clearTaskWarnings() {
  document.querySelectorAll('#task-form .warning-msg').forEach(el => el.textContent = '');
}

function updateTaskEndDateWarning() {
  const warnEl = document.getElementById('warn-task-endDate');
  if (!warnEl) return;
  const endDate = document.getElementById('task-end-date')?.value;
  if (!endDate || !taskEndDateBoundary) {
    warnEl.textContent = '';
    return;
  }
  if (endDate > taskEndDateBoundary) {
    warnEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:2px"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>終了日が${taskEndDateBoundaryLabel}の期限（${taskEndDateBoundary}）を超過しています`;
  } else {
    warnEl.textContent = '';
  }
}
