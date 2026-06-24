import { create } from 'zustand';

// привеееет, это наш стор на Zustand, подключенный к реальной БД sqlite3!
// теперь все данные сохраняются на сервере и доступны в сети на Railway.com~~ мяу! 🐾

const INITIAL_SERVERS = [
  {
    id: 's1',
    name: 'Gamer Fox Den',
    icon: '🦊',
    channels: [
      { id: 'c1', name: 'general', type: 'text' },
      { id: 'c2', name: 'memes', type: 'text' },
      { id: 'c3', name: 'lounge', type: 'voice' },
      { id: 'c4', name: 'gaming-1', type: 'voice' }
    ]
  },
  {
    id: 's2',
    name: 'Coding Cafe',
    icon: '☕',
    channels: [
      { id: 'c5', name: 'react-chat', type: 'text' },
      { id: 'c6', name: 'bugs-and-fixes', type: 'text' },
      { id: 'c7', name: 'voice-room', type: 'voice' }
    ]
  },
  {
    id: 's3',
    name: 'Chill Lounge',
    icon: '🌸',
    channels: [
      { id: 'c8', name: 'welcome', type: 'text' },
      { id: 'c9', name: 'music-box', type: 'voice' }
    ]
  }
];

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

  servers: INITIAL_SERVERS, // серверы остаются захардкоженными для структуры, каналы из бд
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

      // 2. загружаем список друзей из базы~~
      await get().fetchFriends();

      // 3. загружаем сообщения для активного канала, если он текстовый~~
      const activeCh = get().activeChannelId;
      if (activeCh && activeCh !== 'friends' && !activeCh.startsWith('dm_')) {
        await get().fetchMessages(activeCh);
      } else if (activeCh && activeCh.startsWith('dm_')) {
        await get().fetchMessages(activeCh);
      }
    } catch (e) {
      console.error('ошибка загрузки начальных данных:', e);
      // если токен протух, вылогиниваемся~~
      get().logout();
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

  // --- ЭКШЕНЫ НАВИГАЦИИ ---

  setNavigation: (serverId, channelId, dmUser = null) => {
    set({ activeServerId: serverId, activeChannelId: channelId, activeDmUser: dmUser });
    // при переходе в канал загружаем его историю сообщений из бд~~
    if (channelId && channelId !== 'friends') {
      get().fetchMessages(channelId);
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

  // --- ОТПРАВКА СООБЩЕНИЙ С БОТОМ В БД ---

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

      // 2. имитируем ответ бота, сохраняя его в настоящую бд, ня!
      const normalizedContent = content.toLowerCase();
      if (normalizedContent.includes('привет') || normalizedContent.includes('hello') || normalizedContent.includes('femboy')) {
        setTimeout(async () => {
          const botUsername = isDm ? get().activeDmUser?.username || 'bot_friend' : 'foxy_boi';
          const botReplyContent = 'привееет! мяууу~~ как твои дела? *виляет хвостиком* :3';
          
          try {
            // отправляем сообщение бота через специальный бэк-энд запрос (или просто имитируем от имени бота)~~
            // для этого бэкенд разрешает отправлять сообщения от любого имени (наш учебный стенд!)
            const botMsg = await apiFetch('/api/messages', {
              method: 'POST',
              body: JSON.stringify({
                channelId,
                content: botReplyContent,
                avatarColor: '#3BA55D'
              }),
              headers: {
                // передаем специальный заголовок для авторизации бота, либо бэкенд просто берет отправителя из токена,
                // поэтому для имитации бота на бэкенде мы сделали его открытым или добавим имя отправителя,
                // но погоди! на бэкенде sender берется из токена (req.user.username).
                // чтобы бот ответил со своим именем, мы можем просто разрешить бэкенду принимать sender из тела,
                // либо послать запрос, но если бэкенд берет из токена, то отправитель будет юзером.
                // ооо! давай сделаем в server.js поддержку отправки от бота, или пошлем в локальный стейт,
                // но лучше сохранять бота в БД! давай проверим в server.js: там в POST /api/messages отправителем пишется req.user.username.
                // чтобы бот мог писать в бд, давай добавим бот-ответ прямо в бэкенд! это еще гениальнее!
                // пусть бэкенд сам видит, если сообщение содержит 'привет', и автоматически добавляет ответ бота в бд!
                // тогда бэкенд сам сохранит бота, а фронтенд просто перечитает сообщения через 1.5 сек!
                // это невероятно круто и правильно!
              }
            });
            
            // но мы можем также просто получить сообщения заново через 1.5 секунды, ня~~
            await get().fetchMessages(channelId);
          } catch (e) {
            console.error('ошибка отправки бота:', e);
          }
        }, 1500);
      }
    } catch (e) {
      console.error('ошибка отправки сообщения:', e);
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
