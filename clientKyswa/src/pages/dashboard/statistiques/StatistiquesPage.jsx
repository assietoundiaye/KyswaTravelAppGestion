import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ShieldCheck, Package, BarChart2, ClipboardList, Download } from 'lucide-react';
import api from '../../../api/axios';
import { ROLE_LABELS, ROLE_COLORS } from '../../../utils/roles';

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, color, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: 'white', borderRadius: 'var(--radius-xl)', padding: '20px 24px',
      boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)',
      borderLeft: `4px solid ${color}`, cursor: onClick ? 'pointer' : 'default',
      transition: 'box-shadow 0.15s',
    }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 6 }}>{label}</p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 900, color: 'var(--text-main)', lineHeight: 1 }}>{value}</p>
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} color={color} />
        </div>
      </div>
    </div>
  );
}

// ── Graphe en barres groupées (activité mensuelle) ────────────────────────────
const MOIS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

function BarChart({ utilisateurs, packages, rapports }) {
  // Répartition par mois de création
  const byMonth = (arr, dateField = 'createdAt') => {
    const counts = Array(12).fill(0);
    arr.forEach(item => {
      const d = new Date(item[dateField] || item.dateCreation || item.createdAt);
      if (!isNaN(d)) counts[d.getMonth()]++;
    });
    return counts;
  };

  const usersPerMonth = byMonth(utilisateurs);
  const pkgPerMonth   = byMonth(packages, 'dateDepart');
  const rapPerMonth   = byMonth(rapports, 'date');

  const series = [
    { label: 'Utilisateurs', data: usersPerMonth, color: '#6B7280' },
    { label: 'Départs',      data: pkgPerMonth,   color: '#00674F' },
    { label: 'Rapports',     data: rapPerMonth,   color: '#2563EB' },
  ];

  const maxVal = Math.max(...series.flatMap(s => s.data), 1);
  const W = 700, H = 200, PAD = { top: 20, right: 20, bottom: 36, left: 36 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const groupW = innerW / 12;
  const barW = (groupW - 8) / series.length;
  const yTicks = [0, Math.round(maxVal / 2), maxVal];

  return (
    <div className="premium-card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>
          Activité mensuelle — {new Date().getFullYear()}
        </h2>
        <div style={{ display: 'flex', gap: 16 }}>
          {series.map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: s.color }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 400, height: 'auto' }}>
          {/* Grid + Y axis */}
          {yTicks.map(v => {
            const y = PAD.top + innerH - (v / maxVal) * innerH;
            return (
              <g key={v}>
                <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#E5E7EB" strokeWidth="1" strokeDasharray="4 3" />
                <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#9CA3AF">{v}</text>
              </g>
            );
          })}
          {/* Bars */}
          {MOIS.map((m, mi) => {
            const groupX = PAD.left + mi * groupW + 4;
            return (
              <g key={m}>
                {series.map((s, si) => {
                  const h = maxVal > 0 ? (s.data[mi] / maxVal) * innerH : 0;
                  const x = groupX + si * barW;
                  const y = PAD.top + innerH - h;
                  return (
                    <g key={si}>
                      <rect x={x} y={y} width={Math.max(barW - 2, 2)} height={Math.max(h, 0)}
                        fill={s.color} rx="2" opacity="0.85" />
                      {s.data[mi] > 0 && (
                        <text x={x + barW / 2 - 1} y={y - 3} textAnchor="middle" fontSize="8" fill={s.color} fontWeight="700">
                          {s.data[mi]}
                        </text>
                      )}
                    </g>
                  );
                })}
                <text x={groupX + (groupW - 8) / 2} y={H - 8} textAnchor="middle" fontSize="10" fill="#9CA3AF">{m}</text>
              </g>
            );
          })}
          {/* X axis line */}
          <line x1={PAD.left} y1={PAD.top + innerH} x2={W - PAD.right} y2={PAD.top + innerH} stroke="#E5E7EB" strokeWidth="1" />
        </svg>
      </div>
    </div>
  );
}

