import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';

// оййй~~ это наш фоновый менеджер голосовых и видео соединений!
// он тихонечко живет на фоне и держит WebRTC коннекты, пока мы ходим по чатикам~~ 🌸
export default function VoiceCallManager() {
  const { 
    activeCall, 
    socket,
    localStream,
    setRemoteStream
  } = useStore();

  const pcsRef = useRef({}); // { remoteSocketId: RTCPeerConnection }
  const localStreamRef = useRef(null);

  // синхронизируем локальный стрим в реф, чтобы сокет-хэндлеры не ловили старые замыкания~~ 🐾
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // 1. Инициируем WebRTC-соединение на стороне зрителя~~
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

  // 2. Обрабатываем сигналы WebRTC на стороне стримера и зрителя~~
  useEffect(() => {
    if (!socket) return;

    const handleSignal = async (data) => {
      const { senderSocketId, signalData } = data;

      if (signalData.type === 'offer') {
        // к нам (стримеру) подключается зритель~~
        console.log(`[manager] получен offer от зрителя (id: ${senderSocketId})`);
        
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        pcsRef.current[senderSocketId] = pc;

        // если у нас есть активный стрим экрана, отправляем его треки зрителям~~
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
        // зритель получил ответ от стримера~~
        const pc = pcsRef.current[senderSocketId];
        if (pc) {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(signalData.answer));
          } catch (err) {
            console.error("ошибка установки remote description на зрителе:", err);
          }
        }

      } else if (signalData.type === 'candidate') {
        // получаем ICE-кандидаты~~
        const pc = pcsRef.current[senderSocketId];
        if (pc) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
          } catch (err) {
            console.error("ошибка добавления ICE-кандидата:", err);
          }
        }
      }
    };

    socket.on('webrtc_signal', handleSignal);

    return () => {
      socket.off('webrtc_signal', handleSignal);
    };
  }, [socket]);

  // 3. Закрываем все соединения при выходе из звонка или размонтировании менеджера~~
  useEffect(() => {
    return () => {
      console.log("[manager] очистка всех фоновых WebRTC соединений...");
      for (const socketId in pcsRef.current) {
        pcsRef.current[socketId].close();
      }
      pcsRef.current = {};
      setRemoteStream(null);
    };
  }, [setRemoteStream]);

  return null; // он невидимый, просто магия на фоне, няя~~ 🐾
}
