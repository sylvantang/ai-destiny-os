# AI Destiny OS

Professional BaZi (八字 / Four Pillars) analysis platform in TypeScript. Combines traditional Chinese astrology with AI-powered natural language analysis.

## Architecture (6 Layers)

```
demo-ask.ts / repl.ts         ← Entry points
        ↓
agent/                         ← Agent Layer: orchestration, LLM client, conversation
        ↓
ai/                            ← AI Layer: personality, career, relationship, strategy, prompts
        ↓
memory/                        ← Memory Layer: event tracking, predictions, context building
        ↓
visualization/                 ← Visualization: chart, dashboard, fortune timeline, ANSI color
        ↓
core/destiny/                  ← Destiny Engine: strength, structure, climate, relations, fortune
        ↓
core/astro/                    ← Astro Engine: BaZi, DaYun, LiuNian, Jieqi, True Solar Time
```

## Setup

```bash
npm install
```

## Usage

### Interactive REPL

```bash
npm run repl
# Or with custom birth info:
DESTINY_BIRTH="1985,6,15,14,30,121.5,0,男" npm run repl
```

The DESTINY_BIRTH format: `year,month,day,hour,minute,longitude,isDST,gender`

### One-shot query

```bash
npx tsx demo-ask.ts "我适合创业还是打工？"
```

### Commands (REPL)

| Command | Description |
|---------|-------------|
| `/chart` | Show Four Pillars chart |
| `/dashboard` | Show Destiny Cockpit |
| `/history` | View conversation history |
| `/save [name]` | Save current session |
| `/load <name>` | Load a saved session |
| `/sessions` | List all saved sessions |
| `/clear` | Clear conversation history |
| `/birth` | Show current birth info |
| `/help` | Show help |
| `/exit` | Exit (auto-saves) |

## Configuration

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `ANTHROPIC_AUTH_TOKEN` | Alternative auth token (DeepSeek compat) |
| `ANTHROPIC_MODEL` | Model name (default: `claude-sonnet-4-6`) |
| `ANTHROPIC_BASE_URL` | Custom API base URL |
| `DESTINY_BIRTH` | Birth info for REPL (see format above) |

Supports both Anthropic and OpenAI APIs. Auto-detects from available environment variables.

## Testing

```bash
npm test         # Run all tests
npm run test:watch  # Watch mode
npm run typecheck    # TypeScript strict check
```

## Tech Stack

- **TypeScript** strict mode, ES modules
- **Vitest** for testing (119 tests)
- **Zero runtime dependencies** — LLM calls via native `fetch`
- **ANSI colors** for terminal rendering
