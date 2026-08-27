import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../core/api/axios';
import { ROLE_LABELS, ROLE_COLORS } from '../../../utils/roles';
import { ResponsiveContainer, BarChart as RechartsBarChart, PieChart as RechartsPieChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Pie } from 'recharts';

// ── KPI card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, color, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'white',
        borderRadius: 'var(--radius-lg)',
        padding: '28px 24px',
        borderLeft: `4px solid ${color}`,
        border: `1.5px solid ${color}30`,
        boxShadow: 'var(--shadow-sm)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.12s, box-shadow 0.12s',
        flex: '1 1 160px',
      }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; } }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}
    >
      <p style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{label}</p>
      <p style={{ fontSize: 26, fontWeight: 800, color, fontFamily: 'var(--font-display)', lineHeight: 1 }}>{value}</p>
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

  // Formatter les données pour Recharts
  const chartData = MOIS.map((mois, idx) => ({
    mois,
    Utilisateurs: usersPerMonth[idx],
    Départs: pkgPerMonth[idx],
    Rapports: rapPerMonth[idx],
  }));

  const seriesColors = {
    Utilisateurs: '#6B7280',
    Départs: '#00674F',
    Rapports: '#2563EB',
  };

  return (
    <div className="premium-card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>
          Activité mensuelle — {new Date().getFullYear()}
        </h2>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <RechartsBarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 36 }}>
          <CartesianGrid strokeDasharray="4 3" stroke="#E5E7EB" />
          <XAxis dataKey="mois" tick={{ fontSize: 10, fill: '#9CA3AF' }} />
          <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} allowDecimals={false} />
          <Tooltip 
            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: 'var(--text-main)' }}
          />
          <Bar dataKey="Utilisateurs" fill={seriesColors.Utilisateurs} radius={[2, 2, 0, 0]} />
          <Bar dataKey="Départs" fill={seriesColors.Départs} radius={[2, 2, 0, 0]} />
          <Bar dataKey="Rapports" fill={seriesColors.Rapports} radius={[2, 2, 0, 0]} />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Diagramme circulaire Recharts (répartition des rôles) ─────────────────────────
function PieChartComponent({ data, title }) {
  if (!data || data.length === 0) return null;

  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  return (
    <div className="premium-card" style={{ padding: 24 }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text-main)', marginBottom: 16 }}>
        {title}
      </h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        <ResponsiveContainer width={200} height={200}>
          <RechartsPieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </RechartsPieChart>
        </ResponsiveContainer>
        {/* Légende */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {data.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: item.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--text-main)', fontWeight: 600 }}>{item.label}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 900, color: item.color, fontFamily: 'var(--font-display)' }}>{item.value}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>({Math.round(item.value / total * 100)}%)</span>
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

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text-main)' }}>
          Statistiques
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate('/dashboard/utilisateurs')} className="btn-primary">Gérer les utilisateurs</button>
          <button onClick={() => navigate('/dashboard/audit')} className="btn-secondary">Journal d'audit</button>
          <button onClick={() => navigate('/dashboard/packages')} className="btn-secondary">Gérer les départs</button>
        </div>
      </div>

      {/* KPI */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <KpiCard label="Total comptes" value={loading ? '…' : utilisateurs.length} color="#6B7280"
          onClick={() => navigate('/dashboard/utilisateurs')} />
        <KpiCard label="Comptes actifs" value={loading ? '…' : actifs} color="#16A34A" />
        <KpiCard label="Comptes inactifs" value={loading ? '…' : inactifs} color="#DC2626" />
        <KpiCard label="Total départs" value={loading ? '…' : packages.length} color="var(--primary)"
          onClick={() => navigate('/dashboard/packages')} />
        <KpiCard label="Départs ouverts" value={loading ? '…' : departsOuverts} color="#2563EB" />
        <KpiCard label="Rapports" value={loading ? '…' : rapports.length} color="#7C3AED"
          onClick={() => navigate('/dashboard/rapports')} />
      </div>

      {/* Graphe en barres */}
      {!loading && <BarChart utilisateurs={utilisateurs} packages={packages} rapports={rapports} />}

      {/* Diagrammes circulaires côte à côte */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <PieChartComponent data={pieRoles} title="Répartition des comptes par rôle" />
          <PieChartComponent data={pieStatuts} title="Statut des comptes (Actifs / Inactifs)" />
        </div>
      )}

      {/* Tableau comptes récents */}
      <div className="premium-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700 }}>Comptes récents</h2>
          <button onClick={() => navigate('/dashboard/utilisateurs')}
            style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            Voir tout
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
