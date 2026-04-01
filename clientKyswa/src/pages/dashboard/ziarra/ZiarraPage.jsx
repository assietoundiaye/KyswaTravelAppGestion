import { useEffect, useState, useMemo } from 'react';
import api from '../../../api/axios';
import DataTable from '../../../components/DataTable';
import Modal from '../../../components/Modal';
import { toast } from '../../../components/Toast';

const statutColors = { PROSPECT: 'badge-neutral', INTERESSE: 'badge-info', CONFIRME: 'badge-success', PARTI: 'badge-primary', ANNULE: 'badge-danger' };
const STATUTS = ['PROSPECT', 'INTERESSE', 'CONFIRME', 'PARTI', 'ANNULE'];

export default function ZiarraPage() {
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ nom: '', prenom: '', telephone: '', email: '', statut: 'PROSPECT', notes: '', dateDepart: '' });
  const [saving, setSaving] = useState(false);

  const fetchProspects = async () => {
    setLoading(true);
    try { const r = await api.get('/ziarra'); setProspects(r.data.prospects || []); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProspects(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) await api.patch(`/ziarra/${editId}`, form);
      else await api.post('/ziarra', form);
      toast(editId ? 'Mis à jour' : 'Prospect créé');
      setShowForm(false); setEditId(null);
      setForm({ nom: '', prenom: '', telephone: '', email: '', statut: 'PROSPECT', notes: '', dateDepart: '' });
      fetchProspects();
    } catch (err) { toast(err.response?.data?.message || 'Erreur', 'error'); }
    finally { setSaving(false); }
  };

  const cols = useMemo(() => [
    { header: 'Nom', accessorFn: (p) => p.clientId ? `${p.clientId.nom} ${p.clientId.prenom}` : `${p.nom} ${p.prenom}` },
    { header: 'Téléphone', accessorFn: (p) => p.clientId?.telephone || p.telephone || '-' },
    { header: 'Statut', accessorKey: 'statut', cell: ({ getValue }) => <span className={`badge ${statutColors[getValue()] || 'badge-neutral'}`}>{getValue()}</span> },
    { header: 'Date contact', accessorFn: (p) => p.dateContact ? new Date(p.dateContact).toLocaleDateString('fr-FR') : '-' },
    { header: 'Notes', accessorFn: (p) => p.notes || '-' },
    {
      header: 'Actions', id: 'actions',
      cell: ({ row }) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { setEditId(row.original._id); setForm({ nom: row.original.nom || '', prenom: row.original.prenom || '', telephone: row.original.telephone || '', email: row.original.email || '', statut: row.original.statut, notes: row.original.notes || '', dateDepart: row.original.dateDepart?.slice(0,10) || '' }); setShowForm(true); }}
            style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Modifier</button>
        </div>
      ),
    },
  ], []);

  const parStatut = STATUTS.map(s => ({ statut: s, count: prospects.filter(p => p.statut === s).length }));

  return (
    <div className="animate-fade-in space-y-5">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text-main)' }}>Ziarra Fès</h1>
        <button onClick={() => { setEditId(null); setShowForm(true); }} className="btn-primary">+ Nouveau prospect</button>
      </div>

      {/* Stats par statut */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {parStatut.map(({ statut, count }) => (
          <div key={statut} className="premium-card" style={{ flex: '1 1 100px', textAlign: 'center', padding: '12px 16px' }}>
            <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)', fontFamily: 'var(--font-display)' }}>{count}</p>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>{statut}</p>
          </div>
        ))}
      </div>

      <div className="premium-card"><DataTable columns={cols} data={prospects} loading={loading} /></div>

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditId(null); }} title={editId ? 'Modifier le prospect' : 'Nouveau prospect Ziarra'} size="md">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[['nom','Nom'],['prenom','Prénom'],['telephone','Téléphone'],['email','Email']].map(([k,l]) => (
              <div key={k}>
                <label className="input-label">{l}</label>
                <input value={form[k]} onChange={e => setForm(f => ({...f,[k]:e.target.value}))} className="premium-input" />
              </div>
            ))}
            <div>
              <label className="input-label">Statut</label>
              <select value={form.statut} onChange={e => setForm(f => ({...f, statut: e.target.value}))} className="premium-input">
                {STATUTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Date départ prévue</label>
              <input type="date" value={form.dateDepart} onChange={e => setForm(f => ({...f, dateDepart: e.target.value}))} className="premium-input" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="input-label">Notes</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} className="premium-input" rows={3} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? '...' : (editId ? 'Mettre à jour' : 'Créer')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
