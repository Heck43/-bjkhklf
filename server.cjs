const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
const http = require('http');

// привеееет, это наш гибридный бэкенд на экспрессе для рейлвея~~
// мы перенесли серверы и каналы в бд, а также убрали все тестовые примеры чатов
// теперь пользователи могут общаться друг с другом, добавляясь в друзья! мяу! 🐾

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'femboy_secret_key_heart_emoji';
const DB_FILE = path.join(__dirname, 'database.json');

const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// --- НАСТРОЙКА БАЗЫ ДАННЫХ ---
const isPostgres = !!process.env.DATABASE_URL;
let pgPool = null;

if (isPostgres) {
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  console.log('подключаем бд postgresql на railway, ууу~~ 🐘');
} else {
  console.log('работаем с локальной json базой данных~~ 💾');
}

// Чтение/запись JSON базы данных~~
function readDb() {
  if (!fs.existsSync(DB_FILE)) {
    const defaultDb = { users: [], messages: [], friends: [], servers: [], channels: [] };
    fs.writeFileSync(DB_FILE, JSON.stringify(defaultDb, null, 2), 'utf8');
    return defaultDb;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    return { users: [], messages: [], friends: [], servers: [], channels: [] };
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('ошибка записи json бд:', e);
  }
}

// Универсальный адаптер баз данных (PostgreSQL / JSON)~~
const db = {
  init: async () => {
    if (isPostgres) {
      const client = await pgPool.connect();
      try {
        // Создание таблиц~~
        await client.query(`
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username VARCHAR(50) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            avatar_color VARCHAR(10) DEFAULT '#ff8da1',
            accent_color VARCHAR(10) DEFAULT '#ff2d55',
            custom_status VARCHAR(100) DEFAULT ''
          )
        `);
        await client.query(`
          ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT ''
        `);
        await client.query(`
          CREATE TABLE IF NOT EXISTS servers (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(50) NOT NULL,
            icon VARCHAR(10) NOT NULL
          )
        `);
        await client.query(`
          CREATE TABLE IF NOT EXISTS channels (
            id VARCHAR(50) PRIMARY KEY,
            server_id VARCHAR(50) NOT NULL,
            name VARCHAR(50) NOT NULL,
            type VARCHAR(10) NOT NULL,
            FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE
          )
        `);
        await client.query(`
          CREATE TABLE IF NOT EXISTS messages (
            id SERIAL PRIMARY KEY,
            channel_id VARCHAR(50) NOT NULL,
            sender VARCHAR(50) NOT NULL,
            content TEXT NOT NULL,
            timestamp VARCHAR(20) NOT NULL,
            avatar_color VARCHAR(10) DEFAULT '#ff8da1'
          )
        `);
        await client.query(`
          CREATE TABLE IF NOT EXISTS friends (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            friend_username VARCHAR(50) NOT NULL,
            status VARCHAR(20) DEFAULT 'online',
            custom_status VARCHAR(100) DEFAULT '',
            relation VARCHAR(20) NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `);

      } finally {
        client.release();
      }
    } else {
      const dbData = readDb();
      if (!dbData.servers) dbData.servers = [];
      if (!dbData.channels) dbData.channels = [];
      writeDb(dbData);
      console.log('база данных json готова, сервера пустые, мяу!~~');
    }
  },

  // Создать новый сервер в бд~~
  addServer: async (name, icon) => {
    const id = 's_' + Date.now() + Math.random().toString(36).substr(2, 5);
    if (isPostgres) {
      const res = await pgPool.query(
        'INSERT INTO servers (id, name, icon) VALUES ($1, $2, $3) RETURNING *',
        [id, name, icon]
      );
      const s = res.rows[0];
      return { id: s.id, name: s.name, icon: s.icon, channels: [] };
    } else {
      const dbData = readDb();
      const newServer = { id, name, icon };
      if (!dbData.servers) dbData.servers = [];
      dbData.servers.push(newServer);
      writeDb(dbData);
      return { ...newServer, channels: [] };
    }
  },

  // Создать новый канал в бд~~
  addChannel: async (serverId, name, type) => {
    const id = 'c_' + Date.now() + Math.random().toString(36).substr(2, 5);
    if (isPostgres) {
      const res = await pgPool.query(
        'INSERT INTO channels (id, server_id, name, type) VALUES ($1, $2, $3, $4) RETURNING *',
        [id, serverId, name, type]
      );
      const c = res.rows[0];
      return { id: c.id, server_id: c.server_id, name: c.name, type: c.type };
    } else {
      const dbData = readDb();
      const newChannel = { id, server_id: serverId, name, type };
      if (!dbData.channels) dbData.channels = [];
      dbData.channels.push(newChannel);
      writeDb(dbData);
      return newChannel;
    }
  },

  // Получить список серверов и каналов~~
  getServersAndChannels: async () => {
    if (isPostgres) {
      const sRes = await pgPool.query('SELECT * FROM servers');
      const cRes = await pgPool.query('SELECT * FROM channels');
      
      return sRes.rows.map(s => ({
        id: s.id,
        name: s.name,
        icon: s.icon,
        channels: cRes.rows.filter(c => c.server_id === s.id).map(c => ({
          id: c.id,
          name: c.name,
          type: c.type
        }))
      }));
    } else {
      const dbData = readDb();
      return dbData.servers.map(s => ({
        id: s.id,
        name: s.name,
        icon: s.icon,
        channels: (dbData.channels || []).filter(c => c.server_id === s.id).map(c => ({
          id: c.id,
          name: c.name,
          type: c.type
        }))
      }));
    }
  },

  // Получить юзера~~
  getUserByUsername: async (username) => {
    if (isPostgres) {
      const res = await pgPool.query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username]);
      if (res.rows.length === 0) return null;
      const u = res.rows[0];
      return { id: u.id, username: u.username, password: u.password, avatarColor: u.avatar_color, accentColor: u.accent_color, customStatus: u.custom_status, avatarUrl: u.avatar_url || '' };
    } else {
      const dbData = readDb();
      const u = dbData.users.find(u => u.username.toLowerCase() === username.toLowerCase());
      if (!u) return null;
      return { ...u, avatarUrl: u.avatarUrl || '' };
    }
  },

  getUserById: async (id) => {
    if (isPostgres) {
      const res = await pgPool.query('SELECT * FROM users WHERE id = $1', [id]);
      if (res.rows.length === 0) return null;
      const u = res.rows[0];
      return { id: u.id, username: u.username, password: u.password, avatarColor: u.avatar_color, accentColor: u.accent_color, customStatus: u.custom_status, avatarUrl: u.avatar_url || '' };
    } else {
      const dbData = readDb();
      const u = dbData.users.find(u => u.id === id);
      if (!u) return null;
      return { ...u, avatarUrl: u.avatarUrl || '' };
    }
  },

  // Создать юзера~~
  addUser: async (username, password, avatarColor, accentColor) => {
    if (isPostgres) {
      const res = await pgPool.query(
        'INSERT INTO users (username, password, avatar_color, accent_color) VALUES ($1, $2, $3, $4) RETURNING *',
        [username, password, avatarColor, accentColor]
      );
      const u = res.rows[0];
      return { id: u.id, username: u.username, password: u.password, avatarColor: u.avatar_color, accentColor: u.accent_color, customStatus: u.custom_status, avatarUrl: '' };
    } else {
      const dbData = readDb();
      const newUser = { id: dbData.users.length + 1, username, password, avatarColor, accentColor, customStatus: '', avatarUrl: '' };
      dbData.users.push(newUser);
      writeDb(dbData);
      return newUser;
    }
  },

  // Обновить профиль~~
  updateUserProfile: async (id, username, customStatus, avatarColor, accentColor, avatarUrl = '') => {
    if (isPostgres) {
      await pgPool.query(
        'UPDATE users SET username = $1, custom_status = $2, avatar_color = $3, accent_color = $4, avatar_url = $5 WHERE id = $6',
        [username, customStatus, avatarColor, accentColor, avatarUrl, id]
      );
      return { id, username, customStatus, avatarColor, accentColor, avatarUrl };
    } else {
      const dbData = readDb();
      const userIndex = dbData.users.findIndex(u => u.id === id);
      if (userIndex === -1) return null;

      const oldUsername = dbData.users[userIndex].username;
      dbData.users[userIndex] = { ...dbData.users[userIndex], username, customStatus, avatarColor, accentColor, avatarUrl };

      if (oldUsername !== username) {
        dbData.friends = dbData.friends.map(f => f.friend_username === oldUsername ? { ...f, friend_username: username } : f);
        dbData.messages = dbData.messages.map(m => m.sender === oldUsername ? { ...m, sender: username } : m);
      }
      writeDb(dbData);
      return { id, username, customStatus, avatarColor, accentColor, avatarUrl };
    }
  },

  // Проверка занятости имени другими~~
  isUsernameTaken: async (id, username) => {
    if (isPostgres) {
      const res = await pgPool.query('SELECT * FROM users WHERE id != $1 AND LOWER(username) = LOWER($2)', [id, username]);
      return res.rows.length > 0;
    } else {
      const dbData = readDb();
      return dbData.users.some(u => u.id !== id && u.username.toLowerCase() === username.toLowerCase());
    }
  },

  // Получить сообщения~~
  getMessages: async (channelId) => {
    if (isPostgres) {
      const res = await pgPool.query(`
        SELECT m.id, m.sender, m.content, m.timestamp, u.avatar_color, u.avatar_url
        FROM messages m
        LEFT JOIN users u ON LOWER(u.username) = LOWER(m.sender)
        WHERE m.channel_id = $1
        ORDER BY m.id ASC
      `, [channelId]);
      return res.rows.map(r => ({
        id: r.id,
        sender: r.sender,
        content: r.content,
        timestamp: r.timestamp,
        avatarColor: r.avatar_color || '#ff8da1',
        avatarUrl: r.avatar_url || ''
      }));
    } else {
      const dbData = readDb();
      return dbData.messages.filter(m => m.channel_id === channelId).map(r => {
        const u = dbData.users.find(usr => usr.username.toLowerCase() === r.sender.toLowerCase());
        return {
          id: r.id,
          sender: r.sender,
          content: r.content,
          timestamp: r.timestamp,
          avatarColor: u ? u.avatarColor : (r.avatarColor || '#ff8da1'),
          avatarUrl: u ? (u.avatarUrl || '') : ''
        };
      });
    }
  },

  // Отправить сообщение~~
  addMessage: async (channelId, sender, content, timestamp, avatarColor) => {
    if (isPostgres) {
      const res = await pgPool.query(
        'INSERT INTO messages (channel_id, sender, content, timestamp, avatar_color) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [channelId, sender, content, timestamp, avatarColor]
      );
      const r = res.rows[0];
      return { id: r.id, sender: r.sender, content: r.content, timestamp: r.timestamp, avatarColor: r.avatar_color };
    } else {
      const dbData = readDb();
      const newMsg = { id: dbData.messages.length + 1, channel_id: channelId, sender, content, timestamp, avatarColor };
      dbData.messages.push(newMsg);
      writeDb(dbData);
      return newMsg;
    }
  },

  // Получить друзей~~
  getFriends: async (userId) => {
    if (isPostgres) {
      const res = await pgPool.query(`
        SELECT f.friend_username, f.status, f.custom_status, f.relation, u.avatar_color, u.avatar_url
        FROM friends f
        LEFT JOIN users u ON LOWER(u.username) = LOWER(f.friend_username)
        WHERE f.user_id = $1
      `, [userId]);
      return res.rows.map(r => ({ 
        friend_username: r.friend_username, 
        status: r.status, 
        customStatus: r.custom_status, 
        relation: r.relation,
        avatarColor: r.avatar_color,
        avatarUrl: r.avatar_url || ''
      }));
    } else {
      const dbData = readDb();
      return dbData.friends.filter(f => f.user_id === userId).map(r => {
        const u = dbData.users.find(usr => usr.username.toLowerCase() === r.friend_username.toLowerCase());
        return { 
          friend_username: r.friend_username, 
          status: r.status, 
          customStatus: r.customStatus, 
          relation: r.relation,
          avatarColor: u ? u.avatarColor : '#72767d',
          avatarUrl: u ? (u.avatarUrl || '') : ''
        };
      });
    }
  },

  // Добавить запрос в друзья~~
  addFriendRequest: async (userId, friendUserId, friendUsername, currentUsername) => {
    if (isPostgres) {
      await pgPool.query('INSERT INTO friends (user_id, friend_username, relation) VALUES ($1, $2, $3)', [userId, friendUsername, 'pending_outgoing']);
      await pgPool.query('INSERT INTO friends (user_id, friend_username, relation) VALUES ($1, $2, $3)', [friendUserId, currentUsername, 'pending_incoming']);
    } else {
      const dbData = readDb();
      dbData.friends.push({ id: Date.now() + 10, user_id: userId, friend_username: friendUsername, status: 'offline', customStatus: 'just joined discord-clone! 🎉', relation: 'pending_outgoing' });
      dbData.friends.push({ id: Date.now() + 20, user_id: friendUserId, friend_username: currentUsername, status: 'online', customStatus: '', relation: 'pending_incoming' });
      writeDb(dbData);
    }
  },

  // Проверка связи друзей~~
  hasFriendRow: async (userId, friendUsername) => {
    if (isPostgres) {
      const res = await pgPool.query('SELECT * FROM friends WHERE user_id = $1 AND LOWER(friend_username) = LOWER($2)', [userId, friendUsername]);
      return res.rows.length > 0;
    } else {
      const dbData = readDb();
      return dbData.friends.some(f => f.user_id === userId && f.friend_username.toLowerCase() === friendUsername.toLowerCase());
    }
  },

  // Принять друга~~
  acceptFriendRequest: async (userId, friendUsername, friendUserId, currentUsername) => {
    if (isPostgres) {
      await pgPool.query("UPDATE friends SET relation = 'friend', status = 'online' WHERE user_id = $1 AND friend_username = $2", [userId, friendUsername]);
      await pgPool.query("UPDATE friends SET relation = 'friend', status = 'online' WHERE user_id = $1 AND friend_username = $2", [friendUserId, currentUsername]);
    } else {
      const dbData = readDb();
      dbData.friends = dbData.friends.map(f => (f.user_id === userId && f.friend_username === friendUsername) ? { ...f, relation: 'friend', status: 'online' } : f);
      dbData.friends = dbData.friends.map(f => (f.user_id === friendUserId && f.friend_username === currentUsername) ? { ...f, relation: 'friend', status: 'online' } : f);
      writeDb(dbData);
    }
  },

  // Удалить/Отклонить друга~~
  removeFriend: async (userId, friendUsername, friendUserId, currentUsername) => {
    if (isPostgres) {
      await pgPool.query('DELETE FROM friends WHERE user_id = $1 AND friend_username = $2', [userId, friendUsername]);
      await pgPool.query('DELETE FROM friends WHERE user_id = $1 AND friend_username = $2', [friendUserId, currentUsername]);
    } else {
      let dbData = readDb();
      dbData.friends = dbData.friends.filter(f => !(f.user_id === userId && f.friend_username === friendUsername));
      dbData.friends = dbData.friends.filter(f => !(f.user_id === friendUserId && f.friend_username === currentUsername));
      writeDb(dbData);
    }
  },

  // Заблокировать друга~~
  blockFriend: async (userId, friendUsername) => {
    if (isPostgres) {
      await pgPool.query("UPDATE friends SET relation = 'blocked' WHERE user_id = $1 AND friend_username = $2", [userId, friendUsername]);
    } else {
      const dbData = readDb();
      dbData.friends = dbData.friends.map(f => (f.user_id === userId && f.friend_username === friendUsername) ? { ...f, relation: 'blocked' } : f);
      writeDb(dbData);
    }
  }
};

