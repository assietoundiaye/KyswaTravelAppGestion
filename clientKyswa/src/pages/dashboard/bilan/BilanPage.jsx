import { useEffect, useState, useRef } from 'react';
import { Calendar, Clock, Users, TrendingUp } from 'lucide-react';
import api from '../../../api/axios';

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

// ── Countdown temps réel ──────────────────────────────────────────────────────
function Countdown({ dateDepart }) {
  const [tick, setTick] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    ref.current = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(ref.current);
  }, []);

  if (!dateDepart) return null;

  const diff = new Date(dateDepart) - new Date();

  if (diff <= 0) {
    return (
      <span style={{ background: '#F3F4F6', color: '#6B7280', borderRadius: 8, padding: '4px 10px', fontSize: 12, fontWeight: 700 }}>
        Départ passé
      </span>
    );
  }

  const totalSec = Math.floor(diff / 1000);
  const jours   = Math.floor(totalSec / 86400);
  const heures  = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const secondes = totalSec % 60;

  const urgColor = jours <= 7 ? '#DC2626' : jours <= 30 ? '#D97706' : '#16A34A';
  const urgBg    = jours <= 7 ? '#FEF2F2' : jours <= 30 ? '#FFFBEB' : '#F0FDF4';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <Clock size={13} color={urgColor} />
      <span style={{ background: urgBg, color: urgColor, borderRadius: 8, padding: '4px 12px', fontSize: 13, fontWeight: 800, fontFamily: 'var(--font-display)', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
        {jours > 0 && `${jours}j `}
        {String(heures).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(secondes).padStart(2, '0')}
      </span>
      {jours <= 7 && (
        <span style={{ background: '#FEF2F2', color: '#DC2626', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>
          URGENT
        </span>
      )}
    </div>
  );
}

export default function BilanPage() {
  const [bilans, setBilans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/bilan')
      .then(r => setBilans(r.data.bilans || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: 'var(--text-muted)', padding: 32 }}>Chargement...</p>;

  return (
    <div className="animate-fade-in space-y-5">
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text-main)' }}>
        Bilan Départs
      </h1>

      {bilans.length === 0 && (
        <div className="premium-card" style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
          Aucun départ disponible
        </div>
      )}

      {bilans.map(({ package: pkg, nbInscrits, quotaMax, tauxRemplissage, totalDu, totalEncaisse, resteTotal, parStatut }) => {
        const statutStyle = {
          OUVERT:  { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0' },
          COMPLET: { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
          TERMINE: { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE' },
          ANNULE:  { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' },
        }[pkg.statut] || { bg: '#F3F4F6', color: '#6B7280', border: '#E5E7EB' };

        const barColor = tauxRemplissage >= 90 ? '#DC2626' : tauxRemplissage >= 70 ? '#D97706' : '#16A34A';

        return (
          <div key={pkg._id} className="premium-card">
            {/* En-tête du départ */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                    {pkg.nomReference}
                  </h2>
                  <span style={{ background: statutStyle.bg, color: statutStyle.color, border: `1px solid ${statutStyle.border}`, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                    {pkg.statut}
                  </span>
                  <span style={{ background: '#EFF6FF', color: '#2563EB', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                    {pkg.type}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                  <Calendar size={12} />
                  <span>{fmtDate(pkg.dateDepart)} — {fmtDate(pkg.dateRetour)}</span>
                </div>
              </div>

              {/* Countdown temps réel */}
              <Countdown dateDepart={pkg.dateDepart} />
            </div>

            {/* Taux de remplissage */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Users size={12} /> Taux de remplissage
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: barColor }}>
                  {nbInscrits}/{quotaMax} places ({tauxRemplissage}%)
                </span>
              </div>
              <div style={{ height: 8, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${Math.min(tauxRemplissage, 100)}%`,
                  background: barColor, borderRadius: 4, transition: 'width 0.5s',
                }} />
              </div>
            </div>

            {/* Financier */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
              {[
                { label: 'Total dû',  value: fmt(totalDu),       color: 'var(--text-main)', icon: TrendingUp },
                { label: 'Encaissé', value: fmt(totalEncaisse),  color: '#16A34A',           icon: TrendingUp },
                { label: 'Reste',    value: fmt(resteTotal),     color: resteTotal > 0 ? '#DC2626' : '#16A34A', icon: TrendingUp },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ textAlign: 'center', padding: '12px 10px', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }}>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase' }}>{label}</p>
                  <p style={{ fontWeight: 800, fontSize: 15, color, fontFamily: 'var(--font-display)' }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Répartition par statut client */}
            {Object.keys(parStatut).length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.entries(parStatut).map(([s, n]) => {
                  const colors = {
                    INSCRIT:  { bg: '#EFF6FF', color: '#2563EB' },
                    CONFIRME: { bg: '#F0FDF4', color: '#16A34A' },
                    PARTI:    { bg: '#F5F3FF', color: '#7C3AED' },
                    RENTRE:   { bg: '#F0FDF4', color: '#059669' },
                    DESISTE:  { bg: '#FEF2F2', color: '#DC2626' },
                    ANNULE:   { bg: '#F3F4F6', color: '#6B7280' },
                  }[s] || { bg: '#F3F4F6', color: '#6B7280' };
                  return (
                    <span key={s} style={{ background: colors.bg, color: colors.color, borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 700 }}>
                      {s} · {n}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
