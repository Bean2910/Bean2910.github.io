import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { computeRaceSlot, createRaceTracker, evaluateRaceTick, RACE_JOIN_WINDOW_SEC } from './race_schedule.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_DIR = path.resolve(__dirname, '../client');
const ADMIN_DIR = path.resolve(__dirname, 'admin');
const DATA_DIR = path.resolve(__dirname, 'data');
const PLAYERS_FILE = path.join(DATA_DIR, 'players.json');
const WORLD_FILE = path.join(DATA_DIR, 'world.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

const LINH_VAT_WINDOWS = {
  trau: [[6, 12], [12, 18]],
  hac: [[5, 9], [16, 19]],
  rua: [[7, 12], [13, 18]]
};

const QUEST_ID_META = [
  { id: 'huong', label: 'Dâng hương chính điện / sân' },
  { id: 'lay', label: 'Lạy Phật' },
  { id: 'chuong', label: 'Thỉnh chuông' },
  { id: 'mo', label: 'Gõ mõ / Lần hạt' },
  { id: 'quet', label: 'Quét lá sân chùa' },
  { id: 'ngoi', label: 'Ngồi thiền (phút)' },
  { id: 'wLay', label: 'Lạy Phật (tuần)' },
  { id: 'wNgoi', label: 'Ngồi thiền (phút tuần)' },
  { id: 'den', label: 'Thả hoa đăng' },
  { id: 'dong', label: 'Dâng hương (tuần)' },
  { id: 'thapden', label: 'Thắp đèn dâng Phật' },
  { id: 'tung', label: 'Gõ mõ tụng kinh (tiếng)' },
  { id: 'phongsinh', label: 'Cho cá ăn / Phóng sinh' },
  { id: 'xam', label: 'Gieo quẻ xăm' },
  { id: 'tuoi', label: 'Dâng hoa / Tưới vườn' },
  { id: 'nmHuong', label: 'Người mới: Thắp hương' },
  { id: 'nmLay', label: 'Người mới: Lạy Phật' },
  { id: 'nmDen', label: 'Người mới: Lời nguyện / Hoa đăng' }
];

const FESTIVAL_PRESETS = {
  ram: {
    id: 'ram',
    banner: 'Lễ Rằm thanh tịnh · Thả hoa đăng cầu an',
    keep: 'Hoa đăng Rằm',
    prize: 'Cờ lưu niệm ngày Rằm',
    reward: 40,
    lunar: { day: 15, month: 10 },
    steps: [
      { kind: 'incense', label: 'Thắp một nén hương', need: 1 },
      { kind: 'lay', label: 'Lạy Phật 3 lạy', need: 3 },
      { kind: 'lantern', label: 'Thả một ngọn hoa đăng', need: 1 }
    ]
  },
  mung1: {
    id: 'mung1',
    banner: 'Mùng Một đầu tháng · Tĩnh tâm phát nguyện lành',
    keep: 'Đèn lồng Mùng Một',
    prize: 'Đèn lồng may mắn (Bộ sưu tập)',
    reward: 35,
    lunar: { day: 1, month: 10 },
    steps: [
      { kind: 'incense', label: 'Dâng một nén hương', need: 1 },
      { kind: 'bell', label: 'Thỉnh một tiếng chuông', need: 1 },
      { kind: 'vow', label: 'Gửi một lời nguyện lành', need: 1 }
    ]
  },
  phatdan: {
    id: 'phatdan',
    banner: 'Mùa Phật Đản · Trang nghiêm dâng hoa tắm Phật',
    keep: 'Hoa sen Phật Đản',
    prize: 'Kỷ vật Hoa sen Phật Đản',
    reward: 60,
    lunar: { day: 15, month: 4 },
    steps: [
      { kind: 'offerFlowers', label: 'Dâng hoa cúng Phật', need: 1 },
      { kind: 'lay', label: 'Lạy Phật 6 lạy', need: 6 },
      { kind: 'lantern', label: 'Thả một ngọn hoa đăng', need: 1 }
    ]
  },
  vulan: {
    id: 'vulan',
    banner: 'Mùa Vu Lan Báo Hiếu · Thắp đèn tri ân cha mẹ',
    keep: 'Bông hồng cài áo',
    prize: 'Kỷ vật Vu Lan báo hiếu',
    reward: 60,
    lunar: { day: 15, month: 7 },
    steps: [
      { kind: 'lamp', label: 'Thắp một ngọn đèn dâng Phật', need: 1 },
      { kind: 'vow', label: 'Gửi một lời nguyện hiếu hạnh', need: 1 },
      { kind: 'lantern', label: 'Thả một ngọn hoa đăng', need: 1 }
    ]
  },
  tet: {
    id: 'tet',
    banner: 'Đầu Xuân Cát Tường · Du xuân lễ Phật cầu an',
    keep: 'Cành lộc đầu năm',
    prize: 'Kỷ vật Xuân An Lạc',
    reward: 80,
    lunar: { day: 1, month: 1 },
    steps: [
      { kind: 'incense', label: 'Dâng hương đầu năm', need: 1 },
      { kind: 'xam', label: 'Gieo một quẻ xăm đầu xuân', need: 1 },
      { kind: 'lay', label: 'Lạy Phật 3 lạy', need: 3 }
    ]
  }
};

function getDefaultConfig() {
  return {
    adminPin: '',
    linhVatSessionCooldown: true,
    allowFreeCraneAnytime: true,
    buffaloRace: {
      enabled: true,
      botCount: 5,
      difficulty: 'trungbinh',
      mapMode: 'random',
      laps: 2,
      autoSchedule: true,
      intervalMin: 10,
      ambientBots: true
    },
    rewards: {
      incense: 5,
      sanIncense: 5,
      banIncense: 5,
      lay: 2,
      bell: 5,
      mo: 1,
      beadsRound: 10,
      lamp: 10,
      lantern: 15,
      vow: 10,
      quet: 5,
      ca: 5,
      xam: 3,
      offerFlowers: 5,
      water: 3,
      sitMin: 2,
      bode: 2,
      bodeAll: 50,
      tkDone: 15,
      greet: 2,
      gift: 5,
      petFeed: 3,
      linhVatStep: 10,
      linhVatBond: 30,
      weekly6Bonus: 100
    },
    questsConfig: {
      daily: [
        { id: 'huong', title: 'Thắp một nén hương', need: 1, reward: 10 },
        { id: 'lay', title: 'Lạy Phật 3 lạy', need: 3, reward: 15 },
        { id: 'chuong', title: 'Thỉnh một tiếng chuông', need: 1, reward: 10 },
        { id: 'mo', title: 'Gõ 36 tiếng mõ hoặc lần hạt', need: 36, reward: 15 },
        { id: 'quet', title: 'Quét lá sân chùa', need: 1, reward: 15 },
        { id: 'ngoi', title: 'Ngồi tĩnh tâm 1 phút', need: 1, reward: 20 }
      ],
      weekly: [
        { id: 'wLay', title: 'Lạy Phật 27 lạy trong tuần', need: 27, reward: 60 },
        { id: 'wNgoi', title: 'Ngồi thiền 10 phút trong tuần', need: 10, reward: 60 },
        { id: 'den', title: 'Thả 3 hoa đăng trong tuần', need: 3, reward: 50 },
        { id: 'dong', title: 'Dâng hương 7 lần trong tuần', need: 7, reward: 40 },
        { id: 'thapden', title: 'Thắp 3 ngọn đèn dâng Phật', need: 3, reward: 45 },
        { id: 'tung', title: 'Gõ mõ tụng kinh 200 tiếng', need: 200, reward: 50 },
        { id: 'phongsinh', title: 'Phóng sinh, cho cá ăn 3 lần', need: 3, reward: 45 },
        { id: 'xam', title: 'Gieo quẻ xăm đầu ngày 2 lần', need: 2, reward: 35 },
        { id: 'tuoi', title: 'Dâng hoa cúng Phật 3 lần', need: 3, reward: 45 }
      ],
      newbie: [
        { id: 'nmHuong', title: 'Lần đầu thắp hương lễ Phật', need: 1, reward: 15 },
        { id: 'nmLay', title: 'Lần đầu lạy Phật', need: 1, reward: 15 },
        { id: 'nmDen', title: 'Gửi một lời nguyện hoặc thả hoa đăng', need: 1, reward: 20 }
      ]
    },
    festival: {
      enabled: false,
      ...JSON.parse(JSON.stringify(FESTIVAL_PRESETS.ram))
    }
  };
}

const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || '0.0.0.0';
const TZ_OFFSET_MS = 7 * 3600 * 1000;
const TOTAL_ZONES = 12;

const LEVELS = [
  { lv: 0, name: 'Sơ tâm', from: 0, next: 200 },
  { lv: 1, name: 'Phát tâm', from: 200, next: 500 },
  { lv: 2, name: 'Tinh tấn', from: 500, next: 1000 },
  { lv: 3, name: 'Hoan hỷ', from: 1000, next: 2000 },
  { lv: 4, name: 'An lạc', from: 2000, next: 4000 },
  { lv: 5, name: 'Thanh tịnh', from: 4000, next: 8000 },
  { lv: 6, name: 'Viên mãn', from: 8000, next: 15000 },
  { lv: 7, name: 'Tịch tĩnh', from: 15000, next: 30000 },
  { lv: 8, name: 'Tự tại', from: 30000, next: null }
];

const TITLE_DEFS = [
  { id: 'nguoi_moi', name: 'Người mới lên chùa', desc: 'Lần đầu đến chùa An Tự Duyên', check: () => true },
  { id: 'tram_lay', name: 'Trăm lạy', desc: 'Lạy Phật 108 lạy', check: (p) => p.bows >= 108 },
  { id: 'ngan_lay', name: 'Ngàn lạy', desc: 'Lạy Phật 1.000 lạy', check: (p) => p.bows >= 1000 },
  { id: 'tron_chuoi', name: 'Tròn chuỗi hạt', desc: 'Lần tròn một chuỗi 108 hạt', check: (p) => p.countedBeads >= 108 || p.rounds >= 1 },
  { id: 'tram_chuoi', name: 'Trăm chuỗi hạt', desc: 'Lần tròn 100 chuỗi', check: (p) => p.rounds >= 100 },
  { id: 'tinh_toa', name: 'Tĩnh tọa', desc: 'Ngồi tĩnh tổng cộng 60 phút', check: (p) => p.sitMin >= 60 },
  { id: 'huong_tram', name: 'Hương trầm', desc: 'Dâng hương 30 lần', check: (p) => p.incenseCount >= 30 },
  { id: 'tha_den', name: 'Người thả đèn', desc: 'Thả 10 ngọn hoa đăng', check: (p) => p.lanternCount >= 10 },
  { id: 'tinh_tan_7', name: 'Tinh tấn bảy ngày', desc: 'Lên chùa 7 ngày liền', check: (p) => p.bestStreak >= 7 },
  { id: 'thang_khong_nghi', name: 'Một tháng không nghỉ', desc: 'Lên chùa 30 ngày liền', check: (p) => p.bestStreak >= 30 },
  { id: 'tham_khap_chua', name: 'Thăm khắp chùa', desc: 'Đến đủ 10 khu trong chùa', check: (p) => p.visitedZones.length >= 10 },
  { id: 'chuong_som', name: 'Tiếng chuông sớm', desc: 'Thỉnh 108 tiếng chuông', check: (p) => p.bellCount >= 108 },
  { id: 'tieng_mo', name: 'Tiếng mõ thanh lương', desc: 'Gõ mõ 1.000 tiếng', check: (p) => p.moCount >= 1000 },
  { id: 'quet_la', name: 'Quét sạch bụi trần', desc: 'Quét lá sân chùa 10 lần', check: (p) => p.sweepCount >= 10 },
  { id: 'tu_bi', name: 'Từ bi hỷ xả', desc: 'Cho cá và chim ăn 20 lần', check: (p) => p.feedCount >= 20 },
  { id: 'thien_duyen', name: 'Thiện duyên', desc: 'Kết duyên cùng bạn đồng tu', check: (p) => Boolean(p.duyen) },
  { id: 'nguyen_lanh', name: 'Nguyện lành', desc: 'Gửi 10 lời nguyện dâng Phật', check: (p) => p.vowCount >= 10 }
];

const PHAPKHI_DEFS = [
  { id: 'huong', check: (p) => p.incenseCount >= 10 },
  { id: 'gio', check: (p) => p.lanternCount >= 5 },
  { id: 'gaytruc', check: (p) => p.visitedZones.length >= 10 },
  { id: 'mo', check: (p) => p.moCount >= 500 },
  { id: 'kinh', check: (p) => p.quizCount >= 3 },
  { id: 'trentram', check: (p) => p.countedBeads >= 3240 },
  { id: 'truong', check: (p) => p.bows >= 1000 },
  { id: 'nonla', check: (p) => p.days >= 14 },
  { id: 'denlong', check: (p) => p.keeps.some((k) => k.id === 'mung1') },
  { id: 'chuong', check: (p) => p.bellCount >= 10 },
  { id: 'bat', check: (p) => p.keeps.length >= 6 },
  { id: 'gaythan', check: (p) => p.sitMin >= 300 }
];

const QUIZ_PRACTICE_BANK = [
  {
    text: 'Trong đạo Phật, Tam bảo gồm những ngôi nào?',
    opts: ['Phật, Pháp, Tăng', 'Giới, Định, Tuệ', 'Tâm, Phật, Chúng sinh', 'Thân, Khẩu, Ý'],
    right: 0,
    why: 'Tam bảo là ba ngôi báu nâng đỡ người tu: Phật (bậc giác ngộ), Pháp (lời dạy đưa tới an lạc) và Tăng (đoàn thể tu hành thanh tịnh).'
  },
  {
    text: 'Tứ diệu đế trong bài pháp đầu tiên của Đức Phật nói về điều gì?',
    opts: ['Bốn mùa trong năm', 'Khổ, Nguyên nhân khổ, Diệt khổ và Con đường diệt khổ', 'Bốn phương trời', 'Bốn phép thần thông'],
    right: 1,
    why: 'Tứ diệu đế gồm Khổ đế, Tập đế, Diệt đế và Đạo đế — nền tảng cốt lõi của giáo lý Phật giáo.'
  },
  {
    text: 'Ngũ giới cơ bản của người Phật tử tại gia gồm không sát sinh, không trộm cắp, không tà dâm, không nói dối và điều nào nữa?',
    opts: ['Không ăn mặn', 'Không uống rượu và các chất gây say nghiện', 'Không đi xa', 'Không ngủ giường cao'],
    right: 1,
    why: 'Giới thứ năm giúp giữ tâm trí tỉnh táo, sáng suốt, không để phóng túng làm tổn hại bản thân và người khác.'
  },
  {
    text: 'Một chuỗi tràng hạt truyền thống thường có bao nhiêu hạt chính?',
    opts: ['36 hạt', '54 hạt', '108 hạt', '120 hạt'],
    right: 2,
    why: 'Chuỗi 108 hạt tượng trưng cho 108 phiền não cần chuyển hóa để trở về tâm thanh tịnh.'
  },
  {
    text: 'Lễ Vu Lan (rằm tháng Bảy âm lịch) nhắc nhở điều gì trước tiên?',
    opts: ['Cầu tài lộc', 'Hiếu hạnh và tri ân cha mẹ, tổ tiên', 'Xuất hành đầu năm', 'Tĩnh tọa bảy ngày'],
    right: 1,
    why: 'Vu Lan là mùa báo hiếu, tưởng nhớ công ơn sinh thành dưỡng dục của cha mẹ nhiều đời.'
  },
  {
    text: 'Trong Ba môn học vô lậu (Tam vô lậu học), điều nào đứng cùng Định và Tuệ?',
    opts: ['Lễ', 'Giới', 'Nhẫn', 'Tín'],
    right: 1,
    why: 'Giới - Định - Tuệ là ba trụ cột tu tập: nhờ giữ Giới mà có Định, nhờ Định mà phát sinh Tuệ giác.'
  },
  {
    text: 'Cây bồ đề gắn với sự kiện trọng đại nào trong cuộc đời Đức Phật Thích Ca?',
    opts: ['Đản sinh ở Lâm Tỳ Ni', 'Thành đạo dưới cội bồ đề', 'Chuyển pháp luân ở Lộc Uyển', 'Nhập Niết bàn ở Câu Thi Na'],
    right: 1,
    why: 'Thái tử Tất Đạt Đa thiền định dưới cội cây tất bát la (sau gọi là cây Bồ đề) tại Bồ Đề Đạo Tràng và chứng ngộ.'
  }
];

const XAM_VERSES = [
  'Quẻ Thượng Thượng · Gió mát trăng thanh, giữ tâm chánh niệm việc lành tự thông.',
  'Quẻ Trung Bình · Việc chậm mà chắc, kiên nhẫn từng bước ắt thấy hoa nở.',
  'Quẻ Thượng Cát · Thiện duyên hội đủ, biết buông xả nhẹ lòng sẽ gặp quý nhân.',
  'Quẻ Bình An · Trong động giữ tĩnh, lắng nghe hơi thở là cửa vào an lạc.',
  'Quẻ Tinh Tấn · Chớ ngại đường xa, mỗi bước chân chánh niệm đều là đạo tràng.'
];

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.wasm': 'application/wasm',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav'
};

