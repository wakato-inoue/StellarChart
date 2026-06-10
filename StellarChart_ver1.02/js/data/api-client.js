// ==========================================================================
// StellarChart - API Client (sql.js ラッパー)
// 役割: sql.js の低レベルAPI（db.exec / db.run / db.prepare）をラップし、
//       統一されたCRUDインターフェースを提供する。
//       repository.js はこのモジュール経由でのみDBにアクセスする。
//
// 将来の拡張:
//   このファイルの実装を sql.js → fetch()（APIサーバー）に差し替えれば、
//   ブラウザ内SQLiteから本番DBに移行できる。
//
// メソッド一覧:
//   query(sql, params)     - SELECT系。オブジェクト配列を返す
//   execute(sql, params)   - INSERT/UPDATE/DELETE系
//   findById(table, id)    - 単一レコード取得
//   findAll(table)         - 全件取得
//   findWhere(table, conditions) - WHERE条件付き検索
//   insert(table, data)    - 新規INSERT（発行されたIDを返す）
//   update(table, id, data) - 既存UPDATE
//   delete(table, id)      - 単一削除
//   lastInsertId()         - 最後にINSERTしたIDを取得
// ==========================================================================

const api = {

  // --- SELECT クエリ実行 ---
  // db.exec() はパラメータバインドに対応していないため、
  // db.prepare() + bind() + step() + getAsObject() を使用する
  query(sql, params = []) {
    const stmt = db.prepare(sql);
    if (params.length > 0) stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  },

  // --- INSERT / UPDATE / DELETE 実行 ---
  // db.run() はパラメータバインドに対応しており、結果を返さない
  execute(sql, params = []) {
    db.run(sql, params);
  },

  // --- ID指定で1件取得 ---
  findById(table, id) {
    const rows = this.query(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    return rows[0] || null;
  },

  // --- 全件取得 ---
  findAll(table) {
    return this.query(`SELECT * FROM ${table}`);
  },

  // --- WHERE条件付き検索 ---
  // conditions: { column1: value1, column2: value2, ... }
  findWhere(table, conditions) {
    const keys = Object.keys(conditions);
    const where = keys.map(k => `${k} = ?`).join(' AND ');
    const values = keys.map(k => conditions[k]);
    return this.query(`SELECT * FROM ${table} WHERE ${where}`, values);
  },

  // --- 新規INSERT ---
  // data: { column1: value1, column2: value2, ... }
  // 戻り値: 発行されたID（数値）
  insert(table, data) {
    const keys = Object.keys(data);
    const cols = keys.join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    const values = keys.map(k => data[k]);
    this.execute(`INSERT INTO ${table} (${cols}) VALUES (${placeholders})`, values);
    return this.lastInsertId();
  },

  // --- 既存UPDATE ---
  // data: { column1: newValue1, ... }
  update(table, id, data) {
    const keys = Object.keys(data);
    const set = keys.map(k => `${k} = ?`).join(', ');
    const values = [...keys.map(k => data[k]), id];
    this.execute(`UPDATE ${table} SET ${set} WHERE id = ?`, values);
  },

  // --- 単一削除 ---
  delete(table, id) {
    this.execute(`DELETE FROM ${table} WHERE id = ?`, [id]);
  },

  // --- 最後にINSERTしたIDを取得 ---
  lastInsertId() {
    const rows = this.query('SELECT last_insert_rowid() as id');
    return rows[0] ? rows[0].id : null;
  }
};
