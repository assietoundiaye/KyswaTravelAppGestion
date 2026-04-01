import { useEffect, useState, useMemo } from 'react';
import { RefreshCw, Eye } from 'lucide-react';
import api from '../../../api/axios';
import Modal from '../../../components/Modal';

const fmtDate = (d) => d ? new Date(d).toLocaleString('fr-FR', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
}) : '—';

const ACTION_STYLES = {
  LOGIN:      { bg: '#F0FDF4', color: '#16A34A', label: 'CONNEXION' },
  LOGOUT:     { bg: '#F3F4F6', color: '#6B7280', label: 'DECONNEXION' },
  CREATE:     { bg: '#EFF6FF', color: '#2563EB', label: 'CREATION' },
  UPDATE:     { bg: '#FFFBEB', color: '#D97706', label: 'MODIFICATION' },
  DELETE:     { bg: '#FEF2F2', color: '#DC2626', label: 'SUPPRESSION' },
  VIEW:       { bg: '#F5F3FF', color: '#7C3AED', label: 'CONSULTATION' },
};

const MODULE_STYLE = { bg: '#F0FDF4', color: '#059669' };

const MODULES = ['tous', 'AUTH', 'CLIENT', 'RESERVATION', 'BILLET', 'PAIEMENT', 'PACKAGE', 'SUPPLEMENT', 'DOCUMENT', 'UTILISATEUR', 'RAPPORTS'];
const ACTIONS = ['tous', 'LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'VIEW'];

function CounterCard({ label, value, color }) {
  return (
    <div style={{
      background: 'white', borderRadius: 12, padding: '18px 24px',
      boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)',
      minWidth: 120,
    }}>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 900, color: color || 'var(--text-main)', lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, fontWeight: 500 }}>{label}</p>
    </div>
  );
}

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterModule, setFilterModule] = useState('tous');
  const [filterAction, setFilterAction] = useState('tous');
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (filterModule !== 'tous') params.module = filterModule;
      if (filterAction !== 'tous') params.action = filterAction;
      const r = await api.get('/messages/audit', { params });
      setLogs(r.data.logs || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, [filterModule, filterAction]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => fetchLogs(), 400);
    return () => clearTimeout(t);
  }, [search]);

  const counts = useMemo(() => ({
    total: logs.length,
    connexions: logs.filter(l => l.action === 'LOGIN').length,
    creations: logs.filter(l => l.action === 'CREATE').length,
    modifications: logs.filter(l => l.action === 'UPDATE').length,
    suppressions: logs.filter(l => l.action === 'DELETE').length,
  }), [logs]);

  const getDetails = (log) => {
    if (!log.details) return '—';
    try {
      const d = log.details;
      if (typeof d === 'string') return d;
      const entries = Object.entries(d).slice(0, 3);
      return entries.map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(' · ');
    } catch { return '—'; }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🛡️</span>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>Journal d'audit</h1>
        </div>
        <button onClick={fetchLogs} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'white', border: '1px solid var(--border)', borderRadius: 8,
          padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'var(--text-main)',
        }}>
          <RefreshCw size={14} /> Actualiser
        </button>
      </div>

      {/* Compteurs */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <CounterCard label="Total actions" value={counts.total} />
        <CounterCard label="Connexions" value={counts.connexions} color="#16A34A" />
        <CounterCard label="Créations" value={counts.creations} color="#2563EB" />
        <CounterCard label="Modifications" value={counts.modifications} color="#D97706" />
        <CounterCard label="Suppressions" value={counts.suppressions} color="#DC2626" />
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Rechercher..."
          className="premium-input"
          style={{ width: 280 }}
        />
        <select value={filterModule} onChange={e => setFilterModule(e.target.value)} className="premium-input" style={{ width: 180 }}>
          {MODULES.map(m => <option key={m} value={m}>{m === 'tous' ? 'Tous les modules' : m}</option>)}
        </select>
        <select value={filterAction} onChange={e => setFilterAction(e.target.value)} className="premium-input" style={{ width: 180 }}>
          {ACTIONS.map(a => <option key={a} value={a}>{a === 'tous' ? 'Toutes les actions' : ACTION_STYLES[a]?.label || a}</option>)}
        </select>
      </div>

      {/* Tableau */}
      <div className="premium-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="premium-table">
            <thead>
              <tr>
                <th>Date & Heure</th>
                <th>Utilisateur</th>
                <th>Rôle</th>
                <th>Action</th>
                <th>Module</th>
                <th>Détails</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Chargement...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Aucune action enregistrée</td></tr>
              ) : logs.map(l => {
                const actionStyle = ACTION_STYLES[l.action] || { bg: '#F3F4F6', color: '#6B7280', label: l.action };
                const user = l.userId || {};
                const nom = user.nom ? `${user.prenom || ''} ${user.nom}`.trim() : (l.userNom || '—');
                const role = user.role || '—';
                return (
                  <tr key={l._id}>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtDate(l.createdAt)}</td>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{nom}</td>
                    <td>
                      <span style={{ background: '#F3F4F6', color: '#374151', borderRadius: 20, padding: '2px 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
                        {role}
                      </span>
                    </td>
                    <td>
                      <span style={{ background: actionStyle.bg, color: actionStyle.color, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
                        {actionStyle.label}
                      </span>
                    </td>
                    <td>
                      <span style={{ background: MODULE_STYLE.bg, color: MODULE_STYLE.color, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
                        {l.module}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {getDetails(l)}
                    </td>
                    <td>
                      <button
                        onClick={() => setSelectedLog(l)}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,103,79,0.08)', border: 'none', borderRadius: 6, padding: '4px 10px', color: 'var(--primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                      >
                        <Eye size={12} /> Détail
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal détail */}
      <Modal open={!!selectedLog} onClose={() => setSelectedLog(null)} title="Détail de l'action">
        {selectedLog && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              ['Date & Heure', fmtDate(selectedLog.createdAt)],
              ['Utilisateur', selectedLog.userId ? `${selectedLog.userId.prenom || ''} ${selectedLog.userId.nom || ''}`.trim() : (selectedLog.userNom || '—')],
              ['Rôle', selectedLog.userId?.role || '—'],
              ['Action', ACTION_STYLES[selectedLog.action]?.label || selectedLog.action],
              ['Module', selectedLog.module],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', gap: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', minWidth: 120, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                <span style={{ fontSize: 13, color: 'var(--text-main)', fontWeight: 500 }}>{value}</span>
              </div>
            ))}
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Données concernées</p>
              <pre style={{
                background: '#F8FAFC', borderRadius: 8, padding: '12px 14px',
                fontSize: 12, color: '#374151', overflow: 'auto', maxHeight: 200,
                border: '1px solid var(--border)', fontFamily: 'monospace',
              }}>
                {selectedLog.details ? JSON.stringify(selectedLog.details, null, 2) : '—'}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
