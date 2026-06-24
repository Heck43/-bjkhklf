import { create } from 'zustand';
import { io } from 'socket.io-client';

// привеееет, это наш стор на Zustand, подключенный к реальной БД sqlite3!
// теперь все данные сохраняются на сервере и доступны в сети на Railway.com~~ мяу! 🐾


// хелпер для авторизованных запросов к API бэкенда~~
const apiFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem('discord_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'ошибка запроса к API');
  }

  return response.json();
};

export const useStore = create((set, get) => ({
  // состояние авторизации~~
  token: localStorage.getItem('discord_token') || null,
  isAuthenticated: !!localStorage.getItem('discord_token'),
  userProfile: {
    username: '',
    customStatus: '',
    avatarColor: '#ff8da1',
    accentColor: '#ff2d55',
    id: null,
    avatarUrl: ''
  },

  selectedProfileUser: null,

  servers: [],
  serverMembers: [], // реальные участники текущего сервера~~ ня!
  friends: [],
  messages: {}, // { channelId: [messages] }
  
  // навигация~~
  activeServerId: null,
  activeChannelId: 'friends',
  activeDmUser: null,
  
  // голосовые звонки~~
  activeCall: null,
  
  // настройки~~
  settingsOpen: false,

  // сокет-соединение~~
  socket: null,

  // --- АВТОРИЗАЦИЯ (LOGIN / REGISTER) ---
  
  login: async (username, password) => {
    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      localStorage.setItem('discord_token', data.token);
      set({ 
        token: data.token, 
        isAuthenticated: true, 
        userProfile: data.user 
      });
      
      // сразу загружаем данные пользователя с бэкенда~~
      await get().fetchInitialData();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  register: async (username, password, avatarColor, accentColor) => {
    try {
      const data = await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, password, avatarColor, accentColor })
      });

      localStorage.setItem('discord_token', data.token);
      set({ 
        token: data.token, 
        isAuthenticated: true, 
        userProfile: data.user 
      });

      await get().fetchInitialData();
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  },

  logout: () => {
    localStorage.removeItem('discord_token');
    get().disconnectSocket();
    set({
      token: null,
      isAuthenticated: false,
      userProfile: { username: '', customStatus: '', avatarColor: '#ff8da1', accentColor: '#ff2d55', id: null, avatarUrl: '' },
      friends: [],
      messages: {},
      activeCall: null
    });
  },

  // --- ИНИЦИАЛИЗАЦИЯ И УПРАВЛЕНИЕ СОКЕТАМИ ---

  initSocket: () => {
    if (get().socket) return;

    const token = localStorage.getItem('discord_token');
    if (!token) return;

    // подключаемся по Socket.IO к нашему же серверу~~
    const socket = io({
      auth: { token }
    });

    socket.on('connect', () => {
      console.log('успешно подключились к socket.io! мяуу~~');
      // при переподключении заходим в активный канал, если он выбран~~
      const activeCh = get().activeChannelId;
      if (activeCh && activeCh !== 'friends') {
        socket.emit('join_channel', activeCh);
      }
    });

    socket.on('message', (data) => {
      const { channelId, message } = data;
      const currentUser = get().userProfile;

      set((state) => {
        const channelMessages = state.messages[channelId] || [];
        // предотвращаем дублирование сообщений (проверка по id)~~
        if (channelMessages.some(m => m.id === message.id)) return {};

        return {
          messages: {
            ...state.messages,
            [channelId]: [...channelMessages, {
              ...message,
              isOwn: message.sender === currentUser.username
            }]
          }
        };
      });

      // показываем уведомление в браузере при свернутой вкладке~~
      if (message.sender !== currentUser.username) {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' && document.hidden) {
          new Notification(`Новое сообщение от ${message.sender}! 💬`, {
            body: message.content,
            tag: 'msg_' + channelId
          });
        }
      }
    });

    socket.on('friend', (data) => {
      get().fetchFriends();
      if (data.type === 'request') {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          new Notification('Новый запрос дружбы! 🌸', {
            body: `${data.from} хочет добавить тебя в друзья~~ ня!`,
            tag: 'friend_request_' + data.from
          });
        }
      }
    });

    socket.on('voice_state_update', (data) => {
      const { channelId, participants } = data;
      const currentUser = get().userProfile;
      const activeCall = get().activeCall;

      if (activeCall && activeCall.channelId === channelId) {
        // маппим участников с флагом isLocal для текущего пользователя~~
        const mapped = participants.map(p => ({
          username: p.username,
          avatarColor: p.avatarColor,
          isLocal: p.username === currentUser.username
        }));
        
        set({
          activeCall: {
            ...activeCall,
            participants: mapped,
            audioLevels: mapped.map(p => ({ name: p.username, level: 10 }))
          }
        });
      }
    });

    socket.on('server', () => {
      get().fetchServers();
    });

    socket.on('channel', () => {
      get().fetchServers();
    });

    // слушаем изменения участников сервера от сокета~~
    socket.on('server_members', (data) => {
      const activeServerId = get().activeServerId;
      if (activeServerId && activeServerId === data.serverId) {
        get().fetchServerMembers(activeServerId);
      }
    });

    set({ socket });
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) {
      socket.disconnect();
      set({ socket: null });
    }
  },

  // --- ЗАГРУЗКА ДАННЫХ ИЗ БАЗЫ ---

  fetchInitialData: async () => {
    if (!get().isAuthenticated) return;
    try {
      // 1. запускаем и инициализируем сокеты~~
      get().initSocket();

      // 2. загружаем инфу о себе~~
      const profile = await apiFetch('/api/auth/me');
      set({ userProfile: profile });

      // 3. загружаем список серверов и друзей из базы~~
      await get().fetchServers();
      await get().fetchFriends();

      // 4. загружаем сообщения для активного канала, если он текстовый~~
      const activeCh = get().activeChannelId;
      if (activeCh && activeCh !== 'friends') {
        if (activeCh.startsWith('dm_') && get().activeDmUser) {
          const user = get().userProfile;
          const dmKey = 'dm_' + [user.username, get().activeDmUser.username].sort().join('_');
          await get().fetchMessages(dmKey);
        } else {
          await get().fetchMessages(activeCh);
        }
      }
    } catch (e) {
      console.error('ошибка загрузки начальных данных:', e);
      // если токен протух, вылогиниваемся~~
      get().logout();
    }
  },

  fetchServers: async () => {
    try {
      const data = await apiFetch('/api/servers');
      set({ servers: data });
    } catch (e) {
      console.error('ошибка загрузки серверов:', e);
    }
  },

  // загружаем список участников выбранного сервера~~
  fetchServerMembers: async (serverId) => {
    if (!serverId) return;
    try {
      const data = await apiFetch(`/api/servers/${serverId}/members`);
      set({ serverMembers: data });
    } catch (e) {
      console.error('ошибка загрузки участников сервера:', e);
    }
  },

  fetchFriends: async () => {
    try {
      const rawFriends = await apiFetch('/api/friends');
      // маппим под старый формат фронтенда~~
      const formatted = rawFriends.map(rf => ({
        id: rf.friend_username, // используем юзернейм как ID для простоты
        username: rf.friend_username,
        status: rf.status,
        customStatus: rf.customStatus,
        relation: rf.relation,
        avatarColor: rf.avatarColor || '#72767d',
        avatarUrl: rf.avatarUrl || ''
      }));
      set({ friends: formatted });
    } catch (e) {
      console.error('ошибка загрузки друзей:', e);
    }
  },

  fetchMessages: async (channelId) => {
    try {
      const rows = await apiFetch(`/api/messages/${channelId}`);
      set((state) => ({
        messages: {
          ...state.messages,
          [channelId]: rows.map(r => ({
            id: r.id,
            sender: r.sender,
            displayName: r.displayName || r.sender,
            content: r.content,
            timestamp: r.timestamp,
            avatarColor: r.avatarColor,
            avatarUrl: r.avatarUrl || '',
            isOwn: r.sender === state.userProfile.username
          }))
        }
      }));
    } catch (e) {
      console.error('ошибка загрузки сообщений:', e);
    }
  },

  setNavigation: (serverId, channelId, dmUser = null) => {
    set({ activeServerId: serverId, activeChannelId: channelId, activeDmUser: dmUser });
    
    // загружаем участников сервера, если мы перешли на сервер, ня~~
    if (serverId) {
      get().fetchServerMembers(serverId);
    } else {
      set({ serverMembers: [] });
    }

    // оповещаем сокеты о переходе в новую комнату чата~~
    const socket = get().socket;
    if (socket && channelId) {
      if (channelId.startsWith('dm_') && dmUser) {
        const user = get().userProfile;
        const dmKey = 'dm_' + [user.username, dmUser.username].sort().join('_');
        socket.emit('join_channel', dmKey);
      } else {
        socket.emit('join_channel', channelId);
      }
    }

    // при переходе в канал загружаем его историю сообщений из бд~~
    if (channelId && channelId !== 'friends') {
      if (channelId.startsWith('dm_') && dmUser) {
        const user = get().userProfile;
        const dmKey = 'dm_' + [user.username, dmUser.username].sort().join('_');
        get().fetchMessages(dmKey);
      } else {
        get().fetchMessages(channelId);
      }
    }
  },

  setSettingsOpen: (isOpen) => set({ settingsOpen: isOpen }),

  // --- РАБОТА С ПРОФИЛЕМ ---

  updateUserProfile: async (newData) => {
    try {
      const res = await apiFetch('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(newData)
      });
      if (res.success) {
        set({ userProfile: res.user });
      }
    } catch (e) {
      console.error('ошибка обновления профиля:', e);
    }
  },

  setSelectedProfileUser: (user) => set({ selectedProfileUser: user }),

  viewUserProfile: async (username) => {
    try {
      const profile = await apiFetch(`/api/users/${username}`);
      const friendData = get().friends.find(f => f.username.toLowerCase() === username.toLowerCase());
      set({ 
        selectedProfileUser: {
          ...profile,
          relation: friendData ? friendData.relation : null,
          status: friendData ? friendData.status : 'offline'
        } 
      });
    } catch (e) {
      console.error('ошибка получения профиля:', e);
    }
  },

  // --- ОТПРАВКА СООБЩЕНИЙ В БД ---
  
  sendMessage: async (channelId, content, isDm = false) => {
    const user = get().userProfile;
    try {
      // 1. отправляем наше сообщение в базу на сервере~~
      const newMsg = await apiFetch('/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          channelId,
          content,
          avatarColor: user.avatarColor
        })
      });

      // обновляем стейт сообщений, исключая дубликаты с сокетом~~
      set((state) => {
        const channelMessages = state.messages[channelId] || [];
        if (channelMessages.some(m => m.id === newMsg.id)) return {};

        return {
          messages: {
            ...state.messages,
            [channelId]: [...channelMessages, { ...newMsg, isOwn: true }]
          }
        };
      });
    } catch (e) {
      console.error('ошибка отправки сообщения:', e);
    }
  },

  // --- СОЗДАНИЕ СЕРВЕРОВ И КАНАЛОВ В БД ---

  createServer: async (name, icon) => {
    try {
      const newServer = await apiFetch('/api/servers', {
        method: 'POST',
        body: JSON.stringify({ name, icon })
      });
      // обновляем список серверов~~
      await get().fetchServers();
      return { success: true, server: newServer };
    } catch (e) {
      console.error('ошибка создания сервера:', e);
      return { success: false, message: e.message };
    }
  },

  joinServer: async (serverId) => {
    try {
      const res = await apiFetch('/api/servers/join', {
        method: 'POST',
        body: JSON.stringify({ serverId })
      });
      await get().fetchServers();
      return { success: true, message: res.message };
    } catch (e) {
      console.error('ошибка входа на сервер:', e);
      return { success: false, message: e.message };
    }
  },

  inviteFriendToServer: async (serverId, friendUsername) => {
    try {
      const res = await apiFetch(`/api/servers/${serverId}/invite`, {
        method: 'POST',
        body: JSON.stringify({ friendUsername })
      });
      return { success: true, message: res.message };
    } catch (e) {
      console.error('ошибка приглашения друга:', e);
      return { success: false, message: e.message };
    }
  },

  createChannel: async (serverId, name, type) => {
    try {
      const newChannel = await apiFetch('/api/channels', {
        method: 'POST',
        body: JSON.stringify({ serverId, name, type })
      });
      // обновляем список серверов с каналами~~
      await get().fetchServers();
      return { success: true, channel: newChannel };
    } catch (e) {
      console.error('ошибка создания канала:', e);
      return { success: false, message: e.message };
    }
  },

  // --- УПРАВЛЕНИЕ ДРУЗЬЯМИ ЧЕРЕЗ БД ---

  addFriend: async (username) => {
    if (!username) return { success: false, message: 'введи имя пользователя!' };
    try {
      const res = await apiFetch('/api/friends/add', {
        method: 'POST',
        body: JSON.stringify({ username })
      });
      await get().fetchFriends();
      return { success: true, message: res.message };
    } catch (e) {
      return { success: false, message: e.message };
    }
  },

  acceptFriend: async (friendUsername) => {
    try {
      await apiFetch('/api/friends/accept', {
        method: 'POST',
        body: JSON.stringify({ friendUsername })
      });
      await get().fetchFriends();
    } catch (e) {
      console.error(e);
    }
  },

  removeFriend: async (friendUsername) => {
    try {
      await apiFetch('/api/friends/remove', {
        method: 'POST',
        body: JSON.stringify({ friendUsername })
      });
      await get().fetchFriends();
    } catch (e) {
      console.error(e);
    }
  },

  blockFriend: async (friendUsername) => {
    try {
      await apiFetch('/api/friends/block', {
        method: 'POST',
        body: JSON.stringify({ friendUsername })
      });
      await get().fetchFriends();
    } catch (e) {
      console.error(e);
    }
  },

  // --- ГОЛОСОВЫЕ ЗВОНКИ ЧЕРЕЗ СОКЕТЫ ---

  startCall: (channelId, name) => {
    const socket = get().socket;
    if (socket) {
      socket.emit('join_voice', channelId);
    }

    const user = get().userProfile;
    const callData = {
      channelId,
      channelName: name,
      participants: [
        { username: user.username, avatarColor: user.avatarColor || '#ff8da1', avatarUrl: user.avatarUrl || '', isLocal: true }
      ],
      isMuted: false,
      isDeafened: false,
      isCameraOn: false,
      isScreenSharing: false,
      networkLatency: Array.from({ length: 10 }, (_, i) => ({ time: i, ms: Math.floor(Math.random() * 30) + 15 })),
      audioLevels: [{ name: user.username, level: 10 }]
    };

    set({ activeCall: callData, activeChannelId: channelId });
  },

  endCall: () => {
    const socket = get().socket;
    if (socket) {
      socket.emit('leave_voice');
    }
    set({ activeCall: null });
  },

  toggleMute: () => {
    set((state) => {
      if (!state.activeCall) return {};
      const newMuted = !state.activeCall.isMuted;
      return {
        activeCall: {
          ...state.activeCall,
          isMuted: newMuted,
          isDeafened: newMuted ? state.activeCall.isDeafened : state.activeCall.isDeafened
        }
      };
    });
  },

  toggleDeafen: () => {
    set((state) => {
      if (!state.activeCall) return {};
      const newDeafened = !state.activeCall.isDeafened;
      return {
        activeCall: {
          ...state.activeCall,
          isDeafened: newDeafened,
          isMuted: newDeafened ? true : state.activeCall.isMuted
        }
      };
    });
  },

  toggleCamera: () => {
    set((state) => {
      if (!state.activeCall) return {};
      return {
        activeCall: {
          ...state.activeCall,
          isCameraOn: !state.activeCall.isCameraOn
        }
      };
    });
  },

  toggleScreenShare: () => {
    set((state) => {
      if (!state.activeCall) return {};
      return {
        activeCall: {
          ...state.activeCall,
          isScreenSharing: !state.activeCall.isScreenSharing
        }
      };
    });
  },

  updateCallStats: () => {
    set((state) => {
      if (!state.activeCall) return {};
      const latencies = [...state.activeCall.networkLatency];
      latencies.shift();
      latencies.push({
        time: Date.now() % 100000,
        ms: Math.floor(Math.random() * 25) + (state.activeCall.isScreenSharing ? 35 : 15)
      });

      const updatedAudio = state.activeCall.participants.map(p => {
        if (p.isLocal && state.activeCall.isMuted) return { name: p.username, level: 0 };
        return {
          name: p.username,
          level: Math.random() > 0.4 ? Math.floor(Math.random() * 100) : 10
        };
      });

      return {
        activeCall: {
          ...state.activeCall,
          networkLatency: latencies,
          audioLevels: updatedAudio
        }
      };
    });
  }
}));
