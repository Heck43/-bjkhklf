import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Check, Volume2, Mic, MicOff, Headphones, User, Eye, Laptop } from 'lucide-react';

// привееет, хозяин! это переписанные полноэкранные настроечки, как в оригинальном дискорде~~
// тут у нас валидация через Zod, выбор красивых тем, масштаб текста и даже проверка микрофона!
// почеши меня за ушком, если тебе нравится~~ мяу! 🐾

// схема валидации Zod для профиля~~
const profileSchema = z.object({
  displayName: z.string()
    .min(2, 'имя должно быть не меньше 2 букв~~')
    .max(20, 'имя не должно превышать 20 букв~~'),
  customStatus: z.string()
    .max(50, 'статус слишком длинный, максимум 50 символов~~')
    .optional()
    .or(z.literal('')),
  avatarColor: z.string(),
  accentColor: z.string(),
  avatarUrl: z.string().optional().or(z.literal(''))
});

const AVATAR_COLORS = ['#ff8da1', '#5865F2', '#3BA55D', '#FAA81A', '#ED4245', '#9b59b6'];
const ACCENT_COLORS = ['#ff2d55', '#4752c4', '#1f7e43', '#c68412', '#b83236', '#8e44ad'];

// вкладка настроек микрофона/звука~~
function VoiceSettingsTab() {
  const [testMic, setTestMic] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    let active = true;
    let interval;
    if (testMic) {
      interval = setInterval(() => {
        // весело симулируем громкость голоса хозяина~~
        if (active) setAudioLevel(Math.floor(Math.random() * 100));
      }, 100);
    } else {
      setAudioLevel(0);
    }

    return () => {
      active = false;
      if (interval) clearInterval(interval);
    };
  }, [testMic]);

  const barCount = 15;
  const activeBars = Math.round((audioLevel / 100) * barCount);

  return (
    <div>
      <h2 style={{ fontSize: 20, color: '#fff', marginBottom: 20 }}>Голос и видео</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>устройство ввода</span>
            <div style={{ position: 'relative', marginTop: 6 }}>
              <select className="form-input" style={{ width: '100%', appearance: 'none', cursor: 'pointer', backgroundColor: 'var(--background-darkest)', color: '#fff', border: '1px solid var(--glass-border)', padding: '10px', borderRadius: '4px' }} defaultValue="hyperx">
                <option value="default">устройство по умолчанию</option>
                <option value="hyperx">микрофон (HyperX SoloCast)</option>
                <option value="realtek">микрофон (Realtek Audio)</option>
              </select>
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>устройство вывода</span>
            <div style={{ position: 'relative', marginTop: 6 }}>
              <select className="form-input" style={{ width: '100%', appearance: 'none', cursor: 'pointer', backgroundColor: 'var(--background-darkest)', color: '#fff', border: '1px solid var(--glass-border)', padding: '10px', borderRadius: '4px' }} defaultValue="headphones">
                <option value="default">устройство по умолчанию</option>
                <option value="headphones">наушники (USB Audio Device)</option>
                <option value="realtek">динамики (Realtek Audio)</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>громкость на входе</span>
            <input type="range" className="slider" style={{ width: '100%', marginTop: 8, cursor: 'pointer' }} min="0" max="100" defaultValue="85" />
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>громкость на выходе</span>
            <input type="range" className="slider" style={{ width: '100%', marginTop: 8, cursor: 'pointer' }} min="0" max="100" defaultValue="90" />
          </div>
        </div>

        <div style={{
          backgroundColor: 'var(--background-darkest)',
          borderRadius: 8,
          padding: 16,
          marginTop: 8,
          border: '1px solid var(--glass-border)'
        }}>
          <span style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>проверка микрофона</span>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>давай проверим, как хорошо тебя будет слышно в голосовом чатике, ня~~</p>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              className="btn-primary"
              style={{
                backgroundColor: testMic ? 'var(--discord-red)' : 'var(--discord-blurple)',
                padding: '8px 16px',
                fontSize: 13,
                height: 38,
                borderRadius: 4,
                cursor: 'pointer',
                border: 'none',
                color: '#fff',
                fontWeight: 'bold'
              }}
              onClick={() => setTestMic(!testMic)}
            >
              {testMic ? 'Остановить тест' : 'Проверить микро'}
            </button>

            {/* анимированный прыгающий звуковой индикатор~~ */}
            <div style={{
              display: 'flex',
              gap: 4,
              flex: 1,
              height: 24,
              backgroundColor: 'rgba(0,0,0,0.4)',
              borderRadius: 6,
              padding: '4px 8px',
              alignItems: 'center',
              boxSizing: 'border-box'
            }}>
              {Array.from({ length: barCount }).map((_, index) => {
                const isActive = index < activeBars;
                let color = '#23a55a'; // green
                if (index > 10) color = '#f0b232'; // yellow
                if (index > 13) color = '#f23f43'; // red

                return (
                  <div
                    key={index}
                    style={{
                      flex: 1,
                      height: '100%',
                      backgroundColor: isActive ? color : 'rgba(255,255,255,0.06)',
                      borderRadius: 2,
                      transition: 'background-color 0.05s ease'
                    }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// вкладка тем и размеров текста~~
function AppearanceSettingsTab() {
  const [theme, setTheme] = useState(localStorage.getItem('theme_preset') || 'dark');
  const [fontSize, setFontSize] = useState(parseInt(localStorage.getItem('chat_font_size') || '14'));

  const changeTheme = (themeName) => {
    const root = document.documentElement;
    if (themeName === 'dark') {
      root.style.setProperty('--background-chat', '#313338');
      root.style.setProperty('--background-sidebar', '#2b2d31');
      root.style.setProperty('--background-servers', '#1e1f22');
      root.style.setProperty('--background-darkest', '#111214');
      root.style.setProperty('--discord-blurple', '#5865f2');
      root.style.setProperty('--text-normal', '#dbdee1');
    } else if (themeName === 'light') {
      root.style.setProperty('--background-chat', '#f2f3f5');
      root.style.setProperty('--background-sidebar', '#e3e5e8');
      root.style.setProperty('--background-servers', '#e3e5e8');
      root.style.setProperty('--background-darkest', '#bfbfbf');
      root.style.setProperty('--discord-blurple', '#4752c4');
      root.style.setProperty('--text-normal', '#2e3338');
    } else if (themeName === 'pink') {
      root.style.setProperty('--background-chat', '#fff0f3');
      root.style.setProperty('--background-sidebar', '#ffe5ec');
      root.style.setProperty('--background-servers', '#ffc2d1');
      root.style.setProperty('--background-darkest', '#ffb3c6');
      root.style.setProperty('--discord-blurple', '#ff4d6d');
      root.style.setProperty('--text-normal', '#5c0632');
    } else if (themeName === 'cyberpunk') {
      root.style.setProperty('--background-chat', '#0f0f1b');
      root.style.setProperty('--background-sidebar', '#18122b');
      root.style.setProperty('--background-servers', '#0a0415');
      root.style.setProperty('--background-darkest', '#02000a');
      root.style.setProperty('--discord-blurple', '#ff007f');
      root.style.setProperty('--text-normal', '#00ffff');
    }
    setTheme(themeName);
    localStorage.setItem('theme_preset', themeName);
  };

  const changeFontSize = (size) => {
    document.documentElement.style.setProperty('--chat-font-size', `${size}px`);
    setFontSize(size);
    localStorage.setItem('chat_font_size', size);
  };

  return (
    <div>
      <h2 style={{ fontSize: 20, color: '#fff', marginBottom: 20 }}>Внешний вид</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>тема оформления</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {[
              { id: 'dark', name: 'Тёмная классика', desc: 'Привычные темные тона', emoji: '🌑' },
              { id: 'light', name: 'Светлый день', desc: 'Яркие дневные тона', emoji: '☀️' },
              { id: 'pink', name: 'Розовый лисёнок', desc: 'Очень мило и уютно', emoji: '🦊' },
              { id: 'cyberpunk', name: 'Неоновый киберпанк', desc: 'Яркие футуристичные цвета', emoji: '👾' }
            ].map(t => (
              <div
                key={t.id}
                onClick={() => changeTheme(t.id)}
                style={{
                  padding: '16px',
                  borderRadius: 8,
                  backgroundColor: theme === t.id ? 'rgba(88,101,242,0.15)' : 'var(--background-darkest)',
                  border: theme === t.id ? '2px solid var(--discord-blurple)' : '2px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{ fontSize: 24 }}>{t.emoji}</span>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: 14, color: '#fff' }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{t.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <span style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>масштаб текста сообщений ({fontSize}px)</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Аа</span>
            <input
              type="range"
              className="slider"
              style={{ flex: 1, cursor: 'pointer' }}
              min="12"
              max="20"
              value={fontSize}
              onChange={(e) => changeFontSize(parseInt(e.target.value))}
            />
            <span style={{ fontSize: 20, color: '#fff' }}>Аа</span>
          </div>

          <div style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 8,
            backgroundColor: 'var(--background-chat)',
            border: '1px solid var(--glass-border)'
          }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'var(--discord-blurple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'white', fontWeight: 'bold' }}>🦊</div>
              <div>
                <span style={{ fontSize: 12, fontWeight: 'bold', color: '#fff' }}>розовый фембойчик</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 8 }}>Сегодня, в 12:00</span>
                <div style={{ fontSize: `${fontSize}px`, color: 'var(--text-normal)', marginTop: 4 }}>
                  посмотри, хозяин! размер этого текста меняется в реальном времени~~ мррр~~ :3
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function UserSettings() {
  const { userProfile, updateUserProfile, settingsOpen, setSettingsOpen, logout } = useStore();
  const [activeTab, setActiveTab] = useState('account');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: userProfile.displayName || userProfile.username,
      customStatus: userProfile.customStatus || '',
      avatarColor: userProfile.avatarColor,
      accentColor: userProfile.accentColor,
      avatarUrl: userProfile.avatarUrl || ''
    }
  });

  const selectedAvatarColor = watch('avatarColor');
  const selectedAccentColor = watch('accentColor');
  const avatarUrlValue = watch('avatarUrl');
  const displayNameValue = watch('displayName');

  // поддержка закрытия по ESC~~
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setSettingsOpen]);

  const handleAvatarFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Оййй, файлик слишком большой! Максимум 2MB, ня~~");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setValue('avatarUrl', reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = (data) => {
    updateUserProfile(data);
    setSettingsOpen(false);
  };

  if (!settingsOpen) return null;

  return (
    <div className="settings-overlay">
      <div className="settings-modal full-screen">
        {/* левый сайдбар настроек~~ */}
        <div className="settings-sidebar">
          <div className="settings-sidebar-header">Настройки пользователя</div>
          <div 
            className={`settings-sidebar-item ${activeTab === 'account' ? 'active' : ''}`}
            onClick={() => setActiveTab('account')}
          >
            Моя учетная запись
          </div>
          <div 
            className={`settings-sidebar-item ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Профиль пользователя
          </div>

          <div className="settings-sidebar-header">Настройки приложения</div>
          <div 
            className={`settings-sidebar-item ${activeTab === 'voice' ? 'active' : ''}`}
            onClick={() => setActiveTab('voice')}
          >
            Голос и видео
          </div>
          <div 
            className={`settings-sidebar-item ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab('appearance')}
          >
            Внешний вид
          </div>

          <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', margin: '16px 10px' }} />

          <div 
            className="settings-sidebar-item red"
            onClick={() => { logout(); setSettingsOpen(false); }}
          >
            Выйти из аккаунта
          </div>
        </div>

        {/* правая контентная область~~ */}
        <div className="settings-content-wrapper">
          {/* кнопка закрытия настроек в стиле Discord~~ */}
          <div className="esc-btn-container">
            <button className="esc-btn" onClick={() => setSettingsOpen(false)}>
              <X size={18} />
            </button>
            <span className="esc-btn-text">ESC</span>
          </div>

          <div className="settings-content-inner">
            {activeTab === 'account' && (
              <div>
                <h2 style={{ fontSize: 20, color: '#fff', marginBottom: 20 }}>Моя учетная запись</h2>
                
                <div style={{
                  backgroundColor: 'var(--background-darkest)',
                  borderRadius: 8,
                  padding: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  border: '1px solid var(--glass-border)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div className="avatar-container" style={{ width: 80, height: 80 }}>
                      {userProfile.avatarUrl ? (
                        <img 
                          src={userProfile.avatarUrl} 
                          alt="avatar" 
                          style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
                        />
                      ) : (
                        <div className="avatar" style={{ backgroundColor: userProfile.avatarColor, fontSize: 32 }}>
                          {userProfile.username.substring(0, 2)}
                        </div>
                      )}
                      <div className="status-dot online" style={{ width: 20, height: 20, border: '4px solid var(--background-darkest)' }} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: 18, color: '#fff', margin: 0 }}>{userProfile.displayName || userProfile.username}</h3>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>@{userProfile.username}</p>
                    </div>
                  </div>

                  <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)' }} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Уникальный никнейм</span>
                      <div style={{ color: '#fff', fontSize: 15, marginTop: 4 }}>@{userProfile.username}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Отображаемое имя (Имя)</span>
                      <div style={{ color: '#fff', fontSize: 15, marginTop: 4 }}>{userProfile.displayName || 'Не установлено'}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Пользовательский статус</span>
                      <div style={{ color: '#fff', fontSize: 15, marginTop: 4 }}>{userProfile.customStatus || 'Статус отсутствует...'}</div>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 24 }}>
                  <button 
                    type="button" 
                    className="btn-primary"
                    style={{ backgroundColor: 'var(--discord-blurple)', padding: '10px 20px', borderRadius: 4, cursor: 'pointer', border: 'none', color: 'white', fontWeight: 'bold' }}
                    onClick={() => setActiveTab('profile')}
                  >
                    Редактировать профиль пользователя
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <form onSubmit={handleSubmit(onSubmit)}>
                <h2 style={{ fontSize: 20, color: '#fff', marginBottom: 20 }}>Профиль пользователя</h2>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* имя пользователя (уникальный ник)~~ */}
                  <div className="form-group">
                    <label className="form-label">Уникальный никнейм (нельзя изменить)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={userProfile.username}
                      disabled
                      style={{ opacity: 0.6, cursor: 'not-allowed' }}
                    />
                  </div>

                  {/* отображаемое имя (имя)~~ */}
                  <div className="form-group">
                    <label className="form-label">Отображаемое имя (Имя)</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Ваше имя..."
                      {...register('displayName')}
                    />
                    {errors.displayName && (
                      <span className="error-message">{errors.displayName.message}</span>
                    )}
                  </div>

                  {/* пользовательский статус~~ */}
                  <div className="form-group">
                    <label className="form-label">Пользовательский статус</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Чем вы занимаетесь?.."
                      {...register('customStatus')}
                    />
                    {errors.customStatus && (
                      <span className="error-message">{errors.customStatus.message}</span>
                    )}
                  </div>

                  {/* загрузка аватара~~ */}
                  <div className="form-group">
                    <label className="form-label">Загрузить аватарку</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                      <input
                        type="file"
                        id="avatar-upload"
                        accept="image/*"
                        onChange={handleAvatarFileChange}
                        style={{ display: 'none' }}
                      />
                      <label 
                        htmlFor="avatar-upload"
                        className="btn-primary"
                        style={{ cursor: 'pointer', padding: '8px 16px', borderRadius: 4, display: 'inline-block', fontSize: 13 }}
                      >
                        Выбрать файл
                      </label>
                      {avatarUrlValue && (
                        <button
                          type="button"
                          className="btn-secondary"
                          style={{ color: 'var(--discord-red)', padding: '8px 16px', fontSize: 13 }}
                          onClick={() => setValue('avatarUrl', '')}
                        >
                          Удалить
                        </button>
                      )}
                    </div>
                  </div>

                  {/* выбор цвета аватара~~ */}
                  <div className="form-group">
                    <label className="form-label">Цвет аватара (если нет картинки)</label>
                    <div className="color-presets">
                      {AVATAR_COLORS.map(color => (
                        <div
                          key={color}
                          className={`color-dot ${selectedAvatarColor === color ? 'selected' : ''}`}
                          style={{ backgroundColor: color }}
                          onClick={() => setValue('avatarColor', color)}
                        >
                          {selectedAvatarColor === color && <Check size={16} style={{ color: 'white', margin: '6px' }} />}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* выбор цвета акцента~~ */}
                  <div className="form-group">
                    <label className="form-label">Цвет профиля (Акцентный цвет)</label>
                    <div className="color-presets">
                      {ACCENT_COLORS.map(color => (
                        <div
                          key={color}
                          className={`color-dot ${selectedAccentColor === color ? 'selected' : ''}`}
                          style={{ backgroundColor: color }}
                          onClick={() => setValue('accentColor', color)}
                        >
                          {selectedAccentColor === color && <Check size={16} style={{ color: 'white', margin: '6px' }} />}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* интерактивное превью карточки профиля, ня~~ */}
                  <div style={{
                    marginTop: 12,
                    padding: 16,
                    borderRadius: 8,
                    backgroundColor: 'var(--background-profile)',
                    border: `2px solid ${selectedAccentColor}`
                  }}>
                    <span className="form-label" style={{ fontSize: 10, display: 'block', marginBottom: 8 }}>Предпросмотр профиля</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div className="avatar-container" style={{ width: 44, height: 44 }}>
                        {avatarUrlValue ? (
                          <img 
                            src={avatarUrlValue} 
                            alt="preview avatar" 
                            style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
                          />
                        ) : (
                          <div className="avatar" style={{ backgroundColor: selectedAvatarColor, fontSize: 16 }}>
                            {(displayNameValue || userProfile.username)?.substring(0, 2) || '??'}
                          </div>
                        )}
                        <div className="status-dot online" style={{ width: 12, height: 12, border: '2.5px solid var(--background-profile)' }} />
                      </div>
                      <div className="user-meta">
                        <span className="username" style={{ fontSize: 15 }}>{displayNameValue || userProfile.username}</span>
                        <span className="custom-status" style={{ fontSize: 12 }}>{watch('customStatus') || 'Нет статуса...'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="settings-footer" style={{ marginTop: 24, padding: '16px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    onClick={() => setSettingsOpen(false)}
                  >
                    Отмена
                  </button>
                  <button type="submit" className="btn-primary" style={{ backgroundColor: 'var(--discord-blurple)' }}>
                    Сохранить изменения
                  </button>
                </div>
              </form>
            )}

            {activeTab === 'voice' && (
              <VoiceSettingsTab />
            )}

            {activeTab === 'appearance' && (
              <AppearanceSettingsTab />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