// Запускаем инициализацию базы данных~~
db.init().then(() => {
  console.log('база данных успешно инициализирована! мяуу~~');
}).catch(e => {
  console.error('ошибка при инициализации базы данных:', e);
});

// Мидлварь для проверки токена авторизации~~
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

// --- SOCKET.IO ДЛЯ МГНОВЕННЫХ УВЕДОМЛЕНИЙ И ЧАТА В РЕАЛЬНОМ ВРЕМЕНИ ---

// Middleware для авторизации сокет-соединений~~
io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.query.token;
  if (!token) {
    return next(new Error("authentication error"));
  }
  jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
    if (err) return next(new Error("authentication error"));
    socket.user = decodedUser;
    next();
  });
});

// Хранилище участников голосовых каналов~~
const voiceStates = {}; // { channelId: [ { username, socketId, avatarColor } ] }

const leaveVoice = (socket) => {
  for (const channelId in voiceStates) {
    const list = voiceStates[channelId];
    const index = list.findIndex(p => p.socketId === socket.id);
    if (index !== -1) {
      list.splice(index, 1);
      // оповещаем комнату о выходе участника~~
      io.to(channelId).emit('voice_state_update', {
        channelId,
        participants: list
      });
      if (list.length === 0) {
        delete voiceStates[channelId];
      }
    }
  }
};

