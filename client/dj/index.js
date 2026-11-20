/**
 * Modular Entry Point for Courtyard DJ Booth, FxSound EQ & Audio-Reactive Dance
 * Keeps 3D prop, DSP engine, presets, dance choreography, and UI cleanly separated under /dj/.
 */

import { FxSoundDsp } from './fxsound-dsp.js';
import { FxSoundUI } from './fxsound-ui.js';
import { DJ_POS, createDjBooth } from './dj-booth.js';
import { DANCE_STYLES, DanceController } from './dance-fx.js';

export const DJ_COORDS = DJ_POS;
export { DANCE_STYLES };

export const DjFx = (() => {
  const dsp = new FxSoundDsp();
  const dance = new DanceController(dsp, {});
  let ui = null;
  let booth = null;
  let depsRef = null;
  let lastT = 0;

  function init(deps = {}) {
    depsRef = deps;
    dance.deps = {
      sendEmote: deps.sendEmote,
      toast: deps.toast
    };

    const allTracks = [
      { src: new URL('../music/chanh-dien.mp3', import.meta.url).href, title: 'Chánh Điện Trang Nghiêm' },
      ...(Array.isArray(deps.tracks) ? deps.tracks : [])
    ];
    dsp.initDeck(allTracks);

    if (deps.audioRegistry) {
      dsp.flushRegistry(deps.audioRegistry);
    }

    if (!booth && deps.THREE && deps.scene) {
      booth = createDjBooth(deps, dsp);
    }

    if (!ui) {
      ui = new FxSoundUI(dsp, {
        hudRoot: deps.hudRoot || document.body,
        cssUrl: new URL('./fxsound-ui.css?v=2026112002', import.meta.url).href,
        ensureAudio: () => {
          deps.ensureAudio?.();
          if (deps.audioRegistry) dsp.flushRegistry(deps.audioRegistry);
        },
        toggleDisco: () => deps.toggleDisco?.(),
        onToggleDance: () => {
          toggleDance();
          ui?.syncFromState();
        },
        onSelectDanceStyle: (styleId) => {
          setDanceStyle(styleId);
          ui?.syncFromState();
        },
        getDanceState: () => ({ active: dance.active, style: dance.style }),
        toast: (msg, ms) => deps.toast?.(msg, ms)
      });
      dance.subscribe(() => {
        ui?.syncFromState();
        deps.onDanceChange?.(dance.active, dance.style);
      });
    }
    return api;
  }

  function registerNode(node, ctx) {
    if (!node) return;
    dsp.connectSourceNode(node, ctx);
  }

  function audioSink(ctx) {
    if (!ctx) return null;
    return dsp.attachContext(ctx) || ctx.destination;
  }

  function _calcSpatial(opt) {
    if (!opt || opt.muted) return { gain: opt?.muted ? 0 : 1, pan: 0 };
    if (opt.spatial === false || !opt.listenerPos) return { gain: 1, pan: 0 };
    const lx = opt.listenerPos.x || 0;
    const lz = opt.listenerPos.z || 0;
    const dx = DJ_POS.x - lx;
    const dz = DJ_POS.z - lz;
    const dist = Math.hypot(dx, dz);
    const minD = 12;
    const maxD = 62;
    const floor = 0.05;
    let gain = 1;
    if (dist > minD) {
      if (dist >= maxD) gain = floor;
      else {
        const u = (dist - minD) / (maxD - minD);
        gain = floor + (1 - floor) * Math.pow(1 - u, 1.85);
      }
    }
    if (opt.indoor) gain *= 0.25;
    if (ui?.isOpen) gain = Math.max(gain, 0.78);
    let pan = 0;
    const m = opt.camera?.matrixWorldInverse?.elements;
    if (m && dist >= 0.8) {
      const rx = m[0];
      const rz = m[8];
      const rLen = Math.hypot(rx, rz) || 1;
      pan = (((dx / dist) * rx + (dz / dist) * rz) / rLen) * Math.min(1, dist / 6);
    }
    return { gain, pan: Math.max(-0.82, Math.min(0.82, pan)) };
  }

  function update(elapsed, spatialOpt) {
    const dt = lastT ? Math.min(0.05, Math.max(0.001, elapsed - lastT)) : 0.016;
    lastT = elapsed;
    if (depsRef?.audioRegistry?.length) {
      dsp.flushRegistry(depsRef.audioRegistry);
    }
    if (spatialOpt) {
      const sp = _calcSpatial(spatialOpt);
      dsp.setSpatial(sp.gain, sp.pan);
    }
    dance.tick(dt, Boolean(depsRef?.isDiscoOn?.()));
    booth?.update(elapsed, dt);
  }

  function toggleDance(styleId) {
    depsRef?.ensureAudio?.();
    const res = dance.toggle(styleId);
    depsRef?.onDanceChange?.(dance.active, dance.style);
    return res;
  }

  function setDanceStyle(styleId) {
    depsRef?.ensureAudio?.();
    dance.setStyle(styleId, true);
    depsRef?.onDanceChange?.(dance.active, dance.style);
  }

  function stopDance(quiet = false) {
    dance.stop(quiet);
  }

  function applyMyDance(monk, moving, busy, dt) {
    dance.applyMyDance(monk, moving, busy, dt);
  }

  function applyPeerDance(monk, info, dt) {
    dance.applyPeerDance(monk, info, dt);
  }

  function applyBotDance(bot, idx, shouldDance, dt) {
    dance.applyBotDance(bot, idx, shouldDance, dt);
  }

  function open() {
    if (!ui && depsRef) init(depsRef);
    ui?.open();
  }

  function close() {
    ui?.close();
  }

  function onSn() {
    close();
  }

  function getSvgDot() {
    return booth ? booth.getSvgDot() : '';
  }

  const api = {
    init,
    registerNode,
    audioSink,
    update,
    open,
    close,
    onSn,
    getSvgDot,
    toggleDance,
    setDanceStyle,
    stopDance,
    applyMyDance,
    applyPeerDance,
    applyBotDance,
    dsp,
    dance,
    get booth() {
      return booth;
    },
    get hit() {
      return booth?.hit || null;
    },
    get isOpen() {
      return Boolean(ui?.isOpen);
    },
    get isSoloPlaying() {
      return Boolean(dsp.deckPlaying && dsp.deckSolo);
    },
    get dancing() {
      return dance.active ? dance.style : false;
    },
    get danceBeat() {
      return dance._lastBeat;
    }
  };

  if (typeof globalThis !== 'undefined') {
    globalThis.DjFx = api;
  }
  return api;
})();

export default DjFx;
