import { useEffect, useState, useMemo } from 'react';
import { RefreshCw, Eye } from 'lucide-react';
import api from '../../../core/api/axios';
import Modal from '../../../components/Modal';
import Pagination from '../../../components/Pagination';

const fmtDate = (d) => d ? new Date(d).toLocaleString('fr-FR', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
}) : '—';

// ── Valeurs réelles stockées en base (PostgreSQL) ──────────────────────────
const ACTION_STYLES = {
  CONNEXION:     { bg: '#F0FDF4', color: '#16A34A',  label: 'Connexion'     },
  DECONNEXION:   { bg: '#F3F4F6', color: '#6B7280',  label: 'Déconnexion'   },
  CREATION:      { bg: '#EFF6FF', color: '#2563EB',  label: 'Création'      },
  MODIFICATION:  { bg: '#FFFBEB', color: '#D97706',  label: 'Modification'  },
  SUPPRESSION:   { bg: '#FEF2F2', color: '#DC2626',  label: 'Suppression'   },
  IMPORT:        { bg: '#F5F3FF', color: '#7C3AED',  label: 'Import'        },
  DESACTIVATION: { bg: '#FFF7ED', color: '#EA580C',  label: 'Désactivation' },
};

// Valeurs réelles des modules dans la DB
const MODULES_DB = [
  'tous', 'inscriptions', 'paiements', 'clients', 'departs',
  'visas', 'billets', 'billets-groupe', 'recouvrement', 'desistements',
  'factures', 'comptabilite', 'reunions', 'documents', 'rapports',
  'shop', 'utilisateurs', 'supplements', 'ziarra', 'simulateur',
  'statistiques', 'taches', 'auth', 'systeme'
];
const ACTIONS_DB = ['tous', 'CONNEXION', 'DECONNEXION', 'CREATION', 'MODIFICATION', 'SUPPRESSION', 'IMPORT', 'DESACTIVATION'];

const MODULE_LABELS = {
  auth: 'Authentification', AUTH: 'Authentification',
  inscriptions: 'Inscriptions', RESERVATIONS: 'Inscriptions', reservations: 'Inscriptions',
  paiements: 'Paiements', PAIEMENTS: 'Paiements',
  clients: 'Clients', CLIENTS: 'Clients',
  departs: 'Départs', PACKAGES: 'Départs', packages: 'Départs',
  rapports: 'Rapports', RAPPORTS: 'Rapports',
  comptabilite: 'Comptabilité', COMPTABILITE: 'Comptabilité',
  taches: 'Tâches', TACHES: 'Tâches',
  utilisateurs: 'Utilisateurs', UTILISATEURS: 'Utilisateurs', users: 'Utilisateurs',
  ziarra: 'Ziarra', ZIARRA: 'Ziarra',
  visas: 'Visas', VISAS: 'Visas',
  secretaire: 'Secrétariat', documents: 'Documents', DOCUMENTS: 'Documents',
  reunions: 'Réunions', reunion: 'Réunions', REUNIONS: 'Réunions',
  shop: 'Kyswa Shop', SHOP: 'Kyswa Shop',
  billets: 'Billets', BILLETS: 'Billets',
  'billets-groupe': 'Billets Groupe',
  factures: 'Factures', FACTURES: 'Factures',
  supplements: 'Suppléments', SUPPLEMENTS: 'Suppléments',
  recouvrement: 'Recouvrement', RECOUVREMENT: 'Recouvrement',
  desistements: 'Désistements', DESISTEMENTS: 'Désistements',
  simulateur: 'Simulateur', SIMULATEUR: 'Simulateur',
  statistiques: 'Statistiques', STATISTIQUES: 'Statistiques',
  systeme: 'Système', SYSTEME: 'Système', SYSTEM: 'Système',
};

