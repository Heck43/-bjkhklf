import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { X } from 'lucide-react';

// оййй~~ тут мы настраиваем наш любимый сервачок!
// меняем аватарки, роли раздаем друзьям... мррр! 🐾

export default function ServerSettingsModal({ server, onClose }) {
  const { updateServer, updateServerMemberRole, serverMembers, userProfile } = useStore();
  
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' или 'members'

  // закрываем настройки по ESC~~
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);
  
  // стейты для обзора~~
  const [serverName, setServerName] = useState(server.name);
  const [serverIcon, setServerIcon] = useState(server.icon);
  const [isSaving, setIsSaving] = useState(false);

  // только овнер или админ по-хорошему могут менять роли, но мы пока всем разрешим для демки, или только если ты не сам себе меняешь роль~~
  // оййй~~ проверяем наши права на редактирование ролей, чтобы никто не шалил~~
  const myRole = (serverMembers.find(m => m.username === userProfile.username)?.role || 'member').toLowerCase();
  const creatorMember = serverMembers.reduce((min, m) => (m.id < min.id ? m : min), serverMembers[0] || {});
  const isCreator = userProfile.username === creatorMember.username;
  const canEditRoles = isCreator || myRole === 'owner' || myRole === 'admin';

  const handleSaveOverview = async (e) => {
    e.preventDefault();
    if (!serverName.trim()) return;
    
    setIsSaving(true);
    await updateServer(server.id, serverName.trim(), serverIcon);
    setIsSaving(false);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setServerIcon(reader.result); // сохраняем base64 картинку~~
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    await updateServerMemberRole(server.id, userId, newRole);
  };

  return (
    <div className="settings-overlay">
      <div className="settings-modal full-screen" onClick={(e) => e.stopPropagation()}>
        
        {/* левое меню (сайдбар)~~ */}
        <div className="settings-sidebar">
          <div className="settings-sidebar-header">Настройки сервера</div>
          
          <div 
            className={`settings-sidebar-item ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Обзор
          </div>
          <div 
            className={`settings-sidebar-item ${activeTab === 'members' ? 'active' : ''}`}
            onClick={() => setActiveTab('members')}
          >
            Участники
          </div>
        </div>

        {/* правая часть с контентом~~ */}
        <div className="settings-content-wrapper">
          {/* кнопка закрытия настроек в стиле Discord~~ */}
          <div className="esc-btn-container">
            <button className="esc-btn" onClick={onClose}>
              <X size={18} />
            </button>
            <span className="esc-btn-text">ESC</span>
          </div>

          <div className="settings-content-inner">
            {activeTab === 'overview' && (
              <form onSubmit={canEditRoles ? handleSaveOverview : (e) => e.preventDefault()}>
                <h2 style={{ fontSize: 20, color: '#fff', marginBottom: 24, marginTop: 0 }}>Обзор сервера</h2>
                
                <div style={{ display: 'flex', gap: 24 }}>
                  <div style={{ flex: 1 }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: 12, fontWeight: 'bold' }}>ИМЯ СЕРВЕРА</label>
                      <input
                        type="text"
                        className="form-input"
                        value={serverName}
                        onChange={(e) => setServerName(e.target.value)}
                        required
                        maxLength={50}
                        style={{ marginTop: 8 }}
                        disabled={!canEditRoles}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 100, height: 100, borderRadius: '50%', backgroundColor: 'var(--background-darkest)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', fontSize: 36, border: '2px dashed var(--discord-blurple)' }}>
                      {serverIcon && (serverIcon.startsWith('data:image/') || serverIcon.startsWith('http')) ? (
                        <img src={serverIcon} alt="server avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        serverIcon || serverName[0] || '?'
                      )}
                    </div>
                    {canEditRoles && (
                      <label style={{ fontSize: 12, color: 'var(--discord-blurple)', cursor: 'pointer', fontWeight: 'bold' }}>
                        Сменить аватарку
                        <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
                      </label>
                    )}
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: 24 }}>
                  <label className="form-label" style={{ fontSize: 12, fontWeight: 'bold' }}>ИЛИ ВЫБЕРИТЕ ЭМОДЗИ</label>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
                    {['🌸', '🦊', '☕', '🎮', '👾', '🐱', '🍀', '🔥', '✨'].map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        disabled={!canEditRoles}
                        onClick={() => setServerIcon(emoji)}
                        style={{
                          fontSize: 22,
                          padding: '10px 14px',
                          border: serverIcon === emoji ? '2px solid var(--discord-blurple)' : '2px solid transparent',
                          borderRadius: 10,
                          backgroundColor: 'var(--background-darkest)',
                          cursor: canEditRoles ? 'pointer' : 'default',
                          transform: serverIcon === emoji ? 'scale(1.1)' : 'scale(1)',
                          transition: 'all 0.2s ease-in-out',
                          opacity: canEditRoles ? 1 : 0.6
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {canEditRoles && (
                  <div style={{ marginTop: 40, borderTop: '1px solid var(--background-secondary)', paddingTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" className="btn-primary" disabled={isSaving} style={{ padding: '8px 24px', borderRadius: 4, fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                      {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
                    </button>
                  </div>
                )}
              </form>
            )}

            {activeTab === 'members' && (
              <div>
                <h2 style={{ fontSize: 20, color: '#fff', marginBottom: 24, marginTop: 0 }}>Участники сервера</h2>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                  {serverMembers.length} УЧАСТНИКОВ
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {serverMembers.map(member => (
                    <div key={member.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', backgroundColor: 'var(--background-secondary)', borderRadius: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: member.avatarColor || '#72767d', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          {member.avatarUrl ? (
                            <img src={member.avatarUrl} alt={member.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontSize: 12, color: '#fff' }}>{member.username.substring(0,2)}</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: 14, color: '#fff', fontWeight: 'bold' }}>{member.displayName || member.username}</span>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{member.username}</span>
                        </div>
                      </div>

                      <div>
                        {canEditRoles ? (
                          <input 
                            type="text"
                            defaultValue={member.role || 'Member'}
                            onBlur={(e) => handleRoleChange(member.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.target.blur();
                              }
                            }}
                            style={{
                              backgroundColor: 'var(--background-darkest)',
                              color: '#fff',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              padding: '6px 12px',
                              borderRadius: 6,
                              outline: 'none',
                              fontSize: 13,
                              width: 140,
                              textAlign: 'left',
                              transition: 'border-color 0.2s'
                            }}
                            placeholder="роль..."
                          />
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--discord-blurple)', textTransform: 'uppercase', fontWeight: 'bold', padding: '6px 12px', backgroundColor: 'var(--background-darkest)', borderRadius: 4 }}>
                            {member.role || 'member'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
