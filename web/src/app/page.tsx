export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <h1 className="text-3xl font-bold tracking-tight mb-2">AI Destiny OS</h1>
      <p className="text-muted-foreground mb-8 max-w-md">
        八字命理分析平台 — 选择一个功能开始探索你的命运密码
      </p>
      <div className="flex gap-4 flex-wrap justify-center">
        <NavCard
          href="/chart"
          title="排盘"
          desc="输入生辰，查看八字排盘和命理分析"
        />
        <NavCard
          href="/chat"
          title="聊天"
          desc="与 AI 命理师对话，解读你的命运走势"
        />
        <NavCard
          href="/compare"
          title="合盘"
          desc="比较两人的八字，看五行和用神合拍度"
        />
      </div>
    </div>
  );
}

function NavCard({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <a
      href={href}
      className="block w-56 p-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-destiny-700 hover:bg-destiny-950/20 transition-all duration-200 group"
    >
      <h2 className="text-lg font-semibold mb-1.5 text-destiny-400 group-hover:text-destiny-300 transition-colors">
        {title}
      </h2>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </a>
  );
}
