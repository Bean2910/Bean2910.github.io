const DEFAULT_TZ_OFFSET_MS = 7 * 3600 * 1000;
const RACE_MAP_KINDS = ['easy', 'medium', 'complex', 'extreme'];
export const RACE_JOIN_WINDOW_SEC = 90;

export function fmtVnRaceClock(utcMs, tzOffsetMs = DEFAULT_TZ_OFFSET_MS) {
  const d = new Date(utcMs + tzOffsetMs);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${hh}h${mm}`;
}

export function getSlotSeed(slotIdx) {
  return (Math.imul((slotIdx | 0) ^ 0x9e3779b9, 2654435761) >>> 0) % 8999 + 1000;
}

export function getSlotMapKind(slotIdx, mapMode = 'random') {
  if (RACE_MAP_KINDS.includes(mapMode)) return mapMode;
  return RACE_MAP_KINDS[((slotIdx % 4) + 4) % 4];
}

export function computeRaceSlot(nowMs = Date.now(), rc = {}, tzOffsetMs = DEFAULT_TZ_OFFSET_MS, manualOpenUntil = 0) {
  const intervalMin = Math.max(1, Math.min(60, Math.round(Number(rc.intervalMin) || 10)));
  const intervalMs = intervalMin * 60000;
  const curSlot = Math.floor((nowMs + tzOffsetMs) / intervalMs);
  const curStartAt = curSlot * intervalMs - tzOffsetMs;
  const nextSlot = curSlot + 1;
  const nextAt = nextSlot * intervalMs - tzOffsetMs;
  const remMs = Math.max(0, nextAt - nowMs);
  const remSec = Math.ceil(remMs / 1000);
  const sinceStartSec = Math.max(0, Math.floor((nowMs - curStartAt) / 1000));
  const joinOpen = (rc.autoSchedule === false) || (sinceStartSec < RACE_JOIN_WINDOW_SEC) || (nowMs < manualOpenUntil);
  const warnMin = remSec > 0 && remSec <= 60 ? 1 : remSec <= 120 ? 2 : remSec <= 180 ? 3 : 0;

  return {
    enabled: rc.enabled !== false,
    autoSchedule: rc.autoSchedule !== false,
    ambientBots: rc.ambientBots !== false,
    intervalMin,
    joinWindowSec: RACE_JOIN_WINDOW_SEC,
    manualOpenUntil,
    joinOpen,
    sinceStartSec,
    curSlot,
    curStartAt,
    curLabel: fmtVnRaceClock(curStartAt, tzOffsetMs),
    nextSlot,
    nextAt,
    nextLabel: fmtVnRaceClock(nextAt, tzOffsetMs),
    remSec,
    warnMin,
    now: nowMs,
    seed: getSlotSeed(curSlot),
    nextSeed: getSlotSeed(nextSlot),
    mapKind: getSlotMapKind(curSlot, rc.mapMode),
    nextMapKind: getSlotMapKind(nextSlot, rc.mapMode),
    botCount: Number.isFinite(Number(rc.botCount)) ? Math.max(0, Math.min(16, Math.round(Number(rc.botCount)))) : 5,
    difficulty: rc.difficulty || 'trungbinh',
    laps: Math.max(1, Math.min(5, Math.round(Number(rc.laps) || 2)))
  };
}

export function createRaceTracker(nowMs = Date.now(), rc = {}, tzOffsetMs = DEFAULT_TZ_OFFSET_MS) {
  const s = computeRaceSlot(nowMs, rc, tzOffsetMs);
  return {
    lastStartedSlot: s.curSlot,
    lastWarnSlot: -1,
    lastWarnMin: 0
  };
}

export function evaluateRaceTick(tracker, nowMs = Date.now(), rc = {}, tzOffsetMs = DEFAULT_TZ_OFFSET_MS) {
  const slot = computeRaceSlot(nowMs, rc, tzOffsetMs);
  if (!slot.enabled || !slot.autoSchedule) {
    return { event: null, minsLeft: 0, slot };
  }
  if (slot.curSlot > tracker.lastStartedSlot) {
    tracker.lastStartedSlot = slot.curSlot;
    tracker.lastWarnSlot = -1;
    tracker.lastWarnMin = 0;
    return { event: 'start', minsLeft: 0, slot };
  }
  if (slot.warnMin > 0 && (tracker.lastWarnSlot !== slot.nextSlot || slot.warnMin < tracker.lastWarnMin)) {
    tracker.lastWarnSlot = slot.nextSlot;
    tracker.lastWarnMin = slot.warnMin;
    return { event: 'warn', minsLeft: slot.warnMin, slot };
  }
  return { event: null, minsLeft: 0, slot };
}
