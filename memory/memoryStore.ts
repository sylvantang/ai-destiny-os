// ============================================================
// AI Destiny OS — Memory Layer: Storage Engine
// In-memory snapshot with optional SQLite persistence.
// Call enablePersistence() to auto-load/save from the database.
// ============================================================

import type {
  UserProfile, LifeEvent, Prediction, YearlyRecord,
  MemorySnapshot, MemoryStats, LifeDomain,
} from './types.js';
import type { DestinyChart } from '../core/astro/types.js';
import type { StrengthResult, StructureResult, ClimateResult, RelationResult } from '../core/destiny/index.js';
import type { FortuneResult } from '../core/destiny/fortuneEngine.js';
import { loadMemorySnapshot, saveMemorySnapshot } from '../data/database.js';

const CURRENT_VERSION = 1;

// ---- Defaults ----

function createDefaultProfile(id: string, birthInfo: UserProfile['birthInfo']): UserProfile {
  return {
    id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    birthInfo,
    chart: null,
    analysis: { strength: null, structure: null, climate: null, relations: null },
    tags: [],
    focusAreas: ['事业', '财富', '感情'],
  };
}

function createEmptySnapshot(user: UserProfile): MemorySnapshot {
  return {
    version: CURRENT_VERSION,
    user,
    events: [],
    yearlyRecords: {},
    predictions: [],
    stats: createEmptyStats(),
  };
}

function createEmptyStats(): MemoryStats {
  return {
    totalEvents: 0,
    totalPredictions: 0,
    verifiedPredictions: 0,
    averageAccuracy: 0,
    bestDomain: null,
    domainDistribution: { '事业': 0, '财富': 0, '感情': 0, '健康': 0, '学业': 0, '家庭': 0, '迁徙': 0, '其他': 0 },
    yearRange: null,
  };
}

// ---- Store Class ----

export class MemoryStore {
  private snapshot: MemorySnapshot;
  private dirty = false;
  private _persist = false;

  constructor(userId: string, birthInfo: UserProfile['birthInfo']) {
    const user = createDefaultProfile(userId, birthInfo);
    this.snapshot = createEmptySnapshot(user);
  }

  // ---- SQLite Persistence ----

  /**
   * Enable SQLite persistence for this store.
   * On first call, tries to load existing data from the database.
   * After enabling, every mutation auto-saves to the database (fire-and-forget).
   * Returns true if existing data was loaded, false if starting fresh.
   */
  async enablePersistence(): Promise<boolean> {
    if (this._persist) return false;
    this._persist = true;

    const userId = this.snapshot.user.id;
    const existing = await loadMemorySnapshot(userId);
    if (existing) {
      try {
        const loaded = JSON.parse(existing) as MemorySnapshot;
        this.snapshot = loaded;
        this.migrateIfNeeded();
        this.dirty = false;
        return true;
      } catch {
        // Corrupt data — start fresh
      }
    }
    // Save initial state (fire-and-forget)
    this.persist();
    return false;
  }

  /** Manually persist the current snapshot to SQLite (fire-and-forget). */
  persist(): void {
    if (!this._persist) return;
    const data = JSON.stringify(this.snapshot);
    saveMemorySnapshot(this.snapshot.user.id, data).catch(() => {
      // Best-effort persistence
    });
    this.dirty = false;
  }

  /** Load a store from SQLite. Returns null if no data exists for this user. */
  static async load(userId: string): Promise<MemoryStore | null> {
    const raw = await loadMemorySnapshot(userId);
    if (!raw) return null;
    try {
      const data = JSON.parse(raw) as MemorySnapshot;
      const store = new MemoryStore(data.user.id, data.user.birthInfo);
      store.snapshot = data;
      store.migrateIfNeeded();
      store._persist = true;
      return store;
    } catch {
      return null;
    }
  }

  /** Whether SQLite persistence is enabled. */
  isPersisted(): boolean { return this._persist; }

