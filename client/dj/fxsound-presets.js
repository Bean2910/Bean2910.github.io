/**
 * FxSound Presets, Band Tables, Q Calculation, and .fac Importer/Exporter
 * Modeled after https://github.com/fxsound2/fxsound-app
 * (DfxDspPreset.cpp, GraphicEqSet.cpp, Factsoft/*.fac, BonusPresets/*.fac)
 */

export const STORAGE_KEY_STATE = 'anduyen.fxsound.state.v1';
export const STORAGE_KEY_USER_PRESETS = 'anduyen.fxsound.userPresets.v1';

export const MIN_GAIN_DB = -12;
export const MAX_GAIN_DB = 12;

export const EFFECT_KEYS = ['clarity', 'ambience', 'surround', 'dynamicBoost', 'bass'];

/**
 * Center frequency grids matching GraphicEqReSetAllBandFreqs in GraphicEqSet.cpp
 */
export const BAND_FREQS = {
  5: [62.5, 250, 1000, 4000, 16000],
  10: [62.5, 115.734, 214.311, 396.85, 734.867, 1360.79, 2519.84, 4666.12, 8640.48, 16000],
  15: [25, 40, 63, 100, 160, 250, 400, 630, 1000, 1600, 2500, 4000, 6300, 10000, 16000],
  20: [20, 31.5, 40, 63, 80, 125, 160, 250, 315, 500, 630, 1000, 1250, 2000, 2500, 4000, 5000, 8000, 10000, 16000],
  31: [
    20, 25, 31.5, 40, 50, 63, 80, 100, 125, 160,
    200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600,
    2000, 2500, 3150, 4000, 5000, 6300, 8000, 10000, 12500, 16000, 20000
  ]
};

export function getDefaultFreqs(numBands) {
  const n = Number(numBands);
  if (BAND_FREQS[n]) return [...BAND_FREQS[n]];
  const minF = 20;
  const maxF = 20000;
  const ratio = maxF / minF;
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(Number((minF * Math.pow(ratio, n > 1 ? i / (n - 1) : 0)).toFixed(2)));
  }
  return out;
}

/**
 * Filter Q matching GraphicEqSet.cpp:515-524:
 *   r = (maxFreq / minFreq) ^ (1 / (numBands - 1))
 *   Q = max(1.0, (sqrt(r) / (r - 1)) * qMultiplier)
 */
export function calcBandQ(freqs, qMultiplier = 1.0) {
  const list = Array.isArray(freqs) && freqs.length >= 2 ? freqs : BAND_FREQS[10];
  const minF = Math.max(10, list[0]);
  const maxF = Math.max(minF * 1.5, list[list.length - 1]);
  const r = Math.pow(maxF / minF, 1 / (list.length - 1));
  const baseQ = r > 1.0001 ? Math.sqrt(r) / (r - 1) : 1.0;
  return Math.max(1.0, baseQ * Math.max(0.5, Math.min(4.0, qMultiplier)));
}

/**
 * Editable min/max Hz boundaries for a specific band index so neighboring bands never invert
 */
export function getBandFreqRange(freqs, index) {
  const n = freqs.length;
  const prev = index > 0 ? freqs[index - 1] * 1.08 : 20;
  const next = index < n - 1 ? freqs[index + 1] * 0.92 : 20000;
  const cur = freqs[index] ?? 1000;
  const min = Math.max(20, Math.min(cur * 0.95, prev));
  const max = Math.min(20000, Math.max(cur * 1.05, next));
  return { min: Math.round(min * 10) / 10, max: Math.round(max * 10) / 10 };
}

/**
 * Remaps gain values when changing band count, matching GraphicEqSet.cpp:207-244
 */
