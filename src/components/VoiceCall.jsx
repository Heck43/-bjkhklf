import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { PhoneOff, Video, VideoOff, Monitor, MonitorOff, Mic, MicOff, Headphones, Wifi } from 'lucide-react';

// ооооой, это же голосовой звоночек! 🔊
// тут мы выводим участников с аватарками и поддерживаем НАСТОЯЩУЮ трансляцию экрана!
// посмотрите как круто работает, у меня аж ушки дрожат от восторга~~ ^w^ 🐾

export default function VoiceCall() {
  const { 
    activeCall, 
    endCall, 
    toggleMute, 
    toggleDeafen, 
    toggleCamera, 
    toggleScreenShare
  } = useStore();

  const [screenStream, setScreenStream] = useState(null);
  const videoRef = useRef(null);

  // Следим за состоянием трансляции экрана и запрашиваем захват~~
  const handleScreenShareClick = async () => {
    if (!activeCall.isScreenSharing) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ 
          video: {
            cursor: "always"
          },
          audio: false
        });
        setScreenStream(stream);
        toggleScreenShare();

        // Если пользователь остановил трансляцию через встроенную панель браузера~~
        stream.getVideoTracks()[0].onended = () => {
          stopCapture();
        };
      } catch (err) {
        console.error("ошибка получения захвата экрана:", err);
      }
    } else {
      stopCapture();
    }
  };

  const stopCapture = () => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }
    // сбрасываем флаг в Zustand сторе, если он еще активен~~
    const state = useStore.getState().activeCall;
    if (state && state.isScreenSharing) {
      toggleScreenShare();
    }
  };

  // Навешиваем поток на видео-плеер~~
  useEffect(() => {
    if (videoRef.current && screenStream) {
      videoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  // Чистим поток при размонтировании звонка~~
  useEffect(() => {
    return () => {
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [screenStream]);

  // Если звонок отключили извне, тушим захват~~
  useEffect(() => {
    if (!activeCall && screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }
  }, [activeCall, screenStream]);

  if (!activeCall) {
    return (
      <div className="welcome-chat-info">
        <span className="welcome-logo">🔊</span>
        <span className="welcome-title">Голосовое соединение отсутствует</span>
        <span className="welcome-desc">Выберите голосовой канал на сервере, чтобы подключиться к звонку!</span>
      </div>
    );
  }

  const isSharing = activeCall.isScreenSharing && screenStream;

  return (
    <div className="call-layout" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Шапка звоночка */}
      <div className="call-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="call-title">
          <span>Голосовой звонок: <b>{activeCall.channelName}</b></span>
          <span className="call-badge" style={{ marginLeft: 8, backgroundColor: 'var(--discord-red)', padding: '2px 6px', borderRadius: 4, fontSize: 10, color: 'white', fontWeight: 'bold' }}>В ЭФИРЕ</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--discord-green)', fontSize: 13, fontWeight: 500 }}>
          <Wifi size={16} />
          <span>Соединение установлено (RTC)</span>
        </div>
      </div>

      {/* Центральная область участников и стрима */}
      {isSharing ? (
        /* РЕЖИМ ТРАНСЛЯЦИИ ЭКРАНА (Слева стрим, Справа колонка участников) */
        <div style={{ display: 'flex', flex: 1, gap: 16, minHeight: 0, padding: 16 }}>
          {/* Стрим экрана */}
          <div style={{
            flex: 1,
            backgroundColor: '#000',
            borderRadius: 12,
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--glass-border)'
          }}>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
            <div style={{
              position: 'absolute',
              bottom: 12,
              left: 12,
              backgroundColor: 'rgba(0,0,0,0.65)',
              padding: '4px 10px',
              borderRadius: 6,
              color: '#fff',
              fontSize: 12,
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--discord-red)' }}></span>
              <span>Стрим экрана: @{activeCall.participants[0]?.username}</span>
            </div>
          </div>

          {/* Список участников сбоку */}
          <div style={{
            width: 240,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            overflowY: 'auto',
            paddingRight: 4
          }}>
            {activeCall.participants.map((p) => {
              const audioLevel = activeCall.audioLevels?.find(al => al.name === p.username)?.level || 0;
              const isSpeaking = audioLevel > 30;

              return (
                <div 
                  key={p.username} 
                  className={`participant-card ${isSpeaking ? 'speaking' : ''}`}
                  style={{
                    height: 160,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(30,31,34,0.6)',
                    borderRadius: 12,
                    border: isSpeaking ? '2px solid var(--discord-green)' : '2px solid transparent',
                    position: 'relative'
                  }}
                >
                  <div 
                    className="participant-avatar-container"
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: '50%',
                      backgroundColor: p.avatarColor || '#72767d',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 22,
                      color: '#fff',
                      fontWeight: 'bold',
                      overflow: 'hidden'
                    }}
                  >
                    {p.avatarUrl ? (
                      <img src={p.avatarUrl} alt={p.username} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      p.username.substring(0, 2)
                    )}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 'bold', color: '#fff', marginTop: 10 }}>
                    {p.username} {p.isLocal ? '(Вы)' : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ОБЫЧНЫЙ ГРИД УЧАСТНИКОВ (Без графиков!) */
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, minHeight: 0 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: activeCall.participants.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 16,
            width: '100%',
            maxWidth: activeCall.participants.length === 1 ? '340px' : '900px',
            alignItems: 'center'
          }}>
            {activeCall.participants.map((p) => {
              const audioLevel = activeCall.audioLevels?.find(al => al.name === p.username)?.level || 0;
              const isSpeaking = audioLevel > 30;

              return (
                <div 
                  key={p.username} 
                  className={`participant-card ${isSpeaking ? 'speaking' : ''}`}
                  style={{
                    height: 240,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(30,31,34,0.6)',
                    borderRadius: 12,
                    border: isSpeaking ? '2px solid var(--discord-green)' : '2px solid transparent',
                    position: 'relative'
                  }}
                >
                  <div 
                    className="participant-avatar-container"
                    style={{
                      width: 96,
                      height: 96,
                      borderRadius: '50%',
                      backgroundColor: p.avatarColor || '#72767d',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 32,
                      color: '#fff',
                      fontWeight: 'bold',
                      overflow: 'hidden'
                    }}
                  >
                    {p.avatarUrl ? (
                      <img src={p.avatarUrl} alt={p.username} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      p.username.substring(0, 2)
                    )}
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 'bold', color: '#fff', marginTop: 16 }}>
                    {p.username} {p.isLocal ? '(Вы)' : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Панель управления звонком снизу */}
      <div className="call-bar" style={{ borderRadius: 12, border: '1px solid var(--glass-border)', margin: '0 16px 16px 16px', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--background-servers)' }}>
        <div className="call-info-left">
          <span className="call-status-text" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--discord-green)', fontWeight: 'bold' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--discord-green)' }}></span>
            Подключено к голосу
          </span>
          <span className="call-channel-name" style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{activeCall.channelName} / Gamer Fox Den</span>
        </div>

        <div className="call-controls-center" style={{ display: 'flex', gap: 12 }}>
          <button 
            className={`call-btn ${activeCall.isMuted ? 'active' : ''}`}
            onClick={toggleMute}
            title={activeCall.isMuted ? "Включить микрофон" : "Выключить микрофон"}
            style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', backgroundColor: activeCall.isMuted ? 'var(--discord-red)' : 'var(--background-sidebar)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justify: 'center' }}
          >
            {activeCall.isMuted ? <MicOff size={18} style={{ margin: 'auto' }} /> : <Mic size={18} style={{ margin: 'auto' }} />}
          </button>
          
          <button 
            className={`call-btn ${activeCall.isDeafened ? 'active' : ''}`}
            onClick={toggleDeafen}
            title={activeCall.isDeafened ? "Включить звук" : "Выключить звук"}
            style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', backgroundColor: activeCall.isDeafened ? 'var(--discord-red)' : 'var(--background-sidebar)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justify: 'center' }}
          >
            <Headphones size={18} style={{ margin: 'auto' }} />
          </button>

          <button 
            className={`call-btn ${activeCall.isCameraOn ? 'active' : ''}`}
            onClick={toggleCamera}
            title={activeCall.isCameraOn ? "Выключить камеру" : "Включить камеру"}
            style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', backgroundColor: activeCall.isCameraOn ? 'var(--discord-green)' : 'var(--background-sidebar)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justify: 'center' }}
          >
            {activeCall.isCameraOn ? <Video size={18} style={{ margin: 'auto' }} /> : <VideoOff size={18} style={{ margin: 'auto' }} />}
          </button>

          <button 
            className={`call-btn ${activeCall.isScreenSharing ? 'active' : ''}`}
            onClick={handleScreenShareClick}
            title={activeCall.isScreenSharing ? "Прекратить стрим" : "Начать трансляцию экрана"}
            style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', backgroundColor: activeCall.isScreenSharing ? 'var(--discord-green)' : 'var(--background-sidebar)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justify: 'center' }}
          >
            {activeCall.isScreenSharing ? <Monitor size={18} style={{ margin: 'auto' }} /> : <MonitorOff size={18} style={{ margin: 'auto' }} />}
          </button>

          <button 
            className="call-btn hangup"
            onClick={endCall}
            title="Отключиться"
            style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', backgroundColor: 'var(--discord-red)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justify: 'center' }}
          >
            <PhoneOff size={18} style={{ margin: 'auto' }} />
          </button>
        </div>

        <div style={{ width: 150, textAlign: 'right', fontSize: 11, color: 'var(--text-muted)' }}>
          Качество: HD 720p 30fps
        </div>
      </div>
    </div>
  );
}
