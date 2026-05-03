import { useCallback, useRef } from "react";

export function useSound() {
  const ctxRef = useRef<AudioContext | null>(null);

  function ac(): AudioContext {
    if (!ctxRef.current) ctxRef.current = new AudioContext();
    if (ctxRef.current.state === "suspended") ctxRef.current.resume();
    return ctxRef.current;
  }

  const cardDeal = useCallback(() => {
    const ctx = ac();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.07, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) * 0.4;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = "highpass";
    filt.frequency.value = 2000;
    const gain = ctx.createGain();
    gain.gain.value = 0.6;
    src.connect(filt);
    filt.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  }, []);

  const chipClick = useCallback(() => {
    const ctx = ac();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "triangle";
    osc.frequency.value = 1400;
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  }, []);

  const win = useCallback(() => {
    const ctx = ac();
    [0, 0.12, 0.24].forEach((delay, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = [440, 554, 660][i];
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + delay + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.35);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.4);
    });
  }, []);

  const lose = useCallback(() => {
    const ctx = ac();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(280, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  }, []);

  const spin = useCallback(() => {
    const ctx = ac();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 4.5);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.setValueAtTime(0.06, ctx.currentTime + 3.5);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 4.8);
    osc.start();
    osc.stop(ctx.currentTime + 4.8);
  }, []);

  return { cardDeal, chipClick, win, lose, spin };
}
