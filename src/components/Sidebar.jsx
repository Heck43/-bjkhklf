import React from 'react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, Headphones, Settings, Hash, Volume2, Users } from 'lucide-react';

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
    toggleDeafen
  } = useStore();

  const navigate = useNavigate();

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
                  <div className="avatar" style={{ backgroundColor: friend.status === 'online' ? '#3BA55D' : '#72767d', fontSize: 9 }}>
                    {friend.username.substring(0, 2)}
                  </div>
                  <div className={`status-dot ${friend.status}`} style={{ width: 6, height: 6, border: '1px solid var(--background-sidebar)' }} />
                </div>
                <span className="channel-name" style={{ marginLeft: 4 }}>{friend.username}</span>
              </div>
            ))}
          </>
        ) : (
          <>
            {/* каналы на сервере, разделенные на категории текстовые/голосовые~~ */}
            <div className="channel-category">
              <span>Текстовые каналы</span>
            </div>
            {activeServer.channels
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

            <div className="channel-category">
              <span>Голосовые каналы</span>
            </div>
            {activeServer.channels
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
            <div className="avatar" style={{ backgroundColor: userProfile.avatarColor }}>
              {userProfile.username.substring(0, 2)}
            </div>
            <div className="status-dot online" />
          </div>
          <div className="user-meta">
            <span className="username">{userProfile.username}</span>
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
    </div>
  );
}
