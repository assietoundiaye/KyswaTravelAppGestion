import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, CalendarCheck, Ticket, Package } from 'lucide-react';
import api from '../../api/axios';
import DashboardShared from '../../components/DashboardShared';

const MOIS = ['', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

const STATUT_COLORS = {
  EN_ATTENTE: '#D97706', INSCRIT: '#2563EB', CONFIRME: '#059669',
  PARTIEL: '#7C3AED', SOLDE: '#16A34A', ANNULEE: '#DC2626',
  DESISTE: '#EF4444', PAYEE: '#059669',
};

function KpiCard({ label, value, icon: Icon, bg }) {
  return (
    <div style={{
      background: bg, borderRadius: 'var(--radius-xl)', padding: '20px 24px', color: 'white',
      boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
      display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 0,
    }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={22} color="white" />
      </div>
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{label}</p>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 900, lineHeight: 1 }}>{value}</p>
      </div>
    </div>
  );
}

// Graphique en barres avec axes Y et labels
function BarChart({ data, title }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.count), 1);
  // Calcul des graduations Y (0, max/2, max arrondi)
  const ySteps = [0, Math.round(max / 2), max];

  return (
    <div className="premium-card" style={{ padding: 24 }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, marginBottom: 20, color: 'var(--text-main)' }}>
        {title}
      </h2>
      <div style={{ display: 'flex', gap: 0 }}>
        {/* Axe Y */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: 8, paddingBottom: 24, height: 160 }}>
          {[...ySteps].reverse().map((v, i) => (
            <span key={i} style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{v}</span>
          ))}
        </div>
        {/* Barres */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 8, borderLeft: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '8px 8px 0', height: 140 }}>
            {data.map((d, i) => {
              const h = max > 0 ? (d.count / max) * 100 : 0;
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--primary)' }}>{d.count}</span>
                  <div style={{
                    width: '70%', height: `${h}%`, minHeight: d.count > 0 ? 4 : 0,
                    background: 'linear-gradient(180deg, var(--primary) 0%, #00a87a 100%)',
                    borderRadius: '4px 4px 0 0',
                    transition: 'height 0.4s ease',
                  }} />
                </div>
              );
            })}
          </div>
          {/* Axe X */}
          <div style={{ display: 'flex', gap: 8, padding: '4px 8px 0' }}>
            {data.map((d, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>
                  {d._id?.mois ? MOIS[d._id.mois] : (d._id || '')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardAdmin() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/stats')
      .then(r => setStats(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: 'var(--text-muted)', padding: 32 }}>Chargement...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* KPI colorés */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <KpiCard label="Clients" value={stats?.totalClients ?? 0} icon={Users} bg="#2563EB" />
        <KpiCard label="Inscriptions" value={stats?.totalReservations ?? 0} icon={CalendarCheck} bg="#00674F" />
        <KpiCard label="Billets" value={stats?.totalBillets ?? 0} icon={Ticket} bg="#7C3AED" />
        <KpiCard label="Départs" value={stats?.totalPackages ?? 0} icon={Package} bg="#EA580C" />
      </div>

      {/* Graphique inscriptions par statut */}
      {stats?.reservationsParStatut?.length > 0 && (
        <div className="premium-card" style={{ padding: 24 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, marginBottom: 20 }}>
            Inscriptions par statut
          </h2>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            {(() => {
              const maxVal = Math.max(...stats.reservationsParStatut.map(s => s.count), 1);
              return stats.reservationsParStatut.map(s => {
                const color = STATUT_COLORS[s._id] || '#6B7280';
                const h = (s.count / maxVal) * 120;
                return (
                  <div key={s._id} style={{ flex: '1 1 80px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 900, color, fontFamily: 'var(--font-display)' }}>{s.count}</span>
                    <div style={{
                      width: '100%', height: Math.max(h, 4),
                      background: `linear-gradient(180deg, ${color} 0%, ${color}99 100%)`,
                      borderRadius: '6px 6px 0 0',
                      transition: 'height 0.4s ease',
                    }} />
                    <span style={{ fontSize: 9, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                      {s._id?.replace(/_/g, ' ')}
                    </span>
                  </div>
                );
              });
            })()}
          </div>
          {/* Ligne de base */}
          <div style={{ borderTop: '2px solid var(--border)', marginTop: 0 }} />
        </div>
      )}

      {/* Graphique 6 derniers mois avec axes */}
      {stats?.resaParMois?.length > 0 && (
        <BarChart data={stats.resaParMois} title="Inscriptions — 6 derniers mois" />
      )}

      <DashboardShared />
    </div>
  );
}
