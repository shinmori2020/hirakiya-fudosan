/**
 * 見た目の実測(J-068〜J-076・F-007〜F-009 で使った5種類をまとめたもの)。
 * 使い方:確認用サーバー(3001)を起動してから
 *   cd web && node scripts/measure.mjs /properties/HR-R-0001 1280 768 390
 * 出るもの:ラベル幅と値の左端 / 主要ブロックの下端 / 折り返し行数 / アイコンと文字の中心のずれ / 当たり判定
 * Playwright は隣のリポジトリの playwright-core を読む(.claude/rules/verification.md §2)。
 */
import { createRequire } from 'node:module';

const require = createRequire('C:/Users/kiyos/Desktop/shin-portfolio-2026/package.json');
const { chromium } = require('playwright-core');

const [, , pathArgRaw = 'properties/HR-R-0001', ...widthArgs] = process.argv;

/**
 * Git Bash(MSYS)は先頭が / の引数を Windows のパスに書き換える
 * (/properties/HR-R-0001 → C:/Program Files/Git/properties/HR-R-0001)。
 * 書き換えられていたら元に戻す。引数は先頭の / を付けずに渡すのが安全。
 */
function normalizePath(raw) {
	let v = String(raw).split('\\').join('/');
	if (/^[A-Za-z]:/.test(v)) {
		const i = v.indexOf("/Git/");
		v = i >= 0 ? v.slice(i + 4) : "/" + v.split("/").slice(-2).join("/");
	}
	return v.startsWith("/") ? v : "/" + v;
}
const pathArg = normalizePath(pathArgRaw);
const widths = widthArgs.length > 0 ? widthArgs.map(Number) : [1280, 768, 390];
const base = process.env.MEASURE_BASE ?? 'http://localhost:3001';

const browser = await chromium.launch();