function getVnDateKey(ts = Date.now()) {
  return new Date(ts + TZ_OFFSET_MS).toISOString().slice(0, 10);
}

function getVnWeekKey(ts = Date.now()) {
  const d = new Date(ts + TZ_OFFSET_MS);
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - (day - 1));
  return d.toISOString().slice(0, 10);
}

function diffDays(dayA, dayB) {
  const a = Date.parse(`${dayA}T00:00:00Z`);
  const b = Date.parse(`${dayB}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.round((b - a) / 86400000);
}

function getJdnFromDateKey(dateKey = getVnDateKey()) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const i = Math.floor((14 - m) / 12);
  const s = y + 4800 - i;
  const o = m + 12 * i - 3;
  let a = d + Math.floor((153 * o + 2) / 5) + 365 * s + Math.floor(s / 4) - Math.floor(s / 100) + Math.floor(s / 400) - 32045;
  if (a < 2299161) {
    a = d + Math.floor((153 * o + 2) / 5) + 365 * s + Math.floor(s / 4) - 32083;
  }
  return a;
}

function getVnHour(ts = Date.now()) {
  const d = new Date(ts + TZ_OFFSET_MS);
  return d.getUTCHours();
}

function getLinhVatSlot(kind, ts = Date.now()) {
  const win = LINH_VAT_WINDOWS[kind];
  if (!win) return -1;
  const hour = getVnHour(ts);
  return win.findIndex(([start, end]) => hour >= start && hour < end);
}

function buildDuyenView(rec) {
  const curYear = new Date(Date.now() + TZ_OFFSET_MS).getUTCFullYear();
  return {
    born: rec.born || null,
    adult: Boolean(rec.born && (curYear - rec.born) >= 18),
    mine: rec.duyen || null,
    in: [],
    out: []
  };
}

function buildQuestsFromConfig(poolKey) {
  const fallback = getDefaultConfig().questsConfig[poolKey];
  const src = (typeof gameConfig !== 'undefined' && Array.isArray(gameConfig?.questsConfig?.[poolKey]))
    ? gameConfig.questsConfig[poolKey]
    : fallback;
  return src.map((q) => ({
    id: String(q.id || '').trim(),
    title: String(q.title || '').trim(),
    have: 0,
    need: Math.max(1, Number(q.need) || 1),
    reward: Math.max(0, Number(q.reward) || 0),
    claimed: false
  }));
}

function createDailyQuests() {
  return buildQuestsFromConfig('daily');
}

function createWeeklyQuests() {
  return buildQuestsFromConfig('weekly');
}

function createNewbieQuests() {
  return buildQuestsFromConfig('newbie');
}

function defaultChores() {
  return { quet: false, den: false, ca: false };
}

function createDefaultRecord(cid, msgLook = {}) {
  const today = getVnDateKey();
  const week = getVnWeekKey();
  return {
    cid,
    pid: crypto.randomUUID(),
    user: null,
    passHash: null,
    banned: false,
    name: sanitizeName(msgLook.name) || 'Phật tử',
    kind: msgLook.kind || 'chu',
    robe: msgLook.robe || 'nau',
    skin: msgLook.skin || 'sang',
    bio: sanitizeText(msgLook.bio, 120) || '',
    beads: msgLook.beads || 'go',
    cushion: msgLook.cushion || 'xam',
    phapkhi: msgLook.phapkhi || 'none',
    title: 'nguoi_moi',
    unlockedTitles: ['nguoi_moi'],
    pet: null,
    born: null,
    duyen: null,
    lvTrau: { s: 0, deedToday: false, lastDate: '', lastW: -1 },
    lvHac: { s: 0, l: 0, lastDate: '', lastW: -1 },
    lvRua: { s: 0, lastDate: '', lastW: -1 },
    senDays: [getJdnFromDateKey(today)],
    senDone: [],
    friends: [],
    friendReqIn: [],
    bode: [],
    keeps: [],
    visitedZones: [],
    amSlots: [],
    leProgress: null,
    merit: 0,
    todayMerit: 0,
    weekMerit: 0,
    lastDate: today,
    lastWeek: week,
    days: 1,
    streak: 1,
    bestStreak: 1,
    bows: 0,
    rounds: 0,
    countedBeads: 0,
    sitSec: 0,
    sitMin: 0,
    incenseCount: 0,
    lanternCount: 0,
    bellCount: 0,
    moCount: 0,
    sweepCount: 0,
    feedCount: 0,
    vowCount: 0,
    quizCount: 0,
    tkDone: false,
    chores: defaultChores(),
    quests: createDailyQuests(),
    weekly: createWeeklyQuests(),
    weeklyBonusClaimed: false,
    newbie: createNewbieQuests(),
    newbieDone: false,
    items: [],
    robes: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}

function sanitizeName(raw) {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[\r\n\t]+/g, ' ').trim().slice(0, 24);
}

function sanitizeText(raw, maxLen = 100) {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[\r\n\t]+/g, ' ').trim().slice(0, maxLen);
}

function hashPassword(pass, salt = crypto.randomBytes(16).toString('hex')) {
  const derived = crypto.scryptSync(pass, salt, 32).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(pass, stored) {
  if (typeof stored !== 'string' || !stored.includes(':')) return false;
  const [salt, expected] = stored.split(':');
  const derived = crypto.scryptSync(pass, salt, 32).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(expected, 'hex'));
}

// Persistent Storage Engine (keyed by cid in server/data/players.json + world.json)
fs.mkdirSync(DATA_DIR, { recursive: true });

function readJsonSafe(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[Storage] Failed to read ${filePath}:`, err.message);
    return fallback;
  }
}

function writeJsonAtomic(filePath, payload) {
  const json = JSON.stringify(payload, null, 2);
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, json, 'utf8');
  try {
    fs.renameSync(tmp, filePath);
  } catch {
    fs.writeFileSync(filePath, json, 'utf8');
    try { fs.unlinkSync(tmp); } catch {}
  }
}

function normalizeQuestList(list, fallback) {
  if (!Array.isArray(list) || !list.length) return fallback;
  return list
    .map((q) => ({
      id: sanitizeText(String(q.id || ''), 30),
      title: sanitizeText(String(q.title || ''), 120) || String(q.id || ''),
      need: Math.max(1, Number(q.need) || 1),
      reward: Math.max(0, Number(q.reward) || 0)
    }))
    .filter((q) => q.id);
}

function normalizeConfig(raw = {}) {
  const def = getDefaultConfig();
  const rewards = { ...def.rewards };
  if (raw.rewards && typeof raw.rewards === 'object') {
    for (const k of Object.keys(def.rewards)) {
      const n = Number(raw.rewards[k]);
      if (Number.isFinite(n) && n >= 0) rewards[k] = Math.round(n);
    }
  }
  const qc = raw.questsConfig && typeof raw.questsConfig === 'object' ? raw.questsConfig : {};
  const questsConfig = {
    daily: normalizeQuestList(qc.daily, def.questsConfig.daily),
    weekly: normalizeQuestList(qc.weekly, def.questsConfig.weekly),
    newbie: normalizeQuestList(qc.newbie, def.questsConfig.newbie)
  };
  const rawFest = raw.festival && typeof raw.festival === 'object' ? raw.festival : {};
  const festivalSteps = Array.isArray(rawFest.steps) && rawFest.steps.length
    ? rawFest.steps.map((st) => ({
        kind: sanitizeText(String(st.kind || 'incense'), 30) || 'incense',
        label: sanitizeText(String(st.label || ''), 120) || 'Tham gia lễ chùa',
        need: Math.max(1, Number(st.need) || 1)
      }))
    : def.festival.steps;

  const rawRace = raw.buffaloRace && typeof raw.buffaloRace === 'object' ? raw.buffaloRace : {};
  const validRaceDiffs = ['de', 'trungbinh', 'kho', 'cuckho'];
  const validMapModes = ['random', 'easy', 'medium', 'complex', 'extreme'];
  const raceBotNum = Number(rawRace.botCount);
  const raceLapsNum = Number(rawRace.laps);
  const raceIntervalNum = Number(rawRace.intervalMin);
  const buffaloRace = {
    enabled: rawRace.enabled !== undefined ? Boolean(rawRace.enabled) : def.buffaloRace.enabled,
    botCount: Number.isFinite(raceBotNum) ? Math.max(0, Math.min(16, Math.round(raceBotNum))) : def.buffaloRace.botCount,
    difficulty: validRaceDiffs.includes(rawRace.difficulty) ? rawRace.difficulty : def.buffaloRace.difficulty,
    mapMode: validMapModes.includes(rawRace.mapMode) ? rawRace.mapMode : def.buffaloRace.mapMode,
    laps: Number.isFinite(raceLapsNum) ? Math.max(1, Math.min(5, Math.round(raceLapsNum))) : def.buffaloRace.laps,
    autoSchedule: rawRace.autoSchedule !== undefined ? Boolean(rawRace.autoSchedule) : def.buffaloRace.autoSchedule,
    intervalMin: Number.isFinite(raceIntervalNum) ? Math.max(1, Math.min(60, Math.round(raceIntervalNum))) : def.buffaloRace.intervalMin,
    ambientBots: rawRace.ambientBots !== undefined ? Boolean(rawRace.ambientBots) : def.buffaloRace.ambientBots
  };

  return {
    adminPin: typeof raw.adminPin === 'string' ? raw.adminPin.trim().slice(0, 64) : def.adminPin,
    linhVatSessionCooldown: raw.linhVatSessionCooldown !== undefined ? Boolean(raw.linhVatSessionCooldown) : def.linhVatSessionCooldown,
    allowFreeCraneAnytime: raw.allowFreeCraneAnytime !== undefined ? Boolean(raw.allowFreeCraneAnytime) : def.allowFreeCraneAnytime,
    buffaloRace,
    rewards,
    questsConfig,
    festival: {
      enabled: Boolean(rawFest.enabled),
      id: sanitizeText(String(rawFest.id || def.festival.id), 30) || 'ram',
      banner: sanitizeText(String(rawFest.banner || def.festival.banner), 160),
      keep: sanitizeText(String(rawFest.keep || def.festival.keep), 80) || 'Kỷ vật ngày lễ',
      prize: sanitizeText(String(rawFest.prize || def.festival.prize), 80),
      reward: Number.isFinite(Number(rawFest.reward)) ? Math.max(0, Math.round(Number(rawFest.reward))) : def.festival.reward,
      lunar: {
        day: Math.max(1, Math.min(30, Number(rawFest.lunar?.day) || def.festival.lunar.day)),
        month: Math.max(1, Math.min(12, Number(rawFest.lunar?.month) || def.festival.lunar.month))
      },
      steps: festivalSteps
    }
  };
}

let gameConfig = normalizeConfig(readJsonSafe(CONFIG_FILE, {}));
if (!fs.existsSync(CONFIG_FILE)) {
  writeJsonAtomic(CONFIG_FILE, gameConfig);
}
const raceSchedTracker = createRaceTracker(Date.now(), gameConfig.buffaloRace, TZ_OFFSET_MS);
let raceManualOpenUntil = 0;

function getCurrentRaceSlot(nowMs = Date.now()) {
  return computeRaceSlot(nowMs, gameConfig.buffaloRace, TZ_OFFSET_MS, raceManualOpenUntil);
}

function broadcastRaceScheduleEvent(event, slot, minsLeft = 0) {
  if (!event) return;
  const text = event === 'start'
    ? `🏁 Giải đua trâu quanh chùa (${slot.curLabel}) đã chính thức bắt đầu! Mời các thí chủ nhập cuộc hoặc xem bên trường đua!`
    : `🐂 Cuộc đua trâu quanh chùa lúc ${slot.nextLabel} sắp bắt đầu sau ${minsLeft} phút!`;
  for (const room of rooms.values()) {
    room.broadcast({ t: 'ann', k: 'admin', text });
    room.broadcast({ t: 'race-sched', phase: event, minsLeft, ...slot });
  }
}

function saveConfig() {
  writeJsonAtomic(CONFIG_FILE, gameConfig);
}

const persistedPlayers = readJsonSafe(PLAYERS_FILE, { accounts: {}, characters: {} });
if (!persistedPlayers.accounts) persistedPlayers.accounts = {};
if (!persistedPlayers.characters) persistedPlayers.characters = {};

const persistedWorld = readJsonSafe(WORLD_FILE, { rooms: {} });
if (!persistedWorld.rooms) persistedWorld.rooms = {};

let saveTimer = null;
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(flushSave, 150);
}

function flushSave() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  const worldSnapshot = { rooms: {} };
  for (const [name, room] of rooms.entries()) {
    worldSnapshot.rooms[name] = room.toJSON();
  }
  writeJsonAtomic(PLAYERS_FILE, persistedPlayers);
  writeJsonAtomic(WORLD_FILE, worldSnapshot);
  writeJsonAtomic(CONFIG_FILE, gameConfig);
}

function getLevelInfo(merit) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (merit >= LEVELS[i].from) return LEVELS[i];
  }
  return LEVELS[0];
}

function syncQuestPool(existingPool, templatePool, resetProgress = false) {
  const byId = new Map(Array.isArray(existingPool) ? existingPool.map((q) => [q.id, q]) : []);
  return templatePool.map((tmpl) => {
    const old = !resetProgress ? byId.get(tmpl.id) : null;
    return {
      id: tmpl.id,
      title: tmpl.title,
      have: old ? Math.min(tmpl.need, Number(old.have) || 0) : 0,
      need: tmpl.need,
      reward: tmpl.reward,
      claimed: old ? Boolean(old.claimed) : false
    };
  });
}