io.on('connection', (socket) => {
  const username = socket.user.username;
  console.log(`сокет подключился: @${username} (id: ${socket.id})~~ 🌸`);

  // Заходим в комнату имени пользователя для ЛС и личных обновлений~~
  socket.join(`user_${username.toLowerCase()}`);

  // Когда пользователь переходит в текстовый канал или ЛС чат~~
  socket.on('join_channel', (channelId) => {
    // выходим из предыдущих комнат каналов (но остаемся в своей личной user_ комнате)~~
    for (const room of socket.rooms) {
      if (room !== socket.id && room !== `user_${username.toLowerCase()}` && !room.startsWith('c_')) {
        // не выходим из голосовых комнат, так как там сидим параллельно~~
        socket.leave(room);
      }
    }
    socket.join(channelId);
    console.log(`@${username} зашел в комнату сокетов: ${channelId}~~ 🔊`);
  });

  // Вход в голосовой канал~~
  socket.on('join_voice', async (channelId) => {
    leaveVoice(socket);

    const username = socket.user.username;
    let avatarColor = '#ff8da1';
    let avatarUrl = '';

    try {
      const u = await db.getUserByUsername(username);
      if (u) {
        avatarColor = u.avatarColor;
        avatarUrl = u.avatarUrl || '';
      }
    } catch (e) {
      console.error('ошибка при получении юзера для голосового канала:', e);
    }

    if (!voiceStates[channelId]) {
      voiceStates[channelId] = [];
    }

    if (!voiceStates[channelId].some(p => p.username === username)) {
      voiceStates[channelId].push({
        username,
        socketId: socket.id,
        avatarColor,
        avatarUrl
      });
    }

    socket.join(channelId);
    console.log(`@${username} подключился к голосу в канале: ${channelId}~~ 🔊`);

    io.to(channelId).emit('voice_state_update', {
      channelId,
      participants: voiceStates[channelId]
    });
  });

  // Выход из голосового канала~~
  socket.on('leave_voice', () => {
    leaveVoice(socket);
  });

  socket.on('disconnect', () => {
    leaveVoice(socket);
    console.log(`сокет отключился: @${username} (id: ${socket.id})~~ 💾`);
  });
});

