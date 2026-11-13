/* ============================================================
   SOUND — a shutter for every answer. Synthesised, so there is
   nothing to download. Starts only after the player's first tap.
   ============================================================ */
const Sound = (() => {
  let ctx = null;
  function ensure() {
    try {
      if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ctx = new AC(); }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (e) { return null; }
  }
  function burst(dur, freq, q, gain, when) {
    const c = ensure(); if (!c) return;
    const n = Math.max(1, Math.floor(c.sampleRate * dur)), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.4);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q; g.gain.value = gain;
    s.connect(f); f.connect(g); g.connect(c.destination);
    s.start(c.currentTime + (when || 0));
  }
  function tone(freq, dur, gain, when, type) {
    const c = ensure(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + (when || 0);
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  const on = () => P.settings.sound !== false;
  return {
    shutter() { if (on()) { burst(0.028, 2800, 1.1, 0.42); burst(0.045, 1500, 0.9, 0.3, 0.05); } },
    miss() { if (on()) { tone(165, 0.17, 0.2, 0, 'triangle'); } },
    pass() { if (on()) { tone(660, 0.13, 0.13); tone(880, 0.13, 0.13, 0.1); tone(1320, 0.26, 0.12, 0.2); } },
    fail() { if (on()) { tone(330, 0.18, 0.13, 0, 'triangle'); tone(247, 0.3, 0.13, 0.14, 'triangle'); } },
    wake: ensure,
  };
})();
