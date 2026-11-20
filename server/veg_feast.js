const DEFAULT_TZ_OFFSET_MS = 7 * 3600 * 1000;

export const VEG_MENU = [
  {
    id: 'bun_hue',
    icon: '🍜',
    name: 'Bún Huế Chay',
    tag: 'Nước dùng nấm rau củ thanh ngọt',
    desc: 'Tô bún nóng hổi với chả nấm bào ngư, đậu hũ chiên vàng, sả thơm và rau thơm tươi mát.'
  },
  {
    id: 'com_sen',
    icon: '🪷',
    name: 'Cơm Sen Lá Bồ Đề',
    tag: 'Cơm hấp hạt sen gói lá sen',
    desc: 'Hạt cơm dẻo thơm hương lá sen cùng hạt sen bùi, đậu Hà Lan, cà rốt và nấm đông cô.'
  },
  {
    id: 'banh_bao',
    icon: '🥟',
    name: 'Bánh Bao Chay Ngũ Sắc',
    tag: 'Xửng tre nóng thơm mềm mịn',
    desc: 'Bánh bao hấp xửng tre nhân nấm hương, mộc nhĩ, củ sắn và hạt sen thanh đạm.'
  },
  {
    id: 'nem_chay',
    icon: '🥢',
    name: 'Nem & Chả Giò Chay',
    tag: 'Giòn rụm ăn kèm rau sống',
    desc: 'Đĩa nem chay vàng ruộm từ khoai môn, miến dong, nấm mèo chấm tương me chua ngọt.'
  },
  {
    id: 'dau_hu',
    icon: '🍲',
    name: 'Đậu Hũ Kho Nấm Rơm',
    tag: 'Niêu đất kho tộ đậm vị thiền gia',
    desc: 'Đậu hũ non thấm đẫm nước tương hảo hạng kho liu riu cùng nấm rơm tươi và tiêu xanh.'
  },
  {
    id: 'lau_nam',
    icon: '🫕',
    name: 'Lẩu Nấm Trường Thọ',
    tag: 'Nồi đồng sôi ấm giữa trai đường',
    desc: 'Nồi lẩu thanh ngọt từ táo đỏ, kỷ tử, nấm kim châm, nấm đùi gà và cải thảo xanh.'
  },
  {
    id: 'tra_sen',
    icon: '🍵',
    name: 'Trà Sen Cung Đình',
    tag: 'Ấm trà ướp nhị sen thanh tâm',
    desc: 'Chén trà ướp hương sen hồ Tịnh Tâm giúp lắng dịu tâm ý sau buổi công phu.'
  },
  {
    id: 'che_sen',
    icon: '🍡',
    name: 'Chè Hạt Sen & Ngũ Quả',
    tag: 'Tráng miệng ngọt thanh mát lành',
    desc: 'Chè long nhãn hạt sen thanh mát cùng đĩa ngũ quả vườn chùa vừa thu hái.'
  }
];

export const DEFAULT_VEG_FEAST_CONFIG = {
  enabled: true,
  hours: [12, 18],
  durationMin: 60,
  maxDishesPerSlot: 3
};

export function normalizeVegFeastConfig(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const rawHours = Array.isArray(src.hours)
    ? src.hours
    : typeof src.hours === 'string'
      ? src.hours.split(/[\s,;]+/).map(Number)
      : DEFAULT_VEG_FEAST_CONFIG.hours;
  const hours = [...new Set(
    rawHours
      .map((h) => Number(h))
      .filter((h) => Number.isInteger(h) && h >= 0 && h <= 23)
  )].sort((a, b) => a - b);

  return {
    enabled: src.enabled !== false,
    hours: hours.length ? hours : [...DEFAULT_VEG_FEAST_CONFIG.hours],
    durationMin: Math.max(5, Math.min(180, Math.round(Number(src.durationMin) || DEFAULT_VEG_FEAST_CONFIG.durationMin))),
    maxDishesPerSlot: Math.max(1, Math.min(VEG_MENU.length, Math.round(Number(src.maxDishesPerSlot) || DEFAULT_VEG_FEAST_CONFIG.maxDishesPerSlot)))
  };
}

function formatHourLabel(hour) {
  return `${String(hour).padStart(2, '0')}h00`;
}

function getVnDateParts(utcMs, tzOffsetMs = DEFAULT_TZ_OFFSET_MS) {
  const d = new Date(utcMs + tzOffsetMs);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth(),
    day: d.getUTCDate(),
    dateKey: d.toISOString().slice(0, 10)
  };
}

function buildWindowAt(parts, dayDelta, hour, durationMin, tzOffsetMs) {
  const startUtcMs = Date.UTC(parts.year, parts.month, parts.day + dayDelta, hour, 0, 0, 0) - tzOffsetMs;
  const endUtcMs = startUtcMs + durationMin * 60000;
  const slotParts = getVnDateParts(startUtcMs, tzOffsetMs);
  const label = formatHourLabel(hour);
  return {
    hour,
    label,
    slotKey: `${slotParts.dateKey}-${label}`,
    startAt: startUtcMs,
    endAt: endUtcMs
  };
}

