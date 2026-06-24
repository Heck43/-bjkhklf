import React from 'react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { Compass, Plus } from 'lucide-react';

// мяууу~~ вот наша панель серверов!
// тут мы переключаемся между серверами, это так удобно! 🐾

export default function ServerBar() {
  const { servers, activeServerId } = useStore();
  const navigate = useNavigate();

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

      {/* заглушки для кнопок добавления и поиска серверов, они просто красивые owo */}
      <div className="server-icon-wrapper" title="Добавить сервер">
        <div className="server-icon" style={{ color: '#23a55a' }}>
          <Plus size={20} />
        </div>
      </div>

      <div className="server-icon-wrapper" title="Исследовать публичные серверы">
        <div className="server-icon" style={{ color: '#23a55a' }}>
          <Compass size={20} />
        </div>
      </div>
    </div>
  );
}
