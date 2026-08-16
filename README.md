# AI Destiny OS

专业八字（BaZi / Four Pillars）分析平台 —— TypeScript 实现，**排盘完全由确定性天文引擎完成，LLM 只负责解读**。

## ✨ 核心亮点

### 🎯 自有引擎精度（core/astro）
- **节气**：寿星天文历 VSOP87 截断级数 + 章动 + 光行差 + ΔT 修正，24 节气时刻与紫金山天文台公布值误差 **20 秒以内**（立春 2024/2025/2026 实测 +19s/+20s/+22s）
- **真太阳时**：Equation of Time 按时刻计算（Meeus Ch.28，秒级）+ 经度校正（4 分钟/度）
- **海外支持**：`BirthInfo.standardMeridian` 自定义钟表标准子午线（默认 120°E 北京时间），纽约/伦敦/悉尼等经度已纳入黄金测试
- **边界 bug 修复**：凌晨出生日柱错一天、中国 1986–1991 夏令时双重修正、机器时区依赖 —— 全部改为显式 UTC+8 纪元运算，任何时区的机器结果一致

### ✅ 黄金测试
- `core/astro/__tests__/golden.test.ts`：32 例（立春前后翻转、早/晚子时、时辰边界、北京/上海/成都/乌鲁木齐/纽约/伦敦/悉尼、夏令时、1900 基准、经典命例）
- 参考值经 shunshi-bazi-core（tyme4ts）独立交叉验证，节气时刻与官方公布值对照
- 全仓 **303 个测试** 全绿，TypeScript `strict` + `noUncheckedIndexedAccess`

### 🔌 MCP Server（packages/bazi-mcp，计划发布为 @sylvantang/bazi-mcp）
- 四个工具：`get_bazi_chart`（四柱/十神/藏干/纳音/五行统计/刑冲合害/大运/真太阳时）、`get_dayun_timeline`、`get_relations`、`get_huangli`
- 主路径完全走自有 core/astro 引擎；esbuild 打包为单文件（60KB），零新增运行时依赖

### 🧠 Memory 主动预警
- `addEventWithContext`：记录结婚/换工作/搬家等人生事件，自动填充流年干支、当时大运与事件年龄
- `checkLifeAlerts`：流年冲日支/冲年支、伏吟、合日支、七杀压力、比劫争财等确定性预警
- REPL 命令：`/event`、`/events`、`/alerts`

## 🔍 与常见「AI 算命」的区别

| | 常见 AI 算命 | AI Destiny OS |
|---|---|---|
| 排盘 | LLM 直接"算"（易幻觉、不可复现） | **core/astro 纯函数式天文计算**，可复现、可测试 |
| 大模型角色 | 兼做计算与解读 | **只接收结构化 JSON 做解读**，绝不参与干支/节气/大运计算 |
| 可审计性 | 黑盒 | 纯 TS 源码 + 公式出处注释（Meeus Ch.25/28、寿星 VSOP87 系数表） |
| 验证 | 无 | 黄金测试 + 与第三方引擎交叉验证 |

## 🏗 架构（6 层）

```
demo-ask.ts / repl.ts         ← 入口
        ↓
agent/                         ← Agent 层：编排、LLM 客户端、对话（只消费命盘 JSON）
        ↓
ai/                            ← AI 层：性格/事业/感情/策略分析与提示词
        ↓
memory/                        ← Memory 层：事件上下文、流年预警、预测追踪
        ↓
visualization/                 ← 可视化：命盘、驾驶舱、大运时间线、ANSI 渲染
        ↓
core/destiny/                  ← 命理引擎：旺衰、格局、调候、用神、运势
        ↓
core/astro/                    ← 天文引擎：四柱、大运、流年、节气、真太阳时
```

另含：`web/`（Next.js 排盘/聊天/合盘）、`packages/bazi-mcp/`（MCP 服务）、`scripts/`（引擎 parity 测试等）。

## 🚀 快速开始

需要 Node.js 18+。

```bash
git clone https://github.com/sylvantang/ai-destiny-os.git
cd ai-destiny-os
npm install

npm test               # 303 个测试
npx tsx repl.ts        # 命理对话终端（离线可用确定性摘要）
```

