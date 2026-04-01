import { useEffect, useState } from 'react';
import api from '../../../api/axios';
import { useAuth } from '../../../context/AuthContext';
import { toast } from '../../../components/Toast';
import { useSocket } from '../../../hooks/useSocket';

const fmtDate = (d) => d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';

export default function MessagesPage() {
  const { user } = useAuth();
  const { socket, connected, resetUnread, sendMessage } = useSocket();
  const [messages, setMessages] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ destinataireId: '', contenu: '' });
  const [sending, setSending] = useState(false);

  const fetchMessages = async () => {
    try {
      const [m, u] = await Promise.all([api.get('/messages'), api.get('/users')]);
      setMessages(m.data.messages || []);
      setUtilisateurs((u.data.utilisateurs || []).filter(u => u._id !== user?.id && u.id !== user?.id));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchMessages();
    resetUnread(); // Réinitialiser le badge en entrant sur la page

    // Écouter les nouveaux messages en temps réel
    if (socket) {
      socket.on('new_message', (msg) => {
        setMessages(prev => [msg, ...prev]);
      });
      socket.on('message_sent', (msg) => {
        setMessages(prev => [msg, ...prev]);
      });
    }

    return () => {
      if (socket) {
        socket.off('new_message');
        socket.off('message_sent');
      }
    };
  }, [socket]);

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      // Envoyer via Socket.IO pour le temps réel
      sendMessage(form.destinataireId, form.contenu);
      // Aussi via API pour la persistance
      await api.post('/messages', form);
      setShowForm(false);
      setForm({ destinataireId: '', contenu: '' });
      toast('Message envoyé');
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur', 'error');
    } finally { setSending(false); }
  };

  const markAsRead = async (id) => {
    try { await api.patch(`/messages/${id}/lu`); fetchMessages(); }
    catch (e) { console.error(e); }
  };

  const reçus = messages.filter(m => m.destinataireId?._id === user?.id || m.destinataireId?.id === user?.id);
  const envoyés = messages.filter(m => m.expediteurId?._id === user?.id || m.expediteurId?.id === user?.id);
  const nonLus = reçus.filter(m => !m.lu).length;

  return (
    <div className="animate-fade-in space-y-5" style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text-main)' }}>
            Messages internes
          </h1>
          {nonLus > 0 && (
            <span className="badge badge-warning" style={{ marginTop: 4 }}>{nonLus} non lu(s)</span>
          )}
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ Nouveau message</button>
      </div>

      {showForm && (
        <form onSubmit={handleSend} className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700 }}>Nouveau message</h2>
          <div>
            <label className="input-label">Destinataire *</label>
            <select value={form.destinataireId} onChange={e => setForm(f => ({...f, destinataireId: e.target.value}))} className="premium-input">
              <option value="">Sélectionner un agent...</option>
              {utilisateurs.map(u => (
                <option key={u._id || u.id} value={u._id || u.id}>{u.prenom} {u.nom} — {u.role}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="input-label">Message *</label>
            <textarea value={form.contenu} onChange={e => setForm(f => ({...f, contenu: e.target.value}))}
              rows={4} className="premium-input" style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Annuler</button>
            <button type="submit" disabled={sending} className="btn-primary">
              {sending ? 'Envoi...' : 'Envoyer'}
            </button>
          </div>
        </form>
      )}

      {/* Messages reçus */}
      <div className="premium-card">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, marginBottom: 16, color: 'var(--text-main)' }}>
          Reçus ({reçus.length})
        </h2>
        {loading ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Chargement...</p> :
          reçus.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Aucun message reçu</p> :
          reçus.map(m => (
            <div key={m._id} style={{
              padding: '14px 16px', borderRadius: 'var(--radius-md)', marginBottom: 8,
              background: m.lu ? 'var(--bg-main)' : 'rgba(var(--primary-rgb), 0.06)',
              border: m.lu ? '1px solid var(--border-light)' : '1px solid rgba(var(--primary-rgb), 0.2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>
                  {m.expediteurId?.prenom} {m.expediteurId?.nom}
                  <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>({m.expediteurId?.role})</span>
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDate(m.createdAt)}</span>
                  {!m.lu && (
                    <button onClick={() => markAsRead(m._id)}
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                      Marquer lu
                    </button>
                  )}
                </div>
              </div>
              <p style={{ fontSize: 14, color: 'var(--text-main)', lineHeight: 1.5 }}>{m.contenu}</p>
            </div>
          ))
        }
      </div>

      {/* Messages envoyés */}
      <div className="premium-card">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, marginBottom: 16, color: 'var(--text-main)' }}>
          Envoyés ({envoyés.length})
        </h2>
        {envoyés.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Aucun message envoyé</p> :
          envoyés.map(m => (
            <div key={m._id} style={{
              padding: '14px 16px', borderRadius: 'var(--radius-md)', marginBottom: 8,
              background: 'var(--bg-main)', border: '1px solid var(--border-light)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                  À : {m.destinataireId?.prenom} {m.destinataireId?.nom}
                  <span style={{ fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>({m.destinataireId?.role})</span>
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{fmtDate(m.createdAt)}</span>
                  <span className={`badge ${m.lu ? 'badge-success' : 'badge-neutral'}`}>{m.lu ? 'Lu' : 'Non lu'}</span>
                </div>
              </div>
              <p style={{ fontSize: 14, color: 'var(--text-main)', lineHeight: 1.5 }}>{m.contenu}</p>
            </div>
          ))
        }
      </div>
    </div>
  );
}
