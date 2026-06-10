// ==========================================================================
// StellarChart - Authorization helpers
// 役割: ユーザーランクに基づく権限チェック関数
//       各画面/操作の表示制御に使用する
// ==========================================================================
//
// 権限マトリクス:
//   RankS (管理職) → プロジェクト作成/削除, 全タスク表示
//   RankA (リーダー) → プロジェクト編集, タスク作成/削除
//   RankB (Jrリーダー) → タスク編集
//   RankC (一般) → 自身のタスクのみ表示/編集
//
// 関数一覧:
//   hasRank          - 最小ランク以上か判定
//   canCreateProject - プロジェクト作成権限 (RankS)
//   canEditProject   - プロジェクト編集権限 (RankA)
//   canDeleteProject - プロジェクト削除権限 (RankS)
//   canCreateTask    - タスク作成権限 (RankA)
//   canEditTask      - タスク編集権限 (RankB)
//   canDeleteTask    - タスク削除権限 (RankA)
//   canTransfer      - 転送権限 (常にtrue)
//   canChangeStatus  - ステータス変更権限 (担当者自身 or RankA以上)
//
// ==========================================================================

function hasRank(minLevel) {
  return currentUser && (RANK_LEVEL[currentUser.rank] ?? -1) >= RANK_LEVEL[minLevel];
}
function canCreateProject() { return hasRank('RankS'); }
function canEditProject()   { return hasRank('RankA'); }
function canDeleteProject() { return hasRank('RankS'); }
function canCreateTask()    { return hasRank('RankA'); }
function canEditTask()      { return hasRank('RankB'); }
function canDeleteTask()    { return hasRank('RankA'); }
function canTransfer()      { return true; }
function canChangeStatus(task) {
  if (!currentUser) return false;
  if (task.status === 'needs_action') return false;
  return currentUser.name === task.assignee || hasRank('RankA');
}
