export default function StatCard({ label, value, sub, colorClass = 'grad-card-green', icon }) {
  const isColored = colorClass.startsWith('grad-card');
  return (
    <div className={`premium-card ${colorClass}`} style={{ borderRadius: 'var(--radius-xl)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em',
            color: isColored ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', marginBottom: 8
          }}>{label}</p>
          <p style={{
            fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, lineHeight: 1,
            color: isColored ? 'white' : 'var(--text-main)'
          }}>{value ?? '—'}</p>
          {sub && <p style={{ fontSize: 12, marginTop: 6, color: isColored ? 'rgba(255,255,255,0.6)' : 'var(--text-muted)' }}>{sub}</p>}
        </div>
        {icon && (
          <div className="stat-icon" style={{ background: isColored ? 'rgba(255,255,255,0.15)' : 'rgba(var(--primary-rgb),0.1)' }}>
            <span style={{ fontSize: 22 }}>{icon}</span>
          </div>
        )}
      </div>
    </div>
  );
}
