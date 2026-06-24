import React from 'react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { X, MessageSquare, UserPlus, Settings } from 'lucide-react';

// привеееет~~ это карточка профиля любого пользователя!
// она всплывает, когда мы тыкаем на аватарку или никнейм~~
// тут все красиво блестит, переливается цветами акцента и можно сразу отправить запрос в друзья или написать ЛС owo 🐾

export default function UserProfileModal() {
  const { selectedProfileUser, setSelectedProfileUser, addFriend, setSettingsOpen, userProfile } = useStore();
  const navigate = useNavigate();

  if (!selectedProfileUser) return null;

  const isSelf = selectedProfileUser.username.toLowerCase() === userProfile.username.toLowerCase();
  
  // мяууу~~ переходим в личную переписку при нажатии~~
  const handleMessageClick = () => {
    setSelectedProfileUser(null);
    navigate(`/channels/@me/dm_${selectedProfileUser.username}`);
  };

  // няняня~~ шлем запросик на добавление в друзья~~
  const handleAddFriendClick = async () => {
    await addFriend(selectedProfileUser.username);
    setSelectedProfileUser({
      ...selectedProfileUser,
      relation: 'pending_outgoing'
    });
  };

  // открываем окошко настроек, если это наш профиль~~
  const handleSettingsClick = () => {
    setSelectedProfileUser(null);
    setSettingsOpen(true);
  };

  return (
    <div className="profile-modal-overlay" onClick={() => setSelectedProfileUser(null)}>
      <div className="profile-card" onClick={(e) => e.stopPropagation()}>
        {/* цветной баннер на фоне с цветом акцента юзера~~ */}
        <div 
          className="profile-banner" 
          style={{ backgroundColor: selectedProfileUser.accentColor || 'var(--discord-blurple)' }}
        >
          <button 
            className="close-modal-btn" 
            style={{ 
              position: 'absolute', 
              top: 12, 
              right: 12, 
              background: 'rgba(0,0,0,0.4)', 
              borderRadius: '50%', 
              width: 28, 
              height: 28, 
              display: 'flex', 
              alignItems: 'center', 
              justify: 'center', 
              border: 'none', 
              color: '#fff', 
              cursor: 'pointer' 
            }} 
            onClick={() => setSelectedProfileUser(null)}
          >
            <X size={16} />
          </button>
        </div>

        {/* тело карточки с аватаркой и описанием~~ */}
        <div className="profile-card-body">
          {/* аватарка, выступающая над баннером~~ */}
          <div className="profile-card-avatar-wrapper">
            {selectedProfileUser.avatarUrl ? (
              <img 
                src={selectedProfileUser.avatarUrl} 
                alt={selectedProfileUser.username} 
                className="profile-card-avatar"
              />
            ) : (
              <div 
                className="profile-card-avatar" 
                style={{ backgroundColor: selectedProfileUser.avatarColor || '#ff8da1' }}
              >
                {selectedProfileUser.username.substring(0, 2)}
              </div>
            )}
            <div className={`status-dot ${selectedProfileUser.status || 'offline'}`} style={{ width: 18, height: 18, border: '4px solid #18191c', bottom: 2, right: 2 }} />
          </div>

          <div className="profile-card-info">
            <span className="profile-card-username">
              {selectedProfileUser.displayName || selectedProfileUser.username}
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              @{selectedProfileUser.username}
            </span>
            <span className="profile-card-status">
              {selectedProfileUser.customStatus || 'Статус не указан...'}
            </span>

            <div className="profile-card-divider" />

            <span className="profile-section-title">Обо мне</span>
            <div className="profile-section-content">
              {isSelf 
                ? 'Это ваш профиль. Вы можете изменить его в настройках!' 
                : 'Пользователь пока ничего не рассказал о себе~~ мяу! 🐾'}
            </div>

            {/* кнопки быстрых действий для дружбы/ЛС~~ */}
            <div className="profile-card-actions">
              {isSelf ? (
                <button 
                  className="btn-primary" 
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, height: 38 }}
                  onClick={handleSettingsClick}
                >
                  <Settings size={16} />
                  Редактировать профиль
                </button>
              ) : (
                <>
                  {selectedProfileUser.relation === 'friend' && (
                    <button 
                      className="btn-primary" 
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, height: 38 }}
                      onClick={handleMessageClick}
                    >
                      <MessageSquare size={16} />
                      Написать сообщение
                    </button>
                  )}

                  {!selectedProfileUser.relation && (
                    <button 
                      className="btn-primary" 
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, height: 38 }}
                      onClick={handleAddFriendClick}
                    >
                      <UserPlus size={16} />
                      Добавить в друзья
                    </button>
                  )}

                  {selectedProfileUser.relation === 'pending_outgoing' && (
                    <button 
                      className="btn-secondary" 
                      style={{ width: '100%', fontSize: 13, height: 38, cursor: 'default' }}
                      disabled
                    >
                      Запрос отправлен...
                    </button>
                  )}

                  {selectedProfileUser.relation === 'pending_incoming' && (
                    <button 
                      className="btn-primary" 
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 13, height: 38 }}
                      onClick={() => {
                        setSelectedProfileUser(null);
                        navigate('/channels/@me/friends');
                      }}
                    >
                      Принять запрос дружбы
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
