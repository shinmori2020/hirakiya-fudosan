/**
 * データにあるのに画面へ出ていない項目の検出(J-082)。
 *
 * 背景:J-070 で「仲介手数料」が画面から落ちたが、エラーも出ず表示も崩れないため、
 * 別ルート(ページの評価依頼)で指摘されるまで気づけなかった。同じ型の抜けを機械で見つける。
 *
 * 使い方(確認用サーバー 3001 を起動してから。.claude/rules/verification.md §1):
 *   cd web
 *   DATA_SOURCE=static pnpm build && DATA_SOURCE=static pnpm start -p 3001 &
 *   node scripts/check-fields.mjs                 # 全60件
 *   node scripts/check-fields.mjs HR-R-0001       # 1件だけ
 *   node scripts/check-fields.mjs --all           # 「表示あり」の行も含めて全部出す
 *
 * 判定の考え方:
 *   - **値の一致だけで判定しない。** 担当者コメント(J-078)は物件の値から文章を作っているので、
 *     「仲介手数料は家賃1ヶ月です」のように値が文中に現れる。値だけを見ると出ていることになってしまう。
 *     そのため、ラベルで出すはずの項目は **dt のラベルが存在するか** を同時に見る。
 *   - 出力された HTML 全体を見る。特定のコンポーネントやセレクタを見に行かないので、
 *     J-080 → J-084 のように表示箇所が右カラムから物件データへ移っても結果は変わらない。
 *
 * 判定:
 *   表示あり      ラベルも値もある(ラベルなしで出す項目は値がある)
 *   値のみ        値はあるがラベルが無い = 文章の中に混ざっているだけの可能性。要確認
 *   欠落          ラベルも値も無い
 *   対象外        下の EXCLUDED、またはこの物件に値が無い項目
 */
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.CHECK_BASE ?? 'http://localhost:3001';
const DATA = path.join(process.cwd(), 'data', 'properties');
const TAX = path.join(process.cwd(), 'data', 'taxonomies');

/** タクソノミーの slug → 表示名(沿線・駅・設備・エリアは JSON に slug しか入っていない) */
function nameMap(file) {
	const list = JSON.parse(fs.readFileSync(path.join(TAX, file), 'utf8'));
	return Object.fromEntries(list.map((t) => [t.slug, t.name]));
}
const NAMES = { line: nameMap('line.json'), station: nameMap('station.json'), feature: nameMap('feature_tag.json'), area: nameMap('area.json') };

/**
 * 画面に出さないと決めている項目(理由つき)。ここに無い項目は必ず出す前提で検査する。
 */
const EXCLUDED = {
	publishedOn: '新着バッジの判定に使うだけ(01 が出すと決めたのは情報更新日)',
	thumb: '一覧カード用(images[0])。詳細は images を直接使う',
	slug: 'WordPress の post_name。内部用で画面には出さない',
	photoCount: '一覧カード用。詳細はギャラリーが実物の枚数を出す',
	hasFloorplan: '一覧カード用。詳細は間取り図そのものを並べる',
	// 地図のピンは座標を文字にして出さず、地図自体もクライアント側で描くので静的 HTML には現れない。
	// 地図の有無は見た目の確認(scripts/measure.mjs の当たり判定・F-009)で見る。
	lat: '地図のピン。座標は画面に出さず、地図はクライアント側で描く(構造化データ ld+json には値として出る。画面には出ない・J-083)',
	lng: '同上',
};

const yen = (n) => `${Number(n).toLocaleString('ja-JP')}円`;
const man = (n) => `${(Number(n) / 10000).toLocaleString('ja-JP', { maximumFractionDigits: 1 })}万円`;
const dateJa = (v) => {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v ?? ''));
	return m ? `${m[1]}年${Number(m[2])}月${Number(m[3])}日` : String(v ?? '');
};

/**
 * 検査する項目。
 *   label …… dt のラベル。null はラベルを付けずに出す項目(値だけを見る)
 *   values …… 画面に出ているはずの文字列の候補(どれか1つあれば「値あり」)
 *   kind …… 'label'(ラベル+値)/ 'text'(ラベルなし)/ 'media'(画像・地図。別の目印で見る)
 */
