import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart2 } from 'lucide-react';
import { ResponsiveContainer, LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import api from '../../core/api/axios';
import DashboardShared from '../../components/DashboardShared';
import usePermissions from '../../hooks/usePermissions';

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

const MONTH_SHORT = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

// ── Line chart pour les données comptables ──────────────────────────────────────────
const SERIES_COLORS = {
  Paiements: '#16A34A',
  Encaissements: '#2563EB',
  Recouvrements: '#DC2626',
};

function ComptabiliteChart({ seriesData }) {
  // Convertir les données pour Recharts
  const normalize = (raw) => {
    const arr = Array(12).fill(0);
    (raw || []).forEach(d => {
      const idx = (d._id?.mois || d.mois || 1) - 1;
      if (idx >= 0 && idx < 12) arr[idx] = d.montant || d.count || 0;
    });
    return arr;
  };

  const chartData = MONTH_SHORT.map((mois, i) => ({
    mois,
    Paiements: normalize(seriesData.Paiements)[i] || 0,
    Encaissements: normalize(seriesData.Encaissements)[i] || 0,
    Recouvrements: normalize(seriesData.Recouvrements)[i] || 0,
  }));

  return (
    <div className="premium-card" style={{ padding: 24, marginTop: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <div style={{ 
          width: 32, height: 32, borderRadius: '50%', 
          background: 'rgba(0,103,79,0.1)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center' 
        }}>
          <BarChart2 size={18} color="var(--primary)" />
        </div>
        <h3 style={{ 
          fontFamily: 'var(--font-display)', 
          fontSize: 16, 
          fontWeight: 700, 
          color: 'var(--text-main)',
          margin: 0
        }}>
          Évolution comptable — {new Date().getFullYear()}
        </h3>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <RechartsLineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,103,79,0.08)" />
          <XAxis dataKey="mois" tick={{ fontSize: 11, fill: '#6B7280' }} />
          <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ background: 'var(--bg-card)', border: '1px solid rgba(0,103,79,0.1)', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ fontWeight: 700, color: 'var(--text-main)' }}
            formatter={(value) => [fmt(value), '']}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
          <Line type="monotone" dataKey="Paiements" stroke={SERIES_COLORS.Paiements} strokeWidth={2.5} dot={{ r: 3.5, fill: SERIES_COLORS.Paiements }} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="Encaissements" stroke={SERIES_COLORS.Encaissements} strokeWidth={2.5} dot={{ r: 3.5, fill: SERIES_COLORS.Encaissements }} activeDot={{ r: 5 }} />
          <Line type="monotone" dataKey="Recouvrements" stroke={SERIES_COLORS.Recouvrements} strokeWidth={2.5} dot={{ r: 3.5, fill: SERIES_COLORS.Recouvrements }} activeDot={{ r: 5 }} />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}

function KpiCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: 'white', borderRadius: 'var(--radius-lg)', padding: '28px 24px',
      boxShadow: 'var(--shadow-sm)', border: `1.5px solid ${color}30`,
      borderLeft: `4px solid ${color}`,
      flex: '1 1 200px',
    }}>
      <p style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{label}</p>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 900, color, lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>{sub}</p>}
    </div>
  );
}

export default function DashboardComptable() {
  const navigate = useNavigate();
  const { canViewModule, hasPermission } = usePermissions();
  const [reservations, setReservations] = useState([]);
  const [billets, setBillets] = useState([]);
  const [chartData, setChartData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/reservations'),
      api.get('/billets'),
      api.get('/stats').catch(() => ({ data: {} }))
    ])
      .then(([r, b, stats]) => {
        setReservations(r.data.reservations || []);
        setBillets(b.data.billets || []);
        
        // Données pour le graphique comptable
        const s = stats.data || {};
        setChartData({
          Paiements: s.paiementsParMois || [],
          Encaissements: s.encaissementsParMois || s.paiementsParMois || [],
          Recouvrements: s.recouvrementsParMois || [],
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const allPaiements = useMemo(() => {
    const fromResa = reservations.flatMap(r =>
      (r.paiements || []).map(p => ({
        ...p, entite: `Résa ${r.numero || r.idReservation}`,
        montantNum: p.montant ? parseFloat(p.montant.toString()) : 0,
      }))
    );
    const fromBillets = billets.flatMap(b =>
      (b.paiements || []).map(p => ({
        ...p, entite: `Billet ${b.numeroBillet}`,
        montantNum: p.montant ? parseFloat(p.montant.toString()) : 0,
      }))
    );
    return [...fromResa, ...fromBillets].sort((a, b) => new Date(b.dateReglement) - new Date(a.dateReglement));
  }, [reservations, billets]);

  const now = new Date();
  const totalCeMois = allPaiements
    .filter(p => { const d = new Date(p.dateReglement); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
    .reduce((s, p) => s + p.montantNum, 0);

  const resteGlobal = reservations.reduce((s, r) => s + (r.resteAPayer || 0), 0) + billets.reduce((s, b) => s + (b.resteAPayer || 0), 0);
  const totalEncaisse = allPaiements.reduce((s, p) => s + p.montantNum, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingTop: 32 }}>
      {/* KPI */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <KpiCard label="Encaissé ce mois" value={fmt(totalCeMois)} color="var(--primary)" />
        <KpiCard label="Total encaissé" value={fmt(totalEncaisse)} color="#16A34A" />
        <KpiCard label="Reste à payer global" value={fmt(resteGlobal)} color="#DC2626" sub={`${reservations.filter(r => r.resteAPayer > 0).length} dossiers ouverts`} />
        <KpiCard label="Paiements enregistrés" value={allPaiements.length} color="#2563EB" />
      </div>

      {/* Actions rapides */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {hasPermission('paiements', 'create') && (
          <button onClick={() => navigate('/dashboard/paiements')} className="btn-primary">+ Enregistrer paiement</button>
        )}
        {canViewModule('comptabilite') && (
          <button onClick={() => navigate('/dashboard/comptabilite')} className="btn-secondary">Comptabilité</button>
        )}
        {canViewModule('recouvrement') && (
          <button onClick={() => navigate('/dashboard/recouvrement')} className="btn-secondary">Recouvrement</button>
        )}
      </div>

      {/* Graphique comptable */}
      <ComptabiliteChart seriesData={chartData} />

      {/* Paiements récents */}
      <div className="premium-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700 }}>Paiements récents</h2>
          {canViewModule('paiements') && (
            <button onClick={() => navigate('/dashboard/paiements')} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Voir tout</button>
          )}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="premium-table">
            <thead>
              <tr><th>Date</th><th>Entité</th><th>Mode</th><th>Référence</th><th>Montant</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Chargement...</td></tr>
              ) : allPaiements.slice(0, 15).map((p, i) => (
                <tr key={i}>
                  <td style={{ fontSize: 12 }}>{fmtDate(p.dateReglement)}</td>
                  <td style={{ fontSize: 12, fontWeight: 600 }}>{p.entite}</td>
                  <td><span style={{ background: '#F0FDF4', color: '#16A34A', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{p.mode}</span></td>
                  <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.reference || '—'}</td>
                  <td style={{ fontWeight: 700, color: '#16A34A' }}>{fmt(p.montantNum)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <DashboardShared />
    </div>
  );
}
