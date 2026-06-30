import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { Hash, Search, Send, User, Paperclip, Smile, CornerUpLeft, Pencil, X } from 'lucide-react';

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

// Компонент для красивого предпросмотра ссылок в стиле Discord OpenGraph~~ 🐾
function LinkPreview({ url }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchPreview = async () => {
      try {
        const token = localStorage.getItem('discord_token');
        const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok && active) {
          const data = await res.json();
          if (data.title || data.description || data.image) {
            setPreview(data);
          }
        }
      } catch (e) {
        console.error('Ошибка предпросмотра ссылки:', e);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchPreview();
    return () => { active = false; };
  }, [url]);

  if (loading || !preview) return null;

  return (
    <div className="link-preview-card" style={{
      marginTop: 8,
      padding: 12,
      borderRadius: 8,
      backgroundColor: '#2b2d31',
      borderLeft: '4px solid var(--discord-blurple)',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      maxWidth: 450,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      alignSelf: 'flex-start'
    }}>
      {preview.title && (
        <a href={url} target="_blank" rel="noreferrer" style={{
          color: '#00b0f4',
          fontWeight: 'bold',
          fontSize: 14,
          textDecoration: 'none'
        }}>
          {preview.title}
        </a>
      )}
      {preview.description && (
        <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: '1.4' }}>
          {preview.description}
        </div>
      )}
      {preview.image && (
        <img src={preview.image} alt="preview" style={{
          maxWidth: '100%',
          maxHeight: 200,
          objectFit: 'cover',
          borderRadius: 6,
          marginTop: 4
        }} />
      )}
    </div>
  );
}

