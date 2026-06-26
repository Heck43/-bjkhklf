import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';

// оййй~~ это наш фоновый менеджер голосовых и видео соединений!
// он тихонечко живет на фоне и держит WebRTC коннекты, пока мы ходим по чатикам~~ 🌸
export default function VoiceCallManager() {
  const { 
    activeCall, 
    socket,
    localStream,
    setRemoteStream,
    localAudioStream
  } = useStore();

  const pcsRef = useRef({}); // { remoteSocketId: RTCPeerConnection } (для стрима экрана)
  const localStreamRef = useRef(null);

  const audioPcsRef = useRef({}); // { remoteSocketId: RTCPeerConnection } (для звука)
  const remoteAudiosRef = useRef({}); // { remoteSocketId: HTMLAudioElement } (для звука)

  // синхронизируем локальный стрим в реф, чтобы сокет-хэндлеры не ловили старые замыкания~~ 🐾
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // --------- 1. ИНИЦИИРУЕМ WebRTC-СОЕДИНЕНИЕ ДЛЯ СТРИМА ЭКРАНА (ЗРИТЕЛЬ) ---------
  useEffect(() => {
    if (!socket || !activeCall) return;

    // если мы сами транслируем экран — не нужно инициировать входящие соединения в этом эффекте!
    const isLocalSharing = activeCall.participants?.some(p => p.isScreenSharing && p.isLocal);
    if (isLocalSharing) return;

    // ищем стримера (кто-то другой, не мы)~~
    const sharer = activeCall.participants?.find(p => p.isScreenSharing && !p.isLocal);

    if (sharer && sharer.socketId) {
      const sharerSocketId = sharer.socketId;
      
      // если соединения к этому стримеру еще нет — создаем его!
      if (!pcsRef.current[sharerSocketId]) {
        console.log(`[manager] подключаемся к стриму @${sharer.username}...`);

        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        pcsRef.current[sharerSocketId] = pc;

        pc.ontrack = (event) => {
          console.log("[manager] получен видео-трек стрима!", event.streams[0]);
          setRemoteStream(event.streams[0]);
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('webrtc_signal', {
              targetSocketId: sharerSocketId,
              signalData: { type: 'candidate', candidate: event.candidate }
            });
          }
        };

        // создаем предложение (offer) стримеру~~
        pc.createOffer({ offerToReceiveVideo: true })
          .then(async (offer) => {
            await pc.setLocalDescription(offer);
            socket.emit('webrtc_signal', {
              targetSocketId: sharerSocketId,
              signalData: { type: 'offer', offer }
            });
          })
          .catch(err => console.error("ошибка создания offer:", err));
      }
    } else {
      // если никто больше не стримит — тушим входящий поток~~
      setRemoteStream(null);
      for (const socketId in pcsRef.current) {
        pcsRef.current[socketId].close();
        delete pcsRef.current[socketId];
      }
    }
  }, [socket, activeCall, setRemoteStream]);

  // --------- 2. МЕШ-СЕТЬ WebRTC ДЛЯ ГОЛОСОВОГО ОБЩЕНИЯ (АУДИО) ---------
  useEffect(() => {
    if (!socket || !activeCall) {
      // чистим все аудио коннекты при выходе~~
      for (const socketId in audioPcsRef.current) {
        audioPcsRef.current[socketId].close();
      }
      audioPcsRef.current = {};

      for (const socketId in remoteAudiosRef.current) {
        remoteAudiosRef.current[socketId].srcObject = null;
      }
      remoteAudiosRef.current = {};
      return;
    }

    // запрашиваем доступ к микрофону, если его еще нет~~
    if (!localAudioStream) {
      console.log("[manager] запрашиваем доступ к микрофону для звонка...");
      navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(stream => {
          const isMuted = useStore.getState().isMuted;
          stream.getAudioTracks().forEach(track => {
            track.enabled = !isMuted;
          });
          useStore.setState({ localAudioStream: stream });
        })
        .catch(err => {
          console.error("[manager] ошибка доступа к микрофону:", err);
        });
      return;
    }

    const others = activeCall.participants?.filter(p => !p.isLocal) || [];
    const otherSocketIds = new Set(others.map(o => o.socketId).filter(Boolean));

    // чистим отвалившихся участников~~
    for (const socketId in audioPcsRef.current) {
      if (!otherSocketIds.has(socketId)) {
        console.log(`[manager] закрываем аудио-соединение с ${socketId} (вышел)~~`);
        audioPcsRef.current[socketId].close();
        delete audioPcsRef.current[socketId];

        if (remoteAudiosRef.current[socketId]) {
          remoteAudiosRef.current[socketId].srcObject = null;
          delete remoteAudiosRef.current[socketId];
        }
      }
    }

    // соединяемся с новыми участниками~~
    others.forEach(other => {
      const otherSocketId = other.socketId;
      if (!otherSocketId) return;

      if (!audioPcsRef.current[otherSocketId]) {
        console.log(`[manager] создаем аудио-соединение с @${other.username}...`);

        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        audioPcsRef.current[otherSocketId] = pc;

        // пихаем наш микрофончик~~ 🎤
        localAudioStream.getTracks().forEach(track => {
          pc.addTrack(track, localAudioStream);
        });

        pc.ontrack = (event) => {
          console.log(`[manager] получен входящий аудио-поток от @${other.username}!`);
          const remoteStream = event.streams[0];

          let audio = remoteAudiosRef.current[otherSocketId];
          if (!audio) {
            audio = new Audio();
            remoteAudiosRef.current[otherSocketId] = audio;
          }
          audio.srcObject = remoteStream;
          audio.play().catch(err => {
            console.error(`[manager] не удалось воспроизвести звук от @${other.username}:`, err);
          });
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('webrtc_signal', {
              targetSocketId: otherSocketId,
              signalData: { type: 'audio_candidate', candidate: event.candidate }
            });
          }
        };

        // определяем инициатора по socket.id, чтобы не спамить двойными офферами~~
        const isInitiator = socket.id > otherSocketId;
        if (isInitiator) {
          pc.createOffer()
            .then(async (offer) => {
              await pc.setLocalDescription(offer);
              socket.emit('webrtc_signal', {
                targetSocketId: otherSocketId,
                signalData: { type: 'audio_offer', offer }
              });
            })
            .catch(err => console.error("ошибка создания audio offer:", err));
        }
      }
    });

  }, [socket, activeCall, localAudioStream]);

  // --------- 3. ОБРАБОТКА ВХОДЯЩИХ СИГНАЛОВ (ЭКРАН И ГОЛОС) ---------
  useEffect(() => {
    if (!socket) return;

    const handleSignal = async (data) => {
      const { senderSocketId, signalData } = data;

      // --- ТРАНСЛЯЦИЯ ЭКРАНА ---
      if (signalData.type === 'offer') {
        console.log(`[manager] получен offer от зрителя (id: ${senderSocketId})`);
        
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        pcsRef.current[senderSocketId] = pc;

        const currentStream = localStreamRef.current;
        if (currentStream) {
          currentStream.getTracks().forEach(track => {
            pc.addTrack(track, currentStream);
          });
        }

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('webrtc_signal', {
              targetSocketId: senderSocketId,
              signalData: { type: 'candidate', candidate: event.candidate }
            });
          }
        };

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signalData.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socket.emit('webrtc_signal', {
            targetSocketId: senderSocketId,
            signalData: { type: 'answer', answer }
          });
        } catch (err) {
          console.error("ошибка WebRTC на стороне стримера:", err);
        }

      } else if (signalData.type === 'answer') {
        const pc = pcsRef.current[senderSocketId];
        if (pc) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(signalData.answer));
          } catch (err) {
            console.error("ошибка установки remote description на зрителе:", err);
          }
        }

      } else if (signalData.type === 'candidate') {
        const pc = pcsRef.current[senderSocketId];
        if (pc) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
          } catch (err) {
            console.error("ошибка добавления ICE-кандидата:", err);
          }
        }
      }

      // --- ГОЛОСОВОЙ ЗВОНОК (МЕШ) ---
      else if (signalData.type === 'audio_offer') {
        console.log(`[manager] получен audio offer от @${senderSocketId}`);
        let pc = audioPcsRef.current[senderSocketId];

        if (!pc) {
          pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
          });
          audioPcsRef.current[senderSocketId] = pc;

          const myAudioStream = useStore.getState().localAudioStream;
          if (myAudioStream) {
            myAudioStream.getTracks().forEach(track => pc.addTrack(track, myAudioStream));
          }

          pc.ontrack = (event) => {
            console.log(`[manager] получен аудио-трек от @${senderSocketId} (по offer)`);
            const remoteStream = event.streams[0];

            let audio = remoteAudiosRef.current[senderSocketId];
            if (!audio) {
              audio = new Audio();
              remoteAudiosRef.current[senderSocketId] = audio;
            }
            audio.srcObject = remoteStream;
            audio.play().catch(err => console.error("[manager] ошибка воспроизведения звука:", err));
          };

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              socket.emit('webrtc_signal', {
                targetSocketId: senderSocketId,
                signalData: { type: 'audio_candidate', candidate: event.candidate }
              });
            }
          };
        }

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signalData.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          socket.emit('webrtc_signal', {
            targetSocketId: senderSocketId,
            signalData: { type: 'audio_answer', answer }
          });
        } catch (err) {
          console.error("ошибка WebRTC при ответе на audio offer:", err);
        }

      } else if (signalData.type === 'audio_answer') {
        console.log(`[manager] получен audio answer от @${senderSocketId}`);
        const pc = audioPcsRef.current[senderSocketId];
        if (pc) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(signalData.answer));
          } catch (err) {
            console.error("ошибка установки remote audio description:", err);
          }
        }

      } else if (signalData.type === 'audio_candidate') {
        const pc = audioPcsRef.current[senderSocketId];
        if (pc && signalData.candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
          } catch (err) {
            console.error("ошибка добавления ICE-кандидата для аудио:", err);
          }
        }
      }
    };

    socket.on('webrtc_signal', handleSignal);

    return () => {
      socket.off('webrtc_signal', handleSignal);
    };
  }, [socket]);

  // --------- 4. ЗАКРЫВАЕМ ВСЕ СОЕДИНЕНИЯ ПРИ СМЕНЕ ЗВОНКА ИЛИ РАЗМОНТИРОВАНИИ ---------
  useEffect(() => {
    return () => {
      console.log("[manager] очистка всех фоновых WebRTC соединений...");
      
      // Закрываем стримы экрана
      for (const socketId in pcsRef.current) {
        pcsRef.current[socketId].close();
      }
      pcsRef.current = {};
      setRemoteStream(null);

      // Закрываем аудио
      for (const socketId in audioPcsRef.current) {
        audioPcsRef.current[socketId].close();
      }
      audioPcsRef.current = {};

      for (const socketId in remoteAudiosRef.current) {
        remoteAudiosRef.current[socketId].srcObject = null;
      }
      remoteAudiosRef.current = {};
    };
  }, [setRemoteStream]);

  return null; // он невидимый, просто магия на фоне, няя~~ 🐾
}