export function remapBandGains(oldGains, newCount) {
  const targetN = Number(newCount) || 10;
  const oldN = Array.isArray(oldGains) ? oldGains.length : 0;
  if (oldN === 0) return new Array(targetN).fill(0);
  if (oldN === 1) return new Array(targetN).fill(clampGain(oldGains[0]));

  const out = new Array(targetN);
  for (let i = 0; i < targetN; i++) {
    if (targetN < oldN) {
      const srcIdx = Math.round((i * (oldN - 1)) / Math.max(1, targetN - 1));
      out[i] = clampGain(oldGains[srcIdx] ?? 0);
    } else {
      const srcPos = (i * (oldN - 1)) / Math.max(1, targetN - 1);
      const lo = Math.floor(srcPos);
      const hi = Math.min(oldN - 1, lo + 1);
      const frac = srcPos - lo;
      const val = (oldGains[lo] ?? 0) + ((oldGains[hi] ?? 0) - (oldGains[lo] ?? 0)) * frac;
      out[i] = Math.round(clampGain(val) * 10) / 10;
    }
  }
  return out;
}

export function clampGain(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(MIN_GAIN_DB, Math.min(MAX_GAIN_DB, n));
}

export function midiToEffectScale(midiVal, enabled = true) {
  if (!enabled) return 0;
  const clamped = Math.max(0, Math.min(127, Number(midiVal) || 0));
  return Math.round((clamped / 12.7) * 10) / 10;
}

export function formatHz(hz) {
  const n = Number(hz) || 0;
  if (n >= 1000) {
    const k = n / 1000;
    return (Number.isInteger(k) ? k : Number(k.toFixed(1))) + 'k';
  }
  return String(Math.round(n));
}

/**
 * Factory + Bonus presets directly mapped from fxsound-app/Installer/Resources/Factsoft/*.fac
 * & bin/BonusPresets/*.fac, plus temple presets.
 * Effects scale: 0..10 (matching FxAudioControls UI sliders).
 */
