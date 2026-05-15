import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanLine, Upload, CheckCircle, AlertCircle, X } from 'lucide-react';
import api from '../../../api/axios';
import Modal from '../../../components/Modal';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { toast } from '../../../components/Toast';

const EMPTY = {
  nom: '', prenom: '', telephone: '', email: '',
  numeroPasseport: '', dateExpirationPasseport: '',
  numeroCNI: '', dateNaissance: '', lieuNaissance: '',
  adresse: '', niveauFidelite: 'BRONZE',
};

export default function ClientsPage() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ── OCR scan state ──────────────────────────────────────────────────────────
  // 'ask'     → demander si document disponible
  // 'choose'  → choisir le type (passeport / CNI)
  // 'upload'  → uploader l'image
  // 'scanning'→ en cours d'analyse
  // 'done'    → formulaire pré-rempli
  // 'manual'  → saisie manuelle directe
  const [scanStep, setScanStep] = useState('ask');
  const [scanDocType, setScanDocType] = useState('passport');
  const [scanPreview, setScanPreview] = useState(null);
  const [scanFile, setScanFile] = useState(null);
  const [scanFields, setScanFields] = useState(null); // champs extraits
  const fileInputRef = useRef(null);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/clients/${confirmDeleteId}`);
      toast('Client supprimé');
      fetchClients();
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur lors de la suppression', 'error');
    } finally { setDeleting(false); setConfirmDeleteId(null); }
  };

  const fetchClients = async (q = '') => {
    setLoading(true);
    try {
      const res = await api.get('/clients', { params: q ? { search: q } : {} });
      setClients(res.data.clients || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchClients(); }, []);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    fetchClients(e.target.value);
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setUpper = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value.toUpperCase() }));

  // ── Ouvrir le modal → démarrer par la question OCR ──────────────────────────
  const openNewClient = () => {
    setForm(EMPTY);
    setScanStep('ask');
    setScanPreview(null);
    setScanFile(null);
    setScanFields(null);
    setShowModal(true);
  };

  // ── Sélection du fichier ────────────────────────────────────────────────────
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setScanFile(file);
    setScanPreview(URL.createObjectURL(file));
    setScanStep('upload');
  };

  // ── Lancer le scan OCR ──────────────────────────────────────────────────────
  const handleScan = async () => {
    if (!scanFile) return;
    setScanStep('scanning');
    try {
      const data = new FormData();
      data.append('document', scanFile);
      data.append('type', scanDocType);
      const res = await api.post('/clients/scan-document', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const extracted = res.data.data;
      setScanFields(extracted);

      // Pré-remplir le formulaire avec les données extraites
      setForm(f => ({
        ...f,
        nom:    extracted.nom    || f.nom,
        prenom: extracted.prenom || f.prenom,
        dateNaissance: extracted.dateNaissance || f.dateNaissance,
        lieuNaissance: extracted.lieuNaissance || f.lieuNaissance,
        ...(extracted.type === 'passport' ? {
          numeroPasseport: extracted.numeroPasseport || f.numeroPasseport,
          dateExpirationPasseport: extracted.dateExpirationPasseport || f.dateExpirationPasseport,
        } : {
          numeroCNI: extracted.numeroCNI || f.numeroCNI,
        }),
      }));
      setScanStep('done');

      if (extracted.mrzDetectee) {
        toast('Document lu avec succès — vérifiez les informations');
      } else if (extracted.avertissement) {
        toast(extracted.avertissement, 'error');
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur lors de la lecture du document', 'error');
      setScanStep('upload'); // retour à l'upload pour réessayer
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      // Nettoyer les champs vides optionnels
      Object.keys(payload).forEach(k => { if (payload[k] === '') delete payload[k]; });
      await api.post('/clients', payload);
      setShowModal(false);
      setForm(EMPTY);
      fetchClients();
      toast('Client créé avec succès');
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur lors de la création', 'error');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>{clients.length} client(s)</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <input value={search} onChange={handleSearch} placeholder="Nom, téléphone, passeport..."
            className="premium-input" style={{ width: 260 }} />
          <button onClick={openNewClient} className="btn-primary">+ Nouveau client</button>
        </div>
      </div>

      <div className="premium-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="premium-table">
            <thead>
              <tr>
                <th>Nom complet</th>
                <th>Passeport</th>
                <th>Téléphone</th>
                <th>Email</th>
                <th>Fidélité</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Chargement...</td></tr>
              ) : clients.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Aucun client</td></tr>
              ) : clients.map(c => (
                <tr key={c._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/dashboard/clients/${c._id}`)}>
                  <td style={{ fontWeight: 600 }}>{c.nom} {c.prenom}</td>
                  <td><span style={{ background: 'rgba(0,103,79,0.08)', color: 'var(--primary)', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{c.numeroPasseport}</span></td>
                  <td style={{ fontSize: 12 }}>{c.telephone || '—'}</td>
                  <td style={{ fontSize: 12 }}>{c.email || '—'}</td>
                  <td>
                    <span style={{
                      background: { BRONZE: '#FEF3C7', ARGENT: '#F1F5F9', OR: '#FEF9C3', PLATINE: '#F0F9FF' }[c.niveauFidelite] || '#F3F4F6',
                      color: { BRONZE: '#92400E', ARGENT: '#475569', OR: '#854D0E', PLATINE: '#0369A1' }[c.niveauFidelite] || '#6B7280',
                      borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700,
                    }}>{c.niveauFidelite || 'BRONZE'}</span>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => navigate(`/dashboard/clients/${c._id}`)}
                        style={{ background: 'rgba(0,103,79,0.08)', border: 'none', borderRadius: 6, padding: '4px 12px', color: 'var(--primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        Voir
                      </button>
                      <button onClick={() => setConfirmDeleteId(c._id)}
                        style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: '4px 12px', color: '#DC2626', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        Supprimer
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Nouveau client">

        {/* ── ÉTAPE 1 : Demander si document disponible ── */}
        {scanStep === 'ask' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', padding: '8px 0 16px' }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(0,103,79,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ScanLine size={32} color="var(--primary)" />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--text-main)', marginBottom: 6 }}>
                Document d'identité disponible ?
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Scannez le passeport ou la CNI pour pré-remplir automatiquement le formulaire.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 12, width: '100%' }}>
              <button
                onClick={() => setScanStep('choose')}
                className="btn-primary"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px' }}
              >
                <ScanLine size={16} /> Oui, scanner le document
              </button>
              <button
                onClick={() => setScanStep('manual')}
                className="btn-secondary"
                style={{ flex: 1, padding: '12px' }}
              >
                Non, saisie manuelle
              </button>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 2 : Choisir le type de document ── */}
        {scanStep === 'choose' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>Type de document</p>
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { key: 'passport', label: 'Passeport', desc: 'Livret biométrique' },
                { key: 'id_card',  label: 'Carte CNI',  desc: 'Carte nationale d\'identité' },
              ].map(({ key, label, desc }) => (
                <button
                  key={key}
                  onClick={() => { setScanDocType(key); setScanStep('upload'); fileInputRef.current?.click(); }}
                  style={{
                    flex: 1, padding: '16px', borderRadius: 'var(--radius-lg)',
                    border: `2px solid ${scanDocType === key ? 'var(--primary)' : 'var(--border)'}`,
                    background: scanDocType === key ? 'rgba(0,103,79,0.06)' : 'white',
                    cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
                  }}
                >
                  <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-main)', marginBottom: 4 }}>{label}</p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{desc}</p>
                </button>
              ))}
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
              style={{ display: 'none' }} onChange={handleFileSelect} />
            <button onClick={() => setScanStep('ask')} className="btn-secondary" style={{ alignSelf: 'flex-start', fontSize: 12 }}>
              Retour
            </button>
          </div>
        )}

        {/* ── ÉTAPE 3 : Aperçu + lancer le scan ── */}
        {scanStep === 'upload' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>
                {scanDocType === 'passport' ? 'Passeport' : 'Carte CNI'} sélectionné
              </p>
              <button onClick={() => fileInputRef.current?.click()}
                style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                Changer
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
              style={{ display: 'none' }} onChange={handleFileSelect} />

            {scanPreview ? (
              <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', maxHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F9FAFB' }}>
                <img src={scanPreview} alt="Document" style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }} />
              </div>
            ) : (
              <div style={{ borderRadius: 10, border: '2px dashed var(--border)', padding: 32, textAlign: 'center', color: 'var(--text-muted)', cursor: 'pointer' }}
                onClick={() => fileInputRef.current?.click()}>
                <Upload size={24} style={{ margin: '0 auto 8px' }} />
                <p style={{ fontSize: 13 }}>Cliquer pour sélectionner une image</p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleScan} disabled={!scanFile} className="btn-primary"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <ScanLine size={15} /> Analyser le document
              </button>
              <button onClick={() => setScanStep('choose')} className="btn-secondary">Retour</button>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 4 : Analyse en cours ── */}
        {scanStep === 'scanning' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 0' }}>
            <div style={{ width: 48, height: 48, border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>Lecture du document en cours...</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>Mindee analyse votre document</p>
          </div>
        )}

        {/* ── ÉTAPE 5 : Résultat + formulaire pré-rempli ── */}
        {(scanStep === 'done' || scanStep === 'manual') && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Bandeau résultat OCR */}
            {scanStep === 'done' && scanFields && (
              <div style={{
                background: scanFields.mrzDetectee ? '#F0FDF4' : '#FFFBEB',
                border: `1px solid ${scanFields.mrzDetectee ? '#BBF7D0' : '#FDE68A'}`,
                borderRadius: 10, padding: '10px 14px',
                display: 'flex', alignItems: 'flex-start', gap: 10,
              }}>
                {scanFields.mrzDetectee
                  ? <CheckCircle size={16} color="#16A34A" style={{ flexShrink: 0, marginTop: 2 }} />
                  : <AlertCircle size={16} color="#D97706" style={{ flexShrink: 0, marginTop: 2 }} />
                }
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: scanFields.mrzDetectee ? '#16A34A' : '#D97706' }}>
                    {scanFields.mrzDetectee ? 'Document lu automatiquement' : 'Lecture partielle'}
                  </p>
                  <p style={{ fontSize: 11, color: scanFields.mrzDetectee ? '#15803D' : '#92400E', marginTop: 2 }}>
                    {scanFields.avertissement || `${scanDocType === 'passport' ? 'Passeport' : 'CNI'} — vérifiez et complétez les informations`}
                  </p>
                </div>
                <button type="button" onClick={() => { setScanFields(null); setScanStep('ask'); setForm(EMPTY); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}>
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Identité */}
            <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Identité</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="input-label">Nom *</label>
                <input value={form.nom} onChange={setUpper('nom')} className="premium-input" required
                  style={{ textTransform: 'uppercase' }} placeholder="NOM" />
              </div>
              <div>
                <label className="input-label">Prénom *</label>
                <input value={form.prenom} onChange={setUpper('prenom')} className="premium-input" required
                  style={{ textTransform: 'uppercase' }} placeholder="PRÉNOM" />
              </div>
              <div>
                <label className="input-label">Date de naissance</label>
                <input type="date" value={form.dateNaissance} onChange={set('dateNaissance')} className="premium-input" />
              </div>
              <div>
                <label className="input-label">Lieu de naissance</label>
                <input value={form.lieuNaissance} onChange={set('lieuNaissance')} className="premium-input" />
              </div>
            </div>

            {/* Contact */}
            <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>Contact</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="input-label">Téléphone</label>
                <input value={form.telephone} onChange={set('telephone')} className="premium-input" placeholder="+221 7X XXX XX XX" />
              </div>
              <div>
                <label className="input-label">Email</label>
                <input type="email" value={form.email} onChange={set('email')} className="premium-input" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="input-label">Adresse</label>
                <input value={form.adresse} onChange={set('adresse')} className="premium-input" />
              </div>
            </div>

            {/* Documents */}
            <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>Documents</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="input-label">N° Passeport</label>
                <input value={form.numeroPasseport} onChange={set('numeroPasseport')} className="premium-input" placeholder="Optionnel" />
              </div>
              <div>
                <label className="input-label">Expiration passeport</label>
                <input type="date" value={form.dateExpirationPasseport} onChange={set('dateExpirationPasseport')} className="premium-input" />
              </div>
              <div>
                <label className="input-label">N° CNI</label>
                <input value={form.numeroCNI} onChange={set('numeroCNI')} className="premium-input" />
              </div>
              <div>
                <label className="input-label">Niveau fidélité</label>
                <select value={form.niveauFidelite} onChange={set('niveauFidelite')} className="premium-input">
                  {['BRONZE', 'ARGENT', 'OR', 'PLATINE'].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Annuler</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Enregistrement...' : 'Créer le client'}
              </button>
            </div>
          </form>
        )}

      </Modal>

      <ConfirmDialog
        open={!!confirmDeleteId}
        message="Supprimer ce client ? Cette action est irréversible."
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
