/**
 * 3D Courtyard DJ Booth & FxSound Visualizer Prop
 * Standalone Three.js builder (zero direct imports from minified bundle).
 */

export const DJ_POS = { x: 8.4, z: 32.0, ry: 0.28 };

function buildVinylTexture(CanvasTexture, colorSpace) {
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 256;
  const g = cv.getContext('2d');
  if (g) {
    g.fillStyle = '#0e0e12';
    g.beginPath();
    g.arc(128, 128, 126, 0, Math.PI * 2);
    g.fill();

    for (let r = 46; r <= 122; r += 4) {
      g.strokeStyle = r % 12 === 0 ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.06)';
      g.lineWidth = 1;
      g.beginPath();
      g.arc(128, 128, r, 0, Math.PI * 2);
      g.stroke();
    }

    const grad = g.createRadialGradient(128, 128, 4, 128, 128, 44);
    grad.addColorStop(0, '#fe566a');
    grad.addColorStop(0.65, '#d51535');
    grad.addColorStop(1, '#4f0c18');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(128, 128, 44, 0, Math.PI * 2);
    g.fill();

    g.strokeStyle = '#ffd978';
    g.lineWidth = 2.5;
    g.beginPath();
    g.arc(128, 128, 43, 0, Math.PI * 2);
    g.stroke();

    g.fillStyle = '#ffffff';
    g.fillRect(126, 88, 4, 24);

    g.fillStyle = '#181818';
    g.beginPath();
    g.arc(128, 128, 7, 0, Math.PI * 2);
    g.fill();
  }
  const tx = new CanvasTexture(cv);
  if (colorSpace !== undefined) tx.colorSpace = colorSpace;
  return tx;
}

function buildSignTexture(CanvasTexture, colorSpace) {
  const cv = document.createElement('canvas');
  cv.width = 768;
  cv.height = 128;
  const g = cv.getContext('2d');
  if (g) {
    g.fillStyle = 'rgba(20, 14, 16, 0.90)';
    g.beginPath();
    g.roundRect(8, 14, 752, 100, 48);
    g.fill();
    g.strokeStyle = '#fe566a';
    g.lineWidth = 4;
    g.stroke();
    g.fillStyle = '#ffe6a7';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '600 36px "Be Vietnam Pro", system-ui, sans-serif';
    g.fillText('🎛️ Bàn DJ · FxSound EQ (Chạm mở)', 384, 65);
  }
  const tx = new CanvasTexture(cv);
  if (colorSpace !== undefined) tx.colorSpace = colorSpace;
  return tx;
}

