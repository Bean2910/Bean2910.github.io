const REWARD_LABELS = {
  incense: 'Dâng hương chính điện',
  sanIncense: 'Dâng hương đỉnh sân',
  banIncense: 'Dâng hương ban thờ',
  lay: 'Lạy Phật (mỗi lạy)',
  bell: 'Thỉnh chuông chùa',
  mo: 'Gõ mõ tụng kinh (nhịp)',
  beadsRound: 'Tròn 1 chuỗi 108 hạt',
  lamp: 'Thắp đèn dâng Phật',
  lantern: 'Thả hoa đăng',
  vow: 'Gửi lời nguyện lành',
  quet: 'Quét lá sân chùa',
  ca: 'Phóng sinh / Cho cá ăn',
  xam: 'Gieo quẻ xăm',
  offerFlowers: 'Dâng hoa cúng Phật',
  water: 'Tưới hoa vườn chùa',
  sitMin: 'Ngồi thiền (mỗi phút)',
  bode: 'Nhặt 1 hạt bồ đề',
  bodeAll: 'Đủ 108 hạt bồ đề',
  tkDone: 'Tụng kinh hồi hướng',
  greet: 'Chào bạn đồng tu',
  gift: 'Tặng hương bạn đồng tu',
  petFeed: 'Chăm sóc tiểu thú',
  linhVatStep: 'Mỗi bước Linh Vật',
  linhVatBond: 'Hoàn tất kết duyên Linh Vật',
  vegFeast: 'Dự Tiệc Chay (12h00 / 18h00 · mỗi món)',
  vegTaste: 'Nếm món chay ngoài giờ (mỗi ngày)',
  weekly6Bonus: 'Thưởng đạt 6/9 việc tuần'
};

const FEST_STEP_KINDS = [
  { id: 'incense', label: 'Dâng hương' },
  { id: 'lay', label: 'Lạy Phật' },
  { id: 'lantern', label: 'Thả hoa đăng' },
  { id: 'bell', label: 'Thỉnh chuông' },
  { id: 'lamp', label: 'Thắp đèn dâng Phật' },
  { id: 'vow', label: 'Gửi lời nguyện' },
  { id: 'offerFlowers', label: 'Dâng hoa cúng Phật' },
  { id: 'quet', label: 'Quét lá sân chùa' },
  { id: 'ca', label: 'Cho cá ăn / Phóng sinh' },
  { id: 'xam', label: 'Gieo quẻ xăm' },
  { id: 'sitMin', label: 'Ngồi thiền (phút)' }
];

const RACE_DIFF_LABELS = {
  de: 'Dễ',
  trungbinh: 'Trung Bình',
  kho: 'Khó',
  cuckho: 'Cực Khó'
};
const RACE_MAP_LABELS = {
  random: 'Ngẫu nhiên',
  easy: 'Dễ',
  medium: 'Uốn lượn',
  complex: 'Phức tạp',
  extreme: 'Siêu xoắn'
};

let appState = null;
let adminPin = localStorage.getItem('chua_admin_pin') || '';
let activeTab = 'overview';
let activeQuestPool = 'daily';
let selectedCid = null;
let lastRenderedPlayerCid = null;
let playerDetailDirty = false;
let draftQuests = null;
let draftFestSteps = [];
let autoTimer = null;

const $ = (sel) => document.querySelector(sel);

