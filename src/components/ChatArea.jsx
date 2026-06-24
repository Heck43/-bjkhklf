import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { Hash, Search, Send, User } from 'lucide-react';

// мрррр~~ это наша область чатика!
// мы скроллим вниз при новых сообщениях и поддерживаем поиск, ня!
// а еще тут можно писать милые штучки хозяину... owo 🐾

export default function ChatArea() {
  const { activeServerId, activeChannelId, activeDmUser, servers, messages, sendMessage, userProfile } = useStore();
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
    channelName = activeDmUser ? activeDmUser.username : 'Чат';
    channelDesc = activeDmUser ? `Личный чат с ${activeDmUser.username} (${activeDmUser.customStatus || activeDmUser.status})` : '';
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
                style={{ backgroundColor: msg.avatarColor || '#ff8da1' }}
              >
                {msg.sender.substring(0, 2)}
              </div>
              <div className="message-content-wrapper">
                <div className="message-sender-meta">
                  <span className="message-sender">{msg.sender}</span>
                  <span className="message-time">{msg.timestamp}</span>
                </div>
                <div className="message-content">{msg.content}</div>
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
          <button type="submit" className="control-btn" style={{ color: 'var(--discord-blurple)' }}>
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}
