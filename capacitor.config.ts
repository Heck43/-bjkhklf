import type { CapacitorConfig } from '@capacitor/cli';

// конфиг capacitor для мобильной сборки furrdis~~ мяу! 🐾
// тут настраиваем наш сервер, разрешения и параметры приложения~~
const config: CapacitorConfig = {
  appId: 'com.foxy.furrdis',
  appName: 'furrdis',
  webDir: 'dist',
  server: {
    // подключаемся к нашему серверу на railway для всех запросов~~
    url: 'https://furrdis.up.railway.app',
    cleartext: false
  },
  plugins: {
    // настройки локальных уведомлений~~
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#ff4d6d',
      sound: 'beep.wav'
    },
    // разрешаем использовать веб-рвц для звонков~~
    CapacitorHttp: {
      enabled: true
    }
  },
  android: {
    // разрешаем http для запасных сценариев~~
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false
  }
};

export default config;
