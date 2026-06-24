import { create } from 'zustand';

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
    id: null
  },

  servers: [],
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
    set({
      token: null,
      isAuthenticated: false,
      userProfile: { username: '', customStatus: '', avatarColor: '#ff8da1', accentColor: '#ff2d55', id: null },
      friends: [],
      messages: {},
      activeCall: null
    });
  },

  // --- ЗАГРУЗКА ДАННЫХ ИЗ БАЗЫ ---

  fetchInitialData: async () => {
    if (!get().isAuthenticated) return;
    try {
      // 1. загружаем инфу о себе~~
      const profile = await apiFetch('/api/auth/me');
      set({ userProfile: profile });

      // 2. загружаем список серверов и друзей из базы~~
      await get().fetchServers();
      await get().fetchFriends();

      // 3. загружаем сообщения для активного канала, если он текстовый~~
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

  fetchFriends: async () => {
    try {
      const rawFriends = await apiFetch('/api/friends');
      // маппим под старый формат фронтенда~~
      const formatted = rawFriends.map(rf => ({
        id: rf.friend_username, // используем юзернейм как ID для простоты
        username: rf.friend_username,
        status: rf.status,
        customStatus: rf.customStatus,
        relation: rf.relation
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
            content: r.content,
            timestamp: r.timestamp,
            avatarColor: r.avatarColor,
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

      // обновляем стейт сообщений~~
      set((state) => {
        const channelMessages = state.messages[channelId] || [];
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

  // --- ГОЛОСОВЫЕ ЗВОНКИ ---

  startCall: (channelId, name) => {
    const friendsInCall = get().friends.filter(f => f.status === 'online').slice(0, 3);
    
    const callData = {
      channelId,
      channelName: name,
      participants: [
        { username: get().userProfile.username, avatarColor: get().userProfile.avatarColor, isLocal: true },
        ...friendsInCall.map(f => ({ username: f.username, avatarColor: '#3BA55D' }))
      ],
      isMuted: false,
      isDeafened: false,
      isCameraOn: false,
      isScreenSharing: false,
      networkLatency: Array.from({ length: 10 }, (_, i) => ({ time: i, ms: Math.floor(Math.random() * 30) + 15 })),
      audioLevels: friendsInCall.map(f => ({ name: f.username, level: 10 }))
    };

    set({ activeCall: callData, activeChannelId: channelId });
  },

  endCall: () => {
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
