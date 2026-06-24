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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

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
          ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(50) DEFAULT ''
        `);
        await client.query(`
          ALTER TABLE users ADD COLUMN IF NOT EXISTS banner_url TEXT DEFAULT ''
        `);
        await client.query(`
          CREATE TABLE IF NOT EXISTS servers (
            id VARCHAR(50) PRIMARY KEY,
            name VARCHAR(50) NOT NULL,
            icon VARCHAR(10) NOT NULL
          )
        `);
        await client.query(`
          CREATE TABLE IF NOT EXISTS server_members (
            id SERIAL PRIMARY KEY,
            server_id VARCHAR(50) NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            role VARCHAR(50) DEFAULT 'Member',
            UNIQUE(server_id, user_id)
          )
        `);
        // запуск миграций колонок для старых бд~~
        try {
          await client.query('ALTER TABLE servers ALTER COLUMN icon TYPE TEXT');
          await client.query("ALTER TABLE server_members ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'Member'");
        } catch (e) {
          console.log('ошибка при миграции колонок (вероятно, они уже существуют):', e.message);
        }
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
            avatar_color VARCHAR(10) DEFAULT '#ff8da1',
            reply_to_id INTEGER REFERENCES messages(id) ON DELETE SET NULL
          )
        `);
        try {
          await client.query('ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id INTEGER REFERENCES messages(id) ON DELETE SET NULL');
        } catch (e) {
          console.log('ошибка при добавлении reply_to_id к messages:', e.message);
        }
        await client.query(`
          CREATE TABLE IF NOT EXISTS message_reactions (
            id SERIAL PRIMARY KEY,
            message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
            username VARCHAR(50) NOT NULL,
            emoji VARCHAR(50) NOT NULL,
            UNIQUE(message_id, username, emoji)
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

        // Создаем дефолтный публичный сервер, если его нет~~
        const pubServer = await client.query("SELECT * FROM servers WHERE id = 's_public_den'");
        if (pubServer.rows.length === 0) {
          await client.query("INSERT INTO servers (id, name, icon) VALUES ('s_public_den', 'Публичная Нора', '🦊')");
          await client.query("INSERT INTO channels (id, server_id, name, type) VALUES ('c_public_general', 's_public_den', 'general', 'text')");
          await client.query("INSERT INTO channels (id, server_id, name, type) VALUES ('c_public_voice', 's_public_den', 'voice', 'voice')");
        }

      } finally {
        client.release();
      }
    } else {
      const dbData = readDb();
      if (!dbData.servers || dbData.servers.length === 0) {
        dbData.servers = [{ id: 's_public_den', name: 'Публичная Нора', icon: '🦊' }];
        dbData.channels = [
          { id: 'c_public_general', server_id: 's_public_den', name: 'general', type: 'text' },
          { id: 'c_public_voice', server_id: 's_public_den', name: 'voice', type: 'voice' }
        ];
      }
      if (!dbData.server_members) dbData.server_members = [];
      writeDb(dbData);
      console.log('база данных json готова, сервера пустые, мяу!~~');
    }
  },

  // Создать новый сервер в бд~~
  addServer: async (name, icon, userId) => {
    const id = 's_' + Date.now() + Math.random().toString(36).substr(2, 5);
    if (isPostgres) {
      const res = await pgPool.query(
        'INSERT INTO servers (id, name, icon) VALUES ($1, $2, $3) RETURNING *',
        [id, name, icon]
      );
      const s = res.rows[0];
      // Сразу добавляем создателя в участники с ролью Owner~~
      await pgPool.query(
        "INSERT INTO server_members (server_id, user_id, role) VALUES ($1, $2, 'Owner') ON CONFLICT DO NOTHING",
        [id, userId]
      );
      return { id: s.id, name: s.name, icon: s.icon, channels: [] };
    } else {
      const dbData = readDb();
      const newServer = { id, name, icon };
      if (!dbData.servers) dbData.servers = [];
      dbData.servers.push(newServer);
      
      if (!dbData.server_members) dbData.server_members = [];
      dbData.server_members.push({ id: Date.now(), server_id: id, user_id: userId, role: 'Owner' });

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

  // Получить список серверов и каналов для юзера~~
  getServersAndChannels: async (userId) => {
    if (isPostgres) {
      const sRes = await pgPool.query(`
        SELECT s.* FROM servers s
        JOIN server_members sm ON sm.server_id = s.id
        WHERE sm.user_id = $1
      `, [userId]);
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
      if (!dbData.server_members) dbData.server_members = [];
      const myServerIds = dbData.server_members
        .filter(sm => sm.user_id === userId)
        .map(sm => sm.server_id);

      const filteredServers = (dbData.servers || []).filter(s => myServerIds.includes(s.id));

      return filteredServers.map(s => ({
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

  getServerById: async (id) => {
    if (isPostgres) {
      const res = await pgPool.query('SELECT * FROM servers WHERE id = $1', [id]);
      return res.rows[0] || null;
    } else {
      const dbData = readDb();
      return dbData.servers.find(s => s.id === id) || null;
    }
  },

  addServerMember: async (serverId, userId) => {
    if (isPostgres) {
      await pgPool.query(
        "INSERT INTO server_members (server_id, user_id, role) VALUES ($1, $2, 'Member') ON CONFLICT DO NOTHING",
        [serverId, userId]
      );
    } else {
      const dbData = readDb();
      if (!dbData.server_members) dbData.server_members = [];
      const exists = dbData.server_members.some(sm => sm.server_id === serverId && sm.user_id === userId);
      if (!exists) {
        dbData.server_members.push({ id: Date.now(), server_id: serverId, user_id: userId, role: 'Member' });
        writeDb(dbData);
      }
    }
  },

  // Получить юзера~~
  getUserByUsername: async (username) => {
    if (isPostgres) {
      const res = await pgPool.query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username]);
      if (res.rows.length === 0) return null;
      const u = res.rows[0];
      return { id: u.id, username: u.username, displayName: u.display_name || u.username, password: u.password, avatarColor: u.avatar_color, accentColor: u.accent_color, customStatus: u.custom_status, avatarUrl: u.avatar_url || '', bannerUrl: u.banner_url || '' };
    } else {
      const dbData = readDb();
      const u = dbData.users.find(u => u.username.toLowerCase() === username.toLowerCase());
      if (!u) return null;
      return { ...u, displayName: u.displayName || u.username, avatarUrl: u.avatarUrl || '', bannerUrl: u.bannerUrl || '' };
    }
  },

  getUserById: async (id) => {
    if (isPostgres) {
      const res = await pgPool.query('SELECT * FROM users WHERE id = $1', [id]);
      if (res.rows.length === 0) return null;
      const u = res.rows[0];
      return { id: u.id, username: u.username, displayName: u.display_name || u.username, password: u.password, avatarColor: u.avatar_color, accentColor: u.accent_color, customStatus: u.custom_status, avatarUrl: u.avatar_url || '', bannerUrl: u.banner_url || '' };
    } else {
      const dbData = readDb();
      const u = dbData.users.find(u => u.id === id);
      if (!u) return null;
      return { ...u, displayName: u.displayName || u.username, avatarUrl: u.avatarUrl || '', bannerUrl: u.bannerUrl || '' };
    }
  },

  // Создать юзера~~
  addUser: async (username, password, avatarColor, accentColor) => {
    if (isPostgres) {
      const res = await pgPool.query(
        'INSERT INTO users (username, password, avatar_color, accent_color, display_name) VALUES ($1, $2, $3, $4, $1) RETURNING *',
        [username, password, avatarColor, accentColor]
      );
      const u = res.rows[0];
      return { id: u.id, username: u.username, displayName: u.display_name || u.username, password: u.password, avatarColor: u.avatar_color, accentColor: u.accent_color, customStatus: u.custom_status, avatarUrl: '', bannerUrl: '' };
    } else {
      const dbData = readDb();
      const newUser = { id: dbData.users.length + 1, username, displayName: username, password, avatarColor, accentColor, customStatus: '', avatarUrl: '', bannerUrl: '' };
      dbData.users.push(newUser);
      writeDb(dbData);
      return newUser;
    }
  },

  // Обновить профиль~~
  updateUserProfile: async (id, displayName, customStatus, avatarColor, accentColor, avatarUrl = '', bannerUrl = '') => {
    if (isPostgres) {
      await pgPool.query(
        'UPDATE users SET display_name = $1, custom_status = $2, avatar_color = $3, accent_color = $4, avatar_url = $5, banner_url = $6 WHERE id = $7',
        [displayName, customStatus, avatarColor, accentColor, avatarUrl, bannerUrl, id]
      );
      const uRes = await pgPool.query('SELECT * FROM users WHERE id = $1', [id]);
      const u = uRes.rows[0];
      return { id, username: u.username, displayName: u.display_name || u.username, customStatus, avatarColor, accentColor, avatarUrl, bannerUrl: u.banner_url || '' };
    } else {
      const dbData = readDb();
      const userIndex = dbData.users.findIndex(u => u.id === id);
      if (userIndex === -1) return null;

      dbData.users[userIndex] = { ...dbData.users[userIndex], displayName, customStatus, avatarColor, accentColor, avatarUrl, bannerUrl };
      writeDb(dbData);
      return { id, username: dbData.users[userIndex].username, displayName, customStatus, avatarColor, accentColor, avatarUrl, bannerUrl };
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
      // 1. Получаем сообщения с инфой об ответе~~
      const res = await pgPool.query(`
        SELECT m.id, m.sender, m.content, m.timestamp, u.avatar_color, u.avatar_url, u.display_name,
               m.reply_to_id,
               rm.sender AS reply_to_sender,
               rm.content AS reply_to_content,
               ru.display_name AS reply_to_display_name,
               ru.avatar_color AS reply_to_avatar_color,
               ru.avatar_url AS reply_to_avatar_url
        FROM messages m
        LEFT JOIN users u ON LOWER(u.username) = LOWER(m.sender)
        LEFT JOIN messages rm ON rm.id = m.reply_to_id
        LEFT JOIN users ru ON LOWER(ru.username) = LOWER(rm.sender)
        WHERE m.channel_id = $1
        ORDER BY m.id ASC
      `, [channelId]);

      // 2. Получаем все реакции для сообщений этого канала~~
      const reactionsRes = await pgPool.query(`
        SELECT r.message_id, r.username, r.emoji
        FROM message_reactions r
        JOIN messages m ON m.id = r.message_id
        WHERE m.channel_id = $1
      `, [channelId]);

      // группируем их по message_id~~
      const reactionsMap = {};
      reactionsRes.rows.forEach(r => {
        if (!reactionsMap[r.message_id]) {
          reactionsMap[r.message_id] = [];
        }
        reactionsMap[r.message_id].push({ emoji: r.emoji, username: r.username });
      });

      return res.rows.map(r => ({
        id: r.id,
        sender: r.sender,
        content: r.content,
        timestamp: r.timestamp,
        avatarColor: r.avatar_color || '#ff8da1',
        avatarUrl: r.avatar_url || '',
        displayName: r.display_name || r.sender,
        replyToId: r.reply_to_id || null,
        replyToSender: r.reply_to_sender || null,
        replyToContent: r.reply_to_content || null,
        replyToDisplayName: r.reply_to_display_name || null,
        replyToAvatarColor: r.reply_to_avatar_color || '#ff8da1',
        replyToAvatarUrl: r.reply_to_avatar_url || '',
        reactions: reactionsMap[r.id] || []
      }));
    } else {
      const dbData = readDb();
      return dbData.messages.filter(m => m.channel_id === channelId).map(r => {
        const u = dbData.users.find(usr => usr.username.toLowerCase() === r.sender.toLowerCase());
        
        let replyToSender = null;
        let replyToContent = null;
        let replyToDisplayName = null;
        let replyToAvatarColor = '#ff8da1';
        let replyToAvatarUrl = '';
        if (r.reply_to_id) {
          const origMsg = dbData.messages.find(m => m.id === r.reply_to_id);
          if (origMsg) {
            replyToSender = origMsg.sender;
            replyToContent = origMsg.content;
            const ru = dbData.users.find(usr => usr.username.toLowerCase() === origMsg.sender.toLowerCase());
            replyToDisplayName = ru ? (ru.displayName || ru.username) : origMsg.sender;
            replyToAvatarColor = ru ? (ru.avatarColor || '#ff8da1') : '#ff8da1';
            replyToAvatarUrl = ru ? (ru.avatarUrl || '') : '';
          }
        }

        return {
          id: r.id,
          sender: r.sender,
          content: r.content,
          timestamp: r.timestamp,
          avatarColor: u ? u.avatarColor : (r.avatarColor || '#ff8da1'),
          avatarUrl: u ? (u.avatarUrl || '') : '',
          displayName: u ? (u.displayName || u.username) : r.sender,
          replyToId: r.reply_to_id || null,
          replyToSender,
          replyToContent,
          replyToDisplayName,
          replyToAvatarColor,
          replyToAvatarUrl,
          reactions: r.reactions || []
        };
      });
    }
  },

  // Отправить сообщение~~
  addMessage: async (channelId, sender, content, timestamp, avatarColor, replyToId = null) => {
    if (isPostgres) {
      const res = await pgPool.query(
        'INSERT INTO messages (channel_id, sender, content, timestamp, avatar_color, reply_to_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [channelId, sender, content, timestamp, avatarColor, replyToId]
      );
      const r = res.rows[0];
      return { id: r.id, sender: r.sender, content: r.content, timestamp: r.timestamp, avatarColor: r.avatar_color, replyToId: r.reply_to_id };
    } else {
      const dbData = readDb();
      const newMsg = { id: dbData.messages.length + 1, channel_id: channelId, sender, content, timestamp, avatarColor, reply_to_id: replyToId, reactions: [] };
      dbData.messages.push(newMsg);
      writeDb(dbData);
      return newMsg;
    }
  },

  // Добавить реакцию~~
  addReaction: async (messageId, username, emoji) => {
    if (isPostgres) {
      try {
        await pgPool.query(
          'INSERT INTO message_reactions (message_id, username, emoji) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [messageId, username, emoji]
        );
      } catch (e) {
        console.error('ошибка addReaction:', e.message);
      }
    } else {
      const dbData = readDb();
      const msg = dbData.messages.find(m => m.id === Number(messageId));
      if (msg) {
        if (!msg.reactions) msg.reactions = [];
        if (!msg.reactions.some(r => r.emoji === emoji && r.username === username)) {
          msg.reactions.push({ emoji, username });
          writeDb(dbData);
        }
      }
    }
  },

  // Удалить реакцию~~
  removeReaction: async (messageId, username, emoji) => {
    if (isPostgres) {
      try {
        await pgPool.query(
          'DELETE FROM message_reactions WHERE message_id = $1 AND username = $2 AND emoji = $3',
          [messageId, username, emoji]
        );
      } catch (e) {
        console.error('ошибка removeReaction:', e.message);
      }
    } else {
      const dbData = readDb();
      const msg = dbData.messages.find(m => m.id === Number(messageId));
      if (msg) {
        if (!msg.reactions) msg.reactions = [];
        msg.reactions = msg.reactions.filter(r => !(r.emoji === emoji && r.username === username));
        writeDb(dbData);
      }
    }
  },

  // Получить все реакции сообщения~~
  getReactions: async (messageId) => {
    if (isPostgres) {
      const res = await pgPool.query('SELECT username, emoji FROM message_reactions WHERE message_id = $1', [messageId]);
      return res.rows.map(r => ({ emoji: r.emoji, username: r.username }));
    } else {
      const dbData = readDb();
      const msg = dbData.messages.find(m => m.id === Number(messageId));
      return msg ? (msg.reactions || []) : [];
    }
  },

  // Получить друзей~~
  getFriends: async (userId) => {
    if (isPostgres) {
      const res = await pgPool.query(`
        SELECT f.friend_username, f.status, f.custom_status, f.relation, u.avatar_color, u.avatar_url, u.display_name
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
        avatarUrl: r.avatar_url || '',
        displayName: r.display_name || r.friend_username
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
          avatarUrl: u ? (u.avatarUrl || '') : '',
          displayName: u ? (u.displayName || u.username) : r.friend_username
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

  // Очистить сообщения в чате ЛС~~
  clearDmMessages: async (channelId) => {
    if (isPostgres) {
      await pgPool.query('DELETE FROM messages WHERE channel_id = $1', [channelId]);
    } else {
      const dbData = readDb();
      dbData.messages = dbData.messages.filter(m => m.channel_id !== channelId);
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
  },

  // получить список участников сервера из бд~~
  getServerMembers: async (serverId) => {
    if (isPostgres) {
      const res = await pgPool.query(`
        SELECT u.id, u.username, u.display_name, u.avatar_color, u.avatar_url, u.custom_status, sm.role
        FROM users u
        JOIN server_members sm ON sm.user_id = u.id
        WHERE sm.server_id = $1
      `, [serverId]);
      return res.rows.map(u => ({
        id: u.id,
        username: u.username,
        displayName: u.display_name || u.username,
        avatarColor: u.avatar_color,
        avatarUrl: u.avatar_url || '',
        customStatus: u.custom_status || '',
        role: u.role || 'Member'
      }));
    } else {
      const dbData = readDb();
      if (!dbData.server_members) dbData.server_members = [];
      const membersMap = {};
      dbData.server_members
        .filter(sm => sm.server_id === serverId)
        .forEach(sm => {
          membersMap[sm.user_id] = sm.role || 'Member';
        });

      const userIds = Object.keys(membersMap).map(Number);
      return (dbData.users || [])
        .filter(u => userIds.includes(u.id))
        .map(u => ({
          id: u.id,
          username: u.username,
          displayName: u.displayName || u.username,
          avatarColor: u.avatarColor,
          avatarUrl: u.avatarUrl || '',
          customStatus: u.customStatus || '',
          role: membersMap[u.id] || 'Member'
        }));
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
  socket.on('join_voice', async (channelId, initialState) => {
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
 
    const state = initialState || { isMuted: false, isDeafened: false, isCameraOn: false, isScreenSharing: false };
 
    if (!voiceStates[channelId].some(p => p.username === username)) {
      voiceStates[channelId].push({
        username,
        socketId: socket.id,
        avatarColor,
        avatarUrl,
        isMuted: state.isMuted,
        isDeafened: state.isDeafened,
        isCameraOn: state.isCameraOn,
        isScreenSharing: state.isScreenSharing
      });
    }
 
    socket.join(channelId);
    console.log(`@${username} подключился к голосу в канале: ${channelId}~~ 🔊`);
 
    io.to(channelId).emit('voice_state_update', {
      channelId,
      participants: voiceStates[channelId]
    });
  });
 
  // Обновление состояния в звонке (муты, камера, стрим)~~
  socket.on('update_voice_state', (state) => {
    for (const channelId in voiceStates) {
      const list = voiceStates[channelId];
      const participant = list.find(p => p.socketId === socket.id);
      if (participant) {
        participant.isMuted = state.isMuted;
        participant.isDeafened = state.isDeafened;
        participant.isCameraOn = state.isCameraOn;
        participant.isScreenSharing = state.isScreenSharing;
        
        io.to(channelId).emit('voice_state_update', {
          channelId,
          participants: list
        });
      }
    }
  });

  // Сигналинг для WebRTC (трансляция экрана)~~
  socket.on('webrtc_signal', (data) => {
    const { targetSocketId, signalData } = data;
    io.to(targetSocketId).emit('webrtc_signal', {
      senderSocketId: socket.id,
      signalData
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
    // Автоматически добавляем пользователя в Публичную Нору, если его там нет~~
    await db.addServerMember('s_public_den', req.user.id);

    const list = await db.getServersAndChannels(req.user.id);
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
    const newServer = await db.addServer(name, icon, req.user.id);
    // автоматически создаем дефолтный текстовый канал "general" при создании сервера~~
    const defaultChannel = await db.addChannel(newServer.id, 'general', 'text');
    newServer.channels = [defaultChannel];
    
    // оповещаем создателя о создании нового сервера~~
    sendSseToUser(req.user.username, 'server', { type: 'create', server: newServer });
    res.json(newServer);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Получить данные конкретного сервера~~
app.get('/api/servers/:serverId', authenticateToken, async (req, res) => {
  try {
    const s = await db.getServerById(req.params.serverId);
    if (!s) return res.status(404).json({ error: 'сервер не найден!' });
    res.json(s);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Обновить настройки сервера (имя, иконка/аватарка)~~
app.put('/api/servers/:serverId', authenticateToken, async (req, res) => {
  const { serverId } = req.params;
  const { name, icon } = req.body;
  
  try {
    if (isPostgres) {
      await pgPool.query(
        'UPDATE servers SET name = $1, icon = $2 WHERE id = $3',
        [name, icon, serverId]
      );
    } else {
      const dbData = readDb();
      const serverIndex = dbData.servers.findIndex(s => s.id === serverId);
      if (serverIndex !== -1) {
        dbData.servers[serverIndex].name = name;
        dbData.servers[serverIndex].icon = icon;
        writeDb(dbData);
      }
    }
    
    // оповещаем сокеты об обновлении серверов для всех участников~~
    sendSseToAll('server', { type: 'update', serverId });
    res.json({ success: true, message: 'сервер успешно обновлен!' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Обновить роль участника сервера~~
app.put('/api/servers/:serverId/members/:userId/role', authenticateToken, async (req, res) => {
  const { serverId, userId } = req.params;
  const { role } = req.body;
  
  try {
    if (isPostgres) {
      await pgPool.query(
        'UPDATE server_members SET role = $1 WHERE server_id = $2 AND user_id = $3',
        [role, serverId, userId]
      );
    } else {
      const dbData = readDb();
      if (!dbData.server_members) dbData.server_members = [];
      const memberIndex = dbData.server_members.findIndex(sm => sm.server_id === serverId && sm.user_id === Number(userId));
      if (memberIndex !== -1) {
        dbData.server_members[memberIndex].role = role;
        writeDb(dbData);
      }
    }
    
    // Оповещаем участников об обновлении списка участников (включая их роли!)~~
    sendSseToAll('server_members', { serverId });
    res.json({ success: true, message: 'роль успешно обновлена!' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Получить список участников конкретного сервера~~
app.get('/api/servers/:serverId/members', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    const members = await db.getServerMembers(serverId);
    const enriched = members.map(m => {
      const isOnline = io.sockets.adapter.rooms.has(`user_${m.username.toLowerCase()}`);
      return {
        ...m,
        status: isOnline ? 'online' : 'offline'
      };
    });
    res.json(enriched);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Присоединиться к server по его коду (ID)~~
app.post('/api/servers/join', authenticateToken, async (req, res) => {
  const { serverId } = req.body;
  if (!serverId) return res.status(400).json({ error: 'укажите код сервера, ня!' });
  
  try {
    const s = await db.getServerById(serverId);
    if (!s) return res.status(404).json({ error: 'сервер с таким кодом не найден!' });

    await db.addServerMember(serverId, req.user.id);
    
    // оповещаем пользователя по сокетам об обновлении списка серверов~~
    sendSseToUser(req.user.username, 'server', { type: 'join', serverId });
    // оповещаем всех участников об обновлении участников сервера~~
    sendSseToAll('server_members', { serverId });
    res.json({ success: true, message: 'успешно присоединились к серверу!' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Пригласить друга на сервер~~
app.post('/api/servers/:serverId/invite', authenticateToken, async (req, res) => {
  const { serverId } = req.params;
  const { friendUsername } = req.body;
  if (!friendUsername) return res.status(400).json({ error: 'укажите никнейм друга!' });
  
  try {
    const friend = await db.getUserByUsername(friendUsername);
    if (!friend) return res.status(404).json({ error: 'друг не найден!' });

    await db.addServerMember(serverId, friend.id);
    
    // отправляем сокет-уведомление приглашенному другу~~
    sendSseToUser(friendUsername, 'server', { type: 'invite', serverId });
    // оповещаем всех участников об обновлении участников сервера~~
    sendSseToAll('server_members', { serverId });
    res.json({ success: true, message: 'приглашение успешно отправлено!' });
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
    res.json({ token, user: { id: newUser.id, username, displayName: newUser.displayName || username, avatarColor: color, accentColor: accent, customStatus: '' } });
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
        displayName: user.displayName || user.username,
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
  const { displayName, customStatus, avatarColor, accentColor, avatarUrl, bannerUrl } = req.body;
  
  try {
    const updated = await db.updateUserProfile(req.user.id, displayName, customStatus, avatarColor, accentColor, avatarUrl, bannerUrl);
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
      displayName: user.displayName || user.username,
      avatarColor: user.avatarColor,
      accentColor: user.accentColor,
      customStatus: user.customStatus,
      avatarUrl: user.avatarUrl,
      bannerUrl: user.bannerUrl || ''
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
  const { channelId, content, avatarColor, replyToId } = req.body;
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  try {
    const senderUser = await db.getUserByUsername(req.user.username);
    const resolvedAvatarColor = senderUser ? senderUser.avatarColor : (avatarColor || '#ff8da1');
    const resolvedAvatarUrl = senderUser ? (senderUser.avatarUrl || '') : '';
    const resolvedDisplayName = senderUser ? (senderUser.displayName || senderUser.username) : req.user.username;

    const newMsg = await db.addMessage(channelId, req.user.username, content, timeStr, resolvedAvatarColor, replyToId ? Number(replyToId) : null);
    
    // Подгружаем данные исходного сообщения, если это ответ~~
    let replyToSender = null;
    let replyToContent = null;
    let replyToDisplayName = null;
    let replyToAvatarColor = '#ff8da1';
    let replyToAvatarUrl = '';
    const actualReplyId = newMsg.replyToId || newMsg.reply_to_id;
    if (actualReplyId) {
      if (isPostgres) {
        const origRes = await pgPool.query(
          'SELECT m.sender, m.content, u.display_name, u.avatar_color, u.avatar_url FROM messages m LEFT JOIN users u ON LOWER(u.username) = LOWER(m.sender) WHERE m.id = $1',
          [actualReplyId]
        );
        if (origRes.rows.length > 0) {
          replyToSender = origRes.rows[0].sender;
          replyToContent = origRes.rows[0].content;
          replyToDisplayName = origRes.rows[0].display_name || origRes.rows[0].sender;
          replyToAvatarColor = origRes.rows[0].avatar_color || '#ff8da1';
          replyToAvatarUrl = origRes.rows[0].avatar_url || '';
        }
      } else {
        const dbData = readDb();
        const origMsg = dbData.messages.find(m => m.id === actualReplyId);
        if (origMsg) {
          replyToSender = origMsg.sender;
          replyToContent = origMsg.content;
          const ru = dbData.users.find(usr => usr.username.toLowerCase() === origMsg.sender.toLowerCase());
          replyToDisplayName = ru ? (ru.displayName || ru.username) : origMsg.sender;
          replyToAvatarColor = ru ? (ru.avatarColor || '#ff8da1') : '#ff8da1';
          replyToAvatarUrl = ru ? (ru.avatarUrl || '') : '';
        }
      }
    }

    const enrichedMsg = {
      ...newMsg,
      avatarColor: resolvedAvatarColor,
      avatarUrl: resolvedAvatarUrl,
      displayName: resolvedDisplayName,
      replyToId: actualReplyId || null,
      replyToSender,
      replyToContent,
      replyToDisplayName,
      replyToAvatarColor,
      replyToAvatarUrl,
      reactions: []
    };
    
    // мгновенно оповещаем участников по сокетам~~
    if (channelId.startsWith('dm_')) {
      const dmPart = channelId.replace('dm_', '');
      let recipient = '';
      const senderLower = req.user.username.toLowerCase();
      const dmPartLower = dmPart.toLowerCase();
      
      if (dmPartLower.startsWith(senderLower + '_')) {
        recipient = dmPart.substring(senderLower.length + 1);
      } else if (dmPartLower.endsWith('_' + senderLower)) {
        recipient = dmPart.substring(0, dmPart.length - (senderLower.length + 1));
      }

      sendSseToUser(req.user.username, 'message', { channelId, message: enrichedMsg });
      if (recipient) {
        sendSseToUser(recipient, 'message', { channelId, message: enrichedMsg });
      }
    } else {
      sendSseToAll('message', { channelId, message: enrichedMsg });
    }
    
    res.json(enrichedMsg);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// добавление реакции~~
app.post('/api/messages/:id/reactions', authenticateToken, async (req, res) => {
  const messageId = Number(req.params.id);
  const { emoji } = req.body;
  const username = req.user.username;

  try {
    await db.addReaction(messageId, username, emoji);
    const updatedReactions = await db.getReactions(messageId);

    let channelId = '';
    if (isPostgres) {
      const msgRes = await pgPool.query('SELECT channel_id FROM messages WHERE id = $1', [messageId]);
      if (msgRes.rows.length > 0) {
        channelId = msgRes.rows[0].channel_id;
      }
    } else {
      const dbData = readDb();
      const msg = dbData.messages.find(m => m.id === messageId);
      if (msg) {
        channelId = msg.channel_id;
      }
    }

    if (channelId) {
      const eventData = { messageId, reactions: updatedReactions };
      if (channelId.startsWith('dm_')) {
        const dmPart = channelId.replace('dm_', '');
        let recipient = '';
        const senderLower = username.toLowerCase();
        const dmPartLower = dmPart.toLowerCase();
        
        if (dmPartLower.startsWith(senderLower + '_')) {
          recipient = dmPart.substring(senderLower.length + 1);
        } else if (dmPartLower.endsWith('_' + senderLower)) {
          recipient = dmPart.substring(0, dmPart.length - (senderLower.length + 1));
        }

        sendSseToUser(username, 'reaction_update', { channelId, ...eventData });
        if (recipient) {
          sendSseToUser(recipient, 'reaction_update', { channelId, ...eventData });
        }
      } else {
        sendSseToAll('reaction_update', { channelId, ...eventData });
      }
    }

    res.json({ success: true, reactions: updatedReactions });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// удаление реакции~~
app.delete('/api/messages/:id/reactions', authenticateToken, async (req, res) => {
  const messageId = Number(req.params.id);
  const { emoji } = req.body;
  const username = req.user.username;

  try {
    await db.removeReaction(messageId, username, emoji);
    const updatedReactions = await db.getReactions(messageId);

    let channelId = '';
    if (isPostgres) {
      const msgRes = await pgPool.query('SELECT channel_id FROM messages WHERE id = $1', [messageId]);
      if (msgRes.rows.length > 0) {
        channelId = msgRes.rows[0].channel_id;
      }
    } else {
      const dbData = readDb();
      const msg = dbData.messages.find(m => m.id === messageId);
      if (msg) {
        channelId = msg.channel_id;
      }
    }

    if (channelId) {
      const eventData = { messageId, reactions: updatedReactions };
      if (channelId.startsWith('dm_')) {
        const dmPart = channelId.replace('dm_', '');
        let recipient = '';
        const senderLower = username.toLowerCase();
        const dmPartLower = dmPart.toLowerCase();
        
        if (dmPartLower.startsWith(senderLower + '_')) {
          recipient = dmPart.substring(senderLower.length + 1);
        } else if (dmPartLower.endsWith('_' + senderLower)) {
          recipient = dmPart.substring(0, dmPart.length - (senderLower.length + 1));
        }

        sendSseToUser(username, 'reaction_update', { channelId, ...eventData });
        if (recipient) {
          sendSseToUser(recipient, 'reaction_update', { channelId, ...eventData });
        }
      } else {
        sendSseToAll('reaction_update', { channelId, ...eventData });
      }
    }

    res.json({ success: true, reactions: updatedReactions });
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
      
      // Очищаем чат с другом на сервере при удалении~~
      const dmKey = 'dm_' + [req.user.username, friendUsername].sort().join('_');
      await db.clearDmMessages(dmKey);

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
