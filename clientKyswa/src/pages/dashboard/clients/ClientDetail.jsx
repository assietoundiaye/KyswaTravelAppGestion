import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download } from 'lucide-react';
import api from '../../../api/axios';
import Modal from '../../../components/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { toast } from '../../../components/Toast';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

const DOC_TYPES = ['PASSEPORT', 'VISA', 'BILLET_ELECTRONIQUE', 'CERTIFICAT', 'AUTRE'];
const DOC_STATUTS = ['EN_ATTENTE', 'VALIDE', 'REFUSE', 'EXPIREE'];
const STATUT_COLORS = {
  VALIDE: { bg: '#F0FDF4', color: '#16A34A' },
  REFUSE: { bg: '#FEF2F2', color: '#DC2626' },
  EXPIREE: { bg: '#F3F4F6', color: '#6B7280' },
  EN_ATTENTE: { bg: '#FFFBEB', color: '#D97706' },
};

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [docForm, setDocForm] = useState({ type: 'PASSEPORT', file: null });
  const [uploading, setUploading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchClient = async () => {
    try {
      const res = await api.get(`/clients/${id}`);
      setClient(res.data.client);
      setDocuments(res.data.documents || []);
      const c = res.data.client;
      setForm({
        nom: c.nom || '',
        prenom: c.prenom || '',
        telephone: c.telephone || '',
        email: c.email || '',
        adresse: c.adresse || '',
        numeroCNI: c.numeroCNI || '',
        dateNaissance: c.dateNaissance ? c.dateNaissance.substring(0, 10) : '',
        lieuNaissance: c.lieuNaissance || '',
        dateExpirationPasseport: c.dateExpirationPasseport ? c.dateExpirationPasseport.substring(0, 10) : '',
        niveauFidelite: c.niveauFidelite || 'BRONZE',
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

  const handleDocUpload = async (e) => {
    e.preventDefault();
    if (!docForm.file) return toast('Veuillez sélectionner un fichier', 'error');
    setUploading(true);
    try {
      const data = new FormData();
      data.append('file', docForm.file);
      data.append('type', docForm.type);
      data.append('clientId', id);
      await api.post('/documents/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast('Document ajouté');
      setShowDocModal(false);
      setDocForm({ type: 'PASSEPORT', file: null });
      fetchClient();
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur upload', 'error');
    } finally { setUploading(false); }
  };

  const updateDocStatut = async (docId, statut) => {
    try {
      await api.patch(`/documents/${docId}`, { statut });
      fetchClient();
    } catch { toast('Erreur mise à jour statut', 'error'); }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const data = new FormData();
      data.append('photo', file);
      await api.post(`/clients/${id}/photo`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast('Photo mise à jour');
      fetchClient();
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur upload photo', 'error');
    } finally { setUploadingPhoto(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/clients/${id}`);
      toast('Client supprimé');
      navigate('/dashboard/clients');
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur lors de la suppression', 'error');
    } finally { setDeleting(false); setConfirmDelete(false); }
  };

  if (loading) return <p style={{ color: 'var(--text-muted)', padding: 32 }}>Chargement...</p>;
  if (!client) return <p style={{ color: 'var(--danger)', padding: 32 }}>Client introuvable</p>;

  return (
    <div className="animate-fade-in" style={{ maxWidth: 700 }}>
      <button onClick={() => navigate('/dashboard/clients')}
        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4 }}>
        Retour aux clients
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text-main)' }}>
          {client.prenom} {client.nom}
        </h1>
        <button onClick={() => setShowEdit(true)} className="btn-secondary" style={{ fontSize: 13 }}>
          Modifier
        </button>
        <button
          onClick={() => setConfirmDelete(true)}
          style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '6px 14px', color: '#DC2626', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          Supprimer
        </button>
      </div>

      {/* Infos */}
      <div className="premium-card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, marginBottom: 16, color: 'var(--text-main)' }}>
          Informations
        </h2>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 20 }}>
          {/* Photo de profil */}
          <label style={{ cursor: 'pointer', flexShrink: 0 }} title="Cliquer pour changer la photo">
            <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} onChange={handlePhotoChange} disabled={uploadingPhoto} />
            <div style={{
              width: 96, height: 96, borderRadius: 12, overflow: 'hidden',
              background: 'var(--bg-main)', border: '2px dashed var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', transition: 'border-color 0.15s',
            }}>
              {client.photoUrl ? (
                <img src={client.photoUrl} alt="Photo client" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 28 }}></div>
                  <p style={{ fontSize: 10, marginTop: 4 }}>Photo</p>
                </div>
              )}
              {uploadingPhoto && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 20, height: 20, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                </div>
              )}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                background: 'rgba(0,0,0,0.45)', color: 'white',
                fontSize: 10, textAlign: 'center', padding: '3px 0',
                opacity: 0, transition: 'opacity 0.15s',
              }} className="photo-overlay">Modifier</div>
            </div>
          </label>
          {/* Nom + fidélité */}
          <div style={{ paddingTop: 4 }}>
            <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main)' }}>{client.prenom} {client.nom}</p>
            <span style={{
              display: 'inline-block', marginTop: 6,
              background: { BRONZE: '#FEF3C7', ARGENT: '#F1F5F9', OR: '#FEF9C3', PLATINE: '#F0F9FF' }[client.niveauFidelite] || '#F3F4F6',
              color: { BRONZE: '#92400E', ARGENT: '#475569', OR: '#854D0E', PLATINE: '#0369A1' }[client.niveauFidelite] || '#6B7280',
              borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 700,
            }}>{client.niveauFidelite || 'BRONZE'}</span>
          </div>
        </div>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>
            Documents ({documents.length})
          </h2>
          <button onClick={() => setShowDocModal(true)} className="btn-primary" style={{ fontSize: 12, padding: '5px 12px' }}>
            + Ajouter
          </button>
        </div>
        {documents.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Aucun document</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {documents.map(d => {
              const s = STATUT_COLORS[d.statut] || STATUT_COLORS.EN_ATTENTE;
              return (
                <div key={d._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>{d.type}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>{fmtDate(d.dateCreation)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <select
                      value={d.statut}
                      onChange={e => updateDocStatut(d._id, e.target.value)}
                      style={{ background: s.bg, color: s.color, border: 'none', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                    >
                      {DOC_STATUTS.map(st => <option key={st} value={st}>{st}</option>)}
                    </select>
                    <a href={d.cheminFichier} target="_blank" rel="noreferrer"
                      style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>Voir</a>
                    <a href={d.cheminFichier} download
                      style={{ fontSize: 12, color: '#2563EB', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <Download size={12} /> Télécharger</a>
                    <button
                      onClick={async () => {
                        if (!window.confirm('Supprimer ce document ?')) return;
                        try {
                          await api.delete(`/documents/${d._id}`);
                          toast('Document supprimé');
                          fetchClient();
                        } catch (err) {
                          toast(err.response?.data?.message || 'Erreur', 'error');
                        }
                      }}
                      style={{ background: 'none', border: 'none', color: '#DC2626', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal ajout document */}
      <Modal open={showDocModal} onClose={() => setShowDocModal(false)} title="Ajouter un document">
        <form onSubmit={handleDocUpload} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="input-label">Type de document *</label>
            <select value={docForm.type} onChange={e => setDocForm(f => ({ ...f, type: e.target.value }))} className="premium-input">
              {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">Fichier * (PDF, image, Word — max 10 Mo)</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
              onChange={e => setDocForm(f => ({ ...f, file: e.target.files[0] || null }))}
              className="premium-input"
              required
            />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setShowDocModal(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={uploading} className="btn-primary">
              {uploading ? 'Upload...' : 'Ajouter'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal modification client */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Modifier le client">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Identité */}
          <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Identité</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[['nom','Nom *'],['prenom','Prénom *']].map(([k,l]) => (
              <div key={k}>
                <label className="input-label">{l}</label>
                <input value={form[k] || ''} onChange={e => setForm(f => ({...f,[k]:e.target.value}))} className="premium-input" required />
              </div>
            ))}
            <div>
              <label className="input-label">Date de naissance</label>
              <input type="date" value={form.dateNaissance || ''} onChange={e => setForm(f => ({...f, dateNaissance: e.target.value}))} className="premium-input" />
            </div>
            <div>
              <label className="input-label">Lieu de naissance</label>
              <input value={form.lieuNaissance || ''} onChange={e => setForm(f => ({...f, lieuNaissance: e.target.value}))} className="premium-input" />
            </div>
          </div>

          {/* Contact */}
          <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Contact</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label className="input-label">Téléphone</label>
              <input value={form.telephone || ''} onChange={e => setForm(f => ({...f, telephone: e.target.value}))} className="premium-input" />
            </div>
            <div>
              <label className="input-label">Email</label>
              <input type="email" value={form.email || ''} onChange={e => setForm(f => ({...f, email: e.target.value}))} className="premium-input" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="input-label">Adresse</label>
              <input value={form.adresse || ''} onChange={e => setForm(f => ({...f, adresse: e.target.value}))} className="premium-input" />
            </div>
          </div>

          {/* Documents */}
          <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Documents</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label className="input-label">Expiration passeport</label>
              <input type="date" value={form.dateExpirationPasseport || ''} onChange={e => setForm(f => ({...f, dateExpirationPasseport: e.target.value}))} className="premium-input" />
            </div>
            <div>
              <label className="input-label">N° CNI</label>
              <input value={form.numeroCNI || ''} onChange={e => setForm(f => ({...f, numeroCNI: e.target.value}))} className="premium-input" />
            </div>
            <div>
              <label className="input-label">Niveau fidélité</label>
              <select value={form.niveauFidelite || 'BRONZE'} onChange={e => setForm(f => ({...f, niveauFidelite: e.target.value}))} className="premium-input">
                {['BRONZE', 'ARGENT', 'OR', 'PLATINE'].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setShowEdit(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Enregistrement...' : 'Sauvegarder'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        message={`Supprimer définitivement ${client.prenom} ${client.nom} ? Cette action est irréversible.`}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
