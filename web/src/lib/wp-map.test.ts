import { describe, expect, it } from 'vitest';
import { decode, num, rewriteUpload, toDetail as rawDetail, toSummary as rawSummary, toTerms } from '@/lib/wp-map.mjs';
import type { PropertyDetail, PropertySummary } from '@/types/property';

// .mjs は型宣言(wp-map.d.ts)ではなく実装から型が推論されるので、ここで型を当てて検査する
const toSummary = (post: unknown, opts?: { uploadsPrefix?: string }) => rawSummary(post, opts) as PropertySummary;
const toDetail = (post: unknown, opts?: { uploadsPrefix?: string }) => rawDetail(post, opts) as PropertyDetail;

/**
 * WP REST → 型つきの値への変換(J-041 の適用。ここがずれると60ページ全部に波及する)。
 * 入力は WP REST 相当の**最小のダミー**。web/data は読まない。
 * `str` / `first` / `splitPaths` / `orderStations` / `normalizeMeta` は非公開なので、
 * toSummary / toDetail / toTerms を通して検査する。
 */
const post = (acf: Record<string, unknown> = {}, terms: Record<string, string[]> = {}, title = '青戸ハイツ0-3') => ({
	slug: 'hr-r-0001',
	title: { rendered: title },
	hr_terms: { property_type: ['rental'], property_kind: ['mansion'], status: ['open'], area: ['aoto'], station: ['aoto'], line: ['keisei-main'], ...terms },
	acf: { property_no: 'HR-R-0001', walk_minutes: 5, rent: 82000, ...acf },
});

