// ==========================================================================
// StellarChart - Data Repository (データアクセス層)
// 役割: グローバル配列 (tasks / projects / transfers) へのアクセスを
//       このファイルに集約する。全コンポーネントは repository 経由でのみ
//       データを読み書きする。
//
// 将来の拡張:
//   内部実装を mock-provider → api-client に差し替えるだけで
//   DB/API バックエンドに移行可能。
// ==========================================================================
//
// 使用方法:
//   taskRepo.findById(id)
//   taskRepo.findByProject(projectId)
//   taskRepo.save(taskData)
//   projectRepo.findById(id)
//   transferRepo.save(transferData)
//   ...
//
// ==========================================================================

// ========================================================================
// taskRepo
// ========================================================================
const taskRepo = {
  // --- 参照系 ---

  findById(id) {
    return tasks.find(t => t.id === id) || null;
  },

  findByProject(projectId) {
    return tasks.filter(t => t.projectId === projectId);
  },

  findByParent(parentTaskId) {
    return tasks.filter(t => t.parentTaskId === parentTaskId);
  },

  hasChildren(taskId) {
    return tasks.some(t => t.parentTaskId === taskId);
  },

  findAll() {
    return tasks;
  },

  getLeaves(taskId) {
    const directChildren = this.findByParent(taskId);
    const result = [];
    directChildren.forEach(child => {
      if (this.hasChildren(child.id)) {
        result.push(...this.getLeaves(child.id));
      } else {
        result.push(child);
      }
    });
    return result;
  },

  // --- 書込系 ---

  save(taskData) {
    const existing = this.findById(taskData.id);
    if (existing) {
      const idx = tasks.findIndex(t => t.id === taskData.id);
      if (idx !== -1) {
        tasks[idx] = { ...existing, ...taskData };
      }
      return tasks[idx];
    }
    const newTask = {
      id: taskData.id || `task-${Date.now()}`,
      thread: [],
      savedProgress: null,
      statusHistory: [],
      effortLog: [],
      parentTaskId: null,
      ...taskData
    };
    if (!newTask.actualHours) newTask.actualHours = 0;
    tasks.push(newTask);
    return newTask;
  },

  delete(id) {
    tasks = tasks.filter(t => t.id !== id);
  },

  deleteWithChildren(id) {
    const childIds = this.findByParent(id).map(t => t.id);
    childIds.forEach(cid => this.deleteWithChildren(cid));
    this.delete(id);
  },

  deleteByProject(projectId) {
    tasks = tasks.filter(t => t.projectId !== projectId);
  },

  // --- WBSコード管理 ---

  nextWBSCode(parentTaskId) {
    if (parentTaskId) {
      const parent = this.findById(parentTaskId);
      if (!parent || !parent.wbsCode) return String(wbsCodeCounter + 1);
      const siblings = this.findByParent(parentTaskId);
      return `${parent.wbsCode}.${siblings.length + 1}`;
    }
    wbsCodeCounter++;
    return String(wbsCodeCounter);
  },

  syncWBSCodes() {
    // parentTaskId の正規化: トップレベルタスクは null に統一
    tasks.forEach(t => { if (!t.parentTaskId) t.parentTaskId = null; });

    let maxTopCode = tasks
      .filter(t => !t.parentTaskId && t.wbsCode)
      .reduce((max, t) => Math.max(max, parseInt(t.wbsCode, 10) || 0), 0);
    if (wbsCodeCounter < maxTopCode) wbsCodeCounter = maxTopCode;

    const topLevel = tasks.filter(t => !t.parentTaskId && !t.wbsCode)
      .sort((a, b) => parseInt(a.id.replace(/\D/g, '')) - parseInt(b.id.replace(/\D/g, '')));
    topLevel.forEach(t => {
      wbsCodeCounter++;
      t.wbsCode = String(wbsCodeCounter);
      t.parentTaskId = null;
    });

    const assignChildCodes = (parentTask) => {
      const children = tasks
        .filter(t => t.parentTaskId === parentTask.id && !t.wbsCode)
        .sort((a, b) => parseInt(a.id.replace(/\D/g, '')) - parseInt(b.id.replace(/\D/g, '')));
      children.forEach((child, i) => {
        child.wbsCode = `${parentTask.wbsCode}.${i + 1}`;
        assignChildCodes(child);
      });
    };
    topLevel.forEach(assignChildCodes);
    tasks.filter(t => !t.parentTaskId && t.wbsCode).forEach(assignChildCodes);
  }
};

// ========================================================================
// projectRepo
// ========================================================================
const projectRepo = {
  findById(id) {
    return projects.find(p => p.id === id) || null;
  },

  findAll() {
    return projects;
  },

  findVisible(user) {
    return projects.filter(p => p.members && p.members.includes(user.name));
  },

  save(projectData) {
    const existing = this.findById(projectData.id);
    if (existing) {
      const idx = projects.findIndex(p => p.id === projectData.id);
      if (idx !== -1) {
        projects[idx] = { ...existing, ...projectData };
      }
      return projects[idx];
    }
    const newProject = {
      id: projectData.id || `proj-${Date.now()}`,
      ...projectData
    };
    projects.push(newProject);
    return newProject;
  },

  delete(id) {
    projects = projects.filter(p => p.id !== id);
    taskRepo.deleteByProject(id);
  }
};

// ========================================================================
// transferRepo
// ========================================================================
const transferRepo = {
  findByTargetUser(userName) {
    return transfers.filter(t => t.to === userName);
  },

  findAll() {
    return transfers;
  },

  save(transferData) {
    const record = {
      id: transferData.id || `tr-${Date.now()}`,
      read: false,
      ...transferData
    };
    transfers.unshift(record);
    return record;
  }
};
