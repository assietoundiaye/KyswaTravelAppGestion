import { useEffect, useState } from 'react';

let toastFn = null;

export function toast(message, type = 'success') {
  if (toastFn) toastFn(message, type);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    toastFn = (message, type) => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, message, type }]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    };
    return () => { toastFn = null; };
  }, []);

  if (!toasts.length) return null;

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {toasts.map(t => (
        <div key={t.id} className="animate-slide-up" style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 20px',
          background: t.type === 'error' ? 'var(--danger)' : t.type === 'warning' ? 'var(--warning)' : 'var(--primary)',
          color: 'white',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500,
          minWidth: 260, maxWidth: 380,
        }}>
          <span style={{ fontSize: 18 }}>
            {t.type === 'error' ? '❌' : t.type === 'warning' ? '⚠️' : '✅'}
          </span>
          {t.message}
        </div>
      ))}
    </div>
  );
}
