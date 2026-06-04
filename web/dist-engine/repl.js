// ============================================================
// AI Destiny OS — Interactive REPL (命理对话终端)
// ============================================================
import * as readline from 'node:readline';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { DestinyAgent } from './agent/agentEngine.js';
import { createAutoClient } from './agent/llmClient.js';
// ---- Constants ----
const DATA_DIR = path.join(os.homedir(), '.ai-destiny-os');
const SESSIONS_DIR = path.join(DATA_DIR, 'sessions');
// Default birth info (placeholder)
const DEFAULT_BIRTH = {
    year: 1993, month: 7, day: 23, hour: 9, minute: 30,
    longitude: 116.4, isDST: false, gender: '男',
};
const BANNER = `
╔══════════════════════════════════════════════════╗
║     AI Destiny OS · 命理对话终端                   ║
║     Four Pillars · Destiny · AI Analysis         ║
╚══════════════════════════════════════════════════╝`;
const HELP = `
命理对话终端 · Commands
──────────────────────────────────────────────────
  /chart        显示八字命盘
  /dashboard    显示命运驾驶舱
  /history      查看对话历史
  /save [name]  保存当前会话
  /load <name>  加载已保存的会话
  /sessions     列出所有已保存的会话
  /clear        清空对话历史
  /birth        显示当前出生信息
  /help         显示此帮助
  /exit, /quit  退出
──────────────────────────────────────────────────
  直接输入问题即可与分析引擎对话`;
