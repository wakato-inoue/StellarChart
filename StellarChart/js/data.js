// ==========================================================================
// StellarChart - Data definitions & mock data
// 役割: アプリケーション全体で使用する定数・マスタデータ・モックデータを定義する
//       このファイルは他ファイルに依存しない（真っ先に読み込むこと）
// ==========================================================================
//
// 定義内容:
//   RANK_LEVELS     - ランク定義オブジェクト { RankC, RankB, RankA, RankS }
//   RANK_LABELS     - ランク表示ラベル
//   employeeMaster  - 社員マスタ配列 (name, department, rank)
//   projects        - プロジェクト一覧 (モックデータ)
//   tasks           - タスク一覧 (モックデータ)
//   transfers       - 転送（たらいまわし）レコード一覧
//   taskIdCounter   - タスクID採番カウンター
//   renderDateTime  - 日時表示用フォーマッター
//   getDefaultMembers - プロジェクト初期メンバー取得
//
// ==========================================================================

// --- ランク定義 ---
const RANK_LABELS = {
  RankC: '一般',
  RankB: 'ジュニアリーダー',
  RankA: 'リーダー',
  RankS: '管理職',
  Admin: 'システム管理者'
};

const RANK_LEVEL = { RankC: 0, RankB: 1, RankA: 2, RankS: 3, Admin: 4 };

const STATUS_PRIORITY = ['needs_action', 'suspended', 'in_progress', 'not_started', 'completed'];

// --- 初期データ (モックデータ) ---
let projects = [
  {
    id: "proj-1",
    name: "アルテミス計画",
    description: "月面有人探査に向けた次世代宇宙船の設計・開発プロジェクト。管制システムと生命維持装置の設計を含みます。",
    startDate: "2026-06-01",
    endDate: "2026-12-31",
    progress: 35,
    status: "in_progress",
    creator: "星野 太郎",
    plannedHours: 50,
    members: ["星野 太郎", "宇都宮 花子", "ニール・アームストロング"]
  },
  {
    id: "proj-2",
    name: "オリオン座観測衛星",
    description: "深宇宙探査用の高解像度赤外線望遠鏡を搭載した新型観測衛星の打ち上げと初期運用テストを行います。",
    startDate: "2026-08-15",
    endDate: "2027-03-31",
    progress: 0,
    status: "not_started",
    creator: "星野 太郎",
    plannedHours: 12,
    members: ["加藤 健二", "サラ・コナー", "宇都宮 花子"]
  },
  {
    id: "proj-3",
    name: "恒星間通信プロトコル",
    description: "光年単位の通信遅延に対応する新たなデータ転送プロトコルの策定および検証。シミュレータ環境での実証試験が完了しました。",
    startDate: "2025-01-10",
    endDate: "2026-05-20",
    progress: 100,
    status: "completed",
    creator: "星野 太郎",
    plannedHours: 24,
    members: ["ドク・ブラウン", "アインシュタイン"]
  },
  {
    id: "proj-4",
    name: "木星探査船サジタリアス",
    description: "木星軌道への探査船投入および衛星エウロパの地殻調査に向けた超長期計画。現在、推進エンジンの改修に伴い一時中断中。",
    startDate: "2024-03-10",
    endDate: "2026-09-30",
    progress: 55,
    status: "suspended",
    creator: "星野 太郎",
    plannedHours: 30,
    members: ["星野 太郎", "ドク・ブラウン"]
  }
];

