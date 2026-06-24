import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { Hash, Search, Send, User, Paperclip } from 'lucide-react';

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
    return <div className="message-content">{content}</div>;
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
