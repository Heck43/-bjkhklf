// привеееет, это главный файлик для запуска нашего клона discord в electron~~
// тут мы создаем красивое десктопное окошко, скрываем менюшки и загружаем сервер, няяя! 🐾

const { app, BrowserWindow, Menu } = require('electron');
const http = require('http');

let mainWindow;

function checkLocalServer(port, callback) {
  // пробуем пингануть локальный сервер, чтобы понять, запущен ли он разработчиком~~
  const req = http.request({
    host: 'localhost',
    port: port,
    path: '/api/auth/me',
    method: 'GET',
    timeout: 1000
  }, (res) => {
    // если получили любой ответ, значит сервер дышит, мяу!
    callback(true);
  });

  req.on('error', () => {
    callback(false);
  });

  req.on('timeout', () => {
    req.destroy();
    callback(false);
  });

  req.end();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Discord Foxy Edition 🦊',
    backgroundColor: '#1e1f22', // красивый темный фон дискорда, ня~~
    icon: __dirname + '/public/icon.png', // если иконка есть, она применится~~
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // убираем стандартное верхнее меню, чтобы выглядело как настоящее приложение, мррр~~
  Menu.setApplicationMenu(null);

  const localPort = 3000;
  const remoteUrl = 'https://furrdis.up.railway.app/';

  checkLocalServer(localPort, (isLocalAvailable) => {
    if (isLocalAvailable) {
      console.log('ууууу~~ локальный сервер найден! загружаем localhost...');
      mainWindow.loadURL(`http://localhost:${localPort}`);
      // если мы разрабатываем локально, можно открыть консоль разработчика~~
      // mainWindow.webContents.openDevTools();
    } else {
      console.log('локальный сервер не запущен, загружаем продакшен версию из сети, ня~~');
      mainWindow.loadURL(remoteUrl);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
