/**
 * WordPress REST(hr-core)から物件データを JSON に書き出し、プレースホルダー画像も同梱する
 * ビルド前スクリプト。Nordic Works の export-wp-data.mjs を流用し、hr-core の形に書き換えた。
 *
 *  data/
 *  ├ properties/index.json      全件の一覧用サブセット(PropertySummary[])
 *  ├ properties/HR-R-0001.json  1物件1ファイル(PropertyDetail)
 *  ├ taxonomies/{area,line,station,feature_tag,collection,status,property_type,property_kind}.json
 *  └ meta.json                  取得日時・件数・WordPress のバージョン
 *  public/wp-uploads/placeholders/*.svg
 *
 * 使い方:  pnpm run export-wp   (Docker の WordPress が起動していること)
 * 本番(Vercel)は DATA_SOURCE=static でこれらの JSON だけを読む。Vercel は WP に到達しない。
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { REST_BASE, TAXONOMIES, toDetail, toSummary, toTerms } from '../src/lib/wp-map.mjs';

const WP_API = process.env.WORDPRESS_API_URL ?? 'http://localhost:8080/wp-json';
const WP_HOST = new URL(WP_API).origin; // http://localhost:8080
const ROOT = path.resolve(import.meta.dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const MEDIA_DIR = path.join(ROOT, 'public', 'wp-uploads');

/** REST から全ページ取得(per_page=100 でページング) */
async function fetchAll(endpoint) {
	const all = [];
	for (let page = 1; ; page++) {
		const url = `${WP_API}/wp/v2/${endpoint}?per_page=100&page=${page}`;
		const res = await fetch(url);
		if (!res.ok) {
			if (res.status === 400) break; // 範囲外ページ
			throw new Error(`[wp] ${endpoint} page=${page} -> ${res.status}`);
		}
		const data = await res.json();
		all.push(...data);
		if (data.length < 100) break;
	}
	return all;
}

/** /wp-uploads/placeholders/x.svg → WP から取得して public/wp-uploads/placeholders/x.svg に置く(既存はスキップ) */
async function downloadUpload(relPath) {
	const rel = relPath.replace(/^\/wp-uploads\//, '');
	const dest = path.join(MEDIA_DIR, rel);
	try {
		await fs.access(dest);
		return { rel, skipped: true };
	} catch {}
	await fs.mkdir(path.dirname(dest), { recursive: true });
	const res = await fetch(`${WP_HOST}/wp-content/uploads/${rel}`);
	if (!res.ok) return { rel, error: res.status };
	await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
	return { rel };
}

/** WordPress のバージョン(REST には出ないのでトップページの generator メタから。取れなければ null) */
async function wpVersion() {
	try {
		const html = await (await fetch(`${WP_HOST}/`)).text();
		const m = html.match(/<meta name="generator" content="WordPress ([\d.]+)"/);
		return m ? m[1] : null;
	} catch {
		return null;
	}
}

async function writeJson(file, data) {
	await fs.mkdir(path.dirname(file), { recursive: true });
	await fs.writeFile(file, JSON.stringify(data, null, 2) + '\n');
}

/** 架空表記の簡易チェック(rules/fictional-data.md §5)。違反があれば書き出しを止める */
function checkFictional(details) {
	const bad = [];
	for (const d of details) {
		if (!/0-0-0$/.test(d.address)) bad.push(`${d.no}: 住所 "${d.address}" が 0-0-0 で終わらない`);
		if (!/^HR-[RS]-\d{4}$/.test(d.no)) bad.push(`${d.slug}: 物件番号 "${d.no}" の書式`);
		if (!/(架空|見本|仮名) /.test(d.staff)) bad.push(`${d.no}: 担当者 "${d.staff}" の姓が架空・見本・仮名でない`);
		if (/\d{2,4}-\d{2,4}-\d{3,4}/.test(d.comment) && !/0000/.test(d.comment)) bad.push(`${d.no}: コメントに電話番号らしき数字`);
	}
	return bad;
}

async function main() {
	console.log(`WordPress: ${WP_API}`);
	await fs.mkdir(DATA_DIR, { recursive: true });
	await fs.mkdir(MEDIA_DIR, { recursive: true });
	const opts = { uploadsPrefix: WP_HOST };

	// 1. 物件
	process.stdout.write('properties      ');
	const raw = await fetchAll('properties');
	const details = raw.map((p) => toDetail(p, opts));
	const summaries = raw.map((p) => toSummary(p, opts));
	console.log(`${raw.length} 件`);

	const violations = checkFictional(details);
	if (violations.length) {
		console.error('\n架空表記ルール違反があるため書き出しを中止しました:');
		for (const v of violations) console.error('  ! ' + v);
		process.exit(2);
	}

	// 既存の properties/*.json を消してから書く(削除された物件のファイルを残さない)
	const propDir = path.join(DATA_DIR, 'properties');
	await fs.rm(propDir, { recursive: true, force: true });
	await writeJson(path.join(propDir, 'index.json'), summaries);
	for (const d of details) await writeJson(path.join(propDir, `${d.no}.json`), d);

	// 2. タクソノミー
	const counts = {};
	for (const tax of TAXONOMIES) {
		process.stdout.write(`${tax.padEnd(16)}`);
		const terms = toTerms(await fetchAll(REST_BASE[tax]));
		await writeJson(path.join(DATA_DIR, 'taxonomies', `${tax}.json`), terms);
		counts[tax] = terms.length;
		console.log(`${terms.length} 件`);
	}

	// 3. 画像(プレースホルダー SVG)
	const paths = new Set();
	for (const d of details) {
		for (const img of d.images) paths.add(img);
		if (d.floorplan) paths.add(d.floorplan);
	}
	console.log(`\n画像: ${paths.size} 件`);
	let downloaded = 0, skipped = 0, failed = 0;
	for (const p of paths) {
		const r = await downloadUpload(p);
		if (r.error) { console.warn(`  ! ${r.rel} (${r.error})`); failed++; }
		else if (r.skipped) skipped++;
		else downloaded++;
	}
	console.log(`  新規 ${downloaded} / スキップ ${skipped} / 失敗 ${failed}`);

	// 4. meta
	const meta = {
		exportedAt: new Date().toISOString(),
		source: WP_API,
		wordpress: await wpVersion(),
		counts: {
			properties: summaries.length,
			rental: summaries.filter((s) => s.type === 'rental').length,
			sale: summaries.filter((s) => s.type === 'sale').length,
			noPhoto: summaries.filter((s) => !s.thumb).length,
			...counts,
		},
	};
	await writeJson(path.join(DATA_DIR, 'meta.json'), meta);
	console.log(`\nExport 完了: 物件 ${meta.counts.properties}(賃貸 ${meta.counts.rental} / 売買 ${meta.counts.sale} / 写真なし ${meta.counts.noPhoto})`);
	if (failed) process.exit(1);
}

main().catch((err) => {
	console.error('Export 失敗:', err);
	process.exit(1);
});
