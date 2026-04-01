import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../api/axios';

export default function RechercheAvancee() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nom: '', prenom: '', telephone: '', email: '', passeport: '' });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSearched(true);
    try {
      const params = {};
      if (form.passeport) params.passeport = form.passeport;
      const searchTerms = [form.nom, form.prenom, form.telephone, form.email].filter(Boolean);
      if (searchTerms.length > 0) params.search = searchTerms[0];

      const res = await api.get('/clients', { params });
      let clients = res.data.clients || [];

      // Filtrage côté client pour les critères multiples
      if (form.nom) clients = clients.filter(c => c.nom.toLowerCase().includes(form.nom.toLowerCase()));
      if (form.prenom) clients = clients.filter(c => c.prenom.toLowerCase().includes(form.prenom.toLowerCase()));
      if (form.telephone) clients = clients.filter(c => c.telephone?.includes(form.telephone));
      if (form.email) clients = clients.filter(c => c.email?.toLowerCase().includes(form.email.toLowerCase()));

      setResults(clients);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const reset = () => {
    setForm({ nom: '', prenom: '', telephone: '', email: '', passeport: '' });
    setResults([]);
    setSearched(false);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 800 }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text-main)', marginBottom: 20 }}>
        Recherche avancée
      </h1>

      <form onSubmit={handleSearch} className="premium-card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, marginBottom: 16, color: 'var(--text-main)' }}>
          Critères de recherche
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[
            ['nom', 'Nom'],
            ['prenom', 'Prénom'],
            ['telephone', 'Téléphone'],
            ['email', 'Email'],
            ['passeport', 'N° Passeport'],
          ].map(([k, l]) => (
            <div key={k} style={k === 'passeport' ? { gridColumn: '1 / -1' } : {}}>
              <label className="input-label">{l}</label>
              <input value={form[k]} onChange={e => setForm(f => ({...f, [k]: e.target.value}))}
                className="premium-input" placeholder={`Rechercher par ${l.toLowerCase()}...`} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Recherche...' : '🔍 Rechercher'}
          </button>
          <button type="button" onClick={reset} className="btn-secondary">Réinitialiser</button>
        </div>
      </form>

      {searched && (
        <div className="premium-card">
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
            {results.length} résultat(s) trouvé(s)
          </p>
          {results.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>Aucun client trouvé</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {results.map(c => (
                <div key={c._id} onClick={() => navigate(`/dashboard/clients/${c._id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-main)', border: '1px solid var(--border-light)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-light)'}
                >
                  <div>
                    <p style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: 14 }}>{c.nom} {c.prenom}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {c.numeroPasseport} {c.telephone ? `· ${c.telephone}` : ''} {c.email ? `· ${c.email}` : ''}
                    </p>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>Voir →</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
