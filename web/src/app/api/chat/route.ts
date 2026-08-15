import { streamText } from 'ai';
import { getModel, PROVIDER_MODELS, type Provider } from '@/lib/ai/model-router';
import { retrieveAncientTexts, formatRAGContext } from '@/lib/rag/ancient-texts';
import { computeUnifiedBazi } from '@/lib/bazi/engine-adapter';
import { applyReasoningRules, type RuleResult } from '@/lib/reasoning/rules';
import { buildBaziSystemPrompt } from '@/lib/prompts/bazi-system';

const DEFAULT_SYSTEM = `你是专业八字命理师。严格依据《穷通宝鉴》《滴天髓》《三命通会》《渊海子平》原文解读。引用格式：《来源》"原文片段"。`;

export async function POST(req: Request) {
  try {
    const body = await req.json() as Record<string, unknown>;
    const messages = body.messages as { role: string; content: string }[];
    const userConfig = body.userConfig as Record<string, unknown> | undefined;
    const birth = body.birth as Record<string, unknown> | undefined;
    if (!messages?.length) return new Response(JSON.stringify({ error: 'Missing messages' }), { status: 400 });

    const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
    const chartCtx = messages.find((m) => m.role === 'system' && m.content.includes('日主'))?.content || '';

    // RAG retrieval
    const refs = retrieveAncientTexts(lastUser, 5);
    const ragContext = formatRAGContext(refs);

    // Server-side chart computation + structured reasoning (best-effort)
    let system: string | null = null;
    if (birth) {
      try {
        const unified = await computeUnifiedBazi({
          year: Number(birth.year),
          month: Number(birth.month),
          day: Number(birth.day),
          hour: Number(birth.hour),
          minute: Number(birth.minute ?? 0),
          gender: String(birth.gender ?? '男'),
          longitude: Number(birth.longitude ?? 116.4),
          latitude: Number(birth.latitude ?? 39.9),
        });

        const chartLike = {
          chart: unified.chart,
          strength: unified.strength,
          structure: unified.structure,
          yongShen: unified.yongShen,
          climate: unified.climate,
          fortune: { lifePeriods: unified.fortune.lifePeriods },
        };
        const ruleResults: RuleResult[] = applyReasoningRules(chartLike);
        system = buildBaziSystemPrompt(chartLike, ruleResults, lastUser);
      } catch {
        /* fall back to legacy prompt */
      }
    }

    if (!system) {
      system = `${(userConfig?.systemPrompt as string) || DEFAULT_SYSTEM}\n\n【命盘】\n${chartCtx}`;
    }

    // Model config
    const provider = (userConfig?.provider as Provider) || 'deepseek';
    const model = (userConfig?.model as string) || 'deepseek-chat';
    const apiKey = (userConfig?.apiKey as string) || process.env.DEEPSEEK_API_KEY || '';
    const baseURL = userConfig?.baseURL as string | undefined;
    const temperature = Number(userConfig?.temperature ?? 0.7);

    const finalSystem = `${system}\n\n【古籍参考（RAG 检索）】\n${ragContext}\n\n请严格依据古籍原文解读，引用格式：《来源》"原文"。`;

    const result = streamText({
      model: getModel(provider, model, apiKey, baseURL),
      system: finalSystem,
      messages: messages.map((m) => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content })),
      temperature,
      maxTokens: 4000
    });
    return result.toDataStreamResponse();
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }), { status: 500 });
  }
}

export async function GET(req: Request) {
  const provider = new URL(req.url).searchParams.get('provider') as Provider;
  return Response.json({ models: PROVIDER_MODELS[provider] || [] });
}