export const FACTORY_PRESETS = [
  {
    id: 'general',
    name: 'General',
    category: 'FxSound Factory',
    effects: { clarity: 3.9, ambience: 0, surround: 1.6, dynamicBoost: 4.7, bass: 4.7 },
    numBands: 10,
    bandFreqs: [62.5, 115, 250, 450, 630, 1250, 2700, 5300, 7500, 13000],
    bandGains: [0, 0, 1, 2, 0, -1, 0, -1, -2, 0]
  },
  {
    id: 'music',
    name: 'Music',
    category: 'FxSound Factory',
    effects: { clarity: 3.9, ambience: 2.8, surround: 2.8, dynamicBoost: 1.6, bass: 4.7 },
    numBands: 10,
    bandFreqs: [62.5, 110, 250, 370, 650, 1200, 2130, 4550, 6850, 16000],
    bandGains: [0, 2, 2, 1, 0, 0, 0, -1, 0, 1]
  },
  {
    id: 'bass-boost',
    name: 'Bass Boost',
    category: 'FxSound Factory',
    effects: { clarity: 2.4, ambience: 2.8, surround: 2.8, dynamicBoost: 1.6, bass: 5.9 },
    numBands: 10,
    bandFreqs: [62.5, 98, 158.3, 345, 541.867, 1170, 2519.84, 4666.12, 8640.48, 14650],
    bandGains: [0, 3, 3, 2, 1, -1, -1, -1, -1, 0]
  },
  {
    id: 'voice',
    name: 'Voice',
    category: 'FxSound Factory',
    effects: { clarity: 5.7, ambience: 0, surround: 0, dynamicBoost: 7.5, bass: 0 },
    numBands: 10,
    bandFreqs: [62.5, 115.734, 214.311, 396.85, 734.867, 1360.79, 3430.8, 5250, 6300, 11770],
    bandGains: [0, -4, -2, 2, 4, 5, 3, 3, 5, -11]
  },
  {
    id: 'volume-boost',
    name: 'Volume Boost',
    category: 'FxSound Factory',
    effects: { clarity: 2.5, ambience: 0, surround: 1.6, dynamicBoost: 8.1, bass: 2.8 },
    numBands: 10,
    bandFreqs: [62.5, 101, 240, 396.85, 734.867, 1360.79, 2519.84, 4670, 11760, 16000],
    bandGains: [0, 3, 2, 2, 0, 0, 1, 1, 2, 2]
  },
  {
    id: 'gaming',
    name: 'Gaming',
    category: 'FxSound Factory',
    effects: { clarity: 2.8, ambience: 0, surround: 0, dynamicBoost: 6.7, bass: 2.8 },
    numBands: 10,
    bandFreqs: [62.5, 128.75, 238.311, 444, 805, 1360.79, 2519.84, 4400.12, 7930.48, 12570],
    bandGains: [0, 0, 2, 2, 2, 0, -1, -1, 2, 2]
  },
  {
    id: 'movies',
    name: 'Movies',
    category: 'FxSound Factory',
    effects: { clarity: 4.7, ambience: 0, surround: 3.9, dynamicBoost: 6.7, bass: 2.8 },
    numBands: 10,
    bandFreqs: [62.5, 115.734, 250, 396.85, 734.867, 1360.79, 2519.84, 5350, 8640.48, 13800],
    bandGains: [0, 0, 2, 0, 2, 2, 1, -1, 0, 2]
  },
  {
    id: 'streaming-video',
    name: 'Streaming Video',
    category: 'FxSound Factory',
    effects: { clarity: 2.8, ambience: 0, surround: 2.8, dynamicBoost: 4.3, bass: 2.8 },
    numBands: 10,
    bandFreqs: [62.5, 115.734, 214.311, 396.85, 734.867, 1360.79, 2519.84, 5350, 8640.48, 13800],
    bandGains: [0, 0, 0, 0, 1, 1, 1, -1, 0, 2]
  },
  {
    id: 'classic-processing',
    name: 'Classic Processing',
    category: 'FxSound Factory',
    effects: { clarity: 4.7, ambience: 4.7, surround: 2.8, dynamicBoost: 4.7, bass: 5.5 },
    numBands: 10,
    bandFreqs: [...BAND_FREQS[10]],
    bandGains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  },
  {
    id: 'light-processing',
    name: 'Light Processing',
    category: 'FxSound Factory',
    effects: { clarity: 2.0, ambience: 2.8, surround: 0, dynamicBoost: 0.4, bass: 1.6 },
    numBands: 10,
    bandFreqs: [62.5, 115.734, 214.311, 396.85, 734.867, 1360.79, 2519.84, 4666.12, 8640.48, 13600],
    bandGains: [0, -1, 1, 1, -1, -1, -2, -1, -1, 1]
  },
  {
    id: 'tv',
    name: 'TV',
    category: 'FxSound Factory',
    effects: { clarity: 3.9, ambience: 1.6, surround: 3.9, dynamicBoost: 4.7, bass: 3.5 },
    numBands: 10,
    bandFreqs: [62.5, 115.734, 250, 396.85, 734.867, 1360.79, 2519.84, 5350, 8640.48, 13800],
    bandGains: [0, 0, 1, 0, 1, 0, 1, -1, -1, 2]
  },
  {
    id: 'transcription',
    name: 'Transcription',
    category: 'FxSound Factory',
    effects: { clarity: 7.9, ambience: 0, surround: 0, dynamicBoost: 9.1, bass: 0 },
    numBands: 10,
    bandFreqs: [62.5, 86, 250, 293, 615, 1320, 3430, 4630, 6360, 11770],
    bandGains: [0, -12, 7, 2, -1, 7, 0, 10, 3, -12]
  },
  {
    id: 'default',
    name: 'Default (Flat)',
    category: 'FxSound Factory',
    effects: { clarity: 0, ambience: 0, surround: 0, dynamicBoost: 0, bass: 0 },
    numBands: 10,
    bandFreqs: [62.5, 121.5, 225, 416.5, 770.5, 1425, 2645, 4895, 9060, 13885],
    bandGains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
  },
  // Bonus Presets (bin/BonusPresets/*.fac)
  {
    id: 'pop',
    name: 'Pop',
    category: 'FxSound Bonus',
    effects: { clarity: 3.0, ambience: 1.0, surround: 0, dynamicBoost: 7.0, bass: 2.0 },
    numBands: 10,
    bandFreqs: [62.5, 110, 230, 370, 650, 1200, 2150, 5300, 10000, 12000],
    bandGains: [2, 0, 0, -1, -2, -3, -3, -2, -1, 0]
  },
  {
    id: 'jazz',
    name: 'Jazz',
    category: 'FxSound Bonus',
    effects: { clarity: 3.9, ambience: 0, surround: 1.6, dynamicBoost: 4.7, bass: 4.7 },
    numBands: 10,
    bandFreqs: [62.5, 115, 250, 450, 630, 1250, 2700, 5300, 7500, 13000],
    bandGains: [4.7, 0, 1, 2, 0, -1, 0, -1, -2, 0]
  },
  {
    id: 'trap',
    name: 'Trap',
    category: 'FxSound Bonus',
    effects: { clarity: 6.0, ambience: 7.0, surround: 0, dynamicBoost: 3.0, bass: 6.0 },
    numBands: 10,
    bandFreqs: [62.5, 100, 180, 290, 650, 1200, 2200, 4550, 6363, 16000],
    bandGains: [0, 2, 1, 3, 1, 1, 0, 2, -1, -1]
  },
  {
    id: 'metal',
    name: 'Metal',
    category: 'FxSound Bonus',
    effects: { clarity: 2.0, ambience: 3.0, surround: 1.6, dynamicBoost: 3.0, bass: 2.0 },
    numBands: 10,
    bandFreqs: [62.5, 109.43, 266.54, 293, 738.37, 1355.22, 2567.15, 4719.84, 8573.18, 16000],
    bandGains: [2, 1, 1, 0, 0, 0, 0, 0, 0, 1]
  },
  // Temple Curated Presets
  {
    id: 'thien-chanh-dien',
    name: 'Thiền Âm Chánh Điện',
    category: 'Chùa An Tự Duyên',
    effects: { clarity: 4.2, ambience: 6.5, surround: 4.5, dynamicBoost: 2.0, bass: 3.0 },
    numBands: 10,
    bandFreqs: [...BAND_FREQS[10]],
    bandGains: [1.5, 2.0, 1.5, 0.5, -1.0, 0, 1.5, 2.0, 1.5, 1.0]
  },
  {
    id: 'san-chua-dj',
    name: 'Sân Chùa DJ Dance',
    category: 'Chùa An Tự Duyên',
    effects: { clarity: 5.5, ambience: 3.5, surround: 5.5, dynamicBoost: 6.5, bass: 7.5 },
    numBands: 10,
    bandFreqs: [...BAND_FREQS[10]],
    bandGains: [5.5, 4.5, 2.5, 0, -1.5, -1.0, 1.5, 3.0, 4.0, 3.5]
  }
];

