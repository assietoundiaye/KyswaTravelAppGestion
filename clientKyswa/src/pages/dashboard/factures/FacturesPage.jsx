import { useEffect, useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import api from '../../../core/api/axios';
import DataTable from '../../../components/DataTable';
import Pagination from '../../../components/Pagination';

const fmt = (n) => Number(n || 0).toLocaleString('fr-FR') + ' FCFA';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

export default function FacturesPage() {
  const [reservations, setReservations] = useState([]);
  const [billets, setBillets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('reservations');
  const [search, setSearch] = useState('');

  // ── Pagination states ──────────────────────────────────────────────────────
  const [pageResa, setPageResa] = useState(1);
  const [limitResa, setLimitResa] = useState(25);
  const [pageBillet, setPageBillet] = useState(1);
  const [limitBillet, setLimitBillet] = useState(25);

  const reservationsFiltrees = useMemo(() => {
    if (!search.trim()) return reservations;
    const q = search.toLowerCase();
    return reservations.filter(r =>
      (r.idReservation || '').toLowerCase().includes(q) ||
      (r.numero || '').toLowerCase().includes(q) ||
      (r.clients || []).some(c => `${c.nom} ${c.prenom}`.toLowerCase().includes(q))
    );
  }, [reservations, search]);

  const billetsFiltres = useMemo(() => {
    if (!search.trim()) return billets;
    const q = search.toLowerCase();
    return billets.filter(b =>
      (b.numeroBillet || '').toLowerCase().includes(q) ||
      `${b.clientId?.nom || ''} ${b.clientId?.prenom || ''}`.toLowerCase().includes(q) ||
      (b.destination || '').toLowerCase().includes(q)
    );
  }, [billets, search]);

  const paginatedResa = useMemo(() => {
    const start = (pageResa - 1) * limitResa;
    return reservationsFiltrees.slice(start, start + limitResa);
  }, [reservationsFiltrees, pageResa, limitResa]);

  const paginatedBillets = useMemo(() => {
    const start = (pageBillet - 1) * limitBillet;
    return billetsFiltres.slice(start, start + limitBillet);
  }, [billetsFiltres, pageBillet, limitBillet]);

  const totalPagesResa = Math.ceil(reservationsFiltrees.length / limitResa) || 1;
  const totalPagesBillets = Math.ceil(billetsFiltres.length / limitBillet) || 1;

  useEffect(() => {
    Promise.all([api.get('/reservations'), api.get('/billets')])
      .then(([r, b]) => { setReservations(r.data.reservations || []); setBillets(b.data.billets || []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const colsResa = useMemo(() => [
    { header: 'N°', accessorKey: 'idReservation' },
    { header: 'Client(s)', accessorFn: (r) => r.clients?.map(c => `${c.nom} ${c.prenom}`).join(', ') || '-' },
    { header: 'Départ', accessorFn: (r) => fmtDate(r.dateDepart) },
    { header: 'Total dû', accessorFn: (r) => fmt(r.montantTotalDu) },
    {
      header: 'Reste', accessorKey: 'resteAPayer',
      cell: ({ getValue }) => <span className={getValue() > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>{fmt(getValue())}</span>
    },
    {
      header: 'Factures', id: 'actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <a href={`/api/factures/reservation/${row.original._id}?type=acompte`} target="_blank" rel="noreferrer"
            className="rounded-full bg-blue-100 text-blue-800 px-2 py-0.5 text-xs font-semibold hover:bg-blue-200">
            Acompte
          </a>
          <a href={`/api/factures/reservation/${row.original._id}?type=solde`} target="_blank" rel="noreferrer"
            className="rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-xs font-semibold hover:bg-green-200">
            Solde
          </a>
        </div>
      ),
    },
  ], []);

  const colsBillets = useMemo(() => [
    { header: 'N° Billet', accessorKey: 'numeroBillet' },
    { header: 'Client', accessorFn: (b) => b.clientId ? `${b.clientId.nom} ${b.clientId.prenom}` : '-' },
    { header: 'Destination', accessorKey: 'destination' },
    { header: 'Départ', accessorFn: (b) => fmtDate(b.dateDepart) },
    { header: 'Prix', accessorFn: (b) => fmt(b.prix) },
    {
      header: 'Reste', accessorKey: 'resteAPayer',
      cell: ({ getValue }) => <span className={getValue() > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>{fmt(getValue())}</span>
    },
    {
      header: 'Facture', id: 'actions',
      cell: ({ row }) => (
        <a href={`/api/factures/billet/${row.original._id}`} target="_blank" rel="noreferrer"
          className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-semibold hover:bg-primary/20">
          Télécharger PDF
        </a>
      ),
    },
  ], []);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Factures</h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div className="flex gap-2 border-b border-gray-200" style={{ flex: 1 }}>
          {['reservations', 'billets'].map(t => (
            <button key={t} onClick={() => { setTab(t); setSearch(''); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${tab === t ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t === 'reservations' ? 'Réservations' : 'Billets'}
            </button>
          ))}
        </div>
        {/* Barre de recherche */}
        <div style={{ position: 'relative', minWidth: 280 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              if (tab === 'reservations') setPageResa(1);
              else setPageBillet(1);
            }}
            placeholder={tab === 'reservations' ? 'Rechercher par N°, client...' : 'Rechercher par N° billet, client...'}
            className="premium-input"
            style={{ paddingLeft: 36 }}
          />
        </div>
      </div>

      <div className="premium-card">
        {tab === 'reservations' ? (
          <>
            <DataTable columns={colsResa} data={paginatedResa} loading={loading} />
            <Pagination
              currentPage={pageResa}
              totalPages={totalPagesResa}
              totalItems={reservationsFiltrees.length}
              itemsPerPage={limitResa}
              onPageChange={setPageResa}
              onLimitChange={(l) => { setLimitResa(l); setPageResa(1); }}
            />
          </>
        ) : (
          <>
            <DataTable columns={colsBillets} data={paginatedBillets} loading={loading} />
            <Pagination
              currentPage={pageBillet}
              totalPages={totalPagesBillets}
              totalItems={billetsFiltres.length}
              itemsPerPage={limitBillet}
              onPageChange={setPageBillet}
              onLimitChange={(l) => { setLimitBillet(l); setPageBillet(1); }}
            />
          </>
        )}
      </div>
    </div>
  );
}
