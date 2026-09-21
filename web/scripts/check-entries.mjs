/**
 * 入口ページと条件固定の一覧の整合を検査する(実装順 4 の検証をスクリプト化。J-095 の残件)。
 *
 * check-fields.mjs は **JSON のフィールドを起点に物件詳細を検査する** ので、一覧・入口には使えない。
 * こちらは画面と画面の関係を見る。検査するのは3点:
 *   1 入口ページに出ている件数と、そのリンクを押した先の一覧の件数が一致するか
 *   2 入口ページから出ていくリンクがすべて 200 を返すか(未作成ページへのリンクが残っていないか)
 *   3 条件固定の一覧で条件を変えた後の URL に、固定キー(area= / line= / station= / collection=)が入っていないか
 *   4 トップの検索フォーム(FV)の select の option に出る件数と、その条件で送った先の一覧の件数が一致するか(J-145)
 *   5 FV で賃貸⇄売買を切り替えた後も、ボタンの件数が select の値と一致するか(J-145 の修正。エリアは切替で残り、
 *     種別固有の項目〔駅・家賃・間取り / 価格・種目〕はリセットされる。09/22 に件数だけ元に戻る不具合が出た)
 *     (パスとクエリに同じ条件を二重に持つと、/area/aoto?area=tateishi のような矛盾した URL を作れてしまう)
 *
 * 使い方(3001 で本番相当を起動してから。手順は .claude/rules/verification.md §1):
 *   DATA_SOURCE=static pnpm build && DATA_SOURCE=static pnpm start -p 3001
 *   node scripts/check-entries.mjs [http://localhost:3001]
 *
 * 実装順 6・7 でページが増えたら ENTRIES に足す。終了コードは 要確認があれば 1。
 */
import { createRequire } from 'node:module';

const BASE = (process.argv[2] ?? 'http://localhost:3001').replace(/\/$/, '');
const require = createRequire('C:/Users/kiyos/Desktop/shin-portfolio-2026/package.json');
const { chromium } = require('playwright-core');

/** 検査する入口ページ。href の接頭辞で「入口から出ていくリンク」を見分ける */
const ENTRIES = [
	{ path: '/area', linkPrefixes: ['/area/'] },
	{ path: '/line', linkPrefixes: ['/line/', '/station/'] },
	{ path: '/feature', linkPrefixes: ['/feature/'] },
];
/** 3 の検査に使う代表ページ(固定の4種類を1つずつ)と、固定キーの名前 */
const FIXED_SAMPLES = [
	{ path: '/area/aoto', key: 'area' },
	{ path: '/line/keisei-main', key: 'line' },
	{ path: '/station/aoto', key: 'station' },
	{ path: '/feature/pet-ok', key: 'collection' },
];

const problems = [];
const note = (msg) => problems.push(msg);

