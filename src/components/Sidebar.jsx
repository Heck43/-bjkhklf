import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Headphones, Settings, Hash, Volume2, Users, Plus, X } from 'lucide-react';

// ууууу~~ а это наша боковая панелька!
// тут живут каналы и личные переписки...
// а в самом низу профиль нашего хозяина~~ мяу! 🐾

export default function Sidebar() {
  const {
    activeServerId,
    activeChannelId,
    servers,
    friends,
    userProfile,
    setSettingsOpen,
    activeCall,
    startCall,
    toggleMute,
    toggleDeafen,
    createChannel
  } = useStore();

  const navigate = useNavigate();

  // стейты для создания канала~~
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState('text'); // 'text' или 'voice'

  // ищем активный сервер, если он есть~~
  const activeServer = servers.find(s => s.id === activeServerId);

  // друзья для списка ЛС (только те, с кем мы дружим, ня!)~~
  const dmFriends = friends.filter(f => f.relation === 'friend');

  const handleChannelClick = (channel) => {
    if (channel.type === 'voice') {
      // если кликнули на голосовой канал — залетаем в звонок! 🔊
      startCall(channel.id, channel.name);
      navigate(`/channels/${activeServerId}/${channel.id}`);
    } else {
      navigate(`/channels/${activeServerId}/${channel.id}`);
    }
  };

  const handleDmUserClick = (friend) => {
    // переходим в личный чат с другом через роутер~~
    navigate(`/channels/@me/dm_${friend.id}`);
  };

  const handleCreateChannelClick = (type) => {
    setNewChannelType(type);
    setShowChannelModal(true);
  };

  const handleCreateChannelSubmit = async (e) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    const cleanName = newChannelName.trim().toLowerCase().replace(/\s+/g, '-');
    const res = await createChannel(activeServerId, cleanName, newChannelType);
    if (res.success && res.channel) {
      setShowChannelModal(false);
      setNewChannelName('');
      if (newChannelType === 'text') {
        navigate(`/channels/${activeServerId}/${res.channel.id}`);
      } else {
        startCall(res.channel.id, res.channel.name);
        navigate(`/channels/${activeServerId}/${res.channel.id}`);
      }
    }
  };

  return (
    <div className="sidebar">
      {/* верхний заголовок боковой панели~~ */}
      <div className="sidebar-header">
        <span>{activeServer ? activeServer.name : 'Главная'}</span>
      </div>

      {/* список каналов или личных сообщений~~ */}
      <div className="sidebar-content">
        {activeServerId === null ? (
          <>
            {/* навигация для главной страницы (ЛС / Друзья)~~ */}
            <div 
              className={`channel-item ${activeChannelId === 'friends' ? 'active' : ''}`}
              onClick={() => navigate('/channels/@me/friends')}
            >
              <Users size={18} />
              <span className="channel-name">Друзья</span>
            </div>

            <div className="channel-category">
              <span>Личные сообщения</span>
            </div>

            {dmFriends.map(friend => (
              <div
                key={friend.id}
                className={`channel-item ${activeChannelId === `dm_${friend.id}` ? 'active' : ''}`}
                onClick={() => handleDmUserClick(friend)}
              >
                <div className="avatar-container" style={{ width: 20, height: 20 }}>
                  {friend.avatarUrl ? (
                    <img src={friend.avatarUrl} alt={friend.username} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div className="avatar" style={{ backgroundColor: friend.avatarColor || '#72767d', fontSize: 9 }}>
                      {friend.username.substring(0, 2)}
                    </div>
                  )}
                  <div className={`status-dot ${friend.status}`} style={{ width: 6, height: 6, border: '1px solid var(--background-sidebar)' }} />
                </div>
                <span className="channel-name" style={{ marginLeft: 4 }}>{friend.displayName || friend.username}</span>
              </div>
            ))}
          </>
        ) : (
          <>
            {/* каналы на сервере, разделенные на категории текстовые/голосовые~~ */}
            <div className="channel-category" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Текстовые каналы</span>
              <button 
                className="create-channel-btn" 
                onClick={() => handleCreateChannelClick('text')}
                title="Создать текстовый канал"
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 2 }}
              >
                <Plus size={14} />
              </button>
            </div>
            {(activeServer.channels || [])
              .filter(c => c.type === 'text')
              .map(channel => (
                <div
                  key={channel.id}
                  className={`channel-item ${activeChannelId === channel.id ? 'active' : ''}`}
                  onClick={() => handleChannelClick(channel)}
                >
                  <Hash size={18} />
                  <span className="channel-name">{channel.name}</span>
                </div>
              ))}

            <div className="channel-category" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <span>Голосовые каналы</span>
              <button 
                className="create-channel-btn" 
                onClick={() => handleCreateChannelClick('voice')}
                title="Создать голосовой канал"
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 2 }}
              >
                <Plus size={14} />
              </button>
            </div>
            {(activeServer.channels || [])
              .filter(c => c.type === 'voice')
              .map(channel => (
                <div
                  key={channel.id}
                  className={`channel-item ${activeChannelId === channel.id ? 'active' : ''}`}
                  onClick={() => handleChannelClick(channel)}
                >
                  <Volume2 size={18} />
                  <span className="channel-name">{channel.name}</span>
                </div>
              ))}
          </>
        )}
      </div>

      {/* нижняя панель с профилем пользователя~~ */}
      <div className="user-panel">
        <div className="user-info" onClick={() => setSettingsOpen(true)} title="Настройки профиля">
          <div className="avatar-container">
            {userProfile.avatarUrl ? (
              <img src={userProfile.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div className="avatar" style={{ backgroundColor: userProfile.avatarColor }}>
                {userProfile.username.substring(0, 2)}
              </div>
            )}
            <div className="status-dot online" />
          </div>
          <div className="user-meta">
            <span className="username">{userProfile.displayName || userProfile.username}</span>
            <span className="custom-status">{userProfile.customStatus}</span>
          </div>
        </div>

        <div className="user-controls">
          <button 
            className={`control-btn ${activeCall?.isMuted ? 'active' : ''}`} 
            onClick={toggleMute}
            title={activeCall?.isMuted ? "Включить микрофон" : "Выключить микрофон"}
          >
            {activeCall?.isMuted ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
          <button 
            className="control-btn" 
            onClick={toggleDeafen}
            style={{ color: activeCall?.isDeafened ? 'var(--discord-red)' : '' }}
            title={activeCall?.isDeafened ? "Включить звук" : "Выключить звук"}
          >
            <Headphones size={18} />
          </button>
          <button 
            className="control-btn" 
            onClick={() => setSettingsOpen(true)}
            title="Настройки пользователя"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* красивое модальное окно создания канала~~ */}
      {showChannelModal && (
        <div className="settings-overlay" onClick={() => setShowChannelModal(false)}>
          <div className="settings-modal" style={{ width: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="settings-header">
              <span className="settings-title">Создать канал</span>
              <button className="close-modal-btn" onClick={() => setShowChannelModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateChannelSubmit}>
              <div className="settings-body" style={{ padding: '24px 20px' }}>
                <div className="form-group">
                  <label className="form-label">тип канала</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '10px 14px', borderRadius: 8, backgroundColor: newChannelType === 'text' ? 'rgba(88, 101, 242, 0.15)' : 'var(--background-darkest)', border: newChannelType === 'text' ? '1px solid var(--discord-blurple)' : '1px solid transparent' }}>
                      <input 
                        type="radio" 
                        name="channelType" 
                        value="text" 
                        checked={newChannelType === 'text'} 
                        onChange={() => setNewChannelType('text')}
                        style={{ display: 'none' }}
                      />
                      <Hash size={20} style={{ color: newChannelType === 'text' ? 'var(--discord-blurple)' : 'var(--text-muted)' }} />
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: 14 }}>Text</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Отправляйте сообщения, изображения, мнения и эмодзи</div>
                      </div>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '10px 14px', borderRadius: 8, backgroundColor: newChannelType === 'voice' ? 'rgba(88, 101, 242, 0.15)' : 'var(--background-darkest)', border: newChannelType === 'voice' ? '1px solid var(--discord-blurple)' : '1px solid transparent' }}>
                      <input 
                        type="radio" 
                        name="channelType" 
                        value="voice" 
                        checked={newChannelType === 'voice'} 
                        onChange={() => setNewChannelType('voice')}
                        style={{ display: 'none' }}
                      />
                      <Volume2 size={20} style={{ color: newChannelType === 'voice' ? 'var(--discord-blurple)' : 'var(--text-muted)' }} />
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: 14 }}>Voice</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Общайтесь голосом с демонстрацией экрана и видео</div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: 20 }}>
                  <label className="form-label">название канала</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: 10, color: 'var(--text-muted)' }}>
                      {newChannelType === 'text' ? '#' : '🔊'}
                    </span>
                    <input
                      type="text"
                      className="form-input"
                      style={{ paddingLeft: 30 }}
                      placeholder="новый-канал"
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value)}
                      required
                      maxLength={30}
                      autoFocus
                    />
                  </div>
                </div>
              </div>

              <div className="settings-footer" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'flex-end', gap: 12, backgroundColor: 'var(--background-darkest)' }}>
                <button 
                  type="button" 
                  onClick={() => setShowChannelModal(false)}
                  style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14 }}
                >
                  Отмена
                </button>
                <button 
                  type="submit" 
                  className="add-friend-submit-btn" 
                  style={{ padding: '8px 24px', borderRadius: 4, cursor: 'pointer', fontSize: 14 }}
                >
                  Создать канал
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
