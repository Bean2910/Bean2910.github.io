/**
 * FxSound Web Audio DSP Engine & Built-in DJ Deck
 * Pure Web Audio API implementation modeled after https://github.com/fxsound2/fxsound-app DSP pipeline:
 *   Input -> EQ Bands (5..31) -> Bass Boost -> Clarity -> Ambience Reverb -> Surround Width
 *   -> Dynamic Boost & Volume Leveling Compressor -> Balance L/R -> Master Gain -> Limiter -> Analyser
 */

import {
  BAND_FREQS,
  FACTORY_PRESETS,
  calcBandQ,
  clampGain,
  getDefaultFreqs,
  getDefaultState,
  loadSavedEqState,
  remapBandGains,
  saveEqState
} from './fxsound-presets.js';

function dbToLinear(db) {
  return Math.pow(10, (Number(db) || 0) / 20);
}

function buildImpulseResponse(ctx, seconds = 1.45, decay = 2.6) {
  const rate = ctx.sampleRate || 44100;
  const len = Math.max(1, Math.floor(rate * seconds));
  const buf = ctx.createBuffer(2, len, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    let prev = 0;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      const env = Math.pow(1 - t, decay) * (1 - Math.exp(-i / (rate * 0.008)));
      const white = Math.random() * 2 - 1;
      prev = prev * 0.38 + white * 0.62;
      data[i] = prev * env;
    }
  }
  return buf;
}

const SPECTRUM_BAND_CENTERS = [48, 95, 175, 340, 680, 1300, 2500, 4800, 9200, 15500];

