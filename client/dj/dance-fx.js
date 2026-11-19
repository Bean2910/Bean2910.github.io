/**
 * Audio-Reactive Dance Engine for Players, Remote Peers, and Temple Bots
 * Drives Monk character rigs cleanly from FxSoundDsp beat/spectrum telemetry.
 */

export const DANCE_STYLES = [
  { id: 'dj', name: 'Quẩy DJ', icon: '🎧', desc: 'Nhún bass mạnh & vung tay theo nhịp' },
  { id: 'zen', name: 'Múa Thiền', icon: '🪷', desc: 'Vung tay uyển chuyển an nhiên theo giai điệu' },
  { id: 'spin', name: 'Xoay Disco', icon: '🪩', desc: 'Chỉ tay 70s & xoay nhịp sân khấu' }
];

const DEFAULT_GROOVE_HZ = 2.05; // ~123 BPM fallback when audio DSP isn't actively feeding FFT

export class BeatTracker {
  constructor(dsp) {
    this.dsp = dsp;
    this.phase = 0;
    this.bassEnv = 0;
    this.prevBass = 0;
    this.kick = 0;
    this.energy = 0.35;
    this.musicActive = false;
  }

  update(dt, discoActive = false) {
    const meter = this.dsp?.getMeter ? this.dsp.getMeter() : null;
    const liveAudio = Boolean(meter && meter.playing && meter.rms > 0.015);
    this.musicActive = liveAudio || Boolean(discoActive);

    const bass = liveAudio ? Math.min(1, meter.bass * 1.45) : 0;
    const mid = liveAudio ? Math.min(1, meter.mid * 1.4) : 0;
    const high = liveAudio ? Math.min(1, meter.high * 1.5) : 0;

    // Peak kick transient detector
    const delta = bass - this.prevBass;
    this.prevBass = bass;
    if (delta > 0.08 && bass > 0.28) {
      this.kick = Math.min(1, Math.max(this.kick, 0.55 + bass * 0.6));
    }
    this.kick = Math.max(0, this.kick - dt * 4.2);
    this.bassEnv += (bass - this.bassEnv) * Math.min(1, dt * 14);

    if (liveAudio) {
      this.energy = 0.45 + this.bassEnv * 0.55 + mid * 0.25 + high * 0.15;
      const spd = 1.65 + this.bassEnv * 1.45 + mid * 0.45;
      this.phase += dt * Math.PI * 2 * spd;
    } else {
      const discoMult = discoActive ? 1.15 : 0.92;
      this.energy = discoActive ? 0.72 : 0.56;
      this.phase += dt * Math.PI * 2 * DEFAULT_GROOVE_HZ * discoMult;
      const pulse = Math.pow(Math.max(0, Math.sin(this.phase)), 8);
      this.kick = Math.max(this.kick, pulse * (discoActive ? 0.65 : 0.35));
    }

    return {
      phase: this.phase,
      kick: this.kick,
      bass: this.bassEnv,
      mid,
      high,
      energy: this.energy,
      musicActive: this.musicActive
    };
  }
}

/**
 * Applies smooth procedural dance pose to any Monk rig (local Q, remote CT.monk, or BotFx monk).
 * Call cleanly right AFTER monk.update(dt, elapsed, speed).
 */
