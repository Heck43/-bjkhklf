import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import ServerBar from './components/ServerBar';
import Sidebar from './components/Sidebar';
import FriendsList from './components/FriendsList';
import ChatArea from './components/ChatArea';
import VoiceCall from './components/VoiceCall';
import UserSettings from './components/UserSettings';
import Auth from './pages/Auth';

// мяууу~~ вот наш главный компонент приложения!
// тут собираются все панельки вместе, настраивается роутинг и синхронизация с URL! 🐾

// маленький внутренний компонент для списка участников сервера справа~~
function MemberBar() {
  const { friends, userProfile } = useStore();
  const onlineMembers = friends.filter(f => f.relation === 'friend' && f.status !== 'offline');
  const offlineMembers = friends.filter(f => f.relation === 'friend' && f.status === 'offline');

  return (
    <div className="members-sidebar">
      {/* группа "В сети"~~ */}
      <div className="member-group">
        <span className="member-group-title">В сети — {onlineMembers.length + 1}</span>
        {/* мы сами всегда в сети, ня! */}
        <div className="member-item">
          <div className="avatar-container" style={{ width: 32, height: 32 }}>
            <div className="avatar" style={{ backgroundColor: userProfile.avatarColor }}>
              {userProfile.username.substring(0, 2)}
            </div>
            <div className="status-dot online" />
          </div>
          <div className="user-meta">
            <span className="username" style={{ color: 'var(--discord-red)' }}>{userProfile.username}</span>
            <span className="custom-status">{userProfile.customStatus}</span>
          </div>
        </div>

        {/* остальные друзья в сети~~ */}
        {onlineMembers.map(m => (
          <div key={m.id} className="member-item">
            <div className="avatar-container" style={{ width: 32, height: 32 }}>
              <div className="avatar" style={{ backgroundColor: m.status === 'online' ? '#3BA55D' : '#72767d' }}>
                {m.username.substring(0, 2)}
              </div>
              <div className={`status-dot ${m.status}`} />
            </div>
            <div className="user-meta">
              <span className="username">{m.username}</span>
              <span className="custom-status">{m.customStatus}</span>
            </div>
          </div>
        ))}
      </div>

      {/* группа "Не в сети"~~ */}
      <div className="member-group" style={{ marginTop: 12 }}>
        <span className="member-group-title">Не в сети — {offlineMembers.length}</span>
        {offlineMembers.map(m => (
          <div key={m.id} className="member-item offline">
            <div className="avatar-container" style={{ width: 32, height: 32 }}>
              <div className="avatar" style={{ backgroundColor: '#72767d' }}>
                {m.username.substring(0, 2)}
              </div>
              <div className="status-dot offline" />
            </div>
            <div className="user-meta">
              <span className="username">{m.username}</span>
              <span className="custom-status">{m.customStatus}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// обертка для синхронизации роутов с Zustand стором~~
function MainLayout() {
  const { serverId, channelId } = useParams();
  const { setNavigation, friends, servers, isAuthenticated, fetchInitialData } = useStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth', { replace: true });
    } else {
      fetchInitialData();
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    // синхронизируем URL со стором, ня!
    if (serverId === '@me' || !serverId) {
      if (!channelId || channelId === 'friends') {
        setNavigation(null, 'friends', null);
      } else if (channelId.startsWith('dm_')) {
        const friendId = channelId.replace('dm_', '');
        const friend = friends.find(f => f.id === friendId);
        if (friend) {
          setNavigation(null, channelId, friend);
        } else {
          // если друга нет, редиректим на друзей~~
          navigate('/channels/@me/friends', { replace: true });
        }
      }
    } else {
      const server = servers.find(s => s.id === serverId);
      if (server) {
        // если канал не указан, берем первый доступный~~
        const targetChannelId = channelId || server.channels[0]?.id;
        const channel = server.channels.find(c => c.id === targetChannelId);
        
        if (channel) {
          setNavigation(serverId, targetChannelId, null);
        } else {
          navigate(`/channels/${serverId}/${server.channels[0]?.id}`, { replace: true });
        }
      } else {
        // если сервера нет, редиректим на главную~~
        navigate('/channels/@me/friends', { replace: true });
      }
    }
  }, [serverId, channelId, friends, servers, setNavigation, navigate]);

  // рендерим нужный контент в зависимости от пути~~
  const isHome = serverId === '@me' || !serverId;
  const isFriends = isHome && (!channelId || channelId === 'friends');
  const isDmChat = isHome && channelId?.startsWith('dm_');

  // если сервер, проверяем тип активного канала~~
  const activeServer = servers.find(s => s.id === serverId);
  const activeChannel = activeServer?.channels.find(c => c.id === channelId);
  const isVoice = activeChannel?.type === 'voice';

  return (
    <div className="app-container">
      {/* 1. Левая панель серверов */}
      <ServerBar />

      {/* 2. Вторая панель с каналами / контактами */}
      <Sidebar />

      {/* 3. Центральная часть в зависимости от пути */}
      {isFriends && <FriendsList />}
      {isDmChat && <ChatArea />}
      
      {!isHome && (
        isVoice ? (
          <VoiceCall />
        ) : (
          <>
            <ChatArea />
            {/* 4. Правая панель участников (только на текстовых серверах) */}
            <MemberBar />
          </>
        )
      )}

      {/* Модальное окно настроек */}
      <UserSettings />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      {/* редирект с корня на список друзей, мяу! */}
      <Route path="/" element={<Navigate to="/channels/@me/friends" replace />} />
      <Route path="/channels/@me" element={<Navigate to="/channels/@me/friends" replace />} />
      <Route path="/channels/@me/:channelId" element={<MainLayout />} />
      <Route path="/channels/:serverId" element={<MainLayout />} />
      <Route path="/channels/:serverId/:channelId" element={<MainLayout />} />
      
      {/* редирект для всех неизвестных путей */}
      <Route path="*" element={<Navigate to="/channels/@me/friends" replace />} />
    </Routes>
  );
}
