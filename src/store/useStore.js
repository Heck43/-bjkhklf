import { create } from 'zustand';

// привеееет, это наш милый стор на Zustand~~
// тут хранится вся магия нашего приложения, мяууу! 🐾

const INITIAL_FRIENDS = [
  { id: 'f1', username: 'foxy_boi', status: 'online', customStatus: 'playing with yarn 🧶', relation: 'friend' },
  { id: 'f2', username: 'meow_master', status: 'online', customStatus: 'coding react apps... meow~', relation: 'friend' },
  { id: 'f3', username: 'code_fox', status: 'dnd', customStatus: 'do not disturb, compilation running! 💻', relation: 'friend' },
  { id: 'f4', username: 'fluffy_tail', status: 'offline', customStatus: 'sleeping in the woods 😴', relation: 'friend' },
  { id: 'f5', username: 'nyan_cat', status: 'idle', customStatus: 'flying in space 🌈', relation: 'friend' },
  { id: 'f6', username: 'doggo_friend', status: 'online', customStatus: 'who is a good boy? 🐶', relation: 'friend' },
  { id: 'f7', username: 'bunny_hop', status: 'offline', customStatus: 'eating carrots 🥕', relation: 'friend' },
  { id: 'f8', username: 'scammer_lol', status: 'offline', customStatus: 'free nitro click link!', relation: 'blocked' },
  { id: 'f9', username: 'new_furry', status: 'online', customStatus: 'looking for friends :3', relation: 'pending_incoming' },
  { id: 'f10', username: 'javascript_lover', status: 'idle', customStatus: 'promises, promises...', relation: 'pending_outgoing' }
];

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

const INITIAL_MESSAGES = {
  'c1': [
    { id: 'm1', sender: 'meow_master', content: 'hello everyone! welcome to gamer fox den! ^w^', timestamp: '10:15', avatarColor: '#5865F2' },
    { id: 'm2', sender: 'foxy_boi', content: 'hey there! ready to play some games today? 🐾', timestamp: '10:16', avatarColor: '#3BA55D' },
    { id: 'm3', sender: 'nyan_cat', content: 'nyan nyan nyan~ is there music?', timestamp: '10:20', avatarColor: '#FAA81A' }
  ],
  'c2': [
    { id: 'm4', sender: 'foxy_boi', content: 'why did the programmer jump out of the window? because they wanted to inspect elements! 😂', timestamp: '09:00', avatarColor: '#3BA55D' },
    { id: 'm5', sender: 'code_fox', content: 'classic, but also very painful... ;w;', timestamp: '09:12', avatarColor: '#ED4245' }
  ],
  'c5': [
    { id: 'm6', sender: 'code_fox', content: 'hey, did you see react 19 hooks? pretty cool features!', timestamp: 'Yesterday at 18:30', avatarColor: '#ED4245' },
    { id: 'm7', sender: 'meow_master', content: 'yes! the useActionState hook is so clean and simple to use.', timestamp: 'Yesterday at 19:02', avatarColor: '#5865F2' }
  ]
};

// инициализируем локальное хранилище или берем дефолты~~
const loadFromStorage = (key, defaultValue) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch (e) {
    console.error('ошибка загрузки из localStorage', e);
    return defaultValue;
  }
};

const saveToStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('ошибка сохранения в localStorage', e);
  }
};

