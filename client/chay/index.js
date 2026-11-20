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

export const VEG_CENTER = { x: 39, z: 70 };
export const VEG_BOUNDS = { x0: 28.5, x1: 50, z0: 59.5, z1: 80.5 };
const SOLO_STORE_KEY = 'anduyen.veg.solo.v1';

function fmtCountdown(sec) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) return `${h}g ${String(m).padStart(2, '0')}p ${String(ss).padStart(2, '0')}s`;
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[ch]));
}

export const VegFx = (() => {
  let ctx = null;
  let root = null;
  let hitMeshes = [];
  let lanternGlowMats = [];
  let emberMats = [];
  let steamPoints = null;
  let steamSeeds = [];
  let steamMat = null;
  let eatBursts = [];
  let burstGeo = null;

  let pillEl = null;
  let modalEl = null;
  let isModalOpen = false;
  let selectedDishId = VEG_MENU[0].id;
  let lastEatAt = -2000;
  let lastSyncReqAt = 0;
  let lastUiSec = -1;
  let announcedSlotKey = '';

  let srvState = null;
  let srvFetchedAt = 0;

  function _readSoloStore() {
    try {
      const raw = JSON.parse(localStorage.getItem(SOLO_STORE_KEY) || 'null');
      return raw && typeof raw === 'object' ? raw : {};
    } catch {
      return {};
    }
  }

  function _writeSoloStore(obj) {
    try {
      localStorage.setItem(SOLO_STORE_KEY, JSON.stringify(obj));
    } catch {}
  }

  function _computeSoloState() {
    const vnHr = typeof ctx?.getVnHour === 'function' ? Number(ctx.getVnHour()) : 12;
    const hr = ((Number.isFinite(vnHr) ? vnHr : 12) % 24 + 24) % 24;
    const hours = [12, 18];
    const durMin = 60;
    const durHr = durMin / 60;
    let activeHour = null;
    for (const h of hours) {
      if (hr >= h && hr < h + durHr) {
        activeHour = h;
        break;
      }
    }
    const isOpen = activeHour !== null;
    const now = new Date(Date.now() + 7 * 3600 * 1000);
    const dayKey = now.toISOString().slice(0, 10);
    const label = isOpen ? `Tiệc Chay ${String(activeHour).padStart(2, '0')}h00` : '';
    const slotKey = isOpen ? `${dayKey}-${String(activeHour).padStart(2, '0')}h00` : '';
    let remSec = 0;
    if (isOpen) {
      remSec = Math.max(1, Math.round((activeHour + durHr - hr) * 3600));
    }
    let bestDeltaHr = 24;
    let nextLabel = '12h00';
    for (const h of hours) {
      const delta = hr < h ? h - hr : 24 - hr + h;
      if (delta < bestDeltaHr) {
        bestDeltaHr = delta;
        nextLabel = `${String(h).padStart(2, '0')}h00`;
      }
    }
    const nextInSec = Math.max(0, Math.round(bestDeltaHr * 3600));

    const saved = _readSoloStore();
    const eatenIds = isOpen && saved.slotKey === slotKey && Array.isArray(saved.eatenIds)
      ? saved.eatenIds
      : [];

    return {
      enabled: true,
      hours,
      hoursText: '12h00 & 18h00',
      durationMin: durMin,
      maxDishesPerSlot: 3,
      isOpen,
      reason: isOpen ? 'scheduled' : 'closed',
      slotKey,
      activeLabel: label,
      remSec,
      nextLabel,
      nextInSec,
      meritPerDish: 15,
      tasteMerit: 3,
      eatenIds,
      eatenCount: eatenIds.length,
      remainingMeritSlots: isOpen ? Math.max(0, 3 - eatenIds.length) : 0,
      tastedToday: saved.tastedDay === dayKey,
      totalMeals: Number(saved.totalMeals) || 0
    };
  }

  function getLiveState() {
    if (ctx?.isServerConnected?.() && srvState) {
      const elapsedSec = Math.max(0, Math.floor((performance.now() - srvFetchedAt) / 1000));
      const remSec = srvState.isOpen ? Math.max(0, (srvState.remSec || 0) - elapsedSec) : 0;
      const nextInSec = !srvState.isOpen ? Math.max(0, (srvState.nextInSec || 0) - elapsedSec) : 0;
      return {
        ...srvState,
        remSec,
        nextInSec
      };
    }
    return _computeSoloState();
  }

  function isFeastOpen() {
    return Boolean(getLiveState()?.isOpen);
  }

  function isInZone(pos) {
    if (!pos) return false;
    return pos.x >= VEG_BOUNDS.x0 && pos.x <= VEG_BOUNDS.x1 && pos.z >= VEG_BOUNDS.z0 && pos.z <= VEG_BOUNDS.z1;
  }

  function _playVegChime(pos) {
    try {
      ctx?.ensureAudio?.();
      const audio = ctx?.getAudio?.();
      const actx = audio?.ctx;
      const out = audio?.master;
      if (!actx || !out) return;

      let gMul = ctx?.getSoundEnabled?.() ? ctx.getSoundVolume?.() ?? 0.6 : 0;
      if (gMul <= 0.01) return;

      const mePos = ctx?.getPlayerPos?.();
      const sp = ctx?.isSpatialAudio?.() !== false;
      let pan = 0;
      if (sp && mePos && pos) {
        const d = Math.hypot(mePos.x - pos.x, mePos.z - pos.z);
        if (d > 48) return;
        const att = d <= 6 ? 1 : Math.max(0.06, 1 - (d - 6) / 42);
        gMul *= att;
        const cam = ctx?.getCamera?.();
        if (cam?.matrixWorldInverse) {
          const dx = pos.x - mePos.x;
          const dz = pos.z - mePos.z;
          const len = Math.hypot(dx, dz);
          if (len > 0.6) {
            const m = cam.matrixWorldInverse.elements;
            const dot = (dx * m[0] + dz * m[8]) / len;
            pan = Math.max(-0.85, Math.min(0.85, dot));
          }
        }
      }

      const now = actx.currentTime;
      const dest = pan !== 0 && typeof audio.voice === 'function' ? audio.voice(pan, 1) : out;
      const notes = [528, 660, 792];
      notes.forEach((freq, idx) => {
        const osc = actx.createOscillator();
        const g = actx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t0 = now + idx * 0.09;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(0.14 * gMul, t0 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.65);
        osc.connect(g).connect(dest);
        osc.start(t0);
        osc.stop(t0 + 0.68);
      });
    } catch {}
  }

  function _spawnEatBurst(worldPos, playChime = true) {
    if (!ctx || !root || !worldPos) return;
    const { Points, BufferGeometry, Float32BufferAttribute, PointsMaterial, AdditiveBlending } = ctx.THREE;
    if (!burstGeo) {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 64;
      const g = cv.getContext('2d');
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255,244,196,1)');
      grad.addColorStop(0.5, 'rgba(244,190,92,0.65)');
      grad.addColorStop(1, 'rgba(244,190,92,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
      burstGeo = new ctx.THREE.CanvasTexture(cv);
    }
    const count = 14;
    const arr = new Float32Array(count * 3);
    const vels = [];
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const r = 0.25 + Math.random() * 0.35;
      arr[i * 3] = worldPos.x + Math.cos(ang) * r;
      arr[i * 3 + 1] = (worldPos.y || 0) + 1.05 + Math.random() * 0.25;
      arr[i * 3 + 2] = worldPos.z + Math.sin(ang) * r;
      vels.push({
        vx: Math.cos(ang) * (0.35 + Math.random() * 0.35),
        vy: 0.9 + Math.random() * 0.85,
        vz: Math.sin(ang) * (0.35 + Math.random() * 0.35)
      });
    }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(arr, 3));
    const mat = new PointsMaterial({
      size: 0.36,
      map: burstGeo,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: AdditiveBlending
    });
    const pts = new Points(geo, mat);
    pts.frustumCulled = false;
    root.add(pts);
    eatBursts.push({ pts, geo, mat, vels, life: 0, maxLife: 1.5 });
    if (playChime) _playVegChime(worldPos);
  }

  function _build3DWorld() {
    const {
      Group, Mesh, BoxGeometry, CylinderGeometry, SphereGeometry, ConeGeometry, TorusGeometry,
      MeshStandardMaterial, MeshBasicMaterial, CanvasTexture, SRGBColorSpace, Points, BufferGeometry,
      Float32BufferAttribute, PointsMaterial, AdditiveBlending
    } = ctx.THREE;
    const { materials: C, makePillar: pi, makeRoof: Ln, makeSign: Di, colliderBox: Se, colliderCircle: Tn } = ctx;

    root = new Group();
    root.name = 'VegDiningArea';
    ctx.scene.add(root);

    const cx = VEG_CENTER.x;
    const cz = VEG_CENTER.z;

    const mMat = (hex, opts = {}) => new MeshStandardMaterial({ color: hex, roughness: 0.82, ...opts });
    const terracottaMat = mMat('#9c563a', { roughness: 0.9 });
    const warmStoneMat = mMat('#cbbba2', { roughness: 0.92 });
    const bambooMat = C.bamboo ? C.bamboo() : mMat('#798c4d');
    const woodMat = C.timber ? C.timber() : mMat('#6a452a');
    const darkWoodMat = mMat('#4c301c', { roughness: 0.88 });
    const ceramicWhiteMat = mMat('#f4efe4', { roughness: 0.38 });
    const ceramicCeladonMat = mMat('#8fb89d', { roughness: 0.35 });
    const copperMat = mMat('#c77e3a', { roughness: 0.38, metalness: 0.45 });
    const brothRedMat = mMat('#d95b26', { roughness: 0.28 });
    const brothGoldMat = mMat('#e2b144', { roughness: 0.28 });
    const leafMat = mMat('#4c8c3e', { roughness: 0.78 });
    const tofuMat = mMat('#f3df9e', { roughness: 0.65 });
    const riceMat = mMat('#fbf8ef', { roughness: 0.75 });
    const pastryPinkMat = mMat('#f4b4be', { roughness: 0.78 });
    const pastryJadeMat = mMat('#93cf8d', { roughness: 0.78 });
    const pastryGoldMat = mMat('#f0c869', { roughness: 0.78 });
    const fryGoldMat = mMat('#d98d2b', { roughness: 0.68 });
    const bambooTrayMat = mMat('#c9a66b', { roughness: 0.76 });

    function addPart(geo, mat, px, py, pz, rx = 0, ry = 0, rz = 0, shadow = true) {
      const m = new Mesh(geo, mat);
      m.position.set(px, py, pz);
      if (rx) m.rotation.x = rx;
      if (ry) m.rotation.y = ry;
      if (rz) m.rotation.z = rz;
      if (shadow) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
      root.add(m);
      return m;
    }

    // 1. Symmetrical stone courtyard floor (18.2 x 19.0 around (39, 70)) + terracotta patio + centered approach
    const baseStone = new Mesh(new BoxGeometry(18.2, 0.14, 19.0), warmStoneMat);
    baseStone.position.set(cx, 0.07, cz);
    baseStone.receiveShadow = true;
    root.add(baseStone);
    ctx.floorMeshes?.push(baseStone);

    const patioFloor = new Mesh(new BoxGeometry(16.8, 0.04, 17.6), terracottaMat);
    patioFloor.position.set(cx, 0.15, cz);
    patioFloor.receiveShadow = true;
    root.add(patioFloor);
    ctx.floorMeshes?.push(patioFloor);

    // Centered entrance welcome pad + stepping stones from San chua corner leading squarely to gate z = 70
    const padDoor = new Mesh(new BoxGeometry(1.7, 0.08, 3.0), C.blueStone());
    padDoor.position.set(cx - 9.4, 0.04, cz);
    padDoor.receiveShadow = true;
    root.add(padDoor);
    ctx.floorMeshes?.push(padDoor);

    const stepCoords = [
      [23.8, 59.5],
      [25.1, 61.8],
      [26.3, 64.4],
      [27.4, 67.2],
      [28.4, 69.8]
    ];
    for (const [sx, sz] of stepCoords) {
      const pad = new Mesh(new CylinderGeometry(0.62, 0.68, 0.07, 10), C.blueStone());
      pad.position.set(sx, 0.035, sz);
      pad.receiveShadow = true;
      root.add(pad);
      ctx.floorMeshes?.push(pad);
    }

    // Low decorative bamboo perimeter rails along courtyard edges with wide centered West gate opening
    const addRail = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const midX = (x0 + x1) / 2;
      const midZ = (z0 + z1) / 2;
      const ang = -Math.atan2(z1 - z0, x1 - x0);
      const bar = new Mesh(new BoxGeometry(len, 0.1, 0.1), bambooMat);
      bar.position.set(midX, 0.56, midZ);
      bar.rotation.y = ang;
      bar.castShadow = true;
      root.add(bar);
      const lowBar = new Mesh(new BoxGeometry(len, 0.08, 0.08), bambooMat);
      lowBar.position.set(midX, 0.3, midZ);
      lowBar.rotation.y = ang;
      root.add(lowBar);
      const posts = Math.max(2, Math.round(len / 2.2) + 1);
      for (let i = 0; i < posts; i++) {
        const t = i / (posts - 1);
        const px = x0 + (x1 - x0) * t;
        const pz = z0 + (z1 - z0) * t;
        addPart(new CylinderGeometry(0.06, 0.07, 0.72, 8), darkWoodMat, px, 0.36, pz);
      }
      Se?.(midX, midZ, Math.abs(x1 - x0) || 0.35, Math.abs(z1 - z0) || 0.35);
    };
    const rX0 = cx - 8.8;
    const rX1 = cx + 8.8;
    const rZ0 = cz - 9.3;
    const rZ1 = cz + 9.3;
    addRail(rX0, rZ0, rX1, rZ0);
    addRail(rX0, rZ1, rX1, rZ1);
    addRail(rX1, rZ0, rX1, rZ1);
    addRail(rX0, rZ0, rX0, cz - 2.3);
    addRail(rX0, cz + 2.3, rX0, rZ1);

    // Four symmetrical courtyard corner stone lamps + warm glow lights
    const makeCornerLantern = (lx, lz) => {
      addPart(new BoxGeometry(0.75, 0.24, 0.75), C.blueStone(), lx, 0.12, lz);
      addPart(new CylinderGeometry(0.11, 0.14, 1.9, 8), C.blueStone(), lx, 1.15, lz);
      const glowMat = new MeshBasicMaterial({ color: '#ffcf73' });
      lanternGlowMats.push(glowMat);
      addPart(new CylinderGeometry(0.24, 0.22, 0.44, 6), glowMat, lx, 2.32, lz, 0, 0, 0, false);
      const miniRoof = Ln({ a: 0.44, b: 0.44, r: 0.04, h: 0.32, lift: 0.1 });
      miniRoof.position.set(lx, 2.55, lz);
      root.add(miniRoof);
      Tn?.(lx, lz, 0.45);
      ctx.addWarmLight?.(new ctx.THREE.Vector3(lx, 2.5, lz), 1.45, 11);
    };
    makeCornerLantern(cx - 8.1, cz - 8.6);
    makeCornerLantern(cx - 8.1, cz + 8.6);
    makeCornerLantern(cx + 8.1, cz - 8.6);
    makeCornerLantern(cx + 8.1, cz + 8.6);

    // 2. Symmetrical Free-Standing Entrance Arch Gate with Clear Double-Sided Signboard Facing Courtyard (-X)
    const gateX = cx - 8.8;
    for (const sOff of [-1.9, 1.9]) {
      const col = pi(gateX, cz + sOff, 3.45, 0.14, 0);
      root.add(col);
      Tn?.(gateX, cz + sOff, 0.32);

      // Gate hanging lanterns flanking outside edges
      const lx = gateX - 0.32;
      const lz = cz + sOff * 1.12;
      addPart(new CylinderGeometry(0.015, 0.015, 0.32, 6), darkWoodMat, lx, 3.05, lz, 0, 0, 0, false);
      const glm = new MeshBasicMaterial({ color: '#ff7a33' });
      lanternGlowMats.push(glm);
      const gb = addPart(new SphereGeometry(0.22, 12, 10), glm, lx, 2.75, lz, 0, 0, 0, false);
      gb.scale.set(1, 1.25, 1);
      addPart(new CylinderGeometry(0.09, 0.11, 0.05, 8), C.gold(), lx, 2.98, lz, 0, 0, 0, false);
      addPart(new CylinderGeometry(0.11, 0.08, 0.05, 8), C.gold(), lx, 2.52, lz, 0, 0, 0, false);
    }

    // Timber beam + carved hanging plaque backing (Di uses single-sided PlaneGeometry facing +Z!)
    addPart(new BoxGeometry(0.22, 0.16, 4.15), darkWoodMat, gateX, 3.36, cz);
    addPart(new BoxGeometry(0.12, 0.86, 3.42), darkWoodMat, gateX, 2.76, cz);

    // Front face (-Math.PI/2 turns +Z toward -X = facing arriving player!)
    const signFront = Di(['KHU ĂN UỐNG', 'TIỆC CHAY · 12H00 & 18H00'], 3.32, 0.78);
    signFront.position.set(gateX - 0.07, 2.76, cz);
    signFront.rotation.y = -Math.PI / 2;
    signFront.userData.vegAction = 'menu';
    root.add(signFront);
    hitMeshes.push(signFront);
    ctx.hitMeshes?.push(signFront);

    // Inner face (+Math.PI/2 faces inside courtyard +X)
    const signBack = Di(['KHU ĂN UỐNG', 'TIỆC CHAY · 12H00 & 18H00'], 3.32, 0.78);
    signBack.position.set(gateX + 0.07, 2.76, cz);
    signBack.rotation.y = Math.PI / 2;
    signBack.userData.vegAction = 'menu';
    root.add(signBack);
    hitMeshes.push(signBack);
    ctx.hitMeshes?.push(signBack);

    const gateRoof = Ln({ a: 0.72, b: 2.38, r: 0.35, h: 0.62, lift: 0.16 });
    gateRoof.position.set(gateX, 3.68, cz);
    root.add(gateRoof);
    addPart(new SphereGeometry(0.12, 10, 8), C.gold(), gateX, 4.34, cz);
    ctx.addWarmLight?.(new ctx.THREE.Vector3(gateX - 0.5, 3.1, cz), 1.6, 12);

    // 3. Main Trai Duong Pavilion Centered Symmetrically on Gate Axis at (cx + 3.5 = 42.5, cz = 70)
    const pavX = cx + 3.5;
    const pavZ = cz;
    const pavFloor = new Mesh(new BoxGeometry(9.4, 0.18, 8.8), woodMat);
    pavFloor.position.set(pavX, 0.23, pavZ);
    pavFloor.receiveShadow = true;
    pavFloor.castShadow = true;
    root.add(pavFloor);
    ctx.floorMeshes?.push(pavFloor);

    for (const px of [-4.3, 0, 4.3]) {
      for (const pz of [-4.0, 4.0]) {
        const pil = pi(pavX + px, pavZ + pz, 3.12, 0.15, 0.32);
        root.add(pil);
        Tn?.(pavX + px, pavZ + pz, 0.24);
      }
    }

    const pavRoof = Ln({ a: 5.2, b: 4.5, r: 3.2, h: 2.1, lift: 0.62, dragons: false });
    pavRoof.position.set(pavX, 3.64, pavZ);
    root.add(pavRoof);
    addPart(new SphereGeometry(0.18, 12, 10), C.gold(), pavX, 5.8, pavZ);
    ctx.addWarmLight?.(new ctx.THREE.Vector3(pavX, 3.4, pavZ), 2.2, 17);

    // Symmetrical Hanging Paper Lanterns around Pavilion & Side Canopies ("Mai che")
    const addLanternAt = (lx, ly, lz) => {
      addPart(new CylinderGeometry(0.015, 0.015, 0.32, 6), darkWoodMat, lx, ly + 0.3, lz, 0, 0, 0, false);
      const lm = new MeshBasicMaterial({ color: '#ff8a3d' });
      lanternGlowMats.push(lm);
      const body = addPart(new SphereGeometry(0.24, 12, 10), lm, lx, ly, lz, 0, 0, 0, false);
      body.scale.set(1, 1.25, 1);
      addPart(new CylinderGeometry(0.1, 0.12, 0.06, 8), C.gold(), lx, ly + 0.26, lz, 0, 0, 0, false);
      addPart(new CylinderGeometry(0.12, 0.09, 0.06, 8), C.gold(), lx, ly - 0.26, lz, 0, 0, 0, false);
    };
    const lanternPosList = [
      [pavX - 4.3, 3.16, pavZ - 2.1],
      [pavX - 4.3, 3.16, pavZ + 2.1],
      [pavX - 2.1, 3.16, pavZ - 4.0],
      [pavX + 2.1, 3.16, pavZ - 4.0],
      [pavX - 2.1, 3.16, pavZ + 4.0],
      [pavX + 2.1, 3.16, pavZ + 4.0],
      [pavX + 4.3, 3.16, pavZ - 2.1],
      [pavX + 4.3, 3.16, pavZ + 2.1]
    ];
    for (const [lx, ly, lz] of lanternPosList) addLanternAt(lx, ly, lz);

    // 3b. Two Symmetrical Side Pergola Canopies ("Mai Che") flanking North & South Forecourt
    const sideX = cx - 4.9;
    for (const sideZ of [cz - 7.0, cz + 7.0]) {
      const deck = new Mesh(new BoxGeometry(6.0, 0.12, 3.8), woodMat);
      deck.position.set(sideX, 0.2, sideZ);
      deck.receiveShadow = true;
      deck.castShadow = true;
      root.add(deck);
      ctx.floorMeshes?.push(deck);

      for (const sxOff of [-2.7, 2.7]) {
        for (const szOff of [-1.6, 1.6]) {
          const sPil = pi(sideX + sxOff, sideZ + szOff, 2.68, 0.12, 0.26);
          root.add(sPil);
          Tn?.(sideX + sxOff, sideZ + szOff, 0.22);
        }
      }
      const canopyRoof = Ln({ a: 3.25, b: 2.2, r: 1.85, h: 1.05, lift: 0.35, dragons: false });
      canopyRoof.position.set(sideX, 3.0, sideZ);
      root.add(canopyRoof);
      addPart(new SphereGeometry(0.11, 10, 8), C.gold(), sideX, 4.12, sideZ);
      addLanternAt(sideX - 2.7, 2.65, sideZ);
      addLanternAt(sideX + 2.7, 2.65, sideZ);
      ctx.addWarmLight?.(new ctx.THREE.Vector3(sideX, 2.8, sideZ), 1.45, 11);
    }

    // 4. Symmetrical Buffet Serving Counter ("Quay Tiec Chay") centered at rear of Pavilion, facing -X
    const bufX = pavX + 3.3;
    const bufZ = pavZ;
    addPart(new BoxGeometry(0.95, 0.78, 3.8), darkWoodMat, bufX, 0.71, bufZ);
    addPart(new BoxGeometry(1.05, 0.08, 3.92), woodMat, bufX, 1.12, bufZ);
    Se?.(bufX, bufZ, 1.0, 3.9);

    const bufHit = new Mesh(new BoxGeometry(1.35, 1.35, 4.1), new MeshBasicMaterial({ visible: false }));
    bufHit.position.set(bufX, 1.0, bufZ);
    bufHit.userData.vegAction = 'menu';
    root.add(bufHit);
    hitMeshes.push(bufHit);
    ctx.hitMeshes?.push(bufHit);

    const bufSign = Di(['QUẦY TIỆC CHAY', 'MỞ CỬA 12H00 & 18H00'], 2.4, 0.44);
    bufSign.position.set(bufX - 0.49, 0.74, bufZ);
    bufSign.rotation.y = -Math.PI / 2;
    bufSign.userData.vegAction = 'menu';
    root.add(bufSign);
    hitMeshes.push(bufSign);
    ctx.hitMeshes?.push(bufSign);

    // Two copper cauldrons symmetrically flanking center bowls on Buffet counter
    const steamOrigins = [];
    for (const cOff of [-1.05, 1.05]) {
      const sz = bufZ + cOff;
      addPart(new CylinderGeometry(0.32, 0.36, 0.1, 12), C.darkStone(), bufX, 1.21, sz);
      const embMat = new MeshBasicMaterial({ color: '#ff6f20' });
      emberMats.push(embMat);
      addPart(new CylinderGeometry(0.24, 0.26, 0.05, 10), embMat, bufX, 1.27, sz, 0, 0, 0, false);
      addPart(new CylinderGeometry(0.34, 0.28, 0.3, 14), copperMat, bufX, 1.44, sz);
      addPart(new CylinderGeometry(0.31, 0.31, 0.03, 14), cOff < 0 ? brothRedMat : brothGoldMat, bufX, 1.58, sz, 0, 0, 0, false);
      addPart(new CylinderGeometry(0.02, 0.02, 0.42, 6), woodMat, bufX - 0.08, 1.66, sz + 0.14, 0.4, 0, 0.35);
      steamOrigins.push({ x: bufX, y: 1.64, z: sz });
    }
    // Stacked porcelain bowls in center of buffet counter
    for (let st = 0; st < 4; st++) {
      addPart(new CylinderGeometry(0.18, 0.1, 0.1, 12), ceramicWhiteMat, bufX, 1.22 + st * 0.075, bufZ);
    }

    // 5. Dish builders for the 4 tables
    function buildBunHue(tx, ty, tz) {
      addPart(new CylinderGeometry(0.26, 0.14, 0.14, 14), ceramicWhiteMat, tx, ty + 0.07, tz);
      addPart(new CylinderGeometry(0.23, 0.23, 0.02, 14), brothRedMat, tx, ty + 0.13, tz, 0, 0, 0, false);
      addPart(new BoxGeometry(0.09, 0.05, 0.08), tofuMat, tx - 0.05, ty + 0.15, tz + 0.03);
      addPart(new CylinderGeometry(0.06, 0.06, 0.04, 10), leafMat, tx + 0.07, ty + 0.15, tz - 0.04);
      addPart(new CylinderGeometry(0.012, 0.008, 0.42, 6), darkWoodMat, tx, ty + 0.16, tz + 0.12, Math.PI / 2, 0, 0.3);
      addPart(new CylinderGeometry(0.012, 0.008, 0.42, 6), darkWoodMat, tx + 0.04, ty + 0.16, tz + 0.1, Math.PI / 2, 0, 0.25);
      steamOrigins.push({ x: tx, y: ty + 0.18, z: tz });
    }

    function buildLauNam(tx, ty, tz) {
      addPart(new CylinderGeometry(0.28, 0.3, 0.07, 14), C.darkStone(), tx, ty + 0.035, tz);
      const em = new MeshBasicMaterial({ color: '#ff7722' });
      emberMats.push(em);
      addPart(new CylinderGeometry(0.16, 0.16, 0.04, 10), em, tx, ty + 0.08, tz, 0, 0, 0, false);
      addPart(new CylinderGeometry(0.32, 0.26, 0.19, 16), copperMat, tx, ty + 0.18, tz);
      addPart(new CylinderGeometry(0.29, 0.29, 0.02, 16), brothGoldMat, tx, ty + 0.26, tz, 0, 0, 0, false);
      for (const [mx, mz, mat] of [[-0.08, 0.05, tofuMat], [0.09, -0.05, leafMat], [0, -0.09, pastryGoldMat], [0.06, 0.08, ceramicWhiteMat]]) {
        addPart(new SphereGeometry(0.055, 8, 6), mat, tx + mx, ty + 0.28, tz + mz);
      }
      steamOrigins.push({ x: tx, y: ty + 0.32, z: tz });
    }

    function buildComSen(tx, ty, tz) {
      addPart(new CylinderGeometry(0.28, 0.25, 0.03, 14), bambooTrayMat, tx, ty + 0.015, tz);
      addPart(new CylinderGeometry(0.24, 0.24, 0.02, 12), leafMat, tx, ty + 0.035, tz);
      const mound = addPart(new SphereGeometry(0.17, 12, 8), riceMat, tx, ty + 0.07, tz);
      mound.scale.set(1, 0.65, 1);
      addPart(new SphereGeometry(0.035, 8, 6), pastryGoldMat, tx, ty + 0.18, tz);
      addPart(new SphereGeometry(0.028, 8, 6), leafMat, tx - 0.05, ty + 0.16, tz + 0.04);
    }

    function buildBanhBao(tx, ty, tz) {
      addPart(new CylinderGeometry(0.25, 0.25, 0.12, 14), bambooTrayMat, tx, ty + 0.06, tz);
      const mats = [riceMat, pastryJadeMat, pastryGoldMat, pastryPinkMat];
      const offs = [[-0.08, -0.07], [0.08, -0.07], [-0.08, 0.07], [0.08, 0.07]];
      offs.forEach(([ox, oz], i) => {
        const b = addPart(new SphereGeometry(0.072, 10, 8), mats[i], tx + ox, ty + 0.14, tz + oz);
        b.scale.set(1, 0.82, 1);
      });
      steamOrigins.push({ x: tx, y: ty + 0.22, z: tz });
    }

    function buildDauHu(tx, ty, tz) {
      addPart(new CylinderGeometry(0.22, 0.17, 0.16, 12), terracottaMat, tx, ty + 0.08, tz);
      addPart(new CylinderGeometry(0.19, 0.19, 0.02, 12), brothRedMat, tx, ty + 0.15, tz, 0, 0, 0, false);
      for (const [ox, oz] of [[-0.06, -0.04], [0.07, 0.04], [-0.02, 0.08]]) {
        addPart(new BoxGeometry(0.07, 0.05, 0.07), tofuMat, tx + ox, ty + 0.17, tz + oz);
      }
      steamOrigins.push({ x: tx, y: ty + 0.22, z: tz });
    }

    function buildNemChay(tx, ty, tz) {
      addPart(new CylinderGeometry(0.27, 0.24, 0.03, 14), ceramicWhiteMat, tx, ty + 0.015, tz);
      for (let i = 0; i < 4; i++) {
        addPart(new CylinderGeometry(0.032, 0.032, 0.22, 8), fryGoldMat, tx - 0.09 + i * 0.06, ty + 0.055, tz, Math.PI / 2, 0.2, 0);
      }
      addPart(new SphereGeometry(0.06, 8, 6), leafMat, tx + 0.11, ty + 0.05, tz - 0.05);
      addPart(new CylinderGeometry(0.07, 0.05, 0.04, 10), brothRedMat, tx - 0.1, ty + 0.04, tz + 0.1);
    }

    function buildTraSen(tx, ty, tz) {
      addPart(new BoxGeometry(0.46, 0.03, 0.36), bambooTrayMat, tx, ty + 0.015, tz);
      const pot = addPart(new SphereGeometry(0.11, 12, 10), ceramicCeladonMat, tx - 0.09, ty + 0.11, tz);
      pot.scale.set(1.1, 0.9, 1.1);
      addPart(new CylinderGeometry(0.022, 0.032, 0.1, 8), ceramicCeladonMat, tx + 0.02, ty + 0.13, tz, 0, 0, -0.7);
      for (const czOff of [-0.08, 0.06]) {
        addPart(new CylinderGeometry(0.042, 0.032, 0.05, 10), ceramicWhiteMat, tx + 0.12, ty + 0.055, tz + czOff);
      }
      steamOrigins.push({ x: tx - 0.09, y: ty + 0.21, z: tz });
    }

    function buildCheSen(tx, ty, tz) {
      addPart(new CylinderGeometry(0.2, 0.12, 0.1, 12), ceramicCeladonMat, tx - 0.12, ty + 0.05, tz);
      addPart(new CylinderGeometry(0.18, 0.18, 0.02, 12), brothGoldMat, tx - 0.12, ty + 0.095, tz, 0, 0, 0, false);
      addPart(new CylinderGeometry(0.22, 0.18, 0.03, 12), C.lacquer(), tx + 0.14, ty + 0.015, tz);
      addPart(new SphereGeometry(0.06, 10, 8), fryGoldMat, tx + 0.11, ty + 0.07, tz - 0.04);
      addPart(new SphereGeometry(0.055, 10, 8), pastryPinkMat, tx + 0.19, ty + 0.07, tz + 0.04);
      addPart(new SphereGeometry(0.05, 10, 8), pastryJadeMat, tx + 0.12, ty + 0.07, tz + 0.06);
    }

    // 6. 8 Symmetrical Dining Tables across Main Trai Duong (4) + Two Shaded Side Mai Che (4) = 32 Seats
    const tableConfigs = [
      // Main Pavilion: Front Row Left & Right
      {
        x: pavX - 2.9,
        z: pavZ - 2.0,
        floorY: 0.32,
        w: 1.65,
        d: 1.15,
        h: 0.62,
        dishes: [
          { id: 'lau_nam', dx: -0.32, dz: 0, build: buildLauNam },
          { id: 'bun_hue', dx: 0.36, dz: 0.06, build: buildBunHue }
        ]
      },
      {
        x: pavX - 2.9,
        z: pavZ + 2.0,
        floorY: 0.32,
        w: 1.65,
        d: 1.15,
        h: 0.62,
        dishes: [
          { id: 'com_sen', dx: -0.34, dz: -0.04, build: buildComSen },
          { id: 'banh_bao', dx: 0.35, dz: 0.05, build: buildBanhBao }
        ]
      },
      // Main Pavilion: Back Row Left & Right
      {
        x: pavX + 0.5,
        z: pavZ - 2.0,
        floorY: 0.32,
        w: 1.65,
        d: 1.15,
        h: 0.62,
        dishes: [
          { id: 'dau_hu', dx: -0.34, dz: 0, build: buildDauHu },
          { id: 'nem_chay', dx: 0.34, dz: 0, build: buildNemChay }
        ]
      },
      {
        x: pavX + 0.5,
        z: pavZ + 2.0,
        floorY: 0.32,
        w: 1.65,
        d: 1.15,
        h: 0.62,
        dishes: [
          { id: 'tra_sen', dx: -0.32, dz: 0, build: buildTraSen },
          { id: 'che_sen', dx: 0.34, dz: 0, build: buildCheSen }
        ]
      },
      // Side Canopy North (2 shaded tables)
      {
        x: sideX - 1.55,
        z: cz - 7.0,
        floorY: 0.26,
        w: 1.45,
        d: 1.05,
        h: 0.6,
        dishes: [
          { id: 'bun_hue', dx: -0.28, dz: 0, build: buildBunHue },
          { id: 'nem_chay', dx: 0.3, dz: 0, build: buildNemChay }
        ]
      },
      {
        x: sideX + 1.55,
        z: cz - 7.0,
        floorY: 0.26,
        w: 1.45,
        d: 1.05,
        h: 0.6,
        dishes: [
          { id: 'com_sen', dx: -0.28, dz: 0, build: buildComSen },
          { id: 'tra_sen', dx: 0.28, dz: 0, build: buildTraSen }
        ]
      },
      // Side Canopy South (2 shaded tables)
      {
        x: sideX - 1.55,
        z: cz + 7.0,
        floorY: 0.26,
        w: 1.45,
        d: 1.05,
        h: 0.6,
        dishes: [
          { id: 'lau_nam', dx: -0.28, dz: 0, build: buildLauNam },
          { id: 'banh_bao', dx: 0.3, dz: 0, build: buildBanhBao }
        ]
      },
      {
        x: sideX + 1.55,
        z: cz + 7.0,
        floorY: 0.26,
        w: 1.45,
        d: 1.05,
        h: 0.6,
        dishes: [
          { id: 'dau_hu', dx: -0.28, dz: 0, build: buildDauHu },
          { id: 'che_sen', dx: 0.28, dz: 0, build: buildCheSen }
        ]
      }
    ];

    tableConfigs.forEach((tb, tIdx) => {
      const topY = tb.floorY + tb.h;
      addPart(new BoxGeometry(tb.w, 0.08, tb.d), woodMat, tb.x, topY - 0.04, tb.z);
      for (const lx of [-tb.w / 2 + 0.14, tb.w / 2 - 0.14]) {
        for (const lz of [-tb.d / 2 + 0.14, tb.d / 2 - 0.14]) {
          addPart(new BoxGeometry(0.11, tb.h - 0.08, 0.11), darkWoodMat, tb.x + lx, tb.floorY + (tb.h - 0.08) / 2, tb.z + lz);
        }
      }
      Se?.(tb.x, tb.z, tb.w, tb.d);

      if (tb.umbrella) {
        addPart(new CylinderGeometry(0.055, 0.065, 2.55, 8), darkWoodMat, tb.x, tb.floorY + 1.28, tb.z);
        const cap = addPart(new ConeGeometry(1.55, 0.58, 10), bambooTrayMat, tb.x, tb.floorY + 2.66, tb.z);
        cap.castShadow = true;
      }

      // Dishes & individual generous clickable dish hitboxes
      for (const ds of tb.dishes) {
        const dx = tb.x + ds.dx;
        const dz = tb.z + ds.dz;
        ds.build(dx, topY, dz);
        const dHit = new Mesh(new BoxGeometry(0.82, 0.56, 0.85), new MeshBasicMaterial({ visible: false }));
        dHit.position.set(dx, topY + 0.25, dz);
        dHit.userData.vegDish = ds.id;
        root.add(dHit);
        hitMeshes.push(dHit);
        ctx.hitMeshes?.push(dHit);
      }

      // 4 Stools around each table registered in Ii (seats)
      const seatOffsets = [
        [0, -tb.d / 2 - 0.52],
        [0, tb.d / 2 + 0.52],
        [-tb.w / 2 - 0.52, 0],
        [tb.w / 2 + 0.52, 0]
      ];
      seatOffsets.forEach(([ox, oz], sIdx) => {
        const sx = tb.x + ox;
        const sz = tb.z + oz;
        const seatTop = tb.floorY + 0.38;
        const stool = addPart(new CylinderGeometry(0.24, 0.26, 0.36, 12), woodMat, sx, tb.floorY + 0.18, sz);
        addPart(new CylinderGeometry(0.21, 0.22, 0.05, 12), C.lacquer(), sx, seatTop + 0.02, sz);
        const facing = Math.atan2(tb.x - sx, tb.z - sz);
        const sid = `chay-t${tIdx}-${sIdx}`;
        stool.userData.seat = sid;
        ctx.seats?.push({
          id: sid,
          position: new ctx.THREE.Vector3(sx, seatTop + 0.12, sz),
          facing,
          mesh: stool,
          taken: false
        });
      });
    });

    // 7. Rising Steam Particles over cauldrons, hotpot, steamer & soup bowls
    const scv = document.createElement('canvas');
    scv.width = scv.height = 64;
    const sg = scv.getContext('2d');
    const sgrad = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
    sgrad.addColorStop(0, 'rgba(255,252,244,0.68)');
    sgrad.addColorStop(0.55, 'rgba(255,248,236,0.22)');
    sgrad.addColorStop(1, 'rgba(255,248,236,0)');
    sg.fillStyle = sgrad;
    sg.fillRect(0, 0, 64, 64);
    const sTex = new CanvasTexture(scv);
    sTex.colorSpace = SRGBColorSpace;

    const puffsPerOrigin = 4;
    const totalPuffs = steamOrigins.length * puffsPerOrigin;
    const sArr = new Float32Array(totalPuffs * 3);
    steamSeeds = [];
    let pIdx = 0;
    for (const orig of steamOrigins) {
      for (let k = 0; k < puffsPerOrigin; k++) {
        const phase = k / puffsPerOrigin + Math.random() * 0.2;
        steamSeeds.push({ orig, phase, drift: Math.random() * 6.28 });
        sArr[pIdx * 3] = orig.x;
        sArr[pIdx * 3 + 1] = orig.y;
        sArr[pIdx * 3 + 2] = orig.z;
        pIdx++;
      }
    }
    const stGeo = new BufferGeometry();
    stGeo.setAttribute('position', new Float32BufferAttribute(sArr, 3));
    steamMat = new PointsMaterial({
      size: 0.42,
      map: sTex,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: AdditiveBlending
    });
    steamPoints = new Points(stGeo, steamMat);
    steamPoints.frustumCulled = false;
    root.add(steamPoints);
  }

  function _buildUI() {
    if (!ctx?.hudRoot) return;
    pillEl = document.createElement('button');
    pillEl.type = 'button';
    pillEl.className = 'veg-pill';
    pillEl.onclick = () => open(selectedDishId);
    ctx.hudRoot.appendChild(pillEl);

    modalEl = document.createElement('div');
    modalEl.className = 'veg-modal';
    modalEl.innerHTML = `
      <div class="veg-card" role="dialog" aria-label="Khu Ăn Uống">
        <div class="veg-head">
          <div class="veg-title-wrap">
            <h2>🍲 Khu Ăn Uống · Trai Đường Thanh Tịnh</h2>
            <p>Mỗi ngày chùa mở <strong>Tiệc Chay</strong> vào lúc <strong>12h00</strong> và <strong>18h00</strong> (giờ VN). Mọi người tham gia đều được cộng Công đức!</p>
          </div>
          <button type="button" class="veg-close" aria-label="Đóng">×</button>
        </div>
        <div class="veg-status-box" id="vegStatusBox">
          <div class="veg-status-main">
            <strong id="vegStatusTitle">Đang tải lịch Tiệc Chay…</strong>
            <span id="vegStatusSub"></span>
          </div>
          <div class="veg-status-actions">
            <button type="button" class="veg-btn" id="vegGoBtn">🚶 Tới Khu Ăn Uống</button>
          </div>
        </div>
        <div class="veg-slots-bar">
          <span id="vegSlotsLabel">Lượt nhận Công đức trong ca tiệc: 0/3 món</span>
          <div class="veg-dots" id="vegDots"></div>
        </div>
        <div class="veg-grid" id="vegDishGrid"></div>
        <div class="veg-foot">
          <div class="veg-foot-note" id="vegFootNote">
            Chọn món chay yêu thích rồi bấm <strong>Thọ trai</strong>. Bấm trực tiếp lên ghế quanh bàn để ngồi dùng bữa cùng bạn đồng tu!
          </div>
          <button type="button" class="veg-btn primary" id="vegEatBtn">🥢 Thọ trai món đã chọn</button>
        </div>
      </div>
    `;
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) close();
    });
    modalEl.querySelector('.veg-close').onclick = close;
    modalEl.querySelector('#vegGoBtn').onclick = () => {
      close();
      ctx?.teleportToVeg?.();
    };
    modalEl.querySelector('#vegEatBtn').onclick = () => eatDish(selectedDishId);
    document.body.appendChild(modalEl);
    renderUI(true);
  }

  function renderUI(forceGrid = false) {
    const st = getLiveState();
    if (pillEl) {
      pillEl.classList.toggle('live', Boolean(st.isOpen));
      if (st.isOpen) {
        pillEl.innerHTML = `<i class="veg-pill-dot"></i><span><b>🍲 ${escapeHtml(st.activeLabel)} ĐANG MỞ!</b> · Còn ${fmtCountdown(st.remSec)} · Bấm dự tiệc (+${st.meritPerDish} CĐ)</span>`;
      } else {
        pillEl.innerHTML = `<i class="veg-pill-dot"></i><span>🥢 Tiệc Chay <b>${escapeHtml(st.hoursText)}</b> · Còn ${fmtCountdown(st.nextInSec)}</span>`;
      }
    }

    if (!modalEl || (!isModalOpen && !forceGrid)) return;

    const statusBox = modalEl.querySelector('#vegStatusBox');
    const titleEl = modalEl.querySelector('#vegStatusTitle');
    const subEl = modalEl.querySelector('#vegStatusSub');
    const goBtn = modalEl.querySelector('#vegGoBtn');
    const slotsLabel = modalEl.querySelector('#vegSlotsLabel');
    const dotsEl = modalEl.querySelector('#vegDots');
    const gridEl = modalEl.querySelector('#vegDishGrid');
    const eatBtn = modalEl.querySelector('#vegEatBtn');

    const myPos = ctx?.getPlayerPos?.();
    const nearZone = isInZone(myPos);
    goBtn.style.display = nearZone ? 'none' : '';

    statusBox.classList.toggle('live', Boolean(st.isOpen));
    const maxSlots = st.maxDishesPerSlot || 3;
    const eatenIds = Array.isArray(st.eatenIds) ? st.eatenIds : [];
    const eatenCount = eatenIds.length;

    if (st.isOpen) {
      titleEl.textContent = `🟢 ${st.activeLabel} đang diễn ra! (Còn ${fmtCountdown(st.remSec)})`;
      subEl.textContent = `Nhận ngay +${st.meritPerDish} Công đức cho mỗi món chay khác nhau (tối đa ${maxSlots} món/ca · tổng +${maxSlots * st.meritPerDish} Công đức).`;
      slotsLabel.textContent = `Đã dùng trong ca tiệc: ${eatenCount}/${maxSlots} món · Tổng bữa chay đã dự: ${st.totalMeals || 0}`;
    } else {
      titleEl.textContent = `⏳ Chưa tới giờ Tiệc Chay · Ca kế tiếp ${st.nextLabel} (còn ${fmtCountdown(st.nextInSec)})`;
      subEl.textContent = `Tiệc Chay chỉ mở phục vụ đúng khung giờ ${st.hoursText} (kéo dài ${st.durationMin} phút mỗi ca). Bạn có thể ngồi bàn nghỉ ngơi và quay lại đúng giờ mở tiệc!`;
      slotsLabel.textContent = `Ngoài giờ mở tiệc (${st.hoursText}) chưa thể thọ trai · Tổng bữa chay đã dự: ${st.totalMeals || 0}`;
    }

    dotsEl.innerHTML = Array.from({ length: maxSlots }, (_, idx) => `<i class="${idx < eatenCount ? 'on' : ''}"></i>`).join('');

    gridEl.innerHTML = VEG_MENU.map((dish) => {
      const eaten = st.isOpen && eatenIds.includes(dish.id);
      const selected = selectedDishId === dish.id;
      let badge = st.isOpen
        ? eaten
          ? '✓ Đã nhận CĐ'
          : eatenCount < maxSlots
            ? `+${st.meritPerDish} CĐ`
            : 'Dùng thêm'
        : `Mở lúc ${st.nextLabel}`;
      return `
        <div class="veg-dish ${selected ? 'selected' : ''} ${eaten ? 'eaten' : ''}" data-dish="${escapeHtml(dish.id)}">
          <div>
            <div class="veg-dish-top">
              <span class="veg-dish-ico">${dish.icon}</span>
              <span class="veg-dish-badge">${badge}</span>
            </div>
            <h3>${escapeHtml(dish.name)}</h3>
            <p>${escapeHtml(dish.desc)}</p>
          </div>
        </div>
      `;
    }).join('');

    gridEl.querySelectorAll('.veg-dish').forEach((card) => {
      card.addEventListener('click', () => {
        selectedDishId = card.dataset.dish;
        renderUI(true);
      });
    });

    const curDish = VEG_MENU.find((d) => d.id === selectedDishId) || VEG_MENU[0];
    const alreadyGot = st.isOpen && eatenIds.includes(curDish.id);
    eatBtn.disabled = !st.isOpen;
    if (!st.isOpen) {
      eatBtn.textContent = `⏳ Chờ giờ Tiệc Chay (${st.nextLabel} · còn ${fmtCountdown(st.nextInSec)})`;
    } else if (!alreadyGot && eatenCount < maxSlots) {
      eatBtn.textContent = `${curDish.icon} Dự Tiệc · ${curDish.name} (+${st.meritPerDish} CĐ)`;
    } else {
      eatBtn.textContent = `${curDish.icon} Thưởng thức ${curDish.name}`;
    }
  }

  function open(dishId = null) {
    if (dishId && VEG_MENU.some((d) => d.id === dishId)) {
      selectedDishId = dishId;
    }
    isModalOpen = true;
    modalEl?.classList.add('open');
    renderUI(true);
    if (ctx?.isServerConnected?.()) {
      ctx?.sendPacket?.({ t: 'veg-sync' });
    }
  }

  function close() {
    isModalOpen = false;
    modalEl?.classList.remove('open');
  }

  function interact(hitObj) {
    const dishId = hitObj?.userData?.vegDish;
    if (dishId) {
      open(dishId);
      return;
    }
    open();
  }

  function eatDish(dishId = selectedDishId) {
    const st = getLiveState();
    if (!st.isOpen) {
      ctx?.toast?.(`⏳ Chưa tới giờ Tiệc Chay (${st.hoursText}) · Còn ${fmtCountdown(st.nextInSec)} tới tiệc ${st.nextLabel}`, 3600);
      renderUI(true);
      return;
    }
    const dish = VEG_MENU.find((d) => d.id === dishId) || VEG_MENU[0];
    const now = performance.now();
    if (now - lastEatAt < 1400) {
      ctx?.toast?.('Bạn cứ từ tốn thưởng thức từng món nhé 🙏', 2200);
      return;
    }
    lastEatAt = now;

    const myPos = ctx?.getPlayerPos?.();
    if (!isInZone(myPos)) {
      close();
      ctx?.toast?.('Đang đưa bạn tới Khu Ăn Uống…', 1800);
      ctx?.teleportToVeg?.(() => {
        setTimeout(() => eatDish(dish.id), 450);
      });
      return;
    }

    ctx?.onEatMotion?.(dish);
    _spawnEatBurst(myPos, true);
    ctx?.sendPacket?.({ t: 'veg-eat', dish: dish.id });
    ctx?.onBotReact?.('veg-eat', dish.name);
  }

  function setState(nextState) {
    if (!nextState || typeof nextState !== 'object') return;
    const prevOpen = srvState?.isOpen;
    const prevSlot = srvState?.slotKey;
    srvState = nextState;
    srvFetchedAt = performance.now();
    if (nextState.isOpen && nextState.slotKey && nextState.slotKey !== announcedSlotKey && (!prevOpen || prevSlot !== nextState.slotKey)) {
      announcedSlotKey = nextState.slotKey;
      ctx?.onBotReact?.('veg-start', nextState.activeLabel);
    }
    renderUI(true);
  }

  function handleOffline(pkt) {
    if (!pkt || typeof pkt !== 'object') return;
    if (pkt.t === 'veg-sync') {
      renderUI(true);
      return;
    }
    if (pkt.t !== 'veg-eat') return;
    const dish = VEG_MENU.find((d) => d.id === pkt.dish) || VEG_MENU[0];
    const st = _computeSoloState();
    if (!st.isOpen) {
      ctx?.toast?.(`⏳ Chưa tới giờ Tiệc Chay (${st.hoursText}) · Còn ${fmtCountdown(st.nextInSec)} tới tiệc ${st.nextLabel}`, 3600);
      renderUI(true);
      return;
    }
    const saved = _readSoloStore();
    if (saved.slotKey !== st.slotKey) {
      saved.slotKey = st.slotKey;
      saved.eatenIds = [];
    }
    if (!Array.isArray(saved.eatenIds)) saved.eatenIds = [];
    let msg = `${dish.icon} Thưởng thức ${dish.name} (đã đạt tối đa lượt cộng Công đức ca này)`;
    if (!saved.eatenIds.includes(dish.id) && saved.eatenIds.length < st.maxDishesPerSlot) {
      saved.eatenIds.push(dish.id);
      saved.totalMeals = (Number(saved.totalMeals) || 0) + 1;
      msg = `✨ Dự ${st.activeLabel} · ${dish.name} (+15 Công đức chế độ Solo · kết nối Server để lưu bảng xếp hạng!)`;
    }
    _writeSoloStore(saved);
    ctx?.toast?.(msg, 4200);
    renderUI(true);
  }

  function onPeerEat(msg) {
    if (!msg) return;
    if (Number.isFinite(msg.x) && Number.isFinite(msg.z)) {
      _spawnEatBurst({ x: msg.x, y: 0, z: msg.z }, false);
    }
    if (msg.isSelf) {
      if (msg.feastRewarded) {
        ctx?.toast?.(`🍲 Hoan hỷ dự Tiệc Chay: ${msg.dishName} (+${msg.meritGained} Công đức)`, 3800);
      } else if (msg.tasteRewarded) {
        ctx?.toast?.(`🥢 Nếm món chay: ${msg.dishName} (+${msg.meritGained} Công đức · Giờ Tiệc Chay chính là 12h00 & 18h00)`, 4200);
      } else if (msg.feast) {
        ctx?.toast?.(`🙏 Đã thưởng thức ${msg.dishName} (bạn đã nhận tối đa công đức ca này hoặc đã dùng món này)`, 3400);
      } else {
        ctx?.toast?.(`🥢 Thưởng thức ${msg.dishName} · Tiệc Chay 12h00 & 18h00 sẽ mở thưởng Công đức!`, 3600);
      }
    } else if (isInZone(ctx?.getPlayerPos?.())) {
      ctx?.toast?.(`🍲 ${msg.name} vừa dùng ${msg.dishName} tại Khu Ăn Uống`, 2800);
    }
  }

  function update(dt, elapsed, info = {}) {
    const night = Number(info.night) || 0;
    const st = getLiveState();
    const glowLevel = st.isOpen ? 1.0 : 0.25 + night * 0.75;

    for (const mat of lanternGlowMats) {
      mat.color.setRGB(
        1.0,
        0.58 + 0.25 * glowLevel,
        0.22 + 0.16 * glowLevel
      );
    }
    for (const mat of emberMats) {
      const pulse = 0.75 + Math.sin(elapsed * 5) * 0.25;
      mat.color.setRGB(pulse, 0.32 * pulse, 0.08);
    }

    if (steamPoints && steamSeeds.length) {
      const posAttr = steamPoints.geometry.attributes.position;
      const spd = st.isOpen ? 0.34 : 0.2;
      const heightMax = st.isOpen ? 1.15 : 0.72;
      steamMat.opacity = st.isOpen ? 0.45 : 0.24;
      for (let i = 0; i < steamSeeds.length; i++) {
        const sd = steamSeeds[i];
        const age = (elapsed * spd + sd.phase) % 1;
        const px = sd.orig.x + Math.sin(elapsed * 1.4 + sd.drift + age * 4) * 0.09 * (0.3 + age);
        const py = sd.orig.y + age * heightMax;
        const pz = sd.orig.z + Math.cos(elapsed * 1.1 + sd.drift + age * 3) * 0.09 * (0.3 + age);
        posAttr.setXYZ(i, px, py, pz);
      }
      posAttr.needsUpdate = true;
    }

    for (let i = eatBursts.length - 1; i >= 0; i--) {
      const b = eatBursts[i];
      b.life += dt;
      if (b.life >= b.maxLife) {
        root?.remove(b.pts);
        b.geo.dispose();
        b.mat.dispose();
        eatBursts.splice(i, 1);
        continue;
      }
      const pAttr = b.geo.attributes.position;
      for (let k = 0; k < b.vels.length; k++) {
        const v = b.vels[k];
        pAttr.setXYZ(
          k,
          pAttr.getX(k) + v.vx * dt,
          pAttr.getY(k) + v.vy * dt,
          pAttr.getZ(k) + v.vz * dt
        );
      }
      pAttr.needsUpdate = true;
      b.mat.opacity = 1 - b.life / b.maxLife;
    }

    const curSec = Math.floor(elapsed);
    if (curSec !== lastUiSec) {
      lastUiSec = curSec;
      renderUI(false);
      if (ctx?.isServerConnected?.() && srvState) {
        const nowPerf = performance.now();
        if (((srvState.isOpen && st.remSec <= 1) || (!srvState.isOpen && st.nextInSec <= 1)) && nowPerf - lastSyncReqAt > 4000) {
          lastSyncReqAt = nowPerf;
          ctx?.sendPacket?.({ t: 'veg-sync' });
        }
      }
    }
  }

  function getSvgDot() {
    const st = getLiveState();
    const fill = st.isOpen ? '#f3b74f' : '#85a659';
    return `<g>`
      + `<rect x="${VEG_CENTER.x - 9}" y="${VEG_CENTER.z - 9}" width="18" height="18" rx="2.2" fill="${fill}" opacity="0.88" stroke="#e9c27a" stroke-width="0.9"/>`
      + `<rect x="${VEG_CENTER.x - 1}" y="${VEG_CENTER.z - 4.5}" width="9.5" height="9" rx="1" fill="#8b3b24" stroke="#f5d187" stroke-width="0.6"/>`
      + `<rect x="${VEG_CENTER.x - 8}" y="${VEG_CENTER.z - 8.5}" width="6" height="3.6" rx="0.7" fill="#9a4a2a" stroke="#f5d187" stroke-width="0.5"/>`
      + `<rect x="${VEG_CENTER.x - 8}" y="${VEG_CENTER.z + 4.9}" width="6" height="3.6" rx="0.7" fill="#9a4a2a" stroke="#f5d187" stroke-width="0.5"/>`
      + `</g>`;
  }

  function init(options) {
    if (ctx) return;
    ctx = options;
    _build3DWorld();
    _buildUI();
  }

  return {
    init,
    open,
    close,
    interact,
    eatDish,
    setState,
    handleOffline,
    onPeerEat,
    update,
    isFeastOpen,
    isInZone,
    getLiveState,
    getSvgDot,
    hitTargets: () => hitMeshes,
    get isOpen() { return isModalOpen; }
  };
})();

if (typeof globalThis !== 'undefined') {
  globalThis.VegFx = VegFx;
}
