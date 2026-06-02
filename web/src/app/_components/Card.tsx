export function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 6, padding: '1.25rem', marginBottom: '1rem' }}>
      {title && <h2 style={{ margin: '0 0 0.75rem 0', fontSize: '1.1rem', color: '#b45309' }}>{title}</h2>}
      {children}
    </section>
  );
}

export function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', borderBottom: '1px solid #f0f0f0' }}>
      <span style={{ color: '#888', fontSize: '0.9rem' }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  );
}
