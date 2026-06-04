import type { UserProfile, LifeEvent, Prediction, YearlyRecord, MemorySnapshot, MemoryStats, LifeDomain } from './types.js';
import type { DestinyChart } from '../core/astro/types.js';
import type { StrengthResult, StructureResult, ClimateResult, RelationResult } from '../core/destiny/index.js';
import type { FortuneResult } from '../core/destiny/fortuneEngine.js';
export declare class MemoryStore {
    private snapshot;
    private dirty;
    private _persist;
    constructor(userId: string, birthInfo: UserProfile['birthInfo']);
    /**
     * Enable SQLite persistence for this store.
     * On first call, tries to load existing data from the database.
     * After enabling, every mutation auto-saves to the database (fire-and-forget).
     * Returns true if existing data was loaded, false if starting fresh.
     */
    enablePersistence(): Promise<boolean>;
    /** Manually persist the current snapshot to SQLite (fire-and-forget). */
    persist(): void;
    /** Load a store from SQLite. Returns null if no data exists for this user. */
    static load(userId: string): Promise<MemoryStore | null>;
    /** Whether SQLite persistence is enabled. */
    isPersisted(): boolean;
    /** Serialize the full snapshot to JSON */
    toJSON(): string;
    /** Load from a JSON string (no DB interaction). */
    static fromJSON(json: string): MemoryStore;
    /** Check if there are unsaved in-memory changes. */
    isDirty(): boolean;
    /** Mark as saved (only relevant without persistence). */
    markClean(): void;
    private touch;
    private migrateIfNeeded;
    getUser(): UserProfile;
    updateChart(chart: DestinyChart): void;
    updateAnalysis(strength: StrengthResult, structure: StructureResult, climate: ClimateResult, relations: RelationResult): void;
    updateFocusAreas(areas: LifeDomain[]): void;
    addTag(tag: string): void;
    addEvent(event: Omit<LifeEvent, 'id'>): LifeEvent;
    getEvents(filter?: {
        domain?: LifeDomain;
        startYear?: number;
        endYear?: number;
        minImpact?: number;
    }): LifeEvent[];
    getRecentEvents(count?: number): LifeEvent[];
    getTimeline(): LifeEvent[];
    deleteEvent(id: string): boolean;
    addPrediction(pred: Omit<Prediction, 'id'>): Prediction;
    verifyPrediction(id: string, actualOutcome: string, accuracyRating: Prediction['accuracyRating']): Prediction | null;
    getUnverifiedPredictions(): Prediction[];
    getPredictionsByYear(year: number): Prediction[];
    private ensureYearlyRecord;
    setYearlyFortune(year: number, fortune: FortuneResult['yearlyAnalysis'][number] | null): void;
    setYearRating(year: number, rating: number): void;
    setYearNotes(year: number, notes: string): void;
    getYearlyRecord(year: number): YearlyRecord | null;
    getAllYearlyRecords(): YearlyRecord[];
    getSnapshot(): MemorySnapshot;
    getStats(): MemoryStats;
    private recomputeStats;
}
//# sourceMappingURL=memoryStore.d.ts.map