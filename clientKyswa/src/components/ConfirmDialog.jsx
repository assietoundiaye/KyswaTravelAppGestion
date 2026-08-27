export default function ConfirmDialog({
  open,
  isOpen,
  onConfirm,
  onCancel,
  onClose,
  message = 'Confirmer cette action ?',
  title,
  confirmText = 'Confirmer',
  confirmButtonClass = 'btn-danger',
  children
}) {
  const isDialogOpen = open || isOpen;
  const handleCancel = onCancel || onClose;

  if (!isDialogOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={handleCancel} style={{ position: 'absolute', inset: 0, background: 'rgba(15,31,26,0.5)', backdropFilter: 'blur(4px)' }} />
      <div className="animate-slide-up" style={{
        position: 'relative', zIndex: 1,
        background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-premium)', border: '1px solid var(--border-light)',
        padding: '28px 28px 24px', maxWidth: 420, width: '100%',
        textAlign: children ? 'left' : 'center'
      }}>
        {title && (
          <h3 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 18,
            fontWeight: 700,
            color: 'var(--text-main)',
            marginBottom: 12,
            textAlign: 'center'
          }}>
            {title}
          </h3>
        )}

        {children ? (
          <div style={{ marginBottom: 20 }}>
            {children}
          </div>
        ) : (
          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--text-main)',
            marginBottom: 20,
            textAlign: 'center'
          }}>
            {message}
          </p>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={handleCancel} className="btn-secondary" style={{ flex: 1 }}>Annuler</button>
          <button onClick={onConfirm} className={confirmButtonClass || 'btn-danger'} style={{ flex: 1 }}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
