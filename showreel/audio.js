/* ============================================================
   Showreel soundtrack — 128 BPM, 8 bars, F minor.
   Fully synthesized with WebAudio (OfflineAudioContext), hits
   locked to the picture cuts in reel.js.
   ============================================================ */
(function () {
  'use strict';
  const BPM = 128, BEAT = 60 / BPM, BAR = BEAT * 4, DUR = 15;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const N = { F2: 87.31, Db2: 69.30, Ab2: 103.83, Eb2: 77.78, C3: 130.81, Db3: 138.59, Eb3: 155.56, F3: 174.61, G3: 196.0, Ab3: 207.65, Bb3: 233.08, C4: 261.63, Eb4: 311.13 };
  const CHORDS = {
    Fm: { root: N.F2, tones: [N.F3, N.Ab3, N.C4] },
    Db: { root: N.Db2, tones: [N.Db3, N.F3, N.Ab3] },
    Ab: { root: N.Ab2, tones: [N.Ab3, N.C4, N.Eb4] },
    Eb: { root: N.Eb2, tones: [N.Eb3, N.G3, N.Bb3] },
  };
  const PROG = [null, 'Fm', 'Db', 'Ab', 'Eb', 'Fm', 'Db', 'Fm'];

  function build(ctx) {
    const sr = ctx.sampleRate, rng = mulberry32(1234);
    const noise = ctx.createBuffer(2, sr * 3, sr);
    for (let c = 0; c < 2; c++) { const d = noise.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = rng() * 2 - 1; }

    // master chain
    const out = ctx.createGain(); out.gain.value = 0.85;
    const glue = ctx.createDynamicsCompressor();
    glue.threshold.value = -18; glue.knee.value = 8; glue.ratio.value = 4; glue.attack.value = 0.004; glue.release.value = 0.14;
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.06;
    out.connect(glue); glue.connect(lim); lim.connect(ctx.destination);
    out.gain.setValueAtTime(0.85, DUR - 0.4); out.gain.linearRampToValueAtTime(0, DUR);

    // reverb
    const irLen = Math.floor(sr * 2.6), ir = ctx.createBuffer(2, irLen, sr);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < irLen; i++) d[i] = (rng() * 2 - 1) * Math.pow(1 - i / irLen, 3.4); }
    const verb = ctx.createConvolver(); verb.buffer = ir;
    const verbIn = ctx.createGain(); verbIn.gain.value = 0.3;
    verbIn.connect(verb); verb.connect(out);
    // dotted-8th delay
    const dIn = ctx.createGain(); dIn.gain.value = 0.28;
    const dly = ctx.createDelay(1); dly.delayTime.value = BEAT * 0.75;
    const fb = ctx.createGain(); fb.gain.value = 0.38;
    const dlp = ctx.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 2600;
    dIn.connect(dly); dly.connect(dlp); dlp.connect(fb); fb.connect(dly); dlp.connect(out); dlp.connect(verbIn);
    // sidechained bus for bass + pads
    const duck = ctx.createGain(); duck.connect(out);
    // drum bus saturation
    const sat = ctx.createWaveShaper();
    const curve = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = (i / 1023) * 2 - 1; curve[i] = Math.tanh(x * 2.2) / Math.tanh(2.2); }
    sat.curve = curve; sat.connect(out);

    const nz = (t, dur) => { const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; s.start(t, rng() * 2); s.stop(t + dur + 0.05); return s; };
    const filt = (type, f, q = 0.7) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
    const gain = v => { const g = ctx.createGain(); g.gain.value = v; return g; };
    const perc = (g, t, a, peak, d) => { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); };
    const chain = (...n) => { for (let i = 0; i < n.length - 1; i++) n[i].connect(n[i + 1]); return n[n.length - 1]; };

    function kick(t, amp = 1) {
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(175, t); o.frequency.exponentialRampToValueAtTime(52, t + 0.085); o.frequency.exponentialRampToValueAtTime(40, t + 0.45);
      const g = gain(0); perc(g, t, 0.002, amp, 0.44);
      chain(o, g, sat); o.start(t); o.stop(t + 0.55);
      const c = nz(t, 0.03), cg = gain(0); perc(cg, t, 0.001, 0.3 * amp, 0.018);
      chain(c, filt('highpass', 2500), cg, sat);
      duck.gain.setValueAtTime(0.28, t); duck.gain.linearRampToValueAtTime(1, t + 0.24);
    }
    function clap(t, amp = 0.5) {
      const s = nz(t, 0.35), bp = filt('bandpass', 1350, 0.9), g = gain(0);
      g.gain.setValueAtTime(0, t);
      for (let k = 0; k < 3; k++) { g.gain.setValueAtTime(amp, t + k * 0.011); g.gain.exponentialRampToValueAtTime(amp * 0.08, t + k * 0.011 + 0.0095); }
      g.gain.setValueAtTime(amp, t + 0.033); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
      chain(s, bp, g, out); g.connect(verbIn);
    }
    function snare(t, amp) {
      const s = nz(t, 0.12), g = gain(0); perc(g, t, 0.001, amp, 0.09);
      chain(s, filt('bandpass', 1900, 0.8), g, out); g.connect(verbIn);
    }
    function hat(t, amp = 0.1, d = 0.035) {
      const s = nz(t, d + 0.05), g = gain(0); perc(g, t, 0.001, amp, d);
      const p = ctx.createStereoPanner(); p.pan.value = (rng() - 0.5) * 0.6;
      chain(s, filt('highpass', 7800), g, p, out);
    }
    function bass(t, f, dur, amp = 0.32) {
      const lp = filt('lowpass', 1600, 5), g = gain(0);
      lp.frequency.setValueAtTime(1700, t); lp.frequency.exponentialRampToValueAtTime(240, t + dur);
      for (const det of [-8, 8]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + dur + 0.1); }
      const sub = ctx.createOscillator(); sub.frequency.value = f; const sg = gain(0.5); chain(sub, sg, g); sub.start(t); sub.stop(t + dur + 0.1);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + 0.006); g.gain.setValueAtTime(amp, t + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      chain(lp, g, duck);
    }
    function pad(t, tones, dur, amp = 0.045, cutoff = 1300) {
      const lp = filt('lowpass', cutoff, 0.8), g = gain(0);
      for (const f of tones) for (const det of [-12, 0, 12]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + dur + 0.6); }
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(amp, t + 0.12); g.gain.setValueAtTime(amp, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 0.5);
      chain(lp, g, duck); const s = gain(0.6); g.connect(s); s.connect(verbIn);
    }
    function pluck(t, f, amp = 0.07) {
      const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f;
      const lp = filt('lowpass', 4000, 3); lp.frequency.setValueAtTime(4200, t); lp.frequency.exponentialRampToValueAtTime(500, t + 0.16);
      const g = gain(0); perc(g, t, 0.002, amp, 0.2);
      chain(o, lp, g, out); g.connect(dIn); g.connect(verbIn);
      o.start(t); o.stop(t + 0.3);
    }
    function bell(t, f, amp = 0.16, d = 1.6) {
      for (const [m, a] of [[1, 1], [2.01, 0.35], [3.02, 0.15], [4.17, 0.08]]) {
        const o = ctx.createOscillator(); o.frequency.value = f * m;
        const g = gain(0); perc(g, t, 0.003, amp * a, d / m);
        chain(o, g, out); g.connect(verbIn); g.connect(dIn);
        o.start(t); o.stop(t + d + 0.1);
      }
    }
    function whoosh(t0, t1, amp = 0.3, up = true) {
      const s = nz(t0, t1 - t0 + 0.3), bp = filt('bandpass', 400, 1.3), g = gain(0), p = ctx.createStereoPanner();
      const [fa, fb2] = up ? [300, 6000] : [6000, 300];
      bp.frequency.setValueAtTime(fa, t0); bp.frequency.exponentialRampToValueAtTime(fb2, t1);
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(amp, t1 - 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t1 + 0.25);
      p.pan.setValueAtTime(-0.7, t0); p.pan.linearRampToValueAtTime(0.7, t1 + 0.2);
      chain(s, bp, g, p, out); g.connect(verbIn);
    }
    function sub(t, f0, f1, dur, amp) {
      const o = ctx.createOscillator(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      const g = gain(0); perc(g, t, 0.004, amp, dur);
      chain(o, g, out); o.start(t); o.stop(t + dur + 0.1);
    }
    function riser(t0, t1) {
      const s = nz(t0, t1 - t0), hp = filt('highpass', 200, 2), g = gain(0);
      hp.frequency.setValueAtTime(200, t0); hp.frequency.exponentialRampToValueAtTime(9000, t1);
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(0.32, t1 - 0.02); g.gain.linearRampToValueAtTime(0, t1);
      chain(s, hp, g, out); g.connect(verbIn);
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(N.F2, t0); o.frequency.exponentialRampToValueAtTime(N.F2 * 16, t1);
      const lp = filt('lowpass', 2800, 4), og = gain(0);
      og.gain.setValueAtTime(0, t0); og.gain.linearRampToValueAtTime(0.07, t1 - 0.02); og.gain.linearRampToValueAtTime(0, t1);
      chain(o, lp, og, out); o.start(t0); o.stop(t1);
    }
    function impact(t) {
      kick(t, 1.25);
      sub(t, 78, 28, 1.8, 0.85);
      const c = nz(t, 2.6), g = gain(0); perc(g, t, 0.002, 0.34, 2.3);
      chain(c, filt('highpass', 500), filt('lowpass', 9000), g, out); g.connect(verbIn);
      const b = nz(t, 1.3), bg = gain(0); perc(bg, t, 0.002, 0.9, 1.0);
      chain(b, filt('lowpass', 160, 1.5), bg, out);
    }
    function glitch(t0, t1) {
      const r = mulberry32(5), step = BEAT / 8, notes = [880, 1320, 660, 1760, 990, 440];
      for (let t = t0, k = 0; t < t1; t += step, k++) {
        const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = notes[Math.floor(r() * notes.length)];
        const g = gain(0); perc(g, t, 0.001, 0.05 + 0.03 * (k / 6), step * 0.7);
        chain(o, g, out); o.start(t); o.stop(t + step);
        if (k % 2) { const s = nz(t, step), ng = gain(0); perc(ng, t, 0.001, 0.12, step * 0.5); chain(s, filt('bandpass', 3000 + r() * 4000, 2), ng, out); }
      }
    }

    // ---------------- arrangement ----------------
    // bar 0 — ignition
    bell(0.01, 698.46, 0.2, 2.2);
    sub(0.0, 60, 40, 0.9, 0.5);
    whoosh(BEAT - 0.08, BEAT + 0.22, 0.26);
    kick(BEAT, 0.9); kick(2 * BEAT); kick(3 * BEAT);
    pad(2 * BEAT, CHORDS.Fm.tones, BAR - 2 * BEAT - 0.1, 0.03, 700);
    glitch(1.58, BAR - 0.02);

    for (let bar = 1; bar < 8; bar++) {
      const t0 = bar * BAR, ch = CHORDS[PROG[bar]];
      if (bar <= 5) {
        for (let b = 0; b < 4; b++) kick(t0 + b * BEAT);
        clap(t0 + BEAT); clap(t0 + 3 * BEAT);
        for (let b = 0; b < 4; b++) {
          hat(t0 + (b + 0.5) * BEAT, 0.11, b % 2 ? 0.07 : 0.04);
          if (bar >= 3) { hat(t0 + (b + 0.25) * BEAT, 0.04); hat(t0 + (b + 0.75) * BEAT, 0.05); }
          bass(t0 + (b + 0.5) * BEAT, ch.root, BEAT * 0.45);
        }
        pad(t0, ch.tones, BAR - 0.05, 0.04, bar >= 4 ? 2200 : 1300);
      }
      if (bar >= 2 && bar <= 5) {
        const tones = [ch.tones[0] * 2, ch.tones[1] * 2, ch.tones[2] * 2, ch.tones[0] * 4];
        const pat = [0, 1, 2, 3, 2, 1, 2, 0, 3, 1, 2, 3, 0, 2, 1, 3];
        const on = [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1];
        for (let s = 0; s < 16; s++) if (on[s]) pluck(t0 + s * BEAT / 4, tones[pat[s]], 0.05 + 0.015 * (s % 4 === 0));
      }
      if (bar === 6) {
        kick(t0); kick(t0 + BEAT); clap(t0 + BEAT);
        bass(t0, ch.root, BEAT * 1.8, 0.3);
        pad(t0, ch.tones, BAR - 0.05, 0.045, 2600);
        hat(t0 + 0.5 * BEAT, 0.1); hat(t0 + 1.5 * BEAT, 0.1);
        // snare roll: 16ths → 32nds
        for (let s = 0; s < 4; s++) snare(t0 + 2 * BEAT + s * BEAT / 4, 0.12 + s * 0.03);
        for (let s = 0; s < 8; s++) snare(t0 + 3 * BEAT + s * BEAT / 8, 0.26 + s * 0.035);
      }
      if (bar === 7) {
        impact(t0);
        pad(t0, [N.F3, N.Ab3, N.C4, N.Eb4], BAR, 0.05, 3200);
        bell(t0 + 0.46, 1396.91, 0.2, 2.4);
        const arp = [N.F3 * 4, N.C4 * 4, N.Ab3 * 4, N.Eb4 * 2, N.C4 * 2];
        for (let s = 0; s < 5; s++) pluck(t0 + BEAT + s * BEAT / 2, arp[s], 0.045 - s * 0.006);
        bass(t0, N.F2, BAR, 0.18);
      }
    }
    // transitions & sound design
    whoosh(2 * BAR - 0.3, 2 * BAR + 0.12, 0.3);
    whoosh(3 * BAR - 0.4, 3 * BAR, 0.28);
    const bs = nz(3 * BAR, 0.8), bsg = gain(0); perc(bsg, 3 * BAR, 0.002, 0.3, 0.7);
    chain(bs, filt('lowpass', 2500), bsg, out); bsg.connect(verbIn);
    whoosh(4 * BAR - 0.6, 4 * BAR - 0.02, 0.3, false);
    bell(4 * BAR + 0.02, 1046.5, 0.12, 1.4);
    whoosh(5 * BAR - 0.25, 5 * BAR + 0.08, 0.36);
    whoosh(6 * BAR - 0.3, 6 * BAR + 0.1, 0.3);
    riser(6 * BAR + 0.1, 7 * BAR);
  }

  function toWav(buf) {
    const ch = buf.numberOfChannels, len = buf.length, sr = buf.sampleRate;
    const ab = new ArrayBuffer(44 + len * ch * 2), v = new DataView(ab);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + len * ch * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, ch, true); v.setUint32(24, sr, true);
    v.setUint32(28, sr * ch * 2, true); v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true);
    w(36, 'data'); v.setUint32(40, len * ch * 2, true);
    const data = []; for (let c = 0; c < ch; c++) data.push(buf.getChannelData(c));
    let o = 44;
    for (let i = 0; i < len; i++) for (let c = 0; c < ch; c++) { const s = Math.max(-1, Math.min(1, data[c][i])); v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2; }
    return ab;
  }

  window.ReelAudio = {
    async render(sr = 48000) {
      const ctx = new OfflineAudioContext(2, Math.ceil(sr * DUR), sr);
      build(ctx);
      return ctx.startRendering();
    },
    toWav,
  };
})();
