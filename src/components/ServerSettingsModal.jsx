import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { X, Image as ImageIcon, Users } from 'lucide-react';

// оййй~~ тут мы настраиваем наш любимый сервачок!
// меняем аватарки, роли раздаем друзьям... мррр! 🐾

export default function ServerSettingsModal({ server, onClose }) {
  const { updateServer, updateServerMemberRole, serverMembers, userProfile } = useStore();
  
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' или 'members'
  
  // стейты для обзора~~
  const [serverName, setServerName] = useState(server.name);
  const [serverIcon, setServerIcon] = useState(server.icon);
  const [isSaving, setIsSaving] = useState(false);

  // только овнер или админ по-хорошему могут менять роли, но мы пока всем разрешим для демки, или только если ты не сам себе меняешь роль~~
  const myRole = serverMembers.find(m => m.username === userProfile.username)?.role || 'member';
  const canEditRoles = myRole === 'owner' || myRole === 'admin';

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
    <div className="settings-overlay" onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="settings-modal" style={{ width: 600, display: 'flex', height: 450, overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
        
        {/* левое меню~~ */}
        <div style={{ width: 200, backgroundColor: 'var(--background-secondary)', padding: '20px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ padding: '0 10px', fontSize: 12, fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: 8 }}>
            НАСТРОЙКИ СЕРВЕРА
          </div>
          
          <div 
            className={`settings-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
            style={{ padding: '8px 10px', borderRadius: 4, cursor: 'pointer', color: activeTab === 'overview' ? '#fff' : 'var(--text-muted)', backgroundColor: activeTab === 'overview' ? 'rgba(79, 84, 92, 0.32)' : 'transparent', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <ImageIcon size={16} /> Обзор
          </div>
          <div 
            className={`settings-tab ${activeTab === 'members' ? 'active' : ''}`}
            onClick={() => setActiveTab('members')}
            style={{ padding: '8px 10px', borderRadius: 4, cursor: 'pointer', color: activeTab === 'members' ? '#fff' : 'var(--text-muted)', backgroundColor: activeTab === 'members' ? 'rgba(79, 84, 92, 0.32)' : 'transparent', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Users size={16} /> Участники
          </div>
        </div>

        {/* правая часть с контентом~~ */}
        <div style={{ flex: 1, backgroundColor: 'var(--background-primary)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 20, right: 20 }}>
            <button className="close-modal-btn" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={24} />
            </button>
          </div>

          <div style={{ padding: '40px', overflowY: 'auto', flex: 1 }}>
            {activeTab === 'overview' && (
              <form onSubmit={handleSaveOverview}>
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
                    <label style={{ fontSize: 12, color: 'var(--discord-blurple)', cursor: 'pointer', fontWeight: 'bold' }}>
                      Сменить аватарку
                      <input type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
                    </label>
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: 24 }}>
                  <label className="form-label" style={{ fontSize: 12, fontWeight: 'bold' }}>ИЛИ ВЫБЕРИТЕ ЭМОДЗИ</label>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 }}>
                    {['🌸', '🦊', '☕', '🎮', '👾', '🐱', '🍀', '🔥', '✨'].map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setServerIcon(emoji)}
                        style={{
                          fontSize: 22,
                          padding: '10px 14px',
                          border: serverIcon === emoji ? '2px solid var(--discord-blurple)' : '2px solid transparent',
                          borderRadius: 10,
                          backgroundColor: 'var(--background-darkest)',
                          cursor: 'pointer',
                          transform: serverIcon === emoji ? 'scale(1.1)' : 'scale(1)',
                          transition: 'all 0.2s ease-in-out'
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 40, borderTop: '1px solid var(--background-secondary)', paddingTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="btn-primary" disabled={isSaving} style={{ padding: '8px 24px', borderRadius: 4, fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                    {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
                  </button>
                </div>
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
                        {canEditRoles && member.username !== userProfile.username ? (
                          <select 
                            value={member.role || 'member'} 
                            onChange={(e) => handleRoleChange(member.id, e.target.value)}
                            style={{ backgroundColor: 'var(--background-darkest)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 4, outline: 'none', cursor: 'pointer' }}
                          >
                            <option value="owner">Owner</option>
                            <option value="admin">Admin</option>
                            <option value="member">Member</option>
                          </select>
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
