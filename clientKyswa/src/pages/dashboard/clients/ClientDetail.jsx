import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../api/axios';
import Modal from '../../../components/Modal';
import { toast } from '../../../components/Toast';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchClient = async () => {
    try {
      const res = await api.get(`/clients/${id}`);
      setClient(res.data.client);
      setDocuments(res.data.documents || []);
      setForm({
        nom: res.data.client.nom || '',
        prenom: res.data.client.prenom || '',
        telephone: res.data.client.telephone || '',
        email: res.data.client.email || '',
        adresse: res.data.client.adresse || '',
        numeroCNI: res.data.client.numeroCNI || '',
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchClient(); }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/clients/${id}`, form);
      await fetchClient();
      setShowEdit(false);
      toast('Client modifié avec succès');
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur', 'error');
    } finally { setSaving(false); }
  };

  if (loading) return <p style={{ color: 'var(--text-muted)', padding: 32 }}>Chargement...</p>;
  if (!client) return <p style={{ color: 'var(--danger)', padding: 32 }}>Client introuvable</p>;

  return (
    <div className="animate-fade-in" style={{ maxWidth: 700 }}>
      <button onClick={() => navigate('/dashboard/clients')}
        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4 }}>
        ← Retour aux clients
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text-main)' }}>
          {client.prenom} {client.nom}
        </h1>
        <button onClick={() => setShowEdit(true)} className="btn-secondary" style={{ fontSize: 13 }}>
          ✏️ Modifier
        </button>
      </div>

      {/* Infos */}
      <div className="premium-card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, marginBottom: 16, color: 'var(--text-main)' }}>
          Informations
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            ['Passeport', client.numeroPasseport],
            ['CNI', client.numeroCNI || '—'],
            ['Téléphone', client.telephone || '—'],
            ['Email', client.email || '—'],
            ['Adresse', client.adresse || '—'],
            ['Date naissance', fmtDate(client.dateNaissance)],
            ['Lieu naissance', client.lieuNaissance || '—'],
            ['Créé le', fmtDate(client.dateCreation)],
          ].map(([label, value]) => (
            <div key={label}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</p>
              <p style={{ fontSize: 14, color: 'var(--text-main)' }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Documents */}
      <div className="premium-card">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, marginBottom: 12, color: 'var(--text-main)' }}>
          Documents ({documents.length})
        </h2>
        {documents.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Aucun document</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {documents.map(d => (
              <div key={d._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>{d.type}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{fmtDate(d.dateCreation)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className={`badge ${d.statut === 'VALIDE' ? 'badge-success' : d.statut === 'REFUSE' ? 'badge-danger' : d.statut === 'EXPIREE' ? 'badge-neutral' : 'badge-warning'}`}>
                    {d.statut}
                  </span>
                  <a href={d.cheminFichier} target="_blank" rel="noreferrer"
                    style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>Voir</a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal modification */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Modifier le client">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[['nom','Nom *'],['prenom','Prénom *'],['telephone','Téléphone'],['email','Email'],['adresse','Adresse'],['numeroCNI','N° CNI']].map(([k,l]) => (
              <div key={k}>
                <label className="input-label">{l}</label>
                <input value={form[k] || ''} onChange={e => setForm(f => ({...f,[k]:e.target.value}))} className="premium-input" />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setShowEdit(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Enregistrement...' : 'Sauvegarder'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
