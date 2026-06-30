import React, { useEffect, useRef, useState } from 'react';
import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import ServerBar from './components/ServerBar';
import Sidebar from './components/Sidebar';
import FriendsList from './components/FriendsList';
import ChatArea from './components/ChatArea';
import VoiceCall from './components/VoiceCall';
import VoiceCallManager from './components/VoiceCallManager';
import UserSettings from './components/UserSettings';
import UserProfileModal from './components/UserProfileModal';
import Auth from './pages/Auth';
import { getBackendUrl } from './utils/url.js';

// мяууу~~ вот наш главный компонент приложения!
// тут собираются все панельки вместе, настраивается роутинг и синхронизация с URL! 🐾

// маленький внутренний компонент для списка участников сервера справа~~
function MemberBar({ style }) {
  const { serverMembers, userProfile, viewUserProfile } = useStore();
  const others = serverMembers.filter(m => m.username.toLowerCase() !== userProfile.username.toLowerCase());
  const onlineMembers = others.filter(m => m.status !== 'offline');
  const offlineMembers = others.filter(m => m.status === 'offline');

  const myMember = serverMembers.find(m => m.username.toLowerCase() === userProfile.username.toLowerCase());
  const myRole = myMember?.role;

  // рисуем красивенькую плашечку роли для лапок~~
  const renderRoleBadge = (role) => {
    if (!role || role.toLowerCase() === 'member') return null;
    let bgColor = 'rgba(114, 137, 218, 0.15)';
    let color = '#7289da';
    const lower = role.toLowerCase();
    if (lower === 'owner') {
      bgColor = 'rgba(250, 168, 26, 0.15)';
      color = '#FAA81A';
    } else if (lower === 'admin' || lower === 'админ') {
      bgColor = 'rgba(237, 66, 69, 0.15)';
      color = '#ED4245';
    } else {
      bgColor = 'rgba(255, 141, 161, 0.15)';
      color = '#ff8da1';
    }
    return (
      <span style={{
        fontSize: 9,
        textTransform: 'uppercase',
        padding: '2px 6px',
        borderRadius: 4,
        backgroundColor: bgColor,
        color: color,
        fontWeight: 'bold',
        marginLeft: 6,
        display: 'inline-block',
        lineHeight: 1
      }}>
        {role}
      </span>
    );
  };

  return (
    <div className="members-sidebar" style={style}>
      {/* группа "В сети"~~ */}
      <div className="member-group">
        <span className="member-group-title">В сети — {onlineMembers.length + 1}</span>
        {/* мы сами всегда в сети, ня! */}
        <div className="member-item" style={{ cursor: 'pointer' }} onClick={() => viewUserProfile(userProfile.username)}>
          <div className="avatar-container" style={{ width: 32, height: 32 }}>
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
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span className="username" style={{ color: 'var(--discord-red)' }}>{userProfile.displayName || userProfile.username}</span>
              {renderRoleBadge(myRole)}
            </div>
            <span className="custom-status">{userProfile.customStatus}</span>
          </div>
        </div>

        {/* остальные участники в сети~~ */}
        {onlineMembers.map(m => (
          <div key={m.id} className="member-item" style={{ cursor: 'pointer' }} onClick={() => viewUserProfile(m.username)}>
            <div className="avatar-container" style={{ width: 32, height: 32 }}>
              {m.avatarUrl ? (
                <img src={getBackendUrl(m.avatarUrl)} alt={m.username} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div className="avatar" style={{ backgroundColor: m.avatarColor || '#72767d' }}>
                  {m.username.substring(0, 2)}
                </div>
              )}
              <div className={`status-dot ${m.status}`} />
            </div>
            <div className="user-meta">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="username">{m.displayName || m.username}</span>
                {renderRoleBadge(m.role)}
              </div>
              <span className="custom-status">{m.customStatus}</span>
            </div>
          </div>
        ))}
      </div>

      {/* группа "Не в сети"~~ */}
      <div className="member-group" style={{ marginTop: 12 }}>
        <span className="member-group-title">Не в сети — {offlineMembers.length}</span>
        {offlineMembers.map(m => (
          <div key={m.id} className="member-item offline" style={{ cursor: 'pointer' }} onClick={() => viewUserProfile(m.username)}>
            <div className="avatar-container" style={{ width: 32, height: 32 }}>
              {m.avatarUrl ? (
                <img src={getBackendUrl(m.avatarUrl)} alt={m.username} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div className="avatar" style={{ backgroundColor: '#72767d' }}>
                  {m.username.substring(0, 2)}
                </div>
              )}
              <div className="status-dot offline" />
            </div>
            <div className="user-meta">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="username">{m.displayName || m.username}</span>
                {renderRoleBadge(m.role)}
              </div>
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
  const { setNavigation, friends, servers, isAuthenticated, fetchInitialData, activeCall, userProfile, showSettings, setShowSettings, socket } = useStore();
  const navigate = useNavigate();

  // стейты и рефы для изменения ширины колонок~~ ня! 🐾
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [membersWidth, setMembersWidth] = useState(240);

  // мобильная навигация~~
  const [mobileView, setMobileView] = useState('chat');
  const [showSidebar, setShowSidebar] = useState(false);
  const [showServers, setShowServers] = useState(false);

  // хук определения мобильного устройства~~
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sidebarWidthRef = useRef(sidebarWidth);
  const membersWidthRef = useRef(membersWidth);

  useEffect(() => { sidebarWidthRef.current = sidebarWidth; }, [sidebarWidth]);
  useEffect(() => { membersWidthRef.current = membersWidth; }, [membersWidth]);

  const startSidebarResize = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidthRef.current;
    const doResize = (moveEvent) => {
      const newWidth = Math.max(200, Math.min(400, startWidth + moveEvent.clientX - startX));
      setSidebarWidth(newWidth);
    };
    const stopResize = () => {
      document.removeEventListener('mousemove', doResize);
      document.removeEventListener('mouseup', stopResize);
    };
    document.addEventListener('mousemove', doResize);
    document.addEventListener('mouseup', stopResize);
  };

  const startMembersResize = (e) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = membersWidthRef.current;
    const doResize = (moveEvent) => {
      const newWidth = Math.max(200, Math.min(350, startWidth - moveEvent.clientX + startX));
      setMembersWidth(newWidth);
    };
    const stopResize = () => {
      document.removeEventListener('mousemove', doResize);
      document.removeEventListener('mouseup', stopResize);
    };
    document.addEventListener('mousemove', doResize);
    document.addEventListener('mouseup', stopResize);
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth', { replace: true });
    } else {
      fetchInitialData();
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (serverId === '@me' || !serverId) {
      if (!channelId || channelId === 'friends') {
        setNavigation(null, 'friends', null);
      } else if (channelId.startsWith('dm_')) {
        const friendId = channelId.replace('dm_', '');
        const friend = friends.find(f => f.id === friendId);
        if (friend) {
          setNavigation(null, channelId, friend);
        } else {
          navigate('/channels/@me/friends', { replace: true });
        }
      }
    } else {
      const server = servers.find(s => s.id === serverId);
      if (server) {
        const targetChannelId = channelId || server.channels[0]?.id;
        const channel = server.channels.find(c => c.id === targetChannelId);
        if (channel) {
          setNavigation(serverId, targetChannelId, null);
        } else {
          navigate(`/channels/${serverId}/${server.channels[0]?.id}`, { replace: true });
        }
      } else {
        navigate('/channels/@me/friends', { replace: true });
      }
    }
    // при смене канала на мобилке — сразу переключаем на чат~~
    if (isMobile) {
      setMobileView('chat');
      setShowSidebar(false);
      setShowServers(false);
    }
  }, [serverId, channelId, friends, servers, setNavigation, navigate]);

  // Отслеживание активности пользователя для статуса idle (желтый месяц)~~
  useEffect(() => {
    if (!socket || !isAuthenticated) return;

    let idleTimer;
    let isIdle = false;

    const setIdle = () => {
      isIdle = true;
      socket.emit('status_change', { status: 'idle' });
    };

    const resetTimer = () => {
      if (isIdle) {
        isIdle = false;
        socket.emit('status_change', { status: 'online' });
      }
      
      clearTimeout(idleTimer);
      idleTimer = setTimeout(setIdle, 180000); // 3 минуты неактивности = idle, ня~~
    };

    // Слушаем движения мыши, клики, клавиши~~
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('mousedown', resetTimer);
    window.addEventListener('scroll', resetTimer);
    window.addEventListener('touchstart', resetTimer);

    // Запускаем таймер изначально
    resetTimer();

    return () => {
      clearTimeout(idleTimer);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('mousedown', resetTimer);
      window.removeEventListener('scroll', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
    };
  }, [socket, isAuthenticated]);

  const isHome = serverId === '@me' || !serverId;
  const isFriends = isHome && (!channelId || channelId === 'friends');
  const isDmChat = isHome && channelId?.startsWith('dm_');
  const activeServer = servers.find(s => s.id === serverId);
  const activeChannel = activeServer?.channels.find(c => c.id === channelId);
  const isVoice = activeChannel?.type === 'voice';

  // --------- МОБИЛЬНЫЙ РЕНДЕР ня~~ ---------
  if (isMobile) {
    // название текущего экрана для хедера~~
    let headerTitle = 'furrdis';
    if (isFriends) headerTitle = '👥 Друзья';
    else if (isDmChat) headerTitle = '💬 ЛС';
    else if (activeChannel) headerTitle = `# ${activeChannel.name}`;

    return (
      <div className="app-container mobile-layout">
        {activeCall && <VoiceCallManager />}

        {/* затемняющий оверлей~~ */}
        {(showServers || showSidebar) && (
          <div
            className="mobile-overlay visible"
            onClick={() => { setShowServers(false); setShowSidebar(false); }}
          />
        )}

        {/* выдвигающийся ящик серверов~~ */}
        <div className={`mobile-servers-drawer ${showServers ? 'open' : ''}`}>
          <ServerBar onMobileSelect={() => { setShowServers(false); setShowSidebar(true); }} />
        </div>

        {/* выдвигающийся ящик каналов~~ */}
        <div className={`mobile-sidebar-drawer ${showSidebar ? 'open' : ''}`}>
          <Sidebar onChannelSelect={() => { setShowSidebar(false); setMobileView('chat'); }} />
        </div>

        {/* основной контент~~ */}
        <div className="mobile-content">

          {/* мобильный хедер~~ */}
          <div className="mobile-header">
            <button
              className="mobile-header-btn"
              onClick={() => { setShowSidebar(true); setShowServers(false); }}
              aria-label="открыть каналы"
            >
              ☰
            </button>
            <span className="mobile-header-title">{headerTitle}</span>
            {!isHome ? (
              <button
                className={`mobile-header-btn ${mobileView === 'members' ? 'active' : ''}`}
                onClick={() => setMobileView(v => v === 'members' ? 'chat' : 'members')}
                aria-label="участники"
              >
                👥
              </button>
            ) : (
              <div style={{ width: 40 }} />
            )}
          </div>

          {/* контент страницы~~ */}
          <div className="mobile-page-content">
            {mobileView === 'members' && !isHome ? (
              <MemberBar style={{ width: '100%', flex: 1, overflowY: 'auto' }} />
            ) : (
              <>
                {isFriends && <FriendsList />}
                {isDmChat && <ChatArea />}
                {!isHome && (isVoice ? <VoiceCall /> : <ChatArea />)}
              </>
            )}
          </div>
        </div>

        {/* нижняя панель навигации~~ мрррр! */}
        <nav className="mobile-nav">
          <button
            className={`mobile-nav-btn ${showServers ? 'active' : ''}`}
            onClick={() => { setShowServers(v => !v); setShowSidebar(false); }}
          >
            <span className="mobile-nav-icon">🏠</span>
            <span className="mobile-nav-label">серверы</span>
          </button>

          <button
            className="mobile-nav-btn"
            onClick={() => { setShowSidebar(v => !v); setShowServers(false); }}
          >
            <span className="mobile-nav-icon">#</span>
            <span className="mobile-nav-label">каналы</span>
          </button>

          <button
            className={`mobile-nav-btn ${mobileView === 'chat' && !showSidebar && !showServers ? 'active' : ''}`}
            onClick={() => { setMobileView('chat'); setShowSidebar(false); setShowServers(false); }}
          >
            <span className="mobile-nav-icon">💬</span>
            <span className="mobile-nav-label">чат</span>
          </button>

          <button
            className="mobile-nav-btn"
            onClick={() => { setShowSettings && setShowSettings(true); }}
          >
            <span className="mobile-nav-icon">⚙️</span>
            <span className="mobile-nav-label">профиль</span>
          </button>
        </nav>

        <UserSettings />
        <UserProfileModal />
      </div>
    );
  }

  // --------- ДЕСКТОП РЕНДЕР (старый) ~~ ---------
  return (
    <div className="app-container">
      {activeCall && <VoiceCallManager />}
      {/* 1. Левая панель серверов */}
      <ServerBar />

      {/* 2. Вторая панель с каналами / контактами */}
      <Sidebar style={{ width: sidebarWidth }} />

      {/* разделитель для изменения размера сайдбара~~ */}
      <div className="layout-resizer sidebar-resizer" onMouseDown={startSidebarResize} />

      {/* 3. Центральная часть в зависимости от пути */}
      {isFriends && <FriendsList />}
      {isDmChat && <ChatArea />}

      {!isHome && (
        isVoice ? (
          <VoiceCall />
        ) : (
          <>
            <ChatArea />
            {/* разделитель для изменения размера списка участников~~ */}
            <div className="layout-resizer members-resizer" onMouseDown={startMembersResize} />
            {/* 4. Правая панель участников (только на текстовых серверах) */}
            <MemberBar style={{ width: membersWidth }} />
          </>
        )
      )}

      {/* Модальное окно настроек */}
      <UserSettings />

      {/* Карточка просмотра чужого профиля */}
      <UserProfileModal />
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
