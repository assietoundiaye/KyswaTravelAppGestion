import { useEffect, useState, useMemo } from 'react';
import { 
  Search, Send, Inbox, MailCheck, Trash2, 
  MessageSquare, User, Clock, AlertCircle, Plus,
  Sparkles, CheckCheck
} from 'lucide-react';
import api from '../../../core/api/axios';
import { useAuth } from '../../../context/AuthContext';
import { toast } from '../../../components/Toast';
import { useSocket } from '../../../hooks/useSocket';
import { ROLE_LABELS, ROLE_COLORS } from '../../../utils/roles';
import Modal from '../../../components/Modal';

const fmtDate = (d) => {
  if (!d) return '';
  const date = new Date(d);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export default function MessagesPage() {
  const { user } = useAuth();
  const { socket, resetUnread, sendMessage } = useSocket();
  
  const [messages, setMessages] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('recus'); // 'recus' | 'envoyes'
  const [search, setSearch] = useState('');

  // Modal nouveau message
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ destinataireId: '', contenu: '', priorite: 'normal' });
  const [sending, setSending] = useState(false);

  const fetchMessages = async () => {
    try {
      const [msgRes, usersRes] = await Promise.all([
        api.get('/messages'),
        api.get('/users').catch(() => ({ data: { data: [] } }))
      ]);
      const msgList = msgRes.data?.messages || msgRes.data?.data || [];
      setMessages(msgList);
      
      const userList = usersRes.data?.utilisateurs || usersRes.data?.data || usersRes.data?.users || [];
      setUtilisateurs(userList.filter(u => (u.id || u._id) !== user?.id));
    } catch (e) {
      console.error('Erreur chargement messages:', e);
      toast('Erreur lors du chargement des messages', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    resetUnread();

    if (socket) {
      const handleNewMessage = (msg) => {
        setMessages(prev => {
          // Éviter les doublons
          if (prev.some(m => (m.id || m._id) === (msg.id || msg._id))) return prev;
          return [msg, ...prev];
        });
        toast(`Nouveau message de ${msg.expediteurId?.prenom || 'un collaborateur'}`);
      };

      const handleSentMessage = (msg) => {
        setMessages(prev => {
          if (prev.some(m => (m.id || m._id) === (msg.id || msg._id))) return prev;
          return [msg, ...prev];
        });
      };

      socket.on('new_message', handleNewMessage);
      socket.on('message_sent', handleSentMessage);

      return () => {
        socket.off('new_message', handleNewMessage);
        socket.off('message_sent', handleSentMessage);
      };
    }
  }, [socket]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.destinataireId) return toast('Veuillez sélectionner un destinataire', 'error');
    if (!form.contenu.trim()) return toast('Le message ne peut pas être vide', 'error');

    setSending(true);
    try {
      // Envoyer via Socket.IO pour temps réel immédiat
      sendMessage(form.destinataireId, form.contenu);
      
      // Persistance API
      const res = await api.post('/messages', form);
      if (res.data?.data) {
        setMessages(prev => [res.data.data, ...prev.filter(m => (m.id || m._id) !== (res.data.data.id || res.data.data._id))]);
      }
      
      setShowModal(false);
      setForm({ destinataireId: '', contenu: '', priorite: 'normal' });
      toast('Message envoyé avec succès', 'success');
      fetchMessages();
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur lors de l\'envoi du message', 'error');
    } finally {
      setSending(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.patch(`/messages/${id}/lu`);
      setMessages(prev => prev.map(m => (m.id === id || m._id === id) ? { ...m, lu: true } : m));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce message ?')) return;
    try {
      await api.delete(`/messages/${id}`);
      setMessages(prev => prev.filter(m => (m.id || m._id) !== id));
      toast('Message supprimé', 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Erreur lors de la suppression', 'error');
    }
  };

  // Séparation reçus / envoyés
  const currentUserId = user?.id;
  const recus = useMemo(() => {
    return messages.filter(m => {
      const expId = m.expediteurId?.id || m.expediteurId?._id || m.expediteur_id || m.sender_id;
      return expId !== currentUserId;
    });
  }, [messages, currentUserId]);

  const envoyes = useMemo(() => {
    return messages.filter(m => {
      const expId = m.expediteurId?.id || m.expediteurId?._id || m.expediteur_id || m.sender_id;
      return expId === currentUserId;
    });
  }, [messages, currentUserId]);

  const nonLusCount = useMemo(() => recus.filter(m => !m.lu).length, [recus]);

  // Filtre de recherche
  const listAffichee = useMemo(() => {
    const list = activeTab === 'recus' ? recus : envoyes;
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(m => {
      const contenu = (m.contenu || '').toLowerCase();
      const expName = `${m.expediteurId?.prenom || ''} ${m.expediteurId?.nom || ''}`.toLowerCase();
      const destName = `${m.destinataireId?.prenom || ''} ${m.destinataireId?.nom || ''}`.toLowerCase();
      return contenu.includes(q) || expName.includes(q) || destName.includes(q);
    });
  }, [activeTab, recus, envoyes, search]);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 900, margin: '0 auto' }}>
      
      {/* ── EN-TÊTE DE PAGE ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <MessageSquare size={26} color="var(--primary)" /> Messagerie Interne
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            Communiquez instantanément avec tous les membres de l'équipe Kyswa Travel
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px' }}
        >
          <Plus size={18} /> Nouveau message
        </button>
      </div>

      {/* ── BARRE D'ONGLETS & RECHERCHE ────────────────────────────────────── */}
      <div className="premium-card" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        {/* Onglets Reçus / Envoyés */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setActiveTab('recus')}
            style={{
              background: activeTab === 'recus' ? 'var(--primary)' : '#F3F4F6',
              color: activeTab === 'recus' ? 'white' : 'var(--text-main)',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.15s ease',
            }}
          >
            <Inbox size={16} /> Boîte de réception ({recus.length})
            {nonLusCount > 0 && (
              <span style={{
                background: activeTab === 'recus' ? '#EF4444' : '#DC2626',
                color: 'white',
                fontSize: 11,
                fontWeight: 800,
                borderRadius: 12,
                padding: '1px 7px',
              }}>
                {nonLusCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('envoyes')}
            style={{
              background: activeTab === 'envoyes' ? 'var(--primary)' : '#F3F4F6',
              color: activeTab === 'envoyes' ? 'white' : 'var(--text-main)',
              border: 'none',
              borderRadius: 8,
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.15s ease',
            }}
          >
            <Send size={15} /> Messages envoyés ({envoyes.length})
          </button>
        </div>

        {/* Barre de recherche */}
        <div style={{ position: 'relative', width: 260 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un message..."
            className="premium-input"
            style={{ paddingLeft: 34, height: 38, fontSize: 13 }}
          />
        </div>
      </div>

      {/* ── LISTE DES MESSAGES ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <div style={{ width: 28, height: 28, border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : listAffichee.length === 0 ? (
          <div className="premium-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(0,103,79,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto', color: 'var(--primary)' }}>
              <Inbox size={24} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)' }}>
              {activeTab === 'recus' ? 'Aucun message reçu' : 'Aucun message envoyé'}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              {search ? 'Aucun résultat ne correspond à votre recherche.' : 'Commencez une conversation en envoyant un nouveau message.'}
            </p>
          </div>
        ) : (
          listAffichee.map(m => {
            const msgId = m.id || m._id;
            const contact = activeTab === 'recus' ? m.expediteurId : m.destinataireId;
            const roleKey = (contact?.role || '').toLowerCase();
            const roleBadgeColor = ROLE_COLORS[roleKey] || '#00674F';
            const roleText = ROLE_LABELS[roleKey] || contact?.role || 'Agent';
            const initial = (contact?.prenom?.[0] || contact?.nom?.[0] || '?').toUpperCase();

            return (
              <div
                key={msgId}
                className="premium-card"
                style={{
                  padding: '16px 20px',
                  background: (!m.lu && activeTab === 'recus') ? '#F0FDF4' : 'white',
                  border: (!m.lu && activeTab === 'recus') ? '1px solid #BBF7D0' : '1px solid var(--border)',
                  boxShadow: (!m.lu && activeTab === 'recus') ? '0 2px 10px rgba(0,103,79,0.06)' : undefined,
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Ligne En-tête du message */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Avatar */}
                    <div style={{
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      background: `linear-gradient(135deg, ${roleBadgeColor}, #00674F)`,
                      color: 'white',
                      fontWeight: 800,
                      fontSize: 15,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {initial}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>
                          {activeTab === 'recus' ? `${contact?.prenom || ''} ${contact?.nom || ''}` : `À : ${contact?.prenom || ''} ${contact?.nom || ''}`}
                        </span>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 12,
                          background: `${roleBadgeColor}15`,
                          color: roleBadgeColor,
                          border: `1px solid ${roleBadgeColor}30`,
                        }}>
                          {roleText}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions et Date */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} /> {fmtDate(m.createdAt || m.created_at)}
                    </span>

                    {activeTab === 'recus' && !m.lu && (
                      <button
                        onClick={() => markAsRead(msgId)}
                        style={{
                          background: '#DCFCE7',
                          border: '1px solid #86EFAC',
                          color: '#15803D',
                          borderRadius: 6,
                          padding: '3px 8px',
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                        title="Marquer comme lu"
                      >
                        <CheckCheck size={13} /> Marquer lu
                      </button>
                    )}

                    {activeTab === 'envoyes' && (
                      <span style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: m.lu ? '#16A34A' : '#9CA3AF',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3,
                      }}>
                        <CheckCheck size={14} /> {m.lu ? 'Lu' : 'Envoyé'}
                      </span>
                    )}

                    <button
                      onClick={() => handleDelete(msgId)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#9CA3AF',
                        cursor: 'pointer',
                        padding: 4,
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Supprimer le message"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Corps du message */}
                <div style={{
                  fontSize: 14,
                  color: 'var(--text-main)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  paddingLeft: 50,
                }}>
                  {m.contenu}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── MODAL COMPOSER UN MESSAGE ────────────────────────────────────── */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Nouveau message interne"
      >
        <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="input-label">Destinataire *</label>
            <select
              value={form.destinataireId}
              onChange={e => setForm(f => ({ ...f, destinataireId: e.target.value }))}
              className="premium-input"
              required
            >
              <option value="">Choisir un destinataire...</option>
              <option value="tous">📢 Toute l'équipe (Message général)</option>
              {utilisateurs.map(u => {
                const uId = u.id || u._id;
                const rLabel = ROLE_LABELS[(u.role || '').toLowerCase()] || u.role;
                return (
                  <option key={uId} value={uId}>
                    {u.prenom} {u.nom} — ({rLabel})
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="input-label">Message *</label>
            <textarea
              value={form.contenu}
              onChange={e => setForm(f => ({ ...f, contenu: e.target.value }))}
              className="premium-input"
              rows={5}
              placeholder="Écrivez votre message ici..."
              style={{ resize: 'vertical' }}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="btn-secondary"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={sending}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Send size={15} /> {sending ? 'Envoi en cours...' : 'Envoyer le message'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