function fieldsFor(p) {
	const r = p.rental ?? {};
	const s = p.sale ?? {};
	const months = (n) => (n === 0 ? ['なし'] : [`${n}ヶ月`]);
	const list = [
		['no', 'label', '物件番号', [p.no]],
		['title', 'text', null, [p.title]],
		['address', 'label', '所在地', [p.address, p.address?.replace(/^東京都/, '')]],
		['stations', 'label', '交通', p.stations?.[0] ? [`${NAMES.station[p.stations[0].slug] ?? ''}駅`] : []],
		['area', 'text', null, NAMES.area[p.area] ? [NAMES.area[p.area]] : []],
		// 2駅目は右カラムの要約(J-039)が「2駅目」のラベルで出していたが、J-093 で要約を廃止した。
		// いまは物件データ「建物」の交通の欄に2駅とも入る(画面で確認:「曳舟駅 徒歩8分 / 押上駅 徒歩18分」)
		['walkMinutes2', 'label', '交通', p.walkMinutes2 ? [`徒歩${p.walkMinutes2}分`] : []],
		['lines', 'label', '沿線', (p.lines ?? []).map((l) => NAMES.line[l]).filter(Boolean), 'every'],
		['features', 'text', null, (p.features ?? []).map((f) => NAMES.feature[f]).filter(Boolean), 'every'],
		['layout', 'text', null, p.layout ? [p.layout] : []],
		['areaSqm', 'text', null, p.areaSqm != null ? [`${p.areaSqm}㎡`] : []],
		['floor', 'label', '階数', p.floor != null ? [`${p.floor}階`] : []],
		['floorsTotal', 'label', '階数', p.floorsTotal ? [`${p.floorsTotal}階建`] : []],
		['builtYm', 'label', '築年月', p.builtYm ? [`${Number(p.builtYm.slice(5, 7))}月`] : []],
		['structure', 'label', '構造', p.structure ? [p.structure] : []],
		['direction', 'label', '向き', p.direction ? [p.direction] : []],
		// ラベルは『駐車場の状況』(設備チップの『駐車場』と意味が違うので文言で区別する・03 §6 の J-092 の基準)
		['parking', 'label', '駐車場の状況', p.parking ? [p.parking] : []],
		['transactionType', 'label', '取引態様', p.transactionType ? [p.transactionType] : []],
		['updatedOn', 'label', '情報更新日', [dateJa(p.updatedOn)]],
		['nextUpdateOn', 'label', '次回更新予定日', [dateJa(p.nextUpdateOn)]],
		['staff', 'text', null, [p.staff]],
		['comment', 'text', null, [p.comment?.slice(0, 16)]],
		['images', 'media', null, p.images?.length ? [p.images[0].split('/').pop()] : []],
		['floorplan', 'media', null, p.floorplan ? [p.floorplan.split('/').pop()] : []],
		['lat', 'media', null, ['leaflet-container']], // 地図のピン。数値は画面に出ない
		['lng', 'media', null, ['leaflet-container']],
	];
	if (p.type === 'rental') {
		list.push(
			['rent', 'text', null, [man(p.rent), yen(p.rent)]],
			['maintenanceFee', 'label', '管理費・共益費', [r.maintenanceFee > 0 ? yen(r.maintenanceFee) : 'なし']],
			['depositMonths', 'label', '敷金', months(r.depositMonths)],
			['keyMoneyMonths', 'label', '礼金', months(r.keyMoneyMonths)],
			['brokerageFee', 'label', '仲介手数料', [r.brokerageFee]],
			['contractTerm', 'label', '契約期間', [r.contractTerm]],
			['renewalFee', 'label', '更新料', [r.renewalFee]],
			['guarantorRequired', 'label', '保証人', [r.guarantorRequired ? '必要' : '不要']],
			['availableFrom', 'label', '入居可能日', [dateJa(r.availableFrom)]],
			['rentPrevious', 'text', null, p.rentPrevious ? [man(p.rentPrevious)] : []],
		);
	} else {
		list.push(
			['price', 'text', null, [`${Number(p.price).toLocaleString('ja-JP')}万円`]],
			['landSqm', 'label', '土地面積', s.landSqm != null ? [`${s.landSqm}㎡`] : []],
			['buildingSqm', 'label', '建物面積', s.buildingSqm != null ? [`${s.buildingSqm}㎡`] : []],
			['mgmtFee', 'label', '管理費', s.mgmtFee != null ? [yen(s.mgmtFee)] : []],
			['repairFund', 'label', '修繕積立金', s.repairFund != null ? [yen(s.repairFund)] : []],
			['landRights', 'label', '土地権利', [s.landRights]],
			['zoning', 'label', '用途地域', [s.zoning]],
			['bcr', 'label', '建ぺい率 / 容積率', s.bcr != null ? [`${s.bcr}%`] : []],
			['far', 'label', '建ぺい率 / 容積率', s.far != null ? [`${s.far}%`] : []],
			['roadAccess', 'label', '接道', [s.roadAccess]],
			['handover', 'label', '引渡し', [s.handover]],
			['pricePrevious', 'text', null, p.pricePrevious ? [`${Number(p.pricePrevious).toLocaleString('ja-JP')}万円`] : []],
		);
	}
	// 値が空の項目(その種別に無いもの)は対象外にする
	return list.map(([field, kind, label, values, mode]) => ({ field, kind, label, mode: mode ?? 'some', values: values.filter((v) => v != null && v !== '') }));
}

/**
 * HTML から「本文のテキスト」と「dt のラベル一覧」を取り出す(タグは見ない)。
 * script を落とすのは、**構造化データ(application/ld+json)を値の探索対象から外すため**(J-083)。
 * ld+json は機械向けの出力で画面には出ないので、残すと ld+json に入れた項目がすべて
 * 「値あり・ラベルなし」= 値のみ と判定され、J-070 型の本当の抜け落ちが埋もれる。
 * 見たいのは「画面に出ているか」なので、ここでは人が読む部分だけを対象にする。
 */
