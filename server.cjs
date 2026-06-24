const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

// привеееет, это наш гибридный бэкенд на экспрессе для рейлвея~~
// мы перенесли серверы и каналы в бд, а также убрали все тестовые примеры чатов
// теперь пользователи могут общаться друг с другом, добавляясь в друзья! мяу! 🐾

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'femboy_secret_key_heart_emoji';
const DB_FILE = path.join(__dirname, 'database.json');

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

        // Заполняем дефолтные серверы и каналы, если они пустые~~
        const sCount = await client.query('SELECT COUNT(*) FROM servers');
        if (parseInt(sCount.rows[0].count) === 0) {
          await client.query("INSERT INTO servers (id, name, icon) VALUES ('s1', 'Gamer Fox Den', '🦊')");
          await client.query("INSERT INTO servers (id, name, icon) VALUES ('s2', 'Coding Cafe', '☕')");
          await client.query("INSERT INTO servers (id, name, icon) VALUES ('s3', 'Chill Lounge', '🌸')");

          const cQ = "INSERT INTO channels (id, server_id, name, type) VALUES ($1, $2, $3, $4)";
          await client.query(cQ, ['c1', 's1', 'general', 'text']);
          await client.query(cQ, ['c2', 's1', 'memes', 'text']);
          await client.query(cQ, ['c3', 's1', 'lounge', 'voice']);
          await client.query(cQ, ['c4', 's1', 'gaming-1', 'voice']);
          await client.query(cQ, ['c5', 's2', 'react-chat', 'text']);
          await client.query(cQ, ['c6', 's2', 'bugs-and-fixes', 'text']);
          await client.query(cQ, ['c7', 's2', 'voice-room', 'voice']);
          await client.query(cQ, ['c8', 's3', 'welcome', 'text']);
          await client.query(cQ, ['c9', 's3', 'music-box', 'voice']);
          console.log('серверы и каналы успешно занесены в postgresql!');
        }
      } finally {
        client.release();
      }
    } else {
      const dbData = readDb();
      if (!dbData.servers || dbData.servers.length === 0) {
        dbData.servers = [
          { id: 's1', name: 'Gamer Fox Den', icon: '🦊' },
          { id: 's2', name: 'Coding Cafe', icon: '☕' },
          { id: 's3', name: 'Chill Lounge', icon: '🌸' }
        ];
      }
      if (!dbData.channels || dbData.channels.length === 0) {
        dbData.channels = [
          { id: 'c1', server_id: 's1', name: 'general', type: 'text' },
          { id: 'c2', server_id: 's1', name: 'memes', type: 'text' },
          { id: 'c3', server_id: 's1', name: 'lounge', type: 'voice' },
          { id: 'c4', server_id: 's1', name: 'gaming-1', type: 'voice' },
          { id: 'c5', server_id: 's2', name: 'react-chat', type: 'text' },
          { id: 'c6', server_id: 's2', name: 'bugs-and-fixes', type: 'text' },
          { id: 'c7', server_id: 's2', name: 'voice-room', type: 'voice' },
          { id: 'c8', server_id: 's3', name: 'welcome', type: 'text' },
          { id: 'c9', server_id: 's3', name: 'music-box', type: 'voice' }
        ];
      }
      writeDb(dbData);
      console.log('серверы и каналы успешно инициализированы в json бд!');
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
      return { id: u.id, username: u.username, password: u.password, avatarColor: u.avatar_color, accentColor: u.accent_color, customStatus: u.custom_status };
    } else {
      const dbData = readDb();
      return dbData.users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
    }
  },

  getUserById: async (id) => {
    if (isPostgres) {
      const res = await pgPool.query('SELECT * FROM users WHERE id = $1', [id]);
      if (res.rows.length === 0) return null;
      const u = res.rows[0];
      return { id: u.id, username: u.username, password: u.password, avatarColor: u.avatar_color, accentColor: u.accent_color, customStatus: u.custom_status };
    } else {
      const dbData = readDb();
      return dbData.users.find(u => u.id === id) || null;
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
      return { id: u.id, username: u.username, password: u.password, avatarColor: u.avatar_color, accentColor: u.accent_color, customStatus: u.custom_status };
    } else {
      const dbData = readDb();
      const newUser = { id: dbData.users.length + 1, username, password, avatarColor, accentColor, customStatus: '' };
      dbData.users.push(newUser);
      writeDb(dbData);
      return newUser;
    }
  },

  // Обновить профиль~~
  updateUserProfile: async (id, username, customStatus, avatarColor, accentColor) => {
    if (isPostgres) {
      await pgPool.query(
        'UPDATE users SET username = $1, custom_status = $2, avatar_color = $3, accent_color = $4 WHERE id = $5',
        [username, customStatus, avatarColor, accentColor, id]
      );
      return { id, username, customStatus, avatarColor, accentColor };
    } else {
      const dbData = readDb();
      const userIndex = dbData.users.findIndex(u => u.id === id);
      if (userIndex === -1) return null;

      const oldUsername = dbData.users[userIndex].username;
      dbData.users[userIndex] = { ...dbData.users[userIndex], username, customStatus, avatarColor, accentColor };

      if (oldUsername !== username) {
        dbData.friends = dbData.friends.map(f => f.friend_username === oldUsername ? { ...f, friend_username: username } : f);
        dbData.messages = dbData.messages.map(m => m.sender === oldUsername ? { ...m, sender: username } : m);
      }
      writeDb(dbData);
      return { id, username, customStatus, avatarColor, accentColor };
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
      const res = await pgPool.query('SELECT * FROM messages WHERE channel_id = $1 ORDER BY id ASC', [channelId]);
      return res.rows.map(r => ({
        id: r.id,
        sender: r.sender,
        content: r.content,
        timestamp: r.timestamp,
        avatarColor: r.avatar_color
      }));
    } else {
      const dbData = readDb();
      return dbData.messages.filter(m => m.channel_id === channelId).map(r => ({
        id: r.id,
        sender: r.sender,
        content: r.content,
        timestamp: r.timestamp,
        avatarColor: r.avatarColor
      }));
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
      const res = await pgPool.query('SELECT * FROM friends WHERE user_id = $1', [userId]);
      return res.rows.map(r => ({ friend_username: r.friend_username, status: r.status, customStatus: r.custom_status, relation: r.relation }));
    } else {
      const dbData = readDb();
      return dbData.friends.filter(f => f.user_id === userId).map(r => ({ friend_username: r.friend_username, status: r.status, customStatus: r.customStatus, relation: r.relation }));
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

// --- ЭНДПОИНТЫ СЕРВЕРОВ ---
app.get('/api/servers', authenticateToken, async (req, res) => {
  try {
    const list = await db.getServersAndChannels();
    res.json(list);
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
  const { username, customStatus, avatarColor, accentColor } = req.body;
  
  try {
    const taken = await db.isUsernameTaken(req.user.id, username);
    if (taken) {
      return res.status(400).json({ error: 'это имя пользователя уже занято!' });
    }

    const updated = await db.updateUserProfile(req.user.id, username, customStatus, avatarColor, accentColor);
    res.json({ success: true, user: updated });
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
    const newMsg = await db.addMessage(channelId, req.user.username, content, timeStr, avatarColor);
    res.json(newMsg);

    // авто-ответ бота на сообщения (только на серверах)~~
    const normalizedContent = content.toLowerCase();
    if (!channelId.startsWith('dm_') && (normalizedContent.includes('привет') || normalizedContent.includes('hello') || normalizedContent.includes('femboy'))) {
      setTimeout(async () => {
        try {
          const botTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const botText = 'привееет! мяууу~~ как твои дела? *виляет хвостиком* :3';
          await db.addMessage(channelId, 'foxy_boi', botText, botTime, '#3BA55D');
        } catch (err) {
          console.error(err);
        }
      }, 1500);
    }
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

// запускаем наш сервер~~
app.listen(PORT, () => {
  console.log(`сервер весело крутится на порту ${PORT}! мяууу~~ 🌸`);
});