function ensureDataDir() {
    for (const dir of [DATA_DIR, SESSIONS_DIR]) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
}
function sessionPath(name) {
    const safe = name.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 64) || 'session';
    return path.join(SESSIONS_DIR, `${safe}.json`);
}
function saveSession(agent, name) {
    ensureDataDir();
    const filename = name ?? `auto_${Date.now()}`;
    const filepath = sessionPath(filename);
    const data = {
        id: agent.state.session.id,
        createdAt: agent.state.session.createdAt,
        savedAt: new Date().toISOString(),
        birth: agent.state.birth,
        history: agent.state.history,
        turnCount: agent.state.session.turnCount,
    };
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
    return filepath;
}
function loadSession(agent, name) {
    const filepath = sessionPath(name);
    if (!fs.existsSync(filepath))
        return false;
    const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    agent.state.history = data.history;
    agent.state.session.turnCount = data.turnCount;
    agent.state.session.lastActiveAt = new Date().toISOString();
    return true;
}
function listSessions() {
    if (!fs.existsSync(SESSIONS_DIR))
        return [];
    return fs.readdirSync(SESSIONS_DIR)
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''))
        .sort();
}
// ---- REPL Class ----
class DestinyREPL {
    agent;
    llm;
    rl;
    running = false;
    lastSessionSave = null;
    constructor(birth, llm) {
        this.agent = new DestinyAgent(birth, llm ?? undefined);
        this.llm = llm;
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: '\n\x1b[36m命理> \x1b[0m',
            terminal: true,
        });
    }
    async start() {
        ensureDataDir();
        console.log(BANNER);
        console.log(this.agent.renderChart());
        if (this.llm) {
            console.log(`\nLLM: \x1b[32m已连接\x1b[0m · 输入问题开始对话`);
        }
        else {
            console.log(`\nLLM: \x1b[33m未配置\x1b[0m · 将使用确定性命理摘要`);
            console.log('设置 ANTHROPIC_API_KEY 或 ANTHROPIC_AUTH_TOKEN 以启用 AI 对话');
        }
        console.log(HELP);
        this.running = true;
        this.rl.prompt();
        try {
            for await (const line of this.rl) {
                await this.handleLine(line);
                if (!this.running)
                    break;
                try {
                    this.rl.prompt();
                }
                catch { /* closed */ }
            }
        }
        catch {
            // readline closed — expected on piped input or /exit
        }
        this.running = false;
        console.log('\n再见。');
    }
    async handleLine(line) {
        const trimmed = line.trim();
        if (!trimmed)
            return;
        // Commands
        if (trimmed.startsWith('/')) {
            const [cmd, ...args] = trimmed.slice(1).split(/\s+/);
            await this.handleCommand(cmd ?? '', args.join(' '), trimmed);
            return;
        }
        // Normal query
        await this.handleQuery(trimmed);
    }
    async handleCommand(cmd, args, _raw) {
        switch (cmd) {
            case 'help':
                console.log(HELP);
                break;
            case 'chart':
                console.log(this.agent.renderChart());
                break;
            case 'dashboard':
                console.log(this.agent.renderDashboard({ compact: true }));
                break;
            case 'history':
                this.showHistory();
                break;
            case 'clear':
                this.agent.state.history = [];
                this.agent.state.session.turnCount = 0;
                console.log('对话历史已清空');
                break;
            case 'birth':
                console.log(this.formatBirth());
                break;
            case 'save': {
                const filepath = saveSession(this.agent, args || undefined);
                this.lastSessionSave = path.basename(filepath, '.json');
                console.log(`会话已保存: ${this.lastSessionSave}`);
                break;
            }
            case 'load': {
                if (!args) {
                    console.log('用法: /load <会话名>');
                    break;
                }
                if (loadSession(this.agent, args)) {
                    this.lastSessionSave = args;
                    console.log(`已加载会话: ${args} (${this.agent.state.history.length} 条消息)`);
                }
                else {
                    console.log(`会话 "${args}" 不存在。使用 /sessions 查看所有会话。`);
                }
                break;
            }
            case 'sessions': {
                const sessions = listSessions();
                if (sessions.length === 0) {
                    console.log('暂无已保存的会话。使用 /save [名称] 保存当前会话。');
                }
                else {
                    console.log('已保存的会话:');
                    for (const s of sessions) {
                        const info = this.sessionInfo(s);
                        const marker = s === this.lastSessionSave ? ' ← 当前' : '';
                        console.log(`  ${s}${marker}${info}`);
                    }
                }
                break;
            }
            case 'exit':
            case 'quit':
                // Auto-save on exit
                if (this.agent.state.history.length > 0) {
                    const p = saveSession(this.agent, this.lastSessionSave ?? undefined);
                    console.log(`会话已自动保存: ${path.basename(p, '.json')}`);
                }
                this.running = false;
                this.rl.close();
                break;
            default:
                console.log(`未知命令: /${cmd}。输入 /help 查看可用命令。`);
        }
    }
    async handleQuery(input) {
        if (!this.llm) {
            // No LLM — use deterministic fallback
            const response = this.agent.processQuery(input);
            console.log(`\n\x1b[33m[${response.topic} · 离线分析]\x1b[0m\n`);
            console.log(response.text);
            if (response.visualization) {
                console.log(response.visualization);
            }
            return;
        }
        // With LLM — stream the response
        process.stdout.write(`\n\x1b[33m[思考中]\x1b[0m `);
        let fullText = '';
        try {
            for await (const event of this.agent.processQueryStream(input)) {
                if (event.type === 'token' && event.content) {
                    if (!fullText) {
                        process.stdout.write('\r\x1b[K\n');
                    }
                    fullText += event.content;
                    process.stdout.write(event.content);
                }
                else if (event.type === 'done') {
                    if (fullText)
                        process.stdout.write('\n');
                }
            }
        }
        catch (err) {
            console.error(`\n\x1b[31m错误: ${err instanceof Error ? err.message : '未知错误'}\x1b[0m`);
        }
    }
    showHistory() {
        const { history } = this.agent.state;
        if (history.length === 0) {
            console.log('暂无对话历史');
            return;
        }
        console.log(`\n对话历史 (${history.length} 条):`);
        for (let i = 0; i < history.length; i++) {
            const h = history[i];
            const roleLabel = h.role === 'user' ? '你' : '命理师';
            const color = h.role === 'user' ? '\x1b[36m' : '\x1b[33m';
            const preview = h.content.length > 80 ? h.content.slice(0, 80) + '...' : h.content;
            console.log(`  ${color}[${roleLabel} · ${h.topic ?? '综合'}]\x1b[0m ${preview}`);
        }
    }
    formatBirth() {
        const b = this.agent.state.birth;
        return [
            `出生信息: ${b.year}/${b.month}/${b.day} ${String(b.hour).padStart(2, '0')}:${String(b.minute).padStart(2, '0')}`,
            `经度: ${b.longitude}°  ·  性别: ${b.gender}  ·  夏令时: ${b.isDST ? '是' : '否'}`,
            `日主: \x1b[32m${this.agent.state.chart.dayMaster.name}${this.agent.state.chart.dayMasterWuxing}\x1b[0m`,
            `格局: ${this.agent.state.ctx.structure.primaryPattern}  ·  旺衰: ${this.agent.state.ctx.strength.level}`,
        ].join('\n');
    }
    sessionInfo(name) {
        try {
            const filepath = sessionPath(name);
            const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
            const date = data.savedAt.slice(0, 10);
            const birth = `${data.birth.year}/${data.birth.month}/${data.birth.day}`;
            return ` — ${date}, ${data.turnCount}轮, 出生${birth}`;
        }
        catch {
            return '';
        }
    }
}
// ---- Entry Point ----
function getBirthFromEnv() {
    const str = process.env['DESTINY_BIRTH'];
    if (!str)
        return null;
    const parts = str.split(',');
    if (parts.length < 4)
        return null;
    return {
        year: parseInt(parts[0], 10),
        month: parseInt(parts[1], 10),
        day: parseInt(parts[2], 10),
        hour: parseInt(parts[3], 10),
        minute: parts[4] ? parseInt(parts[4], 10) : 0,
        longitude: parts[5] ? parseFloat(parts[5]) : 116.4,
        isDST: parts[6] === '1',
        gender: (parts[7] === '女' ? '女' : '男'),
    };
}
function main() {
    const birth = getBirthFromEnv() ?? DEFAULT_BIRTH;
    const llm = createAutoClient();
    const repl = new DestinyREPL(birth, llm);
    repl.start();
}
main();
//# sourceMappingURL=repl.js.map