export function applyMonkDance(monk, style, dt, beat, active, phaseOffset = 0) {
  if (!monk || !monk.body) return;

  const canDance = Boolean(
    active &&
    !monk.busy &&
    !(monk.sweepLeft > 0) &&
    !(monk.countLeft > 0) &&
    monk.state !== 'walk'
  );

  if (monk._danceMix === undefined) monk._danceMix = 0;
  const targetMix = canDance ? 1 : 0;
  monk._danceMix += (targetMix - monk._danceMix) * Math.min(1, dt * 8.5);
  const mix = monk._danceMix;

  if (mix < 0.01) {
    if (monk._wasDancing) {
      monk._wasDancing = false;
      monk.body.rotation.y = 0;
    }
    return;
  }

  monk._wasDancing = true;
  if (monk.held && mix > 0.22) {
    monk.held.visible = false;
  }

  const ph = (beat?.phase || 0) + phaseOffset;
  const kick = beat?.kick || 0;
  const amp = Math.min(1.35, beat?.energy || 0.7);
  const sit = monk.sitBlend || 0;

  // Seated Cushion Groove vs Standing Full Dance
  if (sit > 0.5) {
    const bounce = Math.abs(Math.sin(ph)) * (0.04 + kick * 0.05) * amp;
    const sway = Math.sin(ph * 0.5) * 0.14 * amp;
    monk.body.position.y += bounce * mix;
    monk.body.rotation.z = monk.body.rotation.z * (1 - mix) + sway * mix;
    monk.body.rotation.x = monk.body.rotation.x * (1 - mix) + (Math.sin(ph) * 0.12 * amp) * mix;
    monk.body.rotation.y *= 1 - mix;
    if (monk.head) {
      monk.head.rotation.x += Math.sin(ph) * 0.16 * amp * mix;
      monk.head.rotation.z = Math.sin(ph * 0.5) * 0.11 * mix;
    }
    monk.arms?.forEach((arm, idx) => {
      const s = idx === 0 ? -1 : 1;
      const clapWave = Math.sin(ph + (idx === 0 ? 0 : 0.4)) * 0.35;
      arm.rotation.x = arm.rotation.x * (1 - mix) + (-1.25 - clapWave * amp) * mix;
      arm.rotation.z = arm.rotation.z * (1 - mix) + (s * (0.35 + Math.cos(ph * 0.5) * 0.18)) * mix;
    });
    return;
  }

  // Standing Full Dance Styles
  const bounce = Math.abs(Math.sin(ph)) * (0.085 + kick * 0.08) * amp;
  const squash = 1 - Math.abs(Math.sin(ph)) * 0.08 * amp;
  monk.body.position.y += bounce * mix;
  monk.body.scale.set(
    (1 + (1 - squash) * 0.8) * mix + (1 + sit * 0.25) * (1 - mix),
    squash * mix + (1 - sit * 0.12) * (1 - mix),
    (1 + (1 - squash) * 0.8) * mix + (1 + sit * 0.2) * (1 - mix)
  );

  if (style === 'zen') {
    const sway = Math.sin(ph * 0.5) * 0.13 * amp;
    monk.body.rotation.z = monk.body.rotation.z * (1 - mix) + sway * mix;
    monk.body.rotation.y = (Math.sin(ph * 0.5) * 0.28) * mix;
    monk.body.rotation.x = (Math.sin(ph) * 0.06) * mix;
    if (monk.head) {
      monk.head.rotation.x += Math.sin(ph * 0.5) * 0.10 * mix;
      monk.head.rotation.y = Math.sin(ph * 0.5) * 0.18 * mix;
    }
    monk.arms?.forEach((arm, idx) => {
      const s = idx === 0 ? -1 : 1;
      const flowX = -0.95 - Math.sin(ph * 0.5 + idx * 1.4) * 0.72 * amp;
      const flowZ = s * (0.55 + Math.cos(ph * 0.5 + idx * 1.1) * 0.38);
      arm.rotation.x = arm.rotation.x * (1 - mix) + flowX * mix;
      arm.rotation.z = arm.rotation.z * (1 - mix) + flowZ * mix;
    });
  } else if (style === 'spin') {
    const discoPoint = Math.sin(ph * 0.5);
    monk.body.rotation.y = (ph * 0.5) * mix;
    monk.body.rotation.z = monk.body.rotation.z * (1 - mix) + (Math.sin(ph) * 0.12 * amp) * mix;
    monk.body.rotation.x = (Math.cos(ph) * 0.10) * mix;
    if (monk.head) {
      monk.head.rotation.x += Math.sin(ph) * 0.16 * amp * mix;
    }
    monk.arms?.forEach((arm, idx) => {
      const s = idx === 0 ? -1 : 1;
      const up = idx === 0 ? discoPoint > 0 : discoPoint <= 0;
      const ax = up ? -2.45 - kick * 0.35 : -0.55 + Math.sin(ph) * 0.35;
      const az = s * (up ? 0.42 : 0.85);
      arm.rotation.x = arm.rotation.x * (1 - mix) + ax * mix;
      arm.rotation.z = arm.rotation.z * (1 - mix) + az * mix;
    });
  } else {
    // 'dj': Energetic bass pump & groove sway
    const sway = Math.sin(ph * 0.5) * 0.17 * amp;
    monk.body.rotation.z = monk.body.rotation.z * (1 - mix) + sway * mix;
    monk.body.rotation.y = Math.sin(ph * 0.5) * 0.36 * mix;
    monk.body.rotation.x = (0.06 + Math.sin(ph) * 0.14 * amp) * mix;
    if (monk.head) {
      monk.head.rotation.x += (0.08 + Math.sin(ph) * 0.24 * amp) * mix;
      monk.head.rotation.z = -sway * 0.65 * mix;
    }
    monk.arms?.forEach((arm, idx) => {
      const s = idx === 0 ? -1 : 1;
      const pump = Math.sin(ph + (idx ? Math.PI : 0));
      const ax = -1.78 - pump * 0.58 * amp - kick * 0.25;
      const az = s * (0.42 + Math.cos(ph * 0.5) * 0.25);
      arm.rotation.x = arm.rotation.x * (1 - mix) + ax * mix;
      arm.rotation.z = arm.rotation.z * (1 - mix) + az * mix;
    });
  }

  monk.feet?.forEach((f, idx) => {
    const s = idx === 0 ? 1 : -1;
    const stepLift = Math.max(0, Math.sin(ph + (idx ? Math.PI : 0))) * 0.06 * amp;
    const stepSlide = Math.sin(ph * 0.5) * 0.05 * s;
    f.position.y += stepLift * mix;
    f.position.z += stepSlide * mix;
  });
}

