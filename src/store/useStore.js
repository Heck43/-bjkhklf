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
    avatarUrl: '',
    bannerUrl: ''
  },

  selectedProfileUser: null,

  servers: [],
  serverMembers: [], // реальные участники текущего сервера~~ ня!
  friends: [],
  messages: {}, // { channelId: [messages] }
  unreadCounts: {}, // { [channelId]: count } непрочитанные сообщения, ня!
  
  // навигация~~
  activeServerId: null,
  activeChannelId: 'friends',
  activeDmUser: null,
  
  // голосовые звонки~~
  activeCall: null,
  localStream: null,
  remoteStream: null,
  
  // админ-панель~~
  adminUsers: [],
  adminStats: null,
  voiceStates: {}, // { channelId: [participants] }
  
  // настройки~~
  settingsOpen: false,
  isMuted: false, // глобальный мут микрофона~~
  isDeafened: false, // глобальный мут звука~~

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
      userProfile: { username: '', customStatus: '', avatarColor: '#ff8da1', accentColor: '#ff2d55', id: null, avatarUrl: '', bannerUrl: '' },
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
      const activeCh = get().activeChannelId;
      const dmUser = get().activeDmUser;

      // определяем текущий активный ключ чата для сравнения с пришедшим сообщением~~
      let currentActiveChatKey = activeCh;
      if (activeCh && activeCh.startsWith('dm_') && dmUser) {
        currentActiveChatKey = 'dm_' + [currentUser.username, dmUser.username].sort().join('_');
      }

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

      // увеличиваем счетчик непрочитанных, если сообщение не от нас и мы в другом чате~~
      if (message.sender !== currentUser.username && channelId !== currentActiveChatKey) {
        set((state) => {
          const currentCount = state.unreadCounts[channelId] || 0;
          return {
            unreadCounts: {
              ...state.unreadCounts,
              [channelId]: currentCount + 1
            }
          };
        });
      }

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

    // слушаем обновление реакций~~ мяу!
    socket.on('reaction_update', (data) => {
      const { channelId, messageId, reactions } = data;
      set((state) => {
        const channelMessages = state.messages[channelId] || [];
        const updated = channelMessages.map(m => {
          if (m.id === messageId) {
            return { ...m, reactions };
          }
          return m;
        });
        return {
          messages: {
            ...state.messages,
            [channelId]: updated
          }
        };
      });
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

    socket.on('voice_states_sync', (states) => {
      const currentUser = get().userProfile;
      const synced = {};
      for (const channelId in states) {
        synced[channelId] = states[channelId].map(p => ({
          username: p.username,
          socketId: p.socketId,
          avatarColor: p.avatarColor,
          avatarUrl: p.avatarUrl || '',
          isLocal: p.username === currentUser.username,
          isMuted: p.isMuted || false,
          isDeafened: p.isDeafened || false,
          isCameraOn: p.isCameraOn || false,
          isScreenSharing: p.isScreenSharing || false
        }));
      }
      set({ voiceStates: synced });
    });

    socket.on('voice_state_update', (data) => {
      const { channelId, participants } = data;
      const currentUser = get().userProfile;

      const mapped = participants.map(p => ({
        username: p.username,
        socketId: p.socketId,
        avatarColor: p.avatarColor,
        avatarUrl: p.avatarUrl || '',
        isLocal: p.username === currentUser.username,
        isMuted: p.isMuted || false,
        isDeafened: p.isDeafened || false,
        isCameraOn: p.isCameraOn || false,
        isScreenSharing: p.isScreenSharing || false
      }));

      // сохраняем список участников канала в глобальную мапу для сайдбара~~ 🐾
      set(state => ({
        voiceStates: {
          ...state.voiceStates,
          [channelId]: mapped
        }
      }));

      const activeCall = get().activeCall;
      if (activeCall && activeCall.channelId === channelId) {
        const screenSharer = mapped.find(p => p.isScreenSharing);
        
        set({
          activeCall: {
            ...activeCall,
            participants: mapped,
            isScreenSharing: !!screenSharer,
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
    
    // сбрасываем непрочитанные сообщения для открываемого канала~~
    if (channelId) {
      let activeKey = channelId;
      if (channelId.startsWith('dm_') && dmUser) {
        const user = get().userProfile;
        activeKey = 'dm_' + [user.username, dmUser.username].sort().join('_');
      }
      set((state) => ({
        unreadCounts: {
          ...state.unreadCounts,
          [activeKey]: 0
        }
      }));
    }

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
  
  sendMessage: async (channelId, content, isDm = false, replyToId = null) => {
    const user = get().userProfile;
    try {
      // 1. отправляем наше сообщение в базу на сервере~~
      const newMsg = await apiFetch('/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          channelId,
          content,
          avatarColor: user.avatarColor,
          replyToId // передаем ID сообщения, на которое отвечаем~~
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

  // добавляем реакцию на сообщение~~ мяу!
  addReaction: async (channelId, messageId, emoji) => {
    try {
      const res = await apiFetch(`/api/messages/${messageId}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ emoji })
      });
      // оптимистично обновляем стейт для мгновенного отклика UI~~
      set((state) => {
        const channelMessages = state.messages[channelId] || [];
        const updated = channelMessages.map(m => {
          if (m.id === messageId) {
            return { ...m, reactions: res.reactions };
          }
          return m;
        });
        return {
          messages: {
            ...state.messages,
            [channelId]: updated
          }
        };
      });
    } catch (e) {
      console.error('ошибка при добавлении реакции:', e);
    }
  },

  // убираем реакцию с сообщения~~
  removeReaction: async (channelId, messageId, emoji) => {
    try {
      const res = await apiFetch(`/api/messages/${messageId}/reactions`, {
        method: 'DELETE',
        body: JSON.stringify({ emoji })
      });
      set((state) => {
        const channelMessages = state.messages[channelId] || [];
        const updated = channelMessages.map(m => {
          if (m.id === messageId) {
            return { ...m, reactions: res.reactions };
          }
          return m;
        });
        return {
          messages: {
            ...state.messages,
            [channelId]: updated
          }
        };
      });
    } catch (e) {
      console.error('ошибка при удалении реакции:', e);
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

  updateServer: async (serverId, name, icon) => {
    try {
      const res = await apiFetch(`/api/servers/${serverId}`, {
        method: 'PUT',
        body: JSON.stringify({ name, icon })
      });
      // оййй обновили сервачок~~ мяу! обновляем список серверов в сторе~~
      await get().fetchServers();
      return { success: true, message: res.message };
    } catch (e) {
      console.error('ошибка обновления сервера:', e);
      return { success: false, message: e.message };
    }
  },

  updateServerMemberRole: async (serverId, userId, role) => {
    try {
      const res = await apiFetch(`/api/servers/${serverId}/members/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role })
      });
      // ууу поменяли роль лапке~~ теперь обновляем список участников сервера~~
      await get().fetchServerMembers(serverId);
      return { success: true, message: res.message };
    } catch (e) {
      console.error('ошибка обновления роли участника:', e);
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
    const isMuted = get().isMuted;
    const isDeafened = get().isDeafened;

    if (socket) {
      socket.emit('join_voice', channelId, {
        isMuted,
        isDeafened,
        isCameraOn: false,
        isScreenSharing: false
      });
    }

    const user = get().userProfile;
    const callData = {
      channelId,
      channelName: name,
      participants: [
        { username: user.username, avatarColor: user.avatarColor || '#ff8da1', avatarUrl: user.avatarUrl || '', isLocal: true, isMuted, isDeafened, isCameraOn: false, isScreenSharing: false }
      ],
      isMuted,
      isDeafened,
      isCameraOn: false,
      isScreenSharing: false,
      networkLatency: Array.from({ length: 10 }, (_, i) => ({ time: i, ms: Math.floor(Math.random() * 30) + 15 })),
      audioLevels: [{ name: user.username, level: 10 }]
    };

    set({ activeCall: callData, activeChannelId: channelId });
  },

  setLocalStream: (stream) => set({ localStream: stream }),
  setRemoteStream: (stream) => set({ remoteStream: stream }),

  startScreenShare: async () => {
    try {
      // запрашиваем захват экранчика у браузера~~ 🖥️
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: {
          cursor: "always"
        },
        audio: false
      });
      get().setLocalStream(stream);
      get().toggleScreenShare();

      // если котик остановил стрим через панельку хрома/браузера~~
      stream.getVideoTracks()[0].onended = () => {
        get().stopScreenShare();
      };
    } catch (err) {
      console.error("ошибка захвата экрана в сторе:", err);
    }
  },

  stopScreenShare: () => {
    const { localStream, activeCall } = get();
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      get().setLocalStream(null);
    }
    const localPart = activeCall?.participants?.find(p => p.isLocal);
    if (localPart && localPart.isScreenSharing) {
      get().toggleScreenShare();
    }
  },

  endCall: () => {
    const socket = get().socket;
    if (socket) {
      socket.emit('leave_voice');
    }
    // гасим наши стримы при выходе из звоночка, мяу~~ 🐾
    const { localStream } = get();
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    set({ activeCall: null, localStream: null, remoteStream: null });
  },

  toggleMute: () => {
    set((state) => {
      const newMuted = !state.isMuted;
      const activeCall = state.activeCall ? {
        ...state.activeCall,
        isMuted: newMuted
      } : null;

      if (state.socket && state.activeCall) {
        // оййй~~ получаем локального котика, чтобы не портить чужие статусы трансляции! 🐾
        const localPart = state.activeCall.participants?.find(p => p.isLocal);
        state.socket.emit('update_voice_state', {
          isMuted: newMuted,
          isDeafened: state.isDeafened,
          isCameraOn: localPart ? localPart.isCameraOn : false,
          isScreenSharing: localPart ? localPart.isScreenSharing : false
        });
      }

      return {
        isMuted: newMuted,
        activeCall
      };
    });
  },

  toggleDeafen: () => {
    set((state) => {
      const newDeafened = !state.isDeafened;
      const newMuted = newDeafened ? true : state.isMuted;
      const activeCall = state.activeCall ? {
        ...state.activeCall,
        isDeafened: newDeafened,
        isMuted: newMuted
      } : null;

      if (state.socket && state.activeCall) {
        const localPart = state.activeCall.participants?.find(p => p.isLocal);
        state.socket.emit('update_voice_state', {
          isMuted: newMuted,
          isDeafened: newDeafened,
          isCameraOn: localPart ? localPart.isCameraOn : false,
          isScreenSharing: localPart ? localPart.isScreenSharing : false
        });
      }

      return {
        isDeafened: newDeafened,
        isMuted: newMuted,
        activeCall
      };
    });
  },

  toggleCamera: () => {
    set((state) => {
      if (!state.activeCall) return {};
      const localPart = state.activeCall.participants?.find(p => p.isLocal);
      const newCameraOn = localPart ? !localPart.isCameraOn : true;

      if (state.socket) {
        state.socket.emit('update_voice_state', {
          isMuted: state.isMuted,
          isDeafened: state.isDeafened,
          isCameraOn: newCameraOn,
          isScreenSharing: localPart ? localPart.isScreenSharing : false
        });
      }

      const updatedParticipants = state.activeCall.participants?.map(p => 
        p.isLocal ? { ...p, isCameraOn: newCameraOn } : p
      );

      return {
        activeCall: {
          ...state.activeCall,
          participants: updatedParticipants
        }
      };
    });
  },

  toggleScreenShare: () => {
    set((state) => {
      if (!state.activeCall) return {};
      const localPart = state.activeCall.participants?.find(p => p.isLocal);
      const newScreenSharing = localPart ? !localPart.isScreenSharing : true;

      if (state.socket) {
        state.socket.emit('update_voice_state', {
          isMuted: state.isMuted,
          isDeafened: state.isDeafened,
          isCameraOn: localPart ? localPart.isCameraOn : false,
          isScreenSharing: newScreenSharing
        });
      }

      const updatedParticipants = state.activeCall.participants?.map(p => 
        p.isLocal ? { ...p, isScreenSharing: newScreenSharing } : p
      );

      return {
        activeCall: {
          ...state.activeCall,
          participants: updatedParticipants
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
  },

  // методы управления админ-панелью, ня~~
  fetchAdminUsers: async () => {
    try {
      const users = await apiFetch('/api/admin/users');
      set({ adminUsers: users });
    } catch (e) {
      console.error('ошибка загрузки пользователей админки:', e);
    }
  },

  fetchAdminStats: async () => {
    try {
      const stats = await apiFetch('/api/admin/stats');
      set({ adminStats: stats });
    } catch (e) {
      console.error('ошибка загрузки статистики админки:', e);
    }
  },

  adminDeleteUser: async (userId) => {
    try {
      await apiFetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      set(state => ({
        adminUsers: state.adminUsers.filter(u => u.id !== userId)
      }));
      await get().fetchAdminStats();
    } catch (e) {
      alert(e.message);
    }
  }
}));
