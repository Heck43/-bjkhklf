import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { Compass, Plus, X } from 'lucide-react';

// мяууу~~ вот наша панель серверов!
// тут мы переключаемся между серверами, это так удобно! 🐾

export default function ServerBar() {
  const { servers, activeServerId, createServer } = useStore();
  const navigate = useNavigate();

  // стейты для красивой модалочки создания сервера~~
  const [showModal, setShowModal] = useState(false);
  const [serverName, setServerName] = useState('');
  const [serverIcon, setServerIcon] = useState('🌸');

  const handleHomeClick = () => {
    // переходим на домашний экран через роутер~~
    navigate('/channels/@me/friends');
  };

  const handleServerClick = (server) => {
    // переходим на первый канал выбранного сервера через роутер, ня~~
    const firstChannel = server.channels[0];
    if (firstChannel) {
      navigate(`/channels/${server.id}/${firstChannel.id}`);
    } else {
      navigate(`/channels/${server.id}/none`);
    }
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
    }
  };

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
        </div>
      </div>

      <div className="server-separator" />

      {/* список всех серверов~~ мррр~~ */}
      {servers.map((server) => (
        <div 
          key={server.id}
          className={`server-icon-wrapper ${activeServerId === server.id ? 'active' : ''}`}
          onClick={() => handleServerClick(server)}
          title={server.name}
        >
          <div className="server-pill" />
          <div className="server-icon">
            {server.icon}
          </div>
        </div>
      ))}

      <div className="server-separator" />

      {/* кнопка добавления нового сервера~~ */}
      <div 
        className="server-icon-wrapper" 
        onClick={() => setShowModal(true)} 
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

      {/* красивое модальное окно создания сервера~~ мяу! */}
      {showModal && (
        <div className="settings-overlay" onClick={() => setShowModal(false)}>
          <div className="settings-modal" style={{ width: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="settings-header">
              <span className="settings-title">Создать свой сервер</span>
              <button className="close-modal-btn" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>
            
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
                  onClick={() => setShowModal(false)}
                  style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14 }}
                >
                  Отмена
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
          </div>
        </div>
      )}
    </div>
  );
}
