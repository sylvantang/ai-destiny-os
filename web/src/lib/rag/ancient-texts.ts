// ============================================================
// AI Destiny OS — RAG: ancient classics retrieval.
// ============================================================

import ancientTexts from '../../../data/ancient-texts.json';

export interface AncientRef { source: string; chapter: string; content: string; tags: string[]; }

const corpus = ancientTexts as AncientRef[];

function simpleBM25Score(query: string, doc: string): number {
  const terms = query.split(/\s+/).filter(Boolean);
  let score = 0;
  for (const t of terms) {
    const idx = doc.indexOf(t);
    if (idx !== -1) score += 1 + (doc.length - idx) / doc.length;
  }
  return score;
}

export function retrieveAncientTexts(query: string, topK = 5): AncientRef[] {
  const scored = corpus.map((ref, i) => ({ i, s: simpleBM25Score(query, ref.content) }));
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, topK).map((x) => corpus[x.i]);
}

export function formatRAGContext(refs: AncientRef[]): string {
  return refs.map((r) => `[${r.source}·${r.chapter}] ${r.content}`).join('\n\n');
}
