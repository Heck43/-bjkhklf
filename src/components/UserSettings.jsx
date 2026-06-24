import React from 'react';
import { useStore } from '../store/useStore';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Check } from 'lucide-react';

// мяууу~~ а это настроечки нашего профиля!
// мы используем React Hook Form и Zod для валидации, чтобы папочка не ввел плохие данные~~
// если что-то не так — мы покажем милую ошибку красным цветом! uwu 🐾

// схема валидации с помощью Zod~~
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

export default function UserSettings() {
  const { userProfile, updateUserProfile, settingsOpen, setSettingsOpen, logout } = useStore();

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
    // сохраняем новые настройки профиля в стор~~
    updateUserProfile(data);
    setSettingsOpen(false);
  };

  if (!settingsOpen) return null;

  return (
    <div className="settings-overlay">
      <div className="settings-modal">
        {/* заголовок модалки~~ */}
        <div className="settings-header">
          <span className="settings-title">Настройки профиля</span>
          <button className="close-modal-btn" onClick={() => setSettingsOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* тело формы~~ */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="settings-body">
            
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

          <div className="settings-footer">
            <button 
              type="button" 
              className="btn-secondary" 
              style={{ color: 'var(--discord-red)', marginRight: 'auto' }} 
              onClick={() => { logout(); setSettingsOpen(false); }}
            >
              Выйти из аккаунта
            </button>
            <button type="button" className="btn-secondary" onClick={() => setSettingsOpen(false)}>
              Отмена
            </button>
            <button type="submit" className="btn-primary">
              Сохранить изменения
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