for (const width of widths) {
	const ctx = await browser.newContext({
		viewport: { width, height: 1000 },
		isMobile: width <= 480,
		hasTouch: width <= 480,
		deviceScaleFactor: 1,
	});
	const page = await ctx.newPage();
	await page.goto(base + pathArg, { waitUntil: 'load' });
	await page.waitForTimeout(600);

	const result = await page.evaluate(() => {
		const round = (n) => Math.round(n);
		const abs = (el) => {
			const r = el.getBoundingClientRect();
			return { top: round(r.top + window.scrollY), bottom: round(r.bottom + window.scrollY), left: round(r.left), width: round(r.width), height: round(r.height) };
		};
		/** 文字そのものの矩形(要素の箱ではなく中身) */
		const textRect = (el) => {
			const range = document.createRange();
			range.selectNodeContents(el);
			return range.getBoundingClientRect();
		};
		const lines = (el) => {
			const lh = parseFloat(getComputedStyle(el).lineHeight);
			return Number.isFinite(lh) && lh > 0 ? Math.round(el.getBoundingClientRect().height / lh) : 1;
		};

		// 1 ラベル幅と値の左端(dl の各行)
		const rows = [...document.querySelectorAll('dl')].flatMap((dl, i) =>
			[...dl.querySelectorAll('dt')].map((dt) => {
				const dd = dt.nextElementSibling;
				return {
					dl: i,
					label: dt.textContent.trim(),
					labelWidth: round(dt.getBoundingClientRect().width),
					valueLeft: dd ? round(dd.getBoundingClientRect().left) : null,
					valueLines: dd ? lines(dd) : null,
				};
			}),
		);

		// 2 主要ブロックの下端
		const pick = (sel) => document.querySelector(sel);
		const blocks = {
			ギャラリーのサムネイル: pick('ul[aria-label="写真の一覧"]'),
			右カラム: pick('h1')?.parentElement,
			右カラムの最後の要素: pick('h1')?.parentElement?.lastElementChild,
			物件データ: [...document.querySelectorAll('section')].find((s) => /物件データ|物件概要/.test(s.querySelector('h2')?.textContent ?? '')),
		};
		const bottoms = Object.fromEntries(Object.entries(blocks).filter(([, el]) => el).map(([k, el]) => [k, abs(el)]));

		// 3 折り返し行数。要素の箱ではなく「文字の矩形」で数える(高さ固定のボタンを誤検知しないため)。
		//    短い文(30文字以内)だけを見る(カードや本文は元から複数行なので除く)
		const textLines = (el) => {
			const lh = parseFloat(getComputedStyle(el).lineHeight);
			const h = textRect(el).height;
			return Number.isFinite(lh) && lh > 0 ? Math.round(h / lh) : 1;
		};
		const wrapped = [...document.querySelectorAll('main p, main a, main summary, main dd')]
			.filter((el) => {
				const t = el.textContent.replace(/\s+/g, ' ').trim();
				return t !== '' && t.length <= 30 && textLines(el) > 1;
			})
			.slice(0, 12)
			.map((el) => ({ text: el.textContent.replace(/\s+/g, ' ').trim().slice(0, 30), lines: textLines(el) }));

		// 4 アイコンと文字の中心のずれ
		const icons = [...document.querySelectorAll('main p, main summary, main dt')]
			.filter((el) => el.querySelector('svg'))
			.slice(0, 12)
			.map((el) => {
				const svg = el.querySelector('svg').getBoundingClientRect();
				const target = el.querySelector('span') ?? el;
				const t = textRect(target);
				return {
					text: target.textContent.replace(/\s+/g, ' ').trim().slice(0, 18),
					align: getComputedStyle(el).alignItems,
					iconPx: round(svg.width),
					fontPx: getComputedStyle(el).fontSize,
					offset: +(svg.top + svg.height / 2 - (t.top + t.height / 2)).toFixed(1),
				};
			});

		return { rows, bottoms, wrapped, icons, scrollHeight: document.documentElement.scrollHeight };
	});

	console.log(`\n===== ${width}px  ${pathArg}  (ページ高 ${result.scrollHeight}px)`);

	console.log('-- ラベル幅と値の左端(dl ごと)');
	const byDl = new Map();
	for (const r of result.rows) {
		if (!byDl.has(r.dl)) byDl.set(r.dl, []);
		byDl.get(r.dl).push(r);
	}
	for (const [i, list] of byDl) {
		const widthsSet = [...new Set(list.map((r) => r.labelWidth))];
		const leftsSet = [...new Set(list.map((r) => r.valueLeft))];
		console.log(
			`   dl#${i}: ${list.length}行 / ラベル幅 ${widthsSet.join(',')} / 値の左端 ${leftsSet.join(',')} / 値が2行以上 ${list.filter((r) => (r.valueLines ?? 1) > 1).length}件`,
		);
	}

	console.log('-- 下端の座標(scrollY を足した絶対値)');
	for (const [k, v] of Object.entries(result.bottoms)) console.log(`   ${k}: 上端 ${v.top} / 下端 ${v.bottom} / 幅 ${v.width}`);

	console.log('-- 折り返している行');
	if (result.wrapped.length === 0) console.log('   なし');
	for (const w of result.wrapped) console.log(`   ${w.lines}行: ${w.text}`);

	console.log('-- アイコンと文字の中心のずれ(+ は文字より下)');
	if (result.icons.length === 0) console.log('   アイコン付きの行なし');
	for (const i of result.icons) console.log(`   ${i.text}: 揃え ${i.align} / アイコン ${i.iconPx}px / 文字 ${i.fontPx} / ずれ ${i.offset}px`);

	// 5 当たり判定:ヘッダーの下端で拾える要素(重なりの確認)
	const hit = await page.evaluate(() => {
		const header = document.querySelector('header');
		if (!header) return null;
		const map = document.querySelector('.leaflet-container');
		if (map) window.scrollTo(0, map.getBoundingClientRect().top + window.scrollY + 120);
		const r = header.getBoundingClientRect();
		const y = Math.round(r.bottom - 6);
		const at = (x) => {
			const el = document.elementFromPoint(x, y);
			if (!el) return 'なし';
			const cls = typeof el.className === 'string' && el.className ? '.' + el.className.split(' ')[0] : '';
			return `${el.tagName}${cls}`;
		};
		return { left: at(48), center: at(Math.round(window.innerWidth / 2)), scrolled: Math.round(window.scrollY) };
	});
	if (hit) console.log(`-- 当たり判定(scrollY ${hit.scrolled} でヘッダー下端): 左 ${hit.left} / 中央 ${hit.center}`);

	await ctx.close();
}

await browser.close();
