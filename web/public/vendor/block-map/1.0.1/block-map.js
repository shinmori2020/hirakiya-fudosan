/*!
 * block-map.js 1.0.1
 * トップの FV に、路線図そのものを、ブロックで組んだ街の中の線路と駅として描く。three@0.147.0 (window.THREE) を使います。
 *
 * - 駅の位置は block-layout.json (実際の営業キロの順番と比率に合わせた、ブロックの路線図だけの配置)。
 *   線は横・縦・45 度だけで、ブロックの格子にそろえます (45 度の線が途中で折れないように直してから置く)。
 * - 京成の線は 1 段の盛り土、JR と東武は 2 段の高架。交わる所は高架が上を通ります。斜めの所は、まっすぐな 1 本の線路です。
 * - 駅は線路に沿った駅舎 (1 路線は 3×2、2 路線以上は 3×3 ブロック)。屋根の色で状態を表します。
 * - 電車は 2 両。駅で止まり、ゆっくり加速・減速します。上りと下りは左右に分かれてすれ違います。カメラは動きません。
 * - 線は画面の端へ続きます。見出しの範囲に入ると淡くなり、少し進んで消えます (lineEnds: 'pale' なら淡いまま画面の端まで)。
 * - 背景の街は同じ格子の上に作ります。線路と駅のまわりに多く、離れるほど少なく、見出しの列 (quiet) は上から下まで空き地。
 * - 駅名の札は、上に重ねた HTML のボタンです (キーボードと読み上げで選べます)。
 * - 件数・選択・リンクは路線図ヒーロー (route-hero.js) に任せ、この部品は見た目と押す場所だけを受け持ちます。
 *
 *   var map = BlockMap.mount(element, { data, layout, area, labels, quiet: [copyEl], onToggle(id) { … }, onChange(moving) { … } });
 *   map.update({ type, typeLabel, types, selected, counts });
 *   map.highlight(lineId | null); map.pause(); map.play(); map.relayout(); map.destroy();
 */
