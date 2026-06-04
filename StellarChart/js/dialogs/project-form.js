// ==========================================================================
// StellarChart - Project form dialog
// 役割: プロジェクト作成/編集ダイアログの表示・フォーム送信処理を行う
//       バリデーション（メンバー必須・RankB以上必須など）も担当する
// ==========================================================================
//
// 関数一覧:
//   openCreateDialog()       - 新規プロジェクト作成ダイアログを開く
//   openEditDialog(projectId) - 既存プロジェクトの編集ダイアログを開く
//   closeCreateDialog()      - プロジェクトダイアログを閉じる
//   handleFormSubmit(e)      - フォーム送信処理（新規作成/編集判定・バリデーション・保存）
//
// ==========================================================================

function openCreateDialog() {
  editingProjectId = null;
  projectForm.reset();
  projectDialogTitle.textContent = "新規プロジェクト作成";
  btnSubmitProject.textContent = "作成する";

  if (projStartFp) {
    projStartFp.clear();
    projStartFp.set('maxDate', null);
    projStartFp.set('minDate', 'today');
    projStartFp.setDate(new Date());
  }
  if (projEndFp) {
    projEndFp.clear();
    projEndFp.set('minDate', 'today');
  }

  if (projCreatorInput) projCreatorInput.textContent = currentUser.name;

  selectedEmployeeNames = new Set([currentUser.name]);
  projMembersInput.value = currentUser.name;

  projProgressInput.value = 0;
  progressValDisplay.textContent = "0%";
  projPlannedHoursInput.value = '';

  clearErrors();
  countName.textContent = "0 / 30";
  countDescription.textContent = "0 / 200";
  projectDialog.showModal();
}

function openEditDialog(projectId) {
  const proj = projects.find(p => p.id === projectId);
  if (!proj) return;

  editingProjectId = projectId;
  clearErrors();

  projectDialogTitle.textContent = "プロジェクト編集";
  btnSubmitProject.textContent = "保存する";

  projNameInput.value = proj.name;
  countName.textContent = `${proj.name.length} / 30`;

  projDescInput.value = proj.description;
  countDescription.textContent = `${proj.description.length} / 200`;

  if (projStartFp) {
    projStartFp.setDate(proj.startDate);
    projStartFp.set('minDate', null);
  }
  if (projEndFp) {
    projEndFp.setDate(proj.endDate);
    projEndFp.set('minDate', null);
  }

  if (projStartFp && proj.endDate) projStartFp.set('maxDate', proj.endDate);
  if (projEndFp && proj.startDate) projEndFp.set('minDate', proj.startDate);

  document.getElementById('proj-status').value = proj.status;

  projProgressInput.value = proj.progress;
  progressValDisplay.textContent = `${proj.progress}%`;
  projPlannedHoursInput.value = proj.plannedHours || '';

  projMembersInput.value = proj.members ? proj.members.join(', ') : '';

  if (projCreatorInput) projCreatorInput.textContent = proj.creator || '';

  projectDialog.showModal();
}

function closeCreateDialog() {
  projectDialog.close();
}

function handleFormSubmit(e) {
  e.preventDefault();
  clearErrors();

  const formData = new FormData(projectForm);
  const name = formData.get('name').trim();
  const description = formData.get('description').trim();
  const startDate = formData.get('startDate');
  const endDate = formData.get('endDate');
  const status = formData.get('status');
  const progress = parseInt(formData.get('progress') || '0', 10);
  const plannedHours = parseInt(formData.get('plannedHours') || '0', 10);
  const membersInput = formData.get('members').trim();

  let hasError = false;

  if (!name) {
    showFieldError('name', 'プロジェクト名は必須項目です。');
    hasError = true;
  } else if (name.length > 30) {
    showFieldError('name', 'プロジェクト名は30文字以内で入力してください。');
    hasError = true;
  }

  if (!description) {
    showFieldError('description', '概要は必須項目です。');
    hasError = true;
  } else if (description.length > 200) {
    showFieldError('description', '概要は200文字以内で入力してください。');
    hasError = true;
  }

  if (!startDate) {
    showFieldError('startDate', '開始日を入力してください。');
    hasError = true;
  }
  if (!endDate) {
    showFieldError('endDate', '終了日を入力してください。');
    hasError = true;
  }

  if (startDate && endDate && startDate > endDate) {
    showFieldError('endDate', '終了日は開始日以降の日付にしてください。');
    hasError = true;
  }

  if (hasError) return;

  let members = [];
  if (membersInput) {
    members = membersInput
      .split(/[,，]+/)
      .map(m => m.trim())
      .filter(m => m.length > 0);
  }

  const creator = editingProjectId
    ? (projects.find(p => p.id === editingProjectId)?.creator || currentUser.name)
    : currentUser.name;
  if (creator && !members.includes(creator)) {
    members.unshift(creator);
  }

  if (members.length < 1) {
    showFieldError('members', 'メンバーを1人以上選択してください。');
    hasError = true;
  }

  const hasRankBOrAbove = members.some(m => {
    const emp = employeeMaster.find(e => e.name === m);
    return emp && (RANK_LEVEL[emp.rank] ?? -1) >= RANK_LEVEL['RankB'];
  });
  if (!hasRankBOrAbove) {
    showFieldError('members', 'RankB以上のメンバーが最低1人必要です。');
    hasError = true;
  }

  if (hasError) return;

  if (editingProjectId !== null) {
    const projIndex = projects.findIndex(p => p.id === editingProjectId);
    if (projIndex !== -1) {
      projects[projIndex] = {
        ...projects[projIndex],
        name,
        description,
        startDate,
        endDate,
        status,
        progress,
        plannedHours: isNaN(plannedHours) ? 0 : plannedHours,
        members
      };
    }
  } else {
    const newProject = {
      id: `proj-${Date.now()}`,
      name,
      description,
      startDate,
      endDate,
      progress,
      status,
      plannedHours: isNaN(plannedHours) ? 0 : plannedHours,
      creator: currentUser.name,
      members
    };
    projects.push(newProject);
  }

  renderProjects();
  populateProjectSelects();
  populateWBSProjectSelect();
  projectDialog.close();
}
