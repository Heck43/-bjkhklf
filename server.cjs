const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

// привеееет, это наш бэкенд на экспрессе для рейлвея~~
// тут крутится база данных sqlite3, авторизация и сохранение сообщений! мяу! 🐾

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'femboy_secret_key_heart_emoji';
const DB_PATH = path.join(__dirname, 'database.sqlite');

app.use(cors());
app.use(express.json());

// подключаем базу данных sqlite3~~
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('ошибка открытия бд:', err.message);
  } else {
    console.log('бд подключена успешно, ууу~~');
    initializeDb();
  }
});

// инициализируем таблички в бд, если их нет~~
function initializeDb() {
  db.serialize(() => {
    // таблица пользователей~~
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        avatarColor TEXT DEFAULT '#ff8da1',
        accentColor TEXT DEFAULT '#ff2d55',
        customStatus TEXT DEFAULT ''
      )
    `);

    // таблица сообщений~~
    db.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        channel_id TEXT NOT NULL,
        sender TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        avatarColor TEXT DEFAULT '#ff8da1'
      )
    `);

    // таблица друзей~~
    db.run(`
      CREATE TABLE IF NOT EXISTS friends (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        friend_username TEXT NOT NULL,
        status TEXT DEFAULT 'online',
        customStatus TEXT DEFAULT '',
        relation TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `);

    // добавляем дефолтные сообщения в каналы, если таблица сообщений пуста~~
    db.get('SELECT COUNT(*) as count FROM messages', (err, row) => {
      if (row && row.count === 0) {
        const stmt = db.prepare('INSERT INTO messages (channel_id, sender, content, timestamp, avatarColor) VALUES (?, ?, ?, ?, ?)');
        stmt.run('c1', 'meow_master', 'hello everyone! welcome to gamer fox den! ^w^', '10:15', '#5865F2');
        stmt.run('c1', 'foxy_boi', 'hey there! ready to play some games today? 🐾', '10:16', '#3BA55D');
        stmt.run('c1', 'nyan_cat', 'nyan nyan nyan~ is there music?', '10:20', '#FAA81A');
        stmt.run('c2', 'foxy_boi', 'why did the programmer jump out of the window? because they wanted to inspect elements! 😂', '09:00', '#3BA55D');
        stmt.run('c2', 'code_fox', 'classic, but also very painful... ;w;', '09:12', '#ED4245');
        stmt.run('c5', 'code_fox', 'hey, did you see react 19 hooks? pretty cool features!', 'Yesterday at 18:30', '#ED4245');
        stmt.run('c5', 'meow_master', 'yes! the useActionState hook is so clean and simple to use.', 'Yesterday at 19:02', '#5865F2');
        stmt.finalize();
      }
    });
  });
}

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

  const hashedPassword = bcrypt.hashSync(password, 10);
  const color = avatarColor || '#ff8da1';
  const accent = accentColor || '#ff2d55';

  db.run(
    'INSERT INTO users (username, password, avatarColor, accentColor) VALUES (?, ?, ?, ?)',
    [username, hashedPassword, color, accent],
    function(err) {
      if (err) {
        return res.status(400).json({ error: 'это имя пользователя уже занято!' });
      }
      
      const userId = this.lastID;
      
      // добавляем начальных друзей новому пользователю~~
      const stmt = db.prepare('INSERT INTO friends (user_id, friend_username, status, customStatus, relation) VALUES (?, ?, ?, ?, ?)');
      stmt.run(userId, 'foxy_boi', 'online', 'playing with yarn 🧶', 'friend');
      stmt.run(userId, 'meow_master', 'online', 'coding react apps... meow~', 'friend');
      stmt.run(userId, 'code_fox', 'dnd', 'do not disturb, compilation running! 💻', 'friend');
      stmt.run(userId, 'fluffy_tail', 'offline', 'sleeping in the woods 😴', 'friend');
      stmt.run(userId, 'nyan_cat', 'idle', 'flying in space 🌈', 'friend');
      stmt.run(userId, 'new_furry', 'online', 'looking for friends :3', 'pending_incoming');
      stmt.finalize();

      const token = jwt.sign({ id: userId, username }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user: { id: userId, username, avatarColor: color, accentColor: accent, customStatus: '' } });
    }
  );
});

// вход~~
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'введите ник и пароль!' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err || !user) {
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
});

// получение своего профиля по токену~~
app.get('/api/auth/me', authenticateToken, (req, res) => {
  db.get('SELECT id, username, avatarColor, accentColor, customStatus FROM users WHERE id = ?', [req.user.id], (err, user) => {
    if (err || !user) return res.status(404).json({ error: 'профиль не найден!' });
    res.json(user);
  });
});

// обновление настроек профиля~~
app.put('/api/auth/profile', authenticateToken, (req, res) => {
  const { username, customStatus, avatarColor, accentColor } = req.body;
  
  db.run(
    'UPDATE users SET username = ?, customStatus = ?, avatarColor = ?, accentColor = ? WHERE id = ?',
    [username, customStatus, avatarColor, accentColor, req.user.id],
    function(err) {
      if (err) return res.status(400).json({ error: 'ошибка обновления профиля (возможно, ник занят)!' });
      res.json({ success: true, user: { id: req.user.id, username, customStatus, avatarColor, accentColor } });
    }
  );
});

