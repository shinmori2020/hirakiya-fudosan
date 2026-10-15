/*!
 * route-hero.js 2.0.1
 * 路線図から物件を探せるヒーロー。ほかのライブラリは使いません。
 *
 * 路線・駅のデータ (JSON) から路線図を描き、駅や路線を選ぶと、選んだ駅のどれかに当たる物件を
 * 重ならずに数えて、物件一覧へのリンクを組み立てます。使い方とデータの書き方は README.md にあります。
 *
 *   var hero = RouteHero.mount(element, { data: data, items: items, searchUrl: '/properties?type={type}&station={stations}' });
 *   hero.destroy();
 */
(function (global) {
  'use strict';

  var VERSION = '2.0.1';
  var NS = 'http://www.w3.org/2000/svg';
  var STYLE_ID = 'route-hero-style';
  var doc = global.document;
  var live = 0; // いま描いている数。0 になったら CSS も外す

  /* ------------------------------------------------------------ CSS
   * 色・文字の大きさは .rh-root (mount した要素) の変数です。:where() で包んであるので、
   * サイトの CSS で同じ変数を書けば、読み込みの順番に関係なくサイトの値が勝ちます。
   */
  var EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';
  var CSS = [
    ':where(.rh-root){--rh-accent:#1D8282;--rh-accent-hover:#176C6C;--rh-accent-soft:#E0F2F1;--rh-accent-ink:#FFFFFF;' +
      '--rh-ink:#2B2F33;--rh-text:#1F2933;--rh-soft:#5F6B75;--rh-surface:#FFFFFF;--rh-land:#F3F4F5;--rh-rule:#D9DDE1;--rh-water:#D9DDE1;' +
      '--rh-fs-body:16px;--rh-fs-small:13px;--rh-fs-min:12px;color:var(--rh-text);font-size:var(--rh-fs-body)}',
    '@media (max-width:767px){:where(.rh-root){--rh-fs-body:15px;--rh-fs-min:11px}}',
    '.rh-root,.rh-root *{box-sizing:border-box}',
    /* 並べ方: split は 1024px 以上で左にパネル・右に路線図、それより狭いと縦に積む。stack はいつも縦に積む */
    ':where(.rh-split){display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:32px;align-items:center}',
    '@media (max-width:1023px){:where(.rh-split){grid-template-columns:minmax(0,1fr);gap:24px}}',
    ':where(.rh-stack){display:grid;grid-template-columns:minmax(0,1fr);gap:24px}',

    /* 路線図 */
    '.rh-map{position:relative;min-width:0;isolation:isolate}',
    '.rh-scroll{overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;background:var(--rh-land);border-radius:6px}',
    '.rh-svg{display:block;width:100%;height:auto;font-family:inherit;user-select:none;-webkit-user-select:none}',
    '@media (max-width:767px){.rh-svg{min-width:560px}}',
    '.rh-hint{display:none;margin:8px 0 0;font-size:var(--rh-fs-min);line-height:1.5;color:var(--rh-soft)}',
    '@media (max-width:767px){.rh-hint{display:block}}',
    '.rh-river{fill:none;stroke:var(--rh-water);stroke-linecap:butt;stroke-linejoin:round}',
    '.rh-casing{fill:none;stroke:var(--rh-land);stroke-width:11;stroke-linecap:round;stroke-linejoin:round}',
    '.rh-line{fill:none;stroke-width:7;stroke-linecap:round;stroke-linejoin:round;transition:opacity 150ms ' + EASE + ',stroke-width 150ms ' + EASE + '}',
    '.rh-line.rh-hot{stroke-width:9.5}',
    '.rh-stripe{fill:none;stroke:var(--rh-surface);stroke-width:3;stroke-dasharray:10 10;pointer-events:none;transition:opacity 150ms ' + EASE + '}',
    '.rh-linetag{transition:opacity 150ms ' + EASE + '}',
    '.rh-linetag rect{stroke:var(--rh-land);stroke-width:2}',
    '.rh-linetag text{font-size:10px;font-weight:700;text-anchor:middle;dominant-baseline:central;fill:var(--rh-surface)}',
    '.rh-linetag.rh-on-light text{fill:var(--rh-ink)}',
    '.rh-dim{opacity:.22}',

    /* 駅 */
    '.rh-st{cursor:pointer;outline:none;transition:opacity 150ms ' + EASE + '}',
    '.rh-st.rh-dim{opacity:.3}',
    '.rh-size{transform-box:fill-box;transform-origin:center;transition:transform 200ms ' + EASE + '}',
    '.rh-hit{fill:transparent}',
    '.rh-focus{fill:none;stroke:var(--rh-accent-hover);stroke-width:2;opacity:0}',
    '.rh-dot{fill:var(--rh-surface);stroke:var(--rh-ink);stroke-width:2.4;transition:fill 150ms ' + EASE + ',stroke 150ms ' + EASE + '}',
    '.rh-num{font-size:11.5px;font-weight:700;font-variant-numeric:tabular-nums;fill:var(--rh-ink);text-anchor:middle;dominant-baseline:central;pointer-events:none;transition:fill 150ms ' + EASE + '}',
    '.rh-name{font-size:13px;font-weight:700;fill:var(--rh-ink);paint-order:stroke;stroke:var(--rh-land);stroke-width:3.5px;stroke-linejoin:round}',
    '.rh-st:hover .rh-dot,.rh-st:focus-visible .rh-dot{stroke:var(--rh-accent-hover);stroke-width:3.4}',
    '.rh-st:focus-visible .rh-focus{opacity:1}',
    '.rh-st[aria-checked="true"] .rh-dot{fill:var(--rh-accent);stroke:var(--rh-accent)}',
    '.rh-st[aria-checked="true"]:hover .rh-dot{fill:var(--rh-accent-hover);stroke:var(--rh-accent-hover)}',
    '.rh-st[aria-checked="true"] .rh-num{fill:var(--rh-accent-ink)}',
    '.rh-st[aria-disabled="true"]{cursor:default}',
    '.rh-st[aria-disabled="true"] .rh-dot,.rh-st[aria-disabled="true"]:hover .rh-dot{fill:var(--rh-surface);stroke:var(--rh-soft);stroke-width:1.6;stroke-dasharray:3 2.5}',
    '.rh-st[aria-disabled="true"] .rh-num{fill:var(--rh-soft)}',
    '.rh-st[aria-disabled="true"] .rh-name{fill:var(--rh-soft);font-weight:500}',
    '.rh-shop rect{fill:var(--rh-ink)}',
    '.rh-shop text{font-size:10px;font-weight:700;fill:var(--rh-surface);text-anchor:middle;dominant-baseline:central}',

    /* 駅の上に出る説明 */
    '.rh-tip{position:absolute;left:0;top:0;z-index:2;max-width:240px;margin:0;padding:8px 12px;border:1px solid var(--rh-rule);border-radius:6px;background:var(--rh-surface);color:var(--rh-text);' +
      'font-size:var(--rh-fs-small);line-height:1.5;pointer-events:none;opacity:0;transform:translate(-50%,calc(-100% - 8px));transition:opacity 150ms ' + EASE + '}',
    '.rh-tip.rh-show{opacity:1}',
    '.rh-tip.rh-below{transform:translate(-50%,8px)}',
    '.rh-tip b{display:block;font-size:var(--rh-fs-body);font-weight:700;color:var(--rh-ink)}',
    '.rh-tip span{display:block;color:var(--rh-soft);font-variant-numeric:tabular-nums}',

    /* 選択と検索のパネル */
    '.rh-panel{display:grid;gap:16px;align-content:start;min-width:0}',
    '.rh-panel [hidden],.rh-map [hidden]{display:none!important}',
    '.rh-tabs{display:inline-flex;justify-self:start;border:1px solid var(--rh-rule);border-radius:6px;overflow:hidden;background:var(--rh-surface)}',
    '.rh-tab{font:inherit;font-size:var(--rh-fs-body);font-weight:700;line-height:1.25;margin:0;padding:12px 24px;border:0;border-radius:0;background:transparent;color:var(--rh-text);cursor:pointer;' +
      'transition:background-color 150ms ' + EASE + ',color 150ms ' + EASE + '}',
    '.rh-tab+.rh-tab{border-left:1px solid var(--rh-rule)}',
    '.rh-tab:hover{background:var(--rh-accent-soft)}',
    '.rh-tab[aria-pressed="true"]{background:var(--rh-accent);color:var(--rh-accent-ink)}',
    '.rh-lines{display:flex;flex-wrap:wrap;gap:8px}',
    '.rh-linechip{font:inherit;font-size:var(--rh-fs-small);font-weight:500;line-height:1.25;display:inline-flex;align-items:center;gap:8px;margin:0;padding:8px 12px;' +
      'border:1px solid var(--rh-rule);border-radius:6px;background:var(--rh-surface);color:var(--rh-text);cursor:pointer;' +
      'transition:background-color 150ms ' + EASE + ',border-color 150ms ' + EASE + ',color 150ms ' + EASE + '}',
    '.rh-linechip i{display:block;flex:none;width:16px;height:4px;background:var(--rh-c)}',
    '.rh-linechip small{font-size:var(--rh-fs-min);font-weight:400;color:var(--rh-soft);font-variant-numeric:tabular-nums}',
    '.rh-linechip:hover{background:var(--rh-accent-soft);border-color:var(--rh-accent-hover)}',
    '.rh-linechip[aria-pressed="true"]{background:var(--rh-accent);border-color:var(--rh-accent);color:var(--rh-accent-ink)}',
    '.rh-linechip[aria-pressed="true"]:hover{background:var(--rh-accent-hover);border-color:var(--rh-accent-hover)}',
    '.rh-linechip[aria-pressed="true"] small{color:inherit}',
    '.rh-linechip[aria-pressed="true"] i{background:var(--rh-accent-ink)}',
    '.rh-linechip:disabled{cursor:default;color:var(--rh-soft);background:var(--rh-surface);border-color:var(--rh-rule)}',
    '.rh-picked{display:flex;flex-wrap:wrap;align-items:center;gap:8px;min-height:36px;margin:0;font-size:var(--rh-fs-small);line-height:1.5;color:var(--rh-soft)}',
    '.rh-chip{font:inherit;font-size:var(--rh-fs-small);font-weight:500;line-height:1.25;display:inline-flex;align-items:center;gap:8px;margin:0;padding:8px 12px;' +
      'border:1px solid var(--rh-rule);border-radius:6px;background:var(--rh-surface);color:var(--rh-text);cursor:pointer;' +
      'transition:background-color 150ms ' + EASE + ',border-color 150ms ' + EASE + '}',
    '.rh-chip span{font-weight:400;color:var(--rh-soft)}',
    '.rh-chip:hover{background:var(--rh-accent-soft);border-color:var(--rh-accent-hover)}',
    '.rh-actions{display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px}',
    '.rh-go{display:inline-flex;align-items:center;justify-content:center;margin:0;padding:16px 24px;border:0;border-radius:6px;background:var(--rh-accent);color:var(--rh-accent-ink);' +
      'font-size:var(--rh-fs-body);font-weight:700;line-height:1.5;text-align:center;text-decoration:none;font-variant-numeric:tabular-nums;transition:background-color 150ms ' + EASE + '}',
    '.rh-go:hover,.rh-go:active,.rh-go:visited{color:var(--rh-accent-ink);text-decoration:none}',
    '.rh-go:hover,.rh-go:active{background:var(--rh-accent-hover)}',
    '.rh-under{display:none;width:100%;margin-top:12px}',
    '@media (max-width:1023px){.rh-under.rh-on{display:flex}}',
    '.rh-stack .rh-under.rh-on{display:flex}',
    '.rh-clear{font:inherit;font-size:var(--rh-fs-small);line-height:1.5;margin:0;padding:4px 0;border:0;background:transparent;color:var(--rh-soft);text-decoration:underline;text-underline-offset:4px;cursor:pointer;transition:color 150ms ' + EASE + '}',
    '.rh-clear:hover{color:var(--rh-text)}',
    '.rh-linechip:focus-visible,.rh-chip:focus-visible,.rh-go:focus-visible,.rh-clear:focus-visible{outline:2px solid var(--rh-accent-hover);outline-offset:2px}',
    '.rh-tab:focus-visible{outline:2px solid var(--rh-ink);outline-offset:-4px}',
    '.rh-tab[aria-pressed="true"]:focus-visible{outline-color:var(--rh-accent-ink)}',
    '.rh-sr{position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap}',

    /* 「動きを減らす」の設定では、すべての動きを止める */
    '@media (prefers-reduced-motion: reduce){.rh-root,.rh-root *{transition:none!important;animation:none!important}}'
  ].join('\n');

  function injectCss() {
    if (doc.getElementById(STYLE_ID)) return;
    var style = doc.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    (doc.head || doc.documentElement).appendChild(style);
  }
  function removeCss() {
    var style = doc.getElementById(STYLE_ID);
    if (style && style.parentNode) style.parentNode.removeChild(style);
  }

  /* ------------------------------------------------------------ 道具 */

  function svg(name, attrs, parent) {
    var node = doc.createElementNS(NS, name);
    for (var k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }
  function html(tag, className, parent, text) {
    var node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    if (parent) parent.appendChild(node);
    return node;
  }
  function warn(message) { if (global.console) global.console.warn('[route-hero] ' + message); }
  // 点の並びを直線でつなぎ、折れ目だけ丸める
  function straight(points, radius) {
    if (points.length < 2) return '';
    var d = 'M' + points[0][0] + ' ' + points[0][1];
    for (var i = 1; i < points.length - 1; i++) {
      var p0 = points[i - 1], p1 = points[i], p2 = points[i + 1];
      var ax = p1[0] - p0[0], ay = p1[1] - p0[1], bx = p2[0] - p1[0], by = p2[1] - p1[1];
      var la = Math.sqrt(ax * ax + ay * ay), lb = Math.sqrt(bx * bx + by * by);
      if (!la || !lb) continue;
      if (Math.abs(ax * by - ay * bx) < 1e-6 * la * lb) { d += ' L' + p1[0] + ' ' + p1[1]; continue; } // まっすぐ通る点
      var k = Math.min(radius, la / 2, lb / 2);
      d += ' L' + (p1[0] - ax / la * k).toFixed(1) + ' ' + (p1[1] - ay / la * k).toFixed(1) +
        ' Q' + p1[0] + ' ' + p1[1] + ' ' + (p1[0] + bx / lb * k).toFixed(1) + ' ' + (p1[1] + by / lb * k).toFixed(1);
    }
    var last = points[points.length - 1];
    return d + ' L' + last[0] + ' ' + last[1];
  }
  // 縦書きの文字。1 文字ずつ積む (up のときは、最後の文字が y に来る)
  function stacked(parent, text, className, x, y, step, up) {
    var chars = text.split(''), t = svg('text', { 'class': className, 'text-anchor': 'middle' }, parent);
    chars.forEach(function (ch, i) {
      svg('tspan', { x: x, y: up ? y - (chars.length - 1 - i) * step : y + i * step }, t).textContent = ch === 'ー' ? '｜' : ch;
    });
    return t;
  }
  // 明るい色の札には濃い文字を載せる
  function isLight(color) {
    var c = String(color || '').replace('#', '');
    if (c.length === 3) c = c.charAt(0) + c.charAt(0) + c.charAt(1) + c.charAt(1) + c.charAt(2) + c.charAt(2);
    if (!/^[0-9a-f]{6}$/i.test(c)) return false;
    return parseInt(c.substr(0, 2), 16) * 0.299 + parseInt(c.substr(2, 2), 16) * 0.587 + parseInt(c.substr(4, 2), 16) * 0.114 > 150;
  }
  // 値が空の検索条件 (station= など) を、アドレスから外す
  function cleanUrl(url) {
    var hash = '', h = url.indexOf('#');
    if (h >= 0) { hash = url.slice(h); url = url.slice(0, h); }
    var q = url.indexOf('?');
    if (q < 0) return url + hash;
    var params = url.slice(q + 1).split('&').filter(function (p) { return p !== '' && p.split('=')[1] !== ''; });
    return url.slice(0, q) + (params.length ? '?' + params.join('&') : '') + hash;
  }

  /* ------------------------------------------------------------ 本体 */

  function mount(host, options) {
    if (!host || host.nodeType !== 1) throw new Error('RouteHero.mount: 描く場所の要素を渡してください');
    if (host.__routeHero) host.__routeHero.destroy(); // 同じ要素にもう一度 mount したら、前の表示を片付けてから描く
    options = options || {};
    var data = options.data;
    if (typeof data === 'string') { try { data = JSON.parse(data); } catch (e) { data = null; } }
    if (!data || !Array.isArray(data.lines) || !Array.isArray(data.stations)) {
      warn('路線図のデータ (data) を読めませんでした。lines と stations のある JSON を渡してください。');
      return null;
    }

    /* ---------- データを整える ---------- */
    var W = data.viewBox ? data.viewBox[0] : 660, H = data.viewBox ? data.viewBox[1] : 560;
    var radius = +data.corner || 16;
    var types = data.types && data.types.length ? data.types : [{ id: 'rental', label: '賃貸' }];
    var searchUrl = options.searchUrl || '/properties?type={type}&station={stations}';
    var byId = {}, lineOf = {}, onLine = {};
    data.stations.forEach(function (s) { byId[s.id] = s; lineOf[s.id] = []; });
    data.lines.forEach(function (line) {
      onLine[line.id] = [];
      line.path.forEach(function (p) {
        if (typeof p !== 'string') return;
        if (!byId[p]) { warn('路線 ' + line.id + ' の駅 "' + p + '" が stations にありません。'); return; }
        if (lineOf[p].indexOf(line) < 0) lineOf[p].push(line);
        if (onLine[line.id].indexOf(p) < 0) onLine[line.id].push(p);
      });
    });

    // 件数: items (物件ごとの種類と駅) があれば、選んだ駅のどれかに当たる物件を重ならずに数える。
    // items がなければ、駅ごとの counts を足す (前の版の書き方)。
    var items = options.items || data.items || null;
    if (items && !Array.isArray(items) && Array.isArray(items.items)) items = items.items;
    if (items && !Array.isArray(items)) items = null;
    var byType = {}, perStation = {};
    types.forEach(function (t) { byType[t.id] = []; perStation[t.id] = {}; });
    if (items) {
      items.forEach(function (it) {
        if (!it || !byType[it.type] || !Array.isArray(it.stations)) return;
        var ids = it.stations.filter(function (id, i) { return it.stations.indexOf(id) === i; });
        byType[it.type].push(ids);
        ids.forEach(function (id) { perStation[it.type][id] = (perStation[it.type][id] || 0) + 1; });
      });
    } else if (!data.stations.some(function (s) { return s.counts; })) {
      warn('件数のデータがありません。options.items に物件ごとの種類と駅を渡してください。');
    }

    injectCss();
    live++;

    // pressed: 路線のチップで押した路線。押された表示は、押した路線で、その路線の駅 (いまの種類で選べる駅) が全部選ばれている間だけ
    var state = { type: types[0].id, selected: [], pressed: [] };
    if (options.type && byType[options.type]) state.type = options.type;
    var nodes = {}, lineNodes = {}, stripes = {}, lineTags = {}, lineChips = {}, tabs = {}, added = [], tipTimer = 0, touched = false;
    var layout = options.panel ? 'none' : (options.layout || 'split');
    var hostClasses = ['rh-root'].concat(layout === 'split' ? ['rh-split'] : layout === 'stack' ? ['rh-stack'] : []);
    hostClasses.forEach(function (c) { host.classList.add(c); });

    function count(id, type) {
      type = type || state.type;
      if (items) return perStation[type][id] || 0;
      var s = byId[id];
      return (s && s.counts && s.counts[type]) || 0;
    }
    function anyOf(ids, type) { // ids の駅のどれかに当たる物件の数
      type = type || state.type;
      if (items) return byType[type].filter(function (st) { return st.some(function (id) { return ids.indexOf(id) >= 0; }); }).length;
      return ids.reduce(function (sum, id) { return sum + count(id, type); }, 0);
    }
    function total() {
      if (state.selected.length) return anyOf(state.selected);
      if (items) return byType[state.type].length;
      return anyOf(data.stations.map(function (s) { return s.id; }));
    }
    function typeLabel() { for (var i = 0; i < types.length; i++) if (types[i].id === state.type) return types[i].label; return ''; }
    function selectable(id) { return !!byId[id] && count(id) > 0; }

    /* ---------- 路線図を描く ---------- */
    var mapBox = html('div', 'rh-map');
    var scroller = html('div', 'rh-scroll', mapBox);
    var root = svg('svg', { 'class': 'rh-svg', viewBox: '0 0 ' + W + ' ' + H, role: 'group', 'aria-label': options.label || '路線図。駅を選ぶと、その駅の物件を探せます。' }, scroller);
    html('p', 'rh-hint', mapBox, '路線図は横にスクロールできます。');
    var tip = html('div', 'rh-tip', mapBox);
    tip.setAttribute('aria-hidden', 'true');
    // 縦に積む並べ方では検索ボタンが路線図の上に離れるので、駅を選んだら路線図のすぐ下にも同じボタンを出す
    var under = html('a', 'rh-go rh-under', mapBox);

    // 川 (名前は描かない)
    (data.rivers || []).forEach(function (r) {
      if (r && r.path) svg('path', { 'class': 'rh-river', d: straight(r.path, radius * 2), 'stroke-width': r.width || 12 }, root);
    });
    function points(line) {
      return line.path.filter(function (p) { return typeof p !== 'string' || byId[p]; })
        .map(function (p) { return typeof p === 'string' ? [byId[p].x, byId[p].y] : p; });
    }
    data.lines.forEach(function (line) { svg('path', { 'class': 'rh-casing', d: straight(points(line), radius) }, root); });
    data.lines.forEach(function (line) {
      var d = straight(points(line), radius);
      lineNodes[line.id] = svg('path', { 'class': 'rh-line', d: d, stroke: line.color || '#5F6B75' }, root);
      if (line.stripe) stripes[line.id] = svg('path', { 'class': 'rh-stripe', d: d }, root); // 白い破線を重ねて、同じ色の線と見分ける
    });
    // 路線名の札 (lines[].tag に [x, y] を書いた路線だけ)
    data.lines.forEach(function (line) {
      if (!line.tag) return;
      var text = line.name, w = 12, i;
      for (i = 0; i < text.length; i++) w += text.charCodeAt(i) < 0x2000 ? 6.2 : 10.4;
      var g = svg('g', { 'class': 'rh-linetag' + (isLight(line.color) ? ' rh-on-light' : ''), transform: 'translate(' + line.tag[0] + ' ' + line.tag[1] + ')' }, root);
      svg('rect', { x: (-w / 2).toFixed(1), y: -9, width: w.toFixed(1), height: 18, rx: 6, style: 'fill:' + (line.color || '#5F6B75') }, g);
      svg('text', {}, g).textContent = text;
      lineTags[line.id] = g;
    });

    function nameText(parent, s) {
      var l = s.label || [0, -16, 'middle'];
      if (l[2] === 'up' || l[2] === 'down') return stacked(parent, s.name, 'rh-name', l[0], l[1], 14, l[2] === 'up'); // 縦書き
      var t = svg('text', { 'class': 'rh-name', x: l[0], y: l[1], 'text-anchor': l[2] || 'middle' }, parent);
      t.textContent = s.name;
      return t;
    }
    data.stations.forEach(function (s) {
      var g = svg('g', { 'class': 'rh-st', transform: 'translate(' + s.x + ' ' + s.y + ')', tabindex: 0, role: 'checkbox', 'aria-checked': 'false' }, root);
      svg('circle', { 'class': 'rh-hit', r: 21 }, g);
      var size = svg('g', { 'class': 'rh-size' }, g);
      svg('circle', { 'class': 'rh-focus', r: 17 }, size);
      svg('circle', { 'class': 'rh-dot', r: 12 }, size);
      var numText = svg('text', { 'class': 'rh-num' }, size);
      nameText(g, s);
      if (s.shop) { // 店舗のある駅には、駅名の横 (縦書きなら駅名の先) に小さな札を付ける
        var l = s.label || [0, -16, 'middle'], w = s.name.length * 13.4, tagW = s.shop.length * 10 + 12;
        var x = l[2] === 'start' ? l[0] + w + 5 : l[2] === 'end' ? l[0] - w - 5 - tagW : l[0] + w / 2 + 5, y = l[1] - 14;
        if (l[2] === 'up') { x = l[0] - tagW / 2; y = l[1] - (s.name.length - 1) * 14 - 34; }
        if (l[2] === 'down') { x = l[0] - tagW / 2; y = l[1] + (s.name.length - 1) * 14 + 6; }
        var tag = svg('g', { 'class': 'rh-shop', transform: 'translate(' + x + ' ' + y + ')' }, g);
        svg('rect', { width: tagW, height: 18, rx: 6 }, tag);
        svg('text', { x: tagW / 2, y: 9 }, tag).textContent = s.shop;
      }
      g.addEventListener('pointerdown', function (e) { touched = e.pointerType === 'touch' || e.pointerType === 'pen'; });
      g.addEventListener('click', function () { toggle(s.id); showTip(s); });
      g.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); toggle(s.id); }
      });
      g.addEventListener('pointerenter', function () { showTip(s); });
      g.addEventListener('pointerleave', hideTip);
      g.addEventListener('focus', function () { showTip(s); });
      g.addEventListener('blur', hideTip);
      nodes[s.id] = { g: g, size: size, num: numText };
    });

    /* ---------- 駅の上に出る説明 ---------- */
    function showTip(s) {
      tip.textContent = '';
      html('b', '', tip, s.name + '駅');
      html('span', '', tip, lineOf[s.id].map(function (l) { return l.name; }).join('・'));
      html('span', '', tip, types.map(function (t) { return t.label + ' ' + count(s.id, t.id) + '件'; }).join(' / '));
      if (s.note) html('span', '', tip, s.note);
      var a = nodes[s.id].size.getBoundingClientRect(), b = mapBox.getBoundingClientRect(); // 駅の丸の位置に合わせる
      var half = tip.offsetWidth / 2 + 4;
      var x = Math.min(Math.max(a.left + a.width / 2 - b.left, half), Math.max(half, b.width - half));
      var below = a.top - b.top < tip.offsetHeight + 12; // 上に出す余地がなければ、駅の下に出す
      tip.classList.toggle('rh-below', below);
      tip.style.left = x + 'px';
      tip.style.top = (below ? a.bottom - b.top : a.top - b.top) + 'px';
      tip.classList.add('rh-show');
      clearTimeout(tipTimer);
      if (touched) tipTimer = setTimeout(hideTip, 2600); // 指で押したときは、しばらくしたら消す
    }
    function hideTip() { clearTimeout(tipTimer); tip.classList.remove('rh-show'); }

    /* ---------- 選択と検索のパネル ---------- */
    var panel = html('div', 'rh-panel');
    var tabBox = html('div', 'rh-tabs', panel);
    tabBox.setAttribute('role', 'group');
    tabBox.setAttribute('aria-label', '物件の種類');
    if (types.length < 2) tabBox.hidden = true;
    types.forEach(function (t) {
      var b = html('button', 'rh-tab', tabBox, t.label);
      b.type = 'button';
      b.addEventListener('click', function () { setType(t.id); });
      tabs[t.id] = b;
    });
    var lineBox = html('div', 'rh-lines', panel);
    lineBox.setAttribute('role', 'group');
    lineBox.setAttribute('aria-label', '路線でまとめて選ぶ');
    data.lines.forEach(function (line) {
      if (!onLine[line.id].length) return;
      var b = html('button', 'rh-linechip', lineBox);
      b.type = 'button';
      html('i', '', b).style.setProperty('--rh-c', line.color || '#5F6B75');
      html('span', '', b, line.name);
      var small = html('small', '', b);
      b.addEventListener('click', function () { toggleLine(line); });
      b.addEventListener('pointerenter', function () { focusLine(line.id); });
      b.addEventListener('pointerleave', function () { focusLine(null); });
      b.addEventListener('focus', function () { focusLine(line.id); });
      b.addEventListener('blur', function () { focusLine(null); });
      lineChips[line.id] = { button: b, small: small, line: line };
    });
    var picked = html('div', 'rh-picked', panel);
    var actions = html('div', 'rh-actions', panel);
    var go = html('a', 'rh-go', actions);
    var clear = html('button', 'rh-clear', actions, '選択を解除');
    clear.type = 'button';
    clear.addEventListener('click', function () { select([]); });
    var liveText = html('p', 'rh-sr', panel);
    liveText.setAttribute('aria-live', 'polite');

    // 置く: パネルを別の要素に置く指定 (options.panel) がなければ、mount した要素の中にパネル → 路線図の順に置く
    if (options.panel) {
      options.panel.classList.add('rh-root');
      options.panel.appendChild(panel);
    } else host.appendChild(panel);
    host.appendChild(mapBox);
    added.push(panel, mapBox);

    // 検索ボタン: 押した時に取り消しのできる rh:go を出す。サイトが止めれば (preventDefault)、ページは移動しない
    function onGo(e) {
      if (e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // 新しいタブで開く操作はそのまま
      var detail = snapshot();
      var proceed = host.dispatchEvent(new CustomEvent('rh:go', { detail: detail, bubbles: true, cancelable: true }));
      if (typeof options.onGo === 'function' && options.onGo(detail) === false) proceed = false;
      if (!proceed) e.preventDefault();
    }
    go.addEventListener('click', onGo);
    under.addEventListener('click', onGo);

    function focusLine(id) {
      data.lines.forEach(function (line) {
        var off = !!id && line.id !== id;
        lineNodes[line.id].classList.toggle('rh-dim', off);
        lineNodes[line.id].classList.toggle('rh-hot', line.id === id);
        if (stripes[line.id]) stripes[line.id].classList.toggle('rh-dim', off);
        if (lineTags[line.id]) lineTags[line.id].classList.toggle('rh-dim', off);
      });
      data.stations.forEach(function (s) {
        nodes[s.id].g.classList.toggle('rh-dim', !!id && !lineOf[s.id].some(function (l) { return l.id === id; }));
      });
    }

    /* ---------- 状態を画面に反映する ---------- */
    function url() {
      return cleanUrl(searchUrl
        .split('{type}').join(encodeURIComponent(state.type))
        .split('{stations}').join(state.selected.map(encodeURIComponent).join(','))
        .split('{names}').join(state.selected.map(function (id) { return encodeURIComponent(byId[id].name); }).join(',')));
    }
    function sentence(n) {
      var label = typeLabel();
      if (!state.selected.length) return 'すべての' + label + '物件を見る（' + n + '件）';
      if (state.selected.length === 1) return byId[state.selected[0]].name + '駅の' + label + '物件を見る（' + n + '件）';
      return '選んだ' + state.selected.length + '駅の' + label + '物件を見る（' + n + '件）';
    }
    function snapshot() {
      return { type: state.type, stations: state.selected.slice(), names: state.selected.map(function (id) { return byId[id].name; }), count: total(), url: url() };
    }

    function render(announce) {
      types.forEach(function (t) { tabs[t.id].setAttribute('aria-pressed', String(t.id === state.type)); });
      data.stations.forEach(function (s) {
        var n = count(s.id), node = nodes[s.id], on = state.selected.indexOf(s.id) >= 0;
        node.num.textContent = String(n);
        node.size.style.transform = 'scale(' + (n ? 0.82 + Math.min(n, 8) * 0.07 : 0.72).toFixed(3) + ')'; // 件数が多い駅ほど大きく
        node.g.setAttribute('aria-checked', String(on));
        if (n) node.g.removeAttribute('aria-disabled'); else node.g.setAttribute('aria-disabled', 'true');
        node.g.setAttribute('aria-label', s.name + '駅 ' + typeLabel() + n + '件' + (s.shop ? ' ' + s.shop + 'あり' : ''));
      });
      // 押した路線のうち、駅が 1 つでも外れた路線は、押した路線から外す (駅を外した手段は問わない)
      state.pressed = state.pressed.filter(lineComplete);
      Object.keys(lineChips).forEach(function (id) {
        var chip = lineChips[id], ids = onLine[id].filter(selectable);
        chip.small.textContent = anyOf(onLine[id]) + '件'; // その沿線に属する物件の数 (重ならずに数える)
        chip.button.disabled = !ids.length;
        // 見た目 (CSS の [aria-pressed="true"]) と読み上げは、同じこの値で決まる
        chip.button.setAttribute('aria-pressed', String(state.pressed.indexOf(id) >= 0));
      });
      picked.textContent = '';
      if (!state.selected.length) picked.textContent = '路線図の駅を押すと、その駅で絞り込めます。複数選べます。';
      state.selected.forEach(function (id) {
        var chip = html('button', 'rh-chip', picked);
        chip.type = 'button';
        chip.appendChild(doc.createTextNode(byId[id].name));
        html('span', '', chip, '×').setAttribute('aria-hidden', 'true');
        chip.setAttribute('aria-label', byId[id].name + 'を選択から外す');
        chip.addEventListener('click', function () { toggle(id); });
      });
      clear.hidden = !state.selected.length;
      var detail = snapshot();
      go.textContent = under.textContent = sentence(detail.count);
      go.setAttribute('href', detail.url);
      under.setAttribute('href', detail.url);
      under.classList.toggle('rh-on', state.selected.length > 0);
      if (announce) liveText.textContent = sentence(detail.count);
      host.dispatchEvent(new CustomEvent('rh:change', { detail: detail, bubbles: true }));
      if (typeof options.onChange === 'function') options.onChange(detail);
    }

    function select(ids) {
      state.selected = ids.filter(function (id, i) { return selectable(id) && ids.indexOf(id) === i; });
      render(true);
    }
    function toggle(id) {
      if (!selectable(id)) return;
      var i = state.selected.indexOf(id);
      if (i >= 0) state.selected.splice(i, 1); else state.selected.push(id);
      render(true);
    }
    // その路線の駅 (いまの種類で選べる駅) が 1 つ以上あり、全部選ばれているか
    function lineComplete(lineId) {
      var ids = (onLine[lineId] || []).filter(selectable);
      return ids.length > 0 && ids.every(function (id) { return state.selected.indexOf(id) >= 0; });
    }
    // 路線のチップ: 押していなければ、押した路線にして駅を全部選ぶ。押していれば、押した路線から外し、
    // その路線の駅を外す (ほかの押した路線の駅でもある駅は残す)。駅を 1 つずつ選んでそろっても、押した路線にはしない
    function toggleLine(line) {
      var ids = onLine[line.id].filter(selectable);
      if (!ids.length) return;
      var at = state.pressed.indexOf(line.id);
      if (at >= 0) {
        state.pressed.splice(at, 1);
        var keep = {};
        state.pressed.forEach(function (lid) { onLine[lid].forEach(function (id) { keep[id] = true; }); });
        state.selected = state.selected.filter(function (id) { return ids.indexOf(id) < 0 || keep[id]; });
      } else {
        state.pressed.push(line.id);
        ids.forEach(function (id) { if (state.selected.indexOf(id) < 0) state.selected.push(id); });
      }
      render(true);
    }
    function setType(id) {
      if (!tabs[id] || state.type === id) return;
      state.type = id;
      state.selected = state.selected.filter(selectable); // その種類で 0 件の駅は選択から外す
      render(true);
    }

    render(false);

    // 狭い画面では路線図を横スクロールにし、最初は店舗のある駅が見える位置に合わせる
    var first = data.stations.filter(function (s) { return s.shop; })[0] || data.stations[0];
    if (first && scroller.scrollWidth > scroller.clientWidth + 4) {
      scroller.scrollLeft = first.x / W * scroller.scrollWidth - scroller.clientWidth / 2;
    }
    scroller.addEventListener('scroll', hideTip, { passive: true });

    var destroyed = false;
    var api = {
      el: host,
      version: VERSION,
      get: function () { return snapshot(); },
      select: function (ids) { select([].concat(ids || [])); return api; },
      clear: function () { select([]); return api; },
      setType: function (id) { setType(id); return api; },
      destroy: function () {
        if (destroyed) return;
        destroyed = true;
        clearTimeout(tipTimer);
        added.forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
        hostClasses.forEach(function (c) { host.classList.remove(c); });
        if (options.panel) options.panel.classList.remove('rh-root');
        if (!host.getAttribute('class')) host.removeAttribute('class');
        if (options.panel && !options.panel.getAttribute('class')) options.panel.removeAttribute('class');
        delete host.__routeHero;
        live--;
        if (live <= 0) { live = 0; removeCss(); }
      }
    };
    host.__routeHero = api;
    return api;
  }

  // 読み込んだだけでは何も描きません。描くときは RouteHero.mount() を呼んでください。
  global.RouteHero = { version: VERSION, mount: mount };
})(window);