/**
 * Parses an authentic FxSound .fac preset file text into our JS preset structure.
 * Follows DfxDspPreset.cpp index layout:
 *   Main 0 = Fidelity/Clarity, Main 1 = Surround, Main 3 = Ambience,
 *   Main 4 = Dynamic Boost, Main 5 = Bass Boost
 *   Integer[0..4] = on/off toggles in same mapping: [clarity, surround, ambience, dyn, bass]
 */
export function parseFacPreset(text, fallbackName = 'Imported Preset') {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 15) {
    throw new Error('File .fac không hợp lệ hoặc bị thiếu dữ liệu.');
  }

  let name = fallbackName;
  const verIdx = lines.findIndex((l) => /^\d+:\s*Version/i.test(l));
  if (verIdx >= 0 && lines[verIdx + 1] && !lines[verIdx + 1].includes(':')) {
    name = lines[verIdx + 1].trim() || fallbackName;
  }

  const readVal = (re) => {
    const ln = lines.find((l) => re.test(l));
    if (!ln) return null;
    const n = parseFloat(ln.split(':')[0]);
    return Number.isFinite(n) ? n : null;
  };

  const main0 = readVal(/:\s*Main 0\b/i) ?? 0;
  const main1 = readVal(/:\s*Main 1\b/i) ?? 0;
  const main3 = readVal(/:\s*Main 3\b/i) ?? 0;
  const main4 = readVal(/:\s*Main 4\b/i) ?? 0;
  const main5 = readVal(/:\s*Main 5\b/i) ?? 0;

  const int0 = (readVal(/:\s*Integer\[0\]/i) ?? 1) !== 0;
  const int1 = (readVal(/:\s*Integer\[1\]/i) ?? 1) !== 0;
  const int2 = (readVal(/:\s*Integer\[2\]/i) ?? 1) !== 0;
  const int3 = (readVal(/:\s*Integer\[3\]/i) ?? 1) !== 0;
  const int4 = (readVal(/:\s*Integer\[4\]/i) ?? 1) !== 0;

  const numBandsRaw = readVal(/:\s*Number of EQ Bands\b/i);
  const eqOn = (readVal(/:\s*On\/Off Flag\b/i) ?? 1) !== 0;

  const bandFreqs = [];
  const bandGains = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^Band\s+\d+$/i.test(lines[i])) {
      const cf = parseFloat((lines[i + 1] || '').split(':')[0]);
      const bc = parseFloat((lines[i + 2] || '').split(':')[0]);
      if (Number.isFinite(cf) && Number.isFinite(bc)) {
        bandFreqs.push(Math.max(20, Math.min(20000, cf)));
        bandGains.push(clampGain(Math.round(bc * 10) / 10));
      }
    }
  }

  const nBands = bandFreqs.length || Math.max(5, Math.min(31, numBandsRaw || 10));
  const finalFreqs = bandFreqs.length ? bandFreqs : getDefaultFreqs(nBands);
  const finalGains = bandGains.length ? bandGains : new Array(nBands).fill(0);

  return {
    id: 'fac-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 5),
    name: name.slice(0, 48),
    category: 'User / Imported (.fac)',
    eqOn,
    effects: {
      clarity: midiToEffectScale(main0, int0),
      surround: midiToEffectScale(main1, int1),
      ambience: midiToEffectScale(main3, int2),
      dynamicBoost: midiToEffectScale(main4, int3),
      bass: midiToEffectScale(main5, int4)
    },
    numBands: nBands,
    bandFreqs: finalFreqs,
    bandGains: finalGains
  };
}