export class FxSoundDsp {
  constructor() {
    this.state = loadSavedEqState();
    this.ctx = null;
    this.inputNode = null;
    this.outputSink = null;

    this.eqFilters = [];
    this.attachedSources = new WeakMap();
    this.registeredNodes = new Set();
    this.listeners = new Set();

    // Built-in DJ Deck state
    this.deckEl = null;
    this.deckMediaNode = null;
    this.deckGainNode = null;
    this.deckPannerNode = null;
    this.deckTracks = [];
    this.deckIndex = 0;
    this.deckCustomName = '';
    this.deckBlobUrl = '';
    this.deckPlaying = false;
    this.deckVolume = 0.85;
    this.spatialGain = 1;
    this.spatialPan = 0;
    this.deckRate = 1.0;
    this.deckLoop = false;
    this.deckSolo = true;
    this._errSkips = 0;

    this._freqBins = null;
    this._spec10 = new Float32Array(10);
    this._meter = { bass: 0, mid: 0, high: 0, rms: 0, playing: false };
    this._respMag = null;
    this._respPhase = null;
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  _emit() {
    saveEqState(this.state);
    for (const fn of this.listeners) {
      try {
        fn(this.state, this);
      } catch {
        // Isolate subscriber exceptions
      }
    }
  }

  /**
   * Ensures AudioContext & DSP graph are built for the target context
   */
  attachContext(audioCtx) {
    if (!audioCtx) return null;
    if (this.ctx === audioCtx && this.inputNode) {
      this._routeDeckIfNeeded();
      return this.inputNode;
    }
    this.ctx = audioCtx;
    this._buildGraph();
    this._routeDeckIfNeeded();
    return this.inputNode;
  }

  getOrCreateContext() {
    if (this.ctx) return this.ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC();
    this.attachContext(ctx);
    return ctx;
  }

  /**
   * Connects an external AudioNode (such as Sh.gain, h0.gain, so.gain, Ne.master) through the DSP chain
   */
  connectSourceNode(node, ctx) {
    if (!node) return;
    if (ctx && this.ctx !== ctx) {
      this.attachContext(ctx);
    }
    if (!this.ctx || !this.inputNode) {
      this.registeredNodes.add(node);
      return;
    }
    if (this.attachedSources.get(node) === this.inputNode) return;
    try {
      node.disconnect();
    } catch {
      // May not have prior connections
    }
    try {
      node.connect(this.inputNode);
      this.attachedSources.set(node, this.inputNode);
      this.registeredNodes.add(node);
    } catch {
      // Cross-context guard: connect fallback destination
    }
  }

  flushRegistry(list) {
    if (!list) return;
    for (const entry of list) {
      if (entry?.node) {
        this.connectSourceNode(entry.node, entry.ctx);
      }
    }
  }

  _buildGraph() {
    const ctx = this.ctx;
    if (!ctx) return;

    this.inputNode = ctx.createGain();
    this.inputNode.gain.value = 1;

    // Bypass path (smooth dry toggle when Power OFF)
    this.dryGain = ctx.createGain();
    this.wetBusGain = ctx.createGain();

    // EQ chain container endpoints
    this.eqIn = ctx.createGain();
    this.eqOut = ctx.createGain();

    // Bass Boost stage (~68 Hz lowshelf + 115 Hz punch)
    this.bassShelf = ctx.createBiquadFilter();
    this.bassShelf.type = 'lowshelf';
    this.bassShelf.frequency.value = 68;
    this.bassPunch = ctx.createBiquadFilter();
    this.bassPunch.type = 'peaking';
    this.bassPunch.frequency.value = 115;
    this.bassPunch.Q.value = 0.9;

    // Clarity stage (presence 3.1 kHz + air highshelf 9.2 kHz)
    this.clarityPresence = ctx.createBiquadFilter();
    this.clarityPresence.type = 'peaking';
    this.clarityPresence.frequency.value = 3100;
    this.clarityPresence.Q.value = 0.85;
    this.clarityAir = ctx.createBiquadFilter();
    this.clarityAir.type = 'highshelf';
    this.clarityAir.frequency.value = 9000;

    // Ambience parallel reverb (procedural IR + damping)
    this.ambienceDry = ctx.createGain();
    this.ambienceDry.gain.value = 1;
    this.ambienceWet = ctx.createGain();
    this.ambienceConvolver = ctx.createConvolver();
    this.ambienceConvolver.buffer = buildImpulseResponse(ctx, 1.4, 2.5);
    this.ambienceDamp = ctx.createBiquadFilter();
    this.ambienceDamp.type = 'lowpass';
    this.ambienceDamp.frequency.value = 5400;

    // Surround widening stage (Mid + Side Haas spread)
    this.surrSum = ctx.createGain();
    this.surrSplitter = ctx.createChannelSplitter(2);
    this.surrMerger = ctx.createChannelMerger(2);
    this.surrDelayL = ctx.createDelay(0.05);
    this.surrDelayR = ctx.createDelay(0.05);
    this.surrDelayL.delayTime.value = 0.0025;
    this.surrDelayR.delayTime.value = 0.0072;
    this.surrWetL = ctx.createGain();
    this.surrWetR = ctx.createGain();
    this.surrDryGain = ctx.createGain();
    this.surrDryGain.gain.value = 1;

    // Dynamic Boost + Volume Leveling compressor & safety limiter
    this.compressor = ctx.createDynamicsCompressor();
    this.makeupGain = ctx.createGain();
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -1.5;
    this.limiter.knee.value = 3;
    this.limiter.ratio.value = 14;
    this.limiter.attack.value = 0.002;
    this.limiter.release.value = 0.08;

    // Balance L/R matching FxSound GraphicEqSetBalance
    this.balSplitter = ctx.createChannelSplitter(2);
    this.balMerger = ctx.createChannelMerger(2);
    this.balGainL = ctx.createGain();
    this.balGainR = ctx.createGain();

    // Master Gain + Shared Analyser
    this.masterGainNode = ctx.createGain();
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.78;
    this._freqBins = new Uint8Array(this.analyser.frequencyBinCount);

    // Connect static DSP wiring
    this.inputNode.connect(this.dryGain);
    this.dryGain.connect(this.analyser);

    this.inputNode.connect(this.eqIn);
    this._rebuildEqFilters();

    this.eqOut
      .connect(this.bassShelf)
      .connect(this.bassPunch)
      .connect(this.clarityPresence)
      .connect(this.clarityAir);

    // Parallel Ambience
    this.clarityAir.connect(this.ambienceDry);
    this.ambienceDry.connect(this.surrSum);

    this.clarityAir.connect(this.ambienceDamp);
    this.ambienceDamp.connect(this.ambienceConvolver);
    this.ambienceConvolver.connect(this.ambienceWet);
    this.ambienceWet.connect(this.surrSum);

    // Surround widening matrix (parallel stereo Haas width)
    this.surrSum.connect(this.surrDryGain);
    this.surrDryGain.connect(this.compressor);

    this.surrSum.connect(this.surrSplitter);
    this.surrSplitter.connect(this.surrDelayL, 1);
    this.surrSplitter.connect(this.surrDelayR, 0);
    this.surrDelayL.connect(this.surrWetL);
    this.surrDelayR.connect(this.surrWetR);
    this.surrWetL.connect(this.surrMerger, 0, 0);
    this.surrWetR.connect(this.surrMerger, 0, 1);
    this.surrMerger.connect(this.compressor);

    // Compressor -> Makeup -> Balance -> Master -> Limiter -> WetBus -> Analyser -> Destination
    this.compressor.connect(this.makeupGain);
    this.makeupGain.connect(this.balSplitter);
    this.balSplitter.connect(this.balGainL, 0);
    this.balSplitter.connect(this.balGainR, 1);
    this.balGainL.connect(this.balMerger, 0, 0);
    this.balGainR.connect(this.balMerger, 0, 1);
    this.balMerger.connect(this.masterGainNode);
    this.masterGainNode.connect(this.limiter);
    this.limiter.connect(this.wetBusGain);
    this.wetBusGain.connect(this.analyser);

    this.analyser.connect(ctx.destination);

    // Re-attach previously registered external nodes
    for (const node of this.registeredNodes) {
      if (this.attachedSources.get(node) !== this.inputNode) {
        try {
          node.disconnect();
          node.connect(this.inputNode);
          this.attachedSources.set(node, this.inputNode);
        } catch {
          // Safe fallback if node belongs to closed context
        }
      }
    }

    this._applyParams(true);
  }

  _rebuildEqFilters() {
    if (!this.ctx || !this.eqIn || !this.eqOut) return;
    for (const f of this.eqFilters) {
      try {
        f.disconnect();
      } catch {}
    }
    this.eqIn.disconnect();

    const n = this.state.numBands || 10;
    const q = calcBandQ(this.state.bandFreqs, this.state.filterQ);
    this.eqFilters = [];

    let prev = this.eqIn;
    for (let i = 0; i < n; i++) {
      const bq = this.ctx.createBiquadFilter();
      bq.type = 'peaking';
      bq.frequency.value = Math.max(20, Math.min(20000, this.state.bandFreqs[i] ?? 1000));
      bq.Q.value = q;
      bq.gain.value = this.state.eqOn ? clampGain(this.state.bandGains[i] ?? 0) : 0;
      prev.connect(bq);
      prev = bq;
      this.eqFilters.push(bq);
    }
    prev.connect(this.eqOut);
  }

  _applyParams(immediate = false) {
    if (!this.ctx || !this.inputNode) return;
    const t = this.ctx.currentTime;
    const setParam = (param, val) => {
      if (!param) return;
      if (immediate) param.setValueAtTime(val, t);
      else param.setTargetAtTime(val, t, 0.025);
    };

    const st = this.state;
    const pwr = Boolean(st.powerOn);

    setParam(this.dryGain.gain, pwr ? 0 : 1);
    setParam(this.wetBusGain.gain, pwr ? 1 : 0);

    // EQ bands
    if (this.eqFilters.length !== st.bandFreqs.length) {
      this._rebuildEqFilters();
    } else {
      const q = calcBandQ(st.bandFreqs, st.filterQ);
      this.eqFilters.forEach((bq, i) => {
        setParam(bq.frequency, Math.max(20, Math.min(20000, st.bandFreqs[i] ?? 1000)));
        setParam(bq.Q, q);
        setParam(bq.gain, st.eqOn ? clampGain(st.bandGains[i] ?? 0) : 0);
      });
    }

    // Bass Boost (0..10)
    const bassAmt = Math.max(0, Math.min(10, st.effects.bass || 0)) / 10;
    setParam(this.bassShelf.gain, bassAmt * 9.0);
    setParam(this.bassPunch.gain, bassAmt * 3.5);

    // Clarity (0..10)
    const clarityAmt = Math.max(0, Math.min(10, st.effects.clarity || 0)) / 10;
    setParam(this.clarityPresence.gain, clarityAmt * 5.2);
    setParam(this.clarityAir.gain, clarityAmt * 7.8);

    // Ambience (0..10)
    const ambAmt = Math.max(0, Math.min(10, st.effects.ambience || 0)) / 10;
    setParam(this.ambienceWet.gain, ambAmt * 0.44);
    setParam(this.ambienceDry.gain, 1 - ambAmt * 0.14);

    // Surround Sound (0..10)
    const surrAmt = Math.max(0, Math.min(10, st.effects.surround || 0)) / 10;
    setParam(this.surrWetL.gain, surrAmt * 0.38);
    setParam(this.surrWetR.gain, surrAmt * 0.38);

    // Dynamic Boost (0..10) + Volume Leveling (0..4 dB)
    const dynAmt = Math.max(0, Math.min(10, st.effects.dynamicBoost || 0)) / 10;
    const lvlDb = Math.max(0, Math.min(4, st.volumeLeveling || 0));
    setParam(this.compressor.threshold, -6 - dynAmt * 20 - lvlDb * 1.5);
    setParam(this.compressor.ratio, 1.35 + dynAmt * 3.8 + lvlDb * 0.35);
    setParam(this.compressor.knee, 14);
    setParam(this.compressor.attack, 0.005);
    setParam(this.compressor.release, 0.15);
    setParam(this.makeupGain.gain, dbToLinear(dynAmt * 4.5 + lvlDb * 1.1));

    // Stereo Balance (-10..+10 dB) matching GraphicEqSetBalance
    const bal = Math.max(-10, Math.min(10, st.balance || 0));
    setParam(this.balGainL.gain, bal > 0 ? dbToLinear(-bal * 1.5) : 1);
    setParam(this.balGainR.gain, bal < 0 ? dbToLinear(bal * 1.5) : 1);

    // Master Gain (-20..+20 dB)
    setParam(this.masterGainNode.gain, dbToLinear(Math.max(-20, Math.min(20, st.masterGain || 0))));
  }

  // ---- State Mutation API ----

  setPower(on) {
    this.state.powerOn = Boolean(on);
    this._applyParams();
    this._emit();
  }

  setEqOn(on) {
    this.state.eqOn = Boolean(on);
    this.state.presetModified = true;
    this._applyParams();
    this._emit();
  }

  setTheme(mode) {
    this.state.theme = mode === 'light' ? 'light' : 'dark';
    this._emit();
  }

  setEffect(key, value) {
    if (!(key in this.state.effects)) return;
    this.state.effects[key] = Math.max(0, Math.min(10, Number(value) || 0));
    this.state.presetModified = true;
    this._applyParams();
    this._emit();
  }

  setBandGain(index, gainDb) {
    if (index < 0 || index >= this.state.bandGains.length) return;
    this.state.bandGains[index] = clampGain(gainDb);
    this.state.presetModified = true;
    this._applyParams();
    this._emit();
  }

  setBandFreq(index, freqHz) {
    if (index < 0 || index >= this.state.bandFreqs.length) return;
    const f = Math.max(20, Math.min(20000, Number(freqHz) || 1000));
    this.state.bandFreqs[index] = Math.round(f * 10) / 10;
    this.state.presetModified = true;
    this._applyParams();
    this._emit();
  }

  setNumBands(numBands) {
    const n = [5, 10, 15, 20, 31].includes(Number(numBands)) ? Number(numBands) : 10;
    if (n === this.state.numBands) return;
    this.state.bandGains = remapBandGains(this.state.bandGains, n);
    this.state.bandFreqs = getDefaultFreqs(n);
    this.state.numBands = n;
    this.state.presetModified = true;
    this._rebuildEqFilters();
    this._applyParams();
    this._emit();
  }

  setMasterParam(key, val) {
    if (key === 'masterGain') this.state.masterGain = Math.max(-20, Math.min(20, Number(val) || 0));
    else if (key === 'volumeLeveling') this.state.volumeLeveling = Math.max(0, Math.min(4, Number(val) || 0));
    else if (key === 'filterQ') this.state.filterQ = Math.max(1, Math.min(3, Number(val) || 1));
    else if (key === 'balance') this.state.balance = Math.max(-10, Math.min(10, Number(val) || 0));
    else return;
    this._applyParams();
    this._emit();
  }

  flatEq() {
    this.state.bandGains = this.state.bandGains.map(() => 0);
    this.state.presetModified = true;
    this._applyParams();
    this._emit();
  }

  restoreDefaults() {
    const def = getDefaultState();
    const keepTheme = this.state.theme;
    this.state = { ...def, theme: keepTheme };
    this._rebuildEqFilters();
    this._applyParams();
    this._emit();
  }

  applyPreset(preset) {
    if (!preset) return;
    const n = Number(preset.numBands) || preset.bandGains?.length || 10;
    const validN = [5, 10, 15, 20, 31].includes(n) ? n : 10;
    const freqs =
      Array.isArray(preset.bandFreqs) && preset.bandFreqs.length === validN
        ? [...preset.bandFreqs]
        : getDefaultFreqs(validN);
    const gains =
      Array.isArray(preset.bandGains) && preset.bandGains.length === validN
        ? preset.bandGains.map(clampGain)
        : remapBandGains(preset.bandGains || [], validN);

    this.state.presetId = preset.id || 'custom';
    this.state.presetModified = false;
    this.state.eqOn = preset.eqOn !== undefined ? Boolean(preset.eqOn) : true;
    this.state.numBands = validN;
    this.state.bandFreqs = freqs;
    this.state.bandGains = gains;
    this.state.effects = {
      clarity: Number(preset.effects?.clarity ?? 0),
      ambience: Number(preset.effects?.ambience ?? 0),
      surround: Number(preset.effects?.surround ?? 0),
      dynamicBoost: Number(preset.effects?.dynamicBoost ?? 0),
      bass: Number(preset.effects?.bass ?? 0)
    };
    this._rebuildEqFilters();
    this._applyParams();
    this._emit();
  }

  // ---- Analytics / Visualizer ----

  getFrequencyResponseDb(freqsHz) {
    const len = freqsHz.length;
    if (!this._respMag || this._respMag.length !== len) {
      this._respMag = new Float32Array(len);
      this._respPhase = new Float32Array(len);
    }
    const db = new Float32Array(len);
    if (!this.state.powerOn) return db;

    const st = this.state;
    const accumBiquad = (node) => {
      if (!node || typeof node.getFrequencyResponse !== 'function') return;
      node.getFrequencyResponse(freqsHz, this._respMag, this._respPhase);
      for (let i = 0; i < len; i++) {
        db[i] += 20 * Math.log10(Math.max(1e-4, this._respMag[i]));
      }
    };

    if (st.eqOn && this.eqFilters.length) {
      for (const f of this.eqFilters) accumBiquad(f);
    } else if (st.eqOn) {
      // Fallback visual curve approximation before AudioContext spins up
      const q = calcBandQ(st.bandFreqs, st.filterQ);
      for (let i = 0; i < len; i++) {
        let sum = 0;
        const f = freqsHz[i];
        for (let b = 0; b < st.bandFreqs.length; b++) {
          const fc = st.bandFreqs[b] || 1000;
          const oct = Math.log2(f / fc) * q * 1.4;
          sum += (st.bandGains[b] || 0) * Math.exp(-(oct * oct));
        }
        db[i] += sum;
      }
    }

    if (this.bassShelf && this.bassPunch && this.clarityPresence && this.clarityAir) {
      accumBiquad(this.bassShelf);
      accumBiquad(this.bassPunch);
      accumBiquad(this.clarityPresence);
      accumBiquad(this.clarityAir);
    } else {
      const bassDb = ((st.effects.bass || 0) / 10) * 9.0;
      const clarDb = ((st.effects.clarity || 0) / 10) * 7.8;
      for (let i = 0; i < len; i++) {
        const f = freqsHz[i];
        db[i] += bassDb / (1 + Math.pow(f / 95, 2.2));
        db[i] += clarDb / (1 + Math.pow(5500 / f, 2.0));
      }
    }
    return db;
  }

  sampleSpectrum() {
    const out = this._spec10;
    if (!this.analyser || !this._freqBins || !this.ctx || this.ctx.state !== 'running') {
      for (let i = 0; i < 10; i++) out[i] *= 0.85;
      this._meter.bass *= 0.85;
      this._meter.mid *= 0.85;
      this._meter.high *= 0.85;
      this._meter.rms *= 0.85;
      this._meter.playing = this.deckPlaying;
      return out;
    }

    this.analyser.getByteFrequencyData(this._freqBins);
    const sr = this.ctx.sampleRate || 44100;
    const nyq = sr / 2;
    const binCount = this._freqBins.length;

    let bassSum = 0;
    let midSum = 0;
    let highSum = 0;
    let total = 0;

    for (let b = 0; b < 10; b++) {
      const fc = SPECTRUM_BAND_CENTERS[b];
      const lo = fc * 0.72;
      const hi = fc * 1.38;
      const i0 = Math.max(0, Math.floor((lo / nyq) * binCount));
      const i1 = Math.min(binCount - 1, Math.max(i0, Math.ceil((hi / nyq) * binCount)));
      let peak = 0;
      for (let k = i0; k <= i1; k++) {
        const v = this._freqBins[k] / 255;
        if (v > peak) peak = v;
      }
      out[b] = out[b] * 0.42 + peak * 0.58;
      total += out[b];
      if (b < 3) bassSum += out[b];
      else if (b < 7) midSum += out[b];
      else highSum += out[b];
    }

    this._meter.bass = bassSum / 3;
    this._meter.mid = midSum / 4;
    this._meter.high = highSum / 3;
    this._meter.rms = total / 10;
    this._meter.playing = this.deckPlaying || this._meter.rms > 0.025;
    return out;
  }

  getMeter() {
    return this._meter;
  }

  // ---- Built-in DJ Audio Deck ----

  initDeck(tracks = []) {
    this.deckTracks = Array.isArray(tracks) ? tracks : [];
    if (this.deckEl) return;
    const el = new Audio();
    el.preload = 'metadata';
    el.loop = this.deckLoop;
    el.playbackRate = this.deckRate;
    el.addEventListener('play', () => {
      this._errSkips = 0;
      this.deckPlaying = true;
      this._emit();
    });
    el.addEventListener('pause', () => {
      this.deckPlaying = false;
      this._emit();
    });
    el.addEventListener('ended', () => {
      if (!this.deckLoop) {
        this.nextTrack(true);
      }
    });
    el.addEventListener('error', () => {
      if (!this.deckCustomName && this.deckTracks.length > 1 && this._errSkips < this.deckTracks.length) {
        this._errSkips += 1;
        this.nextTrack(true);
      }
    });
    this.deckEl = el;
  }

  _routeDeckIfNeeded() {
    if (!this.deckEl || !this.ctx || !this.inputNode) return;
    if (!this.deckMediaNode) {
      try {
        this.deckMediaNode = this.ctx.createMediaElementSource(this.deckEl);
        this.deckGainNode = this.ctx.createGain();
        this.deckGainNode.gain.value = Math.max(0, Math.min(1.5, this.deckVolume * this.spatialGain));
        if (typeof this.ctx.createStereoPanner === 'function') {
          this.deckPannerNode = this.ctx.createStereoPanner();
          this.deckPannerNode.pan.value = this.spatialPan;
          this.deckMediaNode.connect(this.deckGainNode).connect(this.deckPannerNode).connect(this.inputNode);
        } else {
          this.deckMediaNode.connect(this.deckGainNode).connect(this.inputNode);
        }
      } catch {
        // Fallback if already attached
      }
    }
  }

  _applyDeckGain() {
    const g = Math.max(0, Math.min(1.5, this.deckVolume * this.spatialGain));
    if (this.deckGainNode && this.ctx) {
      this.deckGainNode.gain.setTargetAtTime(g, this.ctx.currentTime, 0.03);
      if (this.deckPannerNode) {
        this.deckPannerNode.pan.setTargetAtTime(this.spatialPan, this.ctx.currentTime, 0.04);
      }
    } else if (this.deckEl) {
      this.deckEl.volume = Math.min(1, g);
    }
  }

  selectTrack(index, autoplay = true) {
    if (!this.deckEl || !this.deckTracks.length) return;
    this.deckCustomName = '';
    if (this.deckBlobUrl) {
      URL.revokeObjectURL(this.deckBlobUrl);
      this.deckBlobUrl = '';
    }
    this.deckIndex = ((index % this.deckTracks.length) + this.deckTracks.length) % this.deckTracks.length;
    const track = this.deckTracks[this.deckIndex];
    this.deckEl.src = track.src;
    this.deckEl.playbackRate = this.deckRate;
    if (autoplay) {
      this.play();
    } else {
      this._emit();
    }
  }

  loadLocalFile(file) {
    if (!file || !this.deckEl) return;
    if (this.deckBlobUrl) {
      URL.revokeObjectURL(this.deckBlobUrl);
    }
    this.deckBlobUrl = URL.createObjectURL(file);
    this.deckCustomName = file.name.replace(/\.[^.]+$/, '');
    this.deckEl.src = this.deckBlobUrl;
    this.deckEl.playbackRate = this.deckRate;
    this.play();
  }

  play() {
    const ctx = this.getOrCreateContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    this._routeDeckIfNeeded();
    if (!this.deckEl) return;
    if (!this.deckEl.src && this.deckTracks.length) {
      this.deckEl.src = this.deckTracks[this.deckIndex].src;
    }
    this.deckEl.play().catch(() => {});
  }

  pause() {
    this.deckEl?.pause();
  }

  togglePlay() {
    if (!this.deckEl || this.deckEl.paused) this.play();
    else this.pause();
  }

  nextTrack(autoplay = true) {
    if (!this.deckTracks.length) return;
    this.selectTrack(this.deckIndex + 1, autoplay);
  }

  prevTrack(autoplay = true) {
    if (!this.deckTracks.length) return;
    this.selectTrack(this.deckIndex - 1, autoplay);
  }

  seekFraction(frac) {
    if (!this.deckEl || !Number.isFinite(this.deckEl.duration) || this.deckEl.duration <= 0) return;
    this.deckEl.currentTime = Math.max(0, Math.min(this.deckEl.duration, frac * this.deckEl.duration));
  }

  setDeckVolume(v) {
    this.deckVolume = Math.max(0, Math.min(1.5, Number(v) || 0));
    this._applyDeckGain();
    this._emit();
  }

  setSpatial(gain = 1, pan = 0) {
    const nextG = Math.max(0, Math.min(1.25, Number.isFinite(Number(gain)) ? Number(gain) : 1));
    const nextP = Math.max(-0.9, Math.min(0.9, Number.isFinite(Number(pan)) ? Number(pan) : 0));
    if (Math.abs(nextG - this.spatialGain) < 0.004 && Math.abs(nextP - this.spatialPan) < 0.01) return;
    this.spatialGain = nextG;
    this.spatialPan = nextP;
    this._applyDeckGain();
  }

  setDeckRate(r) {
    this.deckRate = Math.max(0.75, Math.min(1.35, Number(r) || 1));
    if (this.deckEl) {
      this.deckEl.playbackRate = this.deckRate;
    }
    this._emit();
  }

  setDeckSolo(solo) {
    this.deckSolo = Boolean(solo);
    this._emit();
  }

  getDeckInfo() {
    const cur = this.deckTracks[this.deckIndex];
    return {
      playing: this.deckPlaying,
      title: this.deckCustomName || (cur ? `${String(this.deckIndex + 1).padStart(2, '0')} · ${cur.title}` : 'Chưa chọn bài'),
      index: this.deckIndex,
      custom: Boolean(this.deckCustomName),
      currentTime: this.deckEl?.currentTime || 0,
      duration: Number.isFinite(this.deckEl?.duration) ? this.deckEl.duration : 0,
      volume: this.deckVolume,
      rate: this.deckRate,
      solo: this.deckSolo
    };
  }
}

export { BAND_FREQS, FACTORY_PRESETS };
