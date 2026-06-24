import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { Hash, Search, Send, User, Paperclip } from 'lucide-react';

// компонент для виджета приглашений на приватные серверы~~ мяу! 🐾
function ServerInviteCard({ serverId }) {
  const { servers, joinServer } = useStore();
  const navigate = useNavigate();
  const [serverInfo, setServerInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchInfo = async () => {
      try {
        const token = localStorage.getItem('discord_token');
        const response = await fetch(`/api/servers/${serverId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          if (active) setServerInfo(data);
        }
      } catch (e) {
        console.error('ошибка загрузки данных сервера для виджета:', e);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchInfo();
    return () => { active = false; };
  }, [serverId]);

  if (loading) {
    return (
      <div className="invite-card loading" style={{
        marginTop: 10,
        padding: 12,
        borderRadius: 8,
        backgroundColor: 'var(--background-darkest)',
        border: '1px solid var(--glass-border)',
        fontSize: 13,
        color: 'var(--text-muted)'
      }}>
        загрузка приглашения... мяу~~ 🐾
      </div>
    );
  }

  if (!serverInfo) return null;

  const isMember = servers.some(s => s.id === serverId);

  const handleAction = async () => {
    if (isMember) {
      const matchedServer = servers.find(s => s.id === serverId);
      const firstChannel = matchedServer?.channels?.[0];
      if (firstChannel) {
        navigate(`/channels/${serverId}/${firstChannel.id}`);
      } else {
        navigate(`/channels/${serverId}/none`);
      }
    } else {
      const res = await joinServer(serverId);
      if (res.success) {
        const updatedServers = useStore.getState().servers;
        const matchedServer = updatedServers.find(s => s.id === serverId);
        const firstChannel = matchedServer?.channels?.[0];
        if (firstChannel) {
          navigate(`/channels/${serverId}/${firstChannel.id}`);
        } else {
          navigate(`/channels/${serverId}/none`);
        }
      } else {
        alert(res.message || 'не удалось зайти на сервер, ня~~');
      }
    }
  };

  return (
    <div className="invite-card" style={{
      marginTop: 10,
      padding: '12px 16px',
      borderRadius: 12,
      backgroundColor: 'rgba(30, 31, 34, 0.65)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      maxWidth: '430px',
      backdropFilter: 'blur(10px)',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
      transition: 'all 0.2s ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
          overflow: 'hidden'
        }}>
          {serverInfo.icon && (serverInfo.icon.startsWith('data:image/') || serverInfo.icon.startsWith('http')) ? (
            <img src={serverInfo.icon} alt={serverInfo.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            serverInfo.icon || '🦊'
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 10, fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {isMember ? 'ты уже на этом сервере' : 'приглашение на сервер'}
          </span>
          <span style={{ fontSize: 15, fontWeight: 'bold', color: '#fff', marginTop: 2 }}>
            {serverInfo.name}
          </span>
        </div>
      </div>
      <button
        onClick={handleAction}
        className="btn-primary"
        style={{
          padding: '8px 16px',
          borderRadius: 6,
          fontSize: 13,
          fontWeight: 'bold',
          height: 'auto',
          backgroundColor: isMember ? 'rgba(78, 80, 88, 0.7)' : 'var(--discord-blurple)',
          color: '#fff',
          cursor: 'pointer',
          border: 'none',
          transition: 'all 0.2s ease'
        }}
      >
        {isMember ? 'Перейти' : 'Принять'}
      </button>
    </div>
  );
}

// мрррр~~ это наша область чатика!
// мы скроллим вниз при новых сообщениях и поддерживаем поиск, ня!
// а еще тут можно писать милые штучки хозяину... owo 🐾

export default function ChatArea() {
  const { activeServerId, activeChannelId, activeDmUser, servers, messages, sendMessage, userProfile, viewUserProfile } = useStore();
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef(null);

  // вычисляем ключ чата: для ЛС это симметричный ключ dm_user1_user2, для серверов просто id канала~~
  const isDm = activeServerId === null && activeDmUser !== null;
  const chatKey = isDm 
    ? 'dm_' + [userProfile.username, activeDmUser.username].sort().join('_')
    : activeChannelId;

  // ищем название канала или пользователя~~
  let channelName = '';
  let channelDesc = '';
  
  if (isDm) {
    channelName = activeDmUser ? (activeDmUser.displayName || activeDmUser.username) : 'Чат';
    channelDesc = activeDmUser ? `Личный чат с ${activeDmUser.displayName || activeDmUser.username} (${activeDmUser.customStatus || activeDmUser.status})` : '';
  } else {
    const server = servers.find(s => s.id === activeServerId);
    const channel = server?.channels.find(c => c.id === activeChannelId);
    channelName = channel ? channel.name : '';
    channelDesc = `Добро пожаловать в начало канала #${channelName}!`;
  }

  // список сообщений для текущего чата~~
  const chatMessages = messages[chatKey] || [];

  // фильтрация сообщений по поиску~~
  const filteredMessages = chatMessages.filter(msg => {
    if (!searchQuery) return true;
    return msg.content.toLowerCase().includes(searchQuery.toLowerCase()) || 
           msg.sender.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // автопрокрутка к нижнему сообщению при обновлении списка, мяууу~~
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages.length]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendMessage(chatKey, inputText.trim(), isDm);
    setInputText('');
  };

  // мяууу~~ загрузка картинки в чатик!
  const handleChatImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 3 * 1024 * 1024) {
        alert("Оййй, картинка слишком большая! Максимум 3MB, ня~~");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        sendMessage(chatKey, reader.result, isDm);
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  // няняня~~ если контент сообщения — картинка base64, рисуем ее красиво!
  const renderMessageContent = (content) => {
    if (content.startsWith('data:image/')) {
      return (
        <img 
          src={content} 
          alt="chat-attachment" 
          className="message-image"
          style={{
            maxWidth: '100%',
            maxHeight: '300px',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
            borderRadius: '8px',
            marginTop: '8px',
            border: '1px solid var(--glass-border)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            display: 'block',
            cursor: 'zoom-in'
          }}
        />
      );
    }

    // Ищем коды серверов в тексте сообщения, ня~~
    const inviteRegex = /s_[a-zA-Z0-9_]+/g;
    const matches = content.match(inviteRegex);

    return (
      <div className="message-content">
        <div>{content}</div>
        {matches && matches.map(serverId => (
          <ServerInviteCard key={serverId} serverId={serverId} />
        ))}
      </div>
    );
  };

  return (
    <div className="chat-container">
      {/* заголовок чата с поиском~~ */}
      <div className="chat-header">
        <div className="header-title-container">
          {isDm ? (
            <div className="avatar-container" style={{ width: 24, height: 24, marginRight: 4 }}>
              <div className="avatar" style={{ backgroundColor: '#72767d', fontSize: 10 }}>
                {channelName.substring(0, 2)}
              </div>
            </div>
          ) : (
            <Hash size={20} className="text-muted" />
          )}
          <span className="header-title">{channelName}</span>
          <div className="header-separator" />
          <span className="header-desc text-muted">{channelDesc}</span>
        </div>

        <div className="chat-controls">
          <div className="search-box">
            <Search size={16} className="text-muted" />
            <input 
              type="text" 
              className="search-input" 
              placeholder="Поиск по сообщениям..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* область прокрутки сообщений~~ */}
      <div className="chat-body">
        <div className="messages-scroller">
          {/* приветственная карточка в начале чата~~ */}
          {chatMessages.length === 0 && (
            <div className="welcome-chat-info" style={{ height: 'auto', padding: '20px 0' }}>
              <span className="welcome-logo">{isDm ? '💬' : '👋'}</span>
              <span className="welcome-title">{isDm ? `Добро пожаловать в личный чат с ${channelName}!` : `Добро пожаловать в #${channelName}!`}</span>
              <span className="welcome-desc">Напишите первое сообщение, чтобы начать беседу!</span>
            </div>
          )}

          {filteredMessages.map(msg => (
            <div key={msg.id} className="message-item">
              <div 
                className="message-avatar" 
                style={{ backgroundColor: msg.avatarColor || '#ff8da1', cursor: 'pointer' }}
                onClick={() => viewUserProfile(msg.sender)}
              >
                {msg.avatarUrl ? (
                  <img src={msg.avatarUrl} alt={msg.sender} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  msg.sender.substring(0, 2)
                )}
              </div>
              <div className="message-content-wrapper">
                <div className="message-sender-meta">
                  <span className="message-sender" style={{ cursor: 'pointer' }} onClick={() => viewUserProfile(msg.sender)}>{msg.displayName || msg.sender}</span>
                  <span className="message-time">{msg.timestamp}</span>
                </div>
                {renderMessageContent(msg.content)}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* форма ввода сообщения~~ */}
      <form onSubmit={handleSend} className="chat-input-form">
        <div className="chat-input-wrapper">
          <input 
            type="text" 
            className="chat-input" 
            placeholder={isDm ? `Написать @${channelName}` : `Написать в #${channelName}`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <input
            type="file"
            id="chat-image-upload"
            accept="image/*"
            onChange={handleChatImageChange}
            style={{ display: 'none' }}
          />
          <label
            htmlFor="chat-image-upload"
            className="control-btn"
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}
            title="Загрузить изображение"
          >
            <Paperclip size={18} />
          </label>
          <button type="submit" className="control-btn" style={{ color: 'var(--discord-blurple)' }}>
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}
