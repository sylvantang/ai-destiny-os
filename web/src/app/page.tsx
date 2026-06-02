export default function HomePage() {
  return (
    <div style={{ textAlign: 'center', paddingTop: '3rem' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>AI Destiny OS</h1>
      <p style={{ color: '#888', marginBottom: '2rem' }}>八字命理分析平台 — 选择一个功能开始</p>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <NavCard href="/chart" title="排盘" desc="输入生辰，查看八字排盘和命理分析" />
        <NavCard href="/chat" title="聊天" desc="与命理AI对话，解读你的命运走势" />
        <NavCard href="/compare" title="合盘" desc="比较两人的八字，看五行和用神合拍度" />
      </div>
    </div>
  );
}

function NavCard({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <a
      href={href}
      style={{
        display: 'block', width: 200, padding: '1.5rem 1rem',
        border: '1px solid #e5e5e5', borderRadius: 8, background: '#fff',
        textDecoration: 'none', color: '#222',
      }}
    >
      <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: '#b45309' }}>{title}</h2>
      <p style={{ margin: 0, fontSize: '0.85rem', color: '#888' }}>{desc}</p>
    </a>
  );
}
