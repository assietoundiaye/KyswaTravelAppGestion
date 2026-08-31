import { useEffect, useState, useMemo } from 'react';
import { Search, Calendar, Users, MapPin, Plus } from 'lucide-react';
import api from '../../../core/api/axios';
import DataTable from '../../../components/DataTable';
import Modal from '../../../components/Modal';
import Pagination from '../../../components/Pagination';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { toast } from '../../../components/Toast';

const fmtDate = (d) => d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

const EMPTY_FORM = {
  packageKId: '',
  titre: '',
  dateReunion: '',
  lieu: '115 Avenue Blaise Diagne, Dakar',
  ordreJour: '',
  participants: []
};

export default function ReunionsPage() {
  const [reunions, setReunions] = useState([]);
  const [packages, setPackages] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [search, setSearch] = useState('');

  // ── Pagination state ───────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  const reunionsFiltrees = useMemo(() => {
    if (!search.trim()) return reunions;
    const q = search.toLowerCase();
    return reunions.filter(r =>
      (r.titre || '').toLowerCase().includes(q) ||
      (r.lieu || '').toLowerCase().includes(q) ||
      (r.packageKId?.nomReference || '').toLowerCase().includes(q) ||
      (r.statut || '').toLowerCase().includes(q)
    );
  }, [reunions, search]);

  const paginatedReunions = useMemo(() => {
    const start = (page - 1) * limit;
    return reunionsFiltrees.slice(start, start + limit);
  }, [reunionsFiltrees, page, limit]);

  const totalPages = Math.ceil(reunionsFiltrees.length / limit) || 1;

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [r, p, c] = await Promise.all([
        api.get('/reunions'),
        api.get('/packages'),
        api.get('/clients')
      ]);
      setReunions(r.data.reunions || r.data.data || []);
      setPackages(p.data.packages || p.data.data || []);
      setClients(c.data.clients || c.data.data || []);
    } catch (e) {
      console.error(e);
      toast('Erreur lors du chargement des données', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const toggleParticipant = (id) => {
    setForm(f => ({
      ...f,
      participants: f.participants.includes(id)
        ? f.participants.filter(p => p !== id)
        : [...f.participants, id],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.titre?.trim() || !form.dateReunion) {
      toast('Veuillez renseigner le titre et la date de la réunion', 'warning');
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await api.patch(`/reunions/${editId}`, form);
        toast('Réunion mise à jour avec succès');
      } else {
        await api.post('/reunions', form);
        toast('Réunion créée avec succès');
      }
      setShowForm(false);
      setEditId(null);
      setForm(EMPTY_FORM);
      fetchAll();
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur lors de l\'enregistrement', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      await api.delete(`/reunions/${confirmDeleteId}`);
      toast('Réunion supprimée avec succès');
      setConfirmDeleteId(null);
      fetchAll();
    } catch (e) {
      toast(e.response?.data?.message || 'Erreur lors de la suppression', 'error');
    }
  };

  const openEdit = (row) => {
    const rid = row._id || row.id;
    setEditId(rid);
    const dateFormatted = row.dateReunion ? new Date(row.dateReunion).toISOString().slice(0, 16) : '';
    setForm({
      packageKId: row.packageKId?._id || row.packageKId?.id || row.lieu || '',
      titre: row.titre || '',
      dateReunion: dateFormatted,
      lieu: row.lieu || '115 Avenue Blaise Diagne, Dakar',
      ordreJour: row.ordreJour || row.ordre_du_jour || '',
      participants: Array.isArray(row.participants) ? row.participants : []
    });
    setShowForm(true);
  };

  const cols = useMemo(() => [
    {
      header: 'Titre & Objet',
      accessorKey: 'titre',
      cell: ({ row }) => (
        <div>
          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{row.original.titre}</div>
          {row.original.createdBy && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Créé par {row.original.createdBy}</div>
          )}
        </div>
      )
    },
    {
      header: 'Départ / Contexte',
      accessorFn: (r) => r.packageKId?.nomReference || (r.type === 'predepart' ? 'Pré-départ' : 'Générale'),
      cell: ({ getValue }) => (
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary)' }}>
          {getValue()}
        </span>
      )
    },
    {
      header: 'Date & Heure',
      accessorFn: (r) => fmtDate(r.dateReunion),
      cell: ({ getValue }) => (
        <span style={{ fontSize: 12, fontWeight: 600 }}>{getValue()}</span>
      )
    },
    {
      header: 'Lieu',
      accessorFn: (r) => r.lieu || '-',
      cell: ({ getValue }) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
          <MapPin size={13} color="var(--primary)" />
          <span>{getValue()}</span>
        </div>
      )
    },
    {
      header: 'Participants',
      accessorFn: (r) => r.participants?.length || 0,
      cell: ({ getValue }) => (
        <span className="badge badge-neutral" style={{ fontSize: 11 }}>
          <Users size={11} style={{ marginRight: 4 }} />
          {getValue()} pers.
        </span>
      )
    },
    {
      header: 'Statut',
      accessorKey: 'statut',
      cell: ({ getValue }) => {
        const val = getValue() || 'Planifiée';
        const c = {
          PLANIFIEE: 'badge-info',
          'Planifiée': 'badge-info',
          TENUE: 'badge-success',
          'Tenue': 'badge-success',
          ANNULEE: 'badge-danger',
          'Annulée': 'badge-danger'
        };
        return <span className={`badge ${c[val] || 'badge-neutral'}`}>{val}</span>;
      }
    },
    {
      header: 'Actions',
      id: 'actions',
      cell: ({ row }) => {
        const rid = row.original._id || row.original.id;
        return (
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => openEdit(row.original)}
              style={{
                background: 'rgba(0,103,79,0.08)', border: 'none', borderRadius: 6,
                padding: '4px 10px', color: 'var(--primary)', fontSize: 12, fontWeight: 600, cursor: 'pointer'
              }}
            >
              Modifier
            </button>
            <button
              onClick={() => setConfirmDeleteId(rid)}
              style={{
                background: 'rgba(220,38,38,0.08)', border: 'none', borderRadius: 6,
                padding: '4px 10px', color: 'var(--danger)', fontSize: 12, fontWeight: 600, cursor: 'pointer'
              }}
            >
              Supprimer
            </button>
          </div>
        );
      },
    },
  ], []);

  return (
    <div className="animate-fade-in space-y-5">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text-main)' }}>
            Réunions pré-départ & Générales
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            Planification, suivi de présence et compte-rendus des réunions
          </p>
        </div>
        <button
          onClick={() => { setEditId(null); setForm(EMPTY_FORM); setShowForm(true); }}
          className="btn-primary"
        >
          <Plus size={16} /> + Nouvelle réunion
        </button>
      </div>

      {/* Barre de recherche */}
      <div style={{ position: 'relative', maxWidth: 380, width: '100%' }}>
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Rechercher par titre, lieu, départ..."
          className="premium-input"
          style={{ paddingLeft: 36 }}
        />
      </div>

      <div className="premium-card">
        <DataTable columns={cols} data={paginatedReunions} loading={loading} />
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={reunionsFiltrees.length}
          itemsPerPage={limit}
          onPageChange={setPage}
          onLimitChange={(l) => { setLimit(l); setPage(1); }}
        />
      </div>

      {/* Modal Création / Édition */}
      <Modal open={showForm} onClose={() => { setShowForm(false); setEditId(null); }} title={editId ? 'Modifier la réunion' : 'Nouvelle réunion'} size="lg">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="input-label">Titre de la réunion *</label>
              <input
                value={form.titre}
                onChange={e => setForm(f => ({ ...f, titre: e.target.value }))}
                className="premium-input"
                placeholder="Ex: Réunion de cadrage départ Oumra Ramadan"
                required
              />
            </div>
            <div>
              <label className="input-label">Départ associé (Optionnel)</label>
              <select
                value={form.packageKId}
                onChange={e => setForm(f => ({ ...f, packageKId: e.target.value }))}
                className="premium-input"
              >
                <option value="">-- Aucun (Réunion générale) --</option>
                {packages.map(p => {
                  const pid = p._id || p.id;
                  return <option key={pid} value={pid}>{p.nomReference || p.nom_depart || pid}</option>;
                })}
              </select>
            </div>
            <div>
              <label className="input-label">Date et heure *</label>
              <input
                type="datetime-local"
                value={form.dateReunion}
                onChange={e => setForm(f => ({ ...f, dateReunion: e.target.value }))}
                className="premium-input"
                required
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="input-label">Lieu</label>
              <input
                value={form.lieu}
                onChange={e => setForm(f => ({ ...f, lieu: e.target.value }))}
                className="premium-input"
                placeholder="Ex: 115 Avenue Blaise Diagne, Dakar"
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="input-label">Ordre du jour</label>
              <textarea
                value={form.ordreJour}
                onChange={e => setForm(f => ({ ...f, ordreJour: e.target.value }))}
                className="premium-input"
                rows={3}
                placeholder="Points abordés, organisation, consignes sanitaires et vols..."
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label className="input-label" style={{ margin: 0 }}>
                Participants ({form.participants.length} sélectionné{form.participants.length > 1 ? 's' : ''})
              </label>
              {form.participants.length > 0 && (
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, participants: [] }))}
                  style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--danger)', cursor: 'pointer' }}
                >
                  Tout désélectionner
                </button>
              )}
            </div>
            <div style={{ maxHeight: 160, overflowY: 'auto', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: 8, background: '#fafafa' }}>
              {clients.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 8 }}>Aucun client disponible</p>
              ) : (
                clients.map(c => {
                  const cid = c._id || c.id;
                  const isChecked = form.participants.includes(cid);
                  return (
                    <label
                      key={cid}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px',
                        cursor: 'pointer', borderRadius: 6,
                        background: isChecked ? 'rgba(0,103,79,0.06)' : 'transparent',
                        transition: 'background 0.15s ease'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleParticipant(cid)}
                      />
                      <span style={{ fontSize: 13, fontWeight: isChecked ? 600 : 400 }}>
                        {c.nom} {c.prenom} {c.telephone ? `(${c.telephone})` : ''}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid var(--border-light)' }}>
            <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} className="btn-secondary">
              Annuler
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Enregistrement...' : (editId ? 'Mettre à jour' : 'Créer la réunion')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmation suppression */}
      <ConfirmDialog
        open={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleDelete}
        title="Supprimer la réunion"
        message="Êtes-vous sûr de vouloir supprimer cette réunion ? Cette action est irréversible."
        confirmText="Supprimer"
      />
    </div>
  );
}

