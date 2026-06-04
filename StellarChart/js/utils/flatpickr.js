// ==========================================================================
// StellarChart - Flatpickr configuration
// 役割: 全画面で使用する日付ピッカーの設定とインスタンス変数を保持する
//       fpConfig は共通設定オブジェクトで、各 input に適用する
//       各 fp 変数は initApp() 内で flatpickr() を呼んで初期化される
// ==========================================================================
//
// 変数一覧:
//   filterStartFp  / filterEndFp   - プロジェクト検索フィルター用
//   projStartFp    / projEndFp     - プロジェクト作成/編集フォーム用
//   taskStartDateFp / taskEndDateFp - タスク作成/編集フォーム用
//   fpConfig       - 共通設定オブジェクト (locale, 日付形式, モーダル表示)
//
// ==========================================================================

let filterStartFp;
let filterEndFp;
let projStartFp;
let projEndFp;
let taskStartDateFp;
let taskEndDateFp;

const fpConfig = {
  dateFormat: "Y-m-d",
  altInput: true,
  altFormat: "Y/m/d",
  locale: "ja",
  allowInput: true,
  parseDate: (dateStr) => {
    const short = dateStr.match(/^(\d{1,2})\/(\d{1,2})$/);
    if (short) {
      const m = parseInt(short[1], 10), d = parseInt(short[2], 10);
      if (m < 1 || m > 12 || d < 1 || d > 31) return undefined;
      const date = new Date(new Date().getFullYear(), m - 1, d);
      if (date.getMonth() !== m - 1 || date.getDate() !== d) return undefined;
      return date;
    }
    const full = dateStr.match(/^(\d+)\/(\d{1,2})\/(\d{1,2})$/);
    if (full) {
      const y = parseInt(full[1], 10), m = parseInt(full[2], 10), d = parseInt(full[3], 10);
      if (m < 1 || m > 12 || d < 1 || d > 31) return undefined;
      const date = new Date(y, m - 1, d);
      if (date.getMonth() !== m - 1 || date.getDate() !== d) return undefined;
      return date;
    }
    const dash = dateStr.match(/^(\d+)-(\d{1,2})-(\d{1,2})$/);
    if (dash) {
      const y = parseInt(dash[1], 10), m = parseInt(dash[2], 10), d = parseInt(dash[3], 10);
      if (m < 1 || m > 12 || d < 1 || d > 31) return undefined;
      const date = new Date(y, m - 1, d);
      if (date.getMonth() !== m - 1 || date.getDate() !== d) return undefined;
      return date;
    }
    return undefined;
  }
};
