import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

const schema = z.object({
  numeroReservation: z
    .string()
    .min(1, 'Le numéro de réservation est requis'),
  nomClient: z.string().min(2, 'Le nom du client est requis'),
});

const statutConfig = {
  EN_ATTENTE: { label: 'En attente', className: 'bg-yellow-100 text-yellow-800' },
  CONFIRMEE: { label: 'Confirmée', className: 'bg-blue-100 text-blue-800' },
  PAYEE: { label: 'Payée', className: 'bg-green-100 text-green-800' },
  ANNULEE: { label: 'Annulée', className: 'bg-red-100 text-red-800' },
};

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR') : '-';

const formatMoney = (n) =>
  Number(n).toLocaleString('fr-FR') + ' FCFA';

export default function SuiviReservation() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async ({ numeroReservation, nomClient }) => {
    setLoading(true);
    setError('');
    setData(null);
    try {
      const res = await api.get('/public/reservation', {
        params: { numeroReservation, nomClient },
      });
      setData(res.data);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Réservation non trouvée ou nom incorrect'
      );
    } finally {
      setLoading(false);
    }
  };

  const statut = data ? (statutConfig[data.statut] || { label: data.statut, className: 'bg-gray-100 text-gray-800' }) : null;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-lg">
        <h1 className="mb-1 text-2xl font-bold text-gray-900">Suivi de réservation</h1>
        <p className="mb-6 text-sm text-gray-500">
          Entrez votre numéro de réservation et votre nom pour consulter votre dossier.
        </p>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Numéro de réservation
            </label>
            <input
              {...register('numeroReservation')}
              placeholder="ex: 1748291234567"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {errors.numeroReservation && (
              <p className="mt-1 text-xs text-red-600">{errors.numeroReservation.message}</p>
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
            {/* Statut + clients */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Réservation n°</p>
                <p className="font-semibold text-gray-900">{data.idReservation}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statut.className}`}>
                {statut.label}
              </span>
            </div>

            <div>
              <p className="text-xs text-gray-500 mb-1">Client(s)</p>
              <p className="text-sm text-gray-800">
                {data.clients.map((c) => `${c.nom} ${c.prenom}`).join(', ')}
              </p>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Départ</p>
                <p className="text-sm font-medium text-gray-800">{formatDate(data.dateDepart)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Retour</p>
                <p className="text-sm font-medium text-gray-800">{formatDate(data.dateRetour)}</p>
              </div>
              {data.formule && (
                <div>
                  <p className="text-xs text-gray-500">Formule</p>
                  <p className="text-sm font-medium text-gray-800">{data.formule}</p>
                </div>
              )}
              {data.niveauConfort && (
                <div>
                  <p className="text-xs text-gray-500">Confort</p>
                  <p className="text-sm font-medium text-gray-800">{data.niveauConfort}</p>
                </div>
              )}
            </div>

            {/* Reste à payer */}
            <div className="rounded-lg bg-gray-50 px-4 py-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Reste à payer</p>
              <p className={`text-2xl font-bold ${data.resteAPayer > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatMoney(data.resteAPayer)}
              </p>
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

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-2">
              <a
                href={`/api/factures/reservation/${data.idReservation}`}
                target="_blank"
                rel="noreferrer"
                className="w-full rounded-lg border border-primary bg-white px-4 py-2 text-center text-sm font-semibold text-primary hover:bg-primary/5"
              >
                Télécharger la facture PDF
              </a>
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          Vous avez un billet ?{' '}
          <Link to="/suivi/billet" className="text-primary font-medium hover:underline">
            Suivi Billet
          </Link>
        </p>
      </div>
    </main>
  );
}
