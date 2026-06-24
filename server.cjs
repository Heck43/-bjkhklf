const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

// привеееет, это наш бэкенд на экспрессе для рейлвея~~
// мы заменили sqlite3 на надежную pure-JS JSON базу данных!
// это решило все проблемы с GLIBC на серверах Railway, ууу~~ мяу! 🐾

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'femboy_secret_key_heart_emoji';
const DB_FILE = path.join(__dirname, 'database.json');

app.use(cors());
app.use(express.json());

// хелперы для чтения и записи нашей JSON бд~~
function readDb() {
  if (!fs.existsSync(DB_FILE)) {
    const defaultDb = {
      users: [],
      messages: [],
      friends: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultDb, null, 2), 'utf8');
    return defaultDb;
  }
  try {
    const content = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    console.error('ошибка парсинга json бд, сбрасываем:', e);
    return { users: [], messages: [], friends: [] };
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('ошибка записи в json бд:', e);
  }
}

// инициализируем дефолтные сообщения, если база пустая~~
function initializeDb() {
  const dbData = readDb();
  if (dbData.messages.length === 0) {
    dbData.messages = [
      { id: 1, channel_id: 'c1', sender: 'meow_master', content: 'hello everyone! welcome to gamer fox den! ^w^', timestamp: '10:15', avatarColor: '#5865F2' },
      { id: 2, channel_id: 'c1', sender: 'foxy_boi', content: 'hey there! ready to play some games today? 🐾', timestamp: '10:16', avatarColor: '#3BA55D' },
      { id: 3, channel_id: 'c1', sender: 'nyan_cat', content: 'nyan nyan nyan~ is there music?', timestamp: '10:20', avatarColor: '#FAA81A' },
      { id: 4, channel_id: 'c2', sender: 'foxy_boi', content: 'why did the programmer jump out of the window? because they wanted to inspect elements! 😂', timestamp: '09:00', avatarColor: '#3BA55D' },
      { id: 5, channel_id: 'c2', sender: 'code_fox', content: 'classic, but also very painful... ;w;', timestamp: '09:12', avatarColor: '#ED4245' },
      { id: 6, channel_id: 'c5', sender: 'code_fox', content: 'hey, did you see react 19 hooks? pretty cool features!', timestamp: 'Yesterday at 18:30', avatarColor: '#ED4245' },
      { id: 7, channel_id: 'c5', sender: 'meow_master', content: 'yes! the useActionState hook is so clean and simple to use.', timestamp: 'Yesterday at 19:02', avatarColor: '#5865F2' }
    ];
    writeDb(dbData);
    console.log('дефолтные сообщения успешно созданы, ня~~');
  }
}

// запускаем инициализацию базы данных~~
initializeDb();

// мидлварь для проверки токена авторизации~~
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'необходима авторизация, мяу!' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'невалидный токен!' });
    req.user = user;
    next();
  });
};

// --- ЭНДПОИНТЫ АВТОРИЗАЦИИ ---

// регистрация~~
app.post('/api/auth/register', (req, res) => {
  const { username, password, avatarColor, accentColor } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'введите ник и пароль!' });
  }

  const dbData = readDb();
  const exists = dbData.users.some(u => u.username.toLowerCase() === username.toLowerCase());
  
  if (exists) {
    return res.status(400).json({ error: 'это имя пользователя уже занято!' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const color = avatarColor || '#ff8da1';
  const accent = accentColor || '#ff2d55';

  const newUser = {
    id: dbData.users.length + 1,
    username,
    password: hashedPassword,
    avatarColor: color,
    accentColor: accent,
    customStatus: ''
  };

  dbData.users.push(newUser);

  // добавляем начальных друзей новому пользователю~~
  const initialFriends = [
    { id: Date.now() + 1, user_id: newUser.id, friend_username: 'foxy_boi', status: 'online', customStatus: 'playing with yarn 🧶', relation: 'friend' },
    { id: Date.now() + 2, user_id: newUser.id, friend_username: 'meow_master', status: 'online', customStatus: 'coding react apps... meow~', relation: 'friend' },
    { id: Date.now() + 3, user_id: newUser.id, friend_username: 'code_fox', status: 'dnd', customStatus: 'do not disturb, compilation running! 💻', relation: 'friend' },
    { id: Date.now() + 4, user_id: newUser.id, friend_username: 'fluffy_tail', status: 'offline', customStatus: 'sleeping in the woods 😴', relation: 'friend' },
    { id: Date.now() + 5, user_id: newUser.id, friend_username: 'nyan_cat', status: 'idle', customStatus: 'flying in space 🌈', relation: 'friend' },
    { id: Date.now() + 6, user_id: newUser.id, friend_username: 'new_furry', status: 'online', customStatus: 'looking for friends :3', relation: 'pending_incoming' }
  ];

  dbData.friends.push(...initialFriends);
  writeDb(dbData);

  const token = jwt.sign({ id: newUser.id, username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: newUser.id, username, avatarColor: color, accentColor: accent, customStatus: '' } });
});