function esc(val) {
  return String(val ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function showToast(msg, isError = false) {
  const el = $('#toast');
  el.textContent = msg;
  el.style.borderColor = isError ? '#d95f56' : '#d9b25f';
  el.style.color = isError ? '#ff9d96' : '#d9b25f';
  el.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.add('hidden'), 3200);
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (adminPin) headers['X-Admin-Pin'] = adminPin;
  const res = await fetch(path, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    $('#pinModal').classList.remove('hidden');
    throw new Error(data.error || 'Yêu cầu mã PIN quản trị.');
  }
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

async function loadState(forceSyncDrafts = false) {
  try {
    const data = await api('/api/admin/state');
    appState = data;
    $('#pinModal').classList.add('hidden');
    if (forceSyncDrafts || !draftQuests) {
      draftQuests = JSON.parse(JSON.stringify(data.config.questsConfig));
    }
    renderAll(forceSyncDrafts);
  } catch (err) {
    if (!$('#pinModal').classList.contains('hidden')) return;
    showToast(err.message, true);
  }
}

function renderAll(resetInputs = false) {
  if (!appState) return;
  const { onlineCount, totalCharacters, meta, config, rooms } = appState;
  $('#serverMeta').textContent = `Online: ${onlineCount} · Nhân vật: ${totalCharacters} · ${meta.currentVnTime}`;

  renderOverviewStats();
  renderLinhVatSchedule();
  if (resetInputs) {
    $('#lvCooldownToggle').checked = Boolean(config.linhVatSessionCooldown);
    $('#freeCraneToggle').checked = Boolean(config.allowFreeCraneAnytime);
    const rc = config.buffaloRace || { enabled: true, botCount: 5, difficulty: 'trungbinh', mapMode: 'random', laps: 2, autoSchedule: true, intervalMin: 10, ambientBots: true };
    $('#raceEnabledToggle').checked = rc.enabled !== false;
    $('#raceBotCountInput').value = rc.botCount ?? 5;
    $('#raceDifficultySelect').value = RACE_DIFF_LABELS[rc.difficulty] ? rc.difficulty : 'trungbinh';
    $('#raceMapModeSelect').value = RACE_MAP_LABELS[rc.mapMode] ? rc.mapMode : 'random';
    $('#raceLapsInput').value = rc.laps ?? 2;
    $('#raceIntervalMinInput').value = rc.intervalMin ?? 10;
    $('#raceAutoScheduleToggle').checked = rc.autoSchedule !== false;
    $('#raceAmbientBotsToggle').checked = rc.ambientBots !== false;
    const vf = config.vegFeast || { enabled: true, hours: [12, 18], durationMin: 60, maxDishesPerSlot: 3 };
    $('#vegEnabledToggle').checked = vf.enabled !== false;
    $('#vegHoursInput').value = Array.isArray(vf.hours) ? vf.hours.join(', ') : '12, 18';
    $('#vegDurationInput').value = vf.durationMin ?? 60;
    $('#vegMaxDishesInput').value = vf.maxDishesPerSlot ?? 3;
    renderFestivalForm();
    renderRewardsGrid();
  }
  renderQuizStatus();
  renderRoomsSelects(rooms);
  if (resetInputs || !$('#questsEditorList')?.contains(document.activeElement)) {
    renderQuestsEditor();
  }
  renderPlayersList();
  if (selectedCid && (resetInputs || selectedCid !== lastRenderedPlayerCid || (!playerDetailDirty && !$('#playerDetailPanel')?.contains(document.activeElement)))) {
    renderPlayerDetail();
  }
  renderWorldPanel();
}

function renderOverviewStats() {
  const { onlineCount, totalCharacters, rooms, quiz, config } = appState;
  const mainRoom = rooms[0] || { incense: 0, yardIncense: 0, lamps: 0 };
  const rc = config.buffaloRace || { enabled: true, botCount: 5, difficulty: 'trungbinh', laps: 2, intervalMin: 10, autoSchedule: true, ambientBots: true };
  const rs = appState.meta?.raceSchedule;
  const rsEl = $('#raceSchedMeta');
  if (rsEl) {
    if (!rc.enabled) rsEl.textContent = 'Trường đua đang tắt.';
    else if (!rc.autoSchedule) rsEl.textContent = 'Tự mở giải định kỳ đang tắt (Bot vẫn có thể chạy tự do).';
    else if (rs) {
      const m = Math.floor(rs.remSec / 60), s = rs.remSec % 60;
      rsEl.textContent = `Giải định kỳ kế tiếp: ${rs.nextLabel} (còn ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}) · Nhắc toàn chùa lúc 3p / 2p / 1p.`;
    }
  }
  const vs = appState.meta?.vegFeastState;
  const vsEl = $('#vegSchedMeta');
  if (vsEl && vs) {
    if (!vs.enabled) vsEl.textContent = 'Khu Tiệc Chay định kỳ đang tạm tắt.';
    else if (vs.isOpen) {
      const m = Math.floor(vs.remSec / 60), s = vs.remSec % 60;
      vsEl.textContent = `🟢 ĐANG MỞ: ${vs.activeLabel} (còn ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}) · +${vs.meritPerDish || 0} CĐ/món (tối đa ${vs.maxDishesPerSlot} món/ca).`;
    } else {
      const h = Math.floor(vs.nextInSec / 3600), m = Math.floor((vs.nextInSec % 3600) / 60);
      vsEl.textContent = `⏳ Đang chờ đến giờ tiệc (${vs.hoursText}) · Tiệc tiếp theo: ${vs.nextLabel} (còn ${h}g ${String(m).padStart(2, '0')}p).`;
    }
  }
  $('#overviewStats').innerHTML = `
    <div class="stat-box"><div class="label">Người đang online</div><div class="val">${onlineCount}</div></div>
    <div class="stat-box"><div class="label">Tổng nhân vật lưu</div><div class="val">${totalCharacters}</div></div>
    <div class="stat-box"><div class="label">Hương điện / sân / đèn</div><div class="val">${mainRoom.incense} · ${mainRoom.yardIncense} · ${mainRoom.lamps}</div></div>
    <div class="stat-box"><div class="label">Chia giờ Linh Vật</div><div class="val">${config.linhVatSessionCooldown ? 'Theo Sáng/Chiều' : 'Tự do 24/7'}</div></div>
    <div class="stat-box"><div class="label">Đường đua trâu</div><div class="val">${rc.enabled === false ? 'Đang tắt' : `${rc.botCount ?? 5} bot · ${RACE_DIFF_LABELS[rc.difficulty] || 'Trung Bình'} · ${rc.intervalMin || 10}p`}</div></div>
    <div class="stat-box"><div class="label">Lễ hội / Đố vui</div><div class="val">${config.festival.enabled ? esc(config.festival.id) : 'Tắt'} · ${esc(quiz.phase)}</div></div>
  `;
}

function renderLinhVatSchedule() {
  const { linhVatSlotsNow, linhVatWindows, vnHour } = appState.meta;
  const labels = { trau: '🐂 Trâu (Ngoài cổng)', hac: '🦢 Hạc trắng (Hồ sen)', rua: '🐢 Rùa thần (Ao sau)' };
  const rows = Object.keys(labels).map((k) => {
    const slot = linhVatSlotsNow[k];
    const wins = linhVatWindows[k].map(([a, b]) => `${a}–${b}h`).join(' & ');
    const badge = slot === 0
      ? '<span class="badge ok">Ca Sáng đang mở</span>'
      : slot === 1
        ? '<span class="badge ok">Ca Chiều đang mở</span>'
        : `<span class="badge warn">Ngoài giờ (${vnHour}h VN)</span>`;
    return `<div class="schedule-item"><div><strong>${labels[k]}</strong><div class="muted" style="margin:2px 0 0;">Khung giờ: ${wins}</div></div>${badge}</div>`;
  }).join('');
  $('#lvScheduleList').innerHTML = rows;
}

function renderFestivalForm() {
  const f = appState.config.festival;
  $('#festEnabledToggle').checked = Boolean(f.enabled);
  $('#festIdInput').value = f.id || '';
  $('#festRewardInput').value = f.reward ?? 40;
  $('#festKeepInput').value = f.keep || '';
  $('#festPrizeInput').value = f.prize || '';
  $('#festLunarDayInput').value = f.lunar?.day ?? 15;
  $('#festLunarMonthInput').value = f.lunar?.month ?? 1;
  $('#festBannerInput').value = f.banner || '';
  draftFestSteps = JSON.parse(JSON.stringify(f.steps || []));
  renderFestivalSteps();

  const presets = appState.meta.festivalPresets || {};
  $('#festPresetBar').innerHTML = Object.entries(presets).map(([key, p]) =>
    `<button class="btn small gold" type="button" data-preset="${esc(key)}">${esc(p.keep)}</button>`
  ).join('');
  $('#festPresetBar').querySelectorAll('[data-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = presets[btn.dataset.preset];
      if (!p) return;
      $('#festIdInput').value = p.id;
      $('#festRewardInput').value = p.reward;
      $('#festKeepInput').value = p.keep;
      $('#festPrizeInput').value = p.prize;
      $('#festLunarDayInput').value = p.lunar.day;
      $('#festLunarMonthInput').value = p.lunar.month;
      $('#festBannerInput').value = p.banner;
      draftFestSteps = JSON.parse(JSON.stringify(p.steps));
      renderFestivalSteps();
      showToast(`Đã nạp mẫu "${p.keep}" — bấm Lưu để áp dụng`);
    });
  });
}

