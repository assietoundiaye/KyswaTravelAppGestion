import { useAuth } from '../../context/AuthContext';

export default function DashboardHome() {
  const { role, user } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Tableau de bord</h1>
      <p className="text-sm text-gray-500">
        Bienvenue{user?.prenom ? ` ${user.prenom}` : ''} — rôle : <span className="font-medium text-primary uppercase">{role}</span>
      </p>
    </div>
  );
}