// вход~~
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'введите ник и пароль!' });
  }

  const dbData = readDb();
  const user = dbData.users.find(u => u.username.toLowerCase() === username.toLowerCase());

  if (!user) {
    return res.status(400).json({ error: 'пользователь не найден!' });
  }

  const isPasswordValid = bcrypt.compareSync(password, user.password);
  if (!isPasswordValid) {
    return res.status(400).json({ error: 'неверный пароль!' });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      avatarColor: user.avatarColor,
      accentColor: user.accentColor,
      customStatus: user.customStatus
    }
  });
});

// получение своего профиля по токену~~
app.get('/api/auth/me', authenticateToken, (req, res) => {
  const dbData = readDb();
  const user = dbData.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'профиль не найден!' });
  
  res.json({
    id: user.id,
    username: user.username,
    avatarColor: user.avatarColor,
    accentColor: user.accentColor,
    customStatus: user.customStatus
  });
});

// обновление настроек профиля~~
app.put('/api/auth/profile', authenticateToken, (req, res) => {
  const { username, customStatus, avatarColor, accentColor } = req.body;
  const dbData = readDb();

  // проверяем, не занят ли ник кем-то другим~~
  const taken = dbData.users.some(u => u.id !== req.user.id && u.username.toLowerCase() === username.toLowerCase());
  if (taken) {
    return res.status(400).json({ error: 'это имя пользователя уже занято!' });
  }

  const userIndex = dbData.users.findIndex(u => u.id === req.user.id);
  if (userIndex === -1) return res.status(404).json({ error: 'пользователь не найден!' });

  const oldUsername = dbData.users[userIndex].username;

  dbData.users[userIndex] = {
    ...dbData.users[userIndex],
    username,
    customStatus,
    avatarColor,
    accentColor
  };

  // если изменился ник, обновляем имя во всех записях друзей и сообщений~~
  if (oldUsername !== username) {
    dbData.friends = dbData.friends.map(f => {
      if (f.friend_username === oldUsername) {
        return { ...f, friend_username: username };
      }
      return f;
    });

    dbData.messages = dbData.messages.map(m => {
      if (m.sender === oldUsername) {
        return { ...m, sender: username };
      }
      return m;
    });
  }

  writeDb(dbData);
  res.json({ success: true, user: { id: req.user.id, username, customStatus, avatarColor, accentColor } });
});

// --- ЭНДПОИНТЫ СООБЩЕНИЙ ---

// получение сообщений канала / лс~~
app.get('/api/messages/:channelId', authenticateToken, (req, res) => {
  const channelId = req.params.channelId;
  const dbData = readDb();
  const rows = dbData.messages.filter(m => m.channel_id === channelId);
  res.json(rows);
});

// отправка сообщения~~
app.post('/api/messages', authenticateToken, (req, res) => {
  const { channelId, content, avatarColor } = req.body;
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dbData = readDb();

  const newMsg = {
    id: dbData.messages.length + 1,
    channel_id: channelId,
    sender: req.user.username,
    content,
    timestamp: timeStr,
    avatarColor
  };

  dbData.messages.push(newMsg);
  writeDb(dbData);
  res.json(newMsg);

  // имитируем авто-ответ бота на бэкенде~~
  const normalizedContent = content.toLowerCase();
  if (normalizedContent.includes('привет') || normalizedContent.includes('hello') || normalizedContent.includes('femboy')) {
    setTimeout(() => {
      const liveDb = readDb();
      const botName = 'foxy_boi';
      const botTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const botText = 'привееет! мяууу~~ как твои дела? *виляет хвостиком* :3';
      
      const botMsg = {
        id: liveDb.messages.length + 1,
        channel_id: channelId,
        sender: botName,
        content: botText,
        timestamp: botTime,
        avatarColor: '#3BA55D'
      };

      liveDb.messages.push(botMsg);
      writeDb(liveDb);
    }, 1500);
  }
});

