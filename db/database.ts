// ============================================================
// AI Destiny OS — Database Layer (SQLite via better-sqlite3)
// Stores birth records and analysis history locally.
// ============================================================

import Database from 'better-sqlite3';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { mkdirSync, existsSync } from 'node:fs';
import type { BirthInfo } from '../core/astro/types.js';

const DATA_DIR = join(homedir(), '.ai-destiny-os');
const DB_PATH = join(DATA_DIR, 'destiny.db');

let db: Database.Database;

function getDb(): Database.Database {
  if (!db) {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initTables(db);
  }
  return db;
}

function initTables(database: Database.Database): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS birth_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      birth_info TEXT NOT NULL,
      chart_data TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS analysis_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      record_id INTEGER NOT NULL,
      question TEXT NOT NULL,
      response TEXT NOT NULL,
      topic TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (record_id) REFERENCES birth_records(id) ON DELETE CASCADE
    );
  `);
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

export function saveRecord(birth: BirthInfo, chartData?: unknown, name?: string): BirthRecord {
  const d = getDb();
  const stmt = d.prepare(
    'INSERT INTO birth_records (name, birth_info, chart_data) VALUES (@name, @birth, @chart)',
  );
  const result = stmt.run({
    name: name ?? null,
    birth: JSON.stringify(birth),
    chart: chartData ? JSON.stringify(chartData) : null,
  });
  return getRecord(result.lastInsertRowid as number)!;
}

export function getRecord(id: number): BirthRecord | null {
  const d = getDb();
  const row = d.prepare('SELECT * FROM birth_records WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
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

export function listRecords(): BirthRecord[] {
  const d = getDb();
  const rows = d.prepare('SELECT * FROM birth_records ORDER BY updated_at DESC').all() as Array<
    Record<string, unknown>
  >;
  return rows.map(row => ({
    id: row['id'] as number,
    name: row['name'] as string | null,
    birthInfo: JSON.parse(row['birth_info'] as string),
    chartData: row['chart_data'] ? JSON.parse(row['chart_data'] as string) : null,
    createdAt: row['created_at'] as string,
    updatedAt: row['updated_at'] as string,
  }));
}

export function updateRecord(id: number, chartData: unknown): void {
  const d = getDb();
  d.prepare(
    "UPDATE birth_records SET chart_data = ?, updated_at = datetime('now') WHERE id = ?",
  ).run(JSON.stringify(chartData), id);
}

export function deleteRecord(id: number): void {
  const d = getDb();
  d.prepare('DELETE FROM birth_records WHERE id = ?').run(id);
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

export function saveAnalysis(
  recordId: number,
  question: string,
  response: string,
  topic?: string,
): AnalysisEntry {
  const d = getDb();
  const stmt = d.prepare(
    'INSERT INTO analysis_history (record_id, question, response, topic) VALUES (@rid, @q, @r, @t)',
  );
  const result = stmt.run({
    rid: recordId,
    q: question,
    r: response,
    t: topic ?? null,
  });
  return getAnalysisEntry(result.lastInsertRowid as number)!;
}

export function getAnalysisEntry(id: number): AnalysisEntry | null {
  const d = getDb();
  const row = d.prepare('SELECT * FROM analysis_history WHERE id = ?').get(id) as
    | Record<string, unknown>
    | undefined;
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

export function getHistory(recordId: number, limit = 50): AnalysisEntry[] {
  const d = getDb();
  const rows = d
    .prepare('SELECT * FROM analysis_history WHERE record_id = ? ORDER BY created_at DESC LIMIT ?')
    .all(recordId, limit) as Array<Record<string, unknown>>;
  return rows.map(row => ({
    id: row['id'] as number,
    recordId: row['record_id'] as number,
    question: row['question'] as string,
    response: row['response'] as string,
    topic: row['topic'] as string | null,
    createdAt: row['created_at'] as string,
  }));
}

export function deleteAnalysisHistory(recordId: number): void {
  const d = getDb();
  d.prepare('DELETE FROM analysis_history WHERE record_id = ?').run(recordId);
}

// ---- Utility ----

export function closeDb(): void {
  if (db) {
    db.close();
    db = undefined!;
  }
}
