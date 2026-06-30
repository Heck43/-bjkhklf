// // оййй тут утилита для получения абсолютных URL адресов бэкенда... ня~~ 🦊

export const getBackendUrl = (path) => {
  if (!path) return "";
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  
  // Определяем базовый хост бэкенда~~
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  
  // Если это мобильное приложение (Capacitor), origin будет localhost без порта, либо file://
  const isMobileApp = window.location.origin.includes('localhost') && !window.location.port;
  
  const productionBackend = 'https://furrdis.up.railway.app';
  const localBackend = 'http://localhost:3001';
  
  let base = window.location.origin;
  if (isMobileApp) {
    base = productionBackend;
  } else if (isDev) {
    base = localBackend;
  }
  
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
};
