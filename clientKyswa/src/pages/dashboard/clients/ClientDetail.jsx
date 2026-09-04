import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Download, ScanLine, CheckCircle, AlertCircle, Phone, Calendar, ChevronRight } from 'lucide-react';
import api from '../../../core/api/axios';
import Modal from '../../../components/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { toast } from '../../../components/Toast';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '—';

const DOC_TYPES = ['PASSEPORT', 'VISA', 'BILLET_ELECTRONIQUE', 'CERTIFICAT', 'PASSEPORT_PHOTO', 'AUTRE'];
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
  const [reservations, setReservations] = useState([]);
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
  // OCR sur document uploadé
  const [ocrScanning, setOcrScanning] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);

  const formatIsoDate = (val) => {
    if (!val) return '';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return '';
      return d.toISOString().substring(0, 10);
    } catch {
      return '';
    }
  };

  const fetchClient = async () => {
    try {
      const res = await api.get(`/clients/${id}`);
      // Le backend retourne { success: true, data: { ...client } }
      const c = res.data.data || res.data.client;
      if (!c) throw new Error('Réponse inattendue du serveur');

      // Normalisation snake_case → camelCase pour rétrocompatibilité avec le template
      const rawGenre = String(c.genre || c.sexe || '').trim().toUpperCase();
      const isFemme = rawGenre.startsWith('F') || rawGenre === 'FEMME';
      const normalizedGenre = isFemme ? 'FEMME' : 'HOMME';

      const normalized = {
        ...c,
        // Identité
        nom: c.nom || '',
        prenom: c.prenom || '',
        genre: normalizedGenre,
        telephone: c.telephone || '',
        email: c.email || '',
        adresse: c.adresse || '',
        ville: c.ville || 'Dakar',
        quartier: c.quartier || '',
        nationalite: c.nationalite || 'Sénégalaise',
        // Champs camelCase attendus par le template (mappés depuis snake_case Supabase)
        numeroPasseport: c.n_passeport || c.numeroPasseport || '',
        naturePasseport: c.nature_passeport || c.naturePasseport || 'Ordinaire',
        numeroCNI: c.numero_cni || c.numeroCNI || '',
        dateNaissance: c.date_naissance || c.dateNaissance || null,
        lieuNaissance: c.lieuNaissance || c.lieu_naissance || '',
        dateExpirationPasseport: c.expiration_passeport || c.dateExpirationPasseport || null,
        niveauFidelite: c.niveau_fidelite || c.niveauFidelite || 'BRONZE',
        photoUrl: c.photo_url || c.photoUrl || null,
        passportUrl: c.passport_url || c.passportUrl || null,
        dateCreation: c.created_at || c.dateCreation || null,
        contactUrgence: c.contactUrgence || null,
        profession: c.profession || '',
        employeur: c.employeur || '',
        vip: c.vip || false,
        notes: c.notes || '',
      };

      setClient(normalized);
      
      // Synthétiser les documents en incluant le scan du passeport enregistré
      const rawDocs = res.data.documents || [];
      const hasPassport = rawDocs.some(d => d.type === 'PASSEPORT');
      const allDocs = [...rawDocs];
      if (!hasPassport && normalized.passportUrl) {
        allDocs.unshift({
          _id: 'doc-passport-' + c.id,
          type: 'PASSEPORT',
          nom: 'Passeport ' + (normalized.numeroPasseport || ''),
          cheminFichier: normalized.passportUrl,
          statut: 'VALIDE',
          dateCreation: c.created_at || new Date().toISOString(),
        });
      }
      setDocuments(allDocs);
      // Les inscriptions viennent de c.inscriptions (inclus par getClientFull)
      setReservations(c.inscriptions || res.data.reservations || []);
      setForm({
        nom: normalized.nom,
        prenom: normalized.prenom,
        genre: normalized.genre,
        telephone: normalized.telephone,
        email: normalized.email,
        adresse: normalized.adresse,
        ville: normalized.ville,
        quartier: normalized.quartier,
        nationalite: normalized.nationalite,
        numeroCNI: normalized.numeroCNI,
        numeroPasseport: normalized.numeroPasseport,
        naturePasseport: normalized.naturePasseport,
        dateNaissance: formatIsoDate(normalized.dateNaissance),
        lieuNaissance: normalized.lieuNaissance,
        dateExpirationPasseport: formatIsoDate(normalized.dateExpirationPasseport),
        niveauFidelite: normalized.niveauFidelite,
        profession: normalized.profession,
        employeur: normalized.employeur,
        notes: normalized.notes,
        contactUrgenceNom: normalized.contactUrgence?.nom || '',
        contactUrgenceTelephone: normalized.contactUrgence?.telephone || '',
        contactUrgenceRelation: normalized.contactUrgence?.relation || '',
      });
    } catch (e) {
      console.error('Erreur chargement client:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClient(); }, [id]);

  const handleOpenEdit = () => {
    if (client) {
      const isFemme = String(client.genre || client.sexe || '').trim().toUpperCase().startsWith('F');
      setForm({
        nom: client.nom || '',
        prenom: client.prenom || '',
        genre: isFemme ? 'FEMME' : 'HOMME',
        telephone: client.telephone || '',
        email: client.email || '',
        adresse: client.adresse || '',
        ville: client.ville || 'Dakar',
        quartier: client.quartier || '',
        nationalite: client.nationalite || 'Sénégalaise',
        numeroCNI: client.numeroCNI || '',
        numeroPasseport: client.numeroPasseport || '',
        naturePasseport: client.naturePasseport || 'Ordinaire',
        dateNaissance: formatIsoDate(client.dateNaissance),
        lieuNaissance: client.lieuNaissance || '',
        dateExpirationPasseport: formatIsoDate(client.dateExpirationPasseport),
        niveauFidelite: client.niveauFidelite || 'BRONZE',
        profession: client.profession || '',
        employeur: client.employeur || '',
        notes: client.notes || '',
        contactUrgenceNom: client.contactUrgence?.nom || '',
        contactUrgenceTelephone: client.contactUrgence?.telephone || '',
        contactUrgenceRelation: client.contactUrgence?.relation || '',
      });
    }
    setShowEdit(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const gValue = String(form.genre || '').toUpperCase().startsWith('F') ? 'F' : 'M';
      await api.patch(`/clients/${id}`, {
        nom: form.nom,
        prenom: form.prenom,
        genre: gValue,
        sexe: gValue,
        telephone: form.telephone,
        email: form.email,
        adresse: form.adresse,
        ville: form.ville,
        quartier: form.quartier,
        nationalite: form.nationalite,
        numeroPasseport: form.numeroPasseport,
        n_passeport: form.numeroPasseport,
        naturePasseport: form.naturePasseport,
        nature_passeport: form.naturePasseport,
        dateNaissance: form.dateNaissance || null,
        date_naissance: form.dateNaissance || null,
        lieuNaissance: form.lieuNaissance,
        dateExpirationPasseport: form.dateExpirationPasseport || null,
        expiration_passeport: form.dateExpirationPasseport || null,
        numeroCNI: form.numeroCNI,
        numero_cni: form.numeroCNI,
        niveauFidelite: form.niveauFidelite,
        niveau_fidelite: form.niveauFidelite,
        profession: form.profession,
        employeur: form.employeur,
        notes: form.notes,
        contactUrgence: {
          nom: form.contactUrgenceNom,
          telephone: form.contactUrgenceTelephone,
          relation: form.contactUrgenceRelation,
        }
      });
      await fetchClient();
      setShowEdit(false);
      toast('Client modifié avec succès');
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur lors de la modification', 'error');
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
      setOcrResult(null);
      fetchClient();
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur upload', 'error');
    } finally { setUploading(false); }
  };

  // Lancer l'OCR quand un fichier image est sélectionné pour un passeport ou CNI
  const handleDocFileChange = async (file) => {
    setDocForm(f => ({ ...f, file }));
    setOcrResult(null);

    const isImage = file && ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
    const isPassport = docForm.type === 'PASSEPORT';
    const isCNI = docForm.type === 'VISA'; // adapter si tu as un type CNI

    if (!isImage || (!isPassport && !isCNI)) return;

    setOcrScanning(true);
    try {
      const data = new FormData();
      data.append('document', file);
      data.append('type', isPassport ? 'passport' : 'id_card');
      const res = await api.post('/clients/scan-document', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const extracted = res.data.data;
      setOcrResult(extracted);

      // Pré-remplir les champs du client avec les données extraites
      if (extracted.nom || extracted.prenom || extracted.numeroPasseport) {
        setForm(f => ({
          ...f,
          nom: extracted.nom || f.nom,
          prenom: extracted.prenom || f.prenom,
          dateNaissance: extracted.dateNaissance || f.dateNaissance,
          lieuNaissance: extracted.lieuNaissance || f.lieuNaissance,
          ...(isPassport ? {
            numeroPasseport: extracted.numeroPasseport || f.numeroPasseport,
            dateExpirationPasseport: extracted.dateExpirationPasseport || f.dateExpirationPasseport,
          } : {
            numeroCNI: extracted.numeroCNI || f.numeroCNI,
          }),
        }));

        // Ouvrir automatiquement le modal de modification pour que l'agent valide
        if (!showEdit) setShowEdit(true);

        if (extracted.mrzDetectee) {
          toast('Passeport lu — vérifiez les informations dans le formulaire');
        } else {
          toast(extracted.avertissement || 'Extraction partielle — vérifiez les champs', 'error');
        }
      }
    } catch (err) {
      // OCR échoué silencieusement — l'upload continue quand même
      console.warn('OCR échoué:', err.message);
    } finally {
      setOcrScanning(false);
    }
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
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleOpenEdit} className="btn-secondary" style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            ✏️ Modifier le client
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '6px 14px', color: '#DC2626', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            Supprimer
          </button>
        </div>
      </div>

      {/* Infos */}
      <div className="premium-card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, marginBottom: 16, color: 'var(--text-main)' }}>
          Informations du Client
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
                  <div style={{ fontSize: 28 }}>👤</div>
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
          {/* Nom + fidélité + Sexe */}
          <div style={{ paddingTop: 4 }}>
            <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-main)', margin: '0 0 6px' }}>
              {client.prenom} {client.nom}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{
                display: 'inline-block',
                background: { BRONZE: '#FEF3C7', ARGENT: '#F1F5F9', OR: '#FEF9C3', PLATINE: '#F0F9FF' }[client.niveauFidelite] || '#F3F4F6',
                color: { BRONZE: '#92400E', ARGENT: '#475569', OR: '#854D0E', PLATINE: '#0369A1' }[client.niveauFidelite] || '#6B7280',
                borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 700,
              }}>{client.niveauFidelite || 'BRONZE'}</span>

              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: (client.genre || client.sexe || '').toUpperCase().includes('F') ? '#FDF2F8' : '#EFF6FF',
                color: (client.genre || client.sexe || '').toUpperCase().includes('F') ? '#BE185D' : '#1D4ED8',
                border: `1px solid ${(client.genre || client.sexe || '').toUpperCase().includes('F') ? '#FBCFE8' : '#BFDBFE'}`,
                borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 700,
              }}>
                {(client.genre || client.sexe || '').toUpperCase().includes('F') ? '👩 Féminin (Femme)' : '👨 Masculin (Homme)'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            ['Sexe / Genre', (client.genre || client.sexe || '').toUpperCase().includes('F') ? '👩 Féminin (Femme)' : '👨 Masculin (Homme)'],
            ['Nationalité', client.nationalite || 'Sénégalaise'],
            ['Passeport', (
              <span>
                {client.numeroPasseport || '—'}
                {client.passportUrl && (
                  <a
                    href={client.passportUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ marginLeft: 8, fontSize: 11, color: 'var(--primary)', fontWeight: 700, textDecoration: 'none', background: 'rgba(0,103,79,0.08)', padding: '2px 8px', borderRadius: 12 }}
                  >
                    📄 Voir scan
                  </a>
                )}
              </span>
            )],
            ['Nature passeport', client.naturePasseport || 'Ordinaire'],
            ['CNI', client.numeroCNI || '—'],
            ['Téléphone', client.telephone || '—'],
            ['Email', client.email || '—'],
            ['Adresse', client.adresse ? `${client.adresse}${client.ville ? ', ' + client.ville : ''}` : (client.ville || '—')],
            ['Date naissance', fmtDate(client.dateNaissance)],
            ['Lieu naissance', client.lieuNaissance || '—'],
            ['Expiration passeport', fmtDate(client.dateExpirationPasseport)],
            ['Profession', client.profession ? `${client.profession}${client.employeur ? ' (' + client.employeur + ')' : ''}` : '—'],
            ['Créé le', fmtDate(client.dateCreation)],
          ].map(([label, value]) => (
            <div key={label}>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</p>
              <div style={{ fontSize: 14, color: 'var(--text-main)' }}>{value}</div>
            </div>
          ))}
        </div>
        <div className="divider" style={{ margin: '20px 0' }} />
        <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Contact en cas d'urgence
        </h3>
        {client.contactUrgence && (client.contactUrgence.nom || client.contactUrgence.telephone) ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Nom du contact</p>
              <p style={{ fontSize: 14, color: 'var(--text-main)', fontWeight: 600 }}>{client.contactUrgence.nom}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Téléphone</p>
              <p style={{ fontSize: 14, color: 'var(--text-main)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Phone size={14} style={{ color: 'var(--primary)' }} /> {client.contactUrgence.telephone}
              </p>
            </div>
            {client.contactUrgence.relation && (
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Relation / Parenté</p>
                <p style={{ fontSize: 14, color: 'var(--text-main)' }}>{client.contactUrgence.relation}</p>
              </div>
            )}
          </div>
        ) : (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>Aucun contact d'urgence enregistré</p>
        )}
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
              const isAutoExtractedPhoto = d.type === 'PASSEPORT_PHOTO';

              return (
                <div key={d._id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: isAutoExtractedPhoto ? 'rgba(0,103,79,0.04)' : 'var(--bg-main)',
                  borderRadius: 'var(--radius-md)',
                  border: isAutoExtractedPhoto ? '1px solid rgba(0,103,79,0.12)' : 'none'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Aperçu pour les photos */}
                    {isAutoExtractedPhoto && d.cheminFichier && (
                      <img
                        src={d.cheminFichier}
                        alt="Photo passeport"
                        style={{
                          width: 40,
                          height: 40,
                          objectFit: 'cover',
                          borderRadius: 6,
                          border: '2px solid var(--primary)'
                        }}
                      />
                    )}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>
                          {d.type === 'PASSEPORT_PHOTO' ? 'Photo passeport (auto)' : d.type}
                        </span>
                        {isAutoExtractedPhoto && (
                          <span style={{
                            background: 'rgba(0,103,79,0.08)',
                            color: 'var(--primary)',
                            borderRadius: 12,
                            padding: '2px 6px',
                            fontSize: 9,
                            fontWeight: 700
                          }}>
                            OCR
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {fmtDate(d.dateCreation)}
                        {isAutoExtractedPhoto && ' • Extraite automatiquement'}
                      </span>
                    </div>
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

      {/* Historique des départs */}
      <div className="premium-card" style={{ marginTop: 16, marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--text-main)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={18} style={{ color: 'var(--primary)' }} />
          Historique des Départs ({reservations.length})
        </h2>
        {reservations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}> </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, fontStyle: 'italic' }}>Aucun départ enregistré pour ce client</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {reservations.map(insc => {
              // Données Supabase : inscriptions + departs (relation incluse)
              const depart = insc.departs || {};
              const totalPaye = Array.isArray(insc.paiements)
                ? insc.paiements.reduce((s, p) => s + (p.montant || 0), 0)
                : (insc.acompte || 0);
              const prixTotal = insc.prix_total || 0;
              const reste = Math.max(0, prixTotal - totalPaye);
              const isSolde = reste <= 0;

              // Couleurs statut client
              const STATUT_STYLE = {
                Inscrit: { bg: '#EFF6FF', color: '#2563EB' },
                Confirmé: { bg: '#F0FDF4', color: '#16A34A' },
                Parti: { bg: '#FFF7ED', color: '#EA580C' },
                Rentré: { bg: '#F0FDF4', color: '#15803D' },
                Désisté: { bg: '#FFFBEB', color: '#D97706' },
                Annulé: { bg: '#FEF2F2', color: '#DC2626' },
              };
              const statut = insc.statut_client || 'Inscrit';
              const st = STATUT_STYLE[statut] || { bg: '#F3F4F6', color: '#6B7280' };

              // Couleur service
              const SERVICE_COLORS = {
                Omra: { bg: 'rgba(37,99,235,0.08)', color: '#2563EB', emoji: '🕋' },
                Hajj: { bg: 'rgba(220,38,38,0.08)', color: '#DC2626', emoji: '🕌' },
                Ziyara: { bg: 'rgba(22,163,74,0.08)', color: '#16A34A', emoji: '🌙' },
              };
              const svc = SERVICE_COLORS[insc.service] || { bg: 'rgba(107,114,128,0.08)', color: '#6B7280', emoji: ' ' };

              return (
                <div key={insc.id} style={{
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  overflow: 'hidden',
                  background: 'var(--bg-card)',
                }}>
                  {/* En-tête de la carte */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: svc.bg,
                    borderBottom: '1px solid var(--border)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 22 }}>{svc.emoji}</span>
                      <div>
                        <p style={{ fontWeight: 800, fontSize: 14, color: svc.color }}>
                          {depart.nom_depart || insc.service || 'Voyage'}
                        </p>
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                          N° {insc.numero || insc.id?.slice(0, 8)}
                          {insc.formule ? ` · ${insc.formule}` : ''}
                        </p>
                      </div>
                    </div>
                    <span style={{
                      background: st.bg, color: st.color,
                      borderRadius: 20, padding: '4px 12px',
                      fontSize: 11, fontWeight: 700,
                    }}>{statut}</span>
                  </div>

                  {/* Corps de la carte */}
                  <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                    {/* Dates */}
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Départ</p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>
                        {fmtDate(depart.date_depart || insc.date_depart)}
                      </p>
                      {(depart.date_retour) && (
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          Retour : {fmtDate(depart.date_retour)}
                        </p>
                      )}
                    </div>

                    {/* Finances */}
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Finances</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)' }}>
                        {prixTotal.toLocaleString('fr-FR')} FCFA
                      </p>
                      {isSolde ? (
                        <span style={{ display: 'inline-block', marginTop: 3, background: '#F0FDF4', color: '#16A34A', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>✓ Soldé</span>
                      ) : (
                        <p style={{ fontSize: 11, color: '#DC2626', fontWeight: 700, marginTop: 2 }}>Reste : {reste.toLocaleString('fr-FR')} FCFA</p>
                      )}
                    </div>

                    {/* Hébergement */}
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Hébergement</p>
                      {insc.hotel_makkah && (
                        <p style={{ fontSize: 12, color: 'var(--text-main)' }}>🕋 {insc.hotel_makkah}</p>
                      )}
                      {insc.hotel_medine && (
                        <p style={{ fontSize: 12, color: 'var(--text-main)', marginTop: 2 }}>🌙 {insc.hotel_medine}</p>
                      )}
                      {insc.type_chambre && (
                        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{insc.type_chambre}</p>
                      )}
                      {!insc.hotel_makkah && !insc.hotel_medine && (
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>Non renseigné</p>
                      )}
                    </div>
                  </div>

                  {/* Footer avec bouton détails */}
                  <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => navigate(`/dashboard/reservations/${insc.id}`)}
                      style={{
                        background: 'none', border: 'none', color: 'var(--primary)',
                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 12, fontWeight: 700, padding: '4px 0',
                      }}
                    >
                      Voir les détails <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal ajout document */}
      <Modal open={showDocModal} onClose={() => { setShowDocModal(false); setOcrResult(null); }} title="Ajouter un document">
        <form onSubmit={handleDocUpload} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="input-label">Type de document *</label>
            <select value={docForm.type}
              onChange={e => { setDocForm(f => ({ ...f, type: e.target.value, file: null })); setOcrResult(null); }}
              className="premium-input">
              {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">
              Fichier * (PDF, image — max 10 Mo)
              {docForm.type === 'PASSEPORT' && (
                <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--primary)', fontWeight: 500 }}>
                  — les images seront lues automatiquement
                </span>
              )}
            </label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
              onChange={e => handleDocFileChange(e.target.files[0] || null)}
              className="premium-input"
              required
            />
          </div>

          {/* Statut OCR */}
          {ocrScanning && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#EFF6FF', borderRadius: 8, border: '1px solid #BFDBFE' }}>
              <div style={{ width: 16, height: 16, border: '2px solid #2563EB', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: '#2563EB', fontWeight: 600 }}>Lecture du document en cours...</p>
            </div>
          )}

          {ocrResult && !ocrScanning && (
            <div style={{
              padding: '10px 14px', borderRadius: 8,
              background: ocrResult.mrzDetectee ? '#F0FDF4' : '#FFFBEB',
              border: `1px solid ${ocrResult.mrzDetectee ? '#BBF7D0' : '#FDE68A'}`,
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              {ocrResult.mrzDetectee
                ? <CheckCircle size={16} color="#16A34A" style={{ flexShrink: 0, marginTop: 2 }} />
                : <AlertCircle size={16} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
              }
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: ocrResult.mrzDetectee ? '#16A34A' : '#D97706' }}>
                  {ocrResult.mrzDetectee ? 'Passeport lu automatiquement' : 'Lecture partielle'}
                </p>
                {ocrResult.nom && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                    {ocrResult.nom} {ocrResult.prenom}
                    {ocrResult.numeroPasseport && ` · ${ocrResult.numeroPasseport}`}
                    {ocrResult.dateNaissance && ` · né(e) le ${ocrResult.dateNaissance}`}
                  </p>
                )}
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  Les champs ont été pré-remplis — vérifiez et sauvegardez
                </p>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => { setShowDocModal(false); setOcrResult(null); }} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={uploading || ocrScanning} className="btn-primary">
              {uploading ? 'Upload...' : ocrScanning ? 'Lecture...' : 'Ajouter'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal modification client */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Modifier le dossier client" size="lg">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Identité */}
          <div style={{ background: '#F9FAFB', padding: '14px 16px', borderRadius: 10, border: '1px solid #E5E7EB' }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 12px' }}>
              👤 Identité & Sexe
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label className="input-label">Nom *</label>
                <input
                  value={form.nom || ''}
                  onChange={e => setForm(f => ({ ...f, nom: e.target.value.toUpperCase() }))}
                  className="premium-input"
                  style={{ textTransform: 'uppercase' }}
                  required
                />
              </div>
              <div>
                <label className="input-label">Prénom *</label>
                <input
                  value={form.prenom || ''}
                  onChange={e => setForm(f => ({ ...f, prenom: e.target.value.toUpperCase() }))}
                  className="premium-input"
                  style={{ textTransform: 'uppercase' }}
                  required
                />
              </div>

              <div>
                <label className="input-label">Sexe / Genre *</label>
                <select
                  value={form.genre || 'HOMME'}
                  onChange={e => setForm(f => ({ ...f, genre: e.target.value }))}
                  className="premium-input"
                  style={{ fontWeight: 700, color: (form.genre || '').includes('F') ? '#BE185D' : '#1D4ED8' }}
                >
                  <option value="HOMME">👨 Homme (Masculin)</option>
                  <option value="FEMME">👩 Femme (Féminin)</option>
                </select>
              </div>

              <div>
                <label className="input-label">Nationalité</label>
                <input
                  value={form.nationalite || ''}
                  onChange={e => setForm(f => ({ ...f, nationalite: e.target.value }))}
                  className="premium-input"
                  placeholder="Ex: Sénégalaise"
                />
              </div>

              <div>
                <label className="input-label">Date de naissance</label>
                <input
                  type="date"
                  value={form.dateNaissance || ''}
                  onChange={e => setForm(f => ({ ...f, dateNaissance: e.target.value }))}
                  className="premium-input"
                />
              </div>
              <div>
                <label className="input-label">Lieu de naissance</label>
                <input
                  value={form.lieuNaissance || ''}
                  onChange={e => setForm(f => ({ ...f, lieuNaissance: e.target.value }))}
                  className="premium-input"
                  placeholder="Ex: Dakar, Sénégal"
                />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div style={{ background: '#F9FAFB', padding: '14px 16px', borderRadius: 10, border: '1px solid #E5E7EB' }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 12px' }}>
              📞 Coordonnées
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label className="input-label">Téléphone</label>
                <input
                  value={form.telephone || ''}
                  onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
                  className="premium-input"
                  placeholder="+221 7X XXX XX XX"
                />
              </div>
              <div>
                <label className="input-label">Email</label>
                <input
                  type="email"
                  value={form.email || ''}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="premium-input"
                  placeholder="email@exemple.com"
                />
              </div>
              <div>
                <label className="input-label">Adresse</label>
                <input
                  value={form.adresse || ''}
                  onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))}
                  className="premium-input"
                />
              </div>
              <div>
                <label className="input-label">Ville</label>
                <input
                  value={form.ville || ''}
                  onChange={e => setForm(f => ({ ...f, ville: e.target.value }))}
                  className="premium-input"
                />
              </div>
            </div>
          </div>

          {/* Documents & Fidélité */}
          <div style={{ background: '#F9FAFB', padding: '14px 16px', borderRadius: 10, border: '1px solid #E5E7EB' }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 12px' }}>
              📄 Documents & Passeport
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label className="input-label">N° Passeport</label>
                <input
                  value={form.numeroPasseport || ''}
                  onChange={e => setForm(f => ({ ...f, numeroPasseport: e.target.value.toUpperCase() }))}
                  className="premium-input"
                  style={{ textTransform: 'uppercase' }}
                  placeholder="Ex: A01234567"
                />
              </div>
              <div>
                <label className="input-label">Expiration passeport</label>
                <input
                  type="date"
                  value={form.dateExpirationPasseport || ''}
                  onChange={e => setForm(f => ({ ...f, dateExpirationPasseport: e.target.value }))}
                  className="premium-input"
                />
              </div>
              <div>
                <label className="input-label">Nature passeport</label>
                <select
                  value={form.naturePasseport || 'Ordinaire'}
                  onChange={e => setForm(f => ({ ...f, naturePasseport: e.target.value }))}
                  className="premium-input"
                >
                  <option value="Ordinaire">Ordinaire</option>
                  <option value="Diplomatique">Diplomatique</option>
                  <option value="Service">Service</option>
                  <option value="Spécial">Spécial</option>
                </select>
              </div>
              <div>
                <label className="input-label">N° CNI</label>
                <input
                  value={form.numeroCNI || ''}
                  onChange={e => setForm(f => ({ ...f, numeroCNI: e.target.value }))}
                  className="premium-input"
                  placeholder="Numéro carte d'identité"
                />
              </div>
              <div>
                <label className="input-label">Niveau fidélité</label>
                <select
                  value={form.niveauFidelite || 'BRONZE'}
                  onChange={e => setForm(f => ({ ...f, niveauFidelite: e.target.value }))}
                  className="premium-input"
                >
                  {['BRONZE', 'ARGENT', 'OR', 'PLATINE'].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="input-label">Profession</label>
                <input
                  value={form.profession || ''}
                  onChange={e => setForm(f => ({ ...f, profession: e.target.value }))}
                  className="premium-input"
                  placeholder="Ex: Commerçant, Enseignant..."
                />
              </div>
            </div>
          </div>

          {/* Contact d'urgence */}
          <div style={{ background: '#F9FAFB', padding: '14px 16px', borderRadius: 10, border: '1px solid #E5E7EB' }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 12px' }}>
              🆘 Contact en cas d'urgence
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="input-label">Nom complet du contact</label>
                <input
                  value={form.contactUrgenceNom || ''}
                  onChange={e => setForm(f => ({ ...f, contactUrgenceNom: e.target.value }))}
                  className="premium-input"
                  placeholder="Ex: Adama Diop"
                />
              </div>
              <div>
                <label className="input-label">Téléphone d'urgence</label>
                <input
                  value={form.contactUrgenceTelephone || ''}
                  onChange={e => setForm(f => ({ ...f, contactUrgenceTelephone: e.target.value }))}
                  className="premium-input"
                  placeholder="Ex: +221 77..."
                />
              </div>
              <div>
                <label className="input-label">Relation / Parenté</label>
                <input
                  value={form.contactUrgenceRelation || ''}
                  onChange={e => setForm(f => ({ ...f, contactUrgenceRelation: e.target.value }))}
                  className="premium-input"
                  placeholder="Ex: Époux(se), Frère, Fils..."
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
            <button type="button" onClick={() => setShowEdit(false)} className="btn-secondary">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
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