export function computeVegFeastStatus(
  nowMs = Date.now(),
  rawCfg = DEFAULT_VEG_FEAST_CONFIG,
  tzOffsetMs = DEFAULT_TZ_OFFSET_MS,
  manualOpenUntil = 0,
  manualSlotId = 0
) {
  const cfg = normalizeVegFeastConfig(rawCfg);
  const parts = getVnDateParts(nowMs, tzOffsetMs);
  const windows = [];

  for (const dayDelta of [-1, 0, 1]) {
    for (const h of cfg.hours) {
      windows.push(buildWindowAt(parts, dayDelta, h, cfg.durationMin, tzOffsetMs));
    }
  }
  windows.sort((a, b) => a.startAt - b.startAt);

  const activeSched = cfg.enabled
    ? windows.find((w) => nowMs >= w.startAt && nowMs < w.endAt) || null
    : null;
  const manualActive = cfg.enabled && manualOpenUntil > nowMs;
  const nextWin = windows.find((w) => w.startAt > nowMs) || windows[windows.length - 1];

  const isOpen = Boolean(activeSched || manualActive);
  let reason = 'closed';
  let slotKey = '';
  let activeLabel = '';
  let remSec = 0;

  if (activeSched) {
    reason = 'scheduled';
    slotKey = activeSched.slotKey;
    activeLabel = `Tiệc Chay ${activeSched.label}`;
    remSec = Math.max(0, Math.ceil((activeSched.endAt - nowMs) / 1000));
  } else if (manualActive) {
    reason = 'manual';
    slotKey = `${parts.dateKey}-manual-${manualSlotId || Math.floor(manualOpenUntil / 1000)}`;
    activeLabel = 'Tiệc Chay Hoan Hỷ';
    remSec = Math.max(0, Math.ceil((manualOpenUntil - nowMs) / 1000));
  }

  const nextInSec = nextWin ? Math.max(0, Math.ceil((nextWin.startAt - nowMs) / 1000)) : 0;
  let warnMin = 0;
  if (cfg.enabled && !isOpen && nextInSec > 0) {
    if (nextInSec <= 60) warnMin = 1;
    else if (nextInSec <= 300) warnMin = 5;
  }

  return {
    enabled: cfg.enabled,
    hours: cfg.hours,
    hoursText: cfg.hours.map(formatHourLabel).join(' & '),
    durationMin: cfg.durationMin,
    maxDishesPerSlot: cfg.maxDishesPerSlot,
    isOpen,
    reason,
    slotKey,
    activeLabel,
    remSec,
    nextAt: nextWin ? nextWin.startAt : 0,
    nextLabel: nextWin ? nextWin.label : '12h00',
    nextSlotKey: nextWin ? nextWin.slotKey : '',
    nextInSec,
    warnMin,
    now: nowMs
  };
}

export function createVegFeastTracker(nowMs = Date.now(), cfg = DEFAULT_VEG_FEAST_CONFIG, tzOffsetMs = DEFAULT_TZ_OFFSET_MS) {
  const st = computeVegFeastStatus(nowMs, cfg, tzOffsetMs, 0, 0);
  return {
    wasOpen: st.isOpen,
    lastSlotKey: st.slotKey,
    lastWarnSlotKey: '',
    lastWarnMin: 0
  };
}

export function evaluateVegFeastTick(
  tracker,
  nowMs = Date.now(),
  cfg = DEFAULT_VEG_FEAST_CONFIG,
  tzOffsetMs = DEFAULT_TZ_OFFSET_MS,
  manualOpenUntil = 0,
  manualSlotId = 0
) {
  const st = computeVegFeastStatus(nowMs, cfg, tzOffsetMs, manualOpenUntil, manualSlotId);
  if (!st.enabled) {
    tracker.wasOpen = false;
    return { event: null, minsLeft: 0, status: st };
  }

  if (st.isOpen && (!tracker.wasOpen || tracker.lastSlotKey !== st.slotKey)) {
    tracker.wasOpen = true;
    tracker.lastSlotKey = st.slotKey;
    tracker.lastWarnSlotKey = '';
    tracker.lastWarnMin = 0;
    return { event: 'start', minsLeft: 0, status: st };
  }

  if (!st.isOpen && tracker.wasOpen) {
    tracker.wasOpen = false;
    return { event: 'end', minsLeft: 0, status: st };
  }

  if (st.warnMin > 0 && (tracker.lastWarnSlotKey !== st.nextSlotKey || st.warnMin < tracker.lastWarnMin)) {
    tracker.lastWarnSlotKey = st.nextSlotKey;
    tracker.lastWarnMin = st.warnMin;
    return { event: 'warn', minsLeft: st.warnMin, status: st };
  }

  return { event: null, minsLeft: 0, status: st };
}
