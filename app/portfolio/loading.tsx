export default function Loading() {
  return (
    <div
      className="t91"
      aria-busy="true"
      aria-live="polite"
      style={{ minHeight: '60vh' }}
    >
      <div className="t91-header">
        <div className="t91-eyebrow" style={{ opacity: 0.5 }}>Build</div>
        <div
          style={{
            height: 56,
            width: '70%',
            background: 'var(--t91-card)',
            borderRadius: 12,
            opacity: 0.6,
          }}
        />
      </div>
      <div className="t91-stats" style={{ opacity: 0.55 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="t91-stat">
            <span className="t91-stat-label">—</span>
            <span className="t91-stat-value" style={{ opacity: 0.4 }}>$—</span>
          </div>
        ))}
      </div>
    </div>
  );
}
