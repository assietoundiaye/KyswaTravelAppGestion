import { useEffect } from 'react';

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const widths = { sm: 400, md: 560, lg: 720, xl: 900 };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      {/* Overlay */}
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0,
        background: 'rgba(15, 31, 26, 0.5)',
        backdropFilter: 'blur(4px)',
      }} />

      {/* Panel */}
      <div className="animate-slide-up" style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: widths[size],
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-2xl)',
        boxShadow: 'var(--shadow-premium)',
        border: '1px solid var(--border-light)',
        maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-light)',
        }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text-main)' }}>
            {title}
          </h2>
          <button onClick={onClose} style={{
            background: 'rgba(var(--primary-rgb), 0.08)', border: 'none',
            borderRadius: 8, width: 32, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, fontWeight: 300,
          }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
