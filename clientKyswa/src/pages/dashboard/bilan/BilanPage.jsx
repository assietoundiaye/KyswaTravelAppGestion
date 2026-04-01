import { useEffect, useState } from 'react';
import api from '../../../api/axios';

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

export default function BilanPage() {
  const [bilans, setBilans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/bilan').then(r => setBilans(r.data.bilans || [])).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: 'var(--text-muted)', padding: 32 }}>Chargement...</p>;

  return (
    <div className="animate-fade-in space-y-5">
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text-main)' }}>Bilan Départs</h1>
      {bilans.map(({ package: pkg, nbInscrits, quotaMax, tauxRemplissage, totalDu, totalEncaisse, resteTotal, parStatut }) => (
        <div key={pkg._id} className="premium-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--text-main)' }}>{pkg.nomReference}</h2>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pkg.type} · {fmtDate(pkg.dateDepart)} → {fmtDate(pkg.dateRetour)}</p>
            </div>
            <span className={`badge ${pkg.statut === 'OUVERT' ? 'badge-success' : pkg.statut === 'COMPLET' ? 'badge-danger' : 'badge-neutral'}`}>{pkg.statut}</span>
          </div>

          {/* Taux remplissage */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Taux de remplissage</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>{nbInscrits}/{quotaMax} ({tauxRemplissage}%)</span>
            </div>
            <div style={{ height: 8, background: 'var(--bg-main)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${tauxRemplissage}%`, background: tauxRemplissage >= 90 ? 'var(--danger)' : tauxRemplissage >= 70 ? 'var(--warning)' : 'var(--primary)', borderRadius: 4, transition: 'width 0.5s' }} />
            </div>
          </div>

          {/* Financier */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[['Total dû', fmt(totalDu), 'var(--text-main)'], ['Encaissé', fmt(totalEncaisse), 'var(--success)'], ['Reste', fmt(resteTotal), resteTotal > 0 ? 'var(--danger)' : 'var(--success)']].map(([l, v, c]) => (
              <div key={l} style={{ textAlign: 'center', padding: '10px', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }}>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{l}</p>
                <p style={{ fontWeight: 800, fontSize: 15, color: c, fontFamily: 'var(--font-display)' }}>{v}</p>
              </div>
            ))}
          </div>

          {/* Par statut */}
          {Object.keys(parStatut).length > 0 && (
            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(parStatut).map(([s, n]) => (
                <span key={s} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'var(--bg-main)', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {s}: {n}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