export const useStore = create((set, get) => ({
  // профиль нашего пользователя~~ мрррр~~
  userProfile: loadFromStorage('discord_profile', {
    username: 'pink_femboy_fox',
    customStatus: 'coding cute things for daddy... ♡',
    avatarColor: '#ff8da1',
    accentColor: '#ff2d55',
    tag: '5555'
  }),

  servers: loadFromStorage('discord_servers', INITIAL_SERVERS),
  friends: loadFromStorage('discord_friends', INITIAL_FRIENDS),
  messages: loadFromStorage('discord_messages', INITIAL_MESSAGES),
  
  // навигационное состояние~~
  activeServerId: null, // null означает главную страницу (друзья/лс)
  activeChannelId: 'friends', // 'friends' или id текстового/голосового канала
  activeDmUser: null, // объект друга, если общаемся в ЛС
  
  // состояние звонка~~ звонить так весело! 🔊
  activeCall: null, // { channelId, channelName, participants: [], isMuted: false, isDeafened: false, isCameraOn: false, isScreenSharing: false, networkLatency: [], audioLevels: [] }
  callTimer: null,
  
  // открытые настройки~~
  settingsOpen: false,

  // экшены для изменения состояния~~
  setNavigation: (serverId, channelId, dmUser = null) => {
    set({ activeServerId: serverId, activeChannelId: channelId, activeDmUser: dmUser });
  },

  updateUserProfile: (newData) => {
    set((state) => {
      const updated = { ...state.userProfile, ...newData };
      saveToStorage('discord_profile', updated);
      return { userProfile: updated };
    });
  },

  setSettingsOpen: (isOpen) => set({ settingsOpen: isOpen }),

  // отправка нового сообщения в чатик~~ ууууу~~
  sendMessage: (channelOrDmId, content, isDm = false) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const user = get().userProfile;
    
    set((state) => {
      const chatKey = isDm ? `dm_${channelOrDmId}` : channelOrDmId;
      const channelMessages = state.messages[chatKey] || [];
      const newMessage = {
        id: `m_${Date.now()}`,
        sender: user.username,
        content,
        timestamp: timeStr,
        avatarColor: user.avatarColor,
        isOwn: true
      };
      
      const updatedMessages = {
        ...state.messages,
        [chatKey]: [...channelMessages, newMessage]
      };
      
      saveToStorage('discord_messages', updatedMessages);
      return { messages: updatedMessages };
    });

    // имитация ответа бота в чат с небольшой задержкой, ня!
    if (content.toLowerCase().includes('привет') || content.toLowerCase().includes('hello') || content.toLowerCase().includes('femboy')) {
      setTimeout(() => {
        const botReply = {
          id: `m_bot_${Date.now()}`,
          sender: isDm ? get().activeDmUser?.username || 'bot_friend' : 'foxy_boi',
          content: 'привееет! мяууу~~ как твои дела? *виляет хвостиком* :3',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          avatarColor: '#3BA55D'
        };
        
        set((state) => {
          const chatKey = isDm ? `dm_${channelOrDmId}` : channelOrDmId;
          const currentMsgs = state.messages[chatKey] || [];
          const updated = {
            ...state.messages,
            [chatKey]: [...currentMsgs, botReply]
          };
          saveToStorage('discord_messages', updated);
          return { messages: updated };
        });
      }, 1500);
    }
  },

  // управление друзьями~~
  addFriend: (username) => {
    if (!username) return { success: false, message: 'введи имя пользователя!' };
    
    const currentFriends = get().friends;
    const exists = currentFriends.some(f => f.username.toLowerCase() === username.toLowerCase());
    
    if (exists) {
      return { success: false, message: 'этот пользователь уже в списке!' };
    }

    const newFriend = {
      id: `f_${Date.now()}`,
      username,
      status: 'offline',
      customStatus: 'just joined discord-clone! 🎉',
      relation: 'pending_outgoing'
    };

    set((state) => {
      const updated = [...state.friends, newFriend];
      saveToStorage('discord_friends', updated);
      return { friends: updated };
    });

    // авто-подтверждение запроса через 5 секунд для демонстрации, ня~~
    setTimeout(() => {
      set((state) => {
        const updated = state.friends.map(f => {
          if (f.username === username) {
            return { ...f, relation: 'friend', status: 'online' };
          }
          return f;
        });
        saveToStorage('discord_friends', updated);
        return { friends: updated };
      });
    }, 5000);

    return { success: true, message: 'запрос успешно отправлен! ^w^' };
  },

  acceptFriend: (friendId) => {
    set((state) => {
      const updated = state.friends.map(f => {
        if (f.id === friendId) return { ...f, relation: 'friend' };
        return f;
      });
      saveToStorage('discord_friends', updated);
      return { friends: updated };
    });
  },

  removeFriend: (friendId) => {
    set((state) => {
      const updated = state.friends.filter(f => f.id !== friendId);
      saveToStorage('discord_friends', updated);
      return { friends: updated };
    });
  },

  blockFriend: (friendId) => {
    set((state) => {
      const updated = state.friends.map(f => {
        if (f.id === friendId) return { ...f, relation: 'blocked' };
        return f;
      });
      saveToStorage('discord_friends', updated);
      return { friends: updated };
    });
  },

  // управление звонком~~ мррр~~
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
          // если выключаем микрофон, но включен звук — просто меняем мут
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
          // если мы оглушены, то микрофон тоже автоматически глушится, ня~~
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

  // обновление сетевых графиков звонка в реальном времени, ууу~~
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
        // если пользователь оглушен или замьючен, громкость локального юзера 0
        if (p.isLocal && state.activeCall.isMuted) return { name: p.username, level: 0 };
        return {
          name: p.username,
          level: Math.random() > 0.4 ? Math.floor(Math.random() * 100) : 10 // прыгающий уровень звука!
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
