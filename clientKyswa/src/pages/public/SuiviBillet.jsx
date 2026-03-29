import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

const schema = z.object({
  numeroBillet: z.string().min(1, 'Le numéro de billet est requis'),
  nomClient: z.string().min(2, 'Le nom du client est requis'),
});

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR') : '-';

const formatMoney = (n) =>
  Number(n).toLocaleString('fr-FR') + ' FCFA';

export default function SuiviBillet() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async ({ numeroBillet, nomClient }) => {
    setLoading(true);
    setError('');
    setData(null);
    try {
      const res = await api.get('/public/billet', {
        params: { numeroBillet, nomClient },
      });
      setData(res.data);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Billet non trouvé ou nom incorrect'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-lg">
        <h1 className="mb-1 text-2xl font-bold text-gray-900">Suivi de billet</h1>
        <p className="mb-6 text-sm text-gray-500">
          Entrez votre numéro de billet et votre nom pour consulter votre dossier.
        </p>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numéro de billet
            </label>
            <input
              {...register('numeroBillet')}
              placeholder="ex: BIL-001"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.numeroBillet && (
              <p className="mt-1 text-xs text-red-600">{errors.numeroBillet.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom du client
            </label>
            <input
              {...register('nomClient')}
              placeholder="ex: Diallo"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.nomClient && (
              <p className="mt-1 text-xs text-red-600">{errors.nomClient.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
          >
            {loading ? 'Recherche...' : 'Consulter'}
          </button>
        </form>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {data && (
          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5">
            {/* En-tête */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Billet n°</p>
                <p className="font-semibold text-gray-900">{data.numeroBillet}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${data.statut === 'ANNULE' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                {data.statut}
              </span>
            </div>

            {/* Client */}
            <div>
              <p className="text-xs text-gray-500 mb-1">Client</p>
              <p className="text-sm text-gray-800">{data.client.nom} {data.client.prenom}</p>
            </div>

            {/* Détails vol */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Compagnie</p>
                <p className="text-sm font-medium text-gray-800">{data.compagnie}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Classe</p>
                <p className="text-sm font-medium text-gray-800">{data.classe}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Destination</p>
                <p className="text-sm font-medium text-gray-800">{data.destination}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Type</p>
                <p className="text-sm font-medium text-gray-800">{data.typeBillet}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Départ</p>
                <p className="text-sm font-medium text-gray-800">{formatDate(data.dateDepart)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Arrivée</p>
                <p className="text-sm font-medium text-gray-800">{formatDate(data.dateArrivee)}</p>
              </div>
            </div>

            {/* Prix + reste */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-gray-50 px-4 py-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Prix total</p>
                <p className="text-lg font-bold text-gray-800">{formatMoney(data.prix)}</p>
              </div>
              <div className="rounded-lg bg-gray-50 px-4 py-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Reste à payer</p>
                <p className={`text-lg font-bold ${data.resteAPayer > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatMoney(data.resteAPayer)}
                </p>
              </div>
            </div>

            {/* Paiements */}
            {data.paiements?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Paiements</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-gray-500">
                        <th className="pb-2 pr-3">Date</th>
                        <th className="pb-2 pr-3">Mode</th>
                        <th className="pb-2 pr-3">Référence</th>
                        <th className="pb-2 text-right">Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.paiements.map((p, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-2 pr-3 text-gray-700">{formatDate(p.dateReglement)}</td>
                          <td className="py-2 pr-3 text-gray-700">{p.mode}</td>
                          <td className="py-2 pr-3 text-gray-500">{p.reference || '-'}</td>
                          <td className="py-2 text-right font-medium text-gray-800">{formatMoney(p.montant)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Facture */}
            <a
              href={`/api/factures/billet/${data.numeroBillet}`}
              target="_blank"
              rel="noreferrer"
              className="block w-full rounded-lg border border-primary bg-white px-4 py-2 text-center text-sm font-semibold text-primary hover:bg-primary/5"
            >
              Télécharger la facture PDF
            </a>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          Vous avez une réservation ?{' '}
          <Link to="/suivi/reservation" className="text-primary font-medium hover:underline">
            Suivi Réservation
          </Link>
        </p>
      </div>
    </main>
  );
}
