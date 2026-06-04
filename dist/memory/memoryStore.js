// ============================================================
// AI Destiny OS — Memory Layer: Storage Engine
// In-memory snapshot with optional SQLite persistence.
// Call enablePersistence() to auto-load/save from the database.
// ============================================================
import { loadMemorySnapshot, saveMemorySnapshot } from '../data/database.js';
const CURRENT_VERSION = 1;
// ---- Defaults ----
function createDefaultProfile(id, birthInfo) {
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
function createEmptySnapshot(user) {
    return {
        version: CURRENT_VERSION,
        user,
        events: [],
        yearlyRecords: {},
        predictions: [],
        stats: createEmptyStats(),
    };
}
function createEmptyStats() {
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
    snapshot;
    dirty = false;
    _persist = false;
    constructor(userId, birthInfo) {
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
    async enablePersistence() {
        if (this._persist)
            return false;
        this._persist = true;
        const userId = this.snapshot.user.id;
        const existing = await loadMemorySnapshot(userId);
        if (existing) {
            try {
                const loaded = JSON.parse(existing);
                this.snapshot = loaded;
                this.migrateIfNeeded();
                this.dirty = false;
                return true;
            }
            catch {
                // Corrupt data — start fresh
            }
        }
        // Save initial state (fire-and-forget)
        this.persist();
        return false;
    }
    /** Manually persist the current snapshot to SQLite (fire-and-forget). */
    persist() {
        if (!this._persist)
            return;
        const data = JSON.stringify(this.snapshot);
        saveMemorySnapshot(this.snapshot.user.id, data).catch(() => {
            // Best-effort persistence
        });
        this.dirty = false;
    }
    /** Load a store from SQLite. Returns null if no data exists for this user. */
    static async load(userId) {
        const raw = await loadMemorySnapshot(userId);
        if (!raw)
            return null;
        try {
            const data = JSON.parse(raw);
            const store = new MemoryStore(data.user.id, data.user.birthInfo);
            store.snapshot = data;
            store.migrateIfNeeded();
            store._persist = true;
            return store;
        }
        catch {
            return null;
        }
    }
    /** Whether SQLite persistence is enabled. */
    isPersisted() { return this._persist; }
    // ---- Serialization (import/export) ----
    /** Serialize the full snapshot to JSON */
    toJSON() {
        return JSON.stringify(this.snapshot, null, 2);
    }
    /** Load from a JSON string (no DB interaction). */
    static fromJSON(json) {
        const raw = JSON.parse(json);
        const store = new MemoryStore(raw.user.id, raw.user.birthInfo);
        store.snapshot = raw;
        store.migrateIfNeeded();
        return store;
    }
    /** Check if there are unsaved in-memory changes. */
    isDirty() { return this.dirty; }
    /** Mark as saved (only relevant without persistence). */
    markClean() { this.dirty = false; }
    touch() {
        this.dirty = true;
        this.snapshot.user.updatedAt = new Date().toISOString();
        if (this._persist) {
            this.persist();
        }
    }
    migrateIfNeeded() {
        if (this.snapshot.version < CURRENT_VERSION) {
            this.snapshot.version = CURRENT_VERSION;
            this.touch();
        }
    }
    // ---- User Profile ----
    getUser() { return this.snapshot.user; }
    updateChart(chart) {
        this.snapshot.user.chart = chart;
        this.touch();
    }
    updateAnalysis(strength, structure, climate, relations) {
        this.snapshot.user.analysis = { strength, structure, climate, relations };
        this.touch();
    }
    updateFocusAreas(areas) {
        this.snapshot.user.focusAreas = areas;
        this.touch();
    }
    addTag(tag) {
        if (!this.snapshot.user.tags.includes(tag)) {
            this.snapshot.user.tags.push(tag);
            this.touch();
        }
    }
    // ---- Events ----
    addEvent(event) {
        const id = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const full = { ...event, id };
        this.snapshot.events.push(full);
        // Update yearly record
        const year = new Date(event.date).getFullYear();
        this.ensureYearlyRecord(year).events.push(full);
        this.recomputeStats();
        this.touch();
        return full;
    }
    getEvents(filter) {
        let events = [...this.snapshot.events];
        if (filter?.domain)
            events = events.filter(e => e.domain === filter.domain);
        if (filter?.startYear)
            events = events.filter(e => new Date(e.date).getFullYear() >= filter.startYear);
        if (filter?.endYear)
            events = events.filter(e => new Date(e.date).getFullYear() <= filter.endYear);
        if (filter?.minImpact !== undefined)
            events = events.filter(e => Math.abs(e.impact) >= filter.minImpact);
        return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    getRecentEvents(count = 5) {
        return this.snapshot.events
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, count);
    }
    getTimeline() {
        return [...this.snapshot.events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
    deleteEvent(id) {
        const idx = this.snapshot.events.findIndex(e => e.id === id);
        if (idx === -1)
            return false;
        this.snapshot.events.splice(idx, 1);
        this.recomputeStats();
        this.touch();
        return true;
    }
    // ---- Predictions ----
    addPrediction(pred) {
        const id = `pred_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const full = { ...pred, id };
        this.snapshot.predictions.push(full);
        const yearRecord = this.ensureYearlyRecord(pred.targetYear);
        yearRecord.predictions.push(full);
        this.recomputeStats();
        this.touch();
        return full;
    }
    verifyPrediction(id, actualOutcome, accuracyRating) {
        const pred = this.snapshot.predictions.find(p => p.id === id);
        if (!pred)
            return null;
        pred.verified = true;
        pred.actualOutcome = actualOutcome;
        pred.accuracyRating = accuracyRating;
        pred.verifiedAt = new Date().toISOString();
        this.recomputeStats();
        this.touch();
        return pred;
    }
    getUnverifiedPredictions() {
        return this.snapshot.predictions.filter(p => !p.verified);
    }
    getPredictionsByYear(year) {
        return this.snapshot.predictions.filter(p => p.targetYear === year);
    }
    // ---- Yearly Records ----
    ensureYearlyRecord(year) {
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
        return this.snapshot.yearlyRecords[year];
    }
    setYearlyFortune(year, fortune) {
        // Convert YearlyFortune from fortune engine to our YearlyRecord['fortune']
        const record = this.ensureYearlyRecord(year);
        if (fortune) {
            record.fortune = {
                year: fortune.year,
                career: fortune.career,
                wealth: fortune.wealth,
                relationship: fortune.relationship,
                health: fortune.health,
            };
        }
        this.touch();
    }
    setYearRating(year, rating) {
        this.ensureYearlyRecord(year).overallRating = rating;
        this.touch();
    }
    setYearNotes(year, notes) {
        this.ensureYearlyRecord(year).notes = notes;
        this.touch();
    }
    getYearlyRecord(year) {
        return this.snapshot.yearlyRecords[year] ?? null;
    }
    getAllYearlyRecords() {
        return Object.values(this.snapshot.yearlyRecords).sort((a, b) => a.year - b.year);
    }
    // ---- Snapshot ----
    getSnapshot() {
        return this.snapshot;
    }
    getStats() {
        return this.snapshot.stats;
    }
    // ---- Stats ----
    recomputeStats() {
        const events = this.snapshot.events;
        const predictions = this.snapshot.predictions;
        const verified = predictions.filter(p => p.verified);
        // Domain distribution
        const domainDist = {
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
        let bestDomain = null;
        let bestCount = 0;
        for (const [domain, count] of Object.entries(domainDist)) {
            if (count > bestCount) {
                bestCount = count;
                bestDomain = domain;
            }
        }
        // Year range
        const years = events.map(e => new Date(e.date).getFullYear());
        const yearRange = years.length > 0
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
//# sourceMappingURL=memoryStore.js.map