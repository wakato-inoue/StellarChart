// ==========================================================================
// StellarChart - View switcher
// 役割: サイドバーナビゲーションによるビュー切り替え処理
//       各ビューの表示/非表示とサイドバーのアクティブ状態を管理する
// ==========================================================================
//
// 関数一覧:
//   switchView(view) - 指定ビュー（projects/tasks/wbs/effort）に切り替え
//
// ==========================================================================

// --- ビュー切り替え ---
// 指定されたビュー（projects/tasks/wbs/effort）を表示し、
// サイドバーのアクティブ状態を更新する
function switchView(view) {
  currentView = view;
  
  // 全ビューを非表示
  document.querySelector('.main-content > .main-header').classList.add('hidden');
  document.querySelector('.main-content > .search-panel').classList.add('hidden');
  projectGrid.classList.add('hidden');
  emptyState.classList.add('hidden');
  taskListView.classList.add('hidden');
  wbsView.classList.add('hidden');
  effortSummaryView.classList.add('hidden');

  // サイドバーのアクティブ状態を更新
  document.querySelectorAll('.sidebar-nav li').forEach(li => li.classList.remove('active'));

  if (view === 'projects') {
    document.querySelector('#nav-projects').closest('li').classList.add('active');
    document.querySelector('.main-content > .main-header').classList.remove('hidden');
    document.querySelector('.main-content > .search-panel').classList.remove('hidden');
    projectGrid.classList.remove('hidden');
    emptyState.classList.remove('hidden');
    renderProjects();
  } else if (view === 'tasks') {
    document.querySelector('#nav-tasks').closest('li').classList.add('active');
    taskListView.classList.remove('hidden');
    renderTasks();
  } else if (view === 'wbs') {
    document.querySelector('#nav-wbs').closest('li').classList.add('active');
    wbsView.classList.remove('hidden');
    populateWBSProjectSelect();
    renderWBS();
  } else if (view === 'effort') {
    document.querySelector('#nav-effort').closest('li').classList.add('active');
    effortSummaryView.classList.remove('hidden');
    populateEffortProjectSelect();
    renderEffortSummary();
  }
}
