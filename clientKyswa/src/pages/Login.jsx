import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async ({ email, password }) => {
    setLoading(true); setError('');
    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.data.token, res.data.refreshToken);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Identifiants incorrects');
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 60%, #10B981 100%)',
      padding: '24px',
    }}>
      {/* Decorative circles */}
      <div style={{ position: 'fixed', top: -100, right: -100, width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: -80, left: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(230,181,55,0.08)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            overflow: 'hidden',
          }}>
            <img src="/logokyswa.jpg" alt="Kyswa Travel" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 20 }} />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>
            Kyswa Travel
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, marginTop: 6 }}>
            Plateforme de gestion interne
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: 'var(--radius-2xl)',
          padding: '36px 32px',
          boxShadow: 'var(--shadow-premium)',
          border: '1px solid rgba(255,255,255,0.8)',
        }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--text-main)', marginBottom: 24 }}>
            Connexion
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <label className="input-label">Email</label>
              <input {...register('email')} type="email" placeholder="prenom.nom@kyswa.sn" className="premium-input" />
              {errors.email && <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>{errors.email.message}</p>}
            </div>

            <div>
              <label className="input-label">Mot de passe</label>
              <input {...register('password')} type="password" placeholder="••••••••" className="premium-input" />
              {errors.password && <p style={{ color: 'var(--danger)', fontSize: 12, marginTop: 4 }}>{errors.password.message}</p>}
            </div>

            {error && (
              <div style={{
                background: 'var(--danger-bg)', border: '1px solid rgba(220,38,38,0.2)',
                borderRadius: 'var(--radius-md)', padding: '12px 16px',
                color: 'var(--danger)', fontSize: 13, fontWeight: 500,
              }}>{error}</div>
            )}

            <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: 4, width: '100%', justifyContent: 'center' }}>
              {loading ? 'Connexion...' : 'Se connecter →'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.45)', fontSize: 12, marginTop: 20 }}>
          Accès réservé au personnel autorisé
        </p>
      </div>
    </div>
  );
}