function CounterCard({ label, value, color }) {
  return (
    <div style={{
      background: 'white', borderRadius: 'var(--radius-lg)', padding: '24px 20px',
      boxShadow: 'var(--shadow-sm)', border: '1.5px solid var(--border)',
      flex: '1 1 130px', minWidth: 120,
    }}>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 900, color: color || 'var(--text-main)', lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
    </div>
  );
}

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterModule, setFilterModule] = useState('tous');
  const [filterAction, setFilterAction] = useState('tous');
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async (p = page, l = limit, s = search, mod = filterModule, act = filterAction) => {
    setLoading(true);
    try {
      const params = { page: p, limit: l };
      if (s)                    params.search = s;
      if (mod !== 'tous')   params.module = mod;
      if (act !== 'tous')   params.action = act;
      const r = await api.get('/audit', { params });
      const data = r.data.logs || r.data.data || [];
      setLogs(data);
      if (r.data.pagination) {
        setTotal(r.data.pagination.total || 0);
        setTotalPages(r.data.pagination.totalPages || r.data.pagination.pages || 1);
        setPage(r.data.pagination.page || p);
      } else {
        setTotal(r.data.total ?? data.length);
        setTotalPages(Math.ceil((r.data.total ?? data.length) / l) || 1);
      }
    } catch (e) { console.error('[AuditPage] Erreur fetch:', e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    setPage(1);
    fetchLogs(1, limit, search, filterModule, filterAction);
  }, [filterModule, filterAction]);

  // Debounce recherche texte
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchLogs(1, limit, search, filterModule, filterAction);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchLogs(newPage, limit, search, filterModule, filterAction);
  };

  const handleLimitChange = (newLimit) => {
    setLimit(newLimit);
    setPage(1);
    fetchLogs(1, newLimit, search, filterModule, filterAction);
  };

  // Compteurs par action (depuis les logs chargés)
  const counts = useMemo(() => {
    const map = {};
    logs.forEach(l => { map[l.action] = (map[l.action] || 0) + 1; });
    return {
      total,
      connexions:    map['CONNEXION']     || 0,
      creations:     map['CREATION']      || 0,
      modifications: map['MODIFICATION']  || 0,
      suppressions:  map['SUPPRESSION']   || 0,
      autres:        (map['IMPORT'] || 0) + (map['DESACTIVATION'] || 0) + (map['DECONNEXION'] || 0),
    };
  }, [logs, total]);

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
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: 'var(--text-main)' }}>Journal d'audit</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 2 }}>
            {total.toLocaleString('fr-FR')} actions enregistrées au total
          </p>
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
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <CounterCard label="Total affiché" value={logs.length} />
        <CounterCard label="Connexions"    value={counts.connexions}    color="#16A34A" />
        <CounterCard label="Créations"     value={counts.creations}     color="#2563EB" />
        <CounterCard label="Modifications" value={counts.modifications} color="#D97706" />
        <CounterCard label="Suppressions"  value={counts.suppressions}  color="#DC2626" />
        <CounterCard label="Autres"        value={counts.autres}        color="#7C3AED" />
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher utilisateur, module..."
          className="premium-input"
          style={{ width: 280 }}
        />
        {/* Filtre Module */}
        <select value={filterModule} onChange={e => setFilterModule(e.target.value)} className="premium-input" style={{ width: 200 }}>
          {MODULES_DB.map(m => (
            <option key={m} value={m}>{m === 'tous' ? 'Tous les modules' : (MODULE_LABELS[m] || m)}</option>
          ))}
        </select>
        {/* Filtre Action */}
        <select value={filterAction} onChange={e => setFilterAction(e.target.value)} className="premium-input" style={{ width: 180 }}>
          {ACTIONS_DB.map(a => (
            <option key={a} value={a}>{a === 'tous' ? 'Toutes les actions' : (ACTION_STYLES[a]?.label || a)}</option>
          ))}
        </select>
        {/* Reset */}
        {(filterModule !== 'tous' || filterAction !== 'tous' || search) && (
          <button onClick={() => { setSearch(''); setFilterModule('tous'); setFilterAction('tous'); }}
            style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'white', fontSize: 12, cursor: 'pointer', color: 'var(--text-muted)', fontWeight: 600 }}>
            Réinitialiser
          </button>
        )}
      </div>

      {/* Tableau */}
      <div className="premium-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="premium-table">
            <thead>
              <tr>
                <th>Date &amp; Heure</th>
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
                const nomUser = l.user_nom || l.userNom || (l.userId?.nom ? `${l.userId.prenom || ''} ${l.userId.nom}`.trim() : '—');
                const roleUser = l.user_role || l.userRole || l.userId?.role || '—';
                const moduleLabel = MODULE_LABELS[l.module] || l.module || '—';
                return (
                  <tr key={l.id || l._id}>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtDate(l.created_at || l.createdAt)}</td>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{nomUser}</td>
                    <td>
                      <span style={{ background: '#F3F4F6', color: '#374151', borderRadius: 20, padding: '2px 10px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>
                        {roleUser}
                      </span>
                    </td>
                    <td>
                      <span style={{ background: actionStyle.bg, color: actionStyle.color, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {actionStyle.label}
                      </span>
                    </td>
                    <td>
                      <span style={{ background: '#F0FDF4', color: '#059669', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
                        {moduleLabel}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          itemsPerPage={limit}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
        />
      </div>

      {/* Modal détail */}
      <Modal open={!!selectedLog} onClose={() => setSelectedLog(null)} title="Détail de l'action">
        {selectedLog && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              ['Date & Heure',  fmtDate(selectedLog.created_at || selectedLog.createdAt)],
              ['Utilisateur',   selectedLog.user_nom || selectedLog.userNom || (selectedLog.userId?.nom ? `${selectedLog.userId.prenom || ''} ${selectedLog.userId.nom}`.trim() : '—')],
              ['Rôle',          selectedLog.user_role || selectedLog.userRole || selectedLog.userId?.role || '—'],
              ['Action',        ACTION_STYLES[selectedLog.action]?.label || selectedLog.action],
              ['Module',        MODULE_LABELS[selectedLog.module] || selectedLog.module || '—'],
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
                fontSize: 12, color: '#374151', overflow: 'auto', maxHeight: 240,
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
