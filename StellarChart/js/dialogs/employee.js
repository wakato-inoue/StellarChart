// ==========================================================================
// StellarChart - Employee selection dialog
// 役割: プロジェクトメンバー選択ダイアログの表示・社員検索・選択管理を行う
//       作成者は強制的に選択され、削除不可
// ==========================================================================
//
// 関数一覧:
//   openEmployeeDialog()              - 社員選択ダイアログを開く（現在のメンバーを初期表示）
//   renderEmployees(filterText)       - 社員リストを描画（キーワードフィルター対応）
//   handleCheckboxToggle(checkbox)    - チェックボックス変更時の選択状態を更新
//   confirmSelectedEmployees()        - 選択を確定し、プロジェクトフォームのメンバー入力欄に反映
//
// ==========================================================================

function openEmployeeDialog() {
  const currentMembers = projMembersInput.value
    .split(/[,，]+/)
    .map(m => m.trim())
    .filter(m => m.length > 0);

  const creator = editingProjectId
    ? projects.find(p => p.id === editingProjectId)?.creator
    : currentUser.name;
  if (creator && !currentMembers.includes(creator)) {
    currentMembers.push(creator);
  }

  selectedEmployeeNames = new Set(currentMembers);

  empSearchKeywordInput.value = '';

  renderEmployees();

  employeeDialog.showModal();
}

function renderEmployees(filterText = '') {
  empListContainer.innerHTML = '';

  const filteredEmployees = employeeMaster.filter(emp => {
    return emp.name.toLowerCase().includes(filterText) ||
           emp.department.toLowerCase().includes(filterText);
  });

  if (filteredEmployees.length === 0) {
    empListContainer.innerHTML = '<div style="text-align:center; padding:1rem; color:var(--text-muted); font-size:0.85rem;">該当する社員が見つかりません</div>';
    return;
  }

  filteredEmployees.forEach(emp => {
    const li = document.createElement('li');
    li.className = 'emp-item';

    const isChecked = selectedEmployeeNames.has(emp.name);
    const creator = editingProjectId
      ? projects.find(p => p.id === editingProjectId)?.creator
      : currentUser.name;
    const isCreator = emp.name === creator;

    li.innerHTML = `
      <input type="checkbox" class="emp-checkbox" data-name="${escapeHTML(emp.name)}" ${isChecked ? 'checked' : ''} ${isCreator ? 'disabled' : ''}>
      <div class="emp-info-text">
        <span class="emp-name">${escapeHTML(emp.name)}${isCreator ? ' (作成者)' : ''}</span>
        <span class="emp-dept">${escapeHTML(emp.department)}</span>
      </div>
    `;

    li.addEventListener('click', (e) => {
      if (e.target.tagName === 'INPUT') return;
      const checkbox = li.querySelector('.emp-checkbox');
      if (checkbox.disabled) return;
      checkbox.checked = !checkbox.checked;
      handleCheckboxToggle(checkbox);
    });

    const checkbox = li.querySelector('.emp-checkbox');
    checkbox.addEventListener('change', () => {
      handleCheckboxToggle(checkbox);
    });

    empListContainer.appendChild(li);
  });
}

function handleCheckboxToggle(checkbox) {
  const name = checkbox.dataset.name;
  if (checkbox.checked) {
    selectedEmployeeNames.add(name);
  } else {
    selectedEmployeeNames.delete(name);
  }
}

function confirmSelectedEmployees() {
  const creator = editingProjectId
    ? projects.find(p => p.id === editingProjectId)?.creator
    : currentUser.name;
  if (creator) selectedEmployeeNames.add(creator);

  projMembersInput.value = Array.from(selectedEmployeeNames).join(', ');
  employeeDialog.close();
}