function renderFestivalSteps() {
  const container = $('#festStepsContainer');
  container.innerHTML = draftFestSteps.map((st, idx) => `
    <div class="step-row">
      <select data-fkind="${idx}">
        ${FEST_STEP_KINDS.map((k) => `<option value="${k.id}" ${st.kind === k.id ? 'selected' : ''}>${esc(k.label)}</option>`).join('')}
      </select>
      <input type="text" data-flabel="${idx}" value="${esc(st.label)}" placeholder="Mô tả bước..." />
      <input type="number" min="1" data-fneed="${idx}" value="${Number(st.need) || 1}" />
      <button class="btn small danger" type="button" data-fdel="${idx}">✕</button>
    </div>
  `).join('');

  container.querySelectorAll('[data-fkind]').forEach((el) => {
    el.addEventListener('change', (e) => { draftFestSteps[Number(el.dataset.fkind)].kind = e.target.value; });
  });
  container.querySelectorAll('[data-flabel]').forEach((el) => {
    el.addEventListener('input', (e) => { draftFestSteps[Number(el.dataset.flabel)].label = e.target.value; });
  });
  container.querySelectorAll('[data-fneed]').forEach((el) => {
    el.addEventListener('input', (e) => { draftFestSteps[Number(el.dataset.fneed)].need = Math.max(1, Number(e.target.value) || 1); });
  });
  container.querySelectorAll('[data-fdel]').forEach((el) => {
    el.addEventListener('click', () => {
      draftFestSteps.splice(Number(el.dataset.fdel), 1);
      renderFestivalSteps();
    });
  });
}

function renderQuizStatus() {
  const q = appState.quiz;
  const badge = $('#quizStatusBadge');
  badge.textContent = q.phase === 'off' ? 'Đang tắt' : `Đang chạy: ${q.phase} (${q.i + 1}/${q.n})`;
  badge.className = `badge ${q.phase === 'off' ? '' : 'ok'}`;
  const topHtml = q.top && q.top.length
    ? q.top.map((r, i) => `<div>#${i + 1} <strong>${esc(r.name)}</strong> — ${r.pts} điểm (${r.right} câu đúng)</div>`).join('')
    : '<span class="muted">Chưa có điểm nào trong phiên này.</span>';
  $('#quizLiveBoard').innerHTML = `<strong>Bảng xếp hạng Đố vui:</strong><div style="margin-top:6px;">${topHtml}</div>`;
}

function renderRoomsSelects(rooms) {
  const annSel = $('#annRoomSelect');
  const worldSel = $('#worldRoomSelect');
  const prevAnn = annSel.value || 'all';
  const prevWorld = worldSel.value || (rooms[0]?.name || 'chua-1');
  annSel.innerHTML = `<option value="all">Tất cả phòng chùa</option>` + rooms.map((r) => `<option value="${esc(r.name)}">${esc(r.name)} (${r.online} online)</option>`).join('');
  annSel.value = [...annSel.options].some((o) => o.value === prevAnn) ? prevAnn : 'all';

  worldSel.innerHTML = rooms.map((r) => `<option value="${esc(r.name)}">${esc(r.name)} (${r.online} online)</option>`).join('');
  worldSel.value = [...worldSel.options].some((o) => o.value === prevWorld) ? prevWorld : (rooms[0]?.name || 'chua-1');
}

function renderRewardsGrid() {
  const rewards = appState.config.rewards;
  $('#rewardsGrid').innerHTML = Object.keys(REWARD_LABELS).map((k) => `
    <div class="reward-item">
      <label>${esc(REWARD_LABELS[k])}</label>
      <input type="number" min="0" data-reward-key="${esc(k)}" value="${Number(rewards[k]) || 0}" />
    </div>
  `).join('');
}

function renderQuestsEditor() {
  if (!draftQuests || !appState) return;
  const list = draftQuests[activeQuestPool] || [];
  const metaIds = appState.meta.questIds || [];
  $('#questsEditorList').innerHTML = list.map((q, idx) => `
    <div class="quest-row">
      <select data-qid="${idx}">
        ${metaIds.map((m) => `<option value="${esc(m.id)}" ${q.id === m.id ? 'selected' : ''}>${esc(m.id)} · ${esc(m.label)}</option>`).join('')}
        ${!metaIds.some((m) => m.id === q.id) ? `<option value="${esc(q.id)}" selected>${esc(q.id)}</option>` : ''}
      </select>
      <input type="text" data-qtitle="${idx}" value="${esc(q.title)}" placeholder="Tên hiển thị nhiệm vụ..." />
      <input type="number" min="1" data-qneed="${idx}" value="${Number(q.need) || 1}" title="Chỉ tiêu (need)" />
      <input type="number" min="0" data-qreward="${idx}" value="${Number(q.reward) || 0}" title="Thưởng công đức" />
      <button class="btn small danger" type="button" data-qdel="${idx}">✕</button>
    </div>
  `).join('');

  const c = $('#questsEditorList');
  c.querySelectorAll('[data-qid]').forEach((el) => el.addEventListener('change', (e) => { list[Number(el.dataset.qid)].id = e.target.value; }));
  c.querySelectorAll('[data-qtitle]').forEach((el) => el.addEventListener('input', (e) => { list[Number(el.dataset.qtitle)].title = e.target.value; }));
  c.querySelectorAll('[data-qneed]').forEach((el) => el.addEventListener('input', (e) => { list[Number(el.dataset.qneed)].need = Math.max(1, Number(e.target.value) || 1); }));
  c.querySelectorAll('[data-qreward]').forEach((el) => el.addEventListener('input', (e) => { list[Number(el.dataset.qreward)].reward = Math.max(0, Number(e.target.value) || 0); }));
  c.querySelectorAll('[data-qdel]').forEach((el) => el.addEventListener('click', () => {
    list.splice(Number(el.dataset.qdel), 1);
    renderQuestsEditor();
  }));
}