// Адаптеры для отправки событий через Socket.IO (совместимы с эндпоинтами!)~~
const sendSseToUser = (username, type, data) => {
  io.to(`user_${username.toLowerCase()}`).emit(type, data);
};

const sendSseToAll = (type, data) => {
  io.emit(type, data);
};

// Хелпер для комнат в сокетах (чтобы посылать сообщения только участникам канала)~~
const sendSocketToRoom = (roomId, eventName, data) => {
  io.to(roomId).emit(eventName, data);
};

// --- ЭНДПОИНТЫ СЕРВЕРОВ ---
app.get('/api/servers', authenticateToken, async (req, res) => {
  try {
    const list = await db.getServersAndChannels();
    res.json(list);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Создать новый сервер~~
app.post('/api/servers', authenticateToken, async (req, res) => {
  const { name, icon } = req.body;
  if (!name || !icon) {
    return res.status(400).json({ error: 'укажите имя сервера и эмодзи-иконку, ня!' });
  }
  try {
    const newServer = await db.addServer(name, icon);
    // автоматически создаем дефолтный текстовый канал "general" при создании сервера~~
    const defaultChannel = await db.addChannel(newServer.id, 'general', 'text');
    newServer.channels = [defaultChannel];
    
    // оповещаем всех клиентов мгновенно~~
    sendSseToAll('server', newServer);
    res.json(newServer);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Создать новый канал на сервере~~
app.post('/api/channels', authenticateToken, async (req, res) => {
  const { serverId, name, type } = req.body;
  if (!serverId || !name || !type) {
    return res.status(400).json({ error: 'укажите id сервера, название канала и его тип, ня!' });
  }
  try {
    const newChannel = await db.addChannel(serverId, name, type);
    
    // оповещаем всех клиентов мгновенно~~
    sendSseToAll('channel', newChannel);
    res.json(newChannel);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- ЭНДПОИНТЫ АВТОРИЗАЦИИ ---

// регистрация~~ (начальные друзья удалены, чтобы пользователи добавлялись сами!)
app.post('/api/auth/register', async (req, res) => {
  const { username, password, avatarColor, accentColor } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'введите ник и пароль!' });
  }

  try {
    const exists = await db.getUserByUsername(username);
    if (exists) {
      return res.status(400).json({ error: 'это имя пользователя уже занято!' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const color = avatarColor || '#ff8da1';
    const accent = accentColor || '#ff2d55';

    const newUser = await db.addUser(username, hashedPassword, color, accent);

    const token = jwt.sign({ id: newUser.id, username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: newUser.id, username, avatarColor: color, accentColor: accent, customStatus: '' } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// вход~~
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'введите ник и пароль!' });
  }

  try {
    const user = await db.getUserByUsername(username);
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
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// получение профиля~~
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'профиль не найден!' });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// обновление профиля~~
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  const { username, customStatus, avatarColor, accentColor, avatarUrl } = req.body;
  
  try {
    const taken = await db.isUsernameTaken(req.user.id, username);
    if (taken) {
      return res.status(400).json({ error: 'это имя пользователя уже занято!' });
    }

    const updated = await db.updateUserProfile(req.user.id, username, customStatus, avatarColor, accentColor, avatarUrl);
    res.json({ success: true, user: updated });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// получить профиль любого другого пользователя по юзернейму~~
app.get('/api/users/:username', authenticateToken, async (req, res) => {
  try {
    const user = await db.getUserByUsername(req.params.username);
    if (!user) return res.status(404).json({ error: 'пользователь не найден!' });
    res.json({
      username: user.username,
      avatarColor: user.avatarColor,
      accentColor: user.accentColor,
      customStatus: user.customStatus,
      avatarUrl: user.avatarUrl
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- ЭНДПОИНТЫ СООБЩЕНИЙ ---

// получение сообщений~~
app.get('/api/messages/:channelId', authenticateToken, async (req, res) => {
  try {
    const rows = await db.getMessages(req.params.channelId);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// отправка сообщения~~
app.post('/api/messages', authenticateToken, async (req, res) => {
  const { channelId, content, avatarColor } = req.body;
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  try {
    const senderUser = await db.getUserByUsername(req.user.username);
    const resolvedAvatarColor = senderUser ? senderUser.avatarColor : (avatarColor || '#ff8da1');
    const resolvedAvatarUrl = senderUser ? (senderUser.avatarUrl || '') : '';

    const newMsg = await db.addMessage(channelId, req.user.username, content, timeStr, resolvedAvatarColor);
    
    const enrichedMsg = {
      ...newMsg,
      avatarColor: resolvedAvatarColor,
      avatarUrl: resolvedAvatarUrl
    };
    
    // мгновенно оповещаем участников по SSE~~
    if (channelId.startsWith('dm_')) {
      const parts = channelId.replace('dm_', '').split('_');
      parts.forEach(username => {
        sendSseToUser(username, 'message', { channelId, message: enrichedMsg });
      });
    } else {
      sendSseToAll('message', { channelId, message: enrichedMsg });
    }
    
    res.json(enrichedMsg);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- ЭНДПОИНТЫ ДРУЗЕЙ ---

// список друзей~~
app.get('/api/friends', authenticateToken, async (req, res) => {
  try {
    const rows = await db.getFriends(req.user.id);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// запрос дружбы~~
app.post('/api/friends/add', authenticateToken, async (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'введите ник!' });
  if (username.toLowerCase() === req.user.username.toLowerCase()) {
    return res.status(400).json({ error: 'нельзя добавить самого себя!' });
  }

  try {
    const targetUser = await db.getUserByUsername(username);
    if (!targetUser) return res.status(404).json({ error: 'пользователь не найден!' });

    const alreadyFriend = await db.hasFriendRow(req.user.id, targetUser.username);
    if (alreadyFriend) return res.status(400).json({ error: 'вы уже отправляли запрос или дружите!' });

    await db.addFriendRequest(req.user.id, targetUser.id, targetUser.username, req.user.username);
    
    // шлем уведомление цели и обновляем себе список~~
    sendSseToUser(targetUser.username, 'friend', { type: 'request', from: req.user.username });
    sendSseToUser(req.user.username, 'friend', { type: 'update' });

    res.json({ success: true, message: 'запрос отправлен!' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// принять запрос~~
app.post('/api/friends/accept', authenticateToken, async (req, res) => {
  const { friendUsername } = req.body;
  try {
    const friendUser = await db.getUserByUsername(friendUsername);
    if (friendUser) {
      await db.acceptFriendRequest(req.user.id, friendUsername, friendUser.id, req.user.username);
      
      // шлем обоим событие обновления списка друзей~~
      sendSseToUser(friendUsername, 'friend', { type: 'accept', from: req.user.username });
      sendSseToUser(req.user.username, 'friend', { type: 'update' });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// удалить/отклонить запрос~~
app.post('/api/friends/remove', authenticateToken, async (req, res) => {
  const { friendUsername } = req.body;
  try {
    const friendUser = await db.getUserByUsername(friendUsername);
    if (friendUser) {
      await db.removeFriend(req.user.id, friendUsername, friendUser.id, req.user.username);
      
      // шлем обоим событие обновления списка друзей~~
      sendSseToUser(friendUsername, 'friend', { type: 'remove', from: req.user.username });
      sendSseToUser(req.user.username, 'friend', { type: 'update' });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// заблокировать~~
app.post('/api/friends/block', authenticateToken, async (req, res) => {
  const { friendUsername } = req.body;
  try {
    await db.blockFriend(req.user.id, friendUsername);
    
    // обновляем у себя список друзей~~
    sendSseToUser(req.user.username, 'friend', { type: 'update' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- СТАТИКА ДЛЯ ПРОДАКШЕНА (RAILWAY.COM) ---
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

// запускаем наш сервер через HTTP обертку для поддержки socket.io~~
server.listen(PORT, () => {
  console.log(`сервер с поддержкой socket.io весело крутится на порту ${PORT}! мяууу~~ 🌸`);
});
