import { useEffect, useState, useMemo } from 'react';
import api from '../../../api/axios';
import DataTable from '../../../components/DataTable';
import { toast } from '../../../components/Toast';

const statutColors = {
  EN_ATTENTE_PASSEPORT: 'badge-neutral',
  PASSEPORT_RECU: 'badge-info',
  ENVOYE_PLATEFORME: 'badge-warning',
  VISA_RECU: 'badge-success',
  REFUSE: 'badge-danger',
};

const statutLabels = {
  EN_ATTENTE_PASSEPORT: 'En attente passeport',
  PASSEPORT_RECU: 'Passeport reçu',
  ENVOYE_PLATEFORME: 'Envoyé plateforme',
  VISA_RECU: 'Visa reçu',
  REFUSE: 'Refusé',
};

const STATUTS = Object.keys(statutLabels);

export default function VisasPage() {
  const [visas, setVisas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatut, setFilterStatut] = useState('');

  const fetchVisas = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatut) params.statut = filterStatut;
      const res = await api.get('/visas', { params });
      setVisas(res.data.visas || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchVisas(); }, [filterStatut]);

  const updateStatut = async (id, statut, extra = {}) => {
    try {
      await api.patch(`/visas/${id}`, { statut, ...extra });
      toast('Statut mis à jour');
      fetchVisas();
    } catch (e) { toast(e.response?.data?.message || 'Erreur', 'error'); }
  };

  const cols = useMemo(() => [
    { header: 'Client', accessorFn: (v) => v.clientId ? `${v.clientId.nom} ${v.clientId.prenom}` : '-' },
    { header: 'Passeport', accessorFn: (v) => v.clientId?.numeroPasseport || '-' },
    { header: 'Réservation', accessorFn: (v) => v.reservationId?.numero || v.reservationId?.idReservation || '-' },
    {
      header: 'Statut', accessorKey: 'statut',
      cell: ({ getValue }) => <span className={`badge ${statutColors[getValue()] || 'badge-neutral'}`}>{statutLabels[getValue()] || getValue()}</span>
    },
    { header: 'Date envoi', accessorFn: (v) => v.dateEnvoi ? new Date(v.dateEnvoi).toLocaleDateString('fr-FR') : '-' },
    { header: 'Date réception', accessorFn: (v) => v.dateReception ? new Date(v.dateReception).toLocaleDateString('fr-FR') : '-' },
    {
      header: 'Actions', id: 'actions',
      cell: ({ row }) => {
        const v = row.original;
        const next = {
          EN_ATTENTE_PASSEPORT: 'PASSEPORT_RECU',
          PASSEPORT_RECU: 'ENVOYE_PLATEFORME',
          ENVOYE_PLATEFORME: 'VISA_RECU',
        };
        return (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {next[v.statut] && (
              <button onClick={() => updateStatut(v._id, next[v.statut], next[v.statut] === 'ENVOYE_PLATEFORME' ? { dateEnvoi: new Date() } : next[v.statut] === 'VISA_RECU' ? { dateReception: new Date() } : {})}
                className="btn-primary" style={{ padding: '4px 10px', fontSize: 11 }}>
                → {statutLabels[next[v.statut]]}
              </button>
            )}
            {v.statut === 'ENVOYE_PLATEFORME' && (
              <button onClick={() => {
                const motif = prompt('Motif de refus :');
                if (motif !== null) updateStatut(v._id, 'REFUSE', { motifRefus: motif });
              }}
                className="btn-danger" style={{ padding: '4px 10px', fontSize: 11 }}>
                Refusé
              </button>
            )}
          </div>
        );
      },
    },
  ], []);

  return (
    <div className="animate-fade-in space-y-5">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text-main)' }}>
          Suivi Visas
        </h1>
        <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)} className="premium-input" style={{ width: 220 }}>
          <option value="">Tous les statuts</option>
          {STATUTS.map(s => <option key={s} value={s}>{statutLabels[s]}</option>)}
        </select>
      </div>

      <div className="premium-card">
        <DataTable columns={cols} data={visas} loading={loading} />
      </div>
    </div>
  );
}