function createScreenCanvas(CanvasTexture, colorSpace) {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 320;
  const g = cv.getContext('2d');
  const tx = new CanvasTexture(cv);
  if (colorSpace !== undefined) tx.colorSpace = colorSpace;

  const paint = (presetName = 'Music', eqGains = [], spec = null, powerOn = true) => {
    if (!g) return;
    g.fillStyle = '#07070b';
    g.fillRect(0, 0, 512, 320);

    g.strokeStyle = powerOn ? '#e63462' : '#52525b';
    g.lineWidth = 5;
    g.strokeRect(8, 8, 496, 304);

    g.fillStyle = '#ffffff';
    g.font = '700 24px "Be Vietnam Pro", system-ui, sans-serif';
    g.textAlign = 'left';
    g.fillText('FxSound STUDIO EQ', 26, 44);

    g.fillStyle = powerOn ? '#ffd978' : '#71717a';
    g.textAlign = 'right';
    g.font = '600 20px "Be Vietnam Pro", system-ui, sans-serif';
    g.fillText(powerOn ? `Preset: ${presetName}` : 'BYPASS (OFF)', 486, 44);

    // Mini mirrored spectrum
    const n = 20;
    for (let i = 0; i < n; i++) {
      const sVal = spec ? spec[Math.min(9, Math.floor((i / n) * 10))] : 0.14;
      const h = Math.max(8, sVal * 155);
      const x = 30 + i * 22.8;
      const grad = g.createLinearGradient(0, 175 - h / 2, 0, 175 + h / 2);
      grad.addColorStop(0, '#fe566a');
      grad.addColorStop(0.5, '#ffd978');
      grad.addColorStop(1, '#fe566a');
      g.fillStyle = powerOn ? grad : '#3f3f46';
      g.fillRect(x, 175 - h / 2, 14, h);
    }

    // Mini EQ gain curve
    if (eqGains.length) {
      g.beginPath();
      for (let i = 0; i < eqGains.length; i++) {
        const px = 30 + (i / Math.max(1, eqGains.length - 1)) * 452;
        const py = 175 - (Math.max(-12, Math.min(12, eqGains[i])) / 12) * 58;
        if (i === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.strokeStyle = powerOn ? '#38bdf8' : '#71717a';
      g.lineWidth = 3.5;
      g.stroke();
    }

    g.fillStyle = '#cbd5e1';
    g.textAlign = 'center';
    g.font = '500 18px "Be Vietnam Pro", system-ui, sans-serif';
    g.fillText('Chạm để chỉnh 5–31 Band EQ & Phát nhạc Bàn DJ', 256, 286);
    tx.needsUpdate = true;
  };

  paint();
  return { tx, paint };
}

export function createDjBooth(deps, dsp) {
  const { THREE, scene, colliderBox, materials, radialGlow } = deps;
  const {
    Group,
    Mesh,
    BoxGeometry,
    CylinderGeometry,
    PlaneGeometry,
    TorusGeometry,
    MeshStandardMaterial,
    MeshBasicMaterial,
    Sprite,
    SpriteMaterial,
    CanvasTexture,
    SRGBColorSpace,
    PointLight
  } = THREE;

  const group = new Group();
  group.position.set(DJ_POS.x, 0, DJ_POS.z);
  group.rotation.y = DJ_POS.ry;
  scene.add(group);

  const put = (geo, mat, px, py, pz) => {
    const m = new Mesh(geo, mat);
    m.position.set(px, py, pz);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
  };

  const bSt = materials?.blueStone ? materials.blueStone() : new MeshStandardMaterial({ color: '#4c5460', roughness: 0.85 });
  const dSt = materials?.darkStone ? materials.darkStone() : new MeshStandardMaterial({ color: '#1a1b22', roughness: 0.7 });
  const goldM = materials?.gold ? materials.gold() : new MeshStandardMaterial({ color: '#e5b95c', metalness: 0.85, roughness: 0.28 });
  const lacM = materials?.lacquer ? materials.lacquer() : new MeshStandardMaterial({ color: '#6b1c14', roughness: 0.45 });
  const darkMetal = new MeshStandardMaterial({ color: '#14151b', metalness: 0.65, roughness: 0.35 });
  const silverM = new MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.88, roughness: 0.22 });
  const glowCrimson = new MeshBasicMaterial({ color: '#ff3b6b' });

  // Stone base & lacquered booth cabinet
  put(new BoxGeometry(2.9, 0.14, 1.32), bSt, 0, 0.07, 0);
  put(new BoxGeometry(2.58, 0.92, 0.96), lacM, 0, 0.14 + 0.46, 0);
  put(new BoxGeometry(2.68, 0.08, 1.06), dSt, 0, 1.1, 0);
  // Gold front cornice
  put(new BoxGeometry(2.64, 0.06, 0.08), goldM, 0, 1.04, 0.48);
  put(new BoxGeometry(2.64, 0.06, 0.08), goldM, 0, 0.18, 0.48);

  // Recessed black front LED fascia + 10 Spectrum VU LED Columns
  put(new BoxGeometry(2.26, 0.66, 0.04), darkMetal, 0, 0.61, 0.48);
  const vuBars = [];
  const vuMats = [];
  for (let i = 0; i < 10; i++) {
    const bm = new MeshBasicMaterial({ color: i % 2 ? '#fe566a' : '#ffd978' });
    const bar = new Mesh(new BoxGeometry(0.13, 0.54, 0.03), bm);
    bar.position.set(-0.945 + i * 0.21, 0.35, 0.515);
    group.add(bar);
    vuBars.push(bar);
    vuMats.push(bm);
  }

  // Side neon LED strips
  for (const sgn of [-1, 1]) {
    put(new BoxGeometry(0.035, 0.84, 0.05), glowCrimson, sgn * 1.29, 0.61, 0.48);
  }

  // Twin Turntable Decks & Spinning Vinyl Platters (top surface y = 1.14)
  const vinylTex = buildVinylTexture(CanvasTexture, SRGBColorSpace);
  const vinylMat = new MeshStandardMaterial({ map: vinylTex, roughness: 0.3, metalness: 0.25 });
  const platters = [];
  const plattersGlow = [];
  for (const sgn of [-1, 1]) {
    const tx = sgn * 0.82;
    put(new BoxGeometry(0.76, 0.05, 0.72), darkMetal, tx, 1.165, 0.04);
    put(new CylinderGeometry(0.285, 0.295, 0.025, 28), silverM, tx, 1.202, 0.04);
    const vinyl = new Mesh(new CylinderGeometry(0.265, 0.265, 0.012, 28), vinylMat);
    vinyl.position.set(tx, 1.22, 0.04);
    group.add(vinyl);
    platters.push(vinyl);

    const cueRing = new Mesh(
      new TorusGeometry(0.29, 0.01, 8, 28).rotateX(Math.PI / 2),
      new MeshBasicMaterial({ color: sgn < 0 ? '#fe566a' : '#38bdf8' })
    );
    cueRing.position.set(tx, 1.196, 0.04);
    group.add(cueRing);
    plattersGlow.push(cueRing);

    // Chrome spindle & tonearm
    put(new CylinderGeometry(0.014, 0.014, 0.04, 10), goldM, tx, 1.235, 0.04);
    put(new CylinderGeometry(0.035, 0.04, 0.035, 12), silverM, tx + sgn * 0.26, 1.21, -0.2);
    const arm = new Mesh(new BoxGeometry(0.018, 0.014, 0.34), silverM);
    arm.position.set(tx + sgn * 0.19, 1.235, -0.05);
    arm.rotation.y = sgn * -0.34;
    group.add(arm);
  }

  // Central Mixer & FxSound Tactile Deck
  put(new BoxGeometry(0.72, 0.06, 0.72), darkMetal, 0, 1.17, 0.04);
  // Crossfader & 2 Channel Faders
  put(new BoxGeometry(0.28, 0.012, 0.02), silverM, 0, 1.205, 0.31);
  put(new BoxGeometry(0.04, 0.026, 0.05), goldM, 0, 1.212, 0.31);
  for (const fx of [-0.14, 0.14]) {
    put(new BoxGeometry(0.02, 0.012, 0.22), silverM, fx, 1.205, 0.12);
    put(new BoxGeometry(0.05, 0.025, 0.03), glowCrimson, fx, 1.212, 0.14);
    for (let k = 0; k < 3; k++) {
      put(new CylinderGeometry(0.024, 0.026, 0.028, 12), silverM, fx, 1.21, -0.08 - k * 0.075);
    }
  }
  // Glowing hot-cue pads
  const pads = [];
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 4; c++) {
      const pm = new MeshBasicMaterial({ color: (r + c) % 2 ? '#e63462' : '#38bdf8' });
      const pad = new Mesh(new BoxGeometry(0.06, 0.014, 0.055), pm);
      pad.position.set(-0.12 + c * 0.08, 1.208, 0.21 - r * 0.075);
      group.add(pad);
      pads.push(pm);
    }
  }

  // Tilted FxSound Studio Console Laptop / Monitor on Rear Stand
  put(new BoxGeometry(0.54, 0.06, 0.22), silverM, 0, 1.22, -0.32);
  const lid = new Group();
  lid.position.set(0, 1.25, -0.4);
  lid.rotation.x = -0.38;
  group.add(lid);
  const lidBack = new Mesh(new BoxGeometry(0.74, 0.46, 0.03), dSt);
  lidBack.position.set(0, 0.23, 0);
  lid.add(lidBack);
  const scrHelper = createScreenCanvas(CanvasTexture, SRGBColorSpace);
  const scrMesh = new Mesh(new PlaneGeometry(0.68, 0.41), new MeshBasicMaterial({ map: scrHelper.tx }));
  scrMesh.position.set(0, 0.23, 0.018);
  lid.add(scrMesh);

  // Twin Wing Studio Speaker Stacks with Bass Woofers
  const woofers = [];
  for (const sgn of [-1, 1]) {
    const spk = new Group();
    spk.position.set(sgn * 1.66, 0, 0.1);
    spk.rotation.y = sgn * -0.18;
    group.add(spk);

    const stand = new Mesh(new BoxGeometry(0.56, 0.72, 0.56), lacM);
    stand.position.y = 0.36;
    stand.castShadow = true;
    stand.receiveShadow = true;
    spk.add(stand);

    const cab = new Mesh(new BoxGeometry(0.52, 0.92, 0.48), dSt);
    cab.position.y = 1.18;
    cab.castShadow = true;
    cab.receiveShadow = true;
    spk.add(cab);

    const trim = new Mesh(new BoxGeometry(0.54, 0.05, 0.5), goldM);
    trim.position.y = 1.65;
    spk.add(trim);

    const wRing = new Mesh(
      new TorusGeometry(0.16, 0.018, 10, 24),
      new MeshBasicMaterial({ color: '#fe566a' })
    );
    wRing.position.set(0, 1.04, 0.245);
    spk.add(wRing);

    const woofer = new Mesh(new CylinderGeometry(0.145, 0.11, 0.04, 24).rotateX(Math.PI / 2), darkMetal);
    woofer.position.set(0, 1.04, 0.242);
    spk.add(woofer);
    woofers.push(woofer);

    const tweeter = new Mesh(new CylinderGeometry(0.075, 0.075, 0.03, 18).rotateX(Math.PI / 2), goldM);
    tweeter.position.set(0, 1.4, 0.242);
    spk.add(tweeter);
  }

  // Luminous Ground Aura Ring & Floating Pill Sign
  const glowTex = typeof radialGlow === 'function' ? radialGlow() : null;
  const auraMat = new MeshBasicMaterial({
    map: glowTex,
    color: '#ff96b0',
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    opacity: 0.38
  });
  const auraRing = new Mesh(new PlaneGeometry(4.4, 2.8).rotateX(-Math.PI / 2), auraMat);
  auraRing.position.set(0, 0.025, 0.22);
  group.add(auraRing);

  const sign = new Sprite(
    new SpriteMaterial({
      map: buildSignTexture(CanvasTexture, SRGBColorSpace),
      transparent: true,
      depthWrite: false,
      toneMapped: false
    })
  );
  sign.scale.set(3.4, 0.56, 1);
  sign.position.set(0, 2.55, 0);
  group.add(sign);

  const djLight = typeof PointLight !== 'undefined' ? new PointLight('#ff4d79', 0.9, 10, 1.5) : null;
  if (djLight) {
    djLight.position.set(0, 2.1, 0.6);
    group.add(djLight);
  }

  // Generous invisible Raycast Hit Box
  const hit = new Mesh(
    new BoxGeometry(4.0, 2.4, 1.9),
    new MeshBasicMaterial({ visible: false })
  );
  hit.position.set(0, 1.15, 0.06);
  hit.userData.djBooth = true;
  group.add(hit);

  if (typeof colliderBox === 'function') {
    colliderBox(DJ_POS.x, DJ_POS.z, 3.85, 1.55);
  }

  let lastScreenPaint = 0;

  function update(elapsed = 0, dt = 0.016) {
    const spec = dsp ? dsp.sampleSpectrum() : null;
    const meter = dsp ? dsp.getMeter() : { bass: 0, mid: 0, high: 0, rms: 0, playing: false };
    const active = Boolean(meter.playing && meter.rms > 0.02);

    // Floating sign & aura pulse
    sign.position.y = 2.55 + 0.045 * Math.sin(elapsed * 2.1);
    auraMat.opacity = 0.30 + 0.14 * (0.5 + 0.5 * Math.sin(elapsed * 2.6)) + meter.bass * 0.22;

    // Spin turntable vinyls continuously when playing, or slow standby spin
    const spinSpd = active ? 2.8 + meter.bass * 2.2 : 0.35;
    for (const pl of platters) {
      pl.rotation.y -= dt * spinSpd;
    }

    // Bass pump on studio speaker woofers
    const bump = 1 + (active ? meter.bass * 0.18 : 0.015 * Math.sin(elapsed * 3.0));
    for (const w of woofers) {
      w.scale.set(bump, bump, 1);
    }

    // 10-column 3D VU spectrum meters
    for (let i = 0; i < vuBars.length; i++) {
      const level = active
        ? Math.max(0.08, spec ? spec[i] : 0.1)
        : 0.10 + 0.08 * Math.sin(elapsed * 2.8 + i * 0.65);
      vuBars[i].scale.y = level * 1.25;
      vuBars[i].position.y = 0.33 + (level * 1.25 * 0.54) / 2;
      if (vuMats[i]?.color?.setHSL) {
        const hue = (0.94 + i * 0.016 + (active ? elapsed * 0.06 : 0)) % 1;
        vuMats[i].color.setHSL(hue, 0.92, 0.54 + level * 0.18);
      }
    }

    // Hot-cue pads subtle chase
    for (let i = 0; i < pads.length; i++) {
      if (pads[i]?.color?.setHSL) {
        const hue = (i / pads.length + elapsed * (active ? 0.35 : 0.08)) % 1;
        pads[i].color.setHSL(hue, 0.9, active ? 0.6 : 0.45);
      }
    }

    if (djLight) {
      djLight.intensity = 0.65 + (active ? meter.bass * 1.8 : 0.25 * Math.sin(elapsed * 2));
      if (djLight.color?.setHSL) {
        djLight.color.setHSL((0.93 + elapsed * 0.04) % 1, 0.9, 0.58);
      }
    }

    // Refresh laptop canvas screen ~8 fps while playing or when state updates
    if (elapsed - lastScreenPaint > 0.14) {
      lastScreenPaint = elapsed;
      const st = dsp?.state;
      if (st) {
        scrHelper.paint(st.presetId?.toUpperCase() || 'FX', st.bandGains || [], spec, st.powerOn);
      }
    }
  }

  function getSvgDot() {
    return `<rect x="${(DJ_POS.x - 1.9).toFixed(1)}" y="${(DJ_POS.z - 0.9).toFixed(1)}" width="3.8" height="1.8" rx="0.5" fill="#fe566a" stroke="#ffd978" stroke-width="0.35"/>`;
  }

  return { group, hit, update, getSvgDot };
}