function parse(html) {
	const noScript = html.replace(/<script[\s\S]*?<\/script>/g, '');
	const labels = new Set();
	for (const m of noScript.matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>/g)) {
		labels.add(m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
	}
	const text = noScript
		.replace(/<[^>]+>/g, ' ')
		.replace(/&#x27;/g, "'")
		.replace(/&amp;/g, '&')
		.replace(/&quot;/g, '"')
		.replace(/\s+/g, ' ');
	return { text, labels, raw: noScript };
}

function judge(f, parsed) {
	if (EXCLUDED[f.field]) return { value: '—', label: '—', verdict: '対象外', note: EXCLUDED[f.field] };
	if (f.values.length === 0 && f.kind !== 'label') return { value: '—', label: '—', verdict: '対象外', note: 'この物件に値が無い' };
	const inHtml = (v) => (f.kind === 'media' ? parsed.raw.includes(v) : parsed.text.includes(v));
	const hasValue = f.mode === 'every' ? f.values.every(inHtml) : f.values.some(inHtml);
	const hasLabel = f.kind === 'label' ? parsed.labels.has(f.label) : null;
	if (f.kind === 'label') {
		// 値が無い項目(その種別に無い・空)は、ラベルが「—」で出ていても対象外にする(土地の向きなど)
		if (f.values.length === 0) return { value: '—', label: hasLabel ? 'あり' : 'なし', verdict: '対象外', note: 'この物件に値が無い' };
		if (hasLabel && hasValue) return { value: 'あり', label: 'あり', verdict: '表示あり', note: '' };
		if (hasLabel && !hasValue) return { value: 'なし', label: 'あり', verdict: '要確認', note: 'ラベルはあるが値が見つからない(整形の違いかもしれない)' };
		if (!hasLabel && hasValue) return { value: 'あり', label: 'なし', verdict: '値のみ', note: '文章の中に混ざっているだけの可能性(担当者コメント等)' };
		return { value: 'なし', label: 'なし', verdict: '欠落', note: '画面のどこにも出ていない' };
	}
	return hasValue
		? { value: 'あり', label: '—', verdict: '表示あり', note: f.kind === 'media' ? '画像・地図として確認' : 'ラベルなしで出す項目' }
		: { value: 'なし', label: '—', verdict: '欠落', note: '画面のどこにも出ていない' };
}

const args = process.argv.slice(2);
const showAll = args.includes('--all');
const only = args.find((a) => /^HR-/.test(a));
const files = fs.readdirSync(DATA).filter((f) => f.startsWith('HR-') && (!only || f === `${only}.json`));
if (files.length === 0) {
	console.error(`物件が見つかりません: ${only ?? DATA}`);
	process.exit(1);
}

const rows = [];
for (const file of files) {
	const p = JSON.parse(fs.readFileSync(path.join(DATA, file), 'utf8'));
	const res = await fetch(`${BASE}/properties/${p.no}`);
	if (!res.ok) {
		console.error(`${p.no}: HTTP ${res.status}(3001 で静的ビルドを起動しているか確認)`);
		process.exit(1);
	}
	const parsed = parse(await res.text());
	for (const f of fieldsFor(p)) rows.push({ no: p.no, ...f, ...judge(f, parsed) });
}

const shown = rows.filter((r) => showAll || (r.verdict !== '表示あり' && r.verdict !== '対象外'));
const pad = (s, n) => String(s) + ' '.repeat(Math.max(0, n - [...String(s)].reduce((a, c) => a + (c.charCodeAt(0) > 255 ? 2 : 1), 0)));

console.log(`\n物件 ${files.length}件 / 検査 ${rows.length}項目`);
console.log(`${pad('物件番号', 12)}${pad('フィールド', 20)}${pad('値', 6)}${pad('ラベル', 8)}${pad('判定', 10)}備考`);
console.log('-'.repeat(100));
if (shown.length === 0) {
	console.log('(要確認・値のみ・欠落 は0件)');
} else {
	for (const r of shown) console.log(`${pad(r.no, 12)}${pad(r.field, 20)}${pad(r.value, 6)}${pad(r.label, 8)}${pad(r.verdict, 10)}${r.note}`);
}

const count = (v) => rows.filter((r) => r.verdict === v).length;
console.log('-'.repeat(100));
console.log(`表示あり ${count('表示あり')} / 値のみ ${count('値のみ')} / 要確認 ${count('要確認')} / 欠落 ${count('欠落')} / 対象外 ${count('対象外')}`);
const bad = count('値のみ') + count('欠落');
if (bad > 0) console.log(`\n※ 「値のみ」と「欠落」が ${bad} 件あります。表示を整理した直後なら、移し忘れを疑ってください`);
process.exitCode = bad > 0 ? 1 : 0;