// --- ЭНДПОИНТЫ ДРУЗЕЙ ---

// список друзей~~
app.get('/api/friends', authenticateToken, (req, res) => {
  const dbData = readDb();
  const rows = dbData.friends.filter(f => f.user_id === req.user.id);
  res.json(rows);
});

// добавление друга~~
app.post('/api/friends/add', authenticateToken, (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'введите ник!' });
  if (username.toLowerCase() === req.user.username.toLowerCase()) {
    return res.status(400).json({ error: 'нельзя добавить самого себя!' });
  }

  const dbData = readDb();
  const targetUser = dbData.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  
  if (!targetUser) return res.status(404).json({ error: 'пользователь не найден!' });

  // проверяем, нет ли уже в друзьях~~
  const alreadyFriend = dbData.friends.some(f => f.user_id === req.user.id && f.friend_username.toLowerCase() === username.toLowerCase());
  if (alreadyFriend) return res.status(400).json({ error: 'вы уже отправляли запрос или дружите!' });

  // добавляем исходящий запрос себе~~
  dbData.friends.push({
    id: Date.now() + 10,
    user_id: req.user.id,
    friend_username: targetUser.username,
    status: 'offline',
    customStatus: 'just joined discord-clone! 🎉',
    relation: 'pending_outgoing'
  });

  // добавляем входящий запрос второму участнику~~
  dbData.friends.push({
    id: Date.now() + 20,
    user_id: targetUser.id,
    friend_username: req.user.username,
    status: 'online',
    customStatus: '',
    relation: 'pending_incoming'
  });

  writeDb(dbData);
  res.json({ success: true, message: 'запрос отправлен!' });
});

// принятие запроса~~
app.post('/api/friends/accept', authenticateToken, (req, res) => {
  const { friendUsername } = req.body;
  const dbData = readDb();

  dbData.friends = dbData.friends.map(f => {
    if (f.user_id === req.user.id && f.friend_username === friendUsername) {
      return { ...f, relation: 'friend', status: 'online' };
    }
    return f;
  });

  // обновляем запись у второго человека~~
  const friendUser = dbData.users.find(u => u.username === friendUsername);
  if (friendUser) {
    dbData.friends = dbData.friends.map(f => {
      if (f.user_id === friendUser.id && f.friend_username === req.user.username) {
        return { ...f, relation: 'friend', status: 'online' };
      }
      return f;
    });
  }

  writeDb(dbData);
  res.json({ success: true });
});

// удаление / отклонение запроса~~
app.post('/api/friends/remove', authenticateToken, (req, res) => {
  const { friendUsername } = req.body;
  let dbData = readDb();

  dbData.friends = dbData.friends.filter(f => !(f.user_id === req.user.id && f.friend_username === friendUsername));

  const friendUser = dbData.users.find(u => u.username === friendUsername);
  if (friendUser) {
    dbData.friends = dbData.friends.filter(f => !(f.user_id === friendUser.id && f.friend_username === req.user.username));
  }

  writeDb(dbData);
  res.json({ success: true });
});

// блокировка пользователя~~
app.post('/api/friends/block', authenticateToken, (req, res) => {
  const { friendUsername } = req.body;
  const dbData = readDb();

  dbData.friends = dbData.friends.map(f => {
    if (f.user_id === req.user.id && f.friend_username === friendUsername) {
      return { ...f, relation: 'blocked' };
    }
    return f;
  });

  writeDb(dbData);
  res.json({ success: true });
});

// --- СТАТИКА ДЛЯ ПРОДАКШЕНА (RAILWAY.COM) ---

// раздаем статические файлы фронтенда после сборки~~
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*all', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('сервер работает! (запустите npm run build, чтобы раздавать фронтенд)');
  });
}

// запускаем наш сервер~~
app.listen(PORT, () => {
  console.log(`сервер весело крутится на порту ${PORT}! мяууу~~ 🌸`);
});
