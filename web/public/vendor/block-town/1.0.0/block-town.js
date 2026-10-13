/*!
 * block-town.js 1.0.0
 * ブロックで組んだ街並みを斜め上から見た、FV の背景。three@0.147.0 の global build (window.THREE) を使います。
 *
 *   var town = BlockTown.mount(element, { quiet: [copyElement] });
 *   town.pause(); town.play(); town.destroy();
 *
 * - 上の面は 03 の色。横の面は、その色を少し暗くした同じ青みの灰色で塗り分けます (光と影の計算はしません)。
 * - quiet に渡した要素 (見出しとパネル) の後ろは、低い家と空き地だけにします。線路も通しません。
 * - カメラは 80 秒でゆっくり行って戻り、電車が走ります。「動きを減らす」の設定では、止まった状態で始めます。
 *   画面の外にある時と、別のタブを見ている時は止まります。
 */
(function (global) {
  'use strict';

  var VERSION = '1.0.0';
  var C = { white: '#FFFFFF', gray: '#F3F4F5', rule: '#D9DDE1', soft: '#5F6B75', ink: '#2B2F33', teal: '#1D8282', tealDeep: '#176C6C' };
  // 面の色: [上, 手前 (+z), 右 (+x)]。カメラは +x +z の側から見下ろすので、この 3 面が見える。
  // 上の面は 03 の色。横の面は、その色を少し暗くした色 (同じ青みの灰色) で、立体に見せる
  var KINDS = {
    wall: [C.white, '#E4E7EA', '#CBD0D5'],
    window: [C.white, '#CDD2D7', '#B4BBC2'],
    roof: [C.rule, '#C4CAD0', '#AFB6BD'],
    slab: ['#E8EBED', '#CBD0D5', '#CBD0D5'],
    rail: ['#A3ABB3', '#A3ABB3', '#A3ABB3'],
    pillar: [C.white, '#E4E7EA', '#CBD0D5'],
    platform: [C.white, C.rule, '#CBD0D5'],
    trainTeal: [C.white, C.teal, C.tealDeep],
    trainInk: [C.white, C.soft, C.ink]
  };
  var HEIGHT = { platform: 0.5 }, WIDTH = { pillar: 0.6 };

  function rng(seed) {
    return function () {
      seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  // 1 マスのブロック。少し小さくして、すき間に地の色が見えるようにする (ブロックの継ぎ目)
  function cubeGeometry(THREE, faces, size, height) {
    var g = new THREE.BoxGeometry(size, height, size);
    g.translate(0, height / 2, 0);
    var top = new THREE.Color(faces[0]), front = new THREE.Color(faces[1]), side = new THREE.Color(faces[2]);
    var order = [side, side, top, top, front, front], colors = []; // BoxGeometry の面の順: +x, -x, +y, -y, +z, -z
    order.forEach(function (c) { for (var i = 0; i < 4; i++) colors.push(c.r, c.g, c.b); });
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return g;
  }
  function inPoly(x, z, poly) {
    var inside = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][0], zi = poly[i][1], xj = poly[j][0], zj = poly[j][1];
      if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
    }
    return inside;
  }

  /* ------------------------------------------------------------ 街を作る (座標は街の真ん中が 0) */
  function buildTown(size, seed, zones, view) {
    var r = rng(seed), mid = size >> 1;
    var blocks = {}; Object.keys(KINDS).forEach(function (k) { blocks[k] = []; });
    var used = new Uint8Array(size * size), at = function (x, z) { return z * size + x; };
    var put = function (kind, x, y, z) { blocks[kind].push(x - mid, y, z - mid); };
    var inside = function (x, z) { return x >= 0 && z >= 0 && x < size && z < size; };

    // 見出しとパネルの後ろ (quiet): 低い家だけにして、文字を読みやすくする。線路もここを避ける
    var pb = { x0: 0, x1: 0, z0: 0, z1: 0 };
    if (zones && zones.length) {
      pb = { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity };
      zones.forEach(function (zone) { zone.forEach(function (p) { pb.x0 = Math.min(pb.x0, p[0]); pb.x1 = Math.max(pb.x1, p[0]); pb.z0 = Math.min(pb.z0, p[1]); pb.z1 = Math.max(pb.z1, p[1]); }); });
    }

    // 線路: 見出しの後ろを避けて、地上の 2 本 (x の向き) と高架の 1 本 (z の向き)。どれも複線
    var clampRow = function (v) { return Math.max(4, Math.min(size - 6, Math.round(v))); };
    var zA = clampRow(pb.z1 + mid + 7), zB = clampRow(pb.z0 + mid - 9), xC = clampRow(pb.x1 + mid + 10);
    var tracks = [
      { axis: 'x', at: zA, y: 0, dir: 1 }, { axis: 'x', at: zA + 1, y: 0, dir: -1 },
      { axis: 'x', at: zB, y: 0, dir: -1 }, { axis: 'x', at: zB + 1, y: 0, dir: 1 },
      { axis: 'z', at: xC, y: 3, dir: 1 }, { axis: 'z', at: xC + 1, y: 3, dir: -1 }
    ];
    tracks.forEach(function (t) {
      for (var i = 0; i < size; i++) {
        var x = t.axis === 'x' ? i : t.at, z = t.axis === 'x' ? t.at : i;
        if (t.y === 0) { used[at(x, z)] = 2; if (inside(x, z - 1)) used[at(x, z - 1)] = used[at(x, z - 1)] || 1; if (inside(x, z + 1)) used[at(x, z + 1)] = used[at(x, z + 1)] || 1; }
        else {
          if (used[at(x, z)] !== 2) used[at(x, z)] = used[at(x, z)] || 1;
          if (i % 5 === 0 && t.dir === 1 && used[at(x, z)] !== 2) for (var y = 0; y < t.y; y++) { put('pillar', x, y, z); put('pillar', x + 1, y, z); }
        }
      }
    });
    // 駅のホーム (地上の線路の脇の低い台)
    [[xC - 24, zA - 1], [xC + 6, zA + 2], [xC - 14, zB - 1]].forEach(function (p) {
      for (var i = 0; i < 8; i++) if (inside(p[0] + i, p[1]) && used[at(p[0] + i, p[1])] !== 2) { used[at(p[0] + i, p[1])] = 1; put('platform', p[0] + i, 0, p[1]); }
    });

    // 道: 間隔をばらつかせた格子 (下町らしく、細かい区画)
    for (var rx = 1 + Math.floor(r() * 4); rx < size; rx += 7 + Math.floor(r() * 4)) for (var z2 = 0; z2 < size; z2++) used[at(rx, z2)] = used[at(rx, z2)] || 1;
    for (var rz = 1 + Math.floor(r() * 4); rz < size; rz += 6 + Math.floor(r() * 4)) for (var x2 = 0; x2 < size; x2++) used[at(x2, rz)] = used[at(x2, rz)] || 1;

    function free(x0, z0, w, d) {
      if (x0 < 0 || z0 < 0 || x0 + w > size || z0 + d > size) return false;
      for (var z = z0; z < z0 + d; z++) for (var x = x0; x < x0 + w; x++) if (used[at(x, z)]) return false;
      return true;
    }
    function mark(x0, z0, w, d) { for (var z = z0; z < z0 + d; z++) for (var x = x0; x < x0 + w; x++) used[at(x, z)] = 1; }
    function house(x0, z0, w, d) { // 戸建て: 2 段の壁と、段々の切妻屋根
      for (var z = z0; z < z0 + d; z++) for (var x = x0; x < x0 + w; x++) for (var y = 0; y < 2; y++) {
        var edge = x === x0 || x === x0 + w - 1 || z === z0 || z === z0 + d - 1;
        if (!edge && y === 0) continue;
        put(edge && y === 1 && (x + z) % 2 === 0 ? 'window' : 'wall', x, y, z);
      }
      var alongX = w >= d, half = (alongX ? d : w) / 2;
      for (var k = 0; k < Math.ceil(half); k++) for (var z3 = z0; z3 < z0 + d; z3++) for (var x3 = x0; x3 < x0 + w; x3++) {
        var dist = alongX ? Math.min(z3 - z0, z0 + d - 1 - z3) : Math.min(x3 - x0, x0 + w - 1 - x3);
        if (dist === k || (dist > k && k === Math.ceil(half) - 1)) put('roof', x3, 2 + k, z3);
      }
    }
    function flat(x0, z0, w, d, h, windows) { // アパート・マンション・小さなビル
      for (var y = 0; y < h; y++) for (var z = z0; z < z0 + d; z++) for (var x = x0; x < x0 + w; x++) {
        var edge = x === x0 || x === x0 + w - 1 || z === z0 || z === z0 + d - 1;
        if (!edge && y < h - 1) continue; // 中は描かない
        put(windows && edge && y > 0 && y < h - 1 && ((x - x0) + (z - z0)) % 2 === 1 ? 'window' : 'wall', x, y, z);
      }
      if (h >= 4 && r() < 0.5) put('wall', x0 + 1, h, z0 + 1); // 屋上の小屋
    }
    for (var z0 = 0; z0 < size; z0++) for (var x0 = 0; x0 < size; x0++) {
      if (used[at(x0, z0)]) continue;
      if (view && !inPoly(x0 - mid + 0.5, z0 - mid + 0.5, view)) { mark(x0, z0, 1, 1); continue; } // 画面に入らない所は作らない
      var quiet = zones && zones.some(function (zone) { return inPoly(x0 - mid + 0.5, z0 - mid + 0.5, zone); });
      var w = 2 + Math.floor(r() * (quiet ? 2 : 4)), d = 2 + Math.floor(r() * (quiet ? 2 : 3));
      while (w > 1 && !free(x0, z0, w, 1)) w--;
      while (d > 1 && !free(x0, z0, w, d)) d--;
      if (w < 2 || d < 2) { mark(x0, z0, 1, 1); continue; } // 1 マスだけ余った所は空き地
      mark(x0, z0, w, d);
      var p = r();
      if (quiet) { if (p < 0.3) continue; if (p < 0.8) house(x0, z0, w, d); else flat(x0, z0, w, d, 2, false); continue; } // 空き地を多めに、低い家だけ
      if (p < 0.07) continue; // 空き地
      else if (p < 0.58) house(x0, z0, w, d);
      else if (p < 0.86) flat(x0, z0, w, d, 3 + Math.floor(r() * 2), true);
      else if (w >= 3 && d >= 3) flat(x0, z0, w, d, 5 + Math.floor(r() * 5), true); // マンション
      else flat(x0, z0, w, d, 2, false);
    }
    return { blocks: blocks, tracks: tracks, mid: mid };
  }

  /* ------------------------------------------------------------ 描く */
  function mount(host, options) {
    var THREE = global.THREE;
    if (!host || host.nodeType !== 1) throw new Error('BlockTown.mount: 描く場所の要素を渡してください');
    if (!THREE) { if (global.console) console.warn('[block-town] three.js (window.THREE) がありません。先に three@0.147.0 を読み込んでください。'); return null; }
    if (host.__blockTown) host.__blockTown.destroy(); // 同じ要素にもう一度 mount したら、前の表示を片付けてから描く
    options = options || {};
    var canvas = document.createElement('canvas');
    canvas.className = 'bt-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'display:block;width:100%;height:100%';
    var renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: 'low-power' }); }
    catch (e) { return null; } // WebGL が使えない端末では何も描かない (サイトの地の色のまま)
    host.appendChild(canvas);
    renderer.setClearColor(C.gray, 1); // 地面の色 = FV の地の色

    var scene = new THREE.Scene(), mat = new THREE.MeshBasicMaterial({ vertexColors: true }), m4 = new THREE.Matrix4();
    var camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 4000);
    var PX = 30; // 1 ブロックの幅が画面で約 30px
    var BASE_YAW = 38 * Math.PI / 180, PITCH = 41 * Math.PI / 180, SWAY = 6 * Math.PI / 180;
    var dist = 600, offset = new THREE.Vector3(), clock = 0, last = 0, raf = 0, running = false, visible = true;
    var town = null, meshes = [], trains = [], trainMesh = null, size = 0, trainKind = options.train === 'ink' ? 'ink' : 'teal';
    var trainGeo = { teal: cubeGeometry(THREE, KINDS.trainTeal, 0.9, 0.8), ink: cubeGeometry(THREE, KINDS.trainInk, 0.9, 0.8) };
    var CARS = 4, LEN = 3, GAP = 0.25;

    // カメラの揺れは、見出しの後ろの真ん中 (0, 0) を軸にした回転にする。見出しの後ろは、揺れても画面の同じ所にある
    function aim(t) {
      var d = Math.sin(t * 2 * Math.PI / 80) * SWAY, c = Math.cos(d), sn = Math.sin(d); // 80 秒でゆっくり行って戻る
      var px = offset.x + dist * Math.cos(PITCH) * Math.sin(BASE_YAW), py = dist * Math.sin(PITCH), pz = offset.z + dist * Math.cos(PITCH) * Math.cos(BASE_YAW);
      camera.position.set(px * c + pz * sn, py, -px * sn + pz * c);
      camera.lookAt(offset.x * c + offset.z * sn, 0, -offset.x * sn + offset.z * c);
      camera.updateMatrixWorld();
    }
    // 画面の点 (px) の真下の地面 (y = 0)
    var v = new THREE.Vector3(), dir = new THREE.Vector3();
    function ground(px, py, w, h) {
      var nx = px / w * 2 - 1, ny = -(py / h * 2 - 1);
      v.set(nx, ny, -1).unproject(camera);
      dir.set(nx, ny, 1).unproject(camera).sub(v);
      var k = -v.y / dir.y;
      return [v.x + dir.x * k, v.z + dir.z * k];
    }

    function clear() {
      meshes.forEach(function (m) { scene.remove(m); if (m !== trainMesh) m.geometry.dispose(); });
      meshes = [];
    }
    function build(zones, view) {
      clear();
      town = buildTown(size, 7, zones, view);
      Object.keys(town.blocks).forEach(function (kind) {
        var list = town.blocks[kind], n = list.length / 3;
        if (!n) return;
        var mesh = new THREE.InstancedMesh(cubeGeometry(THREE, KINDS[kind], WIDTH[kind] || 0.9, HEIGHT[kind] || 0.9), mat, n);
        for (var i = 0; i < n; i++) { m4.makeTranslation(list[i * 3] + 0.5, list[i * 3 + 1], list[i * 3 + 2] + 0.5); mesh.setMatrixAt(i, m4); }
        mesh.instanceMatrix.needsUpdate = true;
        scene.add(mesh); meshes.push(mesh);
      });
      var slabs = [];
      town.tracks.forEach(function (t) { for (var i = 0; i < size; i++) slabs.push(t.axis === 'x' ? [i, t.y, t.at] : [t.at, t.y, i]); });
      var slabMesh = new THREE.InstancedMesh(cubeGeometry(THREE, KINDS.slab, 1, 0.25), mat, slabs.length);
      slabs.forEach(function (s, i) { m4.makeTranslation(s[0] - town.mid + 0.5, s[1], s[2] - town.mid + 0.5); slabMesh.setMatrixAt(i, m4); });
      scene.add(slabMesh); meshes.push(slabMesh);
      var railGeo = { x: new THREE.BoxGeometry(1, 0.08, 0.1), z: new THREE.BoxGeometry(0.1, 0.08, 1) };
      ['x', 'z'].forEach(function (axis) {
        var list = town.tracks.filter(function (t) { return t.axis === axis; });
        if (!list.length) return;
        var g = railGeo[axis]; g.translate(0, 0.04, 0);
        var col = new THREE.Color(KINDS.rail[0]), cols = [];
        for (var i = 0; i < g.attributes.position.count; i++) cols.push(col.r, col.g, col.b);
        g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
        var mesh = new THREE.InstancedMesh(g, mat, list.length * size * 2), k = 0;
        list.forEach(function (t) {
          for (var i = 0; i < size; i++) for (var side = -1; side <= 1; side += 2) {
            var x = t.axis === 'x' ? i + 0.5 : t.at + 0.5 + side * 0.28, z = t.axis === 'x' ? t.at + 0.5 + side * 0.28 : i + 0.5;
            m4.makeTranslation(x - town.mid, t.y + 0.25, z - town.mid); mesh.setMatrixAt(k++, m4);
          }
        });
        mesh.instanceMatrix.needsUpdate = true;
        scene.add(mesh); meshes.push(mesh);
      });
      trainMesh = new THREE.InstancedMesh(trainGeo[trainKind], mat, town.tracks.length * CARS * LEN);
      scene.add(trainMesh); meshes.push(trainMesh);
      trains = town.tracks.map(function (t, i) { return { t: t, pos: (i * 37) % size, speed: 3.2 + (i % 3) * 0.6 }; });
    }
    function placeTrains() {
      var k = 0, span = size + 20;
      trains.forEach(function (tr) {
        var t = tr.t;
        for (var c = 0; c < CARS; c++) for (var b = 0; b < LEN; b++) {
          var along = tr.pos - t.dir * (c * (LEN + GAP) + b);
          along = ((along % span) + span) % span - 10; // 端から出て、反対の端から入る
          var x = t.axis === 'x' ? along : t.at + 0.5, z = t.axis === 'x' ? t.at + 0.5 : along;
          m4.makeTranslation(x - town.mid, t.y + 0.25, z - town.mid);
          trainMesh.setMatrixAt(k++, m4);
        }
      });
      trainMesh.instanceMatrix.needsUpdate = true;
    }

    var base = null; // 街を作った時の幅。幅が変わった時だけ作り直す
    function frustum(w, h) {
      camera.left = -w / 2 / PX; camera.right = w / 2 / PX; camera.top = h / 2 / PX; camera.bottom = -h / 2 / PX;
      camera.updateProjectionMatrix();
    }
    function layout() {
      var w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      var bucket = Math.round(w / 40), small = w < 768;
      renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, small ? 1.5 : 1.75));
      renderer.setSize(w, h, false);
      frustum(w, h);
      if (base && base.bucket === bucket && h <= base.h * 1.5) { draw(); return; } // 高さだけ変わった時は、見える範囲が広がるだけ
      // 見出しとパネルの真ん中が、街の (0, 0) に来るように、カメラの向く先をずらす
      offset.set(0, 0, 0); aim(0);
      // quiet に渡した要素 (1 つ目は見出しとパネル) の後ろは、低い家だけにする
      var hb = host.getBoundingClientRect(), rects = [].concat(options.quiet || []).filter(Boolean).map(function (el) { return el.getBoundingClientRect(); }).filter(function (q) { return q.width && q.height; });
      if (rects.length) {
        var q0 = rects[0], g = ground(q0.left - hb.left + q0.width / 2, q0.top - hb.top + q0.height / 2, w, h);
        offset.set(-g[0], 0, -g[1]); aim(0);
      }
      var pad = 16, below = 10 * PX * Math.cos(PITCH); // 手前 (画面の下) の建物ほど上へ伸びて見えるので、下の帯 (高い建物 1 棟ぶん) まで含める
      var zones = rects.map(function (q) {
        return [[q.left - pad, q.top - pad], [q.right + pad, q.top - pad], [q.right + pad, q.bottom + pad + below], [q.left - pad, q.bottom + pad + below]]
          .map(function (p) { return ground(p[0] - hb.left, p[1] - hb.top, w, h); });
      });
      // 画面に入る地面 (揺れと、高さが増えた時のぶんも見込む) にだけ建物を置く
      var m = 10 * PX, view = [[-m, -m - 4 * PX], [w + m, -m - 4 * PX], [w + m, h * 1.5 + m], [-m, h * 1.5 + m]].map(function (p) { return ground(p[0], p[1], w, h); }), reach = 0;
      view.forEach(function (c) { reach = Math.max(reach, Math.abs(c[0]), Math.abs(c[1])); });
      size = Math.min(220, Math.ceil(reach * 2 + 8));
      town = null; build(zones, view);
      base = { bucket: bucket, h: h };
      draw();
    }
    function draw() { aim(clock); placeTrains(); renderer.render(scene, camera); }
    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (now - last < 33) return; // 30 コマ/秒まで
      var dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      clock += dt;
      trains.forEach(function (tr) { tr.pos += tr.t.dir * tr.speed * dt; });
      draw();
    }
    function start() { if (running || !visible || document.hidden) return; running = true; last = 0; raf = requestAnimationFrame(frame); }
    function stop() { running = false; cancelAnimationFrame(raf); }

    var reduce = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var wantMoving = options.moving === undefined ? !reduce : !!options.moving, timer = 0;
    function changed() { if (typeof options.onChange === 'function') options.onChange(wantMoving); }
    var onLost = function (e) { e.preventDefault(); stop(); };
    canvas.addEventListener('webglcontextlost', onLost);
    var ro = new ResizeObserver(function () { clearTimeout(timer); timer = setTimeout(layout, 120); });
    ro.observe(host);
    var io = new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible && wantMoving) start(); else stop(); });
    io.observe(host);
    var onVis = function () { if (document.hidden) stop(); else if (wantMoving && visible) start(); };
    document.addEventListener('visibilitychange', onVis);
    layout();
    if (wantMoving) start();

    var destroyed = false;
    var api = {
      el: host,
      version: VERSION,
      play: function () { wantMoving = true; start(); changed(); return api; },
      pause: function () { wantMoving = false; stop(); draw(); changed(); return api; },
      get moving() { return wantMoving; },
      setTrain: function (name) { trainKind = name === 'ink' ? 'ink' : 'teal'; trainMesh.geometry = trainGeo[trainKind]; draw(); return api; },
      setQuiet: function (list) { options.quiet = list; base = null; layout(); return api; },
      relayout: function () { base = null; layout(); return api; }, // 見出しの位置が大きく変わった時 (書体の読み込みの後など) に呼ぶ
      info: function () { return { size: size, blocks: meshes.reduce(function (n, m) { return n + m.count; }, 0), running: running, moving: wantMoving, clock: clock }; },
      destroy: function () {
        if (destroyed) return;
        destroyed = true;
        stop(); clearTimeout(timer); ro.disconnect(); io.disconnect(); document.removeEventListener('visibilitychange', onVis);
        canvas.removeEventListener('webglcontextlost', onLost);
        clear(); trainGeo.teal.dispose(); trainGeo.ink.dispose(); mat.dispose(); renderer.dispose();
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
        delete host.__blockTown;
      }
    };
    host.__blockTown = api;
    return api;
  }

  // 読み込んだだけでは何も描きません。描くときは BlockTown.mount() を呼んでください。
  global.BlockTown = { version: VERSION, mount: mount };
})(window);
