// оййй тут у нас магия звуков через web audio api, без файлов!! мурррр~~ 🐾
// все звуки генерируются прямо в браузере, никаких mp3 не нужно ня!

// создаём или переиспользуем единственный AudioContext на всё приложение~~
let audioCtx = null;
const getCtx = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // возобновляем контекст если браузер его приостановил~~
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

// проверяем, включены ли звуки в настройках~~
const isSoundEnabled = () => localStorage.getItem('sounds_enabled') !== 'false';

// воспроизводим короткий дин-бим при новом сообщении~~
export const playMessageSound = () => {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // нота 1 — мягкий поп-звук ня~~
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(660, now + 0.12);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc1.start(now);
    osc1.stop(now + 0.18);
  } catch (e) {
    console.warn('ойй, не удалось воспроизвести звук сообщения~~', e);
  }
};

// воспроизводим два звука — дин-дон при упоминании @mention~~
export const playMentionSound = () => {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // нота 1~~
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1047, now);
    gain1.gain.setValueAtTime(0.22, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc1.start(now);
    osc1.stop(now + 0.22);

    // нота 2 — чуть позже и выше, чтобы получился мелодичный дин-дон~~
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1319, now + 0.18);
    gain2.gain.setValueAtTime(0.22, now + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.start(now + 0.18);
    osc2.stop(now + 0.45);
  } catch (e) {
    console.warn('ойй, не удалось воспроизвести звук упоминания~~', e);
  }
};

// тихий мягкий звук при входе в голосовой канал — тум~~
export const playJoinSound = () => {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(550, now + 0.08);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch (e) {
    console.warn('ойй, не удалось воспроизвести звук входа~~', e);
  }
};

// мягкий звук при выходе из голосового — буп~~
export const playLeaveSound = () => {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(550, now);
    osc.frequency.exponentialRampToValueAtTime(380, now + 0.12);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.start(now);
    osc.stop(now + 0.25);
  } catch (e) {
    console.warn('ойй, не удалось воспроизвести звук выхода~~', e);
  }
};
