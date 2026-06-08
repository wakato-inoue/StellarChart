// ==========================================================================
// StellarChart - Login dialog
// 役割: ログインダイアログの表示・社員カード生成・ユーザー選択処理
//       ログイン成功後に initApp() を呼び出す
// ==========================================================================
// データアクセスは repository.js に集約（taskRepo / projectRepo / transferRepo）
//
// 関数一覧:
//   showLoginDialog() - 社員マスタからカード一覧を生成してログインダイアログを表示
//
// ==========================================================================

// --- ログインダイアログ ---
// 社員マスタから社員カード一覧を生成し、選択してログインする
// ログイン成功後は currentUser を設定して initApp() を呼ぶ
function showLoginDialog() {
  const loginDialog = document.getElementById('login-dialog');
  const loginList = document.getElementById('login-emp-list');
  const btnLogin = document.getElementById('btn-login');

  loginList.innerHTML = '';
  employeeMaster.forEach(emp => {
    const card = document.createElement('div');
    card.className = 'login-emp-card';
    card.dataset.empId = emp.id;
    card.innerHTML = `
      <div class="login-emp-initials">${emp.name.charAt(0)}</div>
      <div class="login-emp-info">
        <span class="login-emp-name">${escapeHTML(emp.name)}</span>
        <span class="login-emp-dept">${escapeHTML(emp.department)}</span>
      </div>
      <span class="login-emp-rank rank-${emp.rank}">${RANK_LABELS[emp.rank]}</span>
    `;
    card.addEventListener('click', () => {
      loginList.querySelectorAll('.login-emp-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      btnLogin.disabled = false;
      btnLogin.dataset.empId = emp.id;
    });
    loginList.appendChild(card);
  });

  btnLogin.disabled = true;
  btnLogin.addEventListener('click', () => {
    const empId = btnLogin.dataset.empId;
    if (!empId) return;
    const emp = employeeMaster.find(e => e.id === empId);
    if (!emp) return;
    currentUser = {
      name: emp.name,
      department: emp.department,
      rank: emp.rank
    };
    loginDialog.close();
    initApp();
  });

  const btnCloseLogin = document.getElementById('btn-close-login');
  if (btnCloseLogin) {
    btnCloseLogin.addEventListener('click', () => {
      loginDialog.close();
      setTimeout(() => loginDialog.showModal(), 100);
    });
  }

  loginDialog.showModal();
}