  // ---- Serialization (import/export) ----

  /** Serialize the full snapshot to JSON */
  toJSON(): string {
    return JSON.stringify(this.snapshot, null, 2);
  }

  /** Load from a JSON string (no DB interaction). */
  static fromJSON(json: string): MemoryStore {
    const raw = JSON.parse(json) as MemorySnapshot;
    const store = new MemoryStore(raw.user.id, raw.user.birthInfo);
    store.snapshot = raw;
    store.migrateIfNeeded();
    return store;
  }

  /** Check if there are unsaved in-memory changes. */
  isDirty(): boolean { return this.dirty; }

  /** Mark as saved (only relevant without persistence). */
  markClean(): void { this.dirty = false; }

  private touch(): void {
    this.dirty = true;
    this.snapshot.user.updatedAt = new Date().toISOString();
    if (this._persist) {
      this.persist();
    }
  }

  private migrateIfNeeded(): void {
    if (this.snapshot.version < CURRENT_VERSION) {
      this.snapshot.version = CURRENT_VERSION;
      this.touch();
    }
  }

  // ---- User Profile ----

  getUser(): UserProfile { return this.snapshot.user; }

  updateChart(chart: DestinyChart): void {
    this.snapshot.user.chart = chart;
    this.touch();
  }

  updateAnalysis(
    strength: StrengthResult,
    structure: StructureResult,
    climate: ClimateResult,
    relations: RelationResult,
  ): void {
    this.snapshot.user.analysis = { strength, structure, climate, relations };
    this.touch();
  }

  updateFocusAreas(areas: LifeDomain[]): void {
    this.snapshot.user.focusAreas = areas;
    this.touch();
  }

  addTag(tag: string): void {
    if (!this.snapshot.user.tags.includes(tag)) {
      this.snapshot.user.tags.push(tag);
      this.touch();
    }
  }

  // ---- Events ----

  addEvent(event: Omit<LifeEvent, 'id'>): LifeEvent {
    const id = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const full: LifeEvent = { ...event, id };
    this.snapshot.events.push(full);

    // Update yearly record
    const year = new Date(event.date).getFullYear();
    this.ensureYearlyRecord(year).events.push(full);

    this.recomputeStats();
    this.touch();
    return full;
  }

  getEvents(filter?: {
    domain?: LifeDomain;
    startYear?: number;
    endYear?: number;
    minImpact?: number;
  }): LifeEvent[] {
    let events = [...this.snapshot.events];

    if (filter?.domain) events = events.filter(e => e.domain === filter.domain);
    if (filter?.startYear) events = events.filter(e => new Date(e.date).getFullYear() >= filter.startYear!);
    if (filter?.endYear) events = events.filter(e => new Date(e.date).getFullYear() <= filter.endYear!);
    if (filter?.minImpact !== undefined) events = events.filter(e => Math.abs(e.impact) >= filter.minImpact!);

    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  getRecentEvents(count: number = 5): LifeEvent[] {
    return this.snapshot.events
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, count);
  }

  getTimeline(): LifeEvent[] {
    return [...this.snapshot.events].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }

  deleteEvent(id: string): boolean {
    const idx = this.snapshot.events.findIndex(e => e.id === id);
    if (idx === -1) return false;
    this.snapshot.events.splice(idx, 1);
    this.recomputeStats();
    this.touch();
    return true;
  }

  // ---- Predictions ----

