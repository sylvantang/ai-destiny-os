// ============================================================
// AI Destiny OS — RAG: ancient classics retrieval (MiniSearch).
// Chinese tokenization: character bigrams + single characters,
// plus latin words. Export signatures unchanged; reindex() added.
// ============================================================

import MiniSearch from 'minisearch';
import ancientTexts from '../../../data/ancient-texts.json';

export interface AncientRef {
  source: string;
  chapter: string;
  content: string;
  tags: string[];
}

interface AncientDoc extends AncientRef {
  id: string;
}

const docs = ancientTexts as AncientRef[];

/** Chinese bigrams + single chars + latin words, space-separated. */
function tokenize(text: string): string[] {
  const tokens: string[] = [];

  const cjk = text.match(/[\u4e00-\u9fff]+/g) ?? [];
  for (const seg of cjk) {
    if (seg.length === 1) {
      tokens.push(seg);
    } else {
      for (let i = 0; i < seg.length - 1; i++) tokens.push(seg.slice(i, i + 2));
      for (const ch of seg) tokens.push(ch);
    }
  }

  const latin = text.match(/[a-z0-9]+/gi) ?? [];
  for (const w of latin) tokens.push(w.toLowerCase());

  return tokens;
}

let miniSearch: MiniSearch<AncientDoc> | null = null;

export function reindex(): void {
  miniSearch = new MiniSearch<AncientDoc>({
    fields: ['content', 'chapter', 'source'],
    storeFields: ['source', 'chapter', 'content', 'tags'],
    tokenize,
    searchOptions: {
      prefix: true,
      fuzzy: 0.2,
      boost: { content: 2 },
    },
  });
  miniSearch.addAll(
    docs.map((d, i) => ({ ...d, id: `ancient-${i}` })),
  );
}

reindex();

export function retrieveAncientTexts(query: string, topK = 5): AncientRef[] {
  let ms = miniSearch;
  if (!ms) {
    reindex();
    ms = miniSearch;
  }
  if (!ms) return [];
  const results = ms.search(query, { prefix: true, fuzzy: 0.2 });
  return results.slice(0, topK).map((r) => ({
    source: r.source,
    chapter: r.chapter,
    content: r.content,
    tags: r.tags,
  }));
}

export function formatRAGContext(refs: AncientRef[]): string {
  return refs.map((r) => `[${r.source}·${r.chapter}] ${r.content}`).join('\n\n');
}
