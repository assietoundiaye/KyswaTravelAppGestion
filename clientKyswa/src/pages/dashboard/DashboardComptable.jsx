import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import DashboardShared from '../../components/DashboardShared';

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

function KpiCard({ label, value, sub, color, icon }) {
  return (
    <div style={{
      background: 'white', borderRadius: 'var(--radius-xl)', padding: '20px 24px',
      boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)',
      borderLeft: `4px solid ${color}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 6 }}>{label}</p>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 900, color: 'var(--text-main)', lineHeight: 1 }}>{value}</p>
          {sub && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{sub}</p>}
        </div>
        <span style={{ fontSize: 26 }}>{icon}</span>
      </div>
    </div>
  );
}

export default function DashboardComptable() {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [billets, setBillets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/reservations'), api.get('/billets')])
      .then(([r, b]) => {
        setReservations(r.data.reservations || []);
        setBillets(b.data.billets || []);
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <KpiCard label="Encaissé ce mois" value={fmt(totalCeMois)} icon="📅" color="var(--primary)" />
        <KpiCard label="Total encaissé" value={fmt(totalEncaisse)} icon="✅" color="#16A34A" />
        <KpiCard label="Reste à payer global" value={fmt(resteGlobal)} icon="⏳" color="#DC2626" sub={`${reservations.filter(r => r.resteAPayer > 0).length} dossiers ouverts`} />
        <KpiCard label="Paiements enregistrés" value={allPaiements.length} icon="💳" color="#2563EB" />
      </div>

      {/* Actions rapides */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        <button onClick={() => navigate('/dashboard/paiements')} className="btn-primary">+ Enregistrer paiement</button>
        <button onClick={() => navigate('/dashboard/comptabilite')} className="btn-secondary">Comptabilité</button>
        <button onClick={() => navigate('/dashboard/recouvrement')} className="btn-secondary">Recouvrement</button>
      </div>

      {/* Paiements récents */}
      <div className="premium-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700 }}>Paiements récents</h2>
          <button onClick={() => navigate('/dashboard/paiements')} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Voir tout →</button>
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