export class DanceController {
  constructor(dsp, deps = {}) {
    this.dsp = dsp;
    this.deps = deps;
    this.beatTracker = new BeatTracker(dsp);
    this.style = 'dj';
    this.active = false;
    this.listeners = new Set();
    this._lastBeat = { phase: 0, kick: 0, bass: 0, mid: 0, high: 0, energy: 0.5, musicActive: false };
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  _emit() {
    for (const fn of this.listeners) {
      try {
        fn(this);
      } catch {}
    }
  }

  setStyle(styleId, startIfStopped = true) {
    const valid = DANCE_STYLES.find((s) => s.id === styleId);
    if (!valid) return;
    this.style = valid.id;
    if (startIfStopped && !this.active) {
      this.active = true;
      this.deps.standUpIfWalking?.();
    }
    if (this.active) {
      this.deps.sendEmote?.('dance-' + this.style);
    }
    this._emit();
  }

  start(styleId) {
    const valid = DANCE_STYLES.find((s) => s.id === styleId);
    if (valid) this.style = valid.id;
    this.active = true;
    this.deps.sendEmote?.('dance-' + this.style);
    const meta = DANCE_STYLES.find((s) => s.id === this.style) || DANCE_STYLES[0];
    this.deps.toast?.(`🕺 Đang ${meta.name} theo nhạc! Nhấn J hoặc di chuyển để dừng`, 2800);
    this._emit();
  }

  stop(quiet = false) {
    if (!this.active) return;
    this.active = false;
    this.deps.sendEmote?.('dance-off');
    if (!quiet) {
      this.deps.toast?.('Đã dừng nhảy theo nhạc', 1800);
    }
    this._emit();
  }

  toggle(styleId) {
    if (styleId && styleId !== this.style) {
      this.start(styleId);
      return true;
    }
    if (this.active) {
      this.stop(false);
      return false;
    }
    this.start(styleId || this.style);
    return true;
  }

  cycleStyle() {
    const idx = DANCE_STYLES.findIndex((s) => s.id === this.style);
    const nxt = DANCE_STYLES[(idx + 1) % DANCE_STYLES.length];
    this.start(nxt.id);
    return nxt.id;
  }

  tick(dt, discoActive = false) {
    this._lastBeat = this.beatTracker.update(dt, discoActive);
    return this._lastBeat;
  }

  applyMyDance(monk, moving, busy, dt) {
    if (this.active && (moving || busy)) {
      this.stop(true);
    }
    applyMonkDance(monk, this.style, dt, this._lastBeat, this.active && !moving && !busy, 0);
  }

  applyPeerDance(monk, info, dt) {
    const dStyle = typeof info?.dance === 'string' && info.dance ? info.dance : '';
    const active = Boolean(dStyle) && monk.state !== 'walk';
    applyMonkDance(monk, dStyle || 'dj', dt, this._lastBeat, active, ((info?.id || 1) * 1.13) % (Math.PI * 2));
  }

  applyBotDance(bot, idx, shouldDance, dt) {
    if (!bot?.monk) return;
    const style = DANCE_STYLES[idx % DANCE_STYLES.length].id;
    applyMonkDance(bot.monk, style, dt, this._lastBeat, Boolean(shouldDance) && bot.monk.state !== 'walk', idx * 0.9);
  }
}
