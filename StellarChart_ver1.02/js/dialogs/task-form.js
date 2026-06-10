// ==========================================================================
// StellarChart - Task form dialog
// 役割: タスク作成/編集ダイアログの表示・フォームバリデーション・
//       保存（新規作成／編集／子タスク作成）を行う
// ==========================================================================
// データアクセスは repository.js に集約（taskRepo / projectRepo / transferRepo）
//
// 関数一覧:
//   openCreateTaskDialogForProject(projectId) - プロジェクトからタスク作成ダイアログを開く
//   openCreateTaskDialog()                     - タスク一覧からタスク作成ダイアログを開く
//   openCreateChildTaskDialog(parentTaskId)    - 親タスク指定で子タスク作成ダイアログを開く
//   openEditTaskDialog(taskId)                 - 既存タスクの編集ダイアログを開く
//   handleTaskFormSubmit(e)                    - フォーム送信処理（新規作成/編集判定・バリデーション・保存）
//
// ==========================================================================

function openCreateTaskDialogForProject(projectId) {
  creatingChildParentTaskId = null;
  editingTaskId = null;
  currentTaskProjectId = projectId;
  taskForm.reset();
  taskDialogTitle.textContent = "新規タスク作成";
  btnSubmitTask.textContent = "作成する";

  const proj = projectRepo.findById(projectId);
  if (taskProjectDisplay) taskProjectDisplay.textContent = proj ? proj.name : '---';

  populateAssigneeSelect(projectId);

  taskEndDateBoundary = proj && proj.endDate ? proj.endDate : null;
  taskEndDateBoundaryLabel = 'プロジェクト';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let minStartDate = 'today';
  if (proj && proj.startDate) {
    const projStart = new Date(proj.startDate);
    projStart.setHours(0, 0, 0, 0);
    if (projStart > today) {
      minStartDate = proj.startDate;
    }
  }

  if (taskStartDateFp) {
    taskStartDateFp.clear();
    taskStartDateFp.set('maxDate', null);
    taskStartDateFp.set('minDate', minStartDate);
    taskStartDateFp.setDate(minStartDate === 'today' ? new Date() : new Date(minStartDate));
  }
  if (taskEndDateFp) {
    taskEndDateFp.clear();
    taskEndDateFp.set('minDate', minStartDate);
  }

  clearTaskErrors();
  clearTaskWarnings();
  countTaskName.textContent = "0 / 50";
  countTaskDesc.textContent = "0 / 300";
  taskPrioritySelect.value = 'medium';
  taskDifficultySelect.value = 'medium';
  taskStatusSelect.value = 'not_started';
  taskProgressInput.value = 0;
  taskProgressValDisplay.textContent = "0%";
  taskEstHoursInput.value = 8;
  taskActHoursInput.value = 0;
  if (formGroupStatus) formGroupStatus.style.display = 'none';
  if (formGroupActualHours) formGroupActualHours.style.display = 'none';
  if (formGroupProgress) formGroupProgress.style.display = 'none';
  taskDialog.showModal();
  taskDialog.scrollTop = 0;
}

function openCreateTaskDialog() {
  creatingChildParentTaskId = null;
  editingTaskId = null;
  taskEndDateBoundary = null;
  taskEndDateBoundaryLabel = '';
  taskForm.reset();
  taskDialogTitle.textContent = "新規タスク作成";
  btnSubmitTask.textContent = "作成する";
  if (taskStartDateFp) { taskStartDateFp.clear(); taskStartDateFp.set('maxDate', null); taskStartDateFp.set('minDate', 'today'); }
  if (taskEndDateFp) { taskEndDateFp.clear(); taskEndDateFp.set('minDate', 'today'); }
  clearTaskErrors();
  clearTaskWarnings();
  countTaskName.textContent = "0 / 50";
  countTaskDesc.textContent = "0 / 300";
  taskPrioritySelect.value = 'medium';
  taskDifficultySelect.value = 'medium';
  taskStatusSelect.value = 'not_started';
  taskProgressInput.value = 0;
  taskProgressValDisplay.textContent = "0%";
  if (formGroupStatus) formGroupStatus.style.display = 'none';
  if (formGroupActualHours) formGroupActualHours.style.display = 'none';
  if (formGroupProgress) formGroupProgress.style.display = 'none';
  taskDialog.showModal();
  taskDialog.scrollTop = 0;
}

