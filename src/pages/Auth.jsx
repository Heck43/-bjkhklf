import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// привеееет, это наша супер-страничка авторизации!
// тут мы входим или регистрируемся в бд, чтобы всё было безопасно~~
// а справа милый qr-кодик в стиле настоящего дискорда! ^w^ 🐾

const loginSchema = z.object({
  username: z.string().min(1, 'введите имя пользователя, ня!'),
  password: z.string().min(1, 'введите пароль, мяу!')
});

const registerSchema = z.object({
  username: z.string()
    .min(3, 'имя должно быть не менее 3 букв~~')
    .max(15, 'имя не должно быть длиннее 15 букв~~')
    .regex(/^[a-zA-Z0-9_]+$/, 'используй только английские буквы, цифры и _ , ня!'),
  password: z.string().min(6, 'пароль должен быть не менее 6 символов~~'),
  avatarColor: z.string(),
  accentColor: z.string()
});

const AVATAR_COLORS = ['#ff8da1', '#5865F2', '#3BA55D', '#FAA81A', '#ED4245', '#9b59b6'];
const ACCENT_COLORS = ['#ff2d55', '#4752c4', '#1f7e43', '#c68412', '#b83236', '#8e44ad'];

export default function Auth() {
  const [isRegister, setIsRegister] = useState(false);
  const [apiError, setApiError] = useState('');
  const { login, register: registerUser } = useStore();
  const navigate = useNavigate();

  // инициализируем форму с правильным resolver'ом в зависимости от режима~~
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(isRegister ? registerSchema : loginSchema),
    defaultValues: {
      username: '',
      password: '',
      avatarColor: '#ff8da1',
      accentColor: '#ff2d55'
    }
  });

  const selectedAvatarColor = watch('avatarColor');
  const selectedAccentColor = watch('accentColor');

  const onSubmit = async (data) => {
    setApiError('');
    let res;
    if (isRegister) {
      res = await registerUser(data.username, data.password, data.avatarColor, data.accentColor);
    } else {
      res = await login(data.username, data.password);
    }

    if (res.success) {
      // переходим в приложение после авторизации~~
      navigate('/channels/@me/friends');
    } else {
      setApiError(res.error || 'что-то пошло не так...');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* колонка с формой~~ */}
        <div className="auth-column-form">
          <span className="auth-title">
            {isRegister ? 'Создать учетную запись' : 'С возвращением!'}
          </span>
          <span className="auth-subtitle">
            {isRegister ? 'Мы так рады, что вы регистрируетесь! owo' : 'Мы так рады видеть вас снова! :3'}
          </span>

          {apiError && (
            <div className="alert-message error" style={{ marginBottom: 16 }}>
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* имя пользователя~~ */}
            <div className="form-group">
              <label className="form-label">Имя пользователя</label>
              <input
                type="text"
                className="form-input"
                {...register('username')}
                autoComplete="username"
              />
              {errors.username && (
                <span className="error-message">{errors.username.message}</span>
              )}
            </div>

            {/* пароль~~ */}
            <div className="form-group">
              <label className="form-label">Пароль</label>
              <input
                type="password"
                className="form-input"
                {...register('password')}
                autoComplete="current-password"
              />
              {errors.password && (
                <span className="error-message">{errors.password.message}</span>
              )}
            </div>

            {/* поля выбора цвета аватара и акцента (только при регистрации)~~ */}
            {isRegister && (
              <>
                <div className="form-group">
                  <label className="form-label">Цвет аватара</label>
                  <div className="color-presets">
                    {AVATAR_COLORS.map(color => (
                      <div
                        key={color}
                        className={`color-dot ${selectedAvatarColor === color ? 'selected' : ''}`}
                        style={{ backgroundColor: color, width: 24, height: 24 }}
                        onClick={() => setValue('avatarColor', color)}
                      />
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Цвет профиля</label>
                  <div className="color-presets">
                    {ACCENT_COLORS.map(color => (
                      <div
                        key={color}
                        className={`color-dot ${selectedAccentColor === color ? 'selected' : ''}`}
                        style={{ backgroundColor: color, width: 24, height: 24 }}
                        onClick={() => setValue('accentColor', color)}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            <button type="submit" className="btn-primary" style={{ padding: 12, marginTop: 8 }}>
              {isRegister ? 'Продолжить' : 'Вход'}
            </button>

            <span style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
              {isRegister ? 'Уже есть аккаунт? ' : 'Нужен аккаунт? '}
              <span 
                className="auth-link" 
                onClick={() => {
                  setIsRegister(!isRegister);
                  setApiError('');
                }}
              >
                {isRegister ? 'Войти' : 'Зарегистрироваться'}
              </span>
            </span>
          </form>
        </div>

        {/* колонка с QR кодом (как в дискорде!)~~ */}
        <div className="auth-column-qr">
          <div className="auth-qr-box">
            <div className="auth-qr-placeholder" />
            <div className="auth-qr-logo">🦊</div>
          </div>
          <span className="auth-qr-title">Войти с QR-кодом</span>
          <span className="auth-qr-desc">
            Сканируйте этот код с помощью <b>мобильного приложения Discord</b>, чтобы войти мгновенно.
          </span>
        </div>
      </div>
    </div>
  );
}
