import { useEffect, useState } from 'react';
import api from '../../../api/axios';

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA';

export default function SimulateurPage() {
  const [packages, setPackages] = useState([]);
  const [form, setForm] = useState({ packageKId: '', typeChambre: 'DOUBLE', nombrePersonnes: 1, supplements: [] });
  const [result, setResult] = useState(null);
  const [selectedPkg, setSelectedPkg] = useState(null);

  useEffect(() => {
    api.get('/packages').then(r => setPackages(r.data.packages || [])).catch(console.error);
  }, []);

  const onPkgChange = (id) => {
    const pkg = packages.find(p => p._id === id);
    setSelectedPkg(pkg);
    setForm(f => ({ ...f, packageKId: id }));
    setResult(null);
  };

  const getPrixChambre = () => {
    if (!selectedPkg) return 0;
    const map = { SINGLE: selectedPkg.prixSingle, DOUBLE: selectedPkg.prixDouble, TRIPLE: selectedPkg.prixTriple, QUADRUPLE: selectedPkg.prixQuadruple };
    return parseFloat(map[form.typeChambre] || selectedPkg.prixEco || 0);
  };

  const simuler = () => {
    if (!selectedPkg) return;
    const prixChambre = getPrixChambre();
    const totalParPersonne = prixChambre;
    const totalGeneral = totalParPersonne * form.nombrePersonnes;
    setResult({ prixChambre, totalParPersonne, totalGeneral, nombrePersonnes: form.nombrePersonnes, typeChambre: form.typeChambre, package: selectedPkg.nomReference });
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 600 }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text-main)', marginBottom: 20 }}>
        Simulateur de prix
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>
        Calculez le coût d'un voyage sans créer d'inscription.
      </p>

      <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label className="input-label">Package / Départ *</label>
          <select value={form.packageKId} onChange={e => onPkgChange(e.target.value)} className="premium-input">
            <option value="">Sélectionner un départ...</option>
            {packages.filter(p => p.statut === 'OUVERT').map(p => (
              <option key={p._id} value={p._id}>{p.nomReference} — {p.type}</option>
            ))}
          </select>
        </div>

        {selectedPkg && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label className="input-label">Type de chambre</label>
                <select value={form.typeChambre} onChange={e => setForm(f => ({...f, typeChambre: e.target.value}))} className="premium-input">
                  {['SINGLE','DOUBLE','TRIPLE','QUADRUPLE'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="input-label">Nombre de personnes</label>
                <input type="number" min="1" max="10" value={form.nombrePersonnes}
                  onChange={e => setForm(f => ({...f, nombrePersonnes: Number(e.target.value)}))}
                  className="premium-input" />
              </div>
            </div>

            {/* Prix disponibles */}
            <div style={{ background: 'var(--bg-main)', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Prix par chambre</p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {[['SINGLE', selectedPkg.prixSingle], ['DOUBLE', selectedPkg.prixDouble], ['TRIPLE', selectedPkg.prixTriple], ['QUADRUPLE', selectedPkg.prixQuadruple]].map(([t, p]) => p && (
                  <span key={t} style={{ fontSize: 12, color: form.typeChambre === t ? 'var(--primary)' : 'var(--text-muted)', fontWeight: form.typeChambre === t ? 700 : 400 }}>
                    {t}: {fmt(p)}
                  </span>
                ))}
              </div>
            </div>

            <button onClick={simuler} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Calculer le prix
            </button>
          </>
        )}
      </div>

      {result && (
        <div className="premium-card" style={{ marginTop: 20, background: 'var(--primary)', color: 'white' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, marginBottom: 16 }}>
            Résultat de la simulation
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              ['Package', result.package],
              ['Type chambre', result.typeChambre],
              ['Prix/chambre', fmt(result.prixChambre)],
              ['Nb personnes', result.nombrePersonnes],
            ].map(([l, v]) => (
              <div key={l}>
                <p style={{ fontSize: 11, opacity: 0.7, marginBottom: 2 }}>{l}</p>
                <p style={{ fontWeight: 700, fontSize: 14 }}>{v}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.2)', textAlign: 'center' }}>
            <p style={{ fontSize: 12, opacity: 0.7 }}>TOTAL ESTIMÉ</p>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 900 }}>{fmt(result.totalGeneral)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
