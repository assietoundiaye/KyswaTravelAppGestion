import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';
import api from '../core/api/axios';

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
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-main)',
      padding: '24px',
    }}>
      <div style={{ 
        width: '100%', 
        maxWidth: 400, 
        animation: 'slideUp 0.6s ease-out'
      }}>
        {/* Card principale */}
        <div style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          padding: '3rem 2.5rem',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--border-light)',
          textAlign: 'center'
        }}>
          {/* Logo et titre */}
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ marginBottom: '1.5rem' }}>
              <img 
                src="/logokyswa.jpg" 
                alt="Kyswa Travel" 
                style={{ 
                  width: '120px', 
                  height: '120px', 
                  borderRadius: '20px',
                  objectFit: 'contain',
                  display: 'block',
                  margin: '0 auto'
                }} 
                onError={(e) => {
                  console.error('Logo loading error:', e);
                  e.target.style.display = 'none';
                }}
              />
            </div>
            <h1 style={{ 
              fontFamily: 'var(--font-display)', 
              fontSize: '1.8rem', 
              fontWeight: 700, 
              color: 'var(--primary)', 
              marginBottom: '0.3rem',
              letterSpacing: '-0.02em'
            }}>
              Kyswa Travel
            </h1>
            <p style={{ 
              color: 'var(--text-muted)', 
              fontSize: '0.9rem', 
              fontWeight: 400
            }}>
              Espace de gestion interne sécurisé
            </p>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit(onSubmit)} style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1rem',
            textAlign: 'left'
          }}>
            <div>
              <label className="input-label">Adresse email</label>
              <input 
                {...register('email')} 
                type="email" 
                placeholder="prenom.nom@kyswa.sn" 
                className="premium-input"
                style={{ fontSize: '14px' }}
              />
              {errors.email && (
                <p style={{ 
                  color: 'var(--danger)', 
                  fontSize: '12px', 
                  marginTop: '4px' 
                }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="input-label">Mot de passe</label>
              <input 
                {...register('password')} 
                type="password" 
                placeholder="••••••••" 
                className="premium-input"
                style={{ fontSize: '14px' }}
              />
              {errors.password && (
                <p style={{ 
                  color: 'var(--danger)', 
                  fontSize: '12px', 
                  marginTop: '4px' 
                }}>
                  {errors.password.message}
                </p>
              )}
            </div>

            {error && (
              <div style={{
                background: 'var(--danger-bg)', 
                border: '1px solid rgba(220,38,38,0.2)',
                borderRadius: 'var(--radius-md)', 
                padding: '12px 16px',
                color: 'var(--danger)', 
                fontSize: '13px', 
                fontWeight: 500,
                textAlign: 'center'
              }}>
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading} 
              className="btn-primary" 
              style={{ 
                marginTop: '1rem', 
                width: '100%', 
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 600
              }}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p style={{ 
          textAlign: 'center', 
          color: 'var(--text-muted)', 
          fontSize: '12px', 
          marginTop: '1.5rem' 
        }}>
          &copy; 2026 Kyswa Travel
        </p>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