function renderPlayersList() {
  const kw = ($('#playerSearchInput').value || '').trim().toLowerCase();
  const filt = $('#playerFilterSelect').value;
  const rows = (appState.players || []).filter((p) => {
    if (filt === 'online' && !p.online) return false;
    if (filt === 'banned' && !p.banned) return false;
    if (!kw) return true;
    return p.name.toLowerCase().includes(kw) || p.cid.toLowerCase().includes(kw) || (p.user || '').toLowerCase().includes(kw);
  });

  if (!rows.length) {
    $('#playersList').innerHTML = '<div class="empty-state">Không có nhân vật phù hợp.</div>';
    return;
  }

  $('#playersList').innerHTML = rows.map((p) => `
    <div class="player-item ${selectedCid === p.cid ? 'active' : ''}" data-select-cid="${esc(p.cid)}">
      <div>
        <div><strong>${esc(p.name)}</strong> ${p.user ? `<span class="muted">@${esc(p.user)}</span>` : ''}</div>
        <div class="muted" style="margin:2px 0 0;">${esc(p.levelName)} · ${p.merit.toLocaleString('vi-VN')} công đức · ${p.bows} lạy</div>
      </div>
      <div>
        ${p.banned ? '<span class="badge danger">Khóa</span>' : p.online ? '<span class="badge ok">Online</span>' : '<span class="badge">Offline</span>'}
      </div>
    </div>
  `).join('');

  $('#playersList').querySelectorAll('[data-select-cid]').forEach((el) => {
    el.addEventListener('click', () => {
      selectedCid = el.dataset.selectCid;
      playerDetailDirty = false;
      renderPlayersList();
      renderPlayerDetail();
    });
  });
}

