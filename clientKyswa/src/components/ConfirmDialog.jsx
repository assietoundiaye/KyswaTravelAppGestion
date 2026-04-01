export default function ConfirmDialog({ open, onConfirm, onCancel, message = 'Confirmer cette action ?' }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={onCancel} style={{ position: 'absolute', inset: 0, background: 'rgba(15,31,26,0.5)', backdropFilter: 'blur(4px)' }} />
      <div className="animate-slide-up" style={{
        position: 'relative', zIndex: 1,
        background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-premium)', border: '1px solid var(--border-light)',
        padding: '28px 28px 24px', maxWidth: 380, width: '100%', textAlign: 'center',
      }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--text-main)', marginBottom: 20 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={onCancel} className="btn-secondary" style={{ flex: 1 }}>Annuler</button>
          <button onClick={onConfirm} className="btn-danger" style={{ flex: 1 }}>Confirmer</button>
        </div>
      </div>
    </div>
  );
}
