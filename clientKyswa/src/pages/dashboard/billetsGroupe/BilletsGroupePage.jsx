import { useEffect, useState, useMemo } from 'react';
import api from '../../../api/axios';
import DataTable from '../../../components/DataTable';
import Modal from '../../../components/Modal';
import { toast } from '../../../components/Toast';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';
const fmt = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA';

const statutColors = { EN_ATTENTE: 'badge-warning', CONFIRME: 'badge-success', ANNULE: 'badge-danger' };

export default function BilletsGroupePage() {
  const [billets, setBillets] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    packageKId: '', compagnie: '', numeroVol: '', dateDepart: '', dateArrivee: '',
    villeDepart: '', villeArrivee: '', nombreSieges: '', prixUnitaire: '', statut: 'EN_ATTENTE', notes: ''
  });
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [b, p] = await Promise.all([api.get('/billets-groupe'), api.get('/packages')]);
      setBillets(b.data.billets || []);
      setPackages(p.data.packages || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) await api.patch(`/billets-groupe/${editId}`, form);
      else await api.post('/billets-groupe', { ...form, nombreSieges: Number(form.nombreSieges), prixUnitaire: Number(form.prixUnitaire) });
      toast(editId ? 'Mis à jour' : 'Billet groupe créé');
      setShowForm(false); setEditId(null);
      setForm({ packageKId: '', compagnie: '', numeroVol: '', dateDepart: '', dateArrivee: '', villeDepart: '', villeArrivee: '', nombreSieges: '', prixUnitaire: '', statut: 'EN_ATTENTE', notes: '' });
      fetchAll();
    } catch (err) { toast(err.response?.data?.message || 'Erreur', 'error'); }
    finally { setSaving(false); }
  };

  const cols = useMemo(() => [
    { header: 'Départ', accessorFn: (b) => b.packageKId?.nomReference || '-' },
    { header: 'Compagnie', accessorKey: 'compagnie' },
    { header: 'Vol', accessorKey: 'numeroVol' },
    { header: 'Trajet', accessorFn: (b) => `${b.villeDepart} → ${b.villeArrivee}` },
    { header: 'Date', accessorFn: (b) => fmtDate(b.dateDepart) },
    { header: 'Sièges', accessorKey: 'nombreSieges' },
    { header: 'Prix/siège', accessorFn: (b) => fmt(b.prixUnitaire) },
    { header: 'Statut', accessorKey: 'statut', cell: ({ getValue }) => <span className={`badge ${statutColors[getValue()] || 'badge-neutral'}`}>{getValue()}</span> },
    {
      header: 'Actions', id: 'actions',
      cell: ({ row }) => (
        <button onClick={() => { setEditId(row.original._id); setForm({ packageKId: row.original.packageKId?._id || '', compagnie: row.original.compagnie, numeroVol: row.original.numeroVol, dateDepart: row.original.dateDepart?.slice(0,16) || '', dateArrivee: row.original.dateArrivee?.slice(0,16) || '', villeDepart: row.original.villeDepart, villeArrivee: row.original.villeArrivee, nombreSieges: row.original.nombreSieges, prixUnitaire: row.original.prixUnitaire, statut: row.original.statut, notes: row.original.notes || '' }); setShowForm(true); }}
          style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          Modifier
        </button>
      ),
    },
  ], []);

  return (
    <div className="animate-fade-in space-y-5">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text-main)' }}>Billets Groupe</h1>
        <button onClick={() => { setEditId(null); setShowForm(true); }} className="btn-primary">+ Nouveau vol groupe</button>
      </div>
      <div className="premium-card"><DataTable columns={cols} data={billets} loading={loading} /></div>

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditId(null); }} title={editId ? 'Modifier le vol' : 'Nouveau vol groupe'} size="lg">
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="input-label">Départ (package) *</label>
            <select value={form.packageKId} onChange={e => setForm(f => ({...f, packageKId: e.target.value}))} className="premium-input">
              <option value="">Sélectionner...</option>
              {packages.map(p => <option key={p._id} value={p._id}>{p.nomReference}</option>)}
            </select>
          </div>
          {[['compagnie','Compagnie *'],['numeroVol','N° Vol *'],['villeDepart','Ville départ *'],['villeArrivee','Ville arrivée *']].map(([k,l]) => (
            <div key={k}>
              <label className="input-label">{l}</label>
              <input value={form[k]} onChange={e => setForm(f => ({...f,[k]:e.target.value}))} className="premium-input" />
            </div>
          ))}
          <div>
            <label className="input-label">Date départ *</label>
            <input type="datetime-local" value={form.dateDepart} onChange={e => setForm(f => ({...f, dateDepart: e.target.value}))} className="premium-input" />
          </div>
          <div>
            <label className="input-label">Date arrivée *</label>
            <input type="datetime-local" value={form.dateArrivee} onChange={e => setForm(f => ({...f, dateArrivee: e.target.value}))} className="premium-input" />
          </div>
          <div>
            <label className="input-label">Nombre de sièges *</label>
            <input type="number" min="1" value={form.nombreSieges} onChange={e => setForm(f => ({...f, nombreSieges: e.target.value}))} className="premium-input" />
          </div>
          <div>
            <label className="input-label">Prix unitaire (FCFA) *</label>
            <input type="number" min="0" value={form.prixUnitaire} onChange={e => setForm(f => ({...f, prixUnitaire: e.target.value}))} className="premium-input" />
          </div>
          <div>
            <label className="input-label">Statut</label>
            <select value={form.statut} onChange={e => setForm(f => ({...f, statut: e.target.value}))} className="premium-input">
              {['EN_ATTENTE','CONFIRME','ANNULE'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="input-label">Notes</label>
            <input value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} className="premium-input" />
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? '...' : (editId ? 'Mettre à jour' : 'Créer')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