// мрррр~~ это наша область чатика!
// мы скроллим вниз при новых сообщениях и поддерживаем поиск, ня!
// а еще тут можно писать милые штучки хозяину... owo 🐾
export default function ChatArea() {
  const { 
    activeServerId, 
    activeChannelId, 
    activeDmUser, 
    servers, 
    messages, 
    sendMessage, 
    userProfile, 
    viewUserProfile,
    addReaction,
    removeReaction,
    fetchMessages,
    sendTypingStatus,
    typingUsers
  } = useStore();
  
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyToMessage, setReplyToMessage] = useState(null); // сообщение, на которое отвечаем~~
  const [showReactionPicker, setShowReactionPicker] = useState(null); // id сообщения для поповера реакций~~
  const [lightboxMedia, setLightboxMedia] = useState(null); // лайтбокс для картинок и видео~~
  
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    sendTypingStatus(chatKey, true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStatus(chatKey, false);
    }, 2000);
  };

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [chatKey]);

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

  const latestMessageId = chatMessages[chatMessages.length - 1]?.id;

  useEffect(() => {
    scrollToBottom();
  }, [latestMessageId]);

  const handleLoadMore = () => {
    const oldestMessageId = chatMessages[0]?.id;
    if (oldestMessageId) {
      fetchMessages(chatKey, 50, oldestMessageId);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    sendMessage(chatKey, inputText.trim(), isDm, replyToMessage?.id);
    setInputText('');
    setReplyToMessage(null); // сбрасываем состояние ответа после отправки~~
  };

  // мяууу~~ загрузка медиафайла (фото/видео) на сервер и отправка URL!
  const handleChatFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) { // 50MB
      alert("Оййй, файл слишком большой! Максимум 50MB, ня~~");
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('discord_token');
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        sendMessage(chatKey, data.url, isDm, replyToMessage?.id);
        setReplyToMessage(null); // сбрасываем ответ~~
      } else {
        alert("Не удалось загрузить файл, мяу~~");
      }
    } catch (err) {
      console.error("ошибка загрузки файла:", err);
      alert("ошибка загрузки файла, ня~~");
    } finally {
      e.target.value = '';
    }
  };

  // обработка клика на реакцию (переключалка)~~
  const handleReactionClick = (messageId, emoji, hasReacted) => {
    if (hasReacted) {
      removeReaction(chatKey, messageId, emoji);
    } else {
      addReaction(chatKey, messageId, emoji);
    }
  };

  const isImageFile = (url) => {
    return /\.(png|jpe?g|gif|webp|svg)$/i.test(url) || url.startsWith('data:image/');
  };

  const isVideoFile = (url) => {
    return /\.(mp4|webm|ogg|mov)$/i.test(url);
  };

  const renderTextWithLinks = (text) => {
    const parts = text.split(/(https?:\/\/[^\s]+)/g);
    return parts.map((part, index) => {
      if (part.match(/^https?:\/\/[^\s]+$/)) {
        return (
          <a key={index} href={part} target="_blank" rel="noreferrer" style={{ color: '#00b0f4', textDecoration: 'underline' }}>
            {part}
          </a>
        );
      }
      return part;
    });
  };

  // няняня~~ если контент сообщения — картинка или видео, рисуем красиво!
  const renderMessageContent = (content) => {
    if (isImageFile(content)) {
      return (
        <img 
          src={content} 
          alt="chat-attachment" 
          className="message-image"
          onClick={() => setLightboxMedia({ type: 'image', url: content })}
          style={{
            maxWidth: '100%',
            maxHeight: '300px',
            width: 'auto',
            height: 'auto',
            alignSelf: 'flex-start',
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

    if (isVideoFile(content)) {
      return (
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
          <video 
            src={content} 
            controls 
            playsInline
            className="message-video"
            onClick={(e) => {
              if (e.target.tagName === 'VIDEO') {
                setLightboxMedia({ type: 'video', url: content });
              }
            }}
            style={{
              maxWidth: '100%',
              maxHeight: '300px',
              width: 'auto',
              height: 'auto',
              alignSelf: 'flex-start',
              borderRadius: '8px',
              marginTop: '8px',
              border: '1px solid var(--glass-border)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              display: 'block',
              cursor: 'zoom-in'
            }}
          />
        </div>
      );
    }

    // Ищем ссылки в тексте, ня~~
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = content.match(urlRegex) || [];

    // Ищем коды серверов в тексте сообщения, ня~~
    const inviteRegex = /s_[a-zA-Z0-9_]+/g;
    const matches = content.match(inviteRegex);

    return (
      <div className="message-text-layout" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span className="message-content" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {renderTextWithLinks(content)}
        </span>
        {urls.map(url => (
          <LinkPreview key={url} url={url} />
        ))}
        {matches && matches.map(serverId => (
          <ServerInviteCard key={serverId} serverId={serverId} />
        ))}
      </div>
    );
  };

  const renderTypingIndicator = () => {
    const typingList = typingUsers[chatKey] || {};
    const otherTypists = Object.entries(typingList)
      .filter(([username]) => username !== userProfile.username)
      .map(([_, displayName]) => displayName);

    if (otherTypists.length === 0) return null;

    let text = '';
    if (otherTypists.length === 1) {
      text = `${otherTypists[0]} печатает...`;
    } else if (otherTypists.length === 2) {
      text = `${otherTypists[0]} и ${otherTypists[1]} печатают...`;
    } else {
      text = 'Несколько котиков печатают...';
    }

    return (
      <div className="typing-indicator" style={{
        fontSize: '12px',
        color: 'var(--text-muted)',
        marginTop: '4px',
        paddingLeft: '4px',
        height: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        <span className="typing-dots">
          <span className="dot" />
          <span className="dot" />
          <span className="dot" />
        </span>
        {text}
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

          {/* кнопка загрузки более старых сообщений~~ */}
          {chatMessages.length >= 50 && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 15px 0' }}>
              <button 
                className="load-more-btn"
                onClick={handleLoadMore}
                style={{
                  backgroundColor: 'rgba(88, 101, 242, 0.1)',
                  color: 'var(--discord-blurple)',
                  border: '1px solid var(--discord-blurple)',
                  padding: '6px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  transition: 'background-color 0.2s, transform 0.1s'
                }}
              >
                Загрузить предыдущие сообщения ня~~ 🐾
              </button>
            </div>
          )}

          {filteredMessages.map(msg => (
            <div key={msg.id} className={`message-item ${msg.replyToId ? 'has-reply' : ''}`}>
              {/* Поповер смайликов (пикер) для реакций~~ */}
              {showReactionPicker === msg.id && (
                <div className="reaction-picker-popover">
                  <div className="reaction-picker-backdrop" onClick={() => setShowReactionPicker(null)} />
                  <div className="reaction-picker-emojis">
                    {['❤️', '🐢', '😋', '👍', '🔥', '🦊', '🐱', '🎉', '💡', '😭'].map(emoji => {
                      const hasReacted = msg.reactions?.some(r => r.emoji === emoji && r.username === userProfile.username);
                      return (
                        <button
                          key={emoji}
                          className="reaction-picker-emoji-btn"
                          onClick={() => {
                            handleReactionClick(msg.id, emoji, hasReacted);
                            setShowReactionPicker(null);
                          }}
                        >
                          {emoji}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Тулбар при наведении на сообщение~~ */}
              <div className="message-toolbar">
                <div className="quick-reactions">
                  {['❤️', '🐢', '😋'].map(emoji => {
                    const hasReacted = msg.reactions?.some(r => r.emoji === emoji && r.username === userProfile.username);
                    return (
                      <button 
                        key={emoji} 
                        onClick={() => handleReactionClick(msg.id, emoji, hasReacted)}
                        className={hasReacted ? 'active-quick-react' : ''}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>
                <div className="toolbar-divider" />
                <div className="action-buttons">
                  <button className="toolbar-btn" onClick={() => setShowReactionPicker(msg.id)} title="Добавить реакцию">
                    <Smile size={16} />
                  </button>
                  <button className="toolbar-btn" onClick={() => setReplyToMessage(msg)} title="Ответить">
                    <CornerUpLeft size={16} />
                  </button>
                </div>
              </div>

              {/* Рендеринг ответа сверху, если привязано к родителю~~ */}
              {msg.replyToId && (
                <div className="message-reply-preview-container">
                  <div className="message-reply-line" />
                  <div 
                    className="reply-avatar-small" 
                    style={{ backgroundColor: msg.replyToAvatarColor || '#ff8da1' }}
                  >
                    {msg.replyToAvatarUrl ? (
                      <img src={msg.replyToAvatarUrl} alt={msg.replyToSender} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      (msg.replyToDisplayName || msg.replyToSender || '??').substring(0, 1)
                    )}
                  </div>
                  <span className="reply-sender">@{msg.replyToDisplayName || msg.replyToSender}</span>
                  <span className="reply-content">
                    {msg.replyToContent?.startsWith('data:image/') ? (
                      <span style={{ fontStyle: 'italic', opacity: 0.85 }}>Нажмите, чтобы посмотреть вложение 🖼️</span>
                    ) : (
                      msg.replyToContent
                    )}
                  </span>
                </div>
              )}

              {/* Основное тело сообщения с авой и контентом~~ */}
              <div className="message-row-layout">
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

                  {/* Рендерим реакции под сообщением, если они есть~~ */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className="message-reactions-container">
                      {Object.entries(
                        msg.reactions.reduce((acc, r) => {
                          if (!acc[r.emoji]) acc[r.emoji] = [];
                          acc[r.emoji].push(r.username);
                          return acc;
                        }, {})
                      ).map(([emoji, usernames]) => {
                        const hasReacted = usernames.includes(userProfile.username);
                        return (
                          <button
                            key={emoji}
                            className={`message-reaction-btn ${hasReacted ? 'active' : ''}`}
                            onClick={() => handleReactionClick(msg.id, emoji, hasReacted)}
                            title={`Реагировали: ${usernames.join(', ')}`}
                          >
                            <span className="reaction-emoji">{emoji}</span>
                            <span className="reaction-count">{usernames.length}</span>
                          </button>
                        );
                      })}
                      <button className="add-reaction-inline-btn" onClick={() => setShowReactionPicker(msg.id)} title="Добавить реакцию">
                        <Smile size={14} />
                        <span>+</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* форма ввода сообщения с панелькой ответа~~ */}
      <form onSubmit={handleSend} className="chat-input-form">
        {replyToMessage && (
          <div className="reply-bar">
            <div className="reply-bar-text">
              Ответ пользователю <span className="reply-bar-username">@{replyToMessage.displayName || replyToMessage.sender}</span>
            </div>
            <button type="button" className="reply-bar-close" onClick={() => setReplyToMessage(null)} title="Отменить ответ">
              <X size={14} />
            </button>
          </div>
        )}
        <div className="chat-input-wrapper">
          <input 
            type="text" 
            className="chat-input" 
            placeholder={isDm ? `Написать @${channelName}` : `Написать в #${channelName}`}
            value={inputText}
            onChange={handleInputChange}
          />
          <input
            type="file"
            id="chat-file-upload"
            accept="image/*,video/*"
            onChange={handleChatFileChange}
            style={{ display: 'none' }}
          />
          <label
            htmlFor="chat-file-upload"
            className="control-btn"
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}
            title="Загрузить файл (фото/видео)"
          >
            <Paperclip size={18} />
          </label>
          <button type="submit" className="control-btn" style={{ color: 'var(--discord-blurple)' }}>
            <Send size={18} />
          </button>
        </div>
        {/* Индикатор печатания~~ */}
        {renderTypingIndicator()}
      </form>

      {/* Лайтбокс модалка для предпросмотра фото и видео~~ */}
      {lightboxMedia && (
        <div 
          className="lightbox-overlay" 
          onClick={() => setLightboxMedia(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.9)',
            zIndex: 3000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.25s ease-out'
          }}
        >
          <button 
            onClick={() => setLightboxMedia(null)}
            style={{
              position: 'absolute',
              top: 20,
              right: 20,
              background: 'rgba(0,0,0,0.5)',
              border: 'none',
              color: '#fff',
              fontSize: '24px',
              cursor: 'pointer',
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 3001
            }}
          >
            ✕
          </button>
          
          <div 
            onClick={(e) => e.stopPropagation()} 
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {lightboxMedia.type === 'image' ? (
              <img 
                src={lightboxMedia.url} 
                alt="lightbox" 
                style={{
                  maxWidth: '100%',
                  maxHeight: '90vh',
                  objectFit: 'contain',
                  borderRadius: '4px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                }}
              />
            ) : (
              <video 
                src={lightboxMedia.url} 
                controls 
                autoPlay
                playsInline
                style={{
                  maxWidth: '100%',
                  maxHeight: '90vh',
                  objectFit: 'contain',
                  borderRadius: '4px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
