// ============================================================
// AI Destiny OS — Database Layer
// Adapter pattern: better-sqlite3 (local dev) or libsql (Turso cloud).
// Auto-detects based on TURSO_DATABASE_URL environment variable.
// ============================================================

import Database from 'better-sqlite3';
import { createClient } from '@libsql/client';
import type { Client as LibsqlClient } from '@libsql/client';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { mkdirSync, existsSync } from 'node:fs';
import type { BirthInfo } from '../core/astro/types.js';

// ---- Adapter Interface ----

export interface DatabaseAdapter {
  execute(sql: string, params?: Record<string, unknown>): Promise<{ lastInsertRowid?: number; changes?: number }>;
  get<T = Record<string, unknown>>(sql: string, params?: Record<string, unknown>): Promise<T | undefined>;
  all<T = Record<string, unknown>>(sql: string, params?: Record<string, unknown>): Promise<T[]>;
  close(): void;
  /** True if this is a remote database (Turso), used for decisions about synchronous ops. */
  readonly isRemote: boolean;
}

// ---- better-sqlite3 Adapter (local dev) ----

class BetterSqlite3Adapter implements DatabaseAdapter {
  private db: Database.Database;
  readonly isRemote = false;

  constructor(dbPath: string) {
    const dir = join(dbPath, '..');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  async execute(sql: string, params?: Record<string, unknown>): Promise<{ lastInsertRowid?: number; changes?: number }> {
    // Replace libsql-style ? placeholders with named params for better-sqlite3
    const { resolved, positional } = this.resolveParams(sql, params ?? {});
    const stmt = this.db.prepare(resolved);
    const result = stmt.run(...positional);
    return {
      lastInsertRowid: Number(result.lastInsertRowid),
      changes: result.changes,
    };
  }

  async get<T = Record<string, unknown>>(sql: string, params?: Record<string, unknown>): Promise<T | undefined> {
    const { resolved, positional } = this.resolveParams(sql, params ?? {});
    const stmt = this.db.prepare(resolved);
    return stmt.get(...positional) as T | undefined;
  }

  async all<T = Record<string, unknown>>(sql: string, params?: Record<string, unknown>): Promise<T[]> {
    const { resolved, positional } = this.resolveParams(sql, params ?? {});
    const stmt = this.db.prepare(resolved);
    return stmt.all(...positional) as T[];
  }

  close(): void {
    this.db.close();
  }

  /**
   * Resolve named params from libsql-style SQL with @param placeholders
   * into positional params for better-sqlite3.
   */
  private resolveParams(sql: string, params: Record<string, unknown>): { resolved: string; positional: unknown[] } {
    const names = Object.keys(params);
    if (names.length === 0) return { resolved: sql, positional: [] };

    // Replace @name with ? (better-sqlite3 positional)
    const positional: unknown[] = [];
    let resolved = sql;
    for (const name of names) {
      resolved = resolved.replace(new RegExp(`@${name}\\b`, 'g'), '?');
      positional.push(params[name]);
    }
    return { resolved, positional };
  }
}

// ---- libsql Adapter (Turso / cloud) ----

class LibsqlAdapter implements DatabaseAdapter {
  private client: LibsqlClient;
  readonly isRemote: boolean;

  constructor(url: string, authToken?: string) {
    this.client = createClient({ url, authToken });
    this.isRemote = !url.startsWith('file:');
  }

  async execute(sql: string, params?: Record<string, unknown>): Promise<{ lastInsertRowid?: number; changes?: number }> {
    // Convert named @param to ? placeholders for libsql
    const { resolved, positional } = this.resolveParams(sql, params ?? {});
    const result = await this.client.execute({ sql: resolved, args: positional as Array<string | number | null> });
    return {
      lastInsertRowid: result.lastInsertRowid ? Number(result.lastInsertRowid) : undefined,
      changes: result.rowsAffected,
    };
  }

  async get<T = Record<string, unknown>>(sql: string, params?: Record<string, unknown>): Promise<T | undefined> {
    const { resolved, positional } = this.resolveParams(sql, params ?? {});
    const result = await this.client.execute({ sql: resolved, args: positional as Array<string | number | null> });
    const row = result.rows[0];
    if (!row) return undefined;

    // Convert libsql Row to plain object
    const obj: Record<string, unknown> = {};
    for (const col of result.columns) {
      obj[col] = row[result.columns.indexOf(col)];
    }
    return obj as T;
  }