/**
 * Serializes current EQ/Effects state into an FxSound-compatible .fac file string
 */
export function exportFacPreset(name, state) {
  const eff = state.effects || {};
  const toMidi = (v) => Math.round(Math.max(0, Math.min(10, Number(v) || 0)) * 12.7);
  const bands = Array.isArray(state.bandFreqs) ? state.bandFreqs : BAND_FREQS[10];
  const gains = Array.isArray(state.bandGains) ? state.bandGains : new Array(bands.length).fill(0);

  const out = [
    'CLASS1 : Effect Type',
    '9: Version',
    String(name || 'Custom Preset').slice(0, 64),
    '0: Double Params Flag',
    '1: Total number of elements',
    `${toMidi(eff.clarity)}: Main 0`,
    `${toMidi(eff.surround)}: Main 1`,
    '0: Main 2',
    `${toMidi(eff.ambience)}: Main 3`,
    `${toMidi(eff.dynamicBoost)}: Main 4`,
    `${toMidi(eff.bass)}: Main 5`,
    '0: Element Number',
    '   0: Param 0',
    '   0: Param 1',
    '   0: Param 2',
    '   0: Param 3',
    '   0: Param 4',
    '   0: Param 5',
    '   0: Param 6',
    '7: Number of Application Dependent Integers',
    '0: Number of Application Dependent Reals',
    '0: Number of Application Dependent Strings',
    `${eff.clarity > 0 ? 1 : 0}: Integer[0]`,
    `${eff.surround > 0 ? 1 : 0}: Integer[1]`,
    `${eff.ambience > 0 ? 1 : 0}: Integer[2]`,
    `${eff.dynamicBoost > 0 ? 1 : 0}: Integer[3]`,
    `${eff.bass > 0 ? 1 : 0}: Integer[4]`,
    '0: Integer[5]',
    '2: Integer[6]',
    `${bands.length}: Number of EQ Bands`,
    `${state.eqOn === false ? 0 : 1}: On/Off Flag`
  ];

  bands.forEach((cf, i) => {
    out.push(`Band ${i + 1}`);
    out.push(`   ${Number(cf.toFixed(3))}: CF`);
    out.push(`   ${clampGain(gains[i] ?? 0)}: Boost/Cut`);
  });

  return out.join('\r\n') + '\r\n';
}

