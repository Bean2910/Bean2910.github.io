/**
 * FxSound Studio EQ & DJ Deck UI
 * Modeled after https://github.com/fxsound2/fxsound-app
 * (FxMainWindow, FxVisualizer, FxEffects, FxEqualizerControl, FxEqualizer)
 */

import {
  FACTORY_PRESETS,
  exportFacPreset,
  formatHz,
  getBandFreqRange,
  getDefaultFreqs,
  loadUserPresets,
  parseFacPreset,
  saveUserPresets
} from './fxsound-presets.js';

const EFFECT_META = [
  { key: 'clarity', label: 'Clarity', tip: 'Làm sáng dải cao, rõ giọng hát & tiếng nhạc cụ (FxSound Clarity)' },
  { key: 'ambience', label: 'Ambience', tip: 'Tạo chiều sâu không gian vang ấm tự nhiên' },
  { key: 'surround', label: 'Surround Sound', tip: 'Mở rộng âm trường trái - phải (3D Stereo Widening)' },
  { key: 'dynamicBoost', label: 'Dynamic Boost', tip: 'Nén động & tăng độ dày, lực đánh toàn dải' },
  { key: 'bass', label: 'Bass Boost', tip: 'Tăng âm trầm sâu chắc quanh dải Sub & Mid-Bass (~68 Hz)' }
];

const LOG_FREQS = (() => {
  const n = 128;
  const arr = new Float32Array(n);
  const fMin = 24;
  const fMax = 20000;
  for (let i = 0; i < n; i++) {
    arr[i] = fMin * Math.pow(fMax / fMin, i / (n - 1));
  }
  return arr;
})();

