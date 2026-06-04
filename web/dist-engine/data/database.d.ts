import type { BirthInfo } from '../core/astro/types.js';
export interface DatabaseAdapter {
    execute(sql: string, params?: Record<string, unknown>): Promise<{
        lastInsertRowid?: number;
        changes?: number;
    }>;
    get<T = Record<string, unknown>>(sql: string, params?: Record<string, unknown>): Promise<T | undefined>;
    all<T = Record<string, unknown>>(sql: string, params?: Record<string, unknown>): Promise<T[]>;
    close(): void;
    /** True if this is a remote database (Turso), used for decisions about synchronous ops. */
    readonly isRemote: boolean;
}
export interface BirthRecord {
    id: number;
    name: string | null;
    birthInfo: BirthInfo;
    chartData: unknown;
    createdAt: string;
    updatedAt: string;
}
export declare function saveRecord(birth: BirthInfo, chartData?: unknown, name?: string): Promise<BirthRecord>;
export declare function getRecord(id: number): Promise<BirthRecord | null>;
export declare function listRecords(): Promise<BirthRecord[]>;
export declare function updateRecord(id: number, chartData: unknown): Promise<void>;
export declare function deleteRecord(id: number): Promise<void>;
export interface AnalysisEntry {
    id: number;
    recordId: number;
    question: string;
    response: string;
    topic: string | null;
    createdAt: string;
}
export declare function saveAnalysis(recordId: number, question: string, response: string, topic?: string): Promise<AnalysisEntry>;
export declare function getAnalysisEntry(id: number): Promise<AnalysisEntry | null>;
export declare function getHistory(recordId: number, limit?: number): Promise<AnalysisEntry[]>;
export declare function deleteAnalysisHistory(recordId: number): Promise<void>;
export interface MemorySnapshotRow {
    userId: string;
    version: number;
    snapshotData: string;
    createdAt: string;
    updatedAt: string;
}
export declare function saveMemorySnapshot(userId: string, snapshotData: string): Promise<void>;
export declare function loadMemorySnapshot(userId: string): Promise<string | null>;
export declare function deleteMemorySnapshot(userId: string): Promise<void>;
export interface SessionRow {
    id: string;
    userId: string;
    birthInfo: string;
    createdAt: string;
    updatedAt: string;
}
export declare function createSession(sessionId: string, userId: string, birth: BirthInfo): Promise<SessionRow>;
export declare function getSession(sessionId: string): Promise<SessionRow | null>;
export declare function listSessions(): Promise<SessionRow[]>;
export declare function touchSession(sessionId: string): Promise<void>;
export declare function deleteSession(sessionId: string): Promise<void>;
export interface SessionTurnRow {
    id: number;
    sessionId: string;
    role: 'user' | 'agent';
    content: string;
    topic: string | null;
    timestamp: string;
}
export declare function addSessionTurn(sessionId: string, role: 'user' | 'agent', content: string, topic?: string): Promise<SessionTurnRow>;
export declare function getSessionTurns(sessionId: string, limit?: number): Promise<SessionTurnRow[]>;
export declare function deleteSessionTurns(sessionId: string): Promise<void>;
export interface FeedbackRow {
    id: number;
    sessionId: string;
    turnId: number | null;
    rating: 'up' | 'down';
    createdAt: string;
}
export declare function saveFeedback(sessionId: string, rating: 'up' | 'down', turnId?: number): Promise<FeedbackRow>;
export declare function getFeedback(sessionId: string): Promise<FeedbackRow[]>;
export declare function closeDb(): void;
/** Reset adapter (for testing). */
export declare function resetAdapter(): void;
/** Initialize with a specific adapter (for testing). */
export declare function setAdapter(a: DatabaseAdapter): void;
//# sourceMappingURL=database.d.ts.map