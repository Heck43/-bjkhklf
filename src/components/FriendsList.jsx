import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, UserMinus, UserCheck, Check, X, Search, Users } from 'lucide-react';
import { getBackendUrl } from '../utils/url.js';

// мяууу~~ тут мы управляем нашими пушистыми друзьями!
// фильтры, сортировка и добавление новых друзей, ууу~~ 🐾

export default function FriendsList() {
  const { friends, addFriend, acceptFriend, removeFriend, blockFriend, viewUserProfile } = useStore();
  const [activeTab, setActiveTab] = useState('online'); // 'online', 'all', 'pending', 'blocked', 'add'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('alphabetical'); // 'alphabetical', 'status'
  const navigate = useNavigate();
  
  // для добавления друга~~
  const [newFriendName, setNewFriendName] = useState('');
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });

  const handleAddFriendSubmit = async (e) => {
    e.preventDefault();
    if (!newFriendName.trim()) {
      setAlert({ show: true, type: 'error', message: 'введи имя пользователя, ня!' });
      return;
    }
    const res = await addFriend(newFriendName.trim());
    if (res.success) {
      setAlert({ show: true, type: 'success', message: res.message });
      setNewFriendName('');
    } else {
      setAlert({ show: true, type: 'error', message: res.message });
    }
    
    // скрываем плашку через 3 секунды, ууу~~
    setTimeout(() => setAlert({ show: false, type: '', message: '' }), 3000);
  };

  // фильтрация друзей по вкладкам~~
  const filteredFriends = friends.filter(friend => {
    // сначала поиск по поисковой строке, если не вкладка "добавить"~~
    if (activeTab !== 'add' && searchQuery) {
      if (!friend.username.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
    }

    switch (activeTab) {
      case 'online':
        return friend.relation === 'friend' && friend.status !== 'offline';
      case 'all':
        return friend.relation === 'friend';
      case 'pending':
        return friend.relation === 'pending_incoming' || friend.relation === 'pending_outgoing';
      case 'blocked':
        return friend.relation === 'blocked';
      default:
        return false;
    }
  });

  // сортировка друзей~~
  const sortedFriends = [...filteredFriends].sort((a, b) => {
    if (sortBy === 'alphabetical') {
      return a.username.localeCompare(b.username);
    } else if (sortBy === 'status') {
      const statusWeight = { online: 0, idle: 1, dnd: 2, offline: 3 };
      return (statusWeight[a.status] || 9) - (statusWeight[b.status] || 9);
    }
    return 0;
  });

  return (
    <div className="friends-page">
      {/* верхняя шапка страницы друзей с вкладками~~ */}
      <div className="friends-tabs">
        <div className="friends-title-container">
          <Users size={20} />
          <span>Друзья</span>
        </div>
        <div className="header-separator" />
        
        <div className={`tab-item ${activeTab === 'online' ? 'active' : ''}`} onClick={() => setActiveTab('online')}>В сети</div>
        <div className={`tab-item ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>Все</div>
        <div className={`tab-item ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>Ожидание</div>
        <div className={`tab-item ${activeTab === 'blocked' ? 'active' : ''}`} onClick={() => setActiveTab('blocked')}>Заблокированные</div>
        <div className={`tab-item add-friend ${activeTab === 'add' ? 'active' : ''}`} onClick={() => setActiveTab('add')}>Добавить в друзья</div>
      </div>

      <div className="friends-body">
        {activeTab !== 'add' ? (
          <>
            {/* строка поиска и сортировка~~ */}
            <div className="friends-search-row">
              <div className="search-box" style={{ flex: 1, width: 'auto' }}>
                <Search size={16} className="text-muted" />
                <input 
                  type="text" 
                  className="search-input" 
                  placeholder="Поиск..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <select 
                className="sort-select" 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="alphabetical">По алфавиту</option>
                <option value="status">По статусу</option>
              </select>
            </div>

            {/* заголовок списка с количеством элементов~~ */}
            <div className="friends-list-header">
              {activeTab === 'online' && `В сети — ${sortedFriends.length}`}
              {activeTab === 'all' && `Все друзья — ${sortedFriends.length}`}
              {activeTab === 'pending' && `Запросы — ${sortedFriends.length}`}
              {activeTab === 'blocked' && `Заблокировано — ${sortedFriends.length}`}
            </div>

            {/* пустой экран, если никого нет, ня~~ */}
            {sortedFriends.length === 0 ? (
              <div className="welcome-chat-info">
                <span className="welcome-logo">🐾</span>
                <span className="welcome-title">Тут никого нет...</span>
                <span className="welcome-desc">Никто не подходит под выбранный фильтр. Добавь новых друзей!</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {sortedFriends.map(friend => (
                  <div key={friend.id} className="friend-row">
                    <div className="friend-info-left" style={{ cursor: 'pointer' }} onClick={() => viewUserProfile(friend.username)}>
                      <div className="avatar-container" style={{ width: 36, height: 36 }}>
                        {friend.avatarUrl ? (
                          <img src={getBackendUrl(friend.avatarUrl)} alt={friend.username} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div className="avatar" style={{ backgroundColor: friend.avatarColor || '#72767d', fontSize: 14 }}>
                            {friend.username.substring(0, 2)}
                          </div>
                        )}
                        <div className={`status-dot ${friend.status}`} style={{ width: 10, height: 10, border: '2px solid var(--background-chat)' }} />
                      </div>
                      <div className="friend-names">
                        <span className="friend-username">{friend.displayName || friend.username}</span>
                        <span className="friend-substatus">
                          {friend.relation === 'pending_incoming' && 'Входящий запрос в друзья'}
                          {friend.relation === 'pending_outgoing' && 'Исходящий запрос в друзья'}
                          {friend.relation === 'blocked' && 'Заблокирован'}
                          {friend.relation === 'friend' && (friend.customStatus || friend.status)}
                        </span>
                      </div>
                    </div>

                    <div className="friend-actions">
                      {friend.relation === 'friend' && (
                        <>
                          <button 
                            className="action-icon-btn" 
                            title="Начать чат"
                            onClick={() => navigate(`/channels/@me/dm_${friend.id}`)}
                          >
                            <MessageSquare size={16} />
                          </button>
                          <button 
                            className="action-icon-btn reject" 
                            title="Удалить из друзей"
                            onClick={() => removeFriend(friend.id)}
                          >
                            <UserMinus size={16} style={{ color: 'var(--discord-red)' }} />
                          </button>
                        </>
                      )}
                      
                      {friend.relation === 'pending_incoming' && (
                        <>
                          <button 
                            className="action-icon-btn" 
                            title="Принять запрос" 
                            onClick={() => acceptFriend(friend.id)}
                            style={{ backgroundColor: 'rgba(35, 165, 90, 0.2)', color: 'var(--discord-green)' }}
                          >
                            <Check size={16} />
                          </button>
                          <button 
                            className="action-icon-btn reject" 
                            title="Отклонить запрос" 
                            onClick={() => removeFriend(friend.id)}
                            style={{ backgroundColor: 'rgba(242, 63, 67, 0.2)', color: 'var(--discord-red)' }}
                          >
                            <X size={16} />
                          </button>
                        </>
                      )}

                      {friend.relation === 'pending_outgoing' && (
                        <button 
                          className="action-icon-btn reject" 
                          title="Отменить запрос" 
                          onClick={() => removeFriend(friend.id)}
                        >
                          <X size={16} />
                        </button>
                      )}

                      {friend.relation === 'blocked' && (
                        <button 
                          className="action-icon-btn" 
                          title="Разблокировать" 
                          onClick={() => removeFriend(friend.id)}
                        >
                          <UserCheck size={16} style={{ color: 'var(--discord-green)' }} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* вкладка добавления в друзья~~ */
          <div className="add-friend-panel">
            <span className="add-friend-header">Добавить в друзья</span>
            <span className="add-friend-desc">Вы можете добавить друга по его имени пользователя Discord-клона. Регистр важен!</span>
            
            <form onSubmit={handleAddFriendSubmit} className="add-friend-input-wrapper">
              <input 
                type="text" 
                className="add-friend-input" 
                placeholder="Вы можете добавить друга по имени пользователя, например: foxy_boi..." 
                value={newFriendName}
                onChange={(e) => setNewFriendName(e.target.value)}
              />
              <button type="submit" className="add-friend-submit-btn">Отправить запрос</button>
            </form>

            {alert.show && (
              <div className={`alert-message ${alert.type}`}>
                {alert.message}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
