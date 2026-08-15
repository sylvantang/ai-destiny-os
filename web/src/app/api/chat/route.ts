import { streamText } from 'ai';
import { getModel, PROVIDER_MODELS, type Provider } from '@/lib/ai/model-router';
import { retrieveAncientTexts, formatRAGContext } from '@/lib/rag/ancient-texts';

const DEFAULT_SYSTEM = `你是专业八字命理师。严格依据《穷通宝鉴》《滴天髓》《三命通会》《渊海子平》原文解读。引用格式：《来源》"原文片段"。`;

export async function POST(req: Request) {
  try {
    const body = await req.json() as Record<string, unknown>;
    const messages = body.messages as { role: string; content: string }[];
    const userConfig = body.userConfig as Record<string, unknown> | undefined;
    if (!messages?.length) return new Response(JSON.stringify({ error: 'Missing messages' }), { status: 400 });

    const lastUser = [...messages].reverse().find((m) => m.role === 'user')?.content || '';
    const chartCtx = messages.find((m) => m.role === 'system' && m.content.includes('日主'))?.content || '';
    const refs = retrieveAncientTexts(lastUser, 5);

    const provider = (userConfig?.provider as Provider) || 'deepseek';
    const model = (userConfig?.model as string) || 'deepseek-chat';
    const apiKey = (userConfig?.apiKey as string) || process.env.DEEPSEEK_API_KEY || '';
    const baseURL = userConfig?.baseURL as string | undefined;
    const temperature = Number(userConfig?.temperature ?? 0.7);

    const system = `${(userConfig?.systemPrompt as string) || DEFAULT_SYSTEM}\n\n【古籍参考】\n${formatRAGContext(refs)}\n\n【命盘】\n${chartCtx}`;

    const result = streamText({
      model: getModel(provider, model, apiKey, baseURL),
      system,
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