REPL 自定义出生信息：

```bash
DESTINY_BIRTH="1985,6,15,14,30,121.5,0,男" npm run repl
# 格式：年,月,日,时,分,经度,isDST(0/1),性别
```

Web 界面（排盘即开即用）：

```bash
cd web && npm install && npm run dev
# http://localhost:3000
# 聊天需 DEEPSEEK_API_KEY，或点击页面右上角齿轮配置任意供应商
```

MCP Server：

```bash
cd packages/bazi-mcp && npm install && npm run build
printf '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}\n' | node dist/index.js
```

Claude Desktop 配置（当前用本地路径；计划发布为 @sylvantang/bazi-mcp，发布后可直接 `npx @sylvantang/bazi-mcp`）：

```json
{
  "mcpServers": {
    "bazi": {
      "command": "node",
      "args": ["/你的路径/ai-destiny-os/packages/bazi-mcp/dist/index.js"]
    }
  }
}
```

## 📜 排盘约定（与其他引擎不同处，特此声明）

1. **晚子时不换日**：23:00–23:59 出生，日柱取当日干支（本引擎约定；部分引擎如 shunshi 默认 sect=1 会换次日）。
2. **年/月柱边界**：出生钟表时刻（UTC+8，夏令时先扣 1 小时）与交节时刻（北京时间）直接比较，不做真太阳时二次换算。
3. **标准子午线**：默认 120°E（北京时间）。海外出生请传 `standardMeridian`（如纽约 -75、伦敦 0、悉尼 150）。
4. **起运年龄**：实岁（出生至前后节天数 ÷ 3，保留 1 位小数）；部分软件按虚岁（+1）展示。
5. **夏令时**：中国 1986–1991 年实行过夏令时，按 `isDST` 显式扣减，绝不依赖系统时区历史表。

## 💬 REPL 命令

| 命令 | 说明 |
|---|---|
| `/chart` | 显示八字命盘 |
| `/dashboard` | 显示命运驾驶舱 |
| `/event <领域> <影响分> <标题>` | 记录人生事件（自动关联大运/流年） |
| `/events` | 查看已记录的事件 |
| `/alerts [年份]` | 流年冲克预警（默认今年） |
| `/history` | 查看对话历史 |
| `/save [name]` / `/load <name>` / `/sessions` | 会话持久化 |
| `/birth` | 显示当前出生信息 |
| `/help`、`/exit` | 帮助 / 退出 |

## ⚙️ 环境变量

| 变量 | 用途 |
|---|---|
| `DESTINY_BIRTH` | REPL 出生信息（`年,月,日,时,分,经度,isDST,性别`） |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_AUTH_TOKEN` | REPL/Agent 的 LLM 密钥（自动探测） |
| `ANTHROPIC_MODEL` / `ANTHROPIC_BASE_URL` | 模型名与自定义接口 |
| `DEEPSEEK_API_KEY` | Web 聊天与评测脚本的默认密钥（也可在页面设置中配置） |
| `OPENAI_API_KEY` | Web 聊天 OpenAI 供应商 |

## 🧪 测试

```bash
npm test                  # 全仓 303 测试（Vitest）
npm run typecheck         # 根目录严格类型检查（strict + noUncheckedIndexedAccess）
cd web && npm run typecheck && npm run lint   # Web 类型与 lint
cd web && npm run test:parity                 # 引擎适配层 parity（1010 例）
```

## 📁 目录结构

```
core/astro/        确定性天文引擎（四柱/节气/真太阳时/大运/流年/刑冲合害）
core/destiny/      旺衰、格局、调候、用神、运势分析
visualization/     命盘/驾驶舱/大运时间线渲染
ai/                AI 解读层（性格、事业、感情、策略、提示词）
agent/             对话编排与 LLM 客户端
memory/            事件上下文、流年预警、预测追踪
data/              SQLite 持久化
web/               Next.js 界面与 API
packages/bazi-mcp/ MCP Server
scripts/           parity 测试等工具脚本
```

## License

MIT