// --- ЭНДПОИНТЫ СООБЩЕНИЙ ---

// получение сообщений канала / лс~~
app.get('/api/messages/:channelId', authenticateToken, (req, res) => {
  const channelId = req.params.channelId;
  db.all('SELECT * FROM messages WHERE channel_id = ? ORDER BY id ASC', [channelId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// отправка сообщения~~
app.post('/api/messages', authenticateToken, (req, res) => {
  const { channelId, content, avatarColor } = req.body;
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  db.run(
    'INSERT INTO messages (channel_id, sender, content, timestamp, avatarColor) VALUES (?, ?, ?, ?, ?)',
    [channelId, req.user.username, content, timeStr, avatarColor],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      const newMsg = { id: this.lastID, sender: req.user.username, content, timestamp: timeStr, avatarColor };
      res.json(newMsg);

      // имитируем авто-ответ бота на бэкенде, чтобы записать правильного отправителя!
      const normalizedContent = content.toLowerCase();
      if (normalizedContent.includes('привет') || normalizedContent.includes('hello') || normalizedContent.includes('femboy')) {
        setTimeout(() => {
          const isDm = channelId.startsWith('dm_');
          let botName = 'foxy_boi';
          if (isDm) {
            // вытаскиваем имя друга из ключа dm_{friend_id} или default
            botName = 'foxy_boi'; // по умолчанию
          }
          
          const botTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const botText = 'привееет! мяууу~~ как твои дела? *виляет хвостиком* :3';
          
          db.run(
            'INSERT INTO messages (channel_id, sender, content, timestamp, avatarColor) VALUES (?, ?, ?, ?, ?)',
            [channelId, botName, botText, botTime, '#3BA55D']
          );
        }, 1500);
      }
    }
  );
});

// --- ЭНДПОИНТЫ ДРУЗЕЙ ---

// список друзей~~
app.get('/api/friends', authenticateToken, (req, res) => {
  db.all('SELECT * FROM friends WHERE user_id = ?', [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// добавление друга~~
app.post('/api/friends/add', authenticateToken, (req, res) => {
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'введите ник!' });
  if (username.toLowerCase() === req.user.username.toLowerCase()) {
    return res.status(400).json({ error: 'нельзя добавить самого себя!' });
  }

  // проверяем, существует ли такой пользователь в системе~~
  db.get('SELECT * FROM users WHERE LOWER(username) = LOWER(?)', [username], (err, targetUser) => {
    if (err || !targetUser) return res.status(404).json({ error: 'пользователь не найден!' });

    // проверяем, нет ли уже в друзьях~~
    db.get('SELECT * FROM friends WHERE user_id = ? AND LOWER(friend_username) = LOWER(?)', [req.user.id, username], (err, friendRow) => {
      if (friendRow) return res.status(400).json({ error: 'вы уже отправляли запрос или дружите!' });

      db.run(
        'INSERT INTO friends (user_id, friend_username, relation) VALUES (?, ?, ?)',
        [req.user.id, targetUser.username, 'pending_outgoing'],
        function(err) {
          if (err) return res.status(500).json({ error: err.message });
          
          // добавляем входящий запрос второму участнику~~
          db.run(
            'INSERT INTO friends (user_id, friend_username, relation) VALUES (?, ?, ?)',
            [targetUser.id, req.user.username, 'pending_incoming'],
            () => {
              res.json({ success: true, message: 'запрос отправлен!' });
            }
          );
        }
      );
    });
  });
});

// принятие запроса~~
app.post('/api/friends/accept', authenticateToken, (req, res) => {
  const { friendUsername } = req.body;
  
  db.run(
    "UPDATE friends SET relation = 'friend', status = 'online' WHERE user_id = ? AND friend_username = ?",
    [req.user.id, friendUsername],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      // обновляем статус и второму человеку~~
      db.get('SELECT id FROM users WHERE username = ?', [friendUsername], (err, fUser) => {
        if (fUser) {
          db.run("UPDATE friends SET relation = 'friend', status = 'online' WHERE user_id = ? AND friend_username = ?", [fUser.id, req.user.username]);
        }
      });

      res.json({ success: true });
    }
  );
});

// удаление / отклонение запроса~~
app.post('/api/friends/remove', authenticateToken, (req, res) => {
  const { friendUsername } = req.body;
  
  db.run(
    'DELETE FROM friends WHERE user_id = ? AND friend_username = ?',
    [req.user.id, friendUsername],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      
      // также удаляем запись у второго человека~~
      db.get('SELECT id FROM users WHERE username = ?', [friendUsername], (err, fUser) => {
        if (fUser) {
          db.run('DELETE FROM friends WHERE user_id = ? AND friend_username = ?', [fUser.id, req.user.username]);
        }
      });

      res.json({ success: true });
    }
  );
});

// блокировка пользователя~~
app.post('/api/friends/block', authenticateToken, (req, res) => {
  const { friendUsername } = req.body;
  
  db.run(
    "UPDATE friends SET relation = 'blocked' WHERE user_id = ? AND friend_username = ?",
    [req.user.id, friendUsername],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    }
  );
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