function openCreateChildTaskDialog(parentTaskId) {
  if (!canEditTask()) return;
  const parent = taskRepo.findById(parentTaskId);
  if (!parent) return;

  creatingChildParentTaskId = parentTaskId;
  editingTaskId = null;
  taskEndDateBoundary = parent.endDate || null;
  taskEndDateBoundaryLabel = '親タスク';
  taskForm.reset();
  taskDialogTitle.textContent = "子タスク作成";
  btnSubmitTask.textContent = "作成する";

  currentTaskProjectId = parent.projectId;
  const proj = projectRepo.findById(parent.projectId);
  if (taskProjectDisplay) taskProjectDisplay.textContent = proj ? proj.name : '---';

  populateAssigneeSelect(parent.projectId);
  if (parent.assignee) {
    taskAssigneeSelect.value = parent.assignee;
  }

  if (taskStartDateFp) {
    taskStartDateFp.clear();
    taskStartDateFp.set('maxDate', null);
    taskStartDateFp.set('minDate', parent.startDate ? parent.startDate : null);
    if (parent.startDate) taskStartDateFp.setDate(parent.startDate);
  }
  if (taskEndDateFp) {
    taskEndDateFp.clear();
    taskEndDateFp.set('minDate', parent.startDate || 'today');
    if (parent.endDate) taskEndDateFp.setDate(parent.endDate);
  }

  taskPrioritySelect.value = parent.priority;
  taskDifficultySelect.value = parent.difficulty || 'medium';
  taskStatusSelect.value = 'not_started';
  taskProgressInput.value = 0;
  taskProgressValDisplay.textContent = "0%";
  taskEstHoursInput.value = 8;
  taskActHoursInput.value = 0;
  if (formGroupStatus) formGroupStatus.style.display = 'none';
  if (formGroupActualHours) formGroupActualHours.style.display = 'none';
  if (formGroupProgress) formGroupProgress.style.display = 'none';

  clearTaskErrors();
  clearTaskWarnings();
  countTaskName.textContent = "0 / 50";
  countTaskDesc.textContent = "0 / 300";
  taskDialog.showModal();
  taskDialog.scrollTop = 0;
}

function openEditTaskDialog(taskId) {
  const task = taskRepo.findById(taskId);
  if (!task) return;
  if (!isLeafTask(taskId)) {
    showCompleteDialog('管理ノードは編集できません。', null, 'エラー');
    return;
  }

  creatingChildParentTaskId = null;
  editingTaskId = taskId;
  currentTaskProjectId = task.projectId;
  taskEndDateBoundary = null;
  taskEndDateBoundaryLabel = '';
  clearTaskErrors();
  clearTaskWarnings();
  taskDialogTitle.textContent = "タスク編集";
  btnSubmitTask.textContent = "保存する";

  populateAssigneeSelect(task.projectId);

  const proj = projectRepo.findById(task.projectId);
  if (taskProjectDisplay) taskProjectDisplay.textContent = proj ? proj.name : '---';

  taskNameInput.value = task.name;
  countTaskName.textContent = `${task.name.length} / 50`;
  taskDescInput.value = task.description || '';
  countTaskDesc.textContent = `${(task.description || '').length} / 300`;
  taskAssigneeSelect.value = task.assignee || '';

  if (taskStartDateFp) {
    if (task.startDate) taskStartDateFp.setDate(task.startDate);
    else taskStartDateFp.clear();
    taskStartDateFp.set('minDate', null);
  }
  if (taskEndDateFp) {
    if (task.endDate) taskEndDateFp.setDate(task.endDate);
    else taskEndDateFp.clear();
    taskEndDateFp.set('minDate', null);
  }

  if (taskStartDateFp && task.endDate) taskStartDateFp.set('maxDate', task.endDate);
  if (taskEndDateFp && task.startDate) taskEndDateFp.set('minDate', task.startDate);

  taskPrioritySelect.value = task.priority;
  taskDifficultySelect.value = task.difficulty || 'medium';
  taskEstHoursInput.value = task.estimatedHours || 0;

  if (formGroupStatus) formGroupStatus.style.display = 'none';
  if (formGroupActualHours) formGroupActualHours.style.display = 'none';
  if (formGroupProgress) formGroupProgress.style.display = 'none';
  taskDialog.showModal();
  taskDialog.scrollTop = 0;
}