function normalizeRecord(rec) {
  const base = createDefaultRecord(rec.cid);
  const merged = { ...base, ...rec };
  merged.banned = Boolean(rec.banned);
  merged.chores = { ...defaultChores(), ...(rec.chores || {}) };
  merged.unlockedTitles = Array.isArray(rec.unlockedTitles) && rec.unlockedTitles.length
    ? Array.from(new Set(['nguoi_moi', ...rec.unlockedTitles]))
    : ['nguoi_moi'];
  merged.visitedZones = Array.isArray(rec.visitedZones) ? rec.visitedZones : [];
  merged.keeps = Array.isArray(rec.keeps) ? rec.keeps : [];
  merged.bode = Array.isArray(rec.bode) ? rec.bode : [];
  merged.senDays = Array.isArray(rec.senDays) && rec.senDays.length ? rec.senDays : [getJdnFromDateKey(merged.lastDate)];
  merged.senDone = Array.isArray(rec.senDone) ? rec.senDone : [];
  merged.friends = Array.isArray(rec.friends) ? rec.friends : [];
  merged.friendReqIn = Array.isArray(rec.friendReqIn) ? rec.friendReqIn : [];
  merged.items = Array.isArray(rec.items) ? rec.items : [];
  merged.robes = Array.isArray(rec.robes) ? rec.robes : [];
  merged.amSlots = Array.isArray(rec.amSlots) ? rec.amSlots : [];
  merged.leProgress = rec.leProgress && typeof rec.leProgress === 'object' ? rec.leProgress : null;
  merged.quests = Array.isArray(rec.quests) && rec.quests.length ? rec.quests : createDailyQuests();
  merged.weekly = syncQuestPool(rec.weekly, createWeeklyQuests(), false);
  merged.lvTrau = { s: 0, deedToday: false, lastDate: '', lastW: -1, ...(rec.lvTrau || {}) };
  merged.lvHac = { s: 0, l: 0, lastDate: '', lastW: -1, ...(rec.lvHac || {}) };
  merged.lvRua = { s: 0, lastDate: '', lastW: -1, ...(rec.lvRua || {}) };
  merged.newbie = merged.newbieDone ? [] : (Array.isArray(rec.newbie) && rec.newbie.length ? rec.newbie : createNewbieQuests());
  return merged;
}

for (const cid of Object.keys(persistedPlayers.characters)) {
  persistedPlayers.characters[cid] = normalizeRecord(persistedPlayers.characters[cid]);
}

function getOrCreateCharacter(cid, helloMsg = {}) {
  const safeCid = (typeof cid === 'string' && cid.trim()) ? cid.trim().slice(0, 80) : crypto.randomUUID();
  const isNew = !persistedPlayers.characters[safeCid];
  if (isNew) {
    persistedPlayers.characters[safeCid] = createDefaultRecord(safeCid, helloMsg);
    scheduleSave();
  }
  const rec = persistedPlayers.characters[safeCid];
  rolloverCalendar(rec);
  syncUnlockedState(rec, false);
  return { rec, isNew };
}

function rolloverCalendar(rec) {
  const today = getVnDateKey();
  const week = getVnWeekKey();
  let changed = false;

  if (rec.lastDate !== today) {
    const gap = diffDays(rec.lastDate, today);
    rec.streak = gap === 1 ? rec.streak + 1 : 1;
    rec.bestStreak = Math.max(rec.bestStreak, rec.streak);
    rec.days += 1;
    rec.lastDate = today;
    rec.todayMerit = 0;
    rec.tkDone = false;
    rec.chores = defaultChores();
    rec.quests = createDailyQuests();
    rec.lvTrau.deedToday = false;
    const todayJdn = getJdnFromDateKey(today);
    if (!rec.senDays.includes(todayJdn)) rec.senDays.push(todayJdn);
    changed = true;
  }

  if (rec.lastWeek !== week) {
    rec.lastWeek = week;
    rec.weekMerit = 0;
    rec.weekly = createWeeklyQuests();
    rec.weeklyBonusClaimed = false;
    changed = true;
  }

  if (changed) scheduleSave();
}

function syncUnlockedState(rec, announcePlayer = null) {
  const newlyUnlocked = [];
  for (const def of TITLE_DEFS) {
    if (!rec.unlockedTitles.includes(def.id) && def.check(rec)) {
      rec.unlockedTitles.push(def.id);
      newlyUnlocked.push(def);
    }
  }
  if (!rec.unlockedTitles.includes(rec.title)) {
    rec.title = 'nguoi_moi';
  }
  if (rec.merit >= 15000 && !rec.robes.includes('tangoc')) {
    rec.robes.push('tangoc');
  }
  if (rec.newbie.length > 0 && rec.newbie.every((q) => q.claimed)) {
    rec.newbieDone = true;
    rec.newbie = [];
    if (!rec.items.includes('mun')) {
      rec.items.push('mun');
    }
  }
  if (announcePlayer && newlyUnlocked.length > 0) {
    for (const def of newlyUnlocked) {
      announcePlayer.room?.broadcast({ t: 'ann', k: 'title', pid: rec.pid, name: rec.name, title: def.name });
      announcePlayer.send({ t: 'notice', text: `Bạn vừa mở khóa danh hiệu “${def.name}”! Vào Hồ sơ -> Danh hiệu để dùng.` });
    }
    announcePlayer.send({ t: 'journal', j: announcePlayer.getJournalData() });
  }
}

class Player {
  constructor(ws, id, rec) {
    this.ws = ws;
    this.id = id;
    this.rec = rec;
    this.room = null;
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.ry = 0;
    this.s = 0;
    this.seat = null;
    this.flying = false;
    this.dtMask = 0;
    this.maOn = 0;
    this.dance = '';
    this.lastSeen = Date.now();
    this.lastMoMeritAt = 0;
    this.lastRaceAt = 0;
    this.lastYtAt = 0;
    this.giftsLeftToday = 5;
  }

  send(payload) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  getEquippedTitleName() {
    const def = TITLE_DEFS.find((t) => t.id === this.rec.title);
    if (!def || def.id === 'nguoi_moi') return '';
    return this.rec.unlockedTitles.includes(def.id) ? def.name : '';
  }

  getTitlesList() {
    return TITLE_DEFS.map((t) => ({
      id: t.id,
      name: t.name,
      desc: t.desc,
      got: this.rec.unlockedTitles.includes(t.id) || t.check(this.rec)
    }));
  }

  getPhapKhiUnlocked() {
    return PHAPKHI_DEFS.filter((pk) => pk.check(this.rec)).map((pk) => pk.id);
  }

  toSavedLook() {
    return {
      name: this.rec.name,
      kind: this.rec.kind,
      robe: this.rec.robe,
      skin: this.rec.skin,
      bio: this.rec.bio,
      beads: this.rec.beads,
      cushion: this.rec.cushion,
      phapkhi: this.rec.phapkhi
    };
  }

  toPeerObject() {
    const lvl = getLevelInfo(this.rec.merit);
    return {
      id: this.id,
      pid: this.rec.pid,
      name: this.rec.name,
      kind: this.rec.kind,
      robe: this.rec.robe,
      skin: this.rec.skin,
      bio: this.rec.bio,
      beads: this.rec.beads,
      cushion: this.rec.cushion,
      phapkhi: this.rec.phapkhi,
      lv: lvl.lv,
      title: this.getEquippedTitleName(),
      pet: this.rec.pet,
      x: this.x,
      y: this.y,
      z: this.z,
      ry: this.ry,
      s: this.s,
      fly: this.flying ? 1 : 0,
      dt: this.dtMask || 0,
      ma: this.maOn || 0,
      dance: this.dance || ''
    };
  }

  setLook(look) {
    if (!look) return;
    const name = sanitizeName(look.name);
    if (name) this.rec.name = name;
    if (look.kind !== undefined) this.rec.kind = look.kind;
    if (look.robe !== undefined) this.rec.robe = look.robe;
    if (look.skin !== undefined) this.rec.skin = look.skin;
    if (look.bio !== undefined) this.rec.bio = sanitizeText(look.bio, 120);
    if (look.beads !== undefined) this.rec.beads = look.beads;
    if (look.cushion !== undefined) this.rec.cushion = look.cushion;
    if (look.phapkhi !== undefined) this.rec.phapkhi = look.phapkhi;
    this.rec.updatedAt = Date.now();
    scheduleSave();
  }

  getFestivalPayload() {
    const f = gameConfig.festival;
    if (!f || !f.enabled) return null;
    const prog = this.rec.leProgress && this.rec.leProgress.id === f.id
      ? this.rec.leProgress
      : { id: f.id, have: [], claimed: false };
    return {
      id: f.id,
      banner: f.banner,
      keep: f.keep,
      prize: f.prize || '',
      reward: Number(f.reward) || 0,
      lunar: {
        day: Number(f.lunar?.day) || 15,
        month: Number(f.lunar?.month) || 1
      },
      steps: (f.steps || []).map((st, idx) => ({
        label: st.label,
        have: Math.min(Math.max(1, Number(st.need) || 1), Number(prog.have?.[idx]) || 0),
        need: Math.max(1, Number(st.need) || 1)
      })),
      claimed: Boolean(prog.claimed)
    };
  }

  getMeritData() {
    const lvl = getLevelInfo(this.rec.merit);
    return {
      total: this.rec.merit,
      today: this.rec.todayMerit,
      level: lvl.name,
      lv: lvl.lv,
      title: this.getEquippedTitleName(),
      from: lvl.from,
      next: lvl.next,
      days: this.rec.days,
      tk: Boolean(this.rec.tkDone),
      newbie: this.rec.newbieDone ? null : this.rec.newbie,
      quests: this.rec.quests,
      weekly: this.rec.weekly,
      le: this.getFestivalPayload()
    };
  }

  getJournalData() {
    const lvl = getLevelInfo(this.rec.merit);
    return {
      name: this.rec.name,
      level: lvl.name,
      title: this.rec.title,
      titles: this.getTitlesList(),
      user: this.rec.user,
      merit: this.rec.merit,
      from: lvl.from,
      next: lvl.next,
      lv: lvl.lv,
      bows: this.rec.bows,
      rounds: this.rec.rounds,
      beads: this.rec.countedBeads,
      sitMin: this.rec.sitMin,
      streak: this.rec.streak,
      best: this.rec.bestStreak,
      visited: this.rec.visitedZones.length,
      zones: TOTAL_ZONES,
      days: this.rec.days,
      incense: this.rec.incenseCount,
      lanterns: this.rec.lanternCount,
      pet: this.rec.pet,
      items: this.rec.items,
      robes: this.rec.robes,
      phapkhi: this.getPhapKhiUnlocked(),
      keeps: this.rec.keeps
    };
  }

  getJourneyData() {
    const r = this.rec;
    return {
      total: r.merit,
      moc: [
        { name: 'Cấp 0: Sơ tâm', at: 0, got: true },
        { name: 'Cấp 1: Phát tâm', at: 200, got: r.merit >= 200 },
        { name: 'Cấp 2: Tinh tấn', at: 500, got: r.merit >= 500 },
        { name: 'Cấp 3: Hoan hỷ', at: 1000, got: r.merit >= 1000 },
        { name: 'Cấp 4: An lạc', at: 2000, got: r.merit >= 2000 }
      ],
      phapkhi: [
        { name: 'Nén hương', how: 'Dâng hương', have: r.incenseCount, need: 10, got: r.incenseCount >= 10 },
        { name: 'Giỏ hoa sen', how: 'Thả hoa đăng', have: r.lanternCount, need: 5, got: r.lanternCount >= 5 },
        { name: 'Chuông tay', how: 'Thỉnh chuông', have: r.bellCount, need: 10, got: r.bellCount >= 10 },
        { name: 'Gậy trúc hành hương', how: 'Thăm 10 khu', have: r.visitedZones.length, need: 10, got: r.visitedZones.length >= 10 },
        { name: 'Mõ cầm tay', how: 'Gõ mõ', have: r.moCount, need: 500, got: r.moCount >= 500 },
        { name: 'Thiền trượng chín khoen', how: 'Lạy Phật', have: r.bows, need: 1000, got: r.bows >= 1000 }
      ],
      robes: [
        { id: 'lam', name: 'Áo lam', how: 'Mặc định khi lên chùa', have: 1, need: 1, got: true },
        { id: 'tangoc', name: 'Áo tràng ngọc', how: 'Đạt 15.000 công đức', have: r.merit, need: 15000, got: r.merit >= 15000 }
      ],
      titles: this.getTitlesList()
    };
  }

  addMerit(points, reason = '') {
    rolloverCalendar(this.rec);
    const pts = Math.max(0, Number(points) || 0);
    const oldLv = getLevelInfo(this.rec.merit).lv;
    this.rec.merit += pts;
    this.rec.todayMerit += pts;
    this.rec.weekMerit += pts;
    this.rec.updatedAt = Date.now();
    syncUnlockedState(this.rec, this);
    scheduleSave();

    const newLvInfo = getLevelInfo(this.rec.merit);
    if (newLvInfo.lv > oldLv) {
      this.room?.broadcast({ t: 'ann', k: 'level', pid: this.rec.pid, name: this.rec.name, level: newLvInfo.name });
      this.room?.broadcast({ t: 'look', peer: this.toPeerObject() });
    }

    const payload = { t: 'merit', me: this.getMeritData() };
    if (pts > 0) payload.gain = { n: pts, why: reason };
    this.send(payload);
  }

  rewardAction(key, reason = '', multiplier = 1) {
    const base = Math.max(0, Number(gameConfig.rewards?.[key]) || 0);
    this.addMerit(base * multiplier, reason);
  }

  advanceFestival(kind, amount = 1) {
    const f = gameConfig.festival;
    if (!f || !f.enabled || !Array.isArray(f.steps) || !f.steps.length) return;
    if (!this.rec.leProgress || this.rec.leProgress.id !== f.id) {
      this.rec.leProgress = { id: f.id, have: new Array(f.steps.length).fill(0), claimed: false };
    }
    const prog = this.rec.leProgress;
    if (!Array.isArray(prog.have)) prog.have = [];
    if (prog.claimed) return;
    let changed = false;
    f.steps.forEach((st, idx) => {
      if (st.kind === kind) {
        const cur = Number(prog.have[idx]) || 0;
        const need = Math.max(1, Number(st.need) || 1);
        if (cur < need) {
          prog.have[idx] = Math.min(need, cur + amount);
          changed = true;
        }
      }
    });
    if (changed) scheduleSave();
  }

  advanceQuests(ids, amount = 1) {
    const idList = Array.isArray(ids) ? ids : [ids];
    for (const pool of [this.rec.quests, this.rec.weekly, this.rec.newbie]) {
      for (const q of pool) {
        if (idList.includes(q.id) && q.have < q.need) {
          q.have = Math.min(q.need, q.have + amount);
        }
      }
    }
    if (!this.rec.weeklyBonusClaimed) {
      const doneWeekly = this.rec.weekly.filter((q) => q.have >= q.need).length;
      if (doneWeekly >= 6) {
        this.rec.weeklyBonusClaimed = true;
        const bonus = Math.max(0, Number(gameConfig.rewards?.weekly6Bonus) || 0);
        if (bonus > 0) this.addMerit(bonus, 'Thưởng hoàn thành 6/9 việc tuần');
      }
    }
    scheduleSave();
  }
}

const MOB_REWARDS = {
  imp_sw: { tier: 1, label: 'Tiểu Yêu Hắc Phong', pts: 5, cool: 12000 },
  imp_se: { tier: 1, label: 'Tiểu Yêu Hắc Phong', pts: 5, cool: 12000 },
  imp_w: { tier: 1, label: 'Tiểu Yêu Rừng Tây', pts: 5, cool: 12000 },
  imp_e: { tier: 1, label: 'Tiểu Yêu Đông Viên', pts: 5, cool: 12000 },
  beast_sw: { tier: 2, label: 'Yêu Lang Hộ Cổng', pts: 10, cool: 18000 },
  beast_se: { tier: 2, label: 'Yêu Lang Hộ Cổng', pts: 10, cool: 18000 },
  beast_w: { tier: 2, label: 'Yêu Thú Tây Viên', pts: 10, cool: 18000 },
  boss_nw: { tier: 3, label: 'Ma Tướng Tây Sơn', pts: 20, cool: 28000 },
  boss_ne: { tier: 3, label: 'Ma Tướng Đông Hải', pts: 20, cool: 28000 }
};

