type AudioContextCtor = typeof AudioContext;

let audioCtx: AudioContext | null = null;
let primed = false;

function getAudioContextCtor(): AudioContextCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext;
}

function ensureContext(): AudioContext | null {
  const Ctx = getAudioContextCtor();
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  return audioCtx;
}

// Los navegadores crean el AudioContext en estado "suspended" hasta que hay un
// gesto real del usuario en la página; una notificación llega por SSE sin ese
// gesto, así que la desbloqueamos apenas ocurra el primer click/tecla/touch.
export function primeNotificationSound() {
  if (primed || typeof window === "undefined") return;
  primed = true;
  const unlock = () => {
    const ctx = ensureContext();
    if (ctx?.state === "suspended") void ctx.resume();
  };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
}

// Beep sintetizado (dos tonos) en vez de un archivo de audio, para no depender
// de un asset binario ni de licencias.
export function playNotificationSound() {
  try {
    const ctx = ensureContext();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();

    const now = ctx.currentTime;
    [880, 1320].forEach((freq, i) => {
      const start = now + i * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.15, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.3);
    });
  } catch {
    // Navegador sin soporte de Web Audio o contexto bloqueado: se ignora
  }
}