(function (global) {
  'use strict';

  var VERSION = '1.0.1';
  var doc = global.document;
  var C = { white: '#FFFFFF', gray: '#F3F4F5', rule: '#D9DDE1', soft: '#5F6B75', ink: '#2B2F33', teal: '#1D8282', tealDeep: '#176C6C' };
  // 面の色: [上, 手前 (+z), 右 (+x)]
  var KINDS = {
    bank: [C.white, '#E4E7EA', '#CBD0D5'],      // 盛り土
    pillar: [C.white, '#E4E7EA', '#CBD0D5'],    // 高架の柱
    house: [C.white, '#E4E7EA', '#CBD0D5'],     // 駅舎
    window: [C.white, '#CDD2D7', '#B4BBC2'],
    platform: [C.white, C.rule, '#CBD0D5'],     // ホーム
    post: [C.rule, '#CBD0D5', '#B4BBC2'],       // 屋根の柱
    capNormal: [C.soft, '#525C66', '#46505A'],  // 駅の屋根 (白い街の中で目立つように濃く)
    capOn: [C.teal, C.tealDeep, C.tealDeep],    // 選んでいる駅
    capOff: [C.white, '#E4E7EA', '#CBD0D5'],    // 0 件の駅
    wall: [C.white, '#E4E7EA', '#CBD0D5'],      // 街の建物
    roof: [C.rule, '#C4CAD0', '#AFB6BD'],
    plaza: [C.white, '#E4E7EA', '#CBD0D5']      // 駅前の広場
  };
  var VIEWS = { iso: { yaw: 38, pitch: 41 }, front: { yaw: 0, pitch: 50 } };
  var B = 0.94; // ブロックの大きさ (すき間に継ぎ目が見える)

  /* ------------------------------------------------------------ 道具 */
  function shade(hex, k) {
    var c = String(hex).replace('#', '');
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    var n = parseInt(c, 16), r = Math.round((n >> 16 & 255) * k), g = Math.round((n >> 8 & 255) * k), b = Math.round((n & 255) * k);
    return '#' + [r, g, b].map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join('');
  }
  function mix(hex, to, k) { // hex を to へ k の割合で寄せる
    var p = function (h) { var c = String(h).replace('#', ''); if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2]; var n = parseInt(c, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
    var a = p(hex), b = p(to);
    return '#' + a.map(function (v, i) { return ('0' + Math.round(v + (b[i] - v) * k).toString(16)).slice(-2); }).join('');
  }
  // 折れ線 (pts, 始点からの距離 cum) の上で、(x, z) にいちばん近い所の距離
  function nearest(pts, cum, x, z) {
    var best = Infinity, at = 0;
    for (var i = 1; i < pts.length; i++) {
      var a = pts[i - 1], b = pts[i], dx = b[0] - a[0], dz = b[1] - a[1], len2 = dx * dx + dz * dz || 1;
      var f = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / len2));
      var px = a[0] + dx * f, pz = a[1] + dz * f, d = (px - x) * (px - x) + (pz - z) * (pz - z);
      if (d < best) { best = d; at = cum[i - 1] + Math.sqrt(len2) * f; }
    }
    return at;
  }
  // 電車: 2 両 (1 両の長さ・幅・すき間)。速さはブロック/秒、加速はブロック/秒²、止まる秒数
  var CAR = { len: 1.45, wid: 0.56, gap: 0.14, side: 0.19, hgt: 0.62 };
  var RUN = { v: 3.2, a: 1.6 };
  var DWELL = { st: 1.8, term: 3.2, end: 0.4 };
  // 線の端 ('fade'): 淡くなってから hold マス進み、step マスずつ 3 段で消える
  var END = { hold: 3, step: 3 };
  // 止まっている所から止まる所まで (距離 D) の、t 秒後に進んだ距離。ゆっくり加速して、ゆっくり止まる
  function legTime(D) { var v = RUN.v, a = RUN.a; return D >= v * v / a ? D / v + v / a : 2 * Math.sqrt(D / a); }
  function legDist(D, t) {
    var v = RUN.v, a = RUN.a, T = legTime(D);
    if (t >= T) return D;
    if (D >= v * v / a) { var t1 = v / a; return t < t1 ? a * t * t / 2 : t < T - t1 ? a * t1 * t1 / 2 + v * (t - t1) : D - a * (T - t) * (T - t) / 2; }
    var h = T / 2; return t < h ? a * t * t / 2 : D - a * (T - t) * (T - t) / 2;
  }

  // 箱。面ごとに色を塗る (BoxGeometry の面の順: +x, -x, +y, -y, +z, -z)。底が y = 0
  function boxGeometry(THREE, faces, sx, sy, sz) {
    var g = new THREE.BoxGeometry(sx, sy, sz);
    g.translate(0, sy / 2, 0);
    var top = new THREE.Color(faces[0]), front = new THREE.Color(faces[1]), side = new THREE.Color(faces[2]);
    var order = [side, side, top, top, front, front], colors = [];
    order.forEach(function (c) { for (var i = 0; i < 4; i++) colors.push(c.r, c.g, c.b); });
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return g;
  }
  function sign(v) { return v > 0 ? 1 : v < 0 ? -1 : 0; }
  // 2 つの格子の点のあいだのマス。水平・垂直は横に並ぶマス、45 度は斜めに並ぶマス (描く時は、まっすぐな 1 本の板にする)
  function rasterize(a, b) {
    var out = [], dx = b[0] - a[0], dz = b[1] - a[1], sx = sign(dx), sz = sign(dz), n, k;
    if (!dx || !dz) { n = Math.max(Math.abs(dx), Math.abs(dz)); for (k = 0; k <= n; k++) out.push([a[0] + sx * k, a[1] + sz * k]); return out; }
    if (Math.abs(dx) === Math.abs(dz)) {
      n = Math.abs(dx);
      for (k = 0; k <= n; k++) out.push([a[0] + sx * k, a[1] + sz * k]);
      return out;
    }
    n = Math.max(Math.abs(dx), Math.abs(dz)); // それ以外の角度は、近いマスでつなぐ
    for (k = 0; k <= n; k++) out.push([Math.round(a[0] + dx * k / n), Math.round(a[1] + dz * k / n)]);
    return out;
  }

  /* ------------------------------------------------------------ CSS (駅名の札) */
  var CSS = [
    '.bm-labels{position:absolute;inset:0;pointer-events:none}',
    '.bm-labels[hidden],.bm-labels [hidden]{display:none!important}',
    '.bm-st{position:absolute;left:0;top:0;pointer-events:auto;display:inline-flex;align-items:center;gap:4px;margin:0;padding:4px 8px 4px 4px;border:1px solid #D9DDE1;border-radius:6px;background:#FFFFFF;color:#2B2F33;font:inherit;font-size:13px;font-weight:700;line-height:1.4;white-space:nowrap;cursor:pointer;transition:background-color 150ms cubic-bezier(0.4,0,0.2,1),border-color 150ms cubic-bezier(0.4,0,0.2,1),color 150ms cubic-bezier(0.4,0,0.2,1),opacity 150ms cubic-bezier(0.4,0,0.2,1)}',
    '.bm-st:hover{background:#E0F2F1;border-color:#176C6C}',
    '.bm-st:focus-visible{outline:2px solid #176C6C;outline-offset:2px}',
    '.bm-num{display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;padding:0 4px;border-radius:6px;background:#2B2F33;color:#FFFFFF;font-size:12px;font-variant-numeric:tabular-nums}',
    '.bm-shop{margin-left:4px;padding:0 4px;border:1px solid #2B2F33;border-radius:6px;font-size:11px;font-weight:700;line-height:1.5}',
    '.bm-st[aria-checked="true"]{background:#1D8282;border-color:#1D8282;color:#FFFFFF}',
    '.bm-st[aria-checked="true"]:hover{background:#176C6C;border-color:#176C6C}',
    '.bm-st[aria-checked="true"] .bm-num{background:#FFFFFF;color:#1D8282}',
    '.bm-st[aria-checked="true"] .bm-shop{border-color:#FFFFFF}',
    '.bm-st[aria-disabled="true"]{cursor:default;background:#FFFFFF;border-style:dashed;border-color:#5F6B75;color:#5F6B75;font-weight:500}',
    '.bm-st[aria-disabled="true"] .bm-num{background:#F3F4F5;color:#5F6B75}',
    '.bm-st.bm-dim{opacity:.35}',
    '.bm-tip{position:absolute;left:0;top:0;z-index:2;max-width:240px;padding:8px 12px;border:1px solid #D9DDE1;border-radius:6px;background:#FFFFFF;color:#1F2933;font-size:13px;line-height:1.5;pointer-events:none;opacity:0;transition:opacity 150ms cubic-bezier(0.4,0,0.2,1)}',
    '.bm-tip.bm-show{opacity:1}',
    '.bm-tip b{display:block;font-size:15px;color:#2B2F33}',
    '.bm-tip span{display:block;color:#5F6B75;font-variant-numeric:tabular-nums}',
    '@media (prefers-reduced-motion: reduce){.bm-st,.bm-tip{transition:none!important}}'
  ].join('\n');
  function injectCss() {
    if (doc.getElementById('block-map-style')) return;
    var s = doc.createElement('style'); s.id = 'block-map-style'; s.textContent = CSS;
    (doc.head || doc.documentElement).appendChild(s);
  }

  /* ------------------------------------------------------------ 路線図を格子に置く (ブロックの座標) */
  function makeNetwork(data, opt) {
    // layout: ブロックの路線図だけで使う駅の位置と線の通り道 (block-layout.json)。なければ平面の路線図の位置をそのまま使う
    var lay = opt.layout || null, vb = (lay && lay.viewBox) || data.viewBox;
    var VW = vb ? vb[0] : 660, VH = vb ? vb[1] : 560, U = opt.cell || 10;
    var g = function (p) { return [Math.round(p[0] / U), Math.round(p[1] / U)]; };
    var byId = {};
    data.stations.forEach(function (s) {
      var q = lay && lay.stations && lay.stations[s.id];
      byId[s.id] = q ? { id: s.id, x: q[0], y: q[1] } : s;
    });
    var pathOf = function (line) { return (lay && lay.lines && lay.lines[line.id]) || line.path; };
    var outside = function (p) { return p[0] < 0 || p[0] > VW || p[1] < 0 || p[1] > VH; };
    var levelOf = function (line) { return line.level || (opt.levels && opt.levels[line.id]) || (/^keisei/.test(line.id) ? 1 : 2); };
    var lineNames = {}, lineLevels = {}, lineDir = {}, gaps = [];
    var key = function (p) { return typeof p === 'string' ? p : p[0] + ',' + p[1]; };
    var pos = function (p) { return typeof p === 'string' ? [byId[p].x, byId[p].y] : p; };
    var uses = {};
    data.lines.forEach(function (line) { pathOf(line).forEach(function (p) { if (typeof p !== 'string') uses[key(p)] = (uses[key(p)] || 0) + 1; }); });
    // まっすぐ通るだけの通過点 (札の位置などのための点) は外す。ほかの路線と分かれる点は残す
    var paths = data.lines.map(function (line) {
      return pathOf(line).filter(function (p, i, all) {
        if (typeof p === 'string' || i === 0 || i === all.length - 1 || uses[key(p)] > 1) return true;
        var a = pos(all[i - 1]), c = pos(all[i + 1]);
        return Math.abs((p[0] - a[0]) * (c[1] - p[1]) - (p[1] - a[1]) * (c[0] - p[0])) > 1e-6;
      });
    });
    // 格子にそろえる。四捨五入だけだと、45 度の線が途中で少し折れることがあるので、
    // 「横の線は同じ行、縦の線は同じ列、45 度の線は縦横の差が同じ」になるように、点を 1 マスずつ動かして直す
    var nodes = {}, cons = [];
    paths.forEach(function (path) {
      path.forEach(function (p) { var k = key(p), q = pos(p); if (!nodes[k]) nodes[k] = { ideal: [q[0] / U, q[1] / U], c: g(q) }; });
      for (var i = 0; i < path.length - 1; i++) {
        var a = pos(path[i]), b = pos(path[i + 1]);
        cons.push({ a: nodes[key(path[i])], b: nodes[key(path[i + 1])], sx: sign(b[0] - a[0]), sz: sign(b[1] - a[1]) });
      }
    });
    var nodeList = Object.keys(nodes).map(function (k) { return nodes[k]; });
    var broken = function () {
      var t = 0;
      cons.forEach(function (c) {
        var dx = c.b.c[0] - c.a.c[0], dz = c.b.c[1] - c.a.c[1];
        if (!c.sz) t += Math.abs(dz) + (dx * c.sx < 1 ? 1 : 0);
        else if (!c.sx) t += Math.abs(dx) + (dz * c.sz < 1 ? 1 : 0);
        else t += Math.abs(dx * c.sx - dz * c.sz) + (dx * c.sx < 1 ? 1 : 0);
      });
      return t;
    };
    var cost = function () {
      var t = broken() * 100;
      nodeList.forEach(function (n) { var ex = n.c[0] - n.ideal[0], ez = n.c[1] - n.ideal[1]; t += ex * ex + ez * ez; });
      return t;
    };
    var moves = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    for (var round = 0, now = cost(); round < 200 && broken(); round++) {
      var best = null;
      nodeList.forEach(function (n) {
        moves.forEach(function (m) {
          n.c[0] += m[0]; n.c[1] += m[1];
          var v = cost();
          if (v < now - 1e-9 && (!best || v < best.v)) best = { n: n, m: m, v: v };
          n.c[0] -= m[0]; n.c[1] -= m[1];
        });
      });
      if (!best) break;
      best.n.c[0] += best.m[0]; best.n.c[1] += best.m[1]; now = best.v;
    }
    var snapBroken = broken();
    var lines = data.lines.map(function (line, idx) {
      var path = paths[idx];
      var raw = path.map(pos);
      var verts = path.map(function (p) { return nodes[key(p)].c.slice(); }), level = levelOf(line), lastSt = null;
      path.forEach(function (p, i) { // 駅での線の向きと、となりの駅までのブロック数
        if (typeof p !== 'string') return;
        var o = verts[i + 1] || verts[i - 1], c = verts[i];
        if (!lineDir[p]) lineDir[p] = [sign(o[0] - c[0]) * (verts[i + 1] ? 1 : -1), sign(o[1] - c[1]) * (verts[i + 1] ? 1 : -1)];
        if (lastSt) gaps.push(Math.max(Math.abs(c[0] - lastSt[0]), Math.abs(c[1] - lastSt[1])));
        lastSt = c;
      });
      line.path.forEach(function (p) {
        if (typeof p !== 'string') return;
        (lineNames[p] = lineNames[p] || []).push(line.name);
        lineLevels[p] = Math.max(lineLevels[p] || 0, level);
      });
      return { id: line.id, name: line.name, color: line.color || C.soft, level: level, idx: idx, verts: verts,
        outStart: outside(raw[0]), outEnd: outside(raw[raw.length - 1]) };
    });
    var stations = data.stations.map(function (s) {
      var c = nodes[s.id] ? nodes[s.id].c.slice() : g([s.x, s.y]), many = (lineNames[s.id] || []).length > 1, d = lineDir[s.id] || [1, 0], fp;
      // 駅舎の広さ (駅のマスからのずれ)。2 路線以上は 3×3、横の線は 3×2、縦の線は 2×3、斜めの線は 2×2 (ホームは手前の側)
      if (many) fp = { x0: -1, x1: 1, z0: -1, z1: 1 };
      else if (!d[1]) fp = { x0: -1, x1: 1, z0: 0, z1: 1 };
      else if (!d[0]) fp = { x0: 0, x1: 1, z0: -1, z1: 1 };
      else fp = { x0: Math.min(0, d[0]), x1: Math.max(0, d[0]), z0: Math.min(0, d[1]), z1: Math.max(0, d[1]) };
      return { id: s.id, name: s.name, gx: c[0], gz: c[1], fp: fp, level: lineLevels[s.id] || 1, shop: s.shop, note: s.note, lines: lineNames[s.id] || [] };
    });
    // 図の中のもの (駅と、図の中の折れ目) の範囲。真ん中を (0, 0) にする
    var x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    var take = function (c) { x0 = Math.min(x0, c[0]); x1 = Math.max(x1, c[0]); z0 = Math.min(z0, c[1]); z1 = Math.max(z1, c[1]); };
    stations.forEach(function (s) { take([s.gx + s.fp.x0, s.gz + s.fp.z0]); take([s.gx + s.fp.x1, s.gz + s.fp.z1]); });
    paths.forEach(function (path) { path.forEach(function (p) { if (typeof p !== 'string' && !outside(p)) take(nodes[key(p)].c); }); });
    return { lines: lines, stations: stations, gaps: gaps, broken: snapBroken, box: { x0: x0, x1: x1 + 1, z0: z0, z1: z1 + 1 }, center: [(x0 + x1 + 1) / 2, (z0 + z1 + 1) / 2] };
  }

  /* ------------------------------------------------------------ 本体 */
  function mount(host, options) {
    var THREE = global.THREE;
    if (!host || host.nodeType !== 1) throw new Error('BlockMap.mount: 描く場所の要素を渡してください');
    if (!THREE) { if (global.console) console.warn('[block-map] three.js (window.THREE) がありません'); return null; }
    if (host.__blockMap) host.__blockMap.destroy();
    options = options || {};
    var data = options.data;
    var canvas = doc.createElement('canvas');
    canvas.className = 'bm-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'display:block;width:100%;height:100%';
    var renderer;
    try { renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: 'low-power' }); }
    catch (e) { return null; }
    host.appendChild(canvas);
    renderer.setClearColor(C.gray, 1);
    injectCss();

    var scene = new THREE.Scene(), mat = new THREE.MeshBasicMaterial({ vertexColors: true }), m4 = new THREE.Matrix4();
    var camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 4000), DIST = 800;
    var view = VIEWS[options.view] ? options.view : 'iso', PX = 18;
    // 駅の間隔: schematic の何単位を 1 ブロックにするか。'auto' は画面の広さで 8・10・12 から選ぶ
    var AUTO_CELLS = [8, 10, 12], MIN_PX = 12;
    if (options.cell === undefined) options.cell = 'auto';
    var cell = options.cell === 'auto' ? 10 : options.cell;
    var net = data ? makeNetwork(data, { cell: cell, levels: options.levels, layout: options.layout }) : null, origin = net ? net.center : [0, 0];
    var meshes = [], disposables = [], lineMats = {}, caps = {}, capGeo = {}, trains = [], built = null;
    var labels = {}, labelBox = options.labels || null, tip = null, state = null, hot = null;
    var last = 0, raf = 0, running = false, visible = true, anchor = null;

    // ブロックの座標 (マスの左上) → 世界の座標 (網の真ん中が 0、マスの真ん中)
    function wx(gx) { return gx - origin[0] + 0.5; }
    function wz(gz) { return gz - origin[1] + 0.5; }
    function aim() {
      var v = VIEWS[view], yaw = v.yaw * Math.PI / 180, pitch = v.pitch * Math.PI / 180;
      camera.position.set(DIST * Math.cos(pitch) * Math.sin(yaw), DIST * Math.sin(pitch), DIST * Math.cos(pitch) * Math.cos(yaw));
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();
    }
    // 画面の (ax, ay) に世界の (0, 0, 0) が来るように、四方の広さを決める
    function frustum(w, h) {
      camera.left = -anchor[0] / PX; camera.right = (w - anchor[0]) / PX; camera.top = anchor[1] / PX; camera.bottom = -(h - anchor[1]) / PX;
      camera.updateProjectionMatrix();
    }
    var tv = new THREE.Vector3(), tv2 = new THREE.Vector3();
    function screen(x, y, z, w, h) { tv.set(x, y, z).project(camera); return [(tv.x + 1) / 2 * w, (1 - tv.y) / 2 * h]; }
    function ground(px, py, w, h) { // 画面の点の真下の地面 (世界の座標)
      var nx = px / w * 2 - 1, ny = -(py / h * 2 - 1);
      tv.set(nx, ny, -1).unproject(camera); tv2.set(nx, ny, 1).unproject(camera).sub(tv);
      var k = -tv.y / tv2.y;
      return [tv.x + tv2.x * k, tv.z + tv2.z * k];
    }

    function clear() {
      meshes.forEach(function (m) { scene.remove(m); });
      disposables.forEach(function (g) { g.dispose(); });
      Object.keys(lineMats).forEach(function (k) { lineMats[k].dispose(); });
      meshes = []; disposables = []; lineMats = {}; caps = {}; capGeo = {}; trains = [];
    }
    function geo(faces, sx, sy, sz) { var g = boxGeometry(THREE, faces, sx, sy, sz); disposables.push(g); return g; }
    function add(m) { scene.add(m); meshes.push(m); return m; }
    function many(g, material, list) { // list: [[x, y, z], …] (世界の座標)
      if (!list.length) return null;
      var mesh = new THREE.InstancedMesh(g, material, list.length);
      mesh.frustumCulled = false; // 箱は網の全体に散らばるので、まとめて画面外と判定させない
      list.forEach(function (p, i) { m4.makeTranslation(p[0], p[1], p[2]); mesh.setMatrixAt(i, m4); });
      mesh.instanceMatrix.needsUpdate = true;
      return add(mesh);
    }

    /* ---------- 線路を作る ---------- */
    function build(w, h) {
      clear();
      var hb = host.getBoundingClientRect();
      var copy = [].concat(options.quiet || []).filter(Boolean).map(function (el) { return el.getBoundingClientRect(); })
        .filter(function (r) { return r.width && r.height; })
        .map(function (r) {
          // 見出しの左の余白が狭く、見出しが横に並ぶ時は、画面の左の端から見出しの右までを上から下まで空ける
          // (左の端に街や線がかからないように)。縦に積む時 (見出しが横いっぱい) は、見出しの範囲だけ
          var l = r.left - hb.left - 16, rr = r.right - hb.left + 16, side = l < 320 && rr < w * 0.7;
          return side ? { l: -1e4, r: rr, t: -1e4, b: 1e4 } : { l: l, r: rr, t: r.top - hb.top - 16, b: r.bottom - hb.top + 16 };
        });
      var inCopy = function (p) { return copy.some(function (r) { return p[0] > r.l && p[0] < r.r && p[1] > r.t && p[1] < r.b; }); };
      var off = function (p) { return p[0] < -48 || p[0] > w + 48 || p[1] < -48 || p[1] > h * 1.6 + 48; };
      var stationCell = {}; // 駅舎の下のマス (駅の真ん中だけでなく、駅舎の広さぶん)
      net.stations.forEach(function (s) {
        for (var dz = s.fp.z0; dz <= s.fp.z1; dz++) for (var dx = s.fp.x0; dx <= s.fp.x1; dx++) stationCell[(s.gx + dx) + ',' + (s.gz + dz)] = s;
      });

      // 1) 路線ごとに、通るマスを順に並べる。図の外へ続く端は長く延ばしてから、画面の外だけを切る
      //    見出しの後ろを通る所は消さずに、淡い色で描く (線が途中で途切れて見えないように)
      var occupied = {};
      var copyDist = function (p) { // 見出しの範囲からの距離 (px)。中なら 0
        var d = Infinity;
        copy.forEach(function (r) { var dx = Math.max(r.l - p[0], 0, p[0] - r.r), dy = Math.max(r.t - p[1], 0, p[1] - r.b); d = Math.min(d, Math.hypot(dx, dy)); });
        return d;
      };
      var routes = net.lines.map(function (l) {
        var verts = l.verts.map(function (v) { return v.slice(); });
        var extend = function (from, to) { // to から from の向きへ延ばす
          var d = [sign(to[0] - from[0]), sign(to[1] - from[1])];
          return [to[0] + d[0] * 140, to[1] + d[1] * 140];
        };
        if (l.outStart) verts[0] = extend(verts[1], verts[0]);
        if (l.outEnd) verts[verts.length - 1] = extend(verts[verts.length - 2], verts[verts.length - 1]);
        var cells = [];
        for (var i = 0; i < verts.length - 1; i++) {
          var seg = rasterize(verts[i], verts[i + 1]);
          seg.forEach(function (c, k) { if (i && !k) return; cells.push(c); });
        }
        var top = function (c) { return screen(wx(c[0]), l.level + 0.3, wz(c[1]), w, h); };
        var trim = function (list) { // 端から: 画面の外のマスを切る
          while (list.length > 2 && !stationCell[list[0][0] + ',' + list[0][1]] && off(top(list[0]))) list.shift();
        };
        if (l.outStart) trim(cells);
        cells.reverse();
        if (l.outEnd) trim(cells);
        cells.reverse();
        // 見出しの後ろは淡く (0: ふつう、2: 淡い)
        var paleOf = cells.map(function (c) { return copyDist(top(c)) <= 0 ? 2 : 0; }); // 見出しの範囲に入ったら、1 色の淡い線
        // 図の外へ向かう端では、一度淡くなったら端まで淡いまま (途中で濃く戻らない)
        var first = 0, lastSt = cells.length - 1;
        while (first < cells.length && !stationCell[cells[first][0] + ',' + cells[first][1]]) first++;
        while (lastSt >= 0 && !stationCell[cells[lastSt][0] + ',' + cells[lastSt][1]]) lastSt--;
        for (var q = first - 1; q >= 0; q--) paleOf[q] = Math.max(paleOf[q], paleOf[q + 1] || 0);
        for (var q2 = lastSt + 1; q2 < cells.length; q2++) paleOf[q2] = Math.max(paleOf[q2], paleOf[q2 - 1] || 0);
        // 線の端: 'fade' は、淡くなってから少し進んで、だんだん消える (画面の端まで届かない)。'pale' は、淡いまま画面の端まで
        if (options.lineEnds !== 'pale') {
          var fadeOut = function (idx) { // idx: 図の外へ向かう順のマス
            var k = -1;
            idx.forEach(function (i) {
              if (k < 0 && paleOf[i]) k = 0;
              if (k < 0) return;
              paleOf[i] = k < END.hold ? 2 : k < END.hold + END.step * 3 ? 3 + Math.floor((k - END.hold) / END.step) : 6;
              k++;
            });
          };
          var outS = [], outE = [];
          for (var q3 = first - 1; q3 >= 0; q3--) outS.push(q3);
          for (var q4 = lastSt + 1; q4 < cells.length; q4++) outE.push(q4);
          fadeOut(outS); fadeOut(outE);
        }
        var pale = {};
        cells.forEach(function (c, i) { if (paleOf[i]) pale[c[0] + ',' + c[1]] = paleOf[i]; });
        // 電車の通り道 (折れ目の点をつなぐ)。端は切ったあとのマス
        var path = [cells[0]].concat(l.verts.slice(1, -1)).concat([cells[cells.length - 1]]);
        if (!l.outStart) path[0] = l.verts[0];
        if (!l.outEnd) path[path.length - 1] = l.verts[l.verts.length - 1];
        cells.forEach(function (c, i) {
          (occupied[c[0] + ',' + c[1]] = occupied[c[0] + ',' + c[1]] || []).push(l.level);
          var n = cells[i + 1];
          if (n && n[0] !== c[0] && n[1] !== c[1]) { // 斜めの板がかかる隣の 2 マス
            [[n[0], c[1]], [c[0], n[1]]].forEach(function (q) { (occupied[q[0] + ',' + q[1]] = occupied[q[0] + ',' + q[1]] || []).push(l.level + 0.5); });
          }
        });
        return { line: l, cells: cells, path: path, pale: pale, paleOf: paleOf };
      });

      // 2) 線路: 京成は 1 段の盛り土、JR と東武は高架 (柱は 3 マスおき)。上に路線の色の板
      var PALE = [0, 0.45, 0.74, 0.84, 0.91, 0.96]; // 背景の色に寄せる割合 (6 以上は描かない)
      var tint = function (faces, v) { return v ? faces.map(function (c) { return mix(c, C.gray, PALE[v]); }) : faces; };
      routes.forEach(function (r) {
        var l = r.line, m = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 1 });
        lineMats[l.id] = m;
        var deckFaces = [l.color, shade(l.color, 0.82), shade(l.color, 0.68)];
        var G = [0, 1, 2, 3, 4, 5].map(function (v) {
          return { deck: geo(tint(deckFaces, v), B, 0.3, B), bank: geo(tint(KINDS.bank, v), B, 1, B), beam: geo(tint(KINDS.bank, v), B, 0.3, B), pillar: geo(tint(KINDS.pillar, v), 0.46, 1, 0.46),
            decks: [], banks: [], beams: [], pillars: [] };
        });
        // マスを、横・縦に並ぶ所 (ブロック) と、斜めに並ぶ所 (まっすぐな板) に分ける
        var diag = r.cells.map(function () { return false; }), runs = [], run = null;
        for (var i = 0; i < r.cells.length - 1; i++) {
          var a = r.cells[i], b = r.cells[i + 1], dx = b[0] - a[0], dz = b[1] - a[1];
          if (dx && dz) {
            if (run && run.d[0] === dx && run.d[1] === dz && run.j === i) { run.j = i + 1; }
            else { run = { i: i, j: i + 1, d: [dx, dz] }; runs.push(run); }
            diag[i] = diag[i + 1] = true;
          }
        }
        // 折れ目のマス (横の線と斜めの線のつなぎ目) は、ブロックも置いてつなぐ
        r.cells.forEach(function (c, i) {
          var prevAxis = i > 0 && !(r.cells[i - 1][0] !== c[0] && r.cells[i - 1][1] !== c[1]);
          var nextAxis = i < r.cells.length - 1 && !(r.cells[i + 1][0] !== c[0] && r.cells[i + 1][1] !== c[1]);
          if (diag[i] && !prevAxis && !nextAxis) return;
          var x = wx(c[0]), z = wz(c[1]), key = c[0] + ',' + c[1], g = G[r.paleOf[i]];
          if (stationCell[key] || !g) return; // 駅の中は、駅舎が受け持つ。消えた先は描かない
          g.decks.push([x, l.level, z]);
          if (l.level === 1) g.banks.push([x, 0, z]);
          else {
            g.beams.push([x, l.level - 0.3, z]);
            var lowerHere = (occupied[key] || []).some(function (lv) { return lv < l.level; });
            if (i % 3 === 1 && !lowerHere) { g.pillars.push([x, 0, z]); g.pillars.push([x, 1, z]); }
          }
        });
        G.forEach(function (g) { many(g.deck, m, g.decks); many(g.bank, m, g.banks); many(g.beam, m, g.beams); many(g.pillar, m, g.pillars); });
        var bar = function (faces, a, b, y, hgt, wid, ext) { // a から b へ、まっすぐな板
          var ax = wx(a[0]), az = wz(a[1]), bx = wx(b[0]), bz = wz(b[1]), len = Math.hypot(bx - ax, bz - az) + (ext || 0);
          var mesh = new THREE.Mesh(geo(faces, len, hgt, wid), m);
          mesh.position.set((ax + bx) / 2, y, (az + bz) / 2);
          mesh.rotation.y = -Math.atan2(bz - az, bx - ax);
          return add(mesh);
        };
        runs.forEach(function (rn) {
          // 淡さの同じ所ごとに分けて描く
          var parts = [], part = null;
          for (var k = rn.i; k <= rn.j; k++) {
            var v = r.paleOf[k];
            if (!part || part.v !== v) { part = { a: k, b: k, v: v }; parts.push(part); } else part.b = k;
          }
          parts.forEach(function (pt, n) {
            var a = r.cells[pt.a], b = r.cells[n < parts.length - 1 ? pt.b + 1 : pt.b];
            if (a === b || pt.v >= 6) return;
            bar(tint(deckFaces, pt.v), a, b, l.level, 0.3, B, B * 0.7); // 線路の板は、駅の中も通す
          });
          // 盛り土・高架の梁は、駅の外だけ
          var seg = null, segs = [];
          for (var k2 = rn.i; k2 <= rn.j; k2++) {
            var c = r.cells[k2], inSt = !!stationCell[c[0] + ',' + c[1]] || r.paleOf[k2] >= 6, v2 = r.paleOf[k2];
            if (!inSt) { if (!seg || seg.v !== v2) { seg = { a: c, b: c, v: v2 }; segs.push(seg); } else seg.b = c; }
            else seg = null;
          }
          segs.forEach(function (sg) {
            if (l.level === 1) bar(tint(KINDS.bank, sg.v), sg.a, sg.b, 0, 1, B * 0.92, B * 0.7);
            else {
              bar(tint(KINDS.bank, sg.v), sg.a, sg.b, l.level - 0.3, 0.3, B * 0.92, B * 0.7);
              var ax = wx(sg.a[0]), az = wz(sg.a[1]), bx = wx(sg.b[0]), bz = wz(sg.b[1]), len = Math.hypot(bx - ax, bz - az);
              for (var d = 1.2; d < len; d += 3) { var f = d / len; var px = ax + (bx - ax) * f, pz = az + (bz - az) * f; var pm = new THREE.Mesh(G[sg.v].pillar, m); pm.position.set(px, 0, pz); pm.scale.y = l.level - 0.3; add(pm); }
            }
          });
        });
        // 電車 (2 両)。白い車体。見出しの後ろでは淡い色の電車にする
        var carFaces = [C.white, '#DCE0E4', '#B9C0C7']; // 白い車体 (色の板の上で目立つように)
        var tg = geo(carFaces, CAR.len, CAR.hgt, CAR.wid), tgPale = geo(tint(carFaces, 2), CAR.len, CAR.hgt, CAR.wid);
        var pts = r.path.map(function (c) { return [wx(c[0]), wz(c[1])]; }), cum = [0];
        for (var k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
        var L = cum[cum.length - 1], half = CAR.len + CAR.gap / 2;
        // 止まる所: 両端 (図の外は折り返すだけ。終点の駅では長めに止まる) と、途中の駅
        var stops = [];
        net.stations.forEach(function (s) {
          if (s.lines.indexOf(l.name) < 0) return;
          var f = s.fp, at = nearest(pts, cum, wx(s.gx) + (f.x0 + f.x1) / 2, wz(s.gz) + (f.z0 + f.z1) / 2);
          stops.push({ s: Math.max(half, Math.min(L - half, at)), kind: 'st' });
        });
        stops.sort(function (a, b) { return a.s - b.s; });
        if (!stops.length || stops[0].s > half + 0.6) stops.unshift({ s: half, kind: 'end' }); else stops[0].kind = 'term';
        var last = stops[stops.length - 1];
        if (last.s < L - half - 0.6) stops.push({ s: L - half, kind: 'end' }); else last.kind = 'term';
        var count = L > 70 ? 3 : L > 34 ? 2 : 1;
        var tm = new THREE.InstancedMesh(tg, m, count * 2), tp = new THREE.InstancedMesh(tgPale, m, count * 2);
        tm.frustumCulled = tp.frustumCulled = false;
        add(tm); add(tp);
        for (var t = 0; t < count; t++) {
          var i0 = Math.min(stops.length - 1, Math.round(t * (stops.length - 1) / count)), dir = t % 2 ? -1 : 1;
          if (i0 === 0) dir = 1; else if (i0 === stops.length - 1) dir = -1;
          trains.push({ mesh: tm, paleMesh: tp, base: t * 2, pts: pts, cum: cum, L: L, stops: stops, i: i0, dir: dir, side: dir,
            state: 'dwell', t: (t * 0.9) % DWELL.st, c: stops[i0].s, y: l.level + 0.3, pale: r.pale });
        }
      });

      // 4) 駅舎: 線路の高さまでの台、線路の脇のホーム、屋根の柱と屋根 (屋根の色で状態を表す)
      var houses = [], windows = [], plats = [], posts = [];
      net.stations.forEach(function (s) {
        var f = s.fp, L = s.level;
        for (var dz = f.z0; dz <= f.z1; dz++) for (var dx = f.x0; dx <= f.x1; dx++) {
          var gx = s.gx + dx, gz = s.gz + dz, x = wx(gx), z = wz(gz), edge = dx === f.x0 || dx === f.x1 || dz === f.z0 || dz === f.z1;
          for (var y = 0; y < L; y++) (edge && y === L - 1 && (dx + dz) % 2 === 0 ? windows : houses).push([x, y, z]);
          var levels = occupied[gx + ',' + gz] || [];
          if (levels.indexOf(L) < 0) plats.push([x, L, z]); // 線路の通らないマスはホーム
        }
        [[f.x0, f.z0], [f.x1, f.z0], [f.x0, f.z1], [f.x1, f.z1]].forEach(function (d) { posts.push([wx(s.gx + d[0]), L + 0.3, wz(s.gz + d[1])]); });
      });
      many(geo(KINDS.house, B, 1, B), mat, houses);
      many(geo(KINDS.window, B, 1, B), mat, windows);
      many(geo(KINDS.platform, B, 0.26, B), mat, plats);
      many(geo(KINDS.post, 0.22, 0.9, 0.22), mat, posts);
      // 駅の中の線路 (路線の色。駅舎と同じ高さの線だけ見える)
      net.stations.forEach(function (s) {
        var f = s.fp;
        routes.forEach(function (r) {
          var list = r.cells.filter(function (c, i) {
            var cs = r.cells, axisPrev = i > 0 && (cs[i - 1][0] === c[0] || cs[i - 1][1] === c[1]), axisNext = i < cs.length - 1 && (cs[i + 1][0] === c[0] || cs[i + 1][1] === c[1]);
            return (axisPrev || axisNext) && c[0] - s.gx >= f.x0 && c[0] - s.gx <= f.x1 && c[1] - s.gz >= f.z0 && c[1] - s.gz <= f.z1;
          }).map(function (c) { return [wx(c[0]), r.line.level, wz(c[1])]; });
          if (r.line.level === s.level) many(geo([r.line.color, shade(r.line.color, 0.82), shade(r.line.color, 0.68)], B, 0.3, B), lineMats[r.line.id], list);
        });
        var sx = f.x1 - f.x0 + 0.8, sz = f.z1 - f.z0 + 0.8;
        capGeo[s.id] = { normal: geo(KINDS.capNormal, sx, 0.3, sz), on: geo(KINDS.capOn, sx, 0.3, sz), off: geo(KINDS.capOff, sx, 0.3, sz) };
        var cap = new THREE.Mesh(capGeo[s.id].normal, mat);
        cap.position.set(wx(s.gx) + (f.x0 + f.x1) / 2, s.level + 1.2, wz(s.gz) + (f.z0 + f.z1) / 2); add(cap);
        caps[s.id] = cap;
      });
      var townInfo = options.town === false ? null : buildTown(w, h, hb, copy, occupied, stationCell);
      built = { routes: routes, town: townInfo };
    }

    /* ---------- 背景の街 (路線図の格子に合わせる) ---------- */
    function rng(seed) {
      return function () {
        seed = seed + 0x6D2B79F5 | 0;
        var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    }
    function inPoly(x, z, poly) {
      var inside = false;
      for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        var xi = poly[i][0], zi = poly[i][1], xj = poly[j][0], zj = poly[j][1];
        if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
      }
      return inside;
    }
    function buildTown(w, h, hb, copy, occupied, stationCell) {
      var r = rng(7);
      // 画面に入る地面 (上の端は、背の高い建物が見えるぶん広く)。ブロックの座標で
      var m = 8 * PX, toG = function (p) { var q = ground(p[0], p[1], w, h); return [q[0] + origin[0], q[1] + origin[1]]; };
      var view = [[-m, -m - 10 * PX], [w + m, -m - 10 * PX], [w + m, h * 1.6 + m], [-m, h * 1.6 + m]].map(toG);
      var gx0 = Infinity, gx1 = -Infinity, gz0 = Infinity, gz1 = -Infinity;
      view.forEach(function (q) { gx0 = Math.min(gx0, Math.floor(q[0])); gx1 = Math.max(gx1, Math.ceil(q[0])); gz0 = Math.min(gz0, Math.floor(q[1])); gz1 = Math.max(gz1, Math.ceil(q[1])); });
      var W = gx1 - gx0 + 1, D = gz1 - gz0 + 1;
      if (W * D > 400 * 400) return null;
      var at = function (x, z) { return (z - gz0) * W + (x - gx0); };
      var ok = function (x, z) { return x >= gx0 && x <= gx1 && z >= gz0 && z <= gz1; };
      // 線路と駅からの近さ (8 方向に広げて数える)
      var dLine = new Uint8Array(W * D).fill(99), dSt = new Uint8Array(W * D).fill(99), queue = [];
      var spread = function (dist, cap) {
        for (var qi = 0; qi < queue.length; qi++) {
          var i = queue[qi], x = i % W + gx0, z = (i / W | 0) + gz0, dv = dist[i];
          if (dv >= cap) continue;
          for (var dz = -1; dz <= 1; dz++) for (var dx = -1; dx <= 1; dx++) {
            if (!ok(x + dx, z + dz)) continue;
            var j = at(x + dx, z + dz);
            if (dist[j] > dv + 1) { dist[j] = dv + 1; queue.push(j); }
          }
        }
        queue = [];
      };
      Object.keys(occupied).forEach(function (k) { var c = k.split(',').map(Number); if (ok(c[0], c[1])) { dLine[at(c[0], c[1])] = 0; queue.push(at(c[0], c[1])); } });
      spread(dLine, 40);
      Object.keys(stationCell).forEach(function (k) { var c = k.split(',').map(Number); if (ok(c[0], c[1])) { dSt[at(c[0], c[1])] = 0; queue.push(at(c[0], c[1])); } });
      spread(dSt, 12);

      var used = new Uint8Array(W * D), walls = [], wins = [], roofs = [], plaza = [];
      var put = function (list, x, y, z) { list.push([wx(x), y, wz(z)]); };
      for (var z = gz0; z <= gz1; z++) for (var x = gx0; x <= gx1; x++) {
        var i = at(x, z);
        if (dLine[i] <= 1) used[i] = 1;                      // 線路と、その両脇の道
        if (dSt[i] === 0) used[i] = 1;
        else if (dSt[i] === 1) { used[i] = 1; put(plaza, x, 0, z); } // 駅前の広場
      }
      // 道: 6〜8 マスおきの細い道と、14〜18 マスおきの 2 マス幅の広い道 (路線図の格子と同じ向き)
      var road = function (vertical, at0, width) {
        for (var k = 0; k < width; k++) {
          if (vertical) { for (var zz = gz0; zz <= gz1; zz++) if (ok(at0 + k, zz)) used[at(at0 + k, zz)] = 1; }
          else { for (var xx = gx0; xx <= gx1; xx++) if (ok(xx, at0 + k)) used[at(xx, at0 + k)] = 1; }
        }
      };
      for (var rx = gx0 + Math.floor(r() * 4); rx <= gx1; rx += 6 + Math.floor(r() * 3)) road(true, rx, 1);
      for (var rz = gz0 + Math.floor(r() * 4); rz <= gz1; rz += 5 + Math.floor(r() * 3)) road(false, rz, 1);
      for (var bx = gx0 + 3 + Math.floor(r() * 6); bx <= gx1; bx += 14 + Math.floor(r() * 5)) road(true, bx, 2);
      for (var bz = gz0 + 3 + Math.floor(r() * 6); bz <= gz1; bz += 14 + Math.floor(r() * 5)) road(false, bz, 2);

      var free = function (x0, z0, ww, dd) {
        if (!ok(x0 + ww - 1, z0 + dd - 1)) return false;
        for (var zz = z0; zz < z0 + dd; zz++) for (var xx = x0; xx < x0 + ww; xx++) if (used[at(xx, zz)]) return false;
        return true;
      };
      var mark = function (x0, z0, ww, dd) { for (var zz = z0; zz < z0 + dd; zz++) for (var xx = x0; xx < x0 + ww; xx++) used[at(xx, zz)] = 1; };
      var house = function (x0, z0, ww, dd) { // 戸建て: 壁 (小さい家は 1 段、2×2 以上は 2 段) と段々の屋根
        var hw = ww >= 2 && dd >= 2 ? 2 : 1;
        for (var zz = z0; zz < z0 + dd; zz++) for (var xx = x0; xx < x0 + ww; xx++) for (var y = 0; y < hw; y++) {
          var edge = xx === x0 || xx === x0 + ww - 1 || zz === z0 || zz === z0 + dd - 1;
          if (!edge && y < hw - 1) continue;
          put(edge && y === hw - 1 && hw === 2 && (xx + zz) % 2 === 0 ? wins : walls, xx, y, zz);
        }
        var alongX = ww >= dd, span = alongX ? dd : ww, layers = Math.ceil(span / 2);
        for (var k = 0; k < layers; k++) for (var zz2 = z0; zz2 < z0 + dd; zz2++) for (var xx2 = x0; xx2 < x0 + ww; xx2++) {
          var dist = alongX ? Math.min(zz2 - z0, z0 + dd - 1 - zz2) : Math.min(xx2 - x0, x0 + ww - 1 - xx2);
          if (dist === k || (dist > k && k === layers - 1)) put(roofs, xx2, hw + k, zz2);
        }
      };
      var flat = function (x0, z0, ww, dd, hh, windows) { // アパート・マンション・店
        for (var y = 0; y < hh; y++) for (var zz = z0; zz < z0 + dd; zz++) for (var xx = x0; xx < x0 + ww; xx++) {
          var edge = xx === x0 || xx === x0 + ww - 1 || zz === z0 || zz === z0 + dd - 1;
          if (!edge && y < hh - 1) continue;
          put(windows && edge && y > 0 && y < hh - 1 && ((xx - x0) + (zz - z0) + y) % 2 === 1 ? wins : walls, xx, y, zz);
        }
      };
      // 家の多さ: 線路と駅のまわりに多く、離れるほど少なく、まとまり (ゆるい模様) で散らす。見出しのまわりは、はっきり空き地にする
      var hsh = function (ix, iz) { var n = Math.imul(ix, 374761393) + Math.imul(iz, 668265263) | 0; n = Math.imul(n ^ n >>> 13, 1274126177); return ((n ^ n >>> 16) >>> 0) / 4294967296; };
      var noise = function (x, z, sc) {
        var fx = x / sc, fz = z / sc, ix = Math.floor(fx), iz = Math.floor(fz), tx = fx - ix, tz = fz - iz;
        tx = tx * tx * (3 - 2 * tx); tz = tz * tz * (3 - 2 * tz);
        var a = hsh(ix, iz), b = hsh(ix + 1, iz), c = hsh(ix, iz + 1), d = hsh(ix + 1, iz + 1);
        return a + (b - a) * tx + (c - a) * tz + (a - b - c + d) * tx * tz;
      };
      var copyDist = function (p) {
        var d = Infinity;
        copy.forEach(function (c) { var dx = Math.max(c.l - p[0], 0, p[0] - c.r), dy = Math.max(c.t - p[1], 0, p[1] - c.b); d = Math.min(d, Math.hypot(dx, dy)); });
        return d;
      };
      var EDGE = 24, LOW = 110; // 見出しの範囲から EDGE px までは空き地 (境目ははっきり)、LOW px までは低い家だけ
      var counts = { house: 0, flat: 0, tall: 0 };
      for (var z0 = gz0; z0 <= gz1; z0++) for (var x0 = gx0; x0 <= gx1; x0++) {
        var i0 = at(x0, z0);
        if (used[i0]) continue;
        if (!inPoly(x0 + 0.5, z0 + 0.5, view)) { used[i0] = 1; continue; }
        var nearLine = dLine[i0] <= 3, nearSt = dSt[i0] >= 3 && dSt[i0] <= 7, besideSt = dSt[i0] === 2;
        // 見出しからの近さ (建物の上のほうが見出しにかかるので、少し上の点で測る)
        var sp = screen(wx(x0), 0, wz(z0), w, h), cd = copyDist([sp[0], sp[1] - 2.5 * PX]);
        var fade = cd < EDGE ? 0 : 1, isQuiet = cd < LOW;
        var dens = dSt[i0] <= 8 ? 1 : Math.max(0.06, Math.min(1, 1.2 - (dLine[i0] - 3) / 14));
        var patch = Math.max(0, Math.min(1, (noise(x0, z0, 7) - 0.3) / 0.35)); // まとまった町と、空き地の広がり
        var wp = dSt[i0] <= 8 ? 0 : Math.max(0, Math.min(1, (dLine[i0] - 5) / 8)); // 線路の近くは、まとまりに関係なく家が多い
        var keep = Math.min(0.95, dens * ((1 - wp) * 0.9 + wp * (0.15 + 0.85 * patch))) * fade * fade;
        if (!nearLine && !besideSt && r() > keep) { used[i0] = 1; continue; } // 空き地
        var p = r(), ww, dd;
        if (nearLine || besideSt) { ww = 1 + Math.floor(r() * 2); dd = 1 + Math.floor(r() * 2); }
        else if (nearSt && !isQuiet) { ww = 2 + Math.floor(r() * 2); dd = 2 + Math.floor(r() * 2); }
        else { ww = 1 + Math.floor(r() * 2.6); dd = 1 + Math.floor(r() * 2.2); }
        while (ww > 1 && !free(x0, z0, ww, 1)) ww--;
        while (dd > 1 && !free(x0, z0, ww, dd)) dd--;
        if (!free(x0, z0, ww, dd)) { used[i0] = 1; continue; }
        mark(x0, z0, ww, dd);
        if (nearLine || besideSt) { if (p < 0.35 || r() > fade) continue; flat(x0, z0, ww, dd, 1, false); counts.flat++; continue; } // 線路と駅のそばは、低い店だけ
        if (isQuiet) { house(x0, z0, ww, dd); counts.house++; continue; }       // 見出しの近くは、低い家だけ
        if (nearSt) { if (p < 0.1) continue; flat(x0, z0, ww, dd, 3 + Math.floor(r() * 4), true); counts.tall++; continue; } // 駅のまわりは、マンションとビル
        if (p < 0.82) { house(x0, z0, ww, dd); counts.house++; }
        else if (ww >= 2 && dd >= 2) { flat(x0, z0, ww, dd, 2 + Math.floor(r() * 2), true); counts.flat++; }
        else { house(x0, z0, ww, dd); counts.house++; }
      }
      var townMat = mat;
      many(geo(KINDS.wall, B, 1, B), townMat, walls);
      many(geo(KINDS.window, B, 1, B), townMat, wins);
      many(geo(KINDS.roof, B, 1, B), townMat, roofs);
      many(geo(KINDS.plaza, B, 0.08, B), townMat, plaza);
      return { blocks: walls.length + wins.length + roofs.length, houses: counts.house, flats: counts.flat, tall: counts.tall };
    }

    function placeTrains() {
      var q = new THREE.Quaternion(), pos = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0), zero = new THREE.Matrix4().makeScale(0, 0, 0);
      function at(tr, s) {
        s = Math.max(0, Math.min(tr.L, s));
        for (var i = 1; i < tr.cum.length; i++) if (s <= tr.cum[i] || i === tr.cum.length - 1) {
          var a = tr.pts[i - 1], b = tr.pts[i], seg = tr.cum[i] - tr.cum[i - 1] || 1, f = (s - tr.cum[i - 1]) / seg;
          return { x: a[0] + (b[0] - a[0]) * f, z: a[1] + (b[1] - a[1]) * f, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) };
        }
      }
      var off = CAR.len / 2 + CAR.gap / 2;
      trains.forEach(function (tr) {
        [1, -1].forEach(function (k, n) {
          var p = at(tr, tr.c + k * off);
          // 進む向きの左側を走る (上りと下りで、横にずらしてすれ違う)
          var lx = Math.sin(p.ang) * CAR.side * tr.side, lz = -Math.cos(p.ang) * CAR.side * tr.side;
          pos.set(p.x + lx, tr.y, p.z + lz); q.setFromAxisAngle(up, -p.ang);
          m4.compose(pos, q, one);
          var key = Math.round(p.x + origin[0] - 0.5) + ',' + Math.round(p.z + origin[1] - 0.5), pale = tr.pale[key];
          tr.mesh.setMatrixAt(tr.base + n, pale ? zero : m4);
          tr.paleMesh.setMatrixAt(tr.base + n, pale === 2 ? m4 : zero); // 消えていく所では、電車も見せない
        });
        tr.mesh.instanceMatrix.needsUpdate = true;
        tr.paleMesh.instanceMatrix.needsUpdate = true;
      });
    }
    // 電車を dt 秒すすめる: 駅で止まる → ゆっくり加速 → 次の駅の手前でゆっくり止まる。端で折り返す
    function stepTrain(tr, dt) {
      var n = tr.stops.length;
      if (n < 2) return;
      tr.side += (tr.dir - tr.side) * Math.min(1, dt * 1.6);
      tr.t += dt;
      if (tr.state === 'dwell') {
        if (tr.t < DWELL[tr.stops[tr.i].kind]) return;
        var nx = tr.i + tr.dir;
        if (nx < 0 || nx >= n) { tr.dir = -tr.dir; nx = tr.i + tr.dir; }
        tr.state = 'run'; tr.t = 0; tr.from = tr.stops[tr.i].s; tr.to = tr.stops[nx].s; tr.next = nx;
        tr.D = Math.abs(tr.to - tr.from); tr.T = legTime(tr.D);
        return;
      }
      tr.c = tr.from + (tr.to > tr.from ? 1 : -1) * legDist(tr.D, tr.t);
      if (tr.t >= tr.T) { tr.c = tr.to; tr.i = tr.next; tr.state = 'dwell'; tr.t = 0; }
    }

    /* ---------- 駅名の札 ---------- */
    function clearLabels() {
      Object.keys(labels).forEach(function (id) { var l = labels[id]; if (l.el.parentNode) l.el.parentNode.removeChild(l.el); });
      labels = {};
      if (tip && tip.parentNode) tip.parentNode.removeChild(tip);
      tip = null;
    }
    function makeLabels() {
      clearLabels();
      if (!labelBox || !net) return;
      labelBox.classList.add('bm-labels');
      labelBox.setAttribute('role', 'group');
      labelBox.setAttribute('aria-label', options.label || '路線図。駅を選ぶと、その駅の物件を探せます。');
      net.stations.forEach(function (s) {
        var b = doc.createElement('button');
        b.type = 'button'; b.className = 'bm-st'; b.setAttribute('role', 'checkbox'); b.setAttribute('aria-checked', 'false');
        var num = doc.createElement('span'); num.className = 'bm-num'; num.setAttribute('aria-hidden', 'true'); b.appendChild(num);
        var name = doc.createElement('span'); name.textContent = s.name; name.setAttribute('aria-hidden', 'true'); b.appendChild(name);
        if (s.shop) { var shop = doc.createElement('span'); shop.className = 'bm-shop'; shop.textContent = s.shop; shop.setAttribute('aria-hidden', 'true'); b.appendChild(shop); }
        b.addEventListener('click', function () { if (b.getAttribute('aria-disabled') !== 'true' && typeof options.onToggle === 'function') options.onToggle(s.id); showTip(s.id); });
        b.addEventListener('pointerenter', function () { showTip(s.id); });
        b.addEventListener('pointerleave', hideTip);
        b.addEventListener('focus', function () { showTip(s.id); });
        b.addEventListener('blur', hideTip);
        labelBox.appendChild(b);
        labels[s.id] = { el: b, num: num, st: s };
      });
      tip = doc.createElement('div'); tip.className = 'bm-tip'; tip.setAttribute('aria-hidden', 'true'); labelBox.appendChild(tip);
      if (state) applyState();
    }
    function placeLabels(w, h) {
      if (!labelBox || !net) return;
      var hb = host.getBoundingClientRect(), lb = labelBox.getBoundingClientRect(), ox = hb.left - lb.left, oy = hb.top - lb.top;
      var anchors = net.stations.map(function (s) {
        var f = s.fp, cx = wx(s.gx) + (f.x0 + f.x1) / 2, cz = wz(s.gz) + (f.z0 + f.z1) / 2, c = screen(cx, s.level + 1.5, cz, w, h);
        // 屋根の四隅の画面の範囲 (札が屋根を隠さないように)
        var xs = [], ys = [];
        [[f.x0 - 0.5, f.z0 - 0.5], [f.x1 + 0.5, f.z0 - 0.5], [f.x0 - 0.5, f.z1 + 0.5], [f.x1 + 0.5, f.z1 + 0.5]].forEach(function (d) { var p = screen(wx(s.gx) + d[0], s.level + 1.5, wz(s.gz) + d[1], w, h); xs.push(p[0]); ys.push(p[1]); });
        return { id: s.id, x: c[0] + ox, y: c[1] + oy, top: Math.min.apply(null, ys) + oy, bottom: Math.max.apply(null, ys) + oy, left: Math.min.apply(null, xs) + ox, right: Math.max.apply(null, xs) + ox };
      });
      var placed = [];
      var hit = function (r) {
        return placed.some(function (o) { return r.l < o.r + 4 && o.l < r.r + 4 && r.t < o.b + 4 && o.t < r.b + 4; }) ||
          anchors.some(function (o) { return r.l < o.right && o.left < r.r && r.t < o.bottom && o.top < r.b; });
      };
      anchors.forEach(function (a) {
        var l = labels[a.id]; if (!l) return;
        var bw = l.el.offsetWidth, bh = l.el.offsetHeight;
        var c = [[a.x - bw / 2, a.top - bh - 6], [a.right + 6, a.y - bh / 2], [a.left - bw - 6, a.y - bh / 2], [a.x - bw / 2, a.bottom + 6]];
        var pick = c[0];
        for (var i = 0; i < c.length; i++) { var r = { l: c[i][0], t: c[i][1], r: c[i][0] + bw, b: c[i][1] + bh }; if (!hit(r)) { pick = c[i]; break; } }
        placed.push({ l: pick[0], t: pick[1], r: pick[0] + bw, b: pick[1] + bh });
        l.el.style.transform = 'translate(' + Math.round(pick[0]) + 'px,' + Math.round(pick[1]) + 'px)';
        l.pos = pick; l.w = bw; l.h = bh;
      });
    }
    function showTip(id) {
      var l = labels[id]; if (!l || !tip || !state || !l.pos) return;
      var s = l.st;
      tip.textContent = '';
      var b = doc.createElement('b'); b.textContent = s.name + '駅'; tip.appendChild(b);
      var sp = doc.createElement('span'); sp.textContent = s.lines.join('・'); tip.appendChild(sp);
      var cn = doc.createElement('span');
      cn.textContent = (state.types || []).map(function (t) { return t.label + ' ' + ((state.counts[t.id] || {})[id] || 0) + '件'; }).join(' / ');
      tip.appendChild(cn);
      if (s.note) { var no = doc.createElement('span'); no.textContent = s.note; tip.appendChild(no); }
      var lb = labelBox.getBoundingClientRect(), tw = tip.offsetWidth, th = tip.offsetHeight;
      var x = Math.min(Math.max(l.pos[0] + l.w / 2 - tw / 2, 4), lb.width - tw - 4), y = l.pos[1] + l.h + 8;
      if (y + th > lb.height - 4) y = l.pos[1] - th - 8;
      tip.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
      tip.classList.add('bm-show');
    }
    function hideTip() { if (tip) tip.classList.remove('bm-show'); }

    function applyState() {
      if (!state || !net) return;
      var counts = state.counts[state.type] || {};
      net.stations.forEach(function (s) {
        var l = labels[s.id], n = counts[s.id] || 0, on = state.selected.indexOf(s.id) >= 0;
        if (l) {
          l.num.textContent = String(n);
          l.el.setAttribute('aria-checked', String(on));
          if (n) l.el.removeAttribute('aria-disabled'); else l.el.setAttribute('aria-disabled', 'true');
          l.el.setAttribute('aria-label', s.name + '駅 ' + state.typeLabel + n + '件' + (s.shop ? ' ' + s.shop + 'あり' : ''));
        }
        if (caps[s.id]) caps[s.id].geometry = capGeo[s.id][on ? 'on' : n ? 'normal' : 'off'];
      });
      draw();
    }
    function highlight(id) {
      hot = id || null;
      Object.keys(lineMats).forEach(function (k) { lineMats[k].opacity = hot && k !== hot ? 0.16 : 1; });
      if (net) net.stations.forEach(function (s) {
        var l = labels[s.id]; if (!l) return;
        var on = !hot || net.lines.some(function (line) { return line.id === hot && s.lines.indexOf(line.name) >= 0; });
        l.el.classList.toggle('bm-dim', !on);
      });
      draw();
    }

    /* ---------- 並べる ---------- */
    var base = null, shown = false, lastShown = null, builds = 0;
    function layout() {
      var w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      var narrow = global.matchMedia && global.matchMedia('(max-width: 767px)').matches;
      var area = options.area && options.area.getBoundingClientRect(), hb = host.getBoundingClientRect();
      // 見出しが横に並ぶか (縦に積む時は、見出しとパネルの下に路線図)
      var q = options.quiet && [].concat(options.quiet)[0], qr = q && q.getBoundingClientRect(), beside = !qr || !area || area.left >= qr.right - 1;
      // 作り直すのは、幅・並べ方・駅の間隔が変わった時だけ。FV の高さ (パネルが伸びた時など) では作り直さない
      var key = view + ':' + options.cell + ':' + Math.round(w / 40) + ':' + narrow + ':' + (area ? Math.round(area.width / 20) : '') + ':' + (beside ? 'side' : 'stack');
      renderer.setPixelRatio(Math.min(global.devicePixelRatio || 1, w < 768 ? 1.5 : 1.75));
      renderer.setSize(w, h, false);
      var areaTop = area ? area.top - hb.top : 0;
      if (base && base.key === key) {
        // 横に並ぶ時: 路線図の場所はそのまま (FV が伸びた分は、下に街が見えるだけ)
        // 縦に積む時: パネルが伸びて路線図の場所が下がった分だけ、絵ごとずらす (大きく動いた時だけ作り直す)
        var shift = beside || !shown ? 0 : areaTop - base.areaTop;
        // (作った時より FV が低くなった時は、下の駅が切れないように作り直す)
        if (Math.abs(base.shift + shift) <= 160 && h >= base.h - 24) {
          if (shift) { anchor[1] += shift; base.shift += shift; base.areaTop = areaTop; }
          frustum(w, h); draw(); if (shown) placeLabels(w, h); return;
        }
      }
      builds++;
      shown = !!(net && !narrow && area && area.width && area.height);
      if (labelBox) labelBox.hidden = !shown;
      aim();
      if (shown !== lastShown) { lastShown = shown; if (typeof options.onLayout === 'function') options.onLayout({ shown: shown }); }
      if (!shown) { stop(); clear(); clearLabels(); anchor = [w / 2, h / 2]; PX = 18; frustum(w, h); base = { key: key, areaTop: areaTop, shift: 0, h: h }; draw(); return; }
      // 路線図を置く範囲: area から、FV の右の端と上下の端の近くまで (駅と駅のあいだを広く取る)
      // (見出しの横に並ぶ時だけ、上は FV の上の端まで。縦に積む時は、見出しとパネルの下から)
      var R = { l: area.left - hb.left, r: Math.max(area.right - hb.left, w - 32), t: beside ? Math.min(area.top - hb.top, 32) : area.top - hb.top, b: Math.max(area.bottom - hb.top, h - 56) };
      // 1 ブロックの大きさ: 網 (駅と、図の中の折れ目) が R に収まる大きさ。札のぶんの余白を取る
      var fit = function () {
        anchor = [0, 0]; PX = 1; frustum(w, h);
        var bx = net.box, pts = [];
        [bx.x0, bx.x1].forEach(function (gx) { [bx.z0, bx.z1].forEach(function (gz) { [0, 3.5].forEach(function (y) { pts.push(screen(gx - origin[0], y, gz - origin[1], w, h)); }); }); });
        var f = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }, mx = 56, my = 44;
        pts.forEach(function (p) { f.minX = Math.min(f.minX, p[0]); f.maxX = Math.max(f.maxX, p[0]); f.minY = Math.min(f.minY, p[1]); f.maxY = Math.max(f.maxY, p[1]); });
        f.px = Math.max(6, Math.min(28, Math.min((R.r - R.l - mx * 2) / (f.maxX - f.minX), (R.b - R.t - my * 2) / (f.maxY - f.minY))));
        return f;
      };
      var f;
      if (options.cell === 'auto') { // 自動: 1 ブロックが MIN_PX 以上になる中で、いちばん細かい間隔
        for (var i = 0; i < AUTO_CELLS.length; i++) {
          if (cell !== AUTO_CELLS[i]) { cell = AUTO_CELLS[i]; net = makeNetwork(data, { cell: cell, levels: options.levels, layout: options.layout }); origin = net.center; }
          f = fit();
          if (f.px >= MIN_PX) break;
        }
      } else f = fit();
      PX = f.px;
      // 網の真ん中を R の真ん中に
      var cx = (f.minX + f.maxX) / 2 * PX, cy = (f.minY + f.maxY) / 2 * PX; // PX = 1 の時の画面の位置 → 原点からのずれ
      anchor = [(R.l + R.r) / 2 - cx, (R.t + R.b) / 2 - cy];
      frustum(w, h);
      build(w, h);
      base = { key: key, areaTop: areaTop, shift: 0, h: h };
      makeLabels();
      draw();
      placeLabels(w, h);
      if (hot) highlight(hot);
    }
    function draw() { placeTrains(); renderer.render(scene, camera); }
    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (now - last < 33) return; // 30 コマ/秒まで
      var dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
      last = now;
      trains.forEach(function (tr) { stepTrain(tr, dt); });
      draw();
    }
    function start() { if (running || !visible || doc.hidden || !shown) return; running = true; last = 0; raf = requestAnimationFrame(frame); }
    function stop() { running = false; cancelAnimationFrame(raf); }

    var reduce = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var wantMoving = options.moving === undefined ? !reduce : !!options.moving, timer = 0;
    function changed() { if (typeof options.onChange === 'function') options.onChange(wantMoving); }
    var ro = new ResizeObserver(function () { clearTimeout(timer); timer = setTimeout(function () { layout(); if (wantMoving) start(); }, 120); });
    ro.observe(host);
    if (options.area) ro.observe(options.area);
    var io = new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible && wantMoving) start(); else stop(); });
    io.observe(host);
    var onVis = function () { if (doc.hidden) stop(); else if (wantMoving && visible) start(); };
    doc.addEventListener('visibilitychange', onVis);
    layout();
    if (wantMoving) start();

    var destroyed = false;
    var api = {
      el: host, version: VERSION,
      update: function (s) { state = s; applyState(); return api; },
      highlight: function (id) { highlight(id); return api; },
      setView: function (v) { if (VIEWS[v] && v !== view) { view = v; base = null; layout(); } return api; },
      setSpacing: function (c) { // schematic の何単位を 1 ブロックにするか (小さいほど、駅と駅のあいだのブロックが増える)。'auto' で自動
        if (!data || !(c === 'auto' || c > 0)) return api;
        options.cell = c;
        if (c !== 'auto') { cell = c; net = makeNetwork(data, { cell: cell, levels: options.levels, layout: options.layout }); origin = net.center; }
        base = null; layout(); if (hot) highlight(hot); return api;
      },
      play: function () { wantMoving = true; start(); changed(); return api; },
      pause: function () { wantMoving = false; stop(); draw(); changed(); return api; },
      get moving() { return wantMoving; },
      get view() { return view; },
      relayout: function () { base = null; layout(); return api; },
      info: function () { var gp = net ? net.gaps.filter(function (g) { return g <= 20; }) : [0]; // 途中の駅を描いていない長い区間は除く
        return { cell: cell, spacing: options.cell, snap: net ? net.broken : 0, gapMin: Math.min.apply(null, gp), gapMax: Math.max.apply(null, gp), town: built && built.town, hot: hot, view: view, px: Math.round(PX * 10) / 10, shown: shown, stations: shown ? net.stations.length : 0, labels: Object.keys(labels).length, trains: trains.length, builds: builds, running: running, moving: wantMoving }; },
      destroy: function () {
        if (destroyed) return; destroyed = true;
        stop(); clearTimeout(timer); ro.disconnect(); io.disconnect(); doc.removeEventListener('visibilitychange', onVis);
        clear(); clearLabels(); mat.dispose(); renderer.dispose();
        if (labelBox) { labelBox.classList.remove('bm-labels'); labelBox.removeAttribute('role'); labelBox.removeAttribute('aria-label'); labelBox.hidden = false; }
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
        delete host.__blockMap;
      }
    };
    host.__blockMap = api;
    return api;
  }

  global.BlockMap = { version: VERSION, mount: mount };
})(window);
