// ============================================================
// AI Destiny OS — Destiny Engine: Public API
// ============================================================

export type {
  StrengthResult,
  StrengthLevel,
} from './strengthEngine.js';
export { analyzeStrength } from './strengthEngine.js';

export type {
  StructureResult,
  PatternType,
} from './structureEngine.js';
export { analyzeStructure } from './structureEngine.js';

export type { ClimateResult } from './climateEngine.js';
export { analyzeClimate } from './climateEngine.js';

export type {
  RelationResult,
  NamedRelation,
} from './relationEngine.js';
export { analyzeRelations } from './relationEngine.js';

export type {
  FortuneResult,
  FortuneAssessment,
  YearlyFortune,
  LifePeriod,
} from './fortuneEngine.js';
export { analyzeFortune } from './fortuneEngine.js';
export type {
  YongShenResult,
  YongShenDetail,
  WuxingDetail,
} from './yongShenEngine.js';
export { deriveYongShen } from './yongShenEngine.js';
