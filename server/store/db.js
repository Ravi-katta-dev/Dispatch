// SQLite via sql.js (pure JS, no native build, works on Vercel).
// DB is in-memory for now; Phase 5 can swap to a file or Turso for persistence.
//
// Tables:
//   users    — id, email, password_hash, created_at
//   activity — id, user_id, agent_id, agent_name, icon, query, answer, tools_used, created_at

import initSqlJs from "sql.js";

let _db = null;

export async function getDb() {
  if (_db) return _db;

  const SQL = await initSqlJs();
  _db = new SQL.Database();

  _db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      email        TEXT    NOT NULL UNIQUE,
      password_hash TEXT   NOT NULL,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  _db.run(`
    CREATE TABLE IF NOT EXISTS activity (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER REFERENCES users(id),
      agent_id    TEXT    NOT NULL,
      agent_name  TEXT    NOT NULL,
      icon        TEXT,
      query       TEXT,
      answer      TEXT,
      tools_used  TEXT,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Index for fast per-user feed queries
  _db.run(`CREATE INDEX IF NOT EXISTS idx_activity_user ON activity(user_id, created_at DESC)`);

  return _db;
}

// ─── User helpers ─────────────────────────────────────────────────────────────

export async function createUser(email, passwordHash) {
  const db = await getDb();
  db.run(
    "INSERT INTO users (email, password_hash) VALUES (?, ?)",
    [email, passwordHash]
  );
  const result = db.exec("SELECT last_insert_rowid() AS id");
  return result[0].values[0][0]; // user id
}

export async function findUserByEmail(email) {
  const db = await getDb();
  const result = db.exec("SELECT id, email, password_hash FROM users WHERE email = ?", [email]);
  if (!result.length || !result[0].values.length) return null;
  const [id, em, password_hash] = result[0].values[0];
  return { id, email: em, password_hash };
}

// ─── Activity helpers ─────────────────────────────────────────────────────────

export async function insertActivity({ userId, agentId, agentName, icon, query, answer, toolsUsed }) {
  const db = await getDb();
  db.run(
    `INSERT INTO activity (user_id, agent_id, agent_name, icon, query, answer, tools_used)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId ?? null, agentId, agentName, icon, query, answer, JSON.stringify(toolsUsed ?? [])]
  );
}

export async function getActivity({ userId, limit = 20 }) {
  const db = await getDb();
  const sql = userId
    ? `SELECT * FROM activity WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`
    : `SELECT * FROM activity ORDER BY created_at DESC LIMIT ?`;
  const params = userId ? [userId, limit] : [limit];

  const result = db.exec(sql, params);
  if (!result.length) return [];

  const cols = result[0].columns;
  return result[0].values.map(row => {
    const obj = Object.fromEntries(cols.map((c, i) => [c, row[i]]));
    obj.tools_used = JSON.parse(obj.tools_used || "[]");
    return obj;
  });
}
