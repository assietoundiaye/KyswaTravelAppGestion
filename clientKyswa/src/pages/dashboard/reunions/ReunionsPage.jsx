import { useEffect, useState, useMemo } from 'react';
import api from '../../../api/axios';
import DataTable from '../../../components/DataTable';
import Modal from '../../../components/Modal';
import { toast } from '../../../components/Toast';

const fmtDate = (d) => d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

export default function ReunionsPage() {
  const [reunions, setReunions] = useState([]);
  const [packages, setPackages] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ packageKId: '', titre: '', dateReunion: '', lieu: '', ordreJour: '', participants: [] });
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [r, p, c] = await Promise.all([api.get('/reunions'), api.get('/packages'), api.get('/clients')]);
      setReunions(r.data.reunions || []);
      setPackages(p.data.packages || []);
      setClients(c.data.clients || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const toggleParticipant = (id) => {
    setForm(f => ({
      ...f,
      participants: f.participants.includes(id) ? f.participants.filter(p => p !== id) : [...f.participants, id],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) await api.patch(`/reunions/${editId}`, form);
      else await api.post('/reunions', form);
      toast(editId ? 'Réunion mise à jour' : 'Réunion créée');
      setShowForm(false); setEditId(null);
      setForm({ packageKId: '', titre: '', dateReunion: '', lieu: '', ordreJour: '', participants: [] });
      fetchAll();
    } catch (err) { toast(err.response?.data?.message || 'Erreur', 'error'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try { await api.delete(`/reunions/${id}`); toast('Réunion supprimée'); fetchAll(); }
    catch (e) { toast(e.response?.data?.message || 'Erreur', 'error'); }
  };

  const cols = useMemo(() => [
    { header: 'Titre', accessorKey: 'titre' },
    { header: 'Départ', accessorFn: (r) => r.packageKId?.nomReference || '-' },
    { header: 'Date', accessorFn: (r) => fmtDate(r.dateReunion) },
    { header: 'Lieu', accessorFn: (r) => r.lieu || '-' },
    { header: 'Participants', accessorFn: (r) => r.participants?.length || 0 },
    {
      header: 'Statut', accessorKey: 'statut',
      cell: ({ getValue }) => {
        const c = { PLANIFIEE: 'badge-info', TENUE: 'badge-success', ANNULEE: 'badge-danger' };
        return <span className={`badge ${c[getValue()] || 'badge-neutral'}`}>{getValue()}</span>;
      }
    },
    {
      header: 'Actions', id: 'actions',
      cell: ({ row }) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { setEditId(row.original._id); setForm({ packageKId: row.original.packageKId?._id || '', titre: row.original.titre, dateReunion: row.original.dateReunion?.slice(0, 16) || '', lieu: row.original.lieu || '', ordreJour: row.original.ordreJour || '', participants: row.original.participants?.map(p => p._id) || [] }); setShowForm(true); }}
            style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Modifier</button>
          <button onClick={() => handleDelete(row.original._id)}
            style={{ background: 'none', border: 'none', color: 'var(--danger)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Supprimer</button>
        </div>
      ),
    },
  ], []);

  return (
    <div className="animate-fade-in space-y-5">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text-main)' }}>
          Réunions pré-départ
        </h1>
        <button onClick={() => { setEditId(null); setShowForm(true); }} className="btn-primary">+ Nouvelle réunion</button>
      </div>

      <div className="premium-card">
        <DataTable columns={cols} data={reunions} loading={loading} />
      </div>

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditId(null); }} title={editId ? 'Modifier la réunion' : 'Nouvelle réunion'} size="lg">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label className="input-label">Départ *</label>
              <select value={form.packageKId} onChange={e => setForm(f => ({...f, packageKId: e.target.value}))} className="premium-input">
                <option value="">Sélectionner...</option>
                {packages.map(p => <option key={p._id} value={p._id}>{p.nomReference}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Titre *</label>
              <input value={form.titre} onChange={e => setForm(f => ({...f, titre: e.target.value}))} className="premium-input" />
            </div>
            <div>
              <label className="input-label">Date et heure *</label>
              <input type="datetime-local" value={form.dateReunion} onChange={e => setForm(f => ({...f, dateReunion: e.target.value}))} className="premium-input" />
            </div>
            <div>
              <label className="input-label">Lieu</label>
              <input value={form.lieu} onChange={e => setForm(f => ({...f, lieu: e.target.value}))} className="premium-input" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="input-label">Ordre du jour</label>
              <textarea value={form.ordreJour} onChange={e => setForm(f => ({...f, ordreJour: e.target.value}))} className="premium-input" rows={3} />
            </div>
          </div>
          <div>
            <label className="input-label">Participants ({form.participants.length} sélectionnés)</label>
            <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: 8 }}>
              {clients.map(c => (
                <label key={c._id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', cursor: 'pointer', borderRadius: 6 }}>
                  <input type="checkbox" checked={form.participants.includes(c._id)} onChange={() => toggleParticipant(c._id)} />
                  <span style={{ fontSize: 13 }}>{c.nom} {c.prenom}</span>
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? '...' : (editId ? 'Mettre à jour' : 'Créer')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
