import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { computeRaceSlot, createRaceTracker, evaluateRaceTick } from '../race_schedule.js';

const require = createRequire('D:/python/didenchua/server/package.json');
const { WebSocket } = require('ws');

const SERVER_DIR = 'D:/python/didenchua/server';
const DATA_DIR = path.join(SERVER_DIR, 'data');
const PLAYERS_FILE = path.join(DATA_DIR, 'players.json');
const WORLD_FILE = path.join(DATA_DIR, 'world.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const PORT = 18080;

// Backup real save data before running isolated test
const backupPlayers = fs.existsSync(PLAYERS_FILE) ? fs.readFileSync(PLAYERS_FILE) : null;
const backupWorld = fs.existsSync(WORLD_FILE) ? fs.readFileSync(WORLD_FILE) : null;
const backupConfig = fs.existsSync(CONFIG_FILE) ? fs.readFileSync(CONFIG_FILE) : null;
if (fs.existsSync(PLAYERS_FILE)) fs.unlinkSync(PLAYERS_FILE);
if (fs.existsSync(WORLD_FILE)) fs.unlinkSync(WORLD_FILE);
if (fs.existsSync(CONFIG_FILE)) fs.unlinkSync(CONFIG_FILE);

const proc = spawn('node', ['server.js'], {
  cwd: SERVER_DIR,
  env: { ...process.env, PORT: String(PORT), HOST: '127.0.0.1' },
  stdio: ['ignore', 'pipe', 'pipe']
});

let serverOut = '';
proc.stdout.on('data', (d) => { serverOut += d.toString(); });
proc.stderr.on('data', (d) => { serverOut += d.toString(); });

async function waitForReady() {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/api/pass`);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('Server failed to listen in time:\n' + serverOut);
}

class TestClient {
  constructor() {
    this.msgs = [];
    this.waiters = [];
  }
  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(`ws://127.0.0.1:${PORT}/ws?phong=chua-1`);
      this.ws.on('open', resolve);
      this.ws.on('error', reject);
      this.ws.on('message', (raw) => {
        const msg = JSON.parse(raw.toString());
        for (let i = 0; i < this.waiters.length; i++) {
          const w = this.waiters[i];
          if (w.pred(msg)) {
            this.waiters.splice(i, 1);
            w.resolve(msg);
            return;
          }
        }
        this.msgs.push(msg);
      });
    });
  }
  send(obj) {
    this.ws.send(JSON.stringify(obj));
  }
  waitFor(pred, timeout = 3000) {
    const existing = this.msgs.find(pred);
    if (existing) {
      this.msgs.splice(this.msgs.indexOf(existing), 1);
      return Promise.resolve(existing);
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for message matching ${pred}`));
      }, timeout);
      this.waiters.push({
        pred,
        resolve: (m) => {
          clearTimeout(timer);
          resolve(m);
        }
      });
    });
  }
  close() {
    return new Promise((resolve) => {
      if (!this.ws || this.ws.readyState === WebSocket.CLOSED) return resolve();
      this.ws.once('close', resolve);
      this.ws.close();
    });
  }
}

try {
  await waitForReady();

  // 0. Pure 10-minute VN race schedule boundary checks (10h00 -> 10h10, joinOpen 90s window, warnings at 3p/2p/1p)
  const mkVnMs = (hh, mm, ss = 0) => Date.UTC(2026, 10, 16, hh - 7, mm, ss);
  const s0956 = computeRaceSlot(mkVnMs(9, 56, 59), { intervalMin: 10 });
  assert.equal(s0956.nextLabel, '10h00');
  assert.equal(s0956.warnMin, 0);
  assert.equal(s0956.joinOpen, false);
  assert.equal(computeRaceSlot(mkVnMs(10, 0, 10), { intervalMin: 10 }).joinOpen, true);
  assert.equal(computeRaceSlot(mkVnMs(10, 1, 29), { intervalMin: 10 }).joinOpen, true);
  assert.equal(computeRaceSlot(mkVnMs(10, 1, 31), { intervalMin: 10 }).joinOpen, false);
  const trk = createRaceTracker(mkVnMs(9, 50, 5), { intervalMin: 10 });
  assert.equal(evaluateRaceTick(trk, mkVnMs(9, 56, 59), { intervalMin: 10 }).event, null);
  const t3 = evaluateRaceTick(trk, mkVnMs(9, 57, 0), { intervalMin: 10 });
  assert.equal(t3.event, 'warn');
  assert.equal(t3.minsLeft, 3);
  assert.equal(evaluateRaceTick(trk, mkVnMs(9, 57, 30), { intervalMin: 10 }).event, null);
  const t2 = evaluateRaceTick(trk, mkVnMs(9, 58, 0), { intervalMin: 10 });
  assert.equal(t2.event, 'warn');
  assert.equal(t2.minsLeft, 2);
  const t1 = evaluateRaceTick(trk, mkVnMs(9, 59, 0), { intervalMin: 10 });
  assert.equal(t1.event, 'warn');
  assert.equal(t1.minsLeft, 1);
  const tStart = evaluateRaceTick(trk, mkVnMs(10, 0, 0), { intervalMin: 10 });
  assert.equal(tStart.event, 'start');
  assert.equal(tStart.slot.curLabel, '10h00');
  assert.equal(tStart.slot.nextLabel, '10h10');
  for (let m = 10; m <= 50; m += 10) {
    assert.equal(computeRaceSlot(mkVnMs(10, m, 0), { intervalMin: 10 }).curLabel, `10h${String(m).padStart(2, '0')}`);
  }
  assert.equal(computeRaceSlot(mkVnMs(11, 0, 0), { intervalMin: 10 }).curLabel, '11h00');

  // 1. Check HTTP endpoints + Admin GUI static assets & state API
  const passRes = await fetch(`http://127.0.0.1:${PORT}/api/pass`).then((r) => r.json());
  assert.deepEqual(passRes, { off: true });
  const htmlRes = await fetch(`http://127.0.0.1:${PORT}/`);
  assert.equal(htmlRes.status, 200);
  assert.equal(htmlRes.headers.get('cache-control'), 'no-cache');
  assert.equal((await fetch(`http://127.0.0.1:${PORT}/sw.js`)).status, 404);
  const htmlText = await htmlRes.text();
  assert.ok(htmlText.includes('main-CPNz0KLo.js?v=2026111618'));
  const jsRes = await fetch(`http://127.0.0.1:${PORT}/assets/main-CPNz0KLo.js?v=2026111618`);
  assert.equal(jsRes.status, 200);
  assert.equal(jsRes.headers.get('cache-control'), 'no-cache');
  const jsText = await jsRes.text();
  assert.ok(jsText.includes('freeLook'));
  assert.ok(jsText.includes('RaceSys'));
  assert.ok(jsText.includes('_rtGenMap'));
  assert.ok(jsText.includes('_rtHitLogs'));
  assert.ok(jsText.includes('_rtInPuddle'));
  assert.ok(jsText.includes('duadrift'));
  assert.ok(jsText.includes('keys.has("control")'));
  assert.ok(jsText.includes('race-sched'));
  assert.ok(jsText.includes('spawnAmbient'));
  assert.ok(jsText.includes('sieu_xe_hieu_ung_khoi.glb'));
  assert.ok(jsText.includes('_stepCarVisual'));
  assert.ok(jsText.includes('DtFx'));
  assert.ok(jsText.includes('HmFx'));
  assert.ok(jsText.includes('bach_long_ma.glb'));
  assert.ok(jsText.includes('ton_ngo_khong.glb'));
  assert.ok(jsText.includes('tru_ngo_nang.glb'));
  assert.ok(jsText.includes('sa_ngo_tinh.glb'));
  for (const mdl of ['sieu_xe_hieu_ung_khoi', 'ton_ngo_khong', 'tru_ngo_nang', 'sa_ngo_tinh', 'bach_long_ma']) {
    const glbRes = await fetch(`http://127.0.0.1:${PORT}/models/${mdl}.glb?v=2026111618`);
    assert.equal(glbRes.status, 200);
    const glbBuf = Buffer.from(await glbRes.arrayBuffer());
    assert.equal(glbBuf.toString('utf8', 0, 4), 'glTF');
  }
  const adminHtmlRes = await fetch(`http://127.0.0.1:${PORT}/admin`);
  assert.equal(adminHtmlRes.status, 200);
  const adminHtmlText = await adminHtmlRes.text();
  assert.ok(adminHtmlText.includes('Quản Trị Chùa'));
  assert.ok(adminHtmlText.includes('raceBotCountInput'));
  assert.ok(adminHtmlText.includes('raceMapModeSelect'));
  assert.ok(adminHtmlText.includes('raceIntervalMinInput'));
  assert.equal((await fetch(`http://127.0.0.1:${PORT}/admin/admin.css`)).status, 200);
  assert.equal((await fetch(`http://127.0.0.1:${PORT}/admin/admin.js`)).status, 200);

  const adminInit = await fetch(`http://127.0.0.1:${PORT}/api/admin/state`).then((r) => r.json());
  assert.equal(adminInit.ok, true);
  assert.equal(adminInit.config.linhVatSessionCooldown, true);
  assert.equal(adminInit.config.allowFreeCraneAnytime, true);
  assert.deepEqual(adminInit.config.buffaloRace, { enabled: true, botCount: 5, difficulty: 'trungbinh', mapMode: 'random', laps: 2, autoSchedule: true, intervalMin: 10, ambientBots: true });

  // 2. Connect Player A (brand new cid)
  const cidA = 'test-cid-alpha-001';
  const cA = new TestClient();
  await cA.connect();
  cA.send({ t: 'hello', v: 2, cid: cidA, name: 'Nắng Xanh', kind: 'chu', robe: 'nau', skin: 'sang', beads: 'go', cushion: 'xam', phapkhi: 'none', room: 'chua-1' });

  const welcome = await cA.waitFor((m) => m.t === 'welcome');
  assert.equal(typeof welcome.chores, 'object');
  assert.equal(Array.isArray(welcome.chores), false);
  assert.deepEqual(welcome.chores, { quet: false, den: false, ca: false });
  assert.equal(welcome.saved, null);

  const meritInit = await cA.waitFor((m) => m.t === 'merit');
  assert.equal(meritInit.me.total, 0);
  assert.equal(meritInit.me.today, 0);
  assert.equal(meritInit.me.days, 1);
  assert.equal(meritInit.me.title, '');
  assert.equal(meritInit.me.weekly.length, 9);

  const linhvatInit = await cA.waitFor((m) => m.t === 'linhvat');
  assert.equal(linhvatInit.trau.s, 0);
  assert.equal(linhvatInit.hac.s, 0);
  assert.equal(linhvatInit.rua.s, 0);
  assert.deepEqual(linhvatInit.hac.fly, ['tudo']);
  assert.deepEqual(linhvatInit.race, { enabled: true, botCount: 5, difficulty: 'trungbinh', mapMode: 'random', laps: 2, autoSchedule: true, intervalMin: 10, ambientBots: true });
  assert.equal(linhvatInit.raceSched.intervalMin, 10);
  assert.equal(linhvatInit.raceSched.autoSchedule, true);

  // 3. Verify garden, quiz, quiz-practice, so-sen, duyen
  cA.send({ t: 'garden' });
  const garden = await cA.waitFor((m) => m.t === 'garden');
  assert.ok(Array.isArray(garden.beds));

  cA.send({ t: 'quiz' });
  const quiz = await cA.waitFor((m) => m.t === 'quiz');
  assert.equal(quiz.phase, 'off');
  assert.ok(Number.isFinite(quiz.left) && quiz.left > 0);
  assert.ok(Number.isFinite(quiz.upcoming));

  cA.send({ t: 'quiz-practice' });
  const prac = await cA.waitFor((m) => m.t === 'quiz-practice');
  assert.equal(prac.qs.length, 5);
  assert.ok(typeof prac.qs[0].text === 'string' && Array.isArray(prac.qs[0].opts) && Number.isInteger(prac.qs[0].right));

  cA.send({ t: 'so-sen' });
  const sosen = await cA.waitFor((m) => m.t === 'so-sen');
  assert.ok(Number.isInteger(sosen.today) && Array.isArray(sosen.days) && sosen.days.includes(sosen.today));

  cA.send({ t: 'duyen' });
  const duyen = await cA.waitFor((m) => m.t === 'duyen');
  assert.ok(duyen.v && Array.isArray(duyen.v.in));

  // 4. Verify Journal starts with 0 merit/stats and ONLY 1/17 unlocked titles
  cA.send({ t: 'journal' });
  const j1 = await cA.waitFor((m) => m.t === 'journal');
  assert.equal(j1.j.merit, 0);
  assert.equal(j1.j.bows, 0);
  assert.equal(j1.j.incense, 0);
  assert.equal(j1.j.title, 'nguoi_moi');
  const gotTitles1 = j1.j.titles.filter((t) => t.got).map((t) => t.id);
  assert.deepEqual(gotTitles1, ['nguoi_moi']);

  // 5. Try to equip locked title 'tram_lay' -> MUST be rejected
  cA.send({ t: 'title', id: 'tram_lay' });
  const jReject = await cA.waitFor((m) => m.t === 'journal');
  assert.equal(jReject.j.title, 'nguoi_moi');

  // 6. Walking state s=1 must NOT increment bows
  cA.send({ t: 'state', x: 1, y: 0, z: 2, ry: 0, s: 1 });
  cA.send({ t: 'journal' });
  const jWalk = await cA.waitFor((m) => m.t === 'journal');
  assert.equal(jWalk.j.bows, 0);

  // 6b. Test linhvat session cooldown (default ON) + Admin reset & toggle
  const trauSlot = adminInit.meta.linhVatSlotsNow.trau;
  if (trauSlot >= 0) {
    cA.send({ t: 'lv-buoc', k: 'trau', step: 0 });
    const lvStep = await cA.waitFor((m) => m.t === 'lv-buoc');
    assert.equal(lvStep.k, 'trau');
    assert.equal(lvStep.step, 1);
    const linhvatAfter = await cA.waitFor((m) => m.t === 'linhvat');
    assert.equal(linhvatAfter.trau.s, 1);
    assert.equal(linhvatAfter.trau.today, true);
    assert.equal(linhvatAfter.trau.w, trauSlot);
    await cA.waitFor((m) => m.t === 'merit' && m.gain?.n === 10);

    // Second step in same morning/afternoon session must be blocked
    cA.send({ t: 'lv-buoc', k: 'trau', step: 1 });
    const blockedLv = await cA.waitFor((m) => m.t === 'linhvat');
    assert.equal(blockedLv.trau.s, 1);
    await cA.waitFor((m) => m.t === 'notice');
  } else {
    // Nighttime out-of-hours must block while cooldown ON, then succeed when Admin disables cooldown
    cA.send({ t: 'lv-buoc', k: 'trau', step: 0 });
    const blockedLv = await cA.waitFor((m) => m.t === 'linhvat');
    assert.equal(blockedLv.trau.s, 0);
    await cA.waitFor((m) => m.t === 'notice');

    await fetch(`http://127.0.0.1:${PORT}/api/admin/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: { linhVatSessionCooldown: false } })
    }).then((r) => r.json());

    cA.send({ t: 'lv-buoc', k: 'trau', step: 0 });
    const lvStep = await cA.waitFor((m) => m.t === 'lv-buoc');
    assert.equal(lvStep.step, 1);
    await cA.waitFor((m) => m.t === 'merit' && m.gain?.n === 10);

    await fetch(`http://127.0.0.1:${PORT}/api/admin/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: { linhVatSessionCooldown: true } })
    }).then((r) => r.json());
  }

  // Test Admin player update: Hạc step 4 -> fly includes ['dua', 'tudo'] when allowFreeCraneAnytime ON
  await fetch(`http://127.0.0.1:${PORT}/api/admin/player/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cid: cidA, patch: { lvHac: { s: 4 } } })
  });
  const hacFlyPush = await cA.waitFor((m) => m.t === 'linhvat' && m.hac?.s === 4);
  assert.deepEqual(hacFlyPush.hac.fly, ['dua', 'tudo']);
  assert.equal(hacFlyPush.hac.intro, true);

  // Also test lv-bay (k: 'tudo') + state y + lv-xuong broadcast with a second observer client
  const cObs = new TestClient();
  await cObs.connect();
  cObs.send({ t: 'hello', v: 2, cid: 'test-cid-obs-hac', name: 'Quan Sát', room: 'chua-1' });
  await cObs.waitFor((m) => m.t === 'welcome');
  cA.send({ t: 'lv-bay', k: 'tudo' });
  const bayMsg = await cObs.waitFor((m) => m.t === 'lv-bay' && m.on === 1);
  assert.equal(bayMsg.on, 1);
  cA.send({ t: 'state', x: 5, y: 18.5, z: 20, ry: 0.5, s: 0 });
  const flyState = await cObs.waitFor((m) => m.t === 'state' && m.y === 18.5);
  assert.equal(flyState.y, 18.5);
  cA.send({ t: 'lv-xuong' });
  const xuongMsg = await cObs.waitFor((m) => m.t === 'lv-bay' && m.on === 0);
  assert.equal(xuongMsg.on, 0);
  await cObs.close();

  // 7. Light yard incense (san-incense) -> +5 công đức, quest huong ready & claimable (+10)
  cA.send({ t: 'san-incense' });
  const meritInc = await cA.waitFor((m) => m.t === 'merit' && m.gain);
  assert.equal(meritInc.me.total, 15);
  assert.equal(meritInc.gain.n, 5);
  assert.equal(meritInc.me.quests.find((q) => q.id === 'huong').have, 1);

  cA.send({ t: 'claim', q: 'huong' });
  const meritClaim = await cA.waitFor((m) => m.t === 'merit' && m.gain);
  assert.equal(meritClaim.me.total, 25);
  assert.equal(meritClaim.gain.n, 10);
  assert.equal(meritClaim.me.quests.find((q) => q.id === 'huong').claimed, true);

  // 8. Bow 108 times -> unlocks 'tram_lay' and allows equipping it
  for (let i = 0; i < 108; i++) {
    cA.send({ t: 'emote', e: 'lay' });
  }
  await cA.waitFor((m) => m.t === 'ann' && m.k === 'title');
  cA.send({ t: 'title', id: 'tram_lay' });
  const jEquipped = await cA.waitFor((m) => m.t === 'journal' && m.j.title === 'tram_lay');
  assert.equal(jEquipped.j.bows, 108);
  assert.equal(jEquipped.j.titles.find((t) => t.id === 'tram_lay').got, true);

  // 9. Register account and test login returns cidA
  cA.send({ t: 'register', user: 'nangxanh', pass: 'secret123' });
  await cA.waitFor((m) => m.t === 'journal' && m.j.user === 'nangxanh');

  // 10. Disconnect Player A, verify Player B has fresh 0 stats, then reconnect Player A & verify persistence
  await cA.close();

  const cidB = 'test-cid-beta-002';
  const cB = new TestClient();
  await cB.connect();
  cB.send({ t: 'hello', v: 2, cid: cidB, name: 'Khách Mới', room: 'chua-1' });
  await cB.waitFor((m) => m.t === 'welcome');
  const mB = await cB.waitFor((m) => m.t === 'merit');
  assert.equal(mB.me.total, 0);
  cB.send({ t: 'journal' });
  const jB = await cB.waitFor((m) => m.t === 'journal');
  assert.deepEqual(jB.j.titles.filter((t) => t.got).map((t) => t.id), ['nguoi_moi']);

  cB.send({ t: 'login', user: 'nangxanh', pass: 'secret123' });
  const loginOk = await cB.waitFor((m) => m.t === 'login-ok');
  assert.equal(loginOk.cid, cidA);
  await cB.close();

  const cA2 = new TestClient();
  await cA2.connect();
  cA2.send({ t: 'hello', v: 2, cid: cidA, room: 'chua-1' });
  const w2 = await cA2.waitFor((m) => m.t === 'welcome');
  assert.equal(w2.saved.name, 'Nắng Xanh');
  assert.equal(w2.user, 'nangxanh');
  const m2 = await cA2.waitFor((m) => m.t === 'merit');
  assert.equal(m2.me.total, 241); // 10 + 15 + 108*2 = 241
  assert.equal(m2.me.title, 'Trăm lạy');
  assert.equal(m2.me.level, 'Phát tâm');
  assert.equal(m2.me.weekly.length, 9);
  cA2.send({ t: 'journal' });
  const jA2 = await cA2.waitFor((m) => m.t === 'journal');
  assert.equal(jA2.j.title, 'tram_lay');
  assert.equal(jA2.j.bows, 108);

  // 11. Admin API: world pinned + donor broadcast, reward config + festival le claim, live quiz start & answer
  await fetch(`http://127.0.0.1:${PORT}/api/admin/world`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room: 'chua-1', action: 'set-pinned', text: 'Thông báo test Admin' })
  });
  const pinnedMsg = await cA2.waitFor((m) => m.t === 'pinned');
  assert.equal(pinnedMsg.text, 'Thông báo test Admin');

  await fetch(`http://127.0.0.1:${PORT}/api/admin/world`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room: 'chua-1', action: 'add-donor', name: 'Thí chủ Thiện Tâm' })
  });
  const donorsMsg = await cA2.waitFor((m) => m.t === 'donors');
  assert.equal(donorsMsg.list[0].name, 'Thí chủ Thiện Tâm');

  // Enable festival 'ram' with 1 incense step + test claim-le
  await fetch(`http://127.0.0.1:${PORT}/api/admin/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      config: {
        festival: {
          enabled: true,
          id: 'ram',
          banner: 'Lễ Rằm Test',
          keep: 'Hoa đăng Rằm',
          prize: 'Quà Rằm',
          reward: 40,
          lunar: { day: 15, month: 10 },
          steps: [{ kind: 'incense', label: 'Thắp 1 hương', need: 1 }]
        }
      },
      syncToPlayers: true
    })
  });
  const festPush = await cA2.waitFor((m) => m.t === 'merit' && m.me?.le?.id === 'ram');
  assert.equal(festPush.me.le.lunar.day, 15);
  cA2.send({ t: 'incense' });
  const festProg = await cA2.waitFor((m) => m.t === 'merit' && m.gain && m.me?.le?.steps?.[0]?.have === 1);
  assert.equal(festProg.me.le.steps[0].have, 1);
  cA2.send({ t: 'claim-le' });
  const leDone = await cA2.waitFor((m) => m.t === 'le-done');
  assert.equal(leDone.keep, 'Hoa đăng Rằm');
  const meritAfterLe = await cA2.waitFor((m) => m.t === 'merit' && m.me?.total === 286);
  assert.equal(meritAfterLe.me.total, 286);

  // Test unlocking all 17 titles via Admin API -> pushes journal & hanhtrinh live with 17/17 unlocked
  const all17Ids = adminInit.meta.titles.map((t) => t.id);
  assert.equal(all17Ids.length, 17);
  await fetch(`http://127.0.0.1:${PORT}/api/admin/player/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cid: cidA, patch: { unlockedTitles: all17Ids, title: 'nguyen_lanh' } })
  });
  const jAll17 = await cA2.waitFor((m) => m.t === 'journal' && m.j?.titles?.filter((t) => t.got).length === 17);
  assert.equal(jAll17.j.title, 'nguyen_lanh');
  const htAll17 = await cA2.waitFor((m) => m.t === 'hanhtrinh' && m.titles?.filter((t) => t.got).length === 17);
  assert.equal(htAll17.titles.filter((t) => t.got).length, 17);

  // Live Quiz API test
  await fetch(`http://127.0.0.1:${PORT}/api/admin/quiz`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'start', count: 2, askSec: 15, showSec: 5, waitSec: 2 })
  });
  const quizWait = await cA2.waitFor((m) => m.t === 'quiz' && m.phase === 'wait');
  assert.equal(quizWait.n, 2);
  await fetch(`http://127.0.0.1:${PORT}/api/admin/quiz`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'next' })
  });
  const quizAsk = await cA2.waitFor((m) => m.t === 'quiz' && m.phase === 'ask');
  cA2.send({ t: 'quiz-ans', i: quizAsk.i, c: 0 });
  const quizGot = await cA2.waitFor((m) => m.t === 'quiz-got');
  assert.equal(quizGot.c, 0);
  await fetch(`http://127.0.0.1:${PORT}/api/admin/quiz`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'stop' })
  });

  // 12. Admin buffaloRace configuration, 3p/2p/1p & start schedule broadcasts, + duatrau-done finish merit check
  const raceCfgRes = await fetch(`http://127.0.0.1:${PORT}/api/admin/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config: { buffaloRace: { enabled: true, botCount: 8, difficulty: 'cuckho', mapMode: 'extreme', laps: 3, autoSchedule: true, intervalMin: 10, ambientBots: true } } })
  }).then((r) => r.json());
  assert.equal(raceCfgRes.ok, true);
  assert.deepEqual(raceCfgRes.state.config.buffaloRace, { enabled: true, botCount: 8, difficulty: 'cuckho', mapMode: 'extreme', laps: 3, autoSchedule: true, intervalMin: 10, ambientBots: true });
  const raceLvPush = await cA2.waitFor((m) => m.t === 'linhvat' && m.race?.difficulty === 'cuckho');
  assert.equal(raceLvPush.race.botCount, 8);
  assert.equal(raceLvPush.race.mapMode, 'extreme');
  assert.equal(raceLvPush.race.laps, 3);
  assert.equal(raceLvPush.raceSched.intervalMin, 10);

  for (const mLeft of [3, 2, 1]) {
    await fetch(`http://127.0.0.1:${PORT}/api/admin/world`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room: 'all', action: 'trigger-race-warn', minsLeft: mLeft })
    });
    const warnSched = await cA2.waitFor((m) => m.t === 'race-sched' && m.phase === 'warn' && m.minsLeft === mLeft);
    assert.equal(warnSched.intervalMin, 10);
    const warnAnn = await cA2.waitFor((m) => m.t === 'ann' && m.text?.includes(`sau ${mLeft} phút`));
    assert.ok(warnAnn.text.includes('Cuộc đua trâu'));
  }
  await fetch(`http://127.0.0.1:${PORT}/api/admin/world`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room: 'all', action: 'trigger-race-now' })
  });
  const startSched = await cA2.waitFor((m) => m.t === 'race-sched' && m.phase === 'start');
  assert.ok(startSched.seed >= 1000);
  assert.equal(startSched.joinOpen, true);
  const startAnn = await cA2.waitFor((m) => m.t === 'ann' && m.text?.includes('đã chính thức bắt đầu'));
  assert.ok(startAnn.text.includes('Giải đua trâu'));

  cA2.send({ t: 'emote', e: 'dt-7' });
  const dtOnBcast = await cA2.waitFor((m) => m.t === 'emote' && m.e === 'dt-7');
  assert.equal(dtOnBcast.e, 'dt-7');
  cA2.send({ t: 'emote', e: 'ma-1' });
  const maOnBcast = await cA2.waitFor((m) => m.t === 'emote' && m.e === 'ma-1');
  assert.equal(maOnBcast.e, 'ma-1');

  const cidRace = 'test-cid-race-001';
  const cRace = new TestClient();
  await cRace.connect();
  cRace.send({ t: 'hello', v: 2, cid: cidRace, name: 'Đua Trâu', room: 'chua-1' });
  const raceWelcome = await cRace.waitFor((m) => m.t === 'welcome');
  const peerAView = raceWelcome.peers.find((p) => p.pid === welcome.pid);
  assert.equal(peerAView?.dt, 7);
  assert.equal(peerAView?.ma, 1);
  cA2.send({ t: 'emote', e: 'dt-0' });
  const dtOffBcast = await cRace.waitFor((m) => m.t === 'emote' && m.e === 'dt-0');
  assert.equal(dtOffBcast.e, 'dt-0');
  cA2.send({ t: 'emote', e: 'ma-0' });
  const maOffBcast = await cRace.waitFor((m) => m.t === 'emote' && m.e === 'ma-0');
  assert.equal(maOffBcast.e, 'ma-0');
  await cRace.waitFor((m) => m.t === 'merit');
  const raceLvInit = await cRace.waitFor((m) => m.t === 'linhvat');
  assert.equal(raceLvInit.race.botCount, 8);
  assert.equal(raceLvInit.race.mapMode, 'extreme');
  cRace.send({ t: 'duatrau-done', rank: 1, total: 9, diff: 'cuckho', sec: 68.5 });
  const raceMerit = await cRace.waitFor((m) => m.t === 'merit' && m.gain?.n === 45);
  assert.equal(raceMerit.me.total, 45);
  const raceAnn = await cA2.waitFor((m) => m.t === 'ann' && m.text?.includes('Đua Trâu') && m.text?.includes('về Nhất'));
  assert.ok(raceAnn.text.includes('Cực Khó'));
  await cRace.close();

  await cA2.close();
  await new Promise((r) => setTimeout(r, 250));

  // Shutdown & verify disk persistence file written
  proc.kill('SIGTERM');
  await new Promise((r) => proc.once('exit', r));

  const savedDisk = JSON.parse(fs.readFileSync(PLAYERS_FILE, 'utf8'));
  assert.equal(savedDisk.characters[cidA].merit, 286); // 241 + 5 incense + 40 le reward
  assert.equal(savedDisk.characters[cidA].title, 'nguyen_lanh');
  assert.equal(savedDisk.characters[cidA].unlockedTitles.length, 17);
  assert.equal(savedDisk.characters[cidB].merit, 0);
  assert.equal(savedDisk.characters[cidRace].merit, 45);
  assert.equal(savedDisk.accounts['nangxanh'], cidA);
  assert.equal(fs.existsSync(CONFIG_FILE), true);
  const savedCfg = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  assert.deepEqual(savedCfg.buffaloRace, { enabled: true, botCount: 8, difficulty: 'cuckho', mapMode: 'extreme', laps: 3, autoSchedule: true, intervalMin: 10, ambientBots: true });

  console.log('ALL E2E ASSERTIONS PASSED!');
} finally {
  if (proc.exitCode === null && proc.signalCode === null) {
    proc.kill('SIGTERM');
    await Promise.race([
      new Promise((r) => proc.once('exit', r)),
      new Promise((r) => setTimeout(r, 1500))
    ]);
  }
  // Restore pre-test state cleanly
  if (backupPlayers !== null) fs.writeFileSync(PLAYERS_FILE, backupPlayers);
  else if (fs.existsSync(PLAYERS_FILE)) fs.unlinkSync(PLAYERS_FILE);
  if (backupWorld !== null) fs.writeFileSync(WORLD_FILE, backupWorld);
  else if (fs.existsSync(WORLD_FILE)) fs.unlinkSync(WORLD_FILE);
  if (backupConfig !== null) fs.writeFileSync(CONFIG_FILE, backupConfig);
  else if (fs.existsSync(CONFIG_FILE)) fs.unlinkSync(CONFIG_FILE);
}