describe('wp-map.mjs', () => {
	it('J-041 num:空文字・null・非数値は null。数値と数字文字列は数値(0 も値として残す)', () => {
		expect(num('')).toBeNull();
		expect(num(null)).toBeNull();
		expect(num(undefined)).toBeNull();
		expect(num('abc')).toBeNull();
		expect(num('123')).toBe(123);
		expect(num(123)).toBe(123);
		expect(num(0)).toBe(0);
		expect(num('0')).toBe(0);
	});

	it('J-041 rewriteUpload:絶対URLの接頭辞を剥がし、/wp-content/uploads/ を /wp-uploads/ にする', () => {
		expect(rewriteUpload('http://localhost:8080/wp-content/uploads/a.svg', 'http://localhost:8080')).toBe('/wp-uploads/a.svg');
		expect(rewriteUpload('/wp-content/uploads/a.svg')).toBe('/wp-uploads/a.svg');
		expect(rewriteUpload('wp-content/uploads/a.svg')).toBe('/wp-uploads/a.svg');
		// 接頭辞が一致しない時は剥がさない。空文字はそのまま
		expect(rewriteUpload('http://other/wp-content/uploads/a.svg', 'http://localhost:8080')).toBe('http://other/wp-content/uploads/a.svg');
		expect(rewriteUpload('')).toBe('');
	});

	it('J-041 decode:WP が返す HTML エンティティを文字に戻す', () => {
		expect(decode('青戸&#8211;ハイツ')).toBe('青戸–ハイツ');
		expect(decode('A&amp;B &quot;C&quot; &#039;D&#039; &lt;E&gt;')).toBe('A&B "C" \'D\' <E>');
		expect(decode('そのまま')).toBe('そのまま');
	});

	it('F-005 最寄駅は acf.primary_station を先頭に固定する(hr_terms.station は名前順で来る)', () => {
		const p = post({ primary_station: 'hikifune', walk_minutes: 8, walk_minutes_2: 18 }, { station: ['oshiage', 'hikifune'] });
		expect(toSummary(p).stations).toEqual([
			{ slug: 'hikifune', walk: 8 },
			{ slug: 'oshiage', walk: 18 },
		]);
		// primary_station が空、または一覧に無い時は並べ替えない
		expect(toSummary(post({ primary_station: '' }, { station: ['oshiage', 'hikifune'] })).stations.map((s) => s.slug)).toEqual(['oshiage', 'hikifune']);
		expect(toSummary(post({ primary_station: 'aoto' }, { station: ['oshiage', 'hikifune'] })).stations.map((s) => s.slug)).toEqual(['oshiage', 'hikifune']);
	});

	it('J-046 写真は改行区切りのパスから配列にし、枚数・サムネイル・間取り図の有無を出す', () => {
		const p = post({ images: ' /wp-content/uploads/a.svg \n\nhttp://localhost:8080/wp-content/uploads/b.svg\n', floorplan: '/wp-content/uploads/fp.svg' });
		const s = toSummary(p, { uploadsPrefix: 'http://localhost:8080' });
		expect(s.thumb).toBe('/wp-uploads/a.svg');
		expect(s.photoCount).toBe(2);
		expect(s.hasFloorplan).toBe(true);
		// 写真0枚(60件中3件ある)
		const none = toSummary(post({ images: '', floorplan: '' }));
		expect(none.thumb).toBeNull();
		expect(none.photoCount).toBe(0);
		expect(none.hasFloorplan).toBe(false);
	});

	it('J-041 賃貸は家賃と管理費、売買は価格。片方の項目はもう片方に作らない', () => {
		const rental = toSummary(post({ rent: 82000, maintenance_fee: 8000, rent_previous: 90000 }));
		expect(rental.rent).toBe(82000);
		expect(rental.maintenanceFee).toBe(8000);
		expect(rental.rentPrevious).toBe(90000);
		expect(rental.price).toBeUndefined();

		const sale = toSummary(post({ price: 3100, price_previous: 3300 }, { property_type: ['sale'], property_kind: ['house'] }));
		expect(sale.price).toBe(3100);
		expect(sale.pricePrevious).toBe(3300);
		expect(sale.rent).toBeUndefined();
		expect(sale.maintenanceFee).toBeUndefined();
		// 値下げ前が無い物件には項目を作らない(バッジ判定が「値下げあり」にならないように)
		expect(toSummary(post({ price: 3100 }, { property_type: ['sale'] })).pricePrevious).toBeUndefined();
		expect(toSummary(post()).rentPrevious).toBeUndefined();
	});

	it('J-041 土地は築年月・階数・面積が空。空文字は null や 空文字のまま残し、0 で埋めない', () => {
		const land = toDetail(post({ built_ym: '', area_sqm: '', floor: '', floors_total: '', structure: '', direction: '', layout: '', land_sqm: 77, building_sqm: '' }, { property_type: ['sale'], property_kind: ['land'] }));
		expect(land.builtYm).toBe('');
		expect(land.areaSqm).toBeNull();
		expect(land.floor).toBeNull();
		expect(land.floorsTotal).toBeNull();
		expect(land.structure).toBe('');
		expect(land.layout).toBe('');
		expect(land.sale?.landSqm).toBe(77);
		expect(land.sale?.buildingSqm).toBeNull();
	});

	it('J-070 賃貸の詳細だけが rental を持ち、仲介手数料はそこにある(売買には作らない)', () => {
		const rental = toDetail(post({ brokerage_fee: '家賃1ヶ月', deposit_months: 1, key_money_months: 0, guarantor_required: '1' }));
		expect(rental.rental?.brokerageFee).toBe('家賃1ヶ月');
		expect(rental.rental?.depositMonths).toBe(1);
		expect(rental.rental?.keyMoneyMonths).toBe(0);
		expect(rental.rental?.guarantorRequired).toBe(true);
		expect(rental.sale).toBeUndefined();

		const sale = toDetail(post({ price: 3100, land_rights: '所有権' }, { property_type: ['sale'] }));
		expect(sale.rental).toBeUndefined();
		expect(sale.sale?.landRights).toBe('所有権');
		// 売買の仲介手数料は価格から計算する(lib/brokerage.ts・J-094)。データには持たない
		expect(sale.sale && 'brokerageFee' in sale.sale).toBe(false);
	});

	it('J-041 ACF の未選択(false)は空文字にする。保証人は true / 1 / "1" だけ true', () => {
		const d = toDetail(post({ direction: false, renewal_fee: false, guarantor_required: false }));
		expect(d.direction).toBe('');
		expect(d.rental?.renewalFee).toBe('');
		expect(d.rental?.guarantorRequired).toBe(false);
		expect(toDetail(post({ guarantor_required: true })).rental?.guarantorRequired).toBe(true);
		expect(toDetail(post({ guarantor_required: 1 })).rental?.guarantorRequired).toBe(true);
		expect(toDetail(post({ guarantor_required: '0' })).rental?.guarantorRequired).toBe(false);
	});

	it('J-041 タクソノミーが空でも既定値で返す(種別=賃貸 / 種目=マンション / 状態=公開中)', () => {
		const s = toSummary({ slug: 'x', title: { rendered: '&#8211;' }, acf: { property_no: 'HR-R-9999' } });
		expect(s.type).toBe('rental');
		expect(s.kind).toBe('mansion');
		expect(s.status).toBe('open');
		expect(s.area).toBe('');
		expect(s.stations).toEqual([]);
		expect(s.lines).toEqual([]);
		expect(s.title).toBe('–');
		expect(s.lat).toBe(0);
		expect(s.rent).toBe(0);
	});

	it('J-041 toTerms:parent は id を同じ一覧の slug に引き直し、名前のエンティティを戻す', () => {
		const out = toTerms([
			{ id: 1, slug: 'katsushika', name: '葛飾区', count: 0, parent: 0, meta: {} },
			{ id: 2, slug: 'aoto', name: '青戸', count: 4, parent: 1, meta: { lat: '35.7457', lng: '139.8547' } },
			{ id: 3, slug: 'x', name: 'A&amp;B', parent: 99, meta: null },
		]);
		expect(out[0]).toEqual({ slug: 'katsushika', name: '葛飾区', count: 0, parent: null, meta: {} });
		expect(out[1].parent).toBe('katsushika');
		expect(out[1].meta).toEqual({ lat: 35.7457, lng: 139.8547 });
		// 一覧に無い parent は null。count 未指定は 0。meta が null なら空
		expect(out[2]).toEqual({ slug: 'x', name: 'A&B', count: 0, parent: null, meta: {} });
	});

	it('J-041 toTerms の meta:空の値は落とし、数字だけの文字列は数値、そうでない文字列はそのまま', () => {
		const [t] = toTerms([{ id: 1, slug: 'aoto', name: '青砥', count: 9, parent: 0, meta: { lines: 'keisei-main,keisei-oshiage', area_slug: 'aoto', walk: '5', lat: '35.7457', empty: '', nothing: null } }]);
		expect(t.meta).toEqual({ lines: 'keisei-main,keisei-oshiage', area_slug: 'aoto', walk: 5, lat: 35.7457 });
	});
});
