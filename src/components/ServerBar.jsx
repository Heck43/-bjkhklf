import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { Compass, Plus, X } from 'lucide-react';

// мяууу~~ вот наша панель серверов!
// тут мы переключаемся между серверами, это так удобно! 🐾

export default function ServerBar({ onMobileSelect }) {
  const { servers, activeServerId, createServer, joinServer, unreadCounts } = useStore();
  const navigate = useNavigate();

  // стейты для красивой модалочки создания сервера~~
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('choose'); // 'choose', 'create', 'join'
  const [serverName, setServerName] = useState('');
  const [serverIcon, setServerIcon] = useState('🌸');
  const [inviteCode, setInviteCode] = useState('');
  const [joinError, setJoinError] = useState('');

  const handleHomeClick = () => {
    // переходим на домашний экран через роутер~~
    navigate('/channels/@me/friends');
    if (onMobileSelect) onMobileSelect();
  };

  const handleServerClick = (server) => {
    // переходим на первый канал выбранного сервера через роутер, ня~~
    const firstChannel = server.channels[0];
    if (firstChannel) {
      navigate(`/channels/${server.id}/${firstChannel.id}`);
    } else {
      navigate(`/channels/${server.id}/none`);
    }
    if (onMobileSelect) onMobileSelect();
  };

  const handleCreateServer = async (e) => {
    e.preventDefault();
    if (!serverName.trim()) return;
    const res = await createServer(serverName.trim(), serverIcon);
    if (res.success && res.server) {
      setShowModal(false);
      setServerName('');
      // переходим на созданный сервер в дефолтный канал general~~
      const firstChannel = res.server.channels?.[0];
      if (firstChannel) {
        navigate(`/channels/${res.server.id}/${firstChannel.id}`);
      } else {
        navigate(`/channels/${res.server.id}/none`);
      }
      if (onMobileSelect) onMobileSelect();
    }
  };

  const handleJoinServer = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    const res = await joinServer(inviteCode.trim());
    if (res.success) {
      setShowModal(false);
      setInviteCode('');
      // переходим на присоединенный сервер~~
      const joinedServer = useStore.getState().servers.find(s => s.id === inviteCode.trim());
      const firstChannel = joinedServer?.channels?.[0];
      if (firstChannel) {
        navigate(`/channels/${joinedServer.id}/${firstChannel.id}`);
      } else {
        navigate('/channels/@me/friends');
      }
      if (onMobileSelect) onMobileSelect();
    } else {
      setJoinError(res.message || 'сервер не найден!');
    }
  };

  // считаем все непрочитанные сообщения в личных чатах (DMs)~~
  const dmUnreadCount = Object.entries(unreadCounts || {})
    .filter(([key]) => key.startsWith('dm_'))
    .reduce((sum, [_, count]) => sum + count, 0);

  return (
    <div className="server-bar">
      {/* главная кнопка (лс и друзья)~~ */}
      <div 
        className={`server-icon-wrapper ${activeServerId === null ? 'active' : ''}`}
        onClick={handleHomeClick}
        title="Личные сообщения"
      >
        <div className="server-pill" />
        <div className="server-icon" style={{ backgroundColor: activeServerId === null ? '#5865F2' : '' }}>
          👾
          {dmUnreadCount > 0 && (
            <div className="unread-badge">{dmUnreadCount}</div>
          )}
        </div>
      </div>

      <div className="server-separator" />

      {/* список всех серверов~~ мррр~~ */}
      {servers.map((server) => {
        // считаем все непрочитанные на каналах этого сервера~~
        const serverUnreadCount = (server.channels || [])
          .reduce((sum, ch) => sum + (unreadCounts[ch.id] || 0), 0);

        return (
          <div 
            key={server.id}
            className={`server-icon-wrapper ${activeServerId === server.id ? 'active' : ''}`}
            onClick={() => handleServerClick(server)}
            title={server.name}
          >
            <div className="server-pill" />
            <div className="server-icon" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {server.icon && (server.icon.startsWith('data:image/') || server.icon.startsWith('http')) ? (
                <img src={server.icon} alt={server.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                server.icon || server.name[0] || '?'
              )}
              {serverUnreadCount > 0 && (
                <div className="unread-badge">{serverUnreadCount}</div>
              )}
            </div>
          </div>
        );
      })}

      <div className="server-separator" />

      {/* кнопка добавления нового сервера~~ */}
      <div 
        className="server-icon-wrapper" 
        onClick={() => { setModalMode('choose'); setShowModal(true); }} 
        title="Добавить сервер"
        style={{ cursor: 'pointer' }}
      >
        <div className="server-icon" style={{ color: '#23a55a' }}>
          <Plus size={20} />
        </div>
      </div>

      <div className="server-icon-wrapper" title="Исследовать публичные серверы">
        <div className="server-icon" style={{ color: '#23a55a' }}>
          <Compass size={20} />
        </div>
      </div>

      {/* красивое модальное окно создания или присоединения к серверу~~ мяу! */}
      {showModal && (
        <div className="settings-overlay" onClick={() => setShowModal(false)}>
          <div className="settings-modal" style={{ width: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="settings-header">
              <span className="settings-title">
                {modalMode === 'choose' && 'Добавить сервер'}
                {modalMode === 'create' && 'Создать свой сервер'}
                {modalMode === 'join' && 'Присоединиться к серверу'}
              </span>
              <button className="close-modal-btn" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            {modalMode === 'choose' && (
              <div className="settings-body" style={{ padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <span style={{ fontSize: 14, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 12 }}>
                  Выберите, хотите ли вы создать новый сервер или зайти на существующий по приглашению~~ owo
                </span>
                <button 
                  type="button"
                  className="btn-primary" 
                  style={{ padding: '16px', borderRadius: 8, fontSize: 15, fontWeight: 'bold', height: 'auto', cursor: 'pointer' }}
                  onClick={() => setModalMode('create')}
                >
                  Создать новый сервер
                </button>
                <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', margin: '4px 0' }}>ИЛИ</div>
                <button 
                  type="button"
                  className="btn-secondary" 
                  style={{ padding: '16px', borderRadius: 8, fontSize: 15, fontWeight: 'bold', height: 'auto', border: '1px solid var(--discord-blurple)', color: 'var(--discord-blurple)', cursor: 'pointer' }}
                  onClick={() => setModalMode('join')}
                >
                  Присоединиться по коду
                </button>
              </div>
            )}

            {modalMode === 'create' && (
              <form onSubmit={handleCreateServer}>
                <div className="settings-body" style={{ padding: '24px 20px' }}>
                  <span style={{ fontSize: 14, color: 'var(--text-muted)', display: 'block', marginBottom: 20 }}>
                    твой сервер — это место, где ты общаешься с друзьями! создай его и назови как хочешь~~
                  </span>
                  
                  <div className="form-group">
                    <label className="form-label">название сервера</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Мой милый сервер..."
                      value={serverName}
                      onChange={(e) => setServerName(e.target.value)}
                      required
                      maxLength={30}
                      autoFocus
                    />
                  </div>

                  <div className="form-group" style={{ marginTop: 20 }}>
                    <label className="form-label">выберите иконку сервера (эмодзи)</label>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
                      {['🌸', '🦊', '☕', '🎮', '👾', '🐱', '🍀', '🔥', '✨'].map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setServerIcon(emoji)}
                          style={{
                            fontSize: 22,
                            padding: '10px 14px',
                            border: serverIcon === emoji ? '2px solid var(--discord-blurple)' : '2px solid transparent',
                            borderRadius: 10,
                            backgroundColor: 'var(--background-darkest)',
                            cursor: 'pointer',
                            transform: serverIcon === emoji ? 'scale(1.1)' : 'scale(1)',
                            transition: 'all 0.2s ease-in-out'
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="settings-footer" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'flex-end', gap: 12, backgroundColor: 'var(--background-darkest)' }}>
                  <button 
                    type="button" 
                    onClick={() => setModalMode('choose')}
                    style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14 }}
                  >
                    Назад
                  </button>
                  <button 
                    type="submit" 
                    className="add-friend-submit-btn" 
                    style={{ padding: '8px 24px', borderRadius: 4, cursor: 'pointer', fontSize: 14 }}
                  >
                    Создать
                  </button>
                </div>
              </form>
            )}

            {modalMode === 'join' && (
              <form onSubmit={handleJoinServer}>
                <div className="settings-body" style={{ padding: '24px 20px' }}>
                  <span style={{ fontSize: 14, color: 'var(--text-muted)', display: 'block', marginBottom: 20 }}>
                    Введите код приглашения (например, s_1782291...), чтобы войти на приватный сервер друга~~ ня!
                  </span>
                  
                  <div className="form-group">
                    <label className="form-label">Код приглашения</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="s_1782291..."
                      value={inviteCode}
                      onChange={(e) => { setInviteCode(e.target.value); setJoinError(''); }}
                      required
                      autoFocus
                    />
                    {joinError && (
                      <span className="error-message" style={{ marginTop: 8, display: 'block' }}>{joinError}</span>
                    )}
                  </div>
                </div>

                <div className="settings-footer" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'flex-end', gap: 12, backgroundColor: 'var(--background-darkest)' }}>
                  <button 
                    type="button" 
                    onClick={() => setModalMode('choose')}
                    style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14 }}
                  >
                    Назад
                  </button>
                  <button 
                    type="submit" 
                    className="add-friend-submit-btn" 
                    style={{ padding: '8px 24px', borderRadius: 4, cursor: 'pointer', fontSize: 14 }}
                  >
                    Войти
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
