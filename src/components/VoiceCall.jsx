import React, { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, Cell } from 'recharts';
import { PhoneOff, Video, VideoOff, Monitor, MonitorOff, Mic, MicOff, Headphones, Wifi } from 'lucide-react';

// ооооой, это же голосовой звоночек! 🔊
// тут мы симулируем задержку сети и прыгающие уровни громкости с помощью графиков Recharts~~
// посмотрите как бегают полосочки, у меня аж хвостик крутится от радости! ^w^ 🐾

export default function VoiceCall() {
  const { 
    activeCall, 
    endCall, 
    toggleMute, 
    toggleDeafen, 
    toggleCamera, 
    toggleScreenShare,
    updateCallStats
  } = useStore();

  useEffect(() => {
    // обновляем статистику звонка каждую секунду для графиков Recharts~~
    const interval = setInterval(() => {
      updateCallStats();
    }, 1000);

    return () => clearInterval(interval);
  }, [updateCallStats]);

  if (!activeCall) {
    return (
      <div className="welcome-chat-info">
        <span className="welcome-logo">🔊</span>
        <span className="welcome-title">Голосовое соединение отсутствует</span>
        <span className="welcome-desc">Выберите голосовой канал на сервере, чтобы подключиться к звонку!</span>
      </div>
    );
  }

  // цвета для баров громкости участников звонка~~
  const COLORS = ['#5865F2', '#23A55A', '#FAA81A', '#ED4245'];

  return (
    <div className="call-layout">
      {/* шапка звонка~~ */}
      <div className="call-header">
        <div className="call-title">
          <span>Голосовой звонок: <b>{activeCall.channelName}</b></span>
          <span className="call-badge">В эфире</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--discord-green)', fontSize: 13, fontWeight: 500 }}>
          <Wifi size={16} />
          <span>Соединение установлено (RTC)</span>
        </div>
      </div>

      {/* сетка участников~~ */}
      <div className="participants-grid">
        {activeCall.participants.map((p, idx) => {
          // проверяем, "говорит" ли участник (если уровень звука > 30)~~
          const audioLevel = activeCall.audioLevels?.find(al => al.name === p.username)?.level || 0;
          const isSpeaking = audioLevel > 30;

          return (
            <div 
              key={p.username} 
              className={`participant-card ${isSpeaking ? 'speaking' : ''}`}
            >
              <div 
                className="participant-avatar-container"
                style={{ backgroundColor: p.avatarColor || '#72767d' }}
              >
                <div className="voice-ring" />
                {p.username.substring(0, 2)}
              </div>
              <span className="participant-name">
                {p.username} {p.isLocal ? '(Вы)' : ''}
              </span>

              {/* статусы камеры или демонстрации экрана~~ */}
              <div className="participant-status-label">
                {p.isLocal && activeCall.isCameraOn && (
                  <span style={{ backgroundColor: 'var(--discord-green)', padding: '2px 6px', borderRadius: 4, fontSize: 10, color: 'white' }}>Камера</span>
                )}
                {p.isLocal && activeCall.isScreenSharing && (
                  <span style={{ backgroundColor: 'var(--discord-blurple)', padding: '2px 6px', borderRadius: 4, fontSize: 10, color: 'white' }}>Экран</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* панель с графиками Recharts~~ */}
      <div className="call-charts-section">
        {/* график пинга (сетевой задержки)~~ */}
        <div className="chart-card">
          <span className="chart-title">Задержка сети (Ping Latency, ms)</span>
          <div style={{ width: '100%', height: 180 }}>
            <ResponsiveContainer>
              <AreaChart data={activeCall.networkLatency} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--discord-blurple)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--discord-blurple)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide />
                <YAxis domain={[0, 100]} stroke="var(--text-muted)" fontSize={11} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--background-sidebar)', border: '1px solid var(--glass-border)', borderRadius: 4, fontSize: 12, color: 'var(--text-normal)' }}
                  labelFormatter={() => 'Текущий пинг'}
                />
                <Area type="monotone" dataKey="ms" name="Пинг (мс)" stroke="var(--discord-blurple)" fillOpacity={1} fill="url(#colorLatency)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* график громкости участников звонка~~ */}
        <div className="chart-card">
          <span className="chart-title">Активность звука участников (Audio Levels)</span>
          <div style={{ width: '100%', height: 180 }}>
            <ResponsiveContainer>
              <BarChart data={activeCall.audioLevels} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis domain={[0, 100]} stroke="var(--text-muted)" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'var(--background-sidebar)', border: '1px solid var(--glass-border)', borderRadius: 4, fontSize: 12, color: 'var(--text-normal)' }}
                  formatter={(value) => [`${Math.round(value)}%`, 'Громкость']}
                />
                <Bar dataKey="level" name="Громкость">
                  {activeCall.audioLevels?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* панель кнопок звонка снизу~~ */}
      <div className="call-bar" style={{ borderRadius: 12, border: '1px solid var(--glass-border)' }}>
        <div className="call-info-left">
          <span className="call-status-text">
            <span>●</span> Подключено к голосу
          </span>
          <span className="call-channel-name">{activeCall.channelName} / Gamer Fox Den</span>
        </div>

        <div className="call-controls-center">
          <button 
            className={`call-btn ${activeCall.isMuted ? 'active' : ''}`}
            onClick={toggleMute}
            title={activeCall.isMuted ? "Включить микрофон" : "Выключить микрофон"}
          >
            {activeCall.isMuted ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
          
          <button 
            className={`call-btn ${activeCall.isDeafened ? 'active' : ''}`}
            onClick={toggleDeafen}
            title={activeCall.isDeafened ? "Включить звук" : "Выключить звук"}
          >
            <Headphones size={18} />
          </button>

          <button 
            className={`call-btn ${activeCall.isCameraOn ? 'active' : ''}`}
            onClick={toggleCamera}
            title={activeCall.isCameraOn ? "Выключить камеру" : "Включить камеру"}
            style={{ backgroundColor: activeCall.isCameraOn ? 'var(--discord-green)' : '' }}
          >
            {activeCall.isCameraOn ? <Video size={18} /> : <VideoOff size={18} />}
          </button>

          <button 
            className={`call-btn ${activeCall.isScreenSharing ? 'active' : ''}`}
            onClick={toggleScreenShare}
            title={activeCall.isScreenSharing ? "Прекратить стрим" : "Начать трансляцию экрана"}
            style={{ backgroundColor: activeCall.isScreenSharing ? 'var(--discord-green)' : '' }}
          >
            {activeCall.isScreenSharing ? <Monitor size={18} /> : <MonitorOff size={18} />}
          </button>

          <button 
            className="call-btn hangup"
            onClick={endCall}
            title="Отключиться"
          >
            <PhoneOff size={18} />
          </button>
        </div>

        <div style={{ width: 150, textAlign: 'right', fontSize: 12, color: 'var(--text-muted)' }}>
          Качество: HD 720p 30fps
        </div>
      </div>
    </div>
  );
}
