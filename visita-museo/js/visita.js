/* Motor de la visita virtual. No contiene contenido: todo sale de VISITA_MUSEO (escenas.js)
 * y de VISITA_IMG (imagenes.js, generado por docs/visita-museo/build-images.py). */
(function () {
  'use strict';
  const D = window.VISITA_MUSEO;
  const IMG = window.VISITA_IMG || { escenas: {}, piezas: {} };
  const $ = (id) => document.getElementById(id);
  const root = $('vm');
  const el = {
    welcome: $('vm-welcome'), viewer: $('vm-viewer'), stage: $('vm-stage'), world: $('vm-world'), photo: $('vm-photo'),
    fill: $('vm-fill'), points: $('vm-points'), sector: $('vm-sector'), scene: $('vm-scene'), hint: $('vm-hint'),
    map: $('vm-map'), mapBody: $('vm-map-body'), guide: $('vm-guide'), panel: $('vm-panel'), curtain: $('vm-curtain'),
    pending: $('vm-pending'), error: $('vm-error'), live: $('vm-live'), lightbox: $('vm-lightbox'), back: $('vm-back'),
    zoomback: $('vm-zoomback'), lscroll: $('vm-lscroll'), limg: $('vm-limg')
  };
  const QS = new URLSearchParams(location.search);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches || QS.get('movimiento') === '0';
  const embed = QS.get('embed') === '1';
  const coarse = window.matchMedia('(hover: none)').matches;
  const conn = navigator.connection || {};
  const slow = !!conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '');
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  const ease = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const sleep = (ms) => new Promise((r) => setTimeout(r, reduced ? 0 : ms));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const attr = (n, k, v) => n.setAttribute(k, String(v));

  const cam = { z: 1, tx: 0, ty: 0 };
  const pad = { r: 0, b: 0 };            // margen extra de desplazamiento cuando hay una ficha abierta
  let W = 0, H = 0, baseW = 0, baseH = 0, zMax = 2;
  let sceneId = null, scene = null, busy = false, epoch = 0;
  let anim = 0, animDone = null;
  let guideI = -1, savedCam = null, zoomFrom = null, openHs = null, openPt = null, openZoom = null, pendingRetry = null, pfGen = 0;
  const seen = new Set(), seenPieces = new Set(), views = {}, trail = [];

  /* ---------- Imágenes: variantes responsive, caché acotada y precarga limitada ---------- */
  const fileOf = (kind, id, v) => 'img/' + kind + '/' + id + '-' + Math.max(v[0], v[1]) + '.webp';
  function pick(kind, id, needW) {
    const m = IMG[kind][id];
    if (!m) return null;
    const v = m.v.find((x) => x[0] >= needW) || m.v[m.v.length - 1];
    return { url: fileOf(kind, id, v), w: v[0] };
  }
  const cache = new Map(); // url -> Promise<HTMLImageElement>; máximo 10 entradas
  function fetchImg(url) {
    if (cache.has(url)) { const p = cache.get(url); cache.delete(url); cache.set(url, p); return p; }
    const p = new Promise((res, rej) => {
      let tries = 0;
      const go = () => {
        const im = new Image();
        im.decoding = 'async';
        // decode() evita parpadeos al mostrarla, pero puede demorar en pestañas ocultas: nunca espera más de 1,2 s
        im.onload = () => Promise.race([im.decode ? im.decode().catch(() => {}) : 0, new Promise((r) => setTimeout(r, 1200))]).then(() => res(im));
        im.onerror = () => { if (tries++ < 1) setTimeout(go, 700); else { cache.delete(url); rej(new Error(url)); } };
        im.src = url;
      };
      go();
    });
    cache.set(url, p);
    while (cache.size > 10) cache.delete(cache.keys().next().value);
    return p;
  }
  // Ancho base que tendrá una escena en esta pantalla (misma fórmula que layout())
  // Cuánto se permite recortar: hasta `cap` veces el encuadre completo. Las fotos verticales en pantallas horizontales
  // se muestran casi completas (la foto no se sacrifica); las horizontales llenan la pantalla. Cada escena puede ajustar cap / capM.
  function capOf(sc, m) {
    sc = sc || {};
    if (W >= H) return sc.cap || 1.35;
    return sc.capM || (m.w >= m.h ? 2 : 1.15);
  }
  function baseWidthFor(m, sc) {
    const contain = Math.min(W / m.w, H / m.h), cover = Math.max(W / m.w, H / m.h);
    return m.w * Math.min(cover, contain * capOf(sc, m));
  }
  const sceneUrl = (id) => { const p = pick('escenas', id, baseWidthFor(IMG.escenas[id], D.escenas[id]) * DPR); return p && p.url; };
  async function prefetch() {
    if (slow || !scene) return;
    const gen = ++pfGen;
    const ids = [...new Set(scene.puntos.filter((p) => p.to && !p.back).map((p) => p.to))].slice(0, 3);
    for (const id of ids) {
      await sleep(400);
      if (gen !== pfGen || document.hidden) return;
      if (IMG.escenas[id]) await fetchImg(sceneUrl(id)).catch(() => {});
    }
  }

  /* ---------- Cámara ---------- */
  function layout() {
    const r = el.stage.getBoundingClientRect();
    W = r.width || window.innerWidth; H = r.height || window.innerHeight;
    if (!scene) return;
    baseW = baseWidthFor(scene.m, scene);
    baseH = baseW * (scene.m.h / scene.m.w);
    el.world.style.width = baseW + 'px';
    el.world.style.height = baseH + 'px';
    const top = scene.m.v[scene.m.v.length - 1][0];
    zMax = clamp((top / baseW) * 1.2, 1.6, 4); // el zoom máximo lo fija la resolución real de la foto
  }
  const bound = (c) => {
    const sw = baseW * c.z, sh = baseH * c.z, fw = W - pad.r, fh = H - pad.b; // fw/fh = área libre (sin la ficha)
    c.tx = sw <= fw ? (fw - sw) / 2 : clamp(c.tx, fw - sw, 0);
    c.ty = sh <= fh ? (fh - sh) / 2 : clamp(c.ty, fh - sh, 0);
    return c;
  };
  let declT = 0;
  function apply() {
    bound(cam);
    el.world.style.transform = 'translate3d(' + cam.tx + 'px,' + cam.ty + 'px,0) scale(' + cam.z + ')';
    el.world.style.setProperty('--iz', String(1 / cam.z));
    clearTimeout(declT);
    declT = setTimeout(() => { declutter(); maybeUpgrade(); }, 180);
  }
  const camFor = (x, y, z, ax, ay) => {
    z = clamp(z, 1, zMax);
    return bound({ z, tx: W * (ax == null ? .5 : ax) - (x / 100) * baseW * z, ty: H * (ay == null ? .5 : ay) - (y / 100) * baseH * z });
  };
  const centerOf = (c) => { c = c || cam; return { x: ((W / 2 - c.tx) / (baseW * c.z)) * 100, y: ((H / 2 - c.ty) / (baseH * c.z)) * 100, z: c.z }; };
  function stopAnim() {
    cancelAnimationFrame(anim);
    if (animDone) { const d = animDone; animDone = null; d(); } // nunca deja una promesa colgada
  }
  function flyTo(target, ms) {
    stopAnim();
    if (reduced || !ms) { Object.assign(cam, target); apply(); return Promise.resolve(); }
    const from = { z: cam.z, tx: cam.tx, ty: cam.ty }, t0 = performance.now();
    return new Promise((res) => {
      let wd = 0;
      const finish = () => { clearTimeout(wd); if (animDone === done) animDone = null; res(); };
      const done = () => { clearTimeout(wd); res(); };
      animDone = done;
      // Si la pestaña pasa a segundo plano el navegador pausa las animaciones: este temporizador completa el movimiento
      wd = setTimeout(() => { if (animDone === done) { cancelAnimationFrame(anim); Object.assign(cam, target); apply(); finish(); } }, ms + 500);
      const step = (now) => {
        const k = ease(clamp((now - t0) / ms, 0, 1));
        cam.z = from.z + (target.z - from.z) * k;
        cam.tx = from.tx + (target.tx - from.tx) * k;
        cam.ty = from.ty + (target.ty - from.ty) * k;
        apply();
        if (k < 1) anim = requestAnimationFrame(step);
        else finish();
      };
      anim = requestAnimationFrame(step);
    });
  }
  function zoomAt(px, py, nz) {
    nz = clamp(nz, 1, zMax);
    const k = nz / cam.z;
    cam.tx = px - (px - cam.tx) * k;
    cam.ty = py - (py - cam.ty) * k;
    cam.z = nz;
    apply();
  }
  const zoomCenter = (f) => { stopAnim(); zoomAt(W / 2, H / 2, cam.z * f); };

  // Sube de resolución solo cuando el zoom lo necesita (nunca descarga el máximo de entrada)
  async function maybeUpgrade() {
    if (!scene || busy || !scene.cur) return;
    const id = sceneId, need = baseW * cam.z * DPR;
    if (scene.cur.w >= need * .9) return;
    const nxt = pick('escenas', id, need);
    if (!nxt || nxt.w <= scene.cur.w) return;
    const prev = scene.cur;
    scene.cur = { url: nxt.url, w: nxt.w };
    try { await fetchImg(nxt.url); if (id === sceneId) el.photo.src = nxt.url; } catch (e) { scene.cur = prev; }
  }

  /* ---------- Puntos interactivos ---------- */
  const SVG = {
    go: '<path d="M9.4 6.6 8 8l4 4-4 4 1.4 1.4L14.800 12z"/>',
    back: '<path d="M14.600 6.600 16 8l-4 4 4 4-1.400 1.400L9.200 12z"/>',
    zoom: '<path d="M15.500 14h-.8l-.3-.3A6.500 6.500 0 1 0 14 15.500l.3.3v.8l5 5 1.500-1.500zM9.500 14A4.500 4.500 0 1 1 14 9.500 4.500 4.500 0 0 1 9.500 14zM10 7H9v2H7v1h2v2h1v-2h2V9h-2z"/>',
    piece: '<path d="M12 6C7.500 6 4 9.500 3 12c1 2.500 4.500 6 9 6s8-3.500 9-6c-1-2.500-4.500-6-9-6zm0 10a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm0-6.200a2.200 2.200 0 1 0 0 4.400 2.200 2.200 0 0 0 0-4.400z"/>',
    story: '<path d="M6 4h10a2 2 0 0 1 2 2v14H8a2 2 0 0 1-2-2zm2 2v9.100c.3-.1.600-.1 1-.1h7V6zm1 11a1 1 0 0 0 0 2h7v-2z"/>',
    audio: '<path d="M4 9v6h4l5 4V5L8 9zm12.500 3a4.500 4.500 0 0 0-2.500-4v8a4.500 4.500 0 0 0 2.500-4z"/>'
  };
  function buildPoints() {
    el.points.textContent = '';
    scene.puntos.forEach((p) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'vm-hs k-' + (p.back ? 'back' : p.type) + (p.x > 62 ? ' is-left' : '');
      if (seenPieces.has(p.piece)) b.classList.add('is-seen');
      b.dataset.id = p.id;
      b.style.left = p.x + '%';
      b.style.top = p.y + '%';
      attr(b, 'aria-label', p.label);
      b.innerHTML = '<span class="vm-hs-dot"><svg viewBox="0 0 24 24" aria-hidden="true">' + SVG[p.back ? 'back' : p.type] + '</svg></span><span class="vm-hs-label"></span>';
      b.lastChild.textContent = p.label;
      if (p.showAfter) b.hidden = true;
      b.addEventListener('click', () => activate(p, b));
      b.addEventListener('focus', () => ensureVisible(p));
      el.points.appendChild(b);
    });
    // En pantallas chicas, los botones de avanzar cercanos alternan su nombre arriba y abajo para no taparse
    const goNodes = Array.from(el.points.children).filter((n) => n.classList.contains('k-go')).sort((m, n) => parseFloat(m.style.left) - parseFloat(n.style.left));
    goNodes.forEach((n, i) => n.classList.add(i % 2 ? 'lab-down' : 'lab-up'));
  }
  const sectorOf = (id) => D.sectores.find((s) => s.escenas.includes(id)) || { id: '', museo: '', nombre: '' };
  const sectorName = (id) => { const s = sectorOf(id); return s.museo === s.nombre || !s.museo ? s.nombre : s.museo + ' · ' + s.nombre; };
  /* Dos museos = dos edificios: mapa, visita guiada y contadores se limitan al museo en el que se está. */
  const museos = D.museos || [];
  const museoOf = (id) => museos.find((m) => m.nombre === sectorOf(id).museo) || museos[0];
  const escenasDe = (m) => D.sectores.filter((s) => s.museo === m.nombre).reduce((a, s) => a.concat(s.escenas), []);
  const guiadaDe = (m) => (m ? D.guiada.filter((s) => museoOf(s.escena) === m) : D.guiada);
  let guideList = D.guiada;
  const F = window.VisitaFicha;
  const pieceRef = {}; // id de pieza -> { escena, punto } (primer punto que la muestra)
  function rebuildPieceRef() {
    Object.keys(pieceRef).forEach((k) => delete pieceRef[k]);
    Object.keys(D.escenas).forEach((sid) => D.escenas[sid].puntos.forEach((p) => { if (p.piece && !pieceRef[p.piece]) pieceRef[p.piece] = { escena: sid, punto: p.id }; }));
  }
  rebuildPieceRef();
  const hs = (id) => el.points.querySelector('[data-id="' + id + '"]');
  const pt = (id) => scene.puntos.find((p) => p.id === id);
  function ensureVisible(p) {
    const sx = cam.tx + (p.x / 100) * baseW * cam.z, sy = cam.ty + (p.y / 100) * baseH * cam.z, m = 80;
    if (sx < m || sx > W - m || sy < m || sy > H - m - 70) flyTo(camFor(p.x, p.y, cam.z), 350);
  }
  // Oculta las etiquetas que se pisan entre sí o tapan otro punto (la del punto enfocado siempre se ve)
  function declutter() {
    if (!scene) return;
    const nodes = Array.from(el.points.children).filter((n) => !n.hidden);
    const hit = (a, b) => a.left < b.right + 6 && a.right > b.left - 6 && a.top < b.bottom + 4 && a.bottom > b.top - 4;
    const dots = new Map(nodes.map((n) => [n, n.firstChild.getBoundingClientRect()]));
    const placed = [];
    nodes.sort((a, b) => (a.classList.contains('k-back') ? 1 : 0) - (b.classList.contains('k-back') ? 1 : 0));
    nodes.forEach((n) => {
      const r = n.lastChild.getBoundingClientRect();
      const clash = placed.some((t) => hit(r, t)) || nodes.some((m) => m !== n && hit(r, dots.get(m)));
      n.classList.toggle('is-hide', clash);
      if (!clash) placed.push(r);
    });
  }
  async function openPoint(pid) {
    const p = pt(pid);
    if (!p) return;
    if (p.showAfter && openZoom !== p.showAfter) await zoomTo(pt(p.showAfter)); // primero se acerca al sector que la contiene
    const n = hs(pid);
    if (n) openPiece(p, n);
  }
  function goToPiece(k) {
    const ref = pieceRef[k];
    if (!ref || busy) return;
    if (ref.escena === sceneId) openPoint(ref.punto);
    else goTo(ref.escena, null, { openPoint: ref.punto });
  }
  function activate(p, node) {
    if (busy) return;
    activity();
    el.hint.classList.add('is-gone');
    if (p.type === 'go') return goTo(p.to, p, { back: !!p.back });
    if (p.type === 'zoom') return zoomTo(p);
    return openPiece(p, node);
  }

  async function zoomTo(p) {
    busy = true;
    zoomFrom = savedCam ? { ...savedCam } : { z: cam.z, tx: cam.tx, ty: cam.ty }; // 'volver' regresa al encuadre general, no al de otra pieza
    openZoom = p.id;
    await flyTo(camFor(p.x, p.y, p.z || 2), 650);
    el.points.querySelectorAll('[data-id]').forEach((n) => {
      const q = pt(n.dataset.id);
      n.hidden = q.id === p.id ? true : (q.showAfter ? q.showAfter !== p.id : false);
    });
    el.zoomback.hidden = false;
    busy = false;
    say('Vista ampliada del sector.');
    declutter();
  }
  function resetZoomUi() {
    openZoom = null; zoomFrom = null;
    el.zoomback.hidden = true;
    if (scene) el.points.querySelectorAll('[data-id]').forEach((n) => { n.hidden = !!pt(n.dataset.id).showAfter; });
  }

  /* ---------- Cambio de sala ---------- */
    const showCurtain = (soft, next) => {
    el.curtain.className = 'vm-curtain is-on' + (soft ? ' is-soft' : '');
    $('vm-csector').textContent = sectorName(next.id);
    $('vm-cname').textContent = next.nombre;
  };
  const hideCurtain = () => el.curtain.classList.remove('is-on');
  function updateTrail(prev, id, isBack) {
    const i = trail.lastIndexOf(id);
    if (isBack && i >= 0) trail.length = i;
    else if (prev && prev !== id) trail.push(prev);
    if (trail.length > 30) trail.shift();
    renderBack();
  }
  function renderBack() {
    const top = trail[trail.length - 1];
    el.back.hidden = !top;
    if (top) {
      $('vm-back-name').textContent = D.escenas[top].nombre;
      attr(el.back, 'aria-label', 'Volver a: ' + D.escenas[top].nombre);
    }
  }

  const CANCEL = new Error('cancelado');
  let cancelNav = null;
  const showPending = (name) => { $('vm-pendtxt').textContent = 'Preparando «' + name + '»…'; el.pending.hidden = false; };
  const hidePending = () => { el.pending.hidden = true; };
  async function goTo(id, from, opts) {
    opts = opts || {};
    const next = D.escenas[id];
    if (next) next.id = id;
    if (!next || busy || (id === sceneId && !opts.force)) return;
    busy = true;
    const ep = epoch, alive = () => ep === epoch;
    if (scene) views[sceneId] = centerOf(savedCam || zoomFrom || cam); // recuerda el punto de observación (antes de abrir una ficha)
    const keep = scene ? { z: cam.z, tx: cam.tx, ty: cam.ty } : null;
    closePanel(true);
    pfGen++;
    const prev = scene ? sceneId : null;
    const soft = !!scene && sectorOf(sceneId).id === sectorOf(id).id;
    let pendT = 0, ready = false;
    const cancelled = new Promise((_, rej) => { cancelNav = () => rej(CANCEL); });
    cancelled.catch(() => {});
    try {
      const url = IMG.escenas[id] && sceneUrl(id);
      if (!url) throw new Error('sin imagen: ' + id);
      const pre = fetchImg(url);              // la sala de destino se descarga mientras la cámara se acerca
      pre.then(() => { ready = true; }, () => {});
      if (scene && from && !from.back) await flyTo(camFor(from.x, from.y, Math.min(zMax, Math.max(cam.z, 1) * 1.4, 1.8)), 550);
      if (!alive()) return;
      if (!ready) pendT = setTimeout(() => showPending(next.nombre), 250); // si demora, la escena actual sigue visible
      const im = await Promise.race([pre, cancelled]);
      clearTimeout(pendT); hidePending();
      if (!alive()) return;
      showCurtain(soft, next);
      await sleep(soft ? 240 : 460);
      if (!alive()) return;
      updateTrail(prev, id, !!opts.back);
      enterScene(id, url, im, opts);
      await sleep(60);
      if (!alive()) return;
      hideCurtain();
      flyTo(opts.end, 900);
      if (opts.openPoint) setTimeout(() => { if (alive() && sceneId === id) openPoint(opts.openPoint); }, 950);
    } catch (e) {
      clearTimeout(pendT); hidePending();
      if (!alive()) return;
      hideCurtain();
      if (e === CANCEL) { if (keep) flyTo(bound(keep), 450); } // vuelve a donde estaba
      else {
        pendingRetry = () => goTo(id, null, opts);
        el.error.hidden = false;
        $('vm-retry').focus({ preventScroll: true });
      }
    } finally {
      cancelNav = null;
      if (alive()) busy = false;
    }
  }

  function enterScene(id, url, im, opts) {
    sceneId = id;
    scene = D.escenas[id];
    scene.m = IMG.escenas[id];
    scene.cur = { url, w: im.naturalWidth };
    seen.add(id);
    el.photo.src = url;
    attr(el.photo, 'alt', scene.nombre);
    el.fill.style.backgroundImage = 'url("' + scene.m.lqip + '")'; // fondo borroso sin descarga extra
    const sc = sectorOf(id);
    el.sector.innerHTML = '<span class="vm-museo"></span><span></span>';
    el.sector.firstChild.textContent = sc.museo && sc.museo !== sc.nombre ? sc.museo + ' · ' : '';
    el.sector.lastChild.textContent = sc.nombre;
    el.scene.textContent = scene.nombre;
    buildPoints();
    resetZoomUi();
    layout();
    const f = opts.foco || views[id] || scene.foco || { x: 50, y: 50, z: 1 }; // vuelve al punto de observación anterior
    const end = camFor(f.x, f.y, f.z);
    opts.end = end;
    Object.assign(cam, reduced ? end : camFor(f.x, f.y, Math.min(zMax, end.z * 1.05)));
    apply();
    el.stage.classList.add('vm-reveal');
    setTimeout(() => el.stage.classList.remove('vm-reveal'), 4200);
    say('Sala: ' + scene.nombre + '. ' + sectorName(id));
    renderMap();
    try { history.replaceState(null, '', '#' + id); } catch (e) { /* iframe restringido */ }
    if (guideI >= 0) markGuidePoint();
    setTimeout(prefetch, 1200);
  }

  /* ---------- Fichas de piezas ---------- */
  const panelPad = () => (W > 720 ? { r: Math.min(420, W), b: 0 } : { r: 0, b: Math.min(H * .58, el.panel.offsetHeight || H * .5) });
  // Encuadra el punto en el centro del área libre (a la izquierda de la ficha, o sobre la hoja inferior en celular)
  const pieceCam = (p, z) => {
    const wide = W > 720;
    return camFor(p.x, p.y, z, wide ? (W - pad.r) / 2 / W : .5, wide ? .5 : (H - pad.b) / 2 / H);
  };
  function openPiece(p, node) {
    const d = D.piezas[p.piece];
    if (!d) return;
    if (openHs) openHs.classList.remove('is-active');
    openHs = node;
    openPt = p;
    node.classList.add('is-active');
    if (!savedCam) savedCam = { z: cam.z, tx: cam.tx, ty: cam.ty };
    $('vm-pkicker').textContent = scene.nombre;
    $('vm-ptitle').textContent = d.titulo;
    const fm = d.imgs ? { w: d.fw, h: d.fh, lqip: '' } : IMG.piezas[d.foto || p.piece];
    const box = $('vm-pimgbtn'), img = $('vm-pimg');
    box.classList.remove('is-ready', 'is-fail');
    box.style.backgroundImage = fm ? 'url("' + fm.lqip + '")' : '';
    box.style.aspectRatio = fm ? fm.w + ' / ' + fm.h : '';
    img.removeAttribute('src');
    attr(img, 'alt', d.fotoAlt || d.titulo);
    $('vm-pmore').open = false;
    F.fillMeta($('vm-pmeta'), d);
    const pdesc = $('vm-pdesc');
    pdesc.textContent = '';
    F.markdown(d.descripcion, pdesc);
    const rel = $('vm-prelist');
    rel.textContent = '';
    (d.vermas || []).filter((k) => pieceRef[k] && D.piezas[k]).forEach((k) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'vm-relchip' + (seenPieces.has(k) ? ' is-seen' : '');
      b.textContent = D.piezas[k].titulo;
      b.addEventListener('click', () => goToPiece(k));
      rel.appendChild(b);
    });
    $('vm-prel').hidden = !rel.children.length;
    const obsInside = F.fillExtra(d); // “Conocer más de su historia”: apartados solo si tienen contenido
    F.fillCaption(d);
    $('vm-pmore').hidden = !d.detalle || obsInside;
    const pdet = $('vm-pdetail');
    pdet.textContent = '';
    if (d.detalle) F.markdown(d.detalle, pdet);
    const au = $('vm-paudio');
    au.hidden = !d.audio;
    if (d.audio) au.src = d.audio; else au.removeAttribute('src');
    el.panel.hidden = false;
    root.classList.add('vm-panel-open');
    el.panel.scrollTop = 0;
    // La atención va a la pieza: se centra en el espacio libre que deja la ficha
    Object.assign(pad, panelPad());
    flyTo(pieceCam(p, Math.min(zMax, Math.max(cam.z, p.zoom || 1.6))), 700);
    $('vm-pclose').focus({ preventScroll: true });
    say('Ficha: ' + d.titulo);
    seenPieces.add(p.piece);
    if (fm) {
      const need = (W > 720 ? Math.min(420, W) : W) * DPR;
      const url = d.imgs ? F.pickUrl(d, need) : pick('piezas', d.foto || p.piece, need).url;
      fetchImg(url).then(() => { img.src = url; box.classList.add('is-ready'); }).catch(() => box.classList.add('is-fail'));
    } else box.classList.add('is-fail');
  }
  function closePanel(silent) {
    if (el.panel.hidden) return;
    el.panel.hidden = true;
    root.classList.remove('vm-panel-open');
    $('vm-paudio').pause();
    Object.assign(pad, { r: 0, b: 0 });
    if (savedCam && !silent) flyTo(bound(savedCam), 600).then(() => { if (cam.z < 1.05 && openZoom) resetZoomUi(); }); // restaura encuadre y zoom previos
    savedCam = null;
    if (openHs) { openHs.classList.remove('is-active'); openHs.classList.add('is-seen'); if (!silent) openHs.focus({ preventScroll: true }); }
    openHs = null; openPt = null;
  }

  /* ---------- Ampliación respetando la resolución real ---------- */
  function openLightboxWith({ url, alt, caption }, opener) {
    el.lightbox.opener = opener || document.activeElement;
    el.lscroll.classList.remove('is-zoom');
    el.limg.removeAttribute('style');
    attr(el.limg, 'alt', alt || '');
    el.limg.src = url;
    $('vm-lcap').textContent = caption || alt || '';
    el.lightbox.hidden = false;
    $('vm-lclose').focus();
  }
  function openLightbox() {
    const d = D.piezas[(openHs && pt(openHs.dataset.id).piece) || ''];
    if (!d) return;
    const key = d.foto || pt(openHs.dataset.id).piece;
    const url = d.imgs ? d.imgs[d.imgs.length - 1].url : fileOf('piezas', key, IMG.piezas[key].v[IMG.piezas[key].v.length - 1]);
    openLightboxWith({ url, alt: d.fotoAlt || d.titulo, caption: [d.titulo, d.fotoCap, d.fotoCredit].filter(Boolean).join(' · ') });
  }
  function toggleLightboxZoom() {
    const im = el.limg, fit = im.getBoundingClientRect().width;
    const native = im.naturalWidth / DPR;
    const zoomed = el.lscroll.classList.toggle('is-zoom');
    if (zoomed) im.style.width = clamp(native, fit, fit * 3) + 'px'; else im.removeAttribute('style');
  }
  function closeLightbox() {
    el.lightbox.hidden = true;
    const o = el.lightbox.opener;
    if (o && o.focus) o.focus({ preventScroll: true });
  }

  /* ---------- Mapa orientativo ---------- */
  function renderMap() {
    el.mapBody.textContent = '';
    const reach = new Set(scene ? scene.puntos.filter((p) => p.to).map((p) => p.to) : []);
    const m = museos.length ? museoOf(sceneId || D.inicio) : null;
    if (m) reach.add(m.inicio);
    el.map.querySelector('h2').textContent = m ? m.nombre : 'Recorrido orientativo';
    D.sectores.filter((s) => !m || s.museo === m.nombre).forEach((s) => {
      const box = document.createElement('div');
      box.className = 'vm-sector';
      box.innerHTML = '<h3></h3><div></div>';
      box.firstChild.textContent = s.nombre;
      s.escenas.forEach((id) => {
        const b = document.createElement('button');
        b.type = 'button';
        const now = id === sceneId, vis = seen.has(id), nxt = reach.has(id);
        b.className = 'vm-node' + (now ? ' is-now' : vis ? ' is-seen' : '') + (nxt && !now ? ' is-next' : '');
        b.textContent = vis || now || nxt ? D.escenas[id].nombre : 'Sala sin descubrir';
        b.disabled = !(vis || now || nxt);
        if (!b.disabled && !now) b.addEventListener('click', () => { toggleMap(false); goTo(id, null); });
        if (now) attr(b, 'aria-current', 'true');
        box.lastChild.appendChild(b);
      });
      el.mapBody.appendChild(box);
    });
    const mine = m ? escenasDe(m) : Object.keys(D.escenas);
    const myPieces = Object.keys(pieceRef).filter((k) => mine.includes(pieceRef[k].escena));
    $('vm-mapcount').textContent = mine.filter((id) => seen.has(id)).length + ' de ' + mine.length + ' salas visitadas · ' + myPieces.filter((k) => seenPieces.has(k)).length + ' de ' + myPieces.length + ' piezas examinadas';
    museos.filter((o) => o !== m).forEach((o) => {
      const sw = document.createElement('div');
      sw.className = 'vm-map-switch';
      sw.innerHTML = '<p></p><button type="button" class="vm-btn"></button>';
      sw.firstChild.textContent = 'Es otro edificio, con su propio recorrido.';
      sw.lastChild.textContent = 'Ir al ' + o.nombre;
      sw.lastChild.addEventListener('click', () => switchMuseo(o));
      el.mapBody.appendChild(sw);
    });
  }
  function switchMuseo(o) {
    if (busy) return;
    toggleMap(false); exitGuide(); closePanel(true);
    trail.length = 0; renderBack();
    goTo(o.inicio, null);
  }
  function toggleMap(open) {
    el.map.hidden = !open;
    attr($('vm-bmap'), 'aria-expanded', open);
    if (open) { renderMap(); el.guide.hidden = true; attr($('vm-bguide'), 'aria-expanded', false); el.map.querySelector('.vm-x').focus({ preventScroll: true }); }
  }

  /* ---------- Visita guiada ---------- */
  function showGuideStep() {
    const s = guideList[guideI];
    $('vm-gstep').textContent = 'Parada ' + (guideI + 1) + ' de ' + guideList.length + ' · ' + D.escenas[s.escena].nombre;
    $('vm-gtext').textContent = s.texto;
    $('vm-gprev').disabled = guideI === 0;
    $('vm-gnext').textContent = guideI === guideList.length - 1 ? 'Terminar' : 'Siguiente parada ›';
  }
  function markGuidePoint() {
    el.points.querySelectorAll('.is-pulse').forEach((n) => n.classList.remove('is-pulse'));
    const s = guideList[guideI];
    if (s && s.escena === sceneId && s.punto && hs(s.punto)) hs(s.punto).classList.add('is-pulse');
  }
  async function guideStep(i) {
    if (busy) return;
    if (i >= guideList.length) { exitGuide(); return; }
    guideI = clamp(i, 0, guideList.length - 1);
    showGuideStep();
    const s = guideList[guideI];
    el.guide.hidden = false;
    el.map.hidden = true;
    attr($('vm-bguide'), 'aria-expanded', true);
    if (s.escena !== sceneId) await goTo(s.escena, null, { foco: s.foco });
    else { closePanel(true); resetZoomUi(); await flyTo(camFor(s.foco.x, s.foco.y, s.foco.z), 900); }
    markGuidePoint();
  }
  function exitGuide() {
    guideI = -1;
    el.guide.hidden = true;
    attr($('vm-bguide'), 'aria-expanded', false);
    el.points.querySelectorAll('.is-pulse').forEach((n) => n.classList.remove('is-pulse'));
  }

  /* ---------- Utilidades de UI ---------- */
  const say = (t) => { el.live.textContent = ''; setTimeout(() => { el.live.textContent = t; }, 30); };
  let lastAct = Date.now(), idleT = 0;
  function activity() {
    lastAct = Date.now();
    if (root.classList.contains('vm-idle')) root.classList.remove('vm-idle');
    if (!idleT) idleT = setTimeout(checkIdle, 1000);
  }
  function checkIdle() {
    idleT = 0;
    if (el.viewer.hidden) return;
    const open = !el.panel.hidden || !el.map.hidden || !el.guide.hidden || !el.lightbox.hidden || root.querySelector('.vm-tools:focus-within, .vm-top:focus-within');
    if (!open && Date.now() - lastAct > 4500) root.classList.add('vm-idle');
    else idleT = setTimeout(checkIdle, 1000);
  }

  function start(opts) {
    opts = opts || {};
    epoch++;
    el.welcome.classList.add('is-out');
    el.viewer.hidden = false;
    setTimeout(() => { if (!el.viewer.hidden) el.welcome.hidden = true; }, 650);
    layout();
    activity();
    el.hint.classList.remove('is-gone');
    if (opts.guided) {
      guideList = guiadaDe(opts.museo || museos[0]);
      guideI = 0; showGuideStep();
      el.guide.hidden = false; attr($('vm-bguide'), 'aria-expanded', true);
      goTo(guideList[0].escena, null, { foco: guideList[0].foco }).then(markGuidePoint);
    } else goTo(opts.scene || (opts.museo && opts.museo.inicio) || D.inicio, null, opts.openPoint ? { openPoint: opts.openPoint } : undefined);
    setTimeout(() => el.hint.classList.add('is-gone'), 9000);
  }
  function home() {
    epoch++; busy = false; pfGen++;
    stopAnim();
    closePanel(true); exitGuide(); toggleMap(false);
    if (!el.lightbox.hidden) closeLightbox();
    hideCurtain();
    hidePending();
    el.error.hidden = true;
    resetZoomUi();
    scene = null; sceneId = null; trail.length = 0; renderBack();
    el.welcome.hidden = false;
    requestAnimationFrame(() => el.welcome.classList.remove('is-out'));
    el.viewer.hidden = true;
    const first = $('vm-choose').querySelector('button');
    if (first) first.focus({ preventScroll: true });
  }

  /* ---------- Eventos de la escena ---------- */
  const ptrs = new Map();
  let pinch = 0;
  const dist = () => { const [a, b] = [...ptrs.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  el.stage.addEventListener('pointerdown', (e) => {
    activity();
    el.hint.classList.add('is-gone');
    if (embed && coarse) root.classList.add('vm-active'); // en táctil embebido, el primer toque activa la exploración
    if (e.target.closest('.vm-hs') || !scene || busy) return;
    stopAnim();
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    el.stage.setPointerCapture(e.pointerId);
    el.stage.classList.add('is-drag');
    if (ptrs.size === 2) pinch = dist();
  });
  el.stage.addEventListener('pointermove', (e) => {
    activity();
    if (!ptrs.has(e.pointerId)) return;
    const p = ptrs.get(e.pointerId);
    if (ptrs.size === 1) { cam.tx += e.clientX - p.x; cam.ty += e.clientY - p.y; apply(); }
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2) {
      const d = dist(), [a, b] = [...ptrs.values()], r = el.stage.getBoundingClientRect();
      if (pinch) zoomAt((a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, cam.z * (d / pinch));
      pinch = d;
    }
  });
  const endPtr = (e) => { ptrs.delete(e.pointerId); pinch = 0; if (!ptrs.size) el.stage.classList.remove('is-drag'); };
  el.stage.addEventListener('pointerup', endPtr);
  el.stage.addEventListener('pointercancel', endPtr);
  el.stage.addEventListener('wheel', (e) => {
    if (!scene || busy) return;
    if (embed && !(e.ctrlKey || e.metaKey)) return; // dentro de un iframe, la rueda sigue desplazando la página
    e.preventDefault();
    activity();
    stopAnim();
    const r = el.stage.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, cam.z * Math.exp(-e.deltaY * .0016));
    if (cam.z < 1.05 && openZoom) resetZoomUi();
  }, { passive: false });
  el.stage.addEventListener('dblclick', (e) => {
    if (!scene || busy || e.target.closest('.vm-hs')) return;
    const r = el.stage.getBoundingClientRect();
    if (cam.z > 1.3) { flyTo(bound(centerView()), 450); resetZoomUi(); return; }
    const x = ((e.clientX - r.left - cam.tx) / (baseW * cam.z)) * 100, y = ((e.clientY - r.top - cam.ty) / (baseH * cam.z)) * 100;
    flyTo(camFor(x, y, Math.min(zMax, 2)), 450);
  });
  const centerView = () => { const f = scene.foco || { x: 50, y: 50 }; return camFor(f.x, f.y, 1); };
  el.stage.addEventListener('keydown', (e) => {
    if (!scene || busy || e.target !== el.stage) return;
    const k = e.key, s = 70;
    if (k === 'ArrowLeft') cam.tx += s; else if (k === 'ArrowRight') cam.tx -= s;
    else if (k === 'ArrowUp') cam.ty += s; else if (k === 'ArrowDown') cam.ty -= s;
    else if (k === '+' || k === '=') zoomCenter(1.25);
    else if (k === '-' || k === '_') zoomCenter(.8);
    else if (k === '0') { flyTo(centerView(), 400); resetZoomUi(); return e.preventDefault(); }
    else return;
    e.preventDefault(); stopAnim(); apply();
  });
  root.addEventListener('pointermove', activity, { passive: true });
  root.addEventListener('keydown', activity, { passive: true });
  root.addEventListener('touchstart', activity, { passive: true });
  let rzT = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rzT);
    rzT = setTimeout(() => {
      if (!scene) return;
      const c = centerOf();
      layout();
      Object.assign(pad, el.panel.hidden ? { r: 0, b: 0 } : panelPad());
      Object.assign(cam, openPt && !el.panel.hidden ? pieceCam(openPt, cam.z) : camFor(c.x, c.y, c.z)); // con una ficha abierta, la pieza vuelve al área libre
      apply();
    }, 80);
  });

  /* ---------- Controles ---------- */
  $('vm-zin').addEventListener('click', () => zoomCenter(1.35));
  $('vm-zout').addEventListener('click', () => { zoomCenter(.74); if (cam.z < 1.05 && openZoom) resetZoomUi(); });
  $('vm-home').addEventListener('click', home);
  $('vm-release').addEventListener('click', () => root.classList.remove('vm-active'));
  $('vm-errhome').addEventListener('click', home);
  $('vm-pendx').addEventListener('click', () => { if (cancelNav) cancelNav(); });
  $('vm-retry').addEventListener('click', () => { el.error.hidden = true; if (pendingRetry) pendingRetry(); });
  el.back.addEventListener('click', () => { const top = trail[trail.length - 1]; if (top) goTo(top, null, { back: true }); });
  el.zoomback.addEventListener('click', () => { if (busy) return; flyTo(bound(zoomFrom || centerView()), 550); resetZoomUi(); });
  $('vm-bmap').addEventListener('click', () => toggleMap(el.map.hidden));
  $('vm-bguide').addEventListener('click', () => {
    if (guideI >= 0 && !el.guide.hidden) { el.guide.hidden = true; attr($('vm-bguide'), 'aria-expanded', false); }
    else {
      if (guideI < 0) guideList = guiadaDe(museoOf(sceneId));
      guideStep(guideI < 0 ? Math.max(0, guideList.findIndex((s) => s.escena === sceneId)) : guideI);
    }
  });
  const bdots = $('vm-bdots');
  const setLabels = (on) => { el.stage.classList.toggle('vm-labels', on); attr(bdots, 'aria-pressed', on); };
  setLabels(coarse); // en pantallas táctiles las etiquetas no dependen del hover
  bdots.addEventListener('click', () => setLabels(!el.stage.classList.contains('vm-labels')));
  $('vm-gprev').addEventListener('click', () => guideStep(guideI - 1));
  $('vm-gnext').addEventListener('click', () => guideStep(guideI + 1));
  $('vm-gfree').addEventListener('click', () => { exitGuide(); $('vm-bguide').focus({ preventScroll: true }); });
  root.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.close === 'map') { toggleMap(false); $('vm-bmap').focus({ preventScroll: true }); }
    else { exitGuide(); $('vm-bguide').focus({ preventScroll: true }); }
  }));
  $('vm-pclose').addEventListener('click', () => closePanel());
  $('vm-pimgbtn').addEventListener('click', openLightbox);
  el.lscroll.addEventListener('click', toggleLightboxZoom);
  $('vm-lclose').addEventListener('click', closeLightbox);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && !el.lightbox.hidden) { e.preventDefault(); $('vm-lclose').focus(); return; }
    if (e.key !== 'Escape') return;
    if (!el.lightbox.hidden) closeLightbox();
    else if (!el.panel.hidden) closePanel();
    else if (!el.map.hidden) { toggleMap(false); $('vm-bmap').focus({ preventScroll: true }); }
    else if (!el.zoomback.hidden) el.zoomback.click();
  });

  // Pantalla completa; si el navegador o el iframe no la permiten, se ofrece abrir en una pestaña
  const bf = $('vm-bfull'), bo = $('vm-bopen');
  if (document.fullscreenEnabled) {
    bf.hidden = false;
    bf.addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen(); else root.requestFullscreen().catch(() => {}); });
  }
  if (embed || (!document.fullscreenEnabled && window.top !== window.self)) {
    bo.hidden = false;
    bo.href = location.pathname; // la misma visita, sin el modo embebido
  }
  if (D.ambient) {
    const bs = $('vm-bsound'), au = new Audio(D.ambient);
    au.loop = true; au.volume = .35;
    bs.hidden = false;
    bs.addEventListener('click', () => { const on = au.paused; (on ? au.play() : Promise.resolve(au.pause())).catch(() => {}); attr(bs, 'aria-pressed', on); });
  }

  /* ---------- Bienvenida ---------- */
  $('vm-wtitle').textContent = D.titulo;
  $('vm-wkicker').textContent = D.subtitulo;
  $('vm-wintro').textContent = D.intro;
  const q = QS.get('escena') || location.hash.slice(1);
  const deepLink = !!(q && D.escenas[q]) || !!QS.get('vista-previa'); // con enlace directo la bienvenida no se muestra: no se descarga su imagen
  const wi = $('vm-wimg'), wm = IMG.escenas[D.portada];
  if (wm && !deepLink) {
    wi.srcset = wm.v.map((v) => fileOf('escenas', D.portada, v) + ' ' + v[0] + 'w').join(', ');
    wi.sizes = '100vw';
    wi.width = wm.w; wi.height = wm.h;
    root.style.setProperty('--lqip', 'url("' + wm.lqip + '")');
    // Con la bienvenida ya visible, se adelanta la primera sala (prioridad a la escena inicial)
    wi.addEventListener('load', () => setTimeout(() => { if (!scene && IMG.escenas[D.inicio]) { layout(); fetchImg(sceneUrl(D.inicio)).catch(() => {}); } }, 300));
  }
  wi.addEventListener('error', () => { wi.hidden = true; });
  museos.forEach((m) => {
    const card = document.createElement('article');
    card.className = 'vm-card';
    const mi = IMG.escenas[m.portada];
    if (mi && !deepLink) {
      const im = document.createElement('img');
      im.alt = ''; im.decoding = 'async'; im.loading = 'lazy';
      im.src = fileOf('escenas', m.portada, mi.v[0]);
      im.width = mi.w; im.height = mi.h;
      card.appendChild(im);
    }
    const body = document.createElement('div');
    body.className = 'vm-card-body';
    body.innerHTML = '<p class="vm-kicker"></p><h2></h2><p></p><div class="vm-welcome-actions"><button type="button" class="vm-btn vm-btn-main">Entrar</button><button type="button" class="vm-btn">Visita guiada</button></div>';
    body.children[0].textContent = m.rotulo;
    body.children[1].textContent = m.nombre;
    body.children[2].textContent = m.descripcion;
    const bs = body.querySelectorAll('button');
    bs[0].setAttribute('aria-label', 'Entrar al ' + m.nombre);
    bs[1].setAttribute('aria-label', 'Visita guiada del ' + m.nombre);
    bs[0].addEventListener('click', () => start({ museo: m }));
    bs[1].addEventListener('click', () => start({ guided: true, museo: m }));
    card.appendChild(body);
    $('vm-choose').appendChild(card);
  });

  // API mínima para integraciones y pruebas
  window.VisitaMuseo = {
    ir: (id) => { if (el.viewer.hidden) start({ scene: id }); else goTo(id, null); },
    lightbox: openLightboxWith,
    estado: () => ({ sala: sceneId, cam: { ...cam }, base: { w: baseW, h: baseH }, ocupado: busy, historial: trail.slice(), vistas: [...seen] })
  };
  if (embed) root.classList.add('vm-embed');
  if (coarse) root.classList.add('vm-coarse');
  // Los datos publicados (API) se combinan antes de arrancar; si la API no responde se usa el contenido de escenas.js
  F.ready.then(() => {
    rebuildPieceRef();
    const pv = F.info.preview;
    if (pv && pv.error) { $('vm-wintro').textContent = 'La vista previa requiere haber iniciado sesión en el administrador.'; return; }
    if (pv) { root.classList.add('vm-preview'); layout(); start({ scene: pv.escena, openPoint: pv.punto }); }
    else if (QS.get('modo') === 'guiada') { layout(); start({ guided: true, museo: museos.find((m) => m.id === QS.get('museo')) || museos[0] }); }
    else if (museos.some((m) => m.id === QS.get('museo'))) { layout(); start({ museo: museos.find((m) => m.id === QS.get('museo')) }); }
    else if (deepLink) { layout(); start({ scene: q }); }
  });
})();
