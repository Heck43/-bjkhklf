import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Headphones, Settings, Hash, Volume2, Users, Plus, X, UserPlus, PhoneOff } from 'lucide-react';
import ServerSettingsModal from './ServerSettingsModal';
import { getBackendUrl } from '../utils/url.js';

// ууууу~~ а это наша боковая панелька!
// тут живут каналы и личные переписки...
// а в самом низу профиль нашего хозяина~~ мяу! 🐾

export default function Sidebar({ style, onChannelSelect }) {
  const {
    activeServerId,
    activeChannelId,
    servers,
    friends,
    userProfile,
    setSettingsOpen,
    activeCall,
    startCall,
    isMuted,
    isDeafened,
    toggleMute,
    toggleDeafen,
    createChannel,
    inviteFriendToServer,
    viewUserProfile,
    unreadCounts,
    voiceStates,
    endCall
  } = useStore();

  const navigate = useNavigate();

  // стейты для создания канала~~
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState('text'); // 'text' или 'voice'

  // стейты для приглашения друзей~~
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [invitingFriend, setInvitingFriend] = useState(null);

  // стейт для настроек сервера~~
  const [showServerSettings, setShowServerSettings] = useState(false);

  const handleInviteFriend = async (friendUsername) => {
    setInvitingFriend(friendUsername);
    await inviteFriendToServer(activeServerId, friendUsername);
    setTimeout(() => setInvitingFriend(null), 2000);
  };

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
    if (onChannelSelect) onChannelSelect();
  };

  const handleDmUserClick = (friend) => {
    // переходим в личный чат с другом через роутер~~
    navigate(`/channels/@me/dm_${friend.id}`);
    if (onChannelSelect) onChannelSelect();
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
      if (onChannelSelect) onChannelSelect();
    }
  };

  return (
    <div className="sidebar" style={style}>
      {/* верхний заголовок боковой панели~~ */}
      <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{activeServer ? activeServer.name : 'Главная'}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {activeServer && activeServer.id !== 's_public_den' && (
            <button 
              onClick={() => setShowInviteModal(true)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4 }}
              title="Пригласить друзей"
            >
              <UserPlus size={16} />
            </button>
          )}
          {activeServer && (
            <button 
              onClick={() => setShowServerSettings(true)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4 }}
              title="Настройки сервера"
            >
              <Settings size={16} />
            </button>
          )}
        </div>
      </div>

      {/* список каналов или личных сообщений~~ */}
      <div className="sidebar-content">
        {activeServerId === null ? (
          <>
            {/* навигация для главной страницы (ЛС / Друзья)~~ */}
            <div 
              className={`channel-item ${activeChannelId === 'friends' ? 'active' : ''}`}
              onClick={() => {
                navigate('/channels/@me/friends');
                if (onChannelSelect) onChannelSelect();
              }}
            >
              <Users size={18} />
              <span className="channel-name">Друзья</span>
            </div>

            <div className="channel-category">
              <span>Личные сообщения</span>
            </div>

            {dmFriends.map(friend => {
              const dmKey = 'dm_' + [userProfile.username, friend.username].sort().join('_');
              const count = unreadCounts?.[dmKey] || 0;

              return (
                <div
                  key={friend.id}
                  className={`channel-item ${activeChannelId === `dm_${friend.id}` ? 'active' : ''}`}
                  onClick={() => handleDmUserClick(friend)}
                >
                  <div className="avatar-container" style={{ width: 20, height: 20 }}>
                    {friend.avatarUrl ? (
                      <img src={getBackendUrl(friend.avatarUrl)} alt={friend.username} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div className="avatar" style={{ backgroundColor: friend.avatarColor || '#72767d', fontSize: 9 }}>
                        {friend.username.substring(0, 2)}
                      </div>
                    )}
                    <div className={`status-dot ${friend.status}`} style={{ width: 6, height: 6, border: '1px solid var(--background-sidebar)' }} />
                  </div>
                  <span className="channel-name" style={{ marginLeft: 4 }}>{friend.displayName || friend.username}</span>
                  {count > 0 && (
                    <span className="sidebar-unread-badge">{count}</span>
                  )}
                </div>
              );
            })}
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
              .map(channel => {
                const count = unreadCounts?.[channel.id] || 0;

                return (
                  <div
                    key={channel.id}
                    className={`channel-item ${activeChannelId === channel.id ? 'active' : ''}`}
                    onClick={() => handleChannelClick(channel)}
                  >
                    <Hash size={18} />
                    <span className="channel-name">{channel.name}</span>
                    {count > 0 && (
                      <span className="sidebar-unread-badge">{count}</span>
                    )}
                  </div>
                );
              })}

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
              .map(channel => {
                const channelUsers = voiceStates[channel.id] || [];
                return (
                  <div key={channel.id} className="voice-channel-container">
                    <div
                      className={`channel-item ${activeChannelId === channel.id ? 'active' : ''}`}
                      onClick={() => handleChannelClick(channel)}
                    >
                      <Volume2 size={18} />
                      <span className="channel-name">{channel.name}</span>
                    </div>
                    {channelUsers.length > 0 && (
                      <div className="voice-channel-users" style={{ paddingLeft: 24, marginTop: 4, marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {channelUsers.map(user => (
                          <div key={user.username} className="voice-user-item" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                            <div className="avatar-mini" style={{
                              width: 18,
                              height: 18,
                              borderRadius: '50%',
                              backgroundColor: user.avatarColor || '#72767d',
                              fontSize: 9,
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 'bold',
                              overflow: 'hidden'
                            }}>
                              {user.avatarUrl ? (
                                <img src={getBackendUrl(user.avatarUrl)} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                user.username.substring(0, 2).toUpperCase()
                              )}
                            </div>
                            <span className="username" style={{ color: 'var(--text-muted)', fontSize: 12 }}>{user.username}</span>
                            {user.isDeafened ? (
                              <Headphones size={12} style={{ color: 'var(--discord-red)', marginLeft: 'auto' }} />
                            ) : user.isMuted ? (
                              <MicOff size={12} style={{ color: 'var(--discord-red)', marginLeft: 'auto' }} />
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </>
        )}
      </div>

      {/* Панель активного звонка, если мы подключены к голосу~~ */}
      {activeCall && (
        <div className="voice-connected-panel" style={{
          padding: '10px 12px',
          borderBottom: '1px solid var(--glass-border)',
          backgroundColor: 'rgba(35, 165, 90, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: 6
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--discord-green)', fontSize: 13, fontWeight: 'bold' }}>
              <span className="pulse-dot" style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: 'var(--discord-green)',
                display: 'inline-block'
              }} />
              <span>Голос подключен</span>
            </div>
            <button 
              onClick={() => {
                endCall();
              }}
              title="Отключиться от звонка"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--discord-red)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: 4,
                borderRadius: 4
              }}
            >
              <PhoneOff size={16} />
            </button>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span 
              onClick={() => {
                navigate(`/channels/${activeServerId || '@me'}/${activeCall.channelId}`);
              }}
              style={{ fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', textDecoration: 'underline' }}
              title="Открыть звонок"
            >
              {activeCall.channelName} / Gamer Fox Den
            </span>
          </div>
        </div>
      )}

      {/* нижняя панель с профилем пользователя~~ */}
      <div className="user-panel">
        <div className="user-info" onClick={() => viewUserProfile(userProfile.username)} title="Мой профиль">
          <div className="avatar-container">
            {userProfile.avatarUrl ? (
              <img src={getBackendUrl(userProfile.avatarUrl)} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
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
            className={`control-btn ${isMuted ? 'active' : ''}`} 
            onClick={toggleMute}
            title={isMuted ? "Включить микрофон" : "Выключить микрофон"}
            style={{ color: isMuted ? 'var(--discord-red)' : '' }}
          >
            {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
          <button 
            className="control-btn" 
            onClick={toggleDeafen}
            style={{ color: isDeafened ? 'var(--discord-red)' : '' }}
            title={isDeafened ? "Включить звук" : "Выключить звук"}
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
      {/* красивое модальное окно приглашения друзей~~ мяу! */}
      {showInviteModal && activeServer && (
        <div className="settings-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="settings-modal" style={{ width: 400 }} onClick={(e) => e.stopPropagation()}>
            <div className="settings-header">
              <span className="settings-title">Пригласить на "{activeServer.name}"</span>
              <button className="close-modal-btn" onClick={() => setShowInviteModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="settings-body" style={{ padding: '20px' }}>
              <div style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ fontSize: 11 }}>КОД СЕРВЕРА (ОТПРАВЬ ДРУГУ В ЧАТ):</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    readOnly 
                    value={activeServer.id} 
                    style={{ fontFamily: 'monospace', fontSize: 13, flex: 1 }}
                  />
                  <button 
                    type="button"
                    className="btn-primary" 
                    style={{ padding: '0 12px', fontSize: 12, height: 'auto', cursor: 'pointer' }}
                    onClick={() => {
                      navigator.clipboard.writeText(activeServer.id);
                      alert("Код сервера скопирован в буфер обмена, ня~~");
                    }}
                  >
                    Копия
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: 11 }}>ИЛИ ВЫБЕРИ ДРУГА ДЛЯ ПРИГЛАШЕНИЯ:</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8, maxHeight: 200, overflowY: 'auto', paddingRight: 4 }}>
                  {dmFriends.length === 0 ? (
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Список друзей пуст...</span>
                  ) : (
                    dmFriends.map(friend => {
                      const isInviting = invitingFriend === friend.username;
                      return (
                        <div key={friend.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', borderRadius: 6, backgroundColor: 'var(--background-darkest)' }}>
                          <span style={{ fontSize: 14, color: '#fff' }}>{friend.displayName || friend.username}</span>
                          <button
                            type="button"
                            className="btn-primary"
                            style={{ padding: '4px 12px', fontSize: 12, height: 'auto', cursor: 'pointer' }}
                            onClick={() => handleInviteFriend(friend.username)}
                            disabled={isInviting}
                          >
                            {isInviting ? 'Отправлено!' : 'Пригласить'}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* модалочка настроек сервера~~ мяуу~~ */}
      {showServerSettings && activeServer && (
        <ServerSettingsModal 
          server={activeServer} 
          onClose={() => setShowServerSettings(false)} 
        />
      )}
    </div>
  );
}