function parseYoutubeId(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|live\/|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

function normalizeYtItem(item) {
  if (!item || typeof item !== 'object') return null;
  const vid = parseYoutubeId(item.videoId || item.url);
  if (!vid) return null;
  return {
    id: sanitizeText(String(item.id || ''), 32) || (Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
    videoId: vid,
    title: sanitizeText(String(item.title || ''), 80) || `Nhạc YouTube (${vid})`,
    by: sanitizeText(String(item.by || 'Khách chùa'), 40) || 'Khách chùa',
    pid: sanitizeText(String(item.pid || ''), 32),
    startedAt: Number.isFinite(Number(item.startedAt)) ? Number(item.startedAt) : Date.now(),
    addedAt: Number.isFinite(Number(item.addedAt)) ? Number(item.addedAt) : Date.now()
  };
}

function normalizeYtState(saved = {}) {
  const raw = saved && typeof saved === 'object' ? saved : {};
  const current = normalizeYtItem(raw.current);
  const queue = Array.isArray(raw.queue) ? raw.queue.map(normalizeYtItem).filter(Boolean).slice(0, 25) : [];
  return { current, queue, disco: Boolean(raw.disco) };
}

function buildYtPayload(room) {
  const yt = room?.yt || { current: null, queue: [], disco: false };
  return {
    t: 'yt-state',
    current: yt.current,
    queue: yt.queue,
    disco: Boolean(yt.disco),
    now: Date.now()
  };
}

class Room {
  constructor(name, saved = {}) {
    this.name = name;
    this.players = new Map();
    this.seats = new Map();
    this.mobLastKill = new Map();
    this.incense = Number.isFinite(saved.incense) ? saved.incense : 0;
    this.yardIncense = Number.isFinite(saved.yardIncense) ? saved.yardIncense : 0;
    this.sideIncense = saved.sideIncense || { ong: 0, hien: 0 };
    this.lamps = Number.isFinite(saved.lamps) ? saved.lamps : 0;
    this.lanterns = Array.isArray(saved.lanterns) ? saved.lanterns : [];
    this.vows = Array.isArray(saved.vows) ? saved.vows : [];
    this.pinned = typeof saved.pinned === 'string' ? saved.pinned : '';
    this.donors = Array.isArray(saved.donors) ? saved.donors : [];
    this.yt = normalizeYtState(saved.yt);
  }

  toJSON() {
    return {
      incense: this.incense,
      yardIncense: this.yardIncense,
      sideIncense: this.sideIncense,
      lamps: this.lamps,
      lanterns: this.lanterns.slice(-30),
      vows: this.vows.slice(-30),
      pinned: this.pinned,
      donors: this.donors.slice(-20),
      yt: this.yt
    };
  }

  getPeersList(excludeId = null) {
    const peers = [];
    for (const [id, p] of this.players.entries()) {
      if (id !== excludeId) peers.push(p.toPeerObject());
    }
    return peers;
  }

  broadcast(msg, excludeId = null) {
    const raw = typeof msg === 'string' ? msg : JSON.stringify(msg);
    for (const [id, p] of this.players.entries()) {
      if (id !== excludeId && p.ws.readyState === WebSocket.OPEN) {
        p.ws.send(raw);
      }
    }
  }
}

const rooms = new Map();
function getOrCreateRoom(roomName) {
  const name = roomName || 'chua-1';
  if (!rooms.has(name)) {
    rooms.set(name, new Room(name, persistedWorld.rooms[name]));
  }
  return rooms.get(name);
}
getOrCreateRoom('chua-1');

let nextPlayerId = 1000;
const allPlayers = new Map();

function findOnlineByCid(cid) {
  for (const p of allPlayers.values()) {
    if (p.rec.cid === cid) return p;
  }
  return null;
}

function findPlayerByTarget(msg, room) {
  if (msg.to !== undefined && room) {
    return room.players.get(msg.to) || null;
  }
  if (msg.pid) {
    for (const p of allPlayers.values()) {
      if (p.rec.pid === msg.pid) return p;
    }
  }
  return null;
}

function findRecordByPid(pid) {
  for (const rec of Object.values(persistedPlayers.characters)) {
    if (rec.pid === pid) return rec;
  }
  return null;
}

function buildFriendsPayload(rec) {
  const list = [];
  for (const friendPid of rec.friends) {
    const fRec = findRecordByPid(friendPid);
    if (!fRec) continue;
    const online = [...allPlayers.values()].find((p) => p.rec.pid === friendPid);
    list.push({
      pid: fRec.pid,
      name: fRec.name,
      lv: getLevelInfo(fRec.merit).lv,
      online: Boolean(online),
      room: online ? online.room?.name : null
    });
  }
  const reqIn = rec.friendReqIn
    .map((reqPid) => {
      const fRec = findRecordByPid(reqPid);
      return fRec ? { pid: fRec.pid, name: fRec.name } : null;
    })
    .filter(Boolean);
  return { t: 'friends', list, reqIn };
}

function buildBoardPayload(player, scope) {
  const metricKey = scope === 'today' ? 'todayMerit' : scope === 'week' ? 'weekMerit' : 'merit';
  const ranked = Object.values(persistedPlayers.characters)
    .map((rec) => {
      rolloverCalendar(rec);
      return {
        cid: rec.cid,
        name: rec.name,
        lv: getLevelInfo(rec.merit).lv,
        merit: rec[metricKey] || 0
      };
    })
    .filter((entry) => entry.merit > 0)
    .sort((a, b) => b.merit - a.merit);

  const myIndex = ranked.findIndex((entry) => entry.cid === player.rec.cid);
  const rows = ranked.slice(0, 20).map(({ name, lv, merit }) => ({ name, lv, merit }));
  const me = myIndex >= 0
    ? {
        rank: myIndex + 1,
        name: ranked[myIndex].name,
        lv: ranked[myIndex].lv,
        merit: ranked[myIndex].merit
      }
    : null;

  return { t: 'board', scope, count: ranked.length, me, rows };
}

function buildLinhVatPayload(rec) {
  const trauS = rec.lvTrau?.s || 0;
  const hacS = rec.lvHac?.s || 0;
  const ruaS = rec.lvRua?.s || 0;
  const todayStr = getVnDateKey();
  const enforce = Boolean(gameConfig.linhVatSessionCooldown);

  const sessionFor = (entry) => {
    if (!enforce || !entry) return { today: false, w: -1 };
    const isToday = entry.lastDate === todayStr && Number.isInteger(entry.lastW) && entry.lastW >= 0;
    return { today: isToday, w: isToday ? entry.lastW : -1 };
  };

  const trauSes = sessionFor(rec.lvTrau);
  const hacSes = sessionFor(rec.lvHac);
  const ruaSes = sessionFor(rec.lvRua);

  const hacFly = [];
  if (hacS >= 4) hacFly.push('dua');
  if (hacS >= 4 || Boolean(gameConfig.allowFreeCraneAnytime)) hacFly.push('tudo');

  return {
    t: 'linhvat',
    hac: {
      s: hacS,
      today: hacSes.today,
      w: hacSes.w,
      bonded: hacS >= 7,
      fly: hacFly,
      intro: hacS === 4,
      l: rec.lvHac?.l || 0
    },
    trau: {
      s: trauS,
      today: trauSes.today,
      w: trauSes.w,
      bonded: trauS >= 10,
      ride: trauS >= 6,
      deed: Boolean(rec.lvTrau?.deedToday)
    },
    rua: {
      s: ruaS,
      today: ruaSes.today,
      w: ruaSes.w,
      bonded: ruaS >= 7,
      swim: ruaS >= 3
    },
    race: { ...gameConfig.buffaloRace },
    raceSched: getCurrentRaceSlot(Date.now())
  };
}

const liveQuiz = {
  phase: 'off', // 'off' | 'wait' | 'ask' | 'show' | 'end'
  i: 0,
  n: 0,
  ask: 15000,
  show: 5000,
  phaseStart: 0,
  phaseEnd: 0,
  questions: [],
  answers: new Map(), // pid -> { [index]: choice }
  scores: new Map(),  // pid -> { pid, name, right, pts }
  timer: null
};

function clearLiveQuizTimer() {
  if (liveQuiz.timer) {
    clearTimeout(liveQuiz.timer);
    liveQuiz.timer = null;
  }
}

function getQuizTop(limit = 10) {
  return [...liveQuiz.scores.values()]
    .sort((a, b) => (b.pts - a.pts) || (b.right - a.right))
    .slice(0, limit);
}

function getQuizScore(pid) {
  const s = liveQuiz.scores.get(pid);
  return s ? { right: s.right, pts: s.pts } : { right: 0, pts: 0 };
}

function getQuizRank(pid) {
  const ranked = [...liveQuiz.scores.values()].sort((a, b) => (b.pts - a.pts) || (b.right - a.right));
  const idx = ranked.findIndex((entry) => entry.pid === pid);
  return idx >= 0 ? idx + 1 : null;
}

function buildQuizPayload(rec) {
  const now = Date.now();
  const pid = rec?.pid;
  const baseLeft = liveQuiz.phase === 'off'
    ? 3600000
    : Math.max(0, liveQuiz.phaseEnd - now);
  if (liveQuiz.phase === 'ask' || liveQuiz.phase === 'show') {
    const q = liveQuiz.questions[liveQuiz.i] || { text: '', opts: [], right: 0, why: '' };
    const ansMap = pid ? liveQuiz.answers.get(pid) : null;
    const mine = ansMap && ansMap[liveQuiz.i] !== undefined ? ansMap[liveQuiz.i] : null;
    return {
      t: 'quiz',
      phase: liveQuiz.phase,
      i: liveQuiz.i,
      n: liveQuiz.n,
      start: liveQuiz.phaseStart,
      ask: liveQuiz.ask,
      show: liveQuiz.show,
      now,
      left: baseLeft,
      upcoming: 0,
      q: { text: q.text, opts: q.opts },
      mine,
      right: liveQuiz.phase === 'show' ? q.right : undefined,
      why: liveQuiz.phase === 'show' ? q.why : undefined,
      score: pid ? getQuizScore(pid) : { right: 0, pts: 0 },
      top: []
    };
  }
  return {
    t: 'quiz',
    phase: liveQuiz.phase,
    now,
    left: baseLeft,
    upcoming: liveQuiz.phase === 'off' ? now + 3600000 : liveQuiz.phaseEnd,
    n: liveQuiz.n || 10,
    ask: liveQuiz.ask,
    show: liveQuiz.show,
    top: getQuizTop(),
    score: pid ? getQuizScore(pid) : undefined,
    rank: pid ? getQuizRank(pid) : undefined
  };
}

function broadcastQuiz() {
  for (const p of allPlayers.values()) {
    p.send(buildQuizPayload(p.rec));
  }
}

function advanceQuizStep(nextPhase, idx = 0) {
  clearLiveQuizTimer();
  const now = Date.now();
  if (nextPhase === 'ask') {
    if (idx >= liveQuiz.questions.length) {
      advanceQuizStep('end', idx);
      return;
    }
    liveQuiz.phase = 'ask';
    liveQuiz.i = idx;
    liveQuiz.phaseStart = now;
    liveQuiz.phaseEnd = now + liveQuiz.ask;
    broadcastQuiz();
    liveQuiz.timer = setTimeout(() => advanceQuizStep('show', idx), liveQuiz.ask);
    return;
  }
  if (nextPhase === 'show') {
    const q = liveQuiz.questions[idx];
    if (q) {
      for (const p of allPlayers.values()) {
        const pid = p.rec.pid;
        const choice = liveQuiz.answers.get(pid)?.[idx];
        if (choice === q.right) {
          const prev = liveQuiz.scores.get(pid) || { pid, name: p.rec.name, right: 0, pts: 0 };
          prev.name = p.rec.name;
          prev.right += 1;
          prev.pts += 10;
          liveQuiz.scores.set(pid, prev);
          p.rec.quizCount = (p.rec.quizCount || 0) + 1;
          p.addMerit(5, 'Trả lời đúng đố vui Phật pháp');
        }
      }
    }
    liveQuiz.phase = 'show';
    liveQuiz.i = idx;
    liveQuiz.phaseStart = now;
    liveQuiz.phaseEnd = now + liveQuiz.show;
    broadcastQuiz();
    const afterShow = idx + 1 < liveQuiz.n ? () => advanceQuizStep('ask', idx + 1) : () => advanceQuizStep('end', idx + 1);
    liveQuiz.timer = setTimeout(afterShow, liveQuiz.show);
    return;
  }
  if (nextPhase === 'end') {
    liveQuiz.phase = 'end';
    liveQuiz.phaseStart = now;
    liveQuiz.phaseEnd = now + 30000;
    broadcastQuiz();
    liveQuiz.timer = setTimeout(() => stopLiveQuiz(), 30000);
  }
}

function startLiveQuiz({ count = 5, askSec = 15, showSec = 5, waitSec = 3 } = {}) {
  clearLiveQuizTimer();
  const n = Math.max(1, Math.min(20, Number(count) || 5));
  const pool = [...QUIZ_PRACTICE_BANK].sort(() => Math.random() - 0.5);
  const questions = [];
  while (questions.length < n) {
    questions.push(...pool);
  }
  liveQuiz.questions = questions.slice(0, n);
  liveQuiz.n = n;
  liveQuiz.ask = Math.max(5, Math.min(60, Number(askSec) || 15)) * 1000;
  liveQuiz.show = Math.max(3, Math.min(30, Number(showSec) || 5)) * 1000;
  liveQuiz.i = 0;
  liveQuiz.answers = new Map();
  liveQuiz.scores = new Map();
  liveQuiz.phase = 'wait';
  liveQuiz.phaseStart = Date.now();
  liveQuiz.phaseEnd = Date.now() + Math.max(1, Number(waitSec) || 3) * 1000;
  broadcastQuiz();
  for (const r of rooms.values()) {
    r.broadcast({ t: 'ann', k: 'admin', text: `Đố vui Phật pháp (${n} câu) sắp bắt đầu! Mở Menu -> Đố vui để tham gia.` });
  }
  liveQuiz.timer = setTimeout(() => advanceQuizStep('ask', 0), liveQuiz.phaseEnd - liveQuiz.phaseStart);
}

function stopLiveQuiz() {
  clearLiveQuizTimer();
  liveQuiz.phase = 'off';
  liveQuiz.i = 0;
  liveQuiz.phaseStart = Date.now();
  liveQuiz.phaseEnd = Date.now() + 3600000;
  broadcastQuiz();
}

function sendWelcomeState(player, isNew) {
  const room = player.room;
  player.send({
    t: 'welcome',
    id: player.id,
    pid: player.rec.pid,
    room: room.name,
    user: player.rec.user,
    saved: isNew ? null : player.toSavedLook(),
    peers: room.getPeersList(player.id),
    seats: Array.from(room.seats.entries()),
    incense: room.incense,
    yardIncense: room.yardIncense,
    sideIncense: room.sideIncense,
    lanterns: room.lanterns.slice(-30),
    vows: room.vows.slice(-30),
    vowed: room.vows.some((v) => v.pid === player.rec.pid),
    lamps: room.lamps,
    pinned: room.pinned,
    total: allPlayers.size,
    hb: true,
    chores: player.rec.chores,
    donors: room.donors,
    yt: buildYtPayload(room)
  });

  player.send({ t: 'merit', me: player.getMeritData() });
  player.send({ t: 'bode', got: player.rec.bode });
  player.send({ t: 'duyen', v: buildDuyenView(player.rec) });
  player.send(buildLinhVatPayload(player.rec));
  player.send({ t: 'pet', p: player.rec.pet, can: { lv: getLevelInfo(player.rec.merit).lv, days: player.rec.days, tokens: 0 } });
  player.send(buildFriendsPayload(player.rec));
  if (liveQuiz.phase !== 'off') {
    player.send(buildQuizPayload(player.rec));
  }
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-cache' });
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > 1048576) {
        reject(new Error('Body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw.trim() ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function checkAdminAuth(req, res) {
  if (!gameConfig.adminPin) return true;
  const supplied = typeof req.headers['x-admin-pin'] === 'string' ? req.headers['x-admin-pin'].trim() : '';
  if (supplied !== gameConfig.adminPin) {
    sendJson(res, 401, { ok: false, error: 'PIN quản trị không đúng hoặc chưa đăng nhập.' });
    return false;
  }
  return true;
}

function pushOnlinePlayerUpdates(cid) {
  const p = findOnlineByCid(cid);
  if (!p) return;
  syncUnlockedState(p.rec, null);
  p.send({ t: 'merit', me: p.getMeritData() });
  p.send({ t: 'journal', j: p.getJournalData() });
  p.send({ t: 'hanhtrinh', ...p.getJourneyData() });
  p.send(buildLinhVatPayload(p.rec));
  p.room?.broadcast({ t: 'look', peer: p.toPeerObject() });
}

function buildAdminState() {
  const vnNow = new Date(Date.now() + TZ_OFFSET_MS);
  const currentVnTime = vnNow.toISOString().slice(0, 19).replace('T', ' ') + ' (UTC+7)';
  const onlineByCid = new Map();
  for (const p of allPlayers.values()) {
    onlineByCid.set(p.rec.cid, p);
  }

  const players = Object.values(persistedPlayers.characters)
    .map((rec) => {
      rolloverCalendar(rec);
      const online = onlineByCid.get(rec.cid);
      const lvl = getLevelInfo(rec.merit);
      return {
        cid: rec.cid,
        pid: rec.pid,
        name: rec.name,
        user: rec.user,
        banned: Boolean(rec.banned),
        online: Boolean(online),
        room: online ? online.room?.name : null,
        kind: rec.kind,
        robe: rec.robe,
        bio: rec.bio,
        merit: rec.merit,
        todayMerit: rec.todayMerit,
        weekMerit: rec.weekMerit,
        lv: lvl.lv,
        levelName: lvl.name,
        title: rec.title,
        unlockedTitles: rec.unlockedTitles,
        bows: rec.bows,
        rounds: rec.rounds,
        countedBeads: rec.countedBeads,
        sitMin: rec.sitMin,
        days: rec.days,
        streak: rec.streak,
        bestStreak: rec.bestStreak,
        incenseCount: rec.incenseCount,
        lanternCount: rec.lanternCount,
        bellCount: rec.bellCount,
        moCount: rec.moCount,
        sweepCount: rec.sweepCount,
        feedCount: rec.feedCount,
        vowCount: rec.vowCount,
        quizCount: rec.quizCount,
        visitedZones: rec.visitedZones,
        keeps: rec.keeps,
        pet: rec.pet,
        lvTrau: rec.lvTrau,
        lvHac: rec.lvHac,
        lvRua: rec.lvRua,
        quests: rec.quests,
        weekly: rec.weekly,
        weeklyBonusClaimed: rec.weeklyBonusClaimed,
        newbie: rec.newbie,
        newbieDone: rec.newbieDone,
        updatedAt: rec.updatedAt
      };
    })
    .sort((a, b) => (Number(b.online) - Number(a.online)) || (b.merit - a.merit));

  const roomList = [];
  for (const [rName, r] of rooms.entries()) {
    roomList.push({
      name: rName,
      online: r.players.size,
      incense: r.incense,
      yardIncense: r.yardIncense,
      sideIncense: r.sideIncense,
      lamps: r.lamps,
      pinned: r.pinned,
      donors: r.donors,
      vows: r.vows.slice(-30).reverse(),
      lanterns: r.lanterns.slice(-30).reverse()
    });
  }

  return {
    ok: true,
    config: gameConfig,
    onlineCount: allPlayers.size,
    totalCharacters: players.length,
    players,
    rooms: roomList,
    quiz: {
      phase: liveQuiz.phase,
      i: liveQuiz.i,
      n: liveQuiz.n,
      top: getQuizTop()
    },
    meta: {
      currentVnTime,
      vnHour: getVnHour(),
      raceSchedule: getCurrentRaceSlot(Date.now()),
      linhVatWindows: LINH_VAT_WINDOWS,
      linhVatSlotsNow: {
        trau: getLinhVatSlot('trau'),
        hac: getLinhVatSlot('hac'),
        rua: getLinhVatSlot('rua')
      },
      titles: TITLE_DEFS.map((t) => ({ id: t.id, name: t.name, desc: t.desc })),
      questIds: QUEST_ID_META,
      levels: LEVELS,
      festivalPresets: FESTIVAL_PRESETS
    }
  };
}

function serveAdminStatic(reqPath, res) {
  let rel = reqPath === '/admin' || reqPath === '/admin/' ? 'index.html' : reqPath.replace(/^\/admin\//, '');
  const fullPath = path.join(ADMIN_DIR, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  if (!fullPath.startsWith(ADMIN_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }
  fs.readFile(fullPath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(fullPath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
}

// HTTP Static & API Server
const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Pin');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (pathname === '/api/pass') {
    sendJson(res, 200, { off: true });
    return;
  }

  if (pathname === '/api/health') {
    sendJson(res, 200, {
      status: 'ok',
      online: allPlayers.size,
      rooms: rooms.size,
      savedCharacters: Object.keys(persistedPlayers.characters).length
    });
    return;
  }

  // Admin GUI static routes
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    serveAdminStatic(pathname, res);
    return;
  }

  // Admin API routes
  if (pathname === '/api/admin/login' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      if (gameConfig.adminPin && String(body.pin || '').trim() !== gameConfig.adminPin) {
        sendJson(res, 401, { ok: false, error: 'PIN quản trị không đúng.' });
        return;
      }
      sendJson(res, 200, { ok: true, pinRequired: Boolean(gameConfig.adminPin) });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: err.message });
    }
    return;
  }

  if (pathname === '/api/admin/state' && req.method === 'GET') {
    if (!checkAdminAuth(req, res)) return;
    sendJson(res, 200, buildAdminState());
    return;
  }

  if (pathname === '/api/admin/config' && req.method === 'POST') {
    if (!checkAdminAuth(req, res)) return;
    try {
      const body = await readJsonBody(req);
      if (body.resetDefault) {
        gameConfig = getDefaultConfig();
      } else {
        const merged = {
          ...gameConfig,
          ...(body.config && typeof body.config === 'object' ? body.config : {})
        };
        if (body.config?.rewards) {
          merged.rewards = { ...gameConfig.rewards, ...body.config.rewards };
        }
        if (body.config?.questsConfig) {
          merged.questsConfig = { ...gameConfig.questsConfig, ...body.config.questsConfig };
        }
        if (body.config?.festival) {
          merged.festival = { ...gameConfig.festival, ...body.config.festival };
        }
        if (body.config?.buffaloRace) {
          merged.buffaloRace = { ...gameConfig.buffaloRace, ...body.config.buffaloRace };
        }
        gameConfig = normalizeConfig(merged);
        const curS = computeRaceSlot(Date.now(), gameConfig.buffaloRace, TZ_OFFSET_MS);
        raceSchedTracker.lastStartedSlot = curS.curSlot;
        raceSchedTracker.lastWarnSlot = -1;
        raceSchedTracker.lastWarnMin = 0;
      }
      saveConfig();

      const resetQuests = Array.isArray(body.resetQuests) ? body.resetQuests : [];
      if (body.syncToPlayers || resetQuests.length > 0) {
        for (const rec of Object.values(persistedPlayers.characters)) {
          rec.quests = syncQuestPool(rec.quests, createDailyQuests(), resetQuests.includes('daily'));
          rec.weekly = syncQuestPool(rec.weekly, createWeeklyQuests(), resetQuests.includes('weekly'));
          if (resetQuests.includes('weekly')) rec.weeklyBonusClaimed = false;
          if (resetQuests.includes('newbie')) {
            rec.newbieDone = false;
            rec.newbie = createNewbieQuests();
          } else if (!rec.newbieDone) {
            rec.newbie = syncQuestPool(rec.newbie, createNewbieQuests(), false);
          }
          if (resetQuests.includes('festival')) {
            rec.leProgress = null;
          }
        }
        flushSave();
      }

      for (const p of allPlayers.values()) {
        p.send({ t: 'merit', me: p.getMeritData() });
        p.send(buildLinhVatPayload(p.rec));
      }

      sendJson(res, 200, { ok: true, state: buildAdminState() });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: err.message });
    }
    return;
  }

  if (pathname === '/api/admin/player/update' && req.method === 'POST') {
    if (!checkAdminAuth(req, res)) return;
    try {
      const body = await readJsonBody(req);
      const cid = String(body.cid || '').trim();
      const rec = persistedPlayers.characters[cid];
      if (!rec) {
        sendJson(res, 404, { ok: false, error: 'Không tìm thấy nhân vật.' });
        return;
      }
      const patch = body.patch && typeof body.patch === 'object' ? body.patch : {};
      if (typeof patch.name === 'string') {
        const n = sanitizeName(patch.name);
        if (n) rec.name = n;
      }
      if (typeof patch.bio === 'string') {
        rec.bio = sanitizeText(patch.bio, 120);
      }
      if (patch.banned !== undefined) {
        rec.banned = Boolean(patch.banned);
      }
      const numFields = [
        'merit', 'todayMerit', 'weekMerit', 'bows', 'rounds', 'countedBeads',
        'sitMin', 'days', 'streak', 'bestStreak', 'incenseCount', 'lanternCount',
        'bellCount', 'moCount', 'sweepCount', 'feedCount', 'vowCount', 'quizCount'
      ];
      for (const f of numFields) {
        if (patch[f] !== undefined && Number.isFinite(Number(patch[f]))) {
          rec[f] = Math.max(0, Math.round(Number(patch[f])));
        }
      }
      if (Array.isArray(patch.unlockedTitles)) {
        const validIds = new Set(TITLE_DEFS.map((t) => t.id));
        rec.unlockedTitles = Array.from(new Set(['nguoi_moi', ...patch.unlockedTitles.filter((id) => validIds.has(id))]));
      }
      if (typeof patch.title === 'string' && TITLE_DEFS.some((t) => t.id === patch.title)) {
        if (!rec.unlockedTitles.includes(patch.title)) {
          rec.unlockedTitles.push(patch.title);
        }
        rec.title = patch.title;
      }
      if (patch.lvTrau && typeof patch.lvTrau === 'object') {
        if (patch.lvTrau.s !== undefined) rec.lvTrau.s = Math.max(0, Math.min(10, Math.round(Number(patch.lvTrau.s) || 0)));
        if (patch.lvTrau.deedToday !== undefined) rec.lvTrau.deedToday = Boolean(patch.lvTrau.deedToday);
        if (patch.lvTrau.resetSession) { rec.lvTrau.lastDate = ''; rec.lvTrau.lastW = -1; }
      }
      if (patch.lvHac && typeof patch.lvHac === 'object') {
        if (patch.lvHac.s !== undefined) {
          rec.lvHac.s = Math.max(0, Math.min(7, Math.round(Number(patch.lvHac.s) || 0)));
          rec.lvHac.l = rec.lvHac.s;
        }
        if (patch.lvHac.resetSession) { rec.lvHac.lastDate = ''; rec.lvHac.lastW = -1; }
      }
      if (patch.lvRua && typeof patch.lvRua === 'object') {
        if (patch.lvRua.s !== undefined) rec.lvRua.s = Math.max(0, Math.min(7, Math.round(Number(patch.lvRua.s) || 0)));
        if (patch.lvRua.resetSession) { rec.lvRua.lastDate = ''; rec.lvRua.lastW = -1; }
      }
      if (Array.isArray(patch.quests)) rec.quests = patch.quests;
      if (Array.isArray(patch.weekly)) rec.weekly = patch.weekly;
      if (Array.isArray(patch.keeps)) rec.keeps = patch.keeps;

      rec.updatedAt = Date.now();
      flushSave();

      const online = findOnlineByCid(cid);
      if (online) {
        if (rec.banned) {
          online.send({ t: 'banned' });
          online.ws.close(1008, 'banned');
        } else {
          pushOnlinePlayerUpdates(cid);
        }
      }
      sendJson(res, 200, { ok: true, state: buildAdminState() });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: err.message });
    }
    return;
  }

  if (pathname === '/api/admin/player/action' && req.method === 'POST') {
    if (!checkAdminAuth(req, res)) return;
    try {
      const body = await readJsonBody(req);
      const cid = String(body.cid || '').trim();
      const action = String(body.action || '');
      const rec = persistedPlayers.characters[cid];
      if (!rec) {
        sendJson(res, 404, { ok: false, error: 'Không tìm thấy nhân vật.' });
        return;
      }
      const online = findOnlineByCid(cid);

      if (action === 'notice') {
        const text = sanitizeText(String(body.text || ''), 200);
        if (text && online) online.send({ t: 'notice', text: `[Quản trị] ${text}` });
      } else if (action === 'reset-linhvat-cooldown') {
        const k = body.kind || 'all';
        if (k === 'all' || k === 'trau') {
          rec.lvTrau.lastDate = '';
          rec.lvTrau.lastW = -1;
          rec.lvTrau.deedToday = false;
        }
        if (k === 'all' || k === 'hac') {
          rec.lvHac.lastDate = '';
          rec.lvHac.lastW = -1;
        }
        if (k === 'all' || k === 'rua') {
          rec.lvRua.lastDate = '';
          rec.lvRua.lastW = -1;
        }
        flushSave();
        if (online) {
          online.send(buildLinhVatPayload(rec));
          online.send({ t: 'notice', text: 'Quản trị đã mở lại lượt gặp linh vật cho bạn.' });
        }
      } else if (action === 'ban') {
        rec.banned = true;
        flushSave();
        if (online) {
          online.send({ t: 'banned' });
          online.ws.close(1008, 'banned');
        }
      } else if (action === 'unban') {
        rec.banned = false;
        flushSave();
      } else if (action === 'kick') {
        if (online) {
          online.send({ t: 'notice', text: 'Kết nối của bạn được quản trị đóng.' });
          online.ws.close(1000, 'kicked');
        }
      } else if (action === 'reset-stats') {
        const keepAccount = { cid: rec.cid, pid: rec.pid, user: rec.user, passHash: rec.passHash, name: rec.name };
        const fresh = createDefaultRecord(rec.cid, { name: rec.name, kind: rec.kind, robe: rec.robe, skin: rec.skin });
        Object.assign(rec, fresh, keepAccount);
        flushSave();
        pushOnlinePlayerUpdates(cid);
      } else if (action === 'delete') {
        if (rec.user && persistedPlayers.accounts[rec.user] === cid) {
          delete persistedPlayers.accounts[rec.user];
        }
        delete persistedPlayers.characters[cid];
        flushSave();
        if (online) {
          online.send({ t: 'banned' });
          online.ws.close(1000, 'deleted');
        }
      }
      sendJson(res, 200, { ok: true, state: buildAdminState() });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: err.message });
    }
    return;
  }

  if (pathname === '/api/admin/world' && req.method === 'POST') {
    if (!checkAdminAuth(req, res)) return;
    try {
      const body = await readJsonBody(req);
      const roomName = String(body.room || 'chua-1');
      const action = String(body.action || '');
      const targetRooms = roomName === 'all' ? [...rooms.values()] : [getOrCreateRoom(roomName)];

      if (action === 'broadcast-ann') {
        const text = sanitizeText(String(body.text || ''), 240);
        if (text) {
          for (const r of targetRooms) {
            r.broadcast({ t: 'ann', k: 'admin', text });
            r.broadcast({ t: 'notice', text });
          }
        }
      } else if (action === 'set-pinned') {
        const text = sanitizeText(String(body.text || ''), 240);
        for (const r of targetRooms) {
          r.pinned = text;
          r.broadcast({ t: 'pinned', text });
        }
        flushSave();
      } else if (action === 'reset-all-linhvat-cooldown') {
        for (const rec of Object.values(persistedPlayers.characters)) {
          rec.lvTrau.lastDate = '';
          rec.lvTrau.lastW = -1;
          rec.lvHac.lastDate = '';
          rec.lvHac.lastW = -1;
          rec.lvRua.lastDate = '';
          rec.lvRua.lastW = -1;
        }
        flushSave();
        for (const p of allPlayers.values()) {
          p.send(buildLinhVatPayload(p.rec));
        }
      } else if (action === 'set-counters') {
        const r = getOrCreateRoom(roomName === 'all' ? 'chua-1' : roomName);
        if (body.incense !== undefined) {
          r.incense = Math.max(0, Math.round(Number(body.incense) || 0));
          r.broadcast({ t: 'incense', n: r.incense, id: 0, name: 'Quản trị' });
        }
        if (body.yardIncense !== undefined) {
          r.yardIncense = Math.max(0, Math.round(Number(body.yardIncense) || 0));
          r.broadcast({ t: 'san-incense', n: r.yardIncense, id: 0, name: 'Quản trị' });
        }
        if (body.lamps !== undefined) {
          r.lamps = Math.max(0, Math.round(Number(body.lamps) || 0));
          r.broadcast({ t: 'lamps', n: r.lamps, id: 0, name: 'Quản trị' });
        }
        flushSave();
      } else if (action === 'add-donor') {
        const name = sanitizeText(String(body.name || ''), 48);
        if (name) {
          for (const r of targetRooms) {
            r.donors.push({ name });
            r.broadcast({ t: 'donors', list: r.donors });
          }
          flushSave();
        }
      } else if (action === 'remove-donor') {
        const idx = Number(body.index);
        const r = getOrCreateRoom(roomName === 'all' ? 'chua-1' : roomName);
        if (Number.isInteger(idx) && idx >= 0 && idx < r.donors.length) {
          r.donors.splice(idx, 1);
          r.broadcast({ t: 'donors', list: r.donors });
          flushSave();
        }
      } else if (action === 'remove-vow') {
        const r = getOrCreateRoom(roomName === 'all' ? 'chua-1' : roomName);
        r.vows = r.vows.filter((v) => v.id !== body.id);
        flushSave();
      } else if (action === 'remove-lantern') {
        const r = getOrCreateRoom(roomName === 'all' ? 'chua-1' : roomName);
        r.lanterns = r.lanterns.filter((l) => l.id !== body.id);
        r.broadcast({ t: 'lantern-gone', id: body.id });
        flushSave();
      } else if (action === 'trigger-race-now') {
        const nowTs = Date.now();
        raceManualOpenUntil = nowTs + RACE_JOIN_WINDOW_SEC * 1000;
        const slot = getCurrentRaceSlot(nowTs);
        raceSchedTracker.lastStartedSlot = slot.curSlot;
        raceSchedTracker.lastWarnSlot = -1;
        raceSchedTracker.lastWarnMin = 0;
        broadcastRaceScheduleEvent('start', slot, 0);
      } else if (action === 'trigger-race-warn') {
        const minsLeft = Math.max(1, Math.min(3, Math.round(Number(body.minsLeft) || 3)));
        const slot = getCurrentRaceSlot(Date.now());
        broadcastRaceScheduleEvent('warn', slot, minsLeft);
      } else if (action === 'clear-yt') {
        for (const r of targetRooms) {
          r.yt = { current: null, queue: [], disco: false };
          r.broadcast(buildYtPayload(r));
        }
        flushSave();
      }

      sendJson(res, 200, { ok: true, state: buildAdminState() });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: err.message });
    }
    return;
  }

  if (pathname === '/api/admin/quiz' && req.method === 'POST') {
    if (!checkAdminAuth(req, res)) return;
    try {
      const body = await readJsonBody(req);
      if (body.action === 'start') {
        startLiveQuiz({ count: body.count, askSec: body.askSec, showSec: body.showSec, waitSec: body.waitSec });
      } else if (body.action === 'next') {
        if (liveQuiz.phase === 'wait') advanceQuizStep('ask', 0);
        else if (liveQuiz.phase === 'ask') advanceQuizStep('show', liveQuiz.i);
        else if (liveQuiz.phase === 'show') advanceQuizStep(liveQuiz.i + 1 < liveQuiz.n ? 'ask' : 'end', liveQuiz.i + 1);
      } else if (body.action === 'stop') {
        stopLiveQuiz();
      }
      sendJson(res, 200, { ok: true, state: buildAdminState() });
    } catch (err) {
      sendJson(res, 400, { ok: false, error: err.message });
    }
    return;
  }

  let reqPath = pathname;
  if (reqPath === '/client' || reqPath.startsWith('/client/')) {
    reqPath = reqPath.slice(7) || '/';
  }
  let safePath = path.normalize(reqPath).replace(/^(\.\.[/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  const filePath = path.join(CLIENT_DIR, safePath);
  if (!filePath.startsWith(CLIENT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      if (path.extname(pathname) || pathname.startsWith('/models/') || pathname.startsWith('/assets/') || pathname.startsWith('/draco/') || pathname.startsWith('/music/')) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end(`404 Not Found: ${pathname}`);
        return;
      }
      const indexPath = path.join(CLIENT_DIR, 'index.html');
      fs.readFile(indexPath, (readErr, data) => {
        if (readErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
          res.end(data);
        }
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const range = req.headers.range;
    if (range && stats.size > 0 && ext === '.mp3') {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Type': contentType
      });
      fs.createReadStream(filePath, { start, end }).pipe(res);
      return;
    }

    res.writeHead(200, {
      'Content-Length': stats.size,
      'Content-Type': contentType,
      'Cache-Control': (ext === '.html' || ext === '.js' || ext === '.css' || pathname.includes('tien_kiem')) ? 'no-cache' : 'public, max-age=86400'
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

// WebSocket Server
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const id = ++nextPlayerId;
  let player = null;

  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }

    if (!player && msg.t !== 'hello') return;

    switch (msg.t) {
      case 'hello': {
        const roomName = msg.room || url.searchParams.get('phong') || 'chua-1';
        const room = getOrCreateRoom(roomName);
        const { rec, isNew } = getOrCreateCharacter(msg.cid, msg);

        if (rec.banned) {
          ws.send(JSON.stringify({ t: 'banned' }));
          ws.close(1008, 'banned');
          return;
        }

        const existingOnline = findOnlineByCid(rec.cid);
        if (existingOnline && existingOnline.ws !== ws) {
          existingOnline.send({ t: 'replaced' });
          existingOnline.ws.close(1000, 'replaced');
        }

        player = new Player(ws, id, rec);
        player.room = room;
        room.players.set(id, player);
        allPlayers.set(ws, player);

        sendWelcomeState(player, isNew);

        room.broadcast({ t: 'join', peer: player.toPeerObject() }, player.id);
        room.broadcast({ t: 'ann', k: 'join', pid: rec.pid, name: rec.name }, player.id);
        room.broadcast({ t: 'total', n: allPlayers.size });
        break;
      }

      case 'hb': {
        player.lastSeen = Date.now();
        player.send({ t: 'hb' });
        break;
      }

      case 'visit': {
        const zone = sanitizeText(msg.zone, 60);
        if (zone && !player.rec.visitedZones.includes(zone)) {
          player.rec.visitedZones.push(zone);
          syncUnlockedState(player.rec, player);
          scheduleSave();
        }
        break;
      }

      case 'journal': {
        rolloverCalendar(player.rec);
        syncUnlockedState(player.rec, null);
        player.send({ t: 'journal', j: player.getJournalData() });
        break;
      }

      case 'merit': {
        rolloverCalendar(player.rec);
        player.send({ t: 'merit', me: player.getMeritData() });
        break;
      }

      case 'board': {
        const scope = ['today', 'week', 'all'].includes(msg.scope) ? msg.scope : 'today';
        player.send(buildBoardPayload(player, scope));
        break;
      }

      case 'hanhtrinh': {
        player.send({ t: 'hanhtrinh', ...player.getJourneyData() });
        break;
      }

      case 'claim': {
        const qId = msg.q;
        let quest = null;
        for (const pool of [player.rec.quests, player.rec.weekly, player.rec.newbie]) {
          quest = pool.find((q) => q.id === qId);
          if (quest) break;
        }
        if (quest && !quest.claimed && quest.have >= quest.need) {
          quest.claimed = true;
          player.addMerit(quest.reward, `Hoàn thành: ${quest.title}`);
        }
        break;
      }

      case 'claim-le': {
        const f = gameConfig.festival;
        if (!f || !f.enabled) break;
        const prog = player.rec.leProgress;
        if (!prog || prog.id !== f.id || prog.claimed) break;
        const allDone = (f.steps || []).every((st, idx) => (Number(prog.have?.[idx]) || 0) >= (Number(st.need) || 1));
        if (!allDone) break;
        prog.claimed = true;
        if (!player.rec.keeps.some((k) => k.id === f.id)) {
          player.rec.keeps.push({ id: f.id, name: f.keep, at: getVnDateKey(), prize: f.prize || '' });
        }
        const pts = Math.max(0, Number(f.reward) || 0);
        flushSave();
        player.send({ t: 'le-done', keep: f.keep, prize: f.prize || '' });
        if (pts > 0) {
          player.addMerit(pts, `Hoàn thành lễ: ${f.banner || f.id}`);
        } else {
          player.send({ t: 'merit', me: player.getMeritData() });
        }
        player.send({ t: 'journal', j: player.getJournalData() });
        break;
      }

      case 'title': {
        const targetId = msg.id;
        if (!targetId) break;
        syncUnlockedState(player.rec, null);
        const titles = player.getTitlesList();
        const found = titles.find((t) => t.id === targetId);
        if (!found || !found.got) {
          player.send({ t: 'notice', text: 'Bạn chưa hoàn thành điều kiện của danh hiệu này.' });
          player.send({ t: 'journal', j: player.getJournalData() });
          break;
        }
        player.rec.title = found.id;
        scheduleSave();
        player.room?.broadcast({ t: 'look', peer: player.toPeerObject() });
        player.send({ t: 'merit', me: player.getMeritData() });
        player.send({ t: 'journal', j: player.getJournalData() });
        player.send({ t: 'notice', text: `Đã chọn danh hiệu “${found.name}”` });
        break;
      }

      case 'register': {
        const username = sanitizeName(msg.user).toLowerCase();
        const pass = typeof msg.pass === 'string' ? msg.pass : '';
        if (!/^[a-z0-9_.-]{3,20}$/.test(username)) {
          player.send({ t: 'account-err', text: 'Tên đăng nhập gồm 3-20 ký tự chữ, số hoặc _ . -' });
          break;
        }
        if (pass.length < 6) {
          player.send({ t: 'account-err', text: 'Mật khẩu cần ít nhất 6 ký tự.' });
          break;
        }
        if (persistedPlayers.accounts[username]) {
          player.send({ t: 'account-err', text: 'Tên đăng nhập này đã có người dùng.' });
          break;
        }
        player.rec.user = username;
        player.rec.passHash = hashPassword(pass);
        persistedPlayers.accounts[username] = player.rec.cid;
        scheduleSave();
        player.send({ t: 'journal', j: player.getJournalData() });
        player.send({ t: 'notice', text: `Đã tạo tài khoản @${username} gắn với hồ sơ hiện tại.` });
        break;
      }

      case 'login': {
        const username = sanitizeName(msg.user).toLowerCase();
        const pass = typeof msg.pass === 'string' ? msg.pass : '';
        const targetCid = persistedPlayers.accounts[username];
        const targetRec = targetCid ? persistedPlayers.characters[targetCid] : null;
        if (!targetRec || !verifyPassword(pass, targetRec.passHash)) {
          player.send({ t: 'account-err', text: 'Sai tên đăng nhập hoặc mật khẩu.' });
          break;
        }
        player.send({ t: 'login-ok', cid: targetCid });
        break;
      }

      case 'passwd': {
        if (!player.rec.user) {
          player.send({ t: 'account-err', text: 'Bạn chưa có tài khoản.' });
          break;
        }
        const oldPass = typeof msg.old === 'string' ? msg.old : '';
        const newPass = typeof msg.pass === 'string' ? msg.pass : '';
        if (!verifyPassword(oldPass, player.rec.passHash)) {
          player.send({ t: 'account-err', text: 'Mật khẩu hiện tại chưa đúng.' });
          break;
        }
        if (newPass.length < 6) {
          player.send({ t: 'account-err', text: 'Mật khẩu mới cần ít nhất 6 ký tự.' });
          break;
        }
        player.rec.passHash = hashPassword(newPass);
        scheduleSave();
        player.send({ t: 'journal', j: player.getJournalData() });
        player.send({ t: 'notice', text: 'Đã đổi mật khẩu.' });
        break;
      }

      case 'state': {
        if (!player.room) break;
        if (Number.isFinite(msg.x)) player.x = msg.x;
        if (Number.isFinite(msg.y)) player.y = msg.y;
        if (Number.isFinite(msg.z)) player.z = msg.z;
        if (Number.isFinite(msg.ry)) player.ry = msg.ry;
        if (Number.isInteger(msg.s)) player.s = msg.s;

        if (msg.seat !== undefined && msg.seat !== player.seat) {
          if (player.seat !== null) {
            player.room.seats.delete(player.seat);
            player.room.broadcast({ t: 'seats', on: [], off: [player.seat] });
          }
          if (msg.seat !== null) {
            player.room.seats.set(msg.seat, player.id);
            player.room.broadcast({ t: 'seats', on: [[msg.seat, player.id]], off: [] });
          }
          player.seat = msg.seat;
        }

        player.room.broadcast({
          t: 'state',
          id: player.id,
          x: player.x,
          y: player.y,
          z: player.z,
          ry: player.ry,
          s: player.s
        }, player.id);
        break;
      }

      case 'look': {
        if (!player.room) break;
        player.setLook(msg);
        player.room.broadcast({ t: 'look', peer: player.toPeerObject() });
        break;
      }

      case 'chat': {
        if (!player.room || !msg.text) break;
        const text = sanitizeText(msg.text, 100);
        if (!text) break;
        player.room.broadcast({
          t: 'chat',
          id: player.id,
          name: player.rec.name,
          text,
          warn: false
        });
        break;
      }

      case 'emote': {
        if (!player.room || !msg.e) break;
        if (typeof msg.e === 'string' && /^dt-[0-7]$/.test(msg.e)) {
          player.dtMask = parseInt(msg.e.slice(3), 10) || 0;
        }
        if (msg.e === 'ma-1' || msg.e === 'ma-0') {
          player.maOn = msg.e === 'ma-1' ? 1 : 0;
        }
        if (msg.e === 'dance-off') {
          player.dance = '';
        } else if (typeof msg.e === 'string' && /^dance-(dj|zen|spin)$/.test(msg.e)) {
          player.dance = msg.e.slice(6);
        }
        if (msg.e === 'lay') {
          player.rec.bows += 1;
          player.advanceQuests(['lay', 'lay27', 'wLay', 'nmLay'], 1);
          player.advanceFestival('lay', 1);
          player.rewardAction('lay', 'Lạy Phật trang nghiêm');
        }
        player.room.broadcast({ t: 'emote', id: player.id, e: msg.e });
        break;
      }

      case 'viec': {
        if (msg.k === 'quet') {
          player.rec.chores.quet = true;
          player.rec.sweepCount += 1;
          player.advanceQuests('quet', 1);
          player.advanceFestival('quet', 1);
          player.rewardAction('quet', 'Quét sạch bụi trần');
        } else if (msg.k === 'ca') {
          player.rec.chores.ca = true;
          player.rec.feedCount += 1;
          player.advanceQuests('phongsinh', 1);
          player.advanceFestival('ca', 1);
          player.rewardAction('ca', 'Từ bi hỷ xả');
        }
        player.send({ t: 'chores', c: player.rec.chores });
        break;
      }

      case 'incense': {
        if (!player.room) break;
        player.room.incense += 1;
        player.rec.incenseCount += 1;
        player.advanceQuests(['huong', 'dong', 'nmHuong'], 1);
        player.advanceFestival('incense', 1);
        player.rewardAction('incense', 'Dâng một nén hương');
        player.room.broadcast({
          t: 'incense',
          n: player.room.incense,
          id: player.id,
          name: player.rec.name
        });
        break;
      }

      case 'san-incense': {
        if (!player.room) break;
        player.room.yardIncense += 1;
        player.rec.incenseCount += 1;
        player.advanceQuests(['huong', 'dong', 'nmHuong'], 1);
        player.advanceFestival('incense', 1);
        player.rewardAction('sanIncense', 'Dâng hương sân chùa');
        player.room.broadcast({
          t: 'san-incense',
          n: player.room.yardIncense,
          id: player.id,
          name: player.rec.name
        });
        break;
      }

      case 'ban-incense': {
        if (!player.room || !msg.k) break;
        const k = String(msg.k);
        player.room.sideIncense[k] = (player.room.sideIncense[k] || 0) + 1;
        player.rec.incenseCount += 1;
        player.advanceQuests(['huong', 'dong', 'nmHuong'], 1);
        player.advanceFestival('incense', 1);
        player.rewardAction('banIncense', 'Dâng hương nơi ban thờ');
        player.room.broadcast({
          t: 'ban-incense',
          k,
          n: player.room.sideIncense[k],
          id: player.id,
          name: player.rec.name
        });
        break;
      }

      case 'bell': {
        if (!player.room) break;
        player.rec.bellCount += 1;
        player.advanceQuests('chuong', 1);
        player.advanceFestival('bell', 1);
        player.rewardAction('bell', 'Thỉnh một tiếng chuông chùa');
        player.room.broadcast({ t: 'bell', id: player.id, name: player.rec.name });
        break;
      }

      case 'mo': {
        const count = Math.max(1, Math.min(20, Number(msg.n) || 1));
        player.rec.moCount += count;
        player.advanceQuests(['mo', 'tung'], count);
        const now = Date.now();
        if (now - player.lastMoMeritAt >= 1500) {
          player.lastMoMeritAt = now;
          player.rewardAction('mo', 'Gõ mõ tụng kinh');
        } else {
          syncUnlockedState(player.rec, player);
          scheduleSave();
        }
        break;
      }

      case 'beads': {
        const count = Math.max(1, Math.min(108, Number(msg.n) || 1));
        const prevRounds = Math.floor(player.rec.countedBeads / 108);
        player.rec.countedBeads += count;
        const newRounds = Math.floor(player.rec.countedBeads / 108);
        player.advanceQuests('mo', count);
        if (newRounds > prevRounds) {
          const gainedRounds = newRounds - prevRounds;
          player.rec.rounds += gainedRounds;
          player.rewardAction('beadsRound', 'Tròn một chuỗi 108 hạt', gainedRounds);
        } else {
          syncUnlockedState(player.rec, player);
          scheduleSave();
          player.send({ t: 'merit', me: player.getMeritData() });
        }
        break;
      }

      case 'lamp': {
        if (!player.room) break;
        player.room.lamps += 1;
        player.advanceQuests('thapden', 1);
        player.advanceFestival('lamp', 1);
        player.rewardAction('lamp', 'Thắp ngọn đèn dâng Phật');
        player.room.broadcast({
          t: 'lamps',
          n: player.room.lamps,
          id: player.id,
          name: player.rec.name
        });
        break;
      }

      case 'lantern': {
        if (!player.room || !msg.text) break;
        const text = sanitizeText(msg.text, 80);
        if (!text) break;
        player.rec.lanternCount += 1;
        player.rec.chores.den = true;
        player.advanceQuests(['den', 'nmDen'], 1);
        player.advanceFestival('lantern', 1);
        player.rewardAction('lantern', 'Thả một ngọn hoa đăng cầu an');
        const lantern = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          pid: player.rec.pid,
          name: player.rec.name,
          color: msg.color || '#ff8800',
          text,
          at: Date.now(),
          likes: 0
        };
        player.room.lanterns.push(lantern);
        if (player.room.lanterns.length > 60) player.room.lanterns.shift();
        player.send({ t: 'chores', c: player.rec.chores });
        player.room.broadcast({ t: 'lantern', lantern });
        break;
      }

      case 'vow': {
        if (!player.room || !msg.text) break;
        const text = sanitizeText(msg.text, 120);
        if (!text) break;
        player.rec.vowCount += 1;
        player.advanceQuests('nmDen', 1);
        player.advanceFestival('vow', 1);
        player.rewardAction('vow', 'Gửi một lời nguyện lành');
        const vow = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          pid: player.rec.pid,
          name: player.rec.name,
          text,
          likes: 0,
          at: Date.now()
        };
        player.room.vows.push(vow);
        if (player.room.vows.length > 60) player.room.vows.shift();
        player.room.broadcast({ t: 'vow', vow });
        break;
      }

      case 'vow-like': {
        if (!player.room || !msg.id) break;
        const vow = player.room.vows.find((v) => v.id === msg.id);
        if (vow) {
          vow.likes = (vow.likes || 0) + 1;
          player.rec.lvTrau.deedToday = true;
          scheduleSave();
          player.send(buildLinhVatPayload(player.rec));
          player.room.broadcast({ t: 'vow-likes', id: vow.id, likes: vow.likes });
        }
        break;
      }

      case 'tuyhy': {
        if (!player.room || !msg.lantern) break;
        const lantern = player.room.lanterns.find((l) => l.id === msg.lantern);
        if (lantern) {
          lantern.likes = (lantern.likes || 0) + 1;
          player.rec.lvTrau.deedToday = true;
          scheduleSave();
          player.send(buildLinhVatPayload(player.rec));
          player.room.broadcast({ t: 'likes', id: lantern.id, likes: lantern.likes });
        }
        break;
      }

      case 'bode-nhat': {
        const idx = Number(msg.i);
        if (!Number.isInteger(idx) || idx < 0 || idx >= 108) break;
        if (!player.rec.bode.includes(idx)) {
          player.rec.bode.push(idx);
          const zoneIdx = Math.floor(idx / 9);
          const zoneBase = zoneIdx * 9;
          let inZone = 0;
          for (let k = zoneBase; k < zoneBase + 9; k++) {
            if (player.rec.bode.includes(k)) inZone++;
          }
          const all = player.rec.bode.length >= 108;
          if (all && !player.rec.items.includes('bode')) {
            player.rec.items.push('bode');
          }
          player.rewardAction(all ? 'bodeAll' : 'bode', 'Nhặt hạt bồ đề');
          player.send({ t: 'bode-nhat', i: idx, zone: zoneIdx, zoneDone: inZone >= 9, all });
        }
        break;
      }

      case 'tk-done': {
        if (!player.rec.tkDone) {
          player.rec.tkDone = true;
          const todayJdn = getJdnFromDateKey();
          if (!player.rec.senDone.includes(todayJdn)) player.rec.senDone.push(todayJdn);
          player.rewardAction('tkDone', 'Tụng kinh hồi hướng');
        }
        break;
      }

      case 'xam': {
        const num = Math.max(1, Math.min(100, Number(msg.n) || Math.ceil(Math.random() * 100)));
        const verse = XAM_VERSES[num % XAM_VERSES.length];
        player.advanceQuests('xam', 1);
        player.advanceFestival('xam', 1);
        player.rewardAction('xam', 'Gieo quẻ đầu ngày');
        player.send({ t: 'xam', n: num, text: verse });
        break;
      }

      case 'offer-flowers': {
        player.advanceQuests('tuoi', 1);
        player.advanceFestival('offerFlowers', 1);
        player.rewardAction('offerFlowers', 'Dâng hoa cúng Phật');
        player.room?.broadcast({ t: 'emote', id: player.id, e: 'hoa' });
        break;
      }

      case 'rooms': {
        const list = [];
        for (const [rName, rObj] of rooms.entries()) {
          list.push({ id: rName, name: `Chùa An Tự Duyên (${rName})`, n: rObj.players.size });
        }
        player.send({ t: 'rooms', list, mine: player.room?.name || 'chua-1' });
        break;
      }

      case 'room-go': {
        const nextName = sanitizeText(msg.room, 40) || 'chua-1';
        const oldRoom = player.room;
        if (oldRoom && oldRoom.name === nextName) break;
        if (oldRoom) {
          oldRoom.players.delete(player.id);
          if (player.seat !== null) {
            oldRoom.seats.delete(player.seat);
            oldRoom.broadcast({ t: 'seats', on: [], off: [player.seat] });
            player.seat = null;
          }
          oldRoom.broadcast({ t: 'leave', id: player.id });
        }
        const nextRoom = getOrCreateRoom(nextName);
        player.room = nextRoom;
        nextRoom.players.set(player.id, player);
        player.send({
          t: 'room',
          room: nextRoom.name,
          peers: nextRoom.getPeersList(player.id),
          seats: Array.from(nextRoom.seats.entries()),
          donors: nextRoom.donors,
          yt: buildYtPayload(nextRoom)
        });
        nextRoom.broadcast({ t: 'join', peer: player.toPeerObject() }, player.id);
        break;
      }

      case 'garden': {
        player.send({ t: 'garden', mine: null, flowers: [], beds: [] });
        break;
      }

      case 'quiz': {
        player.send(buildQuizPayload(player.rec));
        break;
      }

      case 'quiz-ans': {
        if (liveQuiz.phase !== 'ask') break;
        const idx = Number(msg.i);
        const choice = Number(msg.c);
        if (idx !== liveQuiz.i || !Number.isInteger(choice) || choice < 0 || choice > 3) break;
        const pid = player.rec.pid;
        const existing = liveQuiz.answers.get(pid) || {};
        if (existing[idx] !== undefined) break;
        existing[idx] = choice;
        liveQuiz.answers.set(pid, existing);
        if (!liveQuiz.scores.has(pid)) {
          liveQuiz.scores.set(pid, { pid, name: player.rec.name, right: 0, pts: 0 });
        }
        player.send({ t: 'quiz-got', i: idx, c: choice });
        break;
      }

      case 'quiz-practice': {
        const shuffled = [...QUIZ_PRACTICE_BANK].sort(() => Math.random() - 0.5).slice(0, 5);
        player.send({ t: 'quiz-practice', qs: shuffled });
        break;
      }

      case 'profile': {
        const target = findPlayerByTarget(msg, player.room);
        const rec = target ? target.rec : findRecordByPid(msg.pid);
        if (!rec) break;
        const isSelf = rec.cid === player.rec.cid;
        const bond = isSelf
          ? 'self'
          : player.rec.friends.includes(rec.pid)
            ? 'yes'
            : player.rec.friendReqIn.includes(rec.pid)
              ? 'got'
              : rec.friendReqIn.includes(player.rec.pid)
                ? 'sent'
                : 'none';
        const lvl = getLevelInfo(rec.merit);
        const titleDef = TITLE_DEFS.find((t) => t.id === rec.title);
        player.send({
          t: 'profile',
          p: {
            id: target ? target.id : null,
            pid: rec.pid,
            name: rec.name,
            kind: rec.kind,
            robe: rec.robe,
            skin: rec.skin,
            bio: rec.bio,
            beads: rec.beads,
            cushion: rec.cushion,
            phapkhi: rec.phapkhi,
            pet: rec.pet,
            duyen: rec.duyen,
            level: lvl.name,
            title: titleDef && titleDef.id !== 'nguoi_moi' ? titleDef.name : '',
            online: Boolean(target),
            bond,
            giftsLeft: player.giftsLeftToday,
            merit: rec.merit,
            bows: rec.bows,
            rounds: rec.rounds,
            streak: rec.streak
          }
        });
        break;
      }

      case 'greet': {
        const target = findPlayerByTarget(msg, player.room);
        if (target) {
          target.send({ t: 'greet', id: player.id, name: player.rec.name });
          player.rewardAction('greet', 'Chắp tay chào bạn đồng tu');
        }
        break;
      }

      case 'wish': {
        const text = sanitizeText(msg.text, 80);
        const target = findPlayerByTarget(msg, player.room);
        if (target && text) {
          player.rec.lvTrau.deedToday = true;
          scheduleSave();
          target.send({ t: 'wish', pid: player.rec.pid, name: player.rec.name, text, warn: false });
          player.send(buildLinhVatPayload(player.rec));
          player.send({ t: 'notice', text: `Đã gửi lời chúc tới ${target.rec.name}` });
        }
        break;
      }

      case 'gift': {
        const target = findPlayerByTarget(msg, player.room);
        if (target && player.giftsLeftToday > 0) {
          player.giftsLeftToday -= 1;
          player.rec.lvTrau.deedToday = true;
          target.send({ t: 'gift', pid: player.rec.pid, name: player.rec.name });
          player.send(buildLinhVatPayload(player.rec));
          player.rewardAction('gift', `Dâng hương cầu an cho ${target.rec.name}`);
        }
        break;
      }

      case 'friends': {
        player.send(buildFriendsPayload(player.rec));
        break;
      }

      case 'friend': {
        const target = findPlayerByTarget(msg, player.room);
        const targetRec = target ? target.rec : findRecordByPid(msg.pid);
        if (!targetRec || targetRec.pid === player.rec.pid) break;
        if (player.rec.friendReqIn.includes(targetRec.pid)) {
          player.rec.friendReqIn = player.rec.friendReqIn.filter((p) => p !== targetRec.pid);
          if (!player.rec.friends.includes(targetRec.pid)) player.rec.friends.push(targetRec.pid);
          if (!targetRec.friends.includes(player.rec.pid)) targetRec.friends.push(player.rec.pid);
          scheduleSave();
          player.send(buildFriendsPayload(player.rec));
          target?.send(buildFriendsPayload(targetRec));
        } else if (!targetRec.friendReqIn.includes(player.rec.pid) && !player.rec.friends.includes(targetRec.pid)) {
          targetRec.friendReqIn.push(player.rec.pid);
          scheduleSave();
          target?.send({ t: 'friend-req', pid: player.rec.pid, name: player.rec.name });
          target?.send(buildFriendsPayload(targetRec));
        }
        break;
      }

      case 'unfriend': {
        const target = findPlayerByTarget(msg, player.room);
        const targetRec = target ? target.rec : findRecordByPid(msg.pid);
        if (!targetRec) break;
        player.rec.friends = player.rec.friends.filter((p) => p !== targetRec.pid);
        player.rec.friendReqIn = player.rec.friendReqIn.filter((p) => p !== targetRec.pid);
        targetRec.friends = targetRec.friends.filter((p) => p !== player.rec.pid);
        targetRec.friendReqIn = targetRec.friendReqIn.filter((p) => p !== player.rec.pid);
        scheduleSave();
        player.send(buildFriendsPayload(player.rec));
        target?.send(buildFriendsPayload(targetRec));
        break;
      }

      case 'dm': {
        if (!msg.pid || !msg.text) break;
        const text = sanitizeText(msg.text, 200);
        if (!text) break;
        const target = [...allPlayers.values()].find((p) => p.rec.pid === msg.pid);
        const packet = { t: 'dm', from: player.rec.pid, to: msg.pid, name: player.rec.name, text, at: Date.now() };
        player.send(packet);
        target?.send(packet);
        break;
      }

      case 'am':
      case 'am-in': {
        player.send({ t: 'am', slots: player.rec.amSlots });
        break;
      }

      case 'am-set': {
        const idx = Number(msg.slot);
        if (Number.isInteger(idx) && idx >= 0 && idx < 12) {
          player.rec.amSlots[idx] = msg.item || null;
          scheduleSave();
          player.send({ t: 'am', slots: player.rec.amSlots });
        }
        break;
      }

      case 'phap-in': {
        player.send({ t: 'phap-n', n: player.room ? player.room.players.size : 1 });
        break;
      }

      case 'sp': {
        player.send({ t: 'sp', msgs: [], unread: 0 });
        break;
      }

      case 'so-sen': {
        player.send({
          t: 'so-sen',
          today: getJdnFromDateKey(),
          days: player.rec.senDays,
          done: player.rec.senDone
        });
        break;
      }

      case 'duyen': {
        player.send({ t: 'duyen', v: buildDuyenView(player.rec) });
        break;
      }

      case 'born': {
        const y = Number(msg.y);
        const curYear = new Date(Date.now() + TZ_OFFSET_MS).getUTCFullYear();
        if (!player.rec.born && Number.isInteger(y) && y >= curYear - 105 && y <= curYear - 5) {
          player.rec.born = y;
          scheduleSave();
        }
        player.send({ t: 'duyen', v: buildDuyenView(player.rec) });
        break;
      }

      case 'chores': {
        player.send({ t: 'chores', c: player.rec.chores });
        break;
      }

      case 'khoe': {
        if (player.room) {
          const lvl = getLevelInfo(player.rec.merit);
          const badge = player.getEquippedTitleName() || lvl.name;
          player.room.broadcast({
            t: 'notice',
            text: `${player.rec.name} (${badge}) hiện có ${player.rec.merit.toLocaleString('vi-VN')} công đức · ${player.rec.bows} lạy Phật.`
          });
        }
        break;
      }

      case 'lv-buoc': {
        const LINH_VAT_META = {
          trau: { key: 'lvTrau', max: 10, label: 'Trâu', stepMsg: (s) => `Chăn trâu · Tranh ${s}`, bondMsg: 'Hoàn thành Mười bức tranh chăn trâu' },
          hac: { key: 'lvHac', max: 7, label: 'Hạc trắng', stepMsg: (s) => `Kết duyên Hạc trắng bậc ${s}`, bondMsg: 'Kết duyên với Hạc trắng', onStep: (rec) => { rec.lvHac.l = (rec.lvHac.l || 0) + 1; } },
          rua: { key: 'lvRua', max: 7, label: 'Rùa thần', stepMsg: (s) => `Nghe Rùa thần kể chuyện ${s}`, bondMsg: 'Kết duyên với Rùa thần' }
        };
        const kind = msg.k;
        const meta = LINH_VAT_META[kind];
        if (!meta) break;
        const entry = player.rec[meta.key];
        if (entry.s >= meta.max) break;

        if (gameConfig.linhVatSessionCooldown) {
          const slot = getLinhVatSlot(kind);
          const todayStr = getVnDateKey();
          if (slot < 0) {
            player.send({ t: 'notice', text: `Hiện chưa tới giờ ${meta.label} xuất hiện.` });
            player.send(buildLinhVatPayload(player.rec));
            break;
          }
          if (entry.lastDate === todayStr && (entry.lastW === slot || entry.lastW === 1)) {
            player.send({
              t: 'notice',
              text: slot === 0
                ? `Buổi sáng bạn đã gặp ${meta.label} rồi, buổi chiều hãy quay lại.`
                : `Hôm nay bạn đã gặp ${meta.label} rồi, ngày mai hãy quay lại.`
            });
            player.send(buildLinhVatPayload(player.rec));
            break;
          }
          entry.lastDate = todayStr;
          entry.lastW = slot;
        }

        entry.s += 1;
        if (meta.onStep) meta.onStep(player.rec);
        const step = entry.s;
        scheduleSave();
        player.send({ t: 'lv-buoc', k: kind, step });
        player.send(buildLinhVatPayload(player.rec));
        const isBond = step >= meta.max;
        player.rewardAction(isBond ? 'linhVatBond' : 'linhVatStep', isBond ? meta.bondMsg : meta.stepMsg(step));
        if (isBond) {
          player.room?.broadcast({ t: 'ann', k: 'linhvat', pid: player.rec.pid, name: player.rec.name, lv: meta.label });
        }
        break;
      }

      case 'lv-cuoi': {
        if (msg.on) player.maOn = 0;
        player.room?.broadcast({ t: 'lv-cuoi', id: player.id, on: msg.on ? 1 : 0 }, player.id);
        break;
      }

      case 'lv-boi': {
        player.room?.broadcast({ t: 'lv-boi', id: player.id, on: msg.on ? 1 : 0 }, player.id);
        break;
      }

      case 'lv-bay': {
        const on = (msg.on !== undefined ? Boolean(msg.on) : Boolean(msg.k)) ? 1 : 0;
        player.flying = Boolean(on);
        if (on) player.maOn = 0;
        player.room?.broadcast({ t: 'lv-bay', id: player.id, on }, player.id);
        break;
      }

      case 'lv-xuong': {
        player.flying = false;
        player.room?.broadcast({ t: 'lv-bay', id: player.id, on: 0 }, player.id);
        break;
      }

      case 'duatrau-done': {
        const nowTs = Date.now();
        if (nowTs - player.lastRaceAt < 15000) break;
        player.lastRaceAt = nowTs;
        const rank = Math.max(1, Math.min(20, Math.round(Number(msg.rank) || 1)));
        const total = Math.max(rank, Math.min(20, Math.round(Number(msg.total) || 1)));
        const diffLabels = { de: 'Dễ', trungbinh: 'Trung Bình', kho: 'Khó', cuckho: 'Cực Khó' };
        const diffMult = { de: 1, trungbinh: 1.5, kho: 2, cuckho: 3 };
        const diff = diffLabels[msg.diff] ? msg.diff : 'trungbinh';
        const mult = diffMult[diff];
        const podium = rank === 1 ? 15 : rank === 2 ? 10 : rank === 3 ? 6 : 3;
        const rewardPts = Math.round(podium * mult);
        player.addMerit(rewardPts, `Đua trâu hạng ${rank}/${total} (${diffLabels[diff]})`);
        if (rank === 1 && total >= 2) {
          player.room?.broadcast({
            t: 'ann',
            k: 'admin',
            text: `🐂 ${player.rec.name} vừa về Nhất Trường đua trâu quanh chùa (${diffLabels[diff]} · ${total} trâu)!`
          });
        }
        break;
      }

      case 'mob-kill': {
        const room = player.room;
        if (!room || !msg.id) break;
        const mob = MOB_REWARDS[msg.id];
        if (!mob) break;
        const nowTs = Date.now();
        const prev = room.mobLastKill.get(msg.id) || 0;
        if (nowTs - prev < mob.cool) break;
        room.mobLastKill.set(msg.id, nowTs);
        player.addMerit(mob.pts, `Hóa giải ${mob.label}`);
        if (mob.tier >= 3) {
          room.broadcast({
            t: 'ann',
            k: 'admin',
            text: `⚔️ ${player.rec.name} vừa dùng thần thông hóa giải ${mob.label} (+${mob.pts} Công đức)!`
          });
        }
        break;
      }

      case 'yt-add': {
        const room = player.room;
        if (!room) break;
        const nowTs = Date.now();
        if (nowTs - player.lastYtAt < 1200) break;
        const vid = parseYoutubeId(msg.videoId || msg.url);
        if (!vid) {
          player.send({ t: 'notice', text: 'Link YouTube không hợp lệ' });
          break;
        }
        player.lastYtAt = nowTs;
        const item = {
          id: nowTs.toString(36) + Math.random().toString(36).slice(2, 6),
          videoId: vid,
          title: sanitizeText(String(msg.title || ''), 80) || `Nhạc YouTube (${vid})`,
          by: player.rec.name,
          pid: player.rec.pid,
          startedAt: nowTs,
          addedAt: nowTs
        };
        const playNow = !room.yt.current || !!msg.playNow;
        if (playNow) {
          if (room.yt.current) {
            room.yt.queue.unshift({ ...room.yt.current });
          }
          room.yt.current = item;
        } else {
          room.yt.queue.push(item);
        }
        room.yt.queue = room.yt.queue.slice(0, 25);
        scheduleSave();
        room.broadcast(buildYtPayload(room));
        room.broadcast({
          t: 'ann',
          k: 'yt',
          text: playNow
            ? `🎵 ${player.rec.name} đang phát chiếu "${item.title}" trên Bảng nhạc YouTube sân chùa!`
            : `🎵 ${player.rec.name} đã thêm "${item.title}" vào hàng chờ Bảng nhạc YouTube!`
        });
        break;
      }

      case 'yt-play': {
        const room = player.room;
        if (!room || !msg.id) break;
        const nowTs = Date.now();
        if (nowTs - player.lastYtAt < 1000) break;
        player.lastYtAt = nowTs;
        const idx = room.yt.queue.findIndex((x) => x.id === msg.id);
        if (idx >= 0) {
          const picked = room.yt.queue.splice(idx, 1)[0];
          if (room.yt.current) room.yt.queue.push({ ...room.yt.current });
          room.yt.current = { ...picked, startedAt: nowTs };
          room.yt.queue = room.yt.queue.slice(0, 25);
          scheduleSave();
          room.broadcast(buildYtPayload(room));
        }
        break;
      }

      case 'yt-next': {
        const room = player.room;
        if (!room) break;
        const nowTs = Date.now();
        if (nowTs - player.lastYtAt < 1000) break;
        player.lastYtAt = nowTs;
        const nxt = room.yt.queue.shift() || null;
        if (room.yt.current) {
          // Keep replay history at end of queue if we have room, else drop
          if (nxt && room.yt.queue.length < 20) room.yt.queue.push({ ...room.yt.current });
        }
        room.yt.current = nxt ? { ...nxt, startedAt: nowTs } : null;
        scheduleSave();
        room.broadcast(buildYtPayload(room));
        break;
      }

      case 'yt-stop': {
        const room = player.room;
        if (!room) break;
        const nowTs = Date.now();
        if (nowTs - player.lastYtAt < 1000) break;
        player.lastYtAt = nowTs;
        if (room.yt.current) {
          room.yt.queue.unshift({ ...room.yt.current });
          room.yt.queue = room.yt.queue.slice(0, 25);
          room.yt.current = null;
          scheduleSave();
          room.broadcast(buildYtPayload(room));
        }
        break;
      }

      case 'yt-disco': {
        const room = player.room;
        if (!room) break;
        const nowTs = Date.now();
        if (nowTs - player.lastYtAt < 500) break;
        player.lastYtAt = nowTs;
        room.yt.disco = msg.on !== undefined ? Boolean(msg.on) : !room.yt.disco;
        scheduleSave();
        room.broadcast(buildYtPayload(room));
        room.broadcast({
          t: 'ann',
          k: 'yt',
          text: room.yt.disco
            ? `🪩 ${player.rec.name} vừa BẬT Quả cầu gương chiếu sáng trước Đài nhạc YouTube!`
            : `🪩 ${player.rec.name} vừa TẮT Quả cầu gương sân chùa.`
        });
        break;
      }

      case 'yt-remove': {
        const room = player.room;
        if (!room) break;
        const nowTs = Date.now();
        if (nowTs - player.lastYtAt < 350) break;
        player.lastYtAt = nowTs;
        let changed = false;
        if (msg.current || (msg.id && room.yt.current?.id === msg.id)) {
          if (room.yt.current) {
            const nxt = room.yt.queue.shift() || null;
            room.yt.current = nxt ? { ...nxt, startedAt: nowTs } : null;
            changed = true;
          }
        } else if (msg.id) {
          const before = room.yt.queue.length;
          room.yt.queue = room.yt.queue.filter((x) => x.id !== msg.id);
          changed = room.yt.queue.length !== before;
        }
        if (changed) {
          scheduleSave();
          room.broadcast(buildYtPayload(room));
        }
        break;
      }

      case 'yt-clear': {
        const room = player.room;
        if (!room) break;
        const nowTs = Date.now();
        if (nowTs - player.lastYtAt < 500) break;
        player.lastYtAt = nowTs;
        if (msg.scope === 'queue') {
          room.yt.queue = [];
        } else {
          room.yt.current = null;
          room.yt.queue = [];
        }
        scheduleSave();
        room.broadcast(buildYtPayload(room));
        break;
      }

      case 'water': {
        player.rec.lvTrau.deedToday = true;
        player.advanceQuests('tuoi', 1);
        player.rewardAction('water', 'Tưới hoa vườn chùa');
        player.send(buildLinhVatPayload(player.rec));
        player.room?.broadcast({ t: 'watered', pid: msg.pid, id: player.id });
        break;
      }

      case 'pet-choose': {
        const k = sanitizeText(msg.k, 20);
        const n = sanitizeName(msg.n);
        if (k && n) {
          player.rec.pet = { k, n };
          scheduleSave();
          player.send({ t: 'pet', p: player.rec.pet, can: { lv: getLevelInfo(player.rec.merit).lv, days: player.rec.days, tokens: 0 } });
          player.room?.broadcast({ t: 'look', peer: player.toPeerObject() });
          player.room?.broadcast({ t: 'ann', k: 'pet', pid: player.rec.pid, name: player.rec.name, pet: n });
        }
        break;
      }

      case 'pet-feed': {
        if (player.rec.pet) {
          player.rec.feedCount += 1;
          player.rewardAction('petFeed', `Chăm sóc ${player.rec.pet.n}`);
          player.room?.broadcast({ t: 'pet-fed', id: player.id });
        }
        break;
      }

      case 'pet-pat': {
        const target = findPlayerByTarget(msg, player.room);
        if (target) {
          target.send({ t: 'pet-pat', id: target.id, by: player.rec.name });
        }
        break;
      }

      case 'pet-return': {
        player.rec.pet = null;
        scheduleSave();
        player.send({ t: 'pet', p: null, can: { lv: getLevelInfo(player.rec.merit).lv, days: player.rec.days, tokens: 0 } });
        player.room?.broadcast({ t: 'look', peer: player.toPeerObject() });
        break;
      }

      default:
        break;
    }
  });

  ws.on('close', () => {
    allPlayers.delete(ws);
    if (player && player.room) {
      const room = player.room;
      room.players.delete(player.id);
      if (player.seat !== null) {
        room.seats.delete(player.seat);
        room.broadcast({ t: 'seats', on: [], off: [player.seat] });
      }
      room.broadcast({ t: 'leave', id: player.id });
      room.broadcast({ t: 'total', n: allPlayers.size });
    }
    flushSave();
  });

  ws.on('error', (err) => {
    console.error(`[WebSocket Error] Player ${id}:`, err.message);
  });
});