// ── Diagramme circulaire SVG (répartition des rôles) ─────────────────────────
function PieChart({ data, title }) {
  if (!data || data.length === 0) return null;

  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const CX = 100, CY = 100, R = 80;
  let startAngle = -Math.PI / 2;

  const slices = data.map(d => {
    const angle = (d.value / total) * 2 * Math.PI;
    const endAngle = startAngle + angle;
    const x1 = CX + R * Math.cos(startAngle);
    const y1 = CY + R * Math.sin(startAngle);
    const x2 = CX + R * Math.cos(endAngle);
    const y2 = CY + R * Math.sin(endAngle);
    const largeArc = angle > Math.PI ? 1 : 0;
    const midAngle = startAngle + angle / 2;
    const lx = CX + (R + 20) * Math.cos(midAngle);
    const ly = CY + (R + 20) * Math.sin(midAngle);
    const path = `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    const result = { ...d, path, lx, ly, midAngle, startAngle, endAngle };
    startAngle = endAngle;
    return result;
  });

  return (
    <div className="premium-card" style={{ padding: 24 }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text-main)', marginBottom: 16 }}>
        {title}
      </h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        <svg viewBox="0 0 200 200" style={{ width: 180, height: 180, flexShrink: 0 }}>
          {slices.map((s, i) => (
            <path key={i} d={s.path} fill={s.color} stroke="white" strokeWidth="2" opacity="0.9" />
          ))}
          {/* Cercle central blanc (donut effect) */}
          <circle cx={CX} cy={CY} r={40} fill="white" />
          <text x={CX} y={CY - 6} textAnchor="middle" fontSize="18" fontWeight="900" fill="var(--text-main)">{total}</text>
          <text x={CX} y={CY + 12} textAnchor="middle" fontSize="9" fill="#9CA3AF">TOTAL</text>
        </svg>
        {/* Légende */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {slices.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: s.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--text-main)', fontWeight: 600 }}>{s.label}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 900, color: s.color, fontFamily: 'var(--font-display)' }}>{s.value}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>({Math.round(s.value / total * 100)}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function StatistiquesPage() {
  const navigate = useNavigate();
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [packages, setPackages] = useState([]);
  const [rapports, setRapports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/users').catch(() => ({ data: { utilisateurs: [] } })),
      api.get('/packages').catch(() => ({ data: { packages: [] } })),
      api.get('/rapports').catch(() => ({ data: { rapports: [] } })),
    ]).then(([u, p, r]) => {
      setUtilisateurs(u.data.utilisateurs || []);
      setPackages(p.data.packages || []);
      setRapports(r.data.rapports || []);
    }).finally(() => setLoading(false));
  }, []);

  const actifs   = utilisateurs.filter(u => u.etat === 'ACTIF').length;
  const inactifs = utilisateurs.filter(u => u.etat === 'INACTIF').length;
  const departsOuverts = packages.filter(p => p.statut === 'OUVERT').length;

  // Répartition par rôle pour le diagramme circulaire
  const parRole = utilisateurs.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  const pieRoles = Object.entries(parRole)
    .map(([role, value]) => ({
      label: ROLE_LABELS[role] || role,
      value,
      color: ROLE_COLORS[role] || '#6B7280',
    }))
    .sort((a, b) => b.value - a.value);

  // Répartition statut comptes pour 2e diagramme
  const pieStatuts = [
    { label: 'Actifs', value: actifs, color: '#16A34A' },
    { label: 'Inactifs', value: inactifs, color: '#DC2626' },
  ].filter(d => d.value > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        <KpiCard label="Comptes" value={loading ? '…' : utilisateurs.length} icon={Users} color="#6B7280"
          onClick={() => navigate('/dashboard/utilisateurs')} />
        <KpiCard label="Actifs" value={loading ? '…' : actifs} icon={ShieldCheck} color="#16A34A" />
        <KpiCard label="Inactifs" value={loading ? '…' : inactifs} icon={Users} color="#DC2626" />
        <KpiCard label="Départs" value={loading ? '…' : packages.length} icon={Package} color="var(--primary)"
          onClick={() => navigate('/dashboard/packages')} />
        <KpiCard label="Ouverts" value={loading ? '…' : departsOuverts} icon={BarChart2} color="#2563EB" />
        <KpiCard label="Rapports" value={loading ? '…' : rapports.length} icon={ClipboardList} color="#7C3AED"
          onClick={() => navigate('/dashboard/rapports')} />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <button onClick={() => navigate('/dashboard/utilisateurs')} className="btn-primary">Gérer les utilisateurs</button>
        <button onClick={() => navigate('/dashboard/audit')} className="btn-secondary">Journal d'audit</button>
        <button onClick={() => navigate('/dashboard/packages')} className="btn-secondary">Gérer les départs</button>
      </div>

      {/* Graphe en barres */}
      {!loading && <BarChart utilisateurs={utilisateurs} packages={packages} rapports={rapports} />}

      {/* Diagrammes circulaires côte à côte */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <PieChart data={pieRoles} title="Répartition des comptes par rôle" />
          <PieChart data={pieStatuts} title="Statut des comptes (Actifs / Inactifs)" />
        </div>
      )}

      {/* Tableau comptes récents */}
      <div className="premium-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700 }}>Comptes récents</h2>
          <button onClick={() => navigate('/dashboard/utilisateurs')}
            style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Voir tout →
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="premium-table">
            <thead>
              <tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Statut</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Chargement...</td></tr>
              ) : utilisateurs.slice(0, 8).map(u => {
                const color = ROLE_COLORS[u.role] || '#6B7280';
                return (
                  <tr key={u._id || u.id}>
                    <td style={{ fontWeight: 600 }}>{u.nom} {u.prenom}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</td>
                    <td>
                      <span style={{ background: `${color}15`, color, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        background: u.etat === 'ACTIF' ? '#F0FDF4' : '#FEF2F2',
                        color: u.etat === 'ACTIF' ? '#16A34A' : '#DC2626',
                        borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700,
                      }}>{u.etat}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