  addPrediction(pred: Omit<Prediction, 'id'>): Prediction {
    const id = `pred_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const full: Prediction = { ...pred, id };
    this.snapshot.predictions.push(full);

    const yearRecord = this.ensureYearlyRecord(pred.targetYear);
    yearRecord.predictions.push(full);

    this.recomputeStats();
    this.touch();
    return full;
  }

  verifyPrediction(
    id: string,
    actualOutcome: string,
    accuracyRating: Prediction['accuracyRating'],
  ): Prediction | null {
    const pred = this.snapshot.predictions.find(p => p.id === id);
    if (!pred) return null;

    pred.verified = true;
    pred.actualOutcome = actualOutcome;
    pred.accuracyRating = accuracyRating;
    pred.verifiedAt = new Date().toISOString();

    this.recomputeStats();
    this.touch();
    return pred;
  }

  getUnverifiedPredictions(): Prediction[] {
    return this.snapshot.predictions.filter(p => !p.verified);
  }

  getPredictionsByYear(year: number): Prediction[] {
    return this.snapshot.predictions.filter(p => p.targetYear === year);
  }

  // ---- Yearly Records ----

  private ensureYearlyRecord(year: number): YearlyRecord {
    if (!this.snapshot.yearlyRecords[year]) {
      this.snapshot.yearlyRecords[year] = {
        year,
        fortune: null,
        events: [],
        predictions: [],
        overallRating: null,
        notes: '',
      };
    }
    return this.snapshot.yearlyRecords[year]!;
  }

  setYearlyFortune(year: number, fortune: FortuneResult['yearlyAnalysis'][number] | null): void {
    // Convert YearlyFortune from fortune engine to our YearlyRecord['fortune']
    const record = this.ensureYearlyRecord(year);
    if (fortune) {
      record.fortune = {
        year: fortune.year,
        career: fortune.career,
        wealth: fortune.wealth,
        relationship: fortune.relationship,
        health: fortune.health,
      } as YearlyRecord['fortune'];
    }
    this.touch();
  }

  setYearRating(year: number, rating: number): void {
    this.ensureYearlyRecord(year).overallRating = rating;
    this.touch();
  }

  setYearNotes(year: number, notes: string): void {
    this.ensureYearlyRecord(year).notes = notes;
    this.touch();
  }

  getYearlyRecord(year: number): YearlyRecord | null {
    return this.snapshot.yearlyRecords[year] ?? null;
  }

  getAllYearlyRecords(): YearlyRecord[] {
    return Object.values(this.snapshot.yearlyRecords).sort((a, b) => a.year - b.year);
  }

  // ---- Snapshot ----

  getSnapshot(): MemorySnapshot {
    return this.snapshot;
  }

  getStats(): MemoryStats {
    return this.snapshot.stats;
  }

  // ---- Stats ----

  private recomputeStats(): void {
    const events = this.snapshot.events;
    const predictions = this.snapshot.predictions;
    const verified = predictions.filter(p => p.verified);

    // Domain distribution
    const domainDist: Record<LifeDomain, number> = {
      '事业': 0, '财富': 0, '感情': 0, '健康': 0, '学业': 0, '家庭': 0, '迁徙': 0, '其他': 0,
    };
    for (const e of events) {
      domainDist[e.domain] = (domainDist[e.domain] || 0) + 1;
    }

    // Average accuracy
    const rated = verified.filter(p => p.accuracyRating !== null);
    const avgAccuracy = rated.length > 0
      ? rated.reduce((s, p) => s + (p.accuracyRating ?? 0), 0) / rated.length
      : 0;

    // Best domain
    let bestDomain: LifeDomain | null = null;
    let bestCount = 0;
    for (const [domain, count] of Object.entries(domainDist)) {
      if (count > bestCount) {
        bestCount = count;
        bestDomain = domain as LifeDomain;
      }
    }

    // Year range
    const years = events.map(e => new Date(e.date).getFullYear());
    const yearRange: [number, number] | null = years.length > 0
      ? [Math.min(...years), Math.max(...years)]
      : null;

    this.snapshot.stats = {
      totalEvents: events.length,
      totalPredictions: predictions.length,
      verifiedPredictions: verified.length,
      averageAccuracy: avgAccuracy,
      bestDomain,
      domainDistribution: domainDist,
      yearRange,
    };
  }
}