// --- タスクデータ (モックデータ) ---
let tasks = [
  {
    id: "task-1",
    projectId: "proj-1",
    name: "生命維持装置の設計",
    description: "月面環境に対応した生命維持システムの基本設計を行う。",
    assignee: "星野 太郎",
    createdBy: "星野 太郎",
    startDate: "2026-07-01",
    endDate: "2026-07-15",
    difficulty: "hard",
    priority: "high",
    status: "in_progress",
    progress: 30,
    savedProgress: 30,
    statusHistory: [],
    estimatedHours: 40,
    actualHours: 18,
    thread: [
      { id: "tc1", author: "星野 太郎", content: "酸素循環系のパラメータ設計について確認が必要です。", timestamp: "2026-07-03 09:15" }
    ]
  },
  {
    id: "task-2",
    projectId: "proj-1",
    name: "管制システムモジュール開発",
    description: "打ち上げ管制システムのソフトウェアモジュールを開発する。",
    assignee: "宇都宮 花子",
    createdBy: "星野 太郎",
    startDate: "2026-08-01",
    endDate: "2026-08-31",
    difficulty: "hard",
    priority: "high",
    status: "not_started",
    progress: 0,
    savedProgress: null,
    statusHistory: [],
    estimatedHours: 120,
    actualHours: 0,
    thread: []
  },
  {
    id: "task-3",
    projectId: "proj-1",
    name: "構造強度シミュレーション",
    description: "宇宙船外殻の有限要素法による構造解析を実施。",
    assignee: "ニール・アームストロング",
    createdBy: "星野 太郎",
    startDate: "2026-09-01",
    endDate: "2026-09-30",
    difficulty: "medium",
    priority: "medium",
    status: "not_started",
    progress: 0,
    savedProgress: null,
    statusHistory: [],
    estimatedHours: 60,
    actualHours: 0,
    thread: []
  },
  {
    id: "task-4",
    projectId: "proj-2",
    name: "搭載機器インターフェース設計",
    description: "観測衛星搭載機器間の電気的・機械的インターフェースを設計する。",
    assignee: "加藤 健二",
    createdBy: "星野 太郎",
    startDate: "2026-09-01",
    endDate: "2026-10-15",
    difficulty: "medium",
    priority: "high",
    status: "not_started",
    progress: 0,
    savedProgress: null,
    statusHistory: [],
    estimatedHours: 80,
    actualHours: 0,
    thread: []
  },
  {
    id: "task-5",
    projectId: "proj-2",
    name: "地上局との通信試験",
    description: "試作機を用いた地上局との通信結合試験を実施。",
    assignee: "宇都宮 花子",
    createdBy: "星野 太郎",
    startDate: "2026-11-01",
    endDate: "2026-12-20",
    difficulty: "easy",
    priority: "medium",
    status: "needs_action",
    progress: 30,
    savedProgress: 30,
    statusHistory: [],
    estimatedHours: 50,
    actualHours: 15,
    thread: [
      { id: "tc6", author: "サラ・コナー", content: "【転送】サラ・コナー → 宇都宮 花子。理由：地上局との通信試験で不明点があり、管轄の宇都宮さんに確認をお願いします。", timestamp: "2026-07-10 14:30" }
    ]
  },
  {
    id: "task-6",
    projectId: "proj-3",
    name: "プロトコル仕様書の作成",
    description: "恒星間通信プロトコルの詳細仕様書を作成し、レビューを実施。",
    assignee: "ドク・ブラウン",
    createdBy: "星野 太郎",
    startDate: "2025-01-10",
    endDate: "2025-06-30",
    difficulty: "hard",
    priority: "high",
    status: "completed",
    progress: 100,
    savedProgress: 100,
    statusHistory: [],
    estimatedHours: 100,
    actualHours: 0,
    thread: [
      { id: "tc2", author: "ドク・ブラウン", content: "仕様書のドラフトが完了しました。レビューをお願いします。", timestamp: "2025-05-20 14:00" },
      { id: "tc3", author: "星野 太郎", content: "確認しました。セクション3の通信遅延耐性について追記してください。", timestamp: "2025-05-22 10:30" },
      { id: "tc4", author: "ドク・ブラウン", content: "追記しました。再レビューをお願いします。", timestamp: "2025-05-25 16:45" }
    ]
  },
  {
    id: "task-7",
    projectId: "proj-4",
    name: "推進エンジン改修設計",
    description: "木星軌道投入に向けた推進エンジンの出力向上改修設計。",
    assignee: "星野 太郎",
    createdBy: "星野 太郎",
    startDate: "2026-06-01",
    endDate: "2026-08-31",
    difficulty: "hard",
    priority: "high",
    status: "in_progress",
    progress: 45,
    savedProgress: 45,
    statusHistory: [],
    estimatedHours: 200,
    actualHours: 90,
    thread: [
      { id: "tc5", author: "星野 太郎", content: "推進薬供給系統の設計見直しが必要です。", timestamp: "2026-06-15 11:00" }
    ]
  },
  {
    id: "task-8",
    projectId: "proj-2",
    name: "セキュリティプロトコルの策定",
    description: "観測衛星の地上局通信におけるセキュリティプロトコルを策定する。",
    assignee: "サラ・コナー",
    createdBy: "星野 太郎",
    startDate: "2026-09-01",
    endDate: "2026-10-31",
    difficulty: "medium",
    priority: "medium",
    status: "in_progress",
    progress: 15,
    savedProgress: null,
    statusHistory: [],
    estimatedHours: 60,
    actualHours: 0,
    thread: []
  },
  {
    id: "task-9",
    projectId: "proj-3",
    name: "理論検証: 量子通信の応用",
    description: "恒星間通信への量子もつれ通信応用の理論的検証を行う。",
    assignee: "アインシュタイン",
    createdBy: "星野 太郎",
    startDate: "2025-01-10",
    endDate: "2025-08-31",
    difficulty: "hard",
    priority: "medium",
    status: "completed",
    progress: 100,
    savedProgress: null,
    statusHistory: [],
    estimatedHours: 150,
    actualHours: 0,
    thread: []
  },
  {
    id: "task-10",
    projectId: "proj-3",
    name: "相対論的通信遅延の補正式導出",
    description: "恒星間距離における相対論的効果を考慮した通信遅延補正式を導出する。",
    assignee: "アインシュタイン",
    createdBy: "星野 太郎",
    startDate: "2026-06-01",
    endDate: "2026-08-31",
    difficulty: "hard",
    priority: "high",
    status: "in_progress",
    progress: 45,
    savedProgress: 45,
    statusHistory: [],
    estimatedHours: 200,
    actualHours: 0,
    thread: []
  },
  {
    id: "task-11",
    projectId: "proj-2",
    parentTaskId: "task-8",
    name: "暗号化通信方式の選定",
    description: "衛星-地上局間の暗号化通信方式を調査し、最適な方式を選定する。",
    assignee: "サラ・コナー",
    createdBy: "星野 太郎",
    startDate: "2026-09-10",
    endDate: "2026-10-10",
    difficulty: "medium",
    priority: "medium",
    status: "in_progress",
    progress: 20,
    savedProgress: null,
    statusHistory: [],
    estimatedHours: 40,
    actualHours: 15,
    thread: []
  },
  {
    id: "task-12",
    projectId: "proj-1",
    parentTaskId: "task-1",
    name: "酸素供給システムのパラメータ設計",
    description: "生命維持装置の中核である酸素供給システムの設計パラメータを決定する。",
    assignee: "星野 太郎",
    createdBy: "星野 太郎",
    startDate: "2026-07-01",
    endDate: "2026-07-10",
    difficulty: "hard",
    priority: "high",
    status: "in_progress",
    progress: 30,
    savedProgress: 30,
    statusHistory: [],
    estimatedHours: 25,
    actualHours: 12,
    thread: []
  },
  {
    id: "task-13",
    projectId: "proj-1",
    parentTaskId: "task-1",
    name: "二酸化炭素除去システムの設計",
    description: "生命維持装置の二酸化炭素除去サブシステムを設計する。",
    assignee: "星野 太郎",
    createdBy: "星野 太郎",
    startDate: "2026-07-05",
    endDate: "2026-07-15",
    difficulty: "medium",
    priority: "high",
    status: "in_progress",
    progress: 40,
    savedProgress: 40,
    statusHistory: [],
    estimatedHours: 15,
    actualHours: 6,
    thread: []
  },
  {
    id: "task-14",
    projectId: "proj-4",
    parentTaskId: "task-7",
    name: "推力向上ノズルの設計",
    description: "推進エンジンのノズル形状を改良し推力を15%向上させる。",
    assignee: "星野 太郎",
    createdBy: "星野 太郎",
    startDate: "2026-06-01",
    endDate: "2026-07-15",
    difficulty: "hard",
    priority: "high",
    status: "in_progress",
    progress: 50,
    savedProgress: 50,
    statusHistory: [],
    estimatedHours: 80,
    actualHours: 40,
    thread: []
  },
  {
    id: "task-15",
    projectId: "proj-4",
    parentTaskId: "task-7",
    name: "推進薬供給系統の再設計",
    description: "高出力化に伴う推進薬供給系統の再設計を行う。",
    assignee: "星野 太郎",
    createdBy: "星野 太郎",
    startDate: "2026-07-01",
    endDate: "2026-08-31",
    difficulty: "medium",
    priority: "medium",
    status: "in_progress",
    progress: 10,
    savedProgress: null,
    statusHistory: [],
    estimatedHours: 60,
    actualHours: 0,
    thread: []
  },
  {
    id: "task-16",
    projectId: "proj-4",
    parentTaskId: "task-7",
    name: "冷却システムの強化",
    description: "エンジン出力向上に伴う冷却システムの強化改修を行う。",
    assignee: "星野 太郎",
    createdBy: "星野 太郎",
    startDate: "2026-08-01",
    endDate: "2026-08-31",
    difficulty: "hard",
    priority: "high",
    status: "in_progress",
    progress: 50,
    savedProgress: 50,
    statusHistory: [],
    estimatedHours: 60,
    actualHours: 50,
    thread: []
  }
];

