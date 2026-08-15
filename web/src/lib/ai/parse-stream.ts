// ============================================================
// AI Destiny OS — AI SDK v4 data stream consumer.
// Wire format (x-vercel-ai-data-stream: v1, text/plain):
// newline-delimited chunks "<type>:<json>" where
//   '0' = text chunk (JSON-encoded string)
//   '3' = error chunk
//   'e' = message finish (finishReason)
//   'f' = message metadata (messageId), 'd' = step finish, others ignored.
// ============================================================

export interface StreamSink {
  onText?: (delta: string) => void;
  onError?: () => void;
  onFinish?: () => void;
}

export interface StreamOutcome {
  hadError: boolean;
  finished: boolean;
}

function handleLine(line: string, sink: StreamSink): 'text' | 'error' | 'finish' | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const sep = trimmed.indexOf(':');
  if (sep <= 0 || sep >= trimmed.length - 1) return null;

  const type = trimmed.charAt(0);
  const payload = trimmed.slice(sep + 1);

  if (type === '0') {
    try {
      const delta = JSON.parse(payload) as string;
      if (typeof delta === 'string') {
        sink.onText?.(delta);
        return 'text';
      }
    } catch {
      /* skip malformed chunk */
    }
    return null;
  }

  if (type === '3') {
    sink.onError?.();
    return 'error';
  }

  if (type === 'e') {
    sink.onFinish?.();
    return 'finish';
  }

  return null;
}

export async function consumeDataStream(
  body: ReadableStream<Uint8Array>,
  sink: StreamSink,
): Promise<StreamOutcome> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let hadError = false;
  let finished = false;

  const process = (line: string): void => {
    const kind = handleLine(line, sink);
    if (kind === 'error') hadError = true;
    if (kind === 'finish') finished = true;
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx = buffer.indexOf('\n');
    while (idx !== -1) {
      const line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      process(line);
      idx = buffer.indexOf('\n');
    }
  }

  // Flush trailing chunk (stream may end without a final newline).
  if (buffer.trim()) process(buffer);

  return { hadError, finished };
}
