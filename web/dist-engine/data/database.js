// ============================================================
// AI Destiny OS — Database Layer
// Adapter pattern: better-sqlite3 (local dev) or libsql (Turso cloud).
// Auto-detects based on TURSO_DATABASE_URL environment variable.
// ============================================================
import Database from 'better-sqlite3';
import { createClient } from '@libsql/client';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { mkdirSync, existsSync } from 'node:fs';
// ---- better-sqlite3 Adapter (local dev) ----
class BetterSqlite3Adapter {
    db;
    isRemote = false;
    constructor(dbPath) {
        const dir = join(dbPath, '..');
        if (!existsSync(dir))
            mkdirSync(dir, { recursive: true });
        this.db = new Database(dbPath);
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('foreign_keys = ON');
    }
    async execute(sql, params) {
        // Replace libsql-style ? placeholders with named params for better-sqlite3
        const { resolved, positional } = this.resolveParams(sql, params ?? {});
        const stmt = this.db.prepare(resolved);
        const result = stmt.run(...positional);
        return {
            lastInsertRowid: Number(result.lastInsertRowid),
            changes: result.changes,
        };
    }
    async get(sql, params) {
        const { resolved, positional } = this.resolveParams(sql, params ?? {});
        const stmt = this.db.prepare(resolved);
        return stmt.get(...positional);
    }
    async all(sql, params) {
        const { resolved, positional } = this.resolveParams(sql, params ?? {});
        const stmt = this.db.prepare(resolved);
        return stmt.all(...positional);
    }
    close() {
        this.db.close();
    }
    /**
     * Resolve named params from libsql-style SQL with @param placeholders
     * into positional params for better-sqlite3.
     */
    resolveParams(sql, params) {
        const names = Object.keys(params);
        if (names.length === 0)
            return { resolved: sql, positional: [] };
        // Replace @name with ? (better-sqlite3 positional)
        const positional = [];
        let resolved = sql;
        for (const name of names) {
            resolved = resolved.replace(new RegExp(`@${name}\\b`, 'g'), '?');
            positional.push(params[name]);
        }
        return { resolved, positional };
    }
}
// ---- libsql Adapter (Turso / cloud) ----
class LibsqlAdapter {
    client;
    isRemote;
    constructor(url, authToken) {
        this.client = createClient({ url, authToken });
        this.isRemote = !url.startsWith('file:');
    }
    async execute(sql, params) {
        // Convert named @param to ? placeholders for libsql
        const { resolved, positional } = this.resolveParams(sql, params ?? {});
        const result = await this.client.execute({ sql: resolved, args: positional });
        return {
            lastInsertRowid: result.lastInsertRowid ? Number(result.lastInsertRowid) : undefined,
            changes: result.rowsAffected,
        };
    }
    async get(sql, params) {
        const { resolved, positional } = this.resolveParams(sql, params ?? {});
        const result = await this.client.execute({ sql: resolved, args: positional });
        const row = result.rows[0];
        if (!row)
            return undefined;
        // Convert libsql Row to plain object
        const obj = {};
        for (const col of result.columns) {
            obj[col] = row[result.columns.indexOf(col)];
        }
        return obj;
    }
    async all(sql, params) {
        const { resolved, positional } = this.resolveParams(sql, params ?? {});
        const result = await this.client.execute({ sql: resolved, args: positional });
        return result.rows.map(row => {
            const obj = {};
            for (const col of result.columns) {
                obj[col] = row[result.columns.indexOf(col)];
            }
            return obj;
        });
    }
    close() {
        this.client.close();
    }
    resolveParams(sql, params) {
        const names = Object.keys(params);
        if (names.length === 0)
            return { resolved: sql, positional: [] };
        const positional = [];
        let resolved = sql;
        for (const name of names) {
            resolved = resolved.replace(new RegExp(`@${name}\\b`, 'g'), '?');
            positional.push(params[name]);
        }
        return { resolved, positional };
    }
}
// ---- Factory ----
const DATA_DIR = join(homedir(), '.ai-destiny-os');
const DB_PATH = join(DATA_DIR, 'destiny.db');
let adapter;
function getAdapter() {
    if (adapter)
        return adapter;
    const tursoUrl = process.env['TURSO_DATABASE_URL'];
    if (tursoUrl) {
        const authToken = process.env['TURSO_AUTH_TOKEN'] ?? '';
        console.log(`[DB] Using Turso: ${tursoUrl.replace(/\/\/.*@/, '//***@')}`);
        adapter = new LibsqlAdapter(tursoUrl, authToken);
    }
    else {
        adapter = new BetterSqlite3Adapter(DB_PATH);
    }
    initTables(adapter);
    return adapter;
}
async function initTables(a) {
    // Creating tables is safe to call on every init — IF NOT EXISTS prevents errors.
    // For Turso, we batch the DDL. For better-sqlite3, we exec sequentially.
    const ddl = [
        `CREATE TABLE IF NOT EXISTS birth_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      birth_info TEXT NOT NULL,
      chart_data TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
        `CREATE TABLE IF NOT EXISTS analysis_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_id INTEGER NOT NULL,
      question TEXT NOT NULL,
      response TEXT NOT NULL,
      topic TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (record_id) REFERENCES birth_records(id) ON DELETE CASCADE
    )`,
        `CREATE TABLE IF NOT EXISTS memory_snapshots (
      user_id TEXT PRIMARY KEY,
      version INTEGER NOT NULL DEFAULT 1,
      snapshot_data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
        `CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      birth_info TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
        `CREATE TABLE IF NOT EXISTS session_turns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'agent')),
      content TEXT NOT NULL,
      topic TEXT,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    )`,
        `CREATE TABLE IF NOT EXISTS message_feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      turn_id INTEGER,
      rating TEXT NOT NULL CHECK(rating IN ('up', 'down')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    ];
    for (const sql of ddl) {
        await a.execute(sql);
    }
}
export async function saveRecord(birth, chartData, name) {
    const a = getAdapter();
    const result = await a.execute('INSERT INTO birth_records (name, birth_info, chart_data) VALUES (@name, @birth, @chart)', { name: name ?? null, birth: JSON.stringify(birth), chart: chartData ? JSON.stringify(chartData) : null });
    return (await getRecord(result.lastInsertRowid));
}
export async function getRecord(id) {
    const a = getAdapter();
    const row = await a.get('SELECT * FROM birth_records WHERE id = ?', { id });
    if (!row)
        return null;
    return {
        id: row['id'],
        name: row['name'],
        birthInfo: JSON.parse(row['birth_info']),
        chartData: row['chart_data'] ? JSON.parse(row['chart_data']) : null,
        createdAt: row['created_at'],
        updatedAt: row['updated_at'],
    };
}
export async function listRecords() {
    const a = getAdapter();
    const rows = await a.all('SELECT * FROM birth_records ORDER BY updated_at DESC');
    return rows.map(row => ({
        id: row['id'],
        name: row['name'],
        birthInfo: JSON.parse(row['birth_info']),
        chartData: row['chart_data'] ? JSON.parse(row['chart_data']) : null,
        createdAt: row['created_at'],
        updatedAt: row['updated_at'],
    }));
}
export async function updateRecord(id, chartData) {
    const a = getAdapter();
    await a.execute("UPDATE birth_records SET chart_data = ?, updated_at = datetime('now') WHERE id = ?", { chart: JSON.stringify(chartData), id });
}
export async function deleteRecord(id) {
    const a = getAdapter();
    await a.execute('DELETE FROM birth_records WHERE id = ?', { id });
}
export async function saveAnalysis(recordId, question, response, topic) {
    const a = getAdapter();
    const result = await a.execute('INSERT INTO analysis_history (record_id, question, response, topic) VALUES (@rid, @q, @r, @t)', { rid: recordId, q: question, r: response, t: topic ?? null });
    return (await getAnalysisEntry(result.lastInsertRowid));
}
export async function getAnalysisEntry(id) {
    const a = getAdapter();
    const row = await a.get('SELECT * FROM analysis_history WHERE id = ?', { id });
    if (!row)
        return null;
    return {
        id: row['id'],
        recordId: row['record_id'],
        question: row['question'],
        response: row['response'],
        topic: row['topic'],
        createdAt: row['created_at'],
    };
}
export async function getHistory(recordId, limit = 50) {
    const a = getAdapter();
    const rows = await a.all('SELECT * FROM analysis_history WHERE record_id = ? ORDER BY created_at DESC LIMIT ?', { recordId, limit });
    return rows.map(row => ({
        id: row['id'],
        recordId: row['record_id'],
        question: row['question'],
        response: row['response'],
        topic: row['topic'],
        createdAt: row['created_at'],
    }));
}
export async function deleteAnalysisHistory(recordId) {
    const a = getAdapter();
    await a.execute('DELETE FROM analysis_history WHERE record_id = ?', { recordId });
}
export async function saveMemorySnapshot(userId, snapshotData) {
    const a = getAdapter();
    // Upsert: insert or update
    if (a.isRemote) {
        // libsql/Turso — use INSERT OR REPLACE
        await a.execute(`INSERT OR REPLACE INTO memory_snapshots (user_id, version, snapshot_data, created_at, updated_at)
       VALUES (@uid, 1, @data, datetime('now'), datetime('now'))`, { uid: userId, data: snapshotData });
    }
    else {
        // better-sqlite3 — use ON CONFLICT
        await a.execute(`INSERT INTO memory_snapshots (user_id, version, snapshot_data, updated_at)
       VALUES (@uid, 1, @data, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET
         snapshot_data = excluded.snapshot_data,
         updated_at = datetime('now')`, { uid: userId, data: snapshotData });
    }
}
export async function loadMemorySnapshot(userId) {
    const a = getAdapter();
    const row = await a.get('SELECT snapshot_data FROM memory_snapshots WHERE user_id = ?', { userId });
    return row ? row.snapshot_data : null;
}
export async function deleteMemorySnapshot(userId) {
    const a = getAdapter();
    await a.execute('DELETE FROM memory_snapshots WHERE user_id = ?', { userId });
}
export async function createSession(sessionId, userId, birth) {
    const a = getAdapter();
    await a.execute('INSERT INTO sessions (id, user_id, birth_info) VALUES (@id, @uid, @birth)', { id: sessionId, uid: userId, birth: JSON.stringify(birth) });
    return (await getSession(sessionId));
}
export async function getSession(sessionId) {
    const a = getAdapter();
    const row = await a.get('SELECT * FROM sessions WHERE id = ?', { sessionId });
    if (!row)
        return null;
    return {
        id: row['id'],
        userId: row['user_id'],
        birthInfo: row['birth_info'],
        createdAt: row['created_at'],
        updatedAt: row['updated_at'],
    };
}
export async function listSessions() {
    const a = getAdapter();
    const rows = await a.all('SELECT * FROM sessions ORDER BY updated_at DESC');
    return rows.map(row => ({
        id: row['id'],
        userId: row['user_id'],
        birthInfo: row['birth_info'],
        createdAt: row['created_at'],
        updatedAt: row['updated_at'],
    }));
}
export async function touchSession(sessionId) {
    const a = getAdapter();
    await a.execute("UPDATE sessions SET updated_at = datetime('now') WHERE id = ?", { sessionId });
}
export async function deleteSession(sessionId) {
    const a = getAdapter();
    await a.execute('DELETE FROM sessions WHERE id = ?', { sessionId });
}
export async function addSessionTurn(sessionId, role, content, topic) {
    const a = getAdapter();
    const timestamp = new Date().toISOString();
    const result = await a.execute('INSERT INTO session_turns (session_id, role, content, topic, timestamp) VALUES (@sid, @role, @content, @topic, @ts)', { sid: sessionId, role, content, topic: topic ?? null, ts: timestamp });
    // Fire-and-forget touch
    touchSession(sessionId).catch(() => { });
    return {
        id: result.lastInsertRowid,
        sessionId,
        role,
        content,
        topic: topic ?? null,
        timestamp,
    };
}
export async function getSessionTurns(sessionId, limit = 100) {
    const a = getAdapter();
    const rows = await a.all('SELECT * FROM session_turns WHERE session_id = ? ORDER BY id ASC LIMIT ?', { sessionId, limit });
    return rows.map(row => ({
        id: row['id'],
        sessionId: row['session_id'],
        role: row['role'],
        content: row['content'],
        topic: row['topic'],
        timestamp: row['timestamp'],
    }));
}
export async function deleteSessionTurns(sessionId) {
    const a = getAdapter();
    await a.execute('DELETE FROM session_turns WHERE session_id = ?', { sessionId });
}
export async function saveFeedback(sessionId, rating, turnId) {
    const a = getAdapter();
    const result = await a.execute('INSERT INTO message_feedback (session_id, turn_id, rating) VALUES (@sid, @tid, @rating)', { sid: sessionId, tid: turnId ?? null, rating });
    return {
        id: result.lastInsertRowid,
        sessionId,
        turnId: turnId ?? null,
        rating,
        createdAt: new Date().toISOString(),
    };
}
export async function getFeedback(sessionId) {
    const a = getAdapter();
    return a.all('SELECT * FROM message_feedback WHERE session_id = ? ORDER BY id DESC', { sessionId }).then(rows => rows.map(row => ({
        id: row['id'],
        sessionId: row['session_id'],
        turnId: row['turn_id'],
        rating: row['rating'],
        createdAt: row['created_at'],
    })));
}
// ---- Utility ----
export function closeDb() {
    if (adapter) {
        adapter.close();
        adapter = undefined;
    }
}
/** Reset adapter (for testing). */
export function resetAdapter() {
    closeDb();
}
/** Initialize with a specific adapter (for testing). */
export function setAdapter(a) {
    closeDb();
    adapter = a;
    initTables(a);
}
//# sourceMappingURL=database.js.map