// --- 社員マスタ (モックデータ) ---
const employeeMaster = [
  { id: "emp-1", name: "星野 太郎", department: "宇宙開発部", rank: "RankS" },
  { id: "emp-2", name: "宇都宮 花子", department: "宇宙開発部", rank: "RankA" },
  { id: "emp-3", name: "ニール・アームストロング", department: "宇宙飛行部", rank: "RankB" },
  { id: "emp-4", name: "加藤 健二", department: "システム開発部", rank: "RankB" },
  { id: "emp-5", name: "サラ・コナー", department: "セキュリティ部", rank: "RankC" },
  { id: "emp-6", name: "ドク・ブラウン", department: "研究開発部", rank: "RankA" },
  { id: "emp-7", name: "アインシュタイン", department: "理論物理部", rank: "RankC" },
  { id: "emp-8", name: "ステラ 太郎", department: "プロジェクト管理部", rank: "RankC" },
  { id: "emp-9", name: "ルナ 姫", department: "広報部", rank: "RankB" },
  { id: "emp-10", name: "ソル 太朗", department: "システム開発部", rank: "Admin" }
];

// --- 要課題データ (転送レコード) ---
let transfers = [
  {
    id: "tr-1",
    taskId: "task-5",
    from: "サラ・コナー",
    to: "宇都宮 花子",
    reason: "地上局との通信試験で不明点があり、管轄の宇都宮さんに確認をお願いします。",
    timestamp: "2026-07-10 14:30",
    read: false
  }
];