function renderPlayerDetail() {
  const panel = $('#playerDetailPanel');
  const p = (appState.players || []).find((x) => x.cid === selectedCid);
  if (!p) {
    lastRenderedPlayerCid = null;
    playerDetailDirty = false;
    panel.innerHTML = '<div class="empty-state">Chọn một nhân vật bên trái để xem và chỉnh sửa chi tiết.</div>';
    return;
  }
  lastRenderedPlayerCid = selectedCid;
  playerDetailDirty = false;
  const titles = appState.meta.titles || [];
  const unlockedSet = new Set(p.unlockedTitles || ['nguoi_moi']);

  panel.innerHTML = `
    <div class="card-head">
      <div>
        <h2>${esc(p.name)} ${p.online ? '<span class="badge ok">Online</span>' : '<span class="badge">Offline</span>'} ${p.banned ? '<span class="badge danger">Đang khóa</span>' : ''}</h2>
        <div class="muted" style="margin:2px 0 0;">CID: <code>${esc(p.cid)}</code> · Cấp: <strong>${esc(p.levelName)}</strong> ${p.user ? `· @${esc(p.user)}` : ''}</div>
      </div>
      <div class="row gap">
        <button class="btn small" id="pNoticeBtn">💬 Gửi tin nhắn</button>
        <button class="btn small warn" id="pResetLvBtn">🐂 Mở ca Linh Vật</button>
        ${p.online ? '<button class="btn small" id="pKickBtn">🔌 Ngắt kết nối</button>' : ''}
        <button class="btn small ${p.banned ? 'gold' : 'danger'}" id="pBanBtn">${p.banned ? 'Mở khóa' : 'Khóa'}</button>
        <button class="btn small warn" id="pResetStatsBtn">↺ Reset chỉ số</button>
        <button class="btn small danger" id="pDeleteBtn">🗑 Xóa</button>
      </div>
    </div>

    <div class="grid-3 compact">
      <div class="form-group"><label>Tên nhân vật</label><input id="edName" value="${esc(p.name)}" /></div>
      <div class="form-group"><label>Tổng công đức</label><input id="edMerit" type="number" min="0" value="${p.merit}" /></div>
      <div class="form-group"><label>Công đức hôm nay</label><input id="edTodayMerit" type="number" min="0" value="${p.todayMerit}" /></div>
      <div class="form-group"><label>Công đức tuần</label><input id="edWeekMerit" type="number" min="0" value="${p.weekMerit}" /></div>
      <div class="form-group"><label>Lạy Phật</label><input id="edBows" type="number" min="0" value="${p.bows}" /></div>
      <div class="form-group"><label>Chuỗi 108 hạt</label><input id="edRounds" type="number" min="0" value="${p.rounds}" /></div>
      <div class="form-group"><label>Số hạt đã lần</label><input id="edBeads" type="number" min="0" value="${p.countedBeads}" /></div>
      <div class="form-group"><label>Phút ngồi thiền</label><input id="edSitMin" type="number" min="0" value="${p.sitMin}" /></div>
      <div class="form-group"><label>Số ngày lên chùa</label><input id="edDays" type="number" min="1" value="${p.days}" /></div>
      <div class="form-group"><label>Chuỗi ngày hiện tại</label><input id="edStreak" type="number" min="1" value="${p.streak}" /></div>
      <div class="form-group"><label>Chuỗi ngày kỷ lục</label><input id="edBestStreak" type="number" min="1" value="${p.bestStreak}" /></div>
      <div class="form-group"><label>Số lần dâng hương</label><input id="edIncense" type="number" min="0" value="${p.incenseCount}" /></div>
      <div class="form-group"><label>Số hoa đăng</label><input id="edLanterns" type="number" min="0" value="${p.lanternCount}" /></div>
      <div class="form-group"><label>Số tiếng chuông</label><input id="edBell" type="number" min="0" value="${p.bellCount}" /></div>
      <div class="form-group"><label>Số tiếng mõ</label><input id="edMo" type="number" min="0" value="${p.moCount}" /></div>
      <div class="form-group"><label>Quét lá sân chùa</label><input id="edSweep" type="number" min="0" value="${p.sweepCount}" /></div>
      <div class="form-group"><label>Cho cá / chim ăn</label><input id="edFeed" type="number" min="0" value="${p.feedCount}" /></div>
      <div class="form-group"><label>Số lời nguyện</label><input id="edVow" type="number" min="0" value="${p.vowCount}" /></div>
    </div>

    <hr class="sep" />
    <h3>Linh Vật đồng hành</h3>
    <div class="grid-3 compact">
      <div class="form-group">
        <label>Trâu (0–10 tranh) · Ca: ${esc(p.lvTrau?.lastDate || 'chưa')} (${p.lvTrau?.lastW ?? -1})</label>
        <input id="edTrau" type="number" min="0" max="10" value="${p.lvTrau?.s || 0}" />
      </div>
      <div class="form-group">
        <label>Hạc trắng (0–7 bậc) · Ca: ${esc(p.lvHac?.lastDate || 'chưa')} (${p.lvHac?.lastW ?? -1})</label>
        <input id="edHac" type="number" min="0" max="7" value="${p.lvHac?.s || 0}" />
      </div>
      <div class="form-group">
        <label>Rùa thần (0–7 bậc) · Ca: ${esc(p.lvRua?.lastDate || 'chưa')} (${p.lvRua?.lastW ?? -1})</label>
        <input id="edRua" type="number" min="0" max="7" value="${p.lvRua?.s || 0}" />
      </div>
    </div>

    <hr class="sep" />
    <div class="card-head">
      <h3 id="titlesCountHeading">Danh hiệu đã mở (${unlockedSet.size}/${titles.length})</h3>
      <div class="row gap">
        <button type="button" class="btn small gold" id="unlockAllTitlesBtn">⚡ Mở hết ${titles.length} danh hiệu</button>
        <button type="button" class="btn small" id="clearTitlesBtn">↺ Chỉ giữ mặc định</button>
        <select id="edTitleEquipped" style="width:auto; min-width:200px;">
          ${titles.map((t) => `<option value="${esc(t.id)}" ${p.title === t.id ? 'selected' : ''}>Đeo: ${esc(t.name)}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="titles-grid">
      ${titles.map((t) => `
        <label class="title-chip">
          <input type="checkbox" data-utitle="${esc(t.id)}" ${unlockedSet.has(t.id) ? 'checked' : ''} ${t.id === 'nguoi_moi' ? 'disabled' : ''} />
          <div><strong>${esc(t.name)}</strong><div class="muted" style="margin:2px 0 0;">${esc(t.desc)}</div></div>
        </label>
      `).join('')}
    </div>

    <div class="row end gap" style="margin-top:16px;">
      <span id="playerDirtyBadge" class="badge warn hidden">Có thay đổi chưa lưu</span>
      <button id="savePlayerBtn" class="btn primary">💾 Lưu thay đổi nhân vật</button>
    </div>
  `;

  const updateTitleHeading = () => {
    const count = panel.querySelectorAll('[data-utitle]:checked').length;
    $('#titlesCountHeading').textContent = `Danh hiệu đã mở (${count}/${titles.length})`;
  };

  panel.querySelectorAll('input, select').forEach((el) => {
    const markDirty = () => {
      playerDetailDirty = true;
      $('#playerDirtyBadge')?.classList.remove('hidden');
      if (el.matches('[data-utitle]')) updateTitleHeading();
    };
    el.addEventListener('input', markDirty);
    el.addEventListener('change', markDirty);
  });

  const savePlayerChanges = async (customToast = null) => {
    const unlockedTitles = [...panel.querySelectorAll('[data-utitle]:checked')].map((el) => el.dataset.utitle);
    try {
      const res = await api('/api/admin/player/update', {
        method: 'POST',
        body: JSON.stringify({
          cid: p.cid,
          patch: {
            name: $('#edName').value,
            merit: Number($('#edMerit').value),
            todayMerit: Number($('#edTodayMerit').value),
            weekMerit: Number($('#edWeekMerit').value),
            bows: Number($('#edBows').value),
            rounds: Number($('#edRounds').value),
            countedBeads: Number($('#edBeads').value),
            sitMin: Number($('#edSitMin').value),
            days: Number($('#edDays').value),
            streak: Number($('#edStreak').value),
            bestStreak: Number($('#edBestStreak').value),
            incenseCount: Number($('#edIncense').value),
            lanternCount: Number($('#edLanterns').value),
            bellCount: Number($('#edBell').value),
            moCount: Number($('#edMo').value),
            sweepCount: Number($('#edSweep').value),
            feedCount: Number($('#edFeed').value),
            vowCount: Number($('#edVow').value),
            lvTrau: { s: Number($('#edTrau').value) },
            lvHac: { s: Number($('#edHac').value) },
            lvRua: { s: Number($('#edRua').value) },
            unlockedTitles,
            title: $('#edTitleEquipped').value
          }
        })
      });
      playerDetailDirty = false;
      lastRenderedPlayerCid = null;
      appState = res.state;
      renderAll(false);
      showToast(customToast || `Đã lưu nhân vật ${p.name}`);
    } catch (err) {
      showToast(err.message, true);
    }
  };

  $('#savePlayerBtn').addEventListener('click', () => savePlayerChanges());

  $('#unlockAllTitlesBtn').addEventListener('click', () => {
    panel.querySelectorAll('[data-utitle]').forEach((chk) => { chk.checked = true; });
    updateTitleHeading();
    savePlayerChanges(`Đã mở khóa toàn bộ ${titles.length}/${titles.length} danh hiệu cho ${p.name}!`);
  });

  $('#clearTitlesBtn').addEventListener('click', () => {
    panel.querySelectorAll('[data-utitle]').forEach((chk) => {
      if (chk.dataset.utitle !== 'nguoi_moi') chk.checked = false;
    });
    $('#edTitleEquipped').value = 'nguoi_moi';
    updateTitleHeading();
    savePlayerChanges(`Đã đặt lại danh hiệu của ${p.name} về mặc định.`);
  });

  const doPlayerAction = async (action, extra = {}) => {
    try {
      const res = await api('/api/admin/player/action', {
        method: 'POST',
        body: JSON.stringify({ cid: p.cid, action, ...extra })
      });
      if (action === 'delete') selectedCid = null;
      playerDetailDirty = false;
      lastRenderedPlayerCid = null;
      appState = res.state;
      renderAll(false);
      showToast('Đã thực hiện lệnh quản trị.');
    } catch (err) {
      showToast(err.message, true);
    }
  };

  $('#pNoticeBtn').addEventListener('click', () => {
    const text = prompt(`Gửi thông báo tới ${p.name}:`, '');
    if (text && text.trim()) doPlayerAction('notice', { text: text.trim() });
  });
  $('#pResetLvBtn').addEventListener('click', () => doPlayerAction('reset-linhvat-cooldown', { kind: 'all' }));
  $('#pKickBtn')?.addEventListener('click', () => doPlayerAction('kick'));
  $('#pBanBtn').addEventListener('click', () => doPlayerAction(p.banned ? 'unban' : 'ban'));
  $('#pResetStatsBtn').addEventListener('click', () => {
    if (confirm(`Đặt lại toàn bộ công đức & chỉ số của "${p.name}" về 0?`)) doPlayerAction('reset-stats');
  });
  $('#pDeleteBtn').addEventListener('click', () => {
    if (confirm(`Xóa vĩnh viễn nhân vật "${p.name}" (${p.cid})?`)) doPlayerAction('delete');
  });
}

function renderWorldPanel() {
  const roomName = $('#worldRoomSelect').value || 'chua-1';
  const room = (appState.rooms || []).find((r) => r.name === roomName) || appState.rooms?.[0];
  if (!room) return;
  if (document.activeElement !== $('#worldIncenseInput')) $('#worldIncenseInput').value = room.incense;
  if (document.activeElement !== $('#worldYardIncenseInput')) $('#worldYardIncenseInput').value = room.yardIncense;
  if (document.activeElement !== $('#worldLampsInput')) $('#worldLampsInput').value = room.lamps;

  $('#donorsList').innerHTML = (room.donors || []).length
    ? room.donors.map((d, idx) => `
      <div class="list-row">
        <span>${esc(d.name)}</span>
        <button class="btn small danger" data-del-donor="${idx}">Xóa</button>
      </div>
    `).join('')
    : '<div class="muted">Bảng vàng chưa có tên thí chủ nào.</div>';

  $('#donorsList').querySelectorAll('[data-del-donor]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        const res = await api('/api/admin/world', {
          method: 'POST',
          body: JSON.stringify({ room: room.name, action: 'remove-donor', index: Number(btn.dataset.delDonor) })
        });
        appState = res.state;
        renderWorldPanel();
      } catch (err) { showToast(err.message, true); }
    });
  });

  $('#vowsList').innerHTML = (room.vows || []).length
    ? room.vows.map((v) => `
      <div class="list-row">
        <div><strong>${esc(v.name)}:</strong> ${esc(v.text)}</div>
        <button class="btn small danger" data-del-vow="${esc(v.id)}">Xóa</button>
      </div>
    `).join('')
    : '<div class="muted">Chưa có lời nguyện nào.</div>';

  $('#vowsList').querySelectorAll('[data-del-vow]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        const res = await api('/api/admin/world', {
          method: 'POST',
          body: JSON.stringify({ room: room.name, action: 'remove-vow', id: btn.dataset.delVow })
        });
        appState = res.state;
        renderWorldPanel();
      } catch (err) { showToast(err.message, true); }
    });
  });

  $('#lanternsList').innerHTML = (room.lanterns || []).length
    ? room.lanterns.map((l) => `
      <div class="list-row">
        <div><strong>${esc(l.name)}:</strong> ${esc(l.text)}</div>
        <button class="btn small danger" data-del-lantern="${esc(l.id)}">Thu hồi</button>
      </div>
    `).join('')
    : '<div class="muted">Chưa có hoa đăng nào.</div>';

  $('#lanternsList').querySelectorAll('[data-del-lantern]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        const res = await api('/api/admin/world', {
          method: 'POST',
          body: JSON.stringify({ room: room.name, action: 'remove-lantern', id: btn.dataset.delLantern })
        });
        appState = res.state;
        renderWorldPanel();
      } catch (err) { showToast(err.message, true); }
    });
  });
}

// Event Wiring
document.querySelectorAll('.tab').forEach((btn) => {
  btn.addEventListener('click', () => {
    activeTab = btn.dataset.tab;
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === btn));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === `tab-${activeTab}`));
  });
});

document.querySelectorAll('.subtab').forEach((btn) => {
  btn.addEventListener('click', () => {
    activeQuestPool = btn.dataset.qpool;
    document.querySelectorAll('.subtab').forEach((t) => t.classList.toggle('active', t === btn));
    renderQuestsEditor();
  });
});

$('#pinSubmitBtn').addEventListener('click', async () => {
  const pin = $('#pinInput').value.trim();
  try {
    await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ pin }) });
    adminPin = pin;
    localStorage.setItem('chua_admin_pin', pin);
    $('#pinError').classList.add('hidden');
    await loadState(true);
  } catch (err) {
    $('#pinError').textContent = err.message;
    $('#pinError').classList.remove('hidden');
  }
});

$('#refreshBtn').addEventListener('click', () => loadState(true));
$('#playerSearchInput').addEventListener('input', renderPlayersList);
$('#playerFilterSelect').addEventListener('change', renderPlayersList);
$('#worldRoomSelect').addEventListener('change', renderWorldPanel);

$('#saveLvCooldownBtn').addEventListener('click', async () => {
  try {
    const res = await api('/api/admin/config', {
      method: 'POST',
      body: JSON.stringify({
        config: {
          linhVatSessionCooldown: $('#lvCooldownToggle').checked,
          allowFreeCraneAnytime: $('#freeCraneToggle').checked
        }
      })
    });
    appState = res.state;
    renderAll(true);
    showToast('Đã lưu chế độ Linh Vật & Cưỡi hạc.');
  } catch (err) { showToast(err.message, true); }
});

$('#saveRaceConfigBtn').addEventListener('click', async () => {
  const botCount = Math.max(0, Math.min(16, Math.round(Number($('#raceBotCountInput').value) || 0)));
  const difficulty = $('#raceDifficultySelect').value || 'trungbinh';
  const mapMode = $('#raceMapModeSelect').value || 'random';
  const laps = Math.max(1, Math.min(5, Math.round(Number($('#raceLapsInput').value) || 2)));
  const intervalMin = Math.max(1, Math.min(60, Math.round(Number($('#raceIntervalMinInput').value) || 10)));
  const enabled = $('#raceEnabledToggle').checked;
  const autoSchedule = $('#raceAutoScheduleToggle').checked;
  const ambientBots = $('#raceAmbientBotsToggle').checked;
  try {
    const res = await api('/api/admin/config', {
      method: 'POST',
      body: JSON.stringify({
        config: {
          buffaloRace: { enabled, botCount, difficulty, mapMode, laps, autoSchedule, intervalMin, ambientBots }
        }
      })
    });
    appState = res.state;
    renderAll(true);
    showToast(`Đã lưu Đua trâu: ${botCount} bot · ${RACE_DIFF_LABELS[difficulty] || difficulty} · Chu kỳ ${intervalMin}p.`);
  } catch (err) { showToast(err.message, true); }
});

$('#triggerRaceNowBtn')?.addEventListener('click', async () => {
  try {
    const res = await api('/api/admin/world', {
      method: 'POST',
      body: JSON.stringify({ room: 'all', action: 'trigger-race-now' })
    });
    appState = res.state;
    renderAll(false);
    showToast('Đã phát động giải đua trâu toàn chùa!');
  } catch (err) { showToast(err.message, true); }
});

$('#saveVegConfigBtn')?.addEventListener('click', async () => {
  const enabled = $('#vegEnabledToggle').checked;
  const hours = $('#vegHoursInput').value
    .split(/[\s,;]+/)
    .map((v) => Number(v.trim()))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 23);
  const durationMin = Math.max(5, Math.min(180, Number($('#vegDurationInput').value) || 60));
  const maxDishesPerSlot = Math.max(1, Math.min(8, Number($('#vegMaxDishesInput').value) || 3));
  try {
    const res = await api('/api/admin/config', {
      method: 'POST',
      body: JSON.stringify({
        config: { vegFeast: { enabled, hours: hours.length ? hours : [12, 18], durationMin, maxDishesPerSlot } }
      })
    });
    appState = res.state;
    renderAll(true);
    showToast('Đã lưu cấu hình lịch Tiệc Chay!');
  } catch (err) { showToast(err.message, true); }
});

$('#triggerVegOpenBtn')?.addEventListener('click', async () => {
  try {
    const res = await api('/api/admin/world', {
      method: 'POST',
      body: JSON.stringify({ room: 'all', action: 'trigger-veg-open', durationMin: Number($('#vegDurationInput')?.value) || 60 })
    });
    appState = res.state;
    renderAll(false);
    showToast('Đã khai mở Tiệc Chay toàn chùa!');
  } catch (err) { showToast(err.message, true); }
});

$('#triggerVegCloseBtn')?.addEventListener('click', async () => {
  try {
    const res = await api('/api/admin/world', {
      method: 'POST',
      body: JSON.stringify({ room: 'all', action: 'trigger-veg-close' })
    });
    appState = res.state;
    renderAll(false);
    showToast('Đã kết thúc phiên Tiệc Chay thử.');
  } catch (err) { showToast(err.message, true); }
});

$('#resetAllLvBtn').addEventListener('click', async () => {
  try {
    const res = await api('/api/admin/world', {
      method: 'POST',
      body: JSON.stringify({ action: 'reset-all-linhvat-cooldown' })
    });
    appState = res.state;
    renderAll(false);
    showToast('Đã mở lại lượt gặp Linh Vật cho toàn bộ người chơi!');
  } catch (err) { showToast(err.message, true); }
});

$('#sendAnnBtn').addEventListener('click', async () => {
  const text = $('#annTextInput').value.trim();
  if (!text) return;
  try {
    await api('/api/admin/world', {
      method: 'POST',
      body: JSON.stringify({ room: $('#annRoomSelect').value, action: 'broadcast-ann', text })
    });
    $('#annTextInput').value = '';
    showToast('Đã gửi thông báo toàn chùa.');
  } catch (err) { showToast(err.message, true); }
});

$('#savePinnedBtn').addEventListener('click', async () => {
  try {
    const res = await api('/api/admin/world', {
      method: 'POST',
      body: JSON.stringify({ room: $('#annRoomSelect').value, action: 'set-pinned', text: $('#pinnedTextInput').value.trim() })
    });
    appState = res.state;
    renderAll(false);
    showToast('Đã cập nhật bảng tin ghim.');
  } catch (err) { showToast(err.message, true); }
});

$('#savePinBtn').addEventListener('click', async () => {
  const newPin = $('#adminPinInput').value.trim();
  try {
    const res = await api('/api/admin/config', {
      method: 'POST',
      body: JSON.stringify({ config: { adminPin: newPin } })
    });
    adminPin = newPin;
    localStorage.setItem('chua_admin_pin', newPin);
    appState = res.state;
    $('#adminPinInput').value = '';
    showToast(newPin ? 'Đã đặt mã PIN bảo vệ trang /admin.' : 'Đã tắt yêu cầu mã PIN.');
  } catch (err) { showToast(err.message, true); }
});

$('#addFestStepBtn').addEventListener('click', () => {
  draftFestSteps.push({ kind: 'incense', label: 'Dâng một nén hương', need: 1 });
  renderFestivalSteps();
});

async function saveFestival(resetProgress) {
  try {
    const res = await api('/api/admin/config', {
      method: 'POST',
      body: JSON.stringify({
        config: {
          festival: {
            enabled: $('#festEnabledToggle').checked,
            id: $('#festIdInput').value.trim() || 'ram',
            banner: $('#festBannerInput').value.trim(),
            keep: $('#festKeepInput').value.trim() || 'Kỷ vật lễ',
            prize: $('#festPrizeInput').value.trim(),
            reward: Number($('#festRewardInput').value) || 0,
            lunar: {
              day: Number($('#festLunarDayInput').value) || 15,
              month: Number($('#festLunarMonthInput').value) || 1
            },
            steps: draftFestSteps
          }
        },
        syncToPlayers: true,
        resetQuests: resetProgress ? ['festival'] : []
      })
    });
    appState = res.state;
    renderAll(true);
    showToast('Đã lưu cấu hình Lễ hội!');
  } catch (err) { showToast(err.message, true); }
}

$('#saveFestBtn').addEventListener('click', () => saveFestival(false));
$('#saveResetFestBtn').addEventListener('click', () => saveFestival(true));

$('#startQuizBtn').addEventListener('click', async () => {
  try {
    const res = await api('/api/admin/quiz', {
      method: 'POST',
      body: JSON.stringify({
        action: 'start',
        count: Number($('#quizCountInput').value) || 5,
        askSec: Number($('#quizAskSecInput').value) || 15,
        showSec: Number($('#quizShowSecInput').value) || 5
      })
    });
    appState = res.state;
    renderQuizStatus();
    showToast('Đã phát động Đố vui Phật pháp trực tiếp!');
  } catch (err) { showToast(err.message, true); }
});

$('#nextQuizBtn').addEventListener('click', async () => {
  try {
    const res = await api('/api/admin/quiz', { method: 'POST', body: JSON.stringify({ action: 'next' }) });
    appState = res.state;
    renderQuizStatus();
  } catch (err) { showToast(err.message, true); }
});

$('#stopQuizBtn').addEventListener('click', async () => {
  try {
    const res = await api('/api/admin/quiz', { method: 'POST', body: JSON.stringify({ action: 'stop' }) });
    appState = res.state;
    renderQuizStatus();
    showToast('Đã dừng Đố vui.');
  } catch (err) { showToast(err.message, true); }
});

$('#saveRewardsBtn').addEventListener('click', async () => {
  const rewards = {};
  document.querySelectorAll('[data-reward-key]').forEach((el) => {
    rewards[el.dataset.rewardKey] = Math.max(0, Math.round(Number(el.value) || 0));
  });
  try {
    const res = await api('/api/admin/config', { method: 'POST', body: JSON.stringify({ config: { rewards } }) });
    appState = res.state;
    renderAll(true);
    showToast('Đã lưu bảng điểm công đức!');
  } catch (err) { showToast(err.message, true); }
});

$('#resetDefaultConfigBtn').addEventListener('click', async () => {
  if (!confirm('Khôi phục toàn bộ điểm thưởng và danh sách nhiệm vụ về mặc định ban đầu?')) return;
  try {
    const res = await api('/api/admin/config', {
      method: 'POST',
      body: JSON.stringify({ resetDefault: true, syncToPlayers: true })
    });
    appState = res.state;
    draftQuests = JSON.parse(JSON.stringify(res.state.config.questsConfig));
    renderAll(true);
    showToast('Đã khôi phục cấu hình mặc định.');
  } catch (err) { showToast(err.message, true); }
});

$('#addQuestRowBtn').addEventListener('click', () => {
  if (!draftQuests) return;
  draftQuests[activeQuestPool].push({ id: 'huong', title: 'Nhiệm vụ mới', need: 1, reward: 10 });
  renderQuestsEditor();
});

$('#saveQuestsBtn').addEventListener('click', async () => {
  const mode = $('#questSyncMode').value;
  const resetQuests = ['daily', 'weekly', 'newbie'].includes(mode) ? [mode] : [];
  try {
    const res = await api('/api/admin/config', {
      method: 'POST',
      body: JSON.stringify({
        config: { questsConfig: draftQuests },
        syncToPlayers: true,
        resetQuests
      })
    });
    appState = res.state;
    draftQuests = JSON.parse(JSON.stringify(res.state.config.questsConfig));
    renderAll(true);
    showToast('Đã lưu & đồng bộ nhiệm vụ cho toàn bộ người chơi!');
  } catch (err) { showToast(err.message, true); }
});

$('#saveWorldCountersBtn').addEventListener('click', async () => {
  try {
    const res = await api('/api/admin/world', {
      method: 'POST',
      body: JSON.stringify({
        room: $('#worldRoomSelect').value,
        action: 'set-counters',
        incense: Number($('#worldIncenseInput').value),
        yardIncense: Number($('#worldYardIncenseInput').value),
        lamps: Number($('#worldLampsInput').value)
      })
    });
    appState = res.state;
    renderAll(false);
    showToast('Đã cập nhật số hương & đèn.');
  } catch (err) { showToast(err.message, true); }
});

$('#addDonorBtn').addEventListener('click', async () => {
  const name = $('#newDonorInput').value.trim();
  if (!name) return;
  try {
    const res = await api('/api/admin/world', {
      method: 'POST',
      body: JSON.stringify({ room: $('#worldRoomSelect').value, action: 'add-donor', name })
    });
    $('#newDonorInput').value = '';
    appState = res.state;
    renderWorldPanel();
    showToast('Đã ghi tên lên Bảng vàng công đức!');
  } catch (err) { showToast(err.message, true); }
});

function setupAutoRefresh() {
  clearInterval(autoTimer);
  if ($('#autoRefreshChk').checked) {
    autoTimer = setInterval(() => loadState(false), 5000);
  }
}
$('#autoRefreshChk').addEventListener('change', setupAutoRefresh);

loadState(true);
setupAutoRefresh();