function fmtTime(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export class FxSoundUI {
  constructor(dsp, deps = {}) {
    this.dsp = dsp;
    this.deps = deps;
    this.userPresets = loadUserPresets();
    this.isOpen = false;
    this._raf = 0;
    this._bandEls = [];

    this._ensureCss();
    this._buildDom();
    this._bindEvents();
    this._unsubscribe = this.dsp.subscribe(() => this.syncFromState());
    this.syncFromState();
  }

  _ensureCss() {
    if (document.getElementById('fx-sound-css')) return;
    const link = document.createElement('link');
    link.id = 'fx-sound-css';
    link.rel = 'stylesheet';
    link.href = this.deps.cssUrl || new URL('./fxsound-ui.css?v=2026111905', import.meta.url).href;
    document.head.appendChild(link);
  }

  _allPresets() {
    return [...FACTORY_PRESETS, ...this.userPresets];
  }

  _buildDom() {
    const root = document.createElement('div');
    root.className = 'fx-modal';
    root.innerHTML = `
      <div class="fx-card" data-theme="dark">
        <div class="fx-topbar">
          <div class="fx-brand">
            <button type="button" class="fx-power on" data-fx="power" title="Bật / Tắt xử lý FxSound DSP (Bypass)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                <path d="M12 2v10"/>
                <path d="M18.36 6.64a9 9 0 1 1-12.73 0"/>
              </svg>
            </button>
            <div class="fx-brand-text">
              <h2>FxSound EQ · Bàn DJ Chùa <span class="fx-badge">WebAudio DSP</span></h2>
              <div class="fx-brand-sub">Dựa trên FxSound App · Áp dụng trực tiếp lên Bàn DJ, Nhạc nền, Chánh điện, Kinh & Thần thông</div>
            </div>
          </div>
          <div class="fx-top-actions">
            <button type="button" class="fx-btn sm" data-fx="dance-toggle" title="Nhảy theo nhạc (Phím tắt J)">🕺 Nhảy (J)</button>
            <button type="button" class="fx-btn sm" data-fx="disco" title="Bật / Tắt Quả cầu gương sân khấu">🪩 Quả cầu</button>
            <button type="button" class="fx-btn sm" data-fx="theme" title="Đổi giao diện Sáng / Tối (FxTheme)">🌗 Giao diện</button>
            <button type="button" class="fx-btn sm" data-fx="restore" title="Khôi phục mặc định">↺ Mặc định</button>
            <button type="button" class="fx-btn icon" data-fx="close" title="Đóng (Esc)">✕</button>
          </div>
        </div>

        <div class="fx-preset-bar">
          <div class="fx-preset-left">
            <button type="button" class="fx-btn icon sm" data-fx="prev-pre" title="Preset trước">◀</button>
            <select class="fx-select" data-fx="preset-sel" aria-label="Chọn Preset FxSound"></select>
            <button type="button" class="fx-btn icon sm" data-fx="next-pre" title="Preset kế tiếp">▶</button>
            <span class="fx-mod-tag" data-fx="mod-tag">* Đã chỉnh</span>
          </div>
          <div class="fx-preset-right">
            <button type="button" class="fx-btn sm" data-fx="save-pre">💾 Lưu Preset</button>
            <button type="button" class="fx-btn sm" data-fx="del-pre" style="display:none">🗑️ Xóa</button>
            <label class="fx-btn sm fx-file-btn" title="Nhập file preset .fac từ FxSound desktop">
              📥 Nhập .fac
              <input type="file" accept=".fac,.txt" data-fx="imp-fac"/>
            </label>
            <button type="button" class="fx-btn sm" data-fx="exp-fac" title="Xuất cấu hình hiện tại ra file .fac">📤 Xuất .fac</button>
          </div>
        </div>

        <div class="fx-vis-wrap">
          <canvas class="fx-vis-canvas" width="940" height="128"></canvas>
          <div class="fx-vis-legend">
            <span>Phổ 10 dải (Mirrored)</span>
            <span>Đường cong đáp ứng EQ (dB)</span>
          </div>
        </div>

        <div class="fx-main">
          <div class="fx-panel">
            <div class="fx-panel-head">
              <span class="fx-panel-title">Hiệu Ứng FxSound</span>
              <button type="button" class="fx-btn sm" data-fx="zero-fx" title="Đặt 5 hiệu ứng về 0">Reset 0</button>
            </div>
            <div class="fx-effects-list" data-fx="eff-list"></div>

            <div class="fx-deck">
              <div class="fx-panel-head">
                <span class="fx-panel-title">🎧 Bàn DJ Deck</span>
                <label style="font-size:11px;display:inline-flex;align-items:center;gap:4px;cursor:pointer;">
                  <input type="checkbox" data-fx="deck-solo" checked/> Tắt nhạc nền khi phát
                </label>
              </div>
              <div class="fx-deck-now" data-fx="deck-now">Chọn bài hoặc tải nhạc để test EQ...</div>
              <select class="fx-select" style="width:100%;min-width:0" data-fx="deck-track"></select>
              <div class="fx-deck-ctrls">
                <button type="button" class="fx-btn sm pri" data-fx="deck-play">▶ Phát DJ</button>
                <button type="button" class="fx-btn sm" data-fx="deck-prev" title="Bài trước">⏮</button>
                <button type="button" class="fx-btn sm" data-fx="deck-next" title="Bài kế">⏭</button>
                <label class="fx-btn sm fx-file-btn" title="Nạp file nhạc MP3 / WAV / OGG từ máy">
                  📂 Chọn MP3
                  <input type="file" accept="audio/*" data-fx="deck-file"/>
                </label>
              </div>
              <div class="fx-deck-sub">
                <input type="range" class="fx-range" min="0" max="1000" value="0" data-fx="deck-seek" title="Tua nhanh"/>
                <span data-fx="deck-time">0:00 / 0:00</span>
              </div>
              <div class="fx-deck-sub" style="grid-template-columns:1fr 1fr">
                <label style="display:flex;align-items:center;gap:6px">
                  <span>Vol</span>
                  <input type="range" class="fx-range" min="0" max="150" value="85" data-fx="deck-vol"/>
                </label>
                <label style="display:flex;align-items:center;gap:6px">
                  <span>Tempo</span>
                  <input type="range" class="fx-range" min="75" max="135" value="100" data-fx="deck-rate"/>
                  <b data-fx="deck-rate-lbl" style="color:var(--fx-gold)">1.0x</b>
                </label>
              </div>
              <div class="fx-deck-ctrls" style="padding-top:2px">
                <span style="font-size:11px;color:var(--fx-muted)">Điệu nhảy:</span>
                <button type="button" class="fx-btn sm" data-fx="dance-style" data-style="dj">🎧 Quẩy DJ</button>
                <button type="button" class="fx-btn sm" data-fx="dance-style" data-style="zen">🪷 Múa Thiền</button>
                <button type="button" class="fx-btn sm" data-fx="dance-style" data-style="spin">🪩 Disco</button>
              </div>
            </div>
          </div>

          <div class="fx-panel">
            <div class="fx-panel-head">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                <span class="fx-panel-title">Equalizer Đồ Họa (±12 dB)</span>
                <button type="button" class="fx-btn sm on" data-fx="eq-on">EQ: BẬT</button>
                <button type="button" class="fx-btn sm" data-fx="eq-flat">Flat 0 dB</button>
              </div>
              <div style="display:flex;align-items:center;gap:6px">
                <span style="font-size:11px;color:var(--fx-muted)">Số dải:</span>
                <select class="fx-select" style="min-width:98px;padding:3px 8px;font-size:11.5px" data-fx="eq-bands">
                  <option value="5">5 Bands</option>
                  <option value="10" selected>10 Bands</option>
                  <option value="15">15 Bands</option>
                  <option value="20">20 Bands</option>
                  <option value="31">31 Bands</option>
                </select>
              </div>
            </div>

            <div class="fx-eq-scroll">
              <div class="fx-eq-bars" data-fx="eq-bars"></div>
            </div>

            <div class="fx-master-grid">
              <div class="fx-mctrl">
                <div class="fx-mctrl-top" data-fx="reset-m" data-key="masterGain" style="cursor:pointer" title="Nhấp đúp về 0 dB">
                  <span>Master Gain</span><b data-fx="val-masterGain">0 dB</b>
                </div>
                <input type="range" class="fx-range" min="-20" max="20" step="1" data-fx="m-masterGain"/>
              </div>
              <div class="fx-mctrl">
                <div class="fx-mctrl-top" data-fx="reset-m" data-key="volumeLeveling" style="cursor:pointer" title="Nhấp đúp về 0 dB">
                  <span>Vol. Leveling</span><b data-fx="val-volumeLeveling">0.0 dB</b>
                </div>
                <input type="range" class="fx-range" min="0" max="4" step="0.5" data-fx="m-volumeLeveling"/>
              </div>
              <div class="fx-mctrl">
                <div class="fx-mctrl-top" data-fx="reset-m" data-key="filterQ" style="cursor:pointer" title="Nhấp đúp về 1.0x">
                  <span>Filter Q</span><b data-fx="val-filterQ">1.0x</b>
                </div>
                <input type="range" class="fx-range" min="1" max="3" step="0.5" data-fx="m-filterQ"/>
              </div>
              <div class="fx-mctrl">
                <div class="fx-mctrl-top" data-fx="reset-m" data-key="balance" style="cursor:pointer" title="Nhấp đúp về giữa">
                  <span>Balance L/R</span><b data-fx="val-balance">Center</b>
                </div>
                <input type="range" class="fx-range" min="-10" max="10" step="1" data-fx="m-balance"/>
              </div>
            </div>
          </div>
        </div>

        <div class="fx-foot">
          <span>Mẹo: Nhấp đúp lên thanh EQ để đưa về 0 dB · Nhấp vào nhãn Hz để đổi tần số trung tâm từng dải</span>
          <span>Lưu ý: Video YouTube nhúng phát ngoài miền iframe nên trình duyệt không qua WebAudio; Deck Bàn DJ & nhạc chùa đi qua 100% DSP</span>
        </div>
      </div>
    `;

    (this.deps.hudRoot || document.body).appendChild(root);
    this.root = root;
    this.card = root.querySelector('.fx-card');
    this.canvas = root.querySelector('.fx-vis-canvas');
    this.ctx2d = this.canvas.getContext('2d');
    this.selPreset = root.querySelector('[data-fx="preset-sel"]');
    this.modTag = root.querySelector('[data-fx="mod-tag"]');
    this.btnPower = root.querySelector('[data-fx="power"]');
    this.btnDelPre = root.querySelector('[data-fx="del-pre"]');
    this.btnEqOn = root.querySelector('[data-fx="eq-on"]');
    this.selBands = root.querySelector('[data-fx="eq-bands"]');
    this.eqBarsEl = root.querySelector('[data-fx="eq-bars"]');

    this._buildEffectSliders();
    this._populatePresetSelect();
    this._populateDeckTracks();
  }

  _buildEffectSliders() {
    const wrap = this.root.querySelector('[data-fx="eff-list"]');
    wrap.innerHTML = '';
    this._effInputs = {};
    for (const m of EFFECT_META) {
      const row = document.createElement('div');
      row.className = 'fx-eff-row';
      row.title = m.tip;
      row.innerHTML = `
        <div class="fx-eff-label">
          <span>${m.label}</span>
          <b data-val="${m.key}">0.0</b>
        </div>
        <input type="range" class="fx-range" min="0" max="10" step="0.5" data-eff="${m.key}"/>
      `;
      const inp = row.querySelector('input');
      const valEl = row.querySelector('b');
      inp.addEventListener('input', () => {
        this.deps.ensureAudio?.();
        this.dsp.setEffect(m.key, Number(inp.value));
      });
      inp.addEventListener('dblclick', () => this.dsp.setEffect(m.key, 0));
      this._effInputs[m.key] = { inp, valEl };
      wrap.appendChild(row);
    }
  }

  _populatePresetSelect() {
    const groups = new Map();
    for (const p of this._allPresets()) {
      const cat = p.category || 'Khác';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(p);
    }
    this.selPreset.innerHTML = '';
    for (const [cat, list] of groups.entries()) {
      const og = document.createElement('optgroup');
      og.label = cat;
      for (const p of list) {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        og.appendChild(opt);
      }
      this.selPreset.appendChild(og);
    }
  }

  _populateDeckTracks() {
    const sel = this.root.querySelector('[data-fx="deck-track"]');
    const tracks = this.dsp.deckTracks || [];
    sel.innerHTML = '';
    tracks.forEach((tr, i) => {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = `${String(i + 1).padStart(2, '0')} · ${tr.title}`;
      sel.appendChild(opt);
    });
  }

  _rebuildBandSliders() {
    const st = this.dsp.state;
    const n = st.bandGains.length;
    this.eqBarsEl.innerHTML = '';
    this._bandEls = [];

    for (let i = 0; i < n; i++) {
      const col = document.createElement('div');
      col.className = 'fx-band';
      const db = document.createElement('div');
      db.className = 'fx-band-db';
      const box = document.createElement('div');
      box.className = 'fx-vslider-box';
      const rng = document.createElement('input');
      rng.type = 'range';
      rng.className = 'fx-vslider';
      rng.min = '-12';
      rng.max = '12';
      rng.step = '0.5';
      const hz = document.createElement('button');
      hz.type = 'button';
      hz.className = 'fx-band-hz';
      hz.title = 'Nhấp để nhập tần số Hz · Chuột phải để đặt lại';

      rng.addEventListener('input', () => {
        this.deps.ensureAudio?.();
        this.dsp.setBandGain(i, Number(rng.value));
      });
      rng.addEventListener('dblclick', () => this.dsp.setBandGain(i, 0));

      hz.addEventListener('click', () => {
        const { min, max } = getBandFreqRange(this.dsp.state.bandFreqs, i);
        const cur = Math.round(this.dsp.state.bandFreqs[i]);
        const ans = window.prompt(`Nhập tần số trung tâm (Hz) cho dải ${i + 1} (${min} – ${max} Hz):`, String(cur));
        if (ans === null) return;
        const val = parseFloat(ans);
        if (Number.isFinite(val)) {
          this.dsp.setBandFreq(i, Math.max(min, Math.min(max, val)));
        }
      });
      hz.addEventListener('contextmenu', (ev) => {
        ev.preventDefault();
        const defF = getDefaultFreqs(n)[i];
        if (defF) this.dsp.setBandFreq(i, defF);
      });

      box.appendChild(rng);
      col.append(db, box, hz);
      this.eqBarsEl.appendChild(col);
      this._bandEls.push({ db, rng, hz });
    }
  }

  _bindEvents() {
    const q = (s) => this.root.querySelector(s);

    // Block game WASD/camera hotkeys while interacting with EQ modal
    this.root.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') {
        ev.stopPropagation();
        this.close();
      } else {
        ev.stopPropagation();
      }
    });

    this.root.addEventListener('click', (ev) => {
      if (ev.target === this.root) this.close();
    });

    q('[data-fx="close"]').onclick = () => this.close();
    q('[data-fx="disco"]').onclick = () => this.deps.toggleDisco?.();
    q('[data-fx="theme"]').onclick = () => {
      this.dsp.setTheme(this.dsp.state.theme === 'light' ? 'dark' : 'light');
    };
    q('[data-fx="power"]').onclick = () => {
      this.deps.ensureAudio?.();
      this.dsp.setPower(!this.dsp.state.powerOn);
    };
    q('[data-fx="restore"]').onclick = () => {
      this.dsp.restoreDefaults();
      this.deps.toast?.('Đã khôi phục cấu hình FxSound mặc định', 2200);
    };
    q('[data-fx="zero-fx"]').onclick = () => {
      for (const m of EFFECT_META) this.dsp.setEffect(m.key, 0);
    };
    q('[data-fx="eq-on"]').onclick = () => this.dsp.setEqOn(!this.dsp.state.eqOn);
    q('[data-fx="eq-flat"]').onclick = () => this.dsp.flatEq();

    this.selBands.onchange = () => {
      this.dsp.setNumBands(Number(this.selBands.value));
    };

    // Preset controls
    this.selPreset.onchange = () => {
      const p = this._allPresets().find((x) => x.id === this.selPreset.value);
      if (p) {
        this.deps.ensureAudio?.();
        this.dsp.applyPreset(p);
      }
    };

    const cyclePreset = (delta) => {
      const all = this._allPresets();
      const idx = Math.max(0, all.findIndex((x) => x.id === this.dsp.state.presetId));
      const nxt = all[(idx + delta + all.length) % all.length];
      if (nxt) {
        this.deps.ensureAudio?.();
        this.dsp.applyPreset(nxt);
      }
    };
    q('[data-fx="prev-pre"]').onclick = () => cyclePreset(-1);
    q('[data-fx="next-pre"]').onclick = () => cyclePreset(1);

    q('[data-fx="save-pre"]').onclick = () => {
      const defName = `DJ Preset ${this.userPresets.length + 1}`;
      const name = window.prompt('Đặt tên Preset mới:', defName);
      if (!name || !name.trim()) return;
      const st = this.dsp.state;
      const entry = {
        id: 'usr-' + Date.now().toString(36),
        name: name.trim().slice(0, 48),
        category: 'Preset Của Tôi',
        eqOn: st.eqOn,
        effects: { ...st.effects },
        numBands: st.numBands,
        bandFreqs: [...st.bandFreqs],
        bandGains: [...st.bandGains]
      };
      this.userPresets.push(entry);
      saveUserPresets(this.userPresets);
      this._populatePresetSelect();
      this.dsp.applyPreset(entry);
      this.deps.toast?.(`💾 Đã lưu Preset "${entry.name}"`, 2500);
    };

    this.btnDelPre.onclick = () => {
      const id = this.dsp.state.presetId;
      const idx = this.userPresets.findIndex((x) => x.id === id);
      if (idx < 0) return;
      const removed = this.userPresets.splice(idx, 1)[0];
      saveUserPresets(this.userPresets);
      this._populatePresetSelect();
      this.dsp.applyPreset(FACTORY_PRESETS[0]);
      this.deps.toast?.(`🗑️ Đã xóa Preset "${removed.name}"`, 2200);
    };

    q('[data-fx="imp-fac"]').onchange = async (ev) => {
      const file = ev.target.files?.[0];
      ev.target.value = '';
      if (!file) return;
      try {
        const text = await file.text();
        const preset = parseFacPreset(text, file.name.replace(/\.fac$/i, ''));
        this.userPresets.push(preset);
        saveUserPresets(this.userPresets);
        this._populatePresetSelect();
        this.deps.ensureAudio?.();
        this.dsp.applyPreset(preset);
        this.deps.toast?.(`📥 Đã nhập Preset FxSound "${preset.name}"`, 2800);
      } catch (err) {
        this.deps.toast?.('Lỗi đọc file .fac: ' + (err?.message || 'Không hợp lệ'), 3200);
      }
    };

    q('[data-fx="exp-fac"]').onclick = () => {
      const active = this._allPresets().find((x) => x.id === this.dsp.state.presetId);
      const name = active?.name || 'AnTuDuyen_DJ';
      const content = exportFacPreset(name, this.dsp.state);
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.replace(/[^\w\-.]+/g, '_')}.fac`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      this.deps.toast?.(`📤 Đã tải xuống file ${a.download}`, 2500);
    };

    // Master sliders
    for (const key of ['masterGain', 'volumeLeveling', 'filterQ', 'balance']) {
      const inp = q(`[data-fx="m-${key}"]`);
      inp.addEventListener('input', () => {
        this.deps.ensureAudio?.();
        this.dsp.setMasterParam(key, Number(inp.value));
      });
    }
    this.root.querySelectorAll('[data-fx="reset-m"]').forEach((el) => {
      el.ondblclick = () => {
        const k = el.dataset.key;
        this.dsp.setMasterParam(k, k === 'filterQ' ? 1 : 0);
      };
    });

    // DJ Deck Controls
    q('[data-fx="deck-track"]').onchange = (ev) => {
      this.deps.ensureAudio?.();
      this.dsp.selectTrack(Number(ev.target.value), true);
    };
    q('[data-fx="deck-play"]').onclick = () => {
      this.deps.ensureAudio?.();
      this.dsp.togglePlay();
    };
    q('[data-fx="deck-prev"]').onclick = () => {
      this.deps.ensureAudio?.();
      this.dsp.prevTrack(true);
    };
    q('[data-fx="deck-next"]').onclick = () => {
      this.deps.ensureAudio?.();
      this.dsp.nextTrack(true);
    };
    q('[data-fx="deck-file"]').onchange = (ev) => {
      const file = ev.target.files?.[0];
      ev.target.value = '';
      if (!file) return;
      this.deps.ensureAudio?.();
      this.dsp.loadLocalFile(file);
      this.deps.toast?.(`🎧 Đang phát DJ Deck: ${file.name}`, 2500);
    };
    q('[data-fx="deck-seek"]').oninput = (ev) => {
      this.dsp.seekFraction(Number(ev.target.value) / 1000);
    };
    q('[data-fx="deck-vol"]').oninput = (ev) => {
      this.dsp.setDeckVolume(Number(ev.target.value) / 100);
    };
    q('[data-fx="deck-rate"]').oninput = (ev) => {
      this.dsp.setDeckRate(Number(ev.target.value) / 100);
    };
    q('[data-fx="deck-solo"]').onchange = (ev) => {
      this.dsp.setDeckSolo(ev.target.checked);
    };
    q('[data-fx="dance-toggle"]').onclick = () => {
      this.deps.onToggleDance?.();
    };
    this.root.querySelectorAll('[data-fx="dance-style"]').forEach((btn) => {
      btn.onclick = () => this.deps.onSelectDanceStyle?.(btn.dataset.style);
    });
  }

  syncFromState() {
    const st = this.dsp.state;
    this.card.dataset.theme = st.theme;
    this.btnPower.classList.toggle('on', Boolean(st.powerOn));
    this.btnEqOn.classList.toggle('on', Boolean(st.eqOn));
    this.btnEqOn.textContent = st.eqOn ? 'EQ: BẬT' : 'EQ: TẮT';
    this.selBands.value = String(st.numBands);

    if (this.selPreset.value !== st.presetId && [...this.selPreset.options].some((o) => o.value === st.presetId)) {
      this.selPreset.value = st.presetId;
    }
    this.modTag.classList.toggle('show', Boolean(st.presetModified));
    const isUserPreset = this.userPresets.some((p) => p.id === st.presetId);
    this.btnDelPre.style.display = isUserPreset ? 'inline-flex' : 'none';

    for (const m of EFFECT_META) {
      const pair = this._effInputs[m.key];
      if (!pair) continue;
      const v = Number(st.effects[m.key] || 0);
      pair.inp.value = String(v);
      pair.valEl.textContent = v.toFixed(1);
    }

    if (this._bandEls.length !== st.bandGains.length) {
      this._rebuildBandSliders();
    }
    st.bandGains.forEach((g, i) => {
      const row = this._bandEls[i];
      if (!row) return;
      row.rng.value = String(g);
      row.db.textContent = (g > 0 ? '+' : '') + Number(g.toFixed(1));
      row.hz.textContent = formatHz(st.bandFreqs[i]);
    });

    const q = (s) => this.root.querySelector(s);
    q('[data-fx="m-masterGain"]').value = String(st.masterGain);
    q('[data-fx="val-masterGain"]').textContent = `${st.masterGain > 0 ? '+' : ''}${st.masterGain} dB`;
    q('[data-fx="m-volumeLeveling"]').value = String(st.volumeLeveling);
    q('[data-fx="val-volumeLeveling"]').textContent = `${st.volumeLeveling.toFixed(1)} dB`;
    q('[data-fx="m-filterQ"]').value = String(st.filterQ);
    q('[data-fx="val-filterQ"]').textContent = `${st.filterQ.toFixed(1)}x`;
    q('[data-fx="m-balance"]').value = String(st.balance);
    q('[data-fx="val-balance"]').textContent =
      st.balance === 0 ? 'Center' : st.balance < 0 ? `L ${Math.abs(st.balance)} dB` : `R ${st.balance} dB`;

    // Deck readout
    const d = this.dsp.getDeckInfo();
    q('[data-fx="deck-now"]').textContent = (d.playing ? '▶ ' : '⏸ ') + d.title;
    q('[data-fx="deck-play"]').textContent = d.playing ? '⏸ Tạm dừng' : '▶ Phát DJ';
    q('[data-fx="deck-solo"]').checked = d.solo;
    q('[data-fx="deck-vol"]').value = String(Math.round(d.volume * 100));
    q('[data-fx="deck-rate"]').value = String(Math.round(d.rate * 100));
    q('[data-fx="deck-rate-lbl"]').textContent = `${d.rate.toFixed(2)}x`;
    if (!d.custom) q('[data-fx="deck-track"]').value = String(d.index);

    const ds = this.deps.getDanceState?.();
    if (ds) {
      const btnD = q('[data-fx="dance-toggle"]');
      if (btnD) {
        btnD.classList.toggle('on', Boolean(ds.active));
        btnD.textContent = ds.active ? '⏸ Dừng nhảy (J)' : '🕺 Nhảy (J)';
      }
      this.root.querySelectorAll('[data-fx="dance-style"]').forEach((b) => {
        b.classList.toggle('on', ds.active && ds.style === b.dataset.style);
      });
    }
  }

  _drawVisualizer() {
    const cv = this.canvas;
    const g = this.ctx2d;
    if (!cv || !g) return;
    const W = cv.width;
    const H = cv.height;
    const st = this.dsp.state;
    const isLight = st.theme === 'light';

    g.clearRect(0, 0, W, H);
    g.fillStyle = isLight ? '#111824' : '#050507';
    g.fillRect(0, 0, W, H);

    // Subtle grid lines (+12 / 0 / -12 dB and octave markers)
    g.strokeStyle = 'rgba(255,255,255,0.08)';
    g.lineWidth = 1;
    for (const frac of [0.18, 0.5, 0.82]) {
      const y = Math.round(H * frac) + 0.5;
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(W, y);
      g.stroke();
    }
    const labelFreqs = [63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
    g.font = '10px "Be Vietnam Pro", system-ui, sans-serif';
    g.fillStyle = 'rgba(255,255,255,0.34)';
    g.textAlign = 'center';
    for (const f of labelFreqs) {
      const x = (Math.log(f / 24) / Math.log(20000 / 24)) * W;
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, H);
      g.stroke();
      g.fillText(formatHz(f), x, H - 5);
    }

    // Mirrored 10-band FxSound spectrum bars (modeled after FxVisualizer.cpp)
    const spec = this.dsp.sampleSpectrum();
    const totalBars = 60;
    const barGap = (W - 36) / totalBars;
    const barW = Math.max(3.5, barGap * 0.54);
    const grad = g.createLinearGradient(0, 0, 0, H);
    if (isLight) {
      grad.addColorStop(0, '#53ccff');
      grad.addColorStop(0.5, '#009cdd');
      grad.addColorStop(1, '#53ccff');
    } else {
      grad.addColorStop(0, '#fe566a');
      grad.addColorStop(0.5, '#d51535');
      grad.addColorStop(1, '#fe566a');
    }
    g.fillStyle = st.powerOn ? grad : 'rgba(130,130,145,0.35)';

    for (let i = 0; i < totalBars; i++) {
      const bandPos = (i / (totalBars - 1)) * 9;
      const b0 = Math.floor(bandPos);
      const b1 = Math.min(9, b0 + 1);
      const frac = bandPos - b0;
      const amp = spec[b0] * (1 - frac) + spec[b1] * frac;
      const bh = Math.max(4, amp * (H * 0.78));
      const x = 18 + i * barGap;
      const y = H * 0.5 - bh * 0.5;
      g.fillRect(x, y, barW, bh);
    }

    // Frequency response dB curve overlay
    const curveDb = this.dsp.getFrequencyResponseDb(LOG_FREQS);
    g.save();
    g.beginPath();
    for (let i = 0; i < LOG_FREQS.length; i++) {
      const x = (i / (LOG_FREQS.length - 1)) * W;
      const dbClamped = Math.max(-16, Math.min(16, curveDb[i]));
      const y = H * 0.5 - (dbClamped / 16) * (H * 0.38);
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.strokeStyle = st.powerOn ? (isLight ? '#7dd3fc' : '#ffd978') : '#94a3b8';
    g.lineWidth = 2.4;
    g.shadowColor = st.powerOn ? (isLight ? 'rgba(56,189,248,.65)' : 'rgba(255,217,120,.6)') : 'transparent';
    g.shadowBlur = 8;
    g.stroke();
    g.restore();

    // Update DJ deck playhead readout smoothly
    const d = this.dsp.getDeckInfo();
    const seekEl = this.root.querySelector('[data-fx="deck-seek"]');
    const timeEl = this.root.querySelector('[data-fx="deck-time"]');
    if (seekEl && timeEl && d.duration > 0) {
      seekEl.value = String(Math.round((d.currentTime / d.duration) * 1000));
      timeEl.textContent = `${fmtTime(d.currentTime)} / ${fmtTime(d.duration)}`;
    }
  }

  _tick = () => {
    if (!this.isOpen) return;
    this._drawVisualizer();
    this._raf = requestAnimationFrame(this._tick);
  };

  open() {
    this.isOpen = true;
    this.root.classList.add('open');
    this.syncFromState();
    cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame(this._tick);
  }

  close() {
    this.isOpen = false;
    this.root.classList.remove('open');
    cancelAnimationFrame(this._raf);
  }
}