async function main() {
	const browser = await chromium.launch();
	const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
	const page = await ctx.newPage();
	const open = async (p) => {
		await page.goto(BASE + p, { waitUntil: 'load' });
		await page.waitForTimeout(400);
	};
	// 一覧の件数表示(「40 件」の数字)
	const listCount = async () => Number((await page.locator('span.tabular.text-h2').first().innerText()).replace(/\D/g, ''));

	let checkedLinks = 0;
	let checkedCounts = 0;

	for (const entry of ENTRIES) {
		await open(entry.path);
		const sel = entry.linkPrefixes.map((x) => `main a[href^="${x}"]`).join(', ');
		const links = await page.locator(sel).evaluateAll((as) => as.map((a) => ({ href: a.getAttribute('href'), text: a.textContent.replace(/\s+/g, ' ').trim() })));
		if (links.length === 0) note(`${entry.path}:出ていくリンクが0本(入口として機能していない)`);

		// 2 リンクの HTTP
		for (const l of links) {
			const res = await fetch(BASE + l.href);
			checkedLinks++;
			if (res.status !== 200) note(`${entry.path} → ${l.href}:HTTP ${res.status}`);
		}

		// 1 件数の一致(「賃貸 4件」「売買 1件」のように件数を持つリンクだけ)
		for (const l of links) {
			const m = l.text.match(/^(賃貸|売買)\s*([\d,]+)\s*件$/);
			if (!m) continue;
			const expected = Number(m[2].replace(/,/g, ''));
			await open(l.href);
			const actual = await listCount();
			checkedCounts++;
			if (actual !== expected) note(`${entry.path} → ${l.href}:入口 ${expected}件 / 一覧 ${actual}件`);
		}
	}

	// 3 条件を変えた後の URL に固定キーが入らないか(家賃・価格の上限を1つ選ぶ)
	for (const s of FIXED_SAMPLES) {
		await open(s.path);
		const selects = page.locator('aside select');
		if ((await selects.count()) < 2) {
			note(`${s.path}:左カラムのセレクトが見つからない(検査できていない)`);
			continue;
		}
		const target = selects.nth(1); // 家賃(価格)の上限
		const value = await target.locator('option').nth(1).getAttribute('value');
		await target.selectOption(value);
		await page.waitForTimeout(500);
		const url = new URL(page.url());
		if (url.searchParams.has(s.key)) note(`${s.path}:条件を変えた後の URL に固定キー ${s.key}= が入った(${url.pathname}${url.search})`);
		if (url.pathname !== s.path) note(`${s.path}:条件を変えたらパスが ${url.pathname} に変わった`);
	}

	// 4 FV の select の option の件数 = 送った先の一覧の件数(J-145)。賃貸の4本(エリア / 駅 / 家賃 / 間取り)を1つずつ選ぶ
	let checkedOptions = 0;
	for (const name of ['area', 'station', 'rent_max', 'layout']) {
		await open('/');
		const sel = page.locator('main > section form select[name="' + name + '"]');
		if ((await sel.count()) === 0) {
			note(`/ FV:select[name=${name}] が見つからない`);
			continue;
		}
		const options = await sel.locator('option').evaluateAll((os) => os.map((o) => ({ value: o.value, text: o.textContent.trim() })).filter((o) => o.value));
		for (const o of options) {
			await open('/');
			const s2 = page.locator('main > section form select[name="' + name + '"]');
			await s2.selectOption(o.value);
			await page.waitForTimeout(150);
			const label = await s2.locator('option[value="' + o.value + '"]').textContent();
			const m = label.match(/\((\d+)件\)/);
			if (!m) {
				note(`/ FV:${name}=${o.value} の option に件数が出ていない(${label.trim()})`);
				continue;
			}
			const expected = Number(m[1]);
			await page.locator('main > section form button[type="submit"]').click();
			await page.waitForURL(/\/properties/, { timeout: 10000 });
			await page.waitForTimeout(400);
			const actual = await listCount();
			checkedOptions++;
			if (actual !== expected) note(`/ FV:${name}=${o.value} の option ${expected}件 / 一覧 ${actual}件`);
		}
	}

	// 5 タブ切替の後もボタンの件数が select と一致するか(J-145 の修正)
	let checkedSwitch = 0;
	const buttonCount = async () => Number(((await page.locator('main > section form button[type="submit"]').innerText()).match(/\((\d+)件\)/) ?? [])[1]);
	const listCountFor = async (url) => {
		await open(url);
		return await listCount();
	};
	for (const area of ['ohanajaya', 'aoto']) {
		const rental = await listCountFor(`/properties?area=${area}`);
		const sale = await listCountFor(`/properties?type=sale&area=${area}`);
		await open('/');
		await page.locator('main > section form select[name="area"]').selectOption(area);
		await page.waitForTimeout(200);
		// 種別固有の項目も選んでおく(切替でリセットされることを見る)
		await page.locator('main > section form select[name="rent_max"]').selectOption({ index: 5 });
		await page.waitForTimeout(200);
		for (const [tab, expected] of [['売買', sale], ['賃貸', rental]]) {
			await page.locator('main > section [role="tab"]', { hasText: tab }).click();
			await page.waitForTimeout(250);
			const shown = await buttonCount();
			checkedSwitch++;
			if (shown !== expected) note(`/ FV:area=${area} で「${tab}」に切り替えた後のボタン ${shown}件 / 一覧 ${expected}件`);
		}
		// 戻した後、種別固有の項目がリセットされているか(残っていると件数と select が食い違う)
		const leftover = await page.locator('main > section form select[name="rent_max"]').inputValue();
		if (leftover !== '') note(`/ FV:area=${area} で往復した後も rent_max=${leftover} が残っている(切替でリセットされていない)`);
		const keptArea = await page.locator('main > section form select[name="area"]').inputValue();
		if (keptArea !== area) note(`/ FV:往復した後にエリアが ${keptArea} に変わった(共通の項目なので残るはず)`);
	}

	await browser.close();

	console.log(`リンク ${checkedLinks}本 / 件数 ${checkedCounts}組 / 固定ページ ${FIXED_SAMPLES.length}件 / FV の option ${checkedOptions}個 / タブ切替 ${checkedSwitch}回 を検査`);
	if (problems.length === 0) {
		console.log('要確認:0件');
		return 0;
	}
	console.log(`要確認:${problems.length}件`);
	for (const p of problems) console.log('  - ' + p);
	return 1;
}

main().then((code) => process.exit(code));