export function loadUserPresets() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY_USER_PRESETS) || '[]');
    return Array.isArray(raw) ? raw.filter((p) => p && p.id && p.name) : [];
  } catch {
    return [];
  }
}

export function saveUserPresets(list) {
  try {
    localStorage.setItem(STORAGE_KEY_USER_PRESETS, JSON.stringify(list || []));
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function getDefaultState() {
  const base = FACTORY_PRESETS.find((p) => p.id === 'music') || FACTORY_PRESETS[0];
  return {
    powerOn: true,
    eqOn: true,
    theme: 'dark',
    presetId: base.id,
    presetModified: false,
    numBands: base.numBands,
    bandFreqs: [...base.bandFreqs],
    bandGains: [...base.bandGains],
    effects: { ...base.effects },
    masterGain: 0,
    volumeLeveling: 0,
    filterQ: 1.0,
    balance: 0
  };
}

export function loadSavedEqState() {
  const def = getDefaultState();
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY_STATE) || 'null');
    if (!saved || typeof saved !== 'object') return def;
    const n = [5, 10, 15, 20, 31].includes(Number(saved.numBands)) ? Number(saved.numBands) : def.numBands;
    const freqs =
      Array.isArray(saved.bandFreqs) && saved.bandFreqs.length === n
        ? saved.bandFreqs.map((f) => Math.max(20, Math.min(20000, Number(f) || 1000)))
        : getDefaultFreqs(n);
    const gains =
      Array.isArray(saved.bandGains) && saved.bandGains.length === n
        ? saved.bandGains.map(clampGain)
        : new Array(n).fill(0);
    return {
      powerOn: saved.powerOn !== undefined ? Boolean(saved.powerOn) : true,
      eqOn: saved.eqOn !== undefined ? Boolean(saved.eqOn) : true,
      theme: saved.theme === 'light' ? 'light' : 'dark',
      presetId: typeof saved.presetId === 'string' ? saved.presetId : def.presetId,
      presetModified: Boolean(saved.presetModified),
      numBands: n,
      bandFreqs: freqs,
      bandGains: gains,
      effects: {
        clarity: Number(saved.effects?.clarity ?? def.effects.clarity),
        ambience: Number(saved.effects?.ambience ?? def.effects.ambience),
        surround: Number(saved.effects?.surround ?? def.effects.surround),
        dynamicBoost: Number(saved.effects?.dynamicBoost ?? def.effects.dynamicBoost),
        bass: Number(saved.effects?.bass ?? def.effects.bass)
      },
      masterGain: Math.max(-20, Math.min(20, Number(saved.masterGain) || 0)),
      volumeLeveling: Math.max(0, Math.min(4, Number(saved.volumeLeveling) || 0)),
      filterQ: Math.max(1, Math.min(3, Number(saved.filterQ) || 1)),
      balance: Math.max(-10, Math.min(10, Number(saved.balance) || 0))
    };
  } catch {
    return def;
  }
}

export function saveEqState(state) {
  try {
    localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}