// --- タスクフォーム送信 & バリデーション ---
function handleTaskFormSubmit(e) {
  try {
    e.preventDefault();
    clearTaskErrors();
    clearTaskWarnings();
    updateTaskEndDateWarning();

    const formData = new FormData(taskForm);
    const name = formData.get('name').trim();
    const description = formData.get('description').trim();
    const projectId = currentTaskProjectId;
    const assignee = formData.get('assignee');
    const startDate = formData.get('startDate');
    const endDate = formData.get('endDate');
    const priority = formData.get('priority');
    const difficulty = formData.get('difficulty');
    const status = formData.get('status');
    const estimatedHours = parseInt(formData.get('estimatedHours') || '0', 10);
    const actualHours = parseInt(formData.get('actualHours') || '0', 10);
    const progress = parseInt(formData.get('progress') || '0', 10);

    let hasError = false;

    if (!name) {
      showTaskError('name', 'タスク名は必須項目です。');
      hasError = true;
    } else if (name.length > 50) {
      showTaskError('name', 'タスク名は50文字以内で入力してください。');
      hasError = true;
    }

    if (!projectId) {
      showTaskError('projectId', 'プロジェクトを選択してください。');
      hasError = true;
    }

    if (!startDate) {
      showTaskError('startDate', '開始日を入力してください。');
      hasError = true;
    }

    if (!endDate) {
      showTaskError('endDate', '終了日を入力してください。');
      hasError = true;
    }

    if (endDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      if (end < today) {
        showTaskError('endDate', '終了日は本日以降の日付を選択してください。');
        hasError = true;
      }
    }

    if (startDate && endDate && startDate > endDate) {
      showTaskError('endDate', '終了日は開始日以降の日付にしてください。');
      hasError = true;
    }

    if (!assignee) {
      showTaskError('assignee', '担当者は必須項目です。');
      hasError = true;
    }

    if (estimatedHours <= 0) {
      showTaskError('estimatedHours', '予定工数は1h以上で入力してください。');
      hasError = true;
    }

    if (hasError) return;

    const taskData = {
      name,
      description,
      projectId,
      assignee: assignee || '',
      startDate: startDate || '',
      endDate: endDate || '',
      difficulty: difficulty || 'medium',
      priority,
      status,
      progress: isNaN(progress) ? 0 : progress,
      estimatedHours: isNaN(estimatedHours) ? 0 : estimatedHours,
      actualHours: isNaN(actualHours) ? 0 : actualHours
    };

    const isEditing = editingTaskId !== null;

    if (isEditing) {
      const oldTask = taskRepo.findById(editingTaskId);
      if (oldTask) {
        taskData.id = editingTaskId;
        taskData.status = oldTask.status;
        taskData.progress = oldTask.progress;
        taskData.actualHours = oldTask.actualHours;
        taskRepo.save(taskData);
      }
    } else {
      const newActual = isNaN(actualHours) ? 0 : actualHours;
      const newTask = {
        createdBy: currentUser.name,
        thread: [],
        savedProgress: null,
        statusHistory: [],
        effortLog: [],
        parentTaskId: creatingChildParentTaskId || null,
        wbsCode: creatingChildParentTaskId ? getNextWBSCode(projectId, creatingChildParentTaskId) : getNextWBSCode(projectId, null),
        ...taskData
      };
      newTask.actualHours = newActual;
      if (newActual > 0) {
        newTask.effortLog.push({
          id: `log-${Date.now()}`,
          date: '初期値',
          hours: newActual,
          timestamp: formatTimestamp(new Date())
        });
      }
      taskRepo.save(newTask);
    }

    const proj = projectRepo.findById(projectId);

    const done = () => {
      creatingChildParentTaskId = null;
      renderTasks();
      if (currentView === 'wbs') renderWBS();
      updateIssueBadge();
      taskDialog.close();
      if (taskDetailDialog.open) taskDetailDialog.close();
    };

    if (proj && proj.plannedHours > 0) {
      const totalTaskHours = taskRepo.findByProject(projectId)
        .reduce((sum, t) => sum + (t.estimatedHours || 0), 0);
      if (totalTaskHours > proj.plannedHours) {
        showCompleteDialog(
          `プロジェクト予定工数を超過しています。\n\nプロジェクト名：${proj.name}\nプロジェクト予定工数：${proj.plannedHours}h\nタスク予定工数合計：${totalTaskHours}h`,
          done,
          '警告'
        );
        return;
      }
    }

    if (!isEditing) {
      showCompleteDialog('登録が完了しました。', done);
    } else {
      done();
    }
  } catch (err) {
    console.error('タスク保存エラー:', err);
    showCompleteDialog('保存中にエラーが発生しました: ' + err.message, null, 'エラー');
  }
}