  async all<T = Record<string, unknown>>(sql: string, params?: Record<string, unknown>): Promise<T[]> {
    const { resolved, positional } = this.resolveParams(sql, params ?? {});
    const result = await this.client.execute({ sql: resolved, args: positional as Array<string | number | null> });

    return result.rows.map(row => {
      const obj: Record<string, unknown> = {};
      for (const col of result.columns) {
        obj[col] = row[result.columns.indexOf(col)];
      }
      return obj as T;
    });
  }

  close(): void {
    this.client.close();
  }

  private resolveParams(sql: string, params: Record<string, unknown>): { resolved: string; positional: unknown[] } {
    const names = Object.keys(params);
    if (names.length === 0) return { resolved: sql, positional: [] };

    const positional: unknown[] = [];
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

let adapter: DatabaseAdapter | undefined;

function getAdapter(): DatabaseAdapter {
  if (adapter) return adapter;

  const tursoUrl = process.env['TURSO_DATABASE_URL'];
  if (tursoUrl) {
    const authToken = process.env['TURSO_AUTH_TOKEN'] ?? '';
    console.log(`[DB] Using Turso: ${tursoUrl.replace(/\/\/.*@/, '//***@')}`);
    adapter = new LibsqlAdapter(tursoUrl, authToken);
  } else {
    adapter = new BetterSqlite3Adapter(DB_PATH);
  }

  initTables(adapter);
  return adapter;
}

async function initTables(a: DatabaseAdapter): Promise<void> {
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

// ---- Birth Records ----

export interface BirthRecord {
  id: number;
  name: string | null;
  birthInfo: BirthInfo;
  chartData: unknown;
  createdAt: string;
  updatedAt: string;
}

export async function saveRecord(birth: BirthInfo, chartData?: unknown, name?: string): Promise<BirthRecord> {
  const a = getAdapter();
  const result = await a.execute(
    'INSERT INTO birth_records (name, birth_info, chart_data) VALUES (@name, @birth, @chart)',
    { name: name ?? null, birth: JSON.stringify(birth), chart: chartData ? JSON.stringify(chartData) : null },
  );
  return (await getRecord(result.lastInsertRowid!))!;
}

export async function getRecord(id: number): Promise<BirthRecord | null> {
  const a = getAdapter();
  const row = await a.get<Record<string, unknown>>('SELECT * FROM birth_records WHERE id = ?', { id });
  if (!row) return null;
  return {
    id: row['id'] as number,
    name: row['name'] as string | null,
    birthInfo: JSON.parse(row['birth_info'] as string),
    chartData: row['chart_data'] ? JSON.parse(row['chart_data'] as string) : null,
    createdAt: row['created_at'] as string,
    updatedAt: row['updated_at'] as string,
  };
}

export async function listRecords(): Promise<BirthRecord[]> {
  const a = getAdapter();
  const rows = await a.all<Record<string, unknown>>('SELECT * FROM birth_records ORDER BY updated_at DESC');
  return rows.map(row => ({
    id: row['id'] as number,
    name: row['name'] as string | null,
    birthInfo: JSON.parse(row['birth_info'] as string),
    chartData: row['chart_data'] ? JSON.parse(row['chart_data'] as string) : null,
    createdAt: row['created_at'] as string,
    updatedAt: row['updated_at'] as string,
  }));
}

export async function updateRecord(id: number, chartData: unknown): Promise<void> {
  const a = getAdapter();
  await a.execute(
    "UPDATE birth_records SET chart_data = ?, updated_at = datetime('now') WHERE id = ?",
    { chart: JSON.stringify(chartData), id },
  );
}

export async function deleteRecord(id: number): Promise<void> {
  const a = getAdapter();
  await a.execute('DELETE FROM birth_records WHERE id = ?', { id });
}

// ---- Analysis History ----

export interface AnalysisEntry {
  id: number;
  recordId: number;
  question: string;
  response: string;
  topic: string | null;
  createdAt: string;
}

export async function saveAnalysis(
  recordId: number,
  question: string,
  response: string,
  topic?: string,
): Promise<AnalysisEntry> {
  const a = getAdapter();
  const result = await a.execute(
    'INSERT INTO analysis_history (record_id, question, response, topic) VALUES (@rid, @q, @r, @t)',
    { rid: recordId, q: question, r: response, t: topic ?? null },
  );
  return (await getAnalysisEntry(result.lastInsertRowid!))!;
}

export async function getAnalysisEntry(id: number): Promise<AnalysisEntry | null> {
  const a = getAdapter();
  const row = await a.get<Record<string, unknown>>('SELECT * FROM analysis_history WHERE id = ?', { id });
  if (!row) return null;
  return {
    id: row['id'] as number,
    recordId: row['record_id'] as number,
    question: row['question'] as string,
    response: row['response'] as string,
    topic: row['topic'] as string | null,
    createdAt: row['created_at'] as string,
  };
}

export async function getHistory(recordId: number, limit = 50): Promise<AnalysisEntry[]> {
  const a = getAdapter();
  const rows = await a.all<Record<string, unknown>>(
    'SELECT * FROM analysis_history WHERE record_id = ? ORDER BY created_at DESC LIMIT ?',
    { recordId, limit },
  );
  return rows.map(row => ({
    id: row['id'] as number,
    recordId: row['record_id'] as number,
    question: row['question'] as string,
    response: row['response'] as string,
    topic: row['topic'] as string | null,
    createdAt: row['created_at'] as string,
  }));
}

export async function deleteAnalysisHistory(recordId: number): Promise<void> {
  const a = getAdapter();
  await a.execute('DELETE FROM analysis_history WHERE record_id = ?', { recordId });
}

// ---- Memory Snapshots ----

export interface MemorySnapshotRow {
  userId: string;
  version: number;
  snapshotData: string;
  createdAt: string;
  updatedAt: string;
}

export async function saveMemorySnapshot(userId: string, snapshotData: string): Promise<void> {
  const a = getAdapter();
  // Upsert: insert or update
  if (a.isRemote) {
    // libsql/Turso — use INSERT OR REPLACE
    await a.execute(
      `INSERT OR REPLACE INTO memory_snapshots (user_id, version, snapshot_data, created_at, updated_at)
       VALUES (@uid, 1, @data, datetime('now'), datetime('now'))`,
      { uid: userId, data: snapshotData },
    );
  } else {
    // better-sqlite3 — use ON CONFLICT
    await a.execute(
      `INSERT INTO memory_snapshots (user_id, version, snapshot_data, updated_at)
       VALUES (@uid, 1, @data, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET
         snapshot_data = excluded.snapshot_data,
         updated_at = datetime('now')`,
      { uid: userId, data: snapshotData },
    );
  }
}

export async function loadMemorySnapshot(userId: string): Promise<string | null> {
  const a = getAdapter();
  const row = await a.get<{ snapshot_data: string }>(
    'SELECT snapshot_data FROM memory_snapshots WHERE user_id = ?',
    { userId },
  );
  return row ? row.snapshot_data : null;
}

export async function deleteMemorySnapshot(userId: string): Promise<void> {
  const a = getAdapter();
  await a.execute('DELETE FROM memory_snapshots WHERE user_id = ?', { userId });
}

// ---- Sessions ----

export interface SessionRow {
  id: string;
  userId: string;
  birthInfo: string;
  createdAt: string;
  updatedAt: string;
}

export async function createSession(sessionId: string, userId: string, birth: BirthInfo): Promise<SessionRow> {
  const a = getAdapter();
  await a.execute(
    'INSERT INTO sessions (id, user_id, birth_info) VALUES (@id, @uid, @birth)',
    { id: sessionId, uid: userId, birth: JSON.stringify(birth) },
  );
  return (await getSession(sessionId))!;
}

export async function getSession(sessionId: string): Promise<SessionRow | null> {
  const a = getAdapter();
  const row = await a.get<Record<string, unknown>>('SELECT * FROM sessions WHERE id = ?', { sessionId });
  if (!row) return null;
  return {
    id: row['id'] as string,
    userId: row['user_id'] as string,
    birthInfo: row['birth_info'] as string,
    createdAt: row['created_at'] as string,
    updatedAt: row['updated_at'] as string,
  };
}

export async function listSessions(): Promise<SessionRow[]> {
  const a = getAdapter();
  const rows = await a.all<Record<string, unknown>>('SELECT * FROM sessions ORDER BY updated_at DESC');
  return rows.map(row => ({
    id: row['id'] as string,
    userId: row['user_id'] as string,
    birthInfo: row['birth_info'] as string,
    createdAt: row['created_at'] as string,
    updatedAt: row['updated_at'] as string,
  }));
}

export async function touchSession(sessionId: string): Promise<void> {
  const a = getAdapter();
  await a.execute("UPDATE sessions SET updated_at = datetime('now') WHERE id = ?", { sessionId });
}

export async function deleteSession(sessionId: string): Promise<void> {
  const a = getAdapter();
  await a.execute('DELETE FROM sessions WHERE id = ?', { sessionId });
}

// ---- Session Turns ----

export interface SessionTurnRow {
  id: number;
  sessionId: string;
  role: 'user' | 'agent';
  content: string;
  topic: string | null;
  timestamp: string;
}

export async function addSessionTurn(
  sessionId: string,
  role: 'user' | 'agent',
  content: string,
  topic?: string,
): Promise<SessionTurnRow> {
  const a = getAdapter();
  const timestamp = new Date().toISOString();
  const result = await a.execute(
    'INSERT INTO session_turns (session_id, role, content, topic, timestamp) VALUES (@sid, @role, @content, @topic, @ts)',
    { sid: sessionId, role, content, topic: topic ?? null, ts: timestamp },
  );
  // Fire-and-forget touch
  touchSession(sessionId).catch(() => {});
  return {
    id: result.lastInsertRowid!,
    sessionId,
    role,
    content,
    topic: topic ?? null,
    timestamp,
  };
}

export async function getSessionTurns(sessionId: string, limit = 100): Promise<SessionTurnRow[]> {
  const a = getAdapter();
  const rows = await a.all<Record<string, unknown>>(
    'SELECT * FROM session_turns WHERE session_id = ? ORDER BY id ASC LIMIT ?',
    { sessionId, limit },
  );
  return rows.map(row => ({
    id: row['id'] as number,
    sessionId: row['session_id'] as string,
    role: row['role'] as 'user' | 'agent',
    content: row['content'] as string,
    topic: row['topic'] as string | null,
    timestamp: row['timestamp'] as string,
  }));
}

export async function deleteSessionTurns(sessionId: string): Promise<void> {
  const a = getAdapter();
  await a.execute('DELETE FROM session_turns WHERE session_id = ?', { sessionId });
}

// ---- Message Feedback (Task 3: Thumbs Up/Down) ----

export interface FeedbackRow {
  id: number;
  sessionId: string;
  turnId: number | null;
  rating: 'up' | 'down';
  createdAt: string;
}

export async function saveFeedback(sessionId: string, rating: 'up' | 'down', turnId?: number): Promise<FeedbackRow> {
  const a = getAdapter();
  const result = await a.execute(
    'INSERT INTO message_feedback (session_id, turn_id, rating) VALUES (@sid, @tid, @rating)',
    { sid: sessionId, tid: turnId ?? null, rating },
  );
  return {
    id: result.lastInsertRowid!,
    sessionId,
    turnId: turnId ?? null,
    rating,
    createdAt: new Date().toISOString(),
  };
}

export async function getFeedback(sessionId: string): Promise<FeedbackRow[]> {
  const a = getAdapter();
  return a.all<Record<string, unknown>>(
    'SELECT * FROM message_feedback WHERE session_id = ? ORDER BY id DESC',
    { sessionId },
  ).then(rows => rows.map(row => ({
    id: row['id'] as number,
    sessionId: row['session_id'] as string,
    turnId: row['turn_id'] as number | null,
    rating: row['rating'] as 'up' | 'down',
    createdAt: row['created_at'] as string,
  })));
}

// ---- Utility ----

export function closeDb(): void {
  if (adapter) {
    adapter.close();
    adapter = undefined;
  }
}

/** Reset adapter (for testing). */
export function resetAdapter(): void {
  closeDb();
}

/** Initialize with a specific adapter (for testing). */
export function setAdapter(a: DatabaseAdapter): void {
  closeDb();
  adapter = a;
  initTables(a);
}