// Track meditation sitting duration + 10-minute buffalo race schedule & 3p/2p/1p announcements
setInterval(() => {
  const nowMs = Date.now();
  const raceTick = evaluateRaceTick(raceSchedTracker, nowMs, gameConfig.buffaloRace, TZ_OFFSET_MS);
  if (raceTick.event) {
    broadcastRaceScheduleEvent(raceTick.event, raceTick.slot, raceTick.minsLeft);
  }
  for (const player of allPlayers.values()) {
    if (player.s === 2) {
      player.rec.sitSec += 1;
      if (player.rec.sitSec >= 60) {
        player.rec.sitSec -= 60;
        player.rec.sitMin += 1;
        player.advanceQuests(['ngoi', 'ngoi15', 'wNgoi'], 1);
        player.advanceFestival('sitMin', 1);
        player.rewardAction('sitMin', 'Ngồi thiền tĩnh tâm 1 phút');
      }
    }
  }
}, 1000);

// Smooth batch state sync every 100ms
setInterval(() => {
  for (const room of rooms.values()) {
    if (room.players.size > 1) {
      const stateUpdates = [];
      for (const p of room.players.values()) {
        stateUpdates.push([p.id, p.x, p.y, p.z, p.ry, p.s]);
      }
      room.broadcast({ t: 'states', a: stateUpdates });
    }
  }
}, 100);

function shutdown() {
  clearLiveQuizTimer();
  try { flushSave(); } catch {}
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('SIGBREAK', shutdown);
process.on('SIGHUP', shutdown);

server.listen(PORT, HOST, () => {
  console.log('=======================================================');
  console.log('  AN TU DUYEN - CHUA ONLINE GAME SERVER (NODE.JS)');
  console.log('  ---------------------------------------------------');
  console.log(`  Game URL:           http://localhost:${PORT}/?phong=chua-1`);
  console.log(`  Admin GUI:          http://localhost:${PORT}/admin`);
  console.log(`  WebSocket endpoint: ws://localhost:${PORT}/ws`);
  console.log(`  Data persistence:   ${DATA_DIR}`);
  console.log('=======================================================');
});
