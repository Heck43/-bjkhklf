import React, { useEffect, useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { PhoneOff, Video, VideoOff, Monitor, MonitorOff, Mic, MicOff, Headphones, Wifi } from 'lucide-react';

// оййй~~ тут наш красивый генератор трансляции экрана для тех, кто смотрит стримчик другого котика~~
// рисуем футуристичные летающие частички и звуковые волны на канвасе, ня! 🌸
function MockScreenStream({ username }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    let particles = [];

    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * 400,
        y: Math.random() * 300,
        r: Math.random() * 2 + 1,
        vx: Math.random() * 0.5 - 0.25,
        vy: Math.random() * 0.5 - 0.25,
        alpha: Math.random() * 0.5 + 0.2
      });
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      
      particles.forEach(p => {
        if (p.x > canvas.width) p.x = Math.random() * canvas.width;
        if (p.y > canvas.height) p.y = Math.random() * canvas.height;
      });
    };
    resize();
    window.addEventListener('resize', resize);

    let angle = 0;

    const render = () => {
      ctx.fillStyle = '#0f1012';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = 'rgba(88, 101, 242, 0.05)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(88, 101, 242, ${p.alpha})`;
        ctx.fill();
      });

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(35, 165, 90, 0.4)';
      ctx.lineWidth = 3;
      const midY = canvas.height / 2 + 60;
      for (let x = 0; x < canvas.width; x++) {
        const y = midY + Math.sin(x * 0.01 + angle) * 15 * Math.sin(angle * 0.5);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      angle += 0.05;

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2 - 40;

      ctx.beginPath();
      ctx.arc(centerX, centerY, 50, 0, Math.PI * 2);
      ctx.fillStyle = '#ff8da1';
      ctx.fill();
      ctx.strokeStyle = 'var(--discord-blurple)';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(username.substring(0, 2).toUpperCase(), centerX, centerY);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px sans-serif';
      ctx.fillText(`Стрим пользователя @${username}`, centerX, centerY + 80);

      ctx.fillStyle = 'var(--text-muted)';
      ctx.font = '13px sans-serif';
      ctx.fillText('Соединение установлено • 1080p 60fps', centerX, centerY + 105);

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, [username]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', borderRadius: 12 }} />;
}

export default function VoiceCall() {
  const { 
    activeCall, 
    endCall, 
    toggleMute, 
    toggleDeafen, 
    toggleCamera, 
    localStream,
    remoteStream,
    startScreenShare,
    stopScreenShare
  } = useStore();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Навешиваем локальный поток на видео-плеер~~
  useEffect(() => {
    if (localVideoRef.current) {
      if (localStream) {
        if (localVideoRef.current.srcObject !== localStream) {
          localVideoRef.current.srcObject = localStream;
          localVideoRef.current.play().catch(err => console.log("ошибка автоплея локального стрима:", err));
        }
      } else {
        localVideoRef.current.srcObject = null;
      }
    }
  }, [localStream]);

  // Навешиваем удаленный поток на видео-плеер~~
  useEffect(() => {
    if (remoteVideoRef.current) {
      if (remoteStream) {
        if (remoteVideoRef.current.srcObject !== remoteStream) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.play().catch(err => console.log("ошибка автоплея удаленного стрима:", err));
        }
      } else {
        remoteVideoRef.current.srcObject = null;
      }
    }
  }, [remoteStream]);

  // Следим за состоянием трансляции экрана и запрашиваем захват~~
  const handleScreenShareClick = () => {
    if (!localStream) {
      startScreenShare();
    } else {
      stopScreenShare();
    }
  };

  if (!activeCall) {
    return (
      <div className="welcome-chat-info">
        <span className="welcome-logo">🔊</span>
        <span className="welcome-title">Голосовое соединение отсутствует</span>
        <span className="welcome-desc">Выберите голосовой канал на сервере, чтобы подключиться к звонку!</span>
      </div>
    );
  }

  // определяем, стримит ли кто-то экран (включая нас или других пользователей)~~
  const screenSharer = activeCall.participants?.find(p => p.isScreenSharing);
  const isSharing = !!screenSharer;
  const isLocalSharing = screenSharer?.isLocal;

  return (
    <div className="call-layout" style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Шапка звоночка */}
      <div className="call-header" style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="call-title">
          <span>Голосовой звонок: <b>{activeCall.channelName}</b></span>
          {isSharing && (
            <span className="call-badge" style={{ marginLeft: 8, backgroundColor: 'var(--discord-red)', padding: '2px 6px', borderRadius: 4, fontSize: 10, color: 'white', fontWeight: 'bold' }}>В ЭФИРЕ</span>
          )}
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
            {isLocalSharing ? (
              <video 
                ref={localVideoRef}
                autoPlay 
                playsInline 
                muted 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : remoteStream ? (
              <video 
                ref={remoteVideoRef}
                autoPlay 
                playsInline 
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <MockScreenStream username={screenSharer?.username || 'user'} />
            )}
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
              <span>Стрим экрана: @{screenSharer?.username}</span>
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
              const isSpeaking = audioLevel > 30 && !p.isMuted && !p.isDeafened;

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
                    }}
                  >
                    <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {p.avatarUrl ? (
                        <img src={p.avatarUrl} alt={p.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        p.username.substring(0, 2)
                      )}
                    </div>

                    {/* значок мута / глухоты~~ */}
                    {(p.isMuted || p.isDeafened) && (
                      <div style={{
                        position: 'absolute',
                        bottom: -2,
                        right: -2,
                        backgroundColor: 'var(--discord-red)',
                        borderRadius: '50%',
                        width: 22,
                        height: 22,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid rgba(30,31,34,1)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        zIndex: 2
                      }}>
                        {p.isDeafened ? (
                          <Headphones size={12} style={{ color: '#fff' }} />
                        ) : (
                          <MicOff size={12} style={{ color: '#fff' }} />
                        )}
                      </div>
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
        /* ОБЫЧНЫЙ ГРИД УЧАСТНИКОВ */
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
              const isSpeaking = audioLevel > 30 && !p.isMuted && !p.isDeafened;

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
                    }}
                  >
                    <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {p.avatarUrl ? (
                        <img src={p.avatarUrl} alt={p.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        p.username.substring(0, 2)
                      )}
                    </div>

                    {/* значок мута / глухоты~~ */}
                    {(p.isMuted || p.isDeafened) && (
                      <div style={{
                        position: 'absolute',
                        bottom: 2,
                        right: 2,
                        backgroundColor: 'var(--discord-red)',
                        borderRadius: '50%',
                        width: 28,
                        height: 28,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '3px solid rgba(30,31,34,1)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        zIndex: 2
                      }}>
                        {p.isDeafened ? (
                          <Headphones size={14} style={{ color: '#fff' }} />
                        ) : (
                          <MicOff size={14} style={{ color: '#fff' }} />
                        )}
                      </div>
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

          {/* оййй тут кнопочка стрима экрана, проверяем localStream вместо опечатки~~ */}
          <button 
            className={`call-btn ${localStream ? 'active' : ''}`}
            onClick={handleScreenShareClick}
            title={localStream ? "Прекратить стрим" : "Начать трансляцию экрана"}
            style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', backgroundColor: localStream ? 'var(--discord-green)' : 'var(--background-sidebar)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justify: 'center' }}
          >
            {localStream ? <Monitor size={18} style={{ margin: 'auto' }} /> : <MonitorOff size={18} style={{ margin: 'auto' }} />}
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
