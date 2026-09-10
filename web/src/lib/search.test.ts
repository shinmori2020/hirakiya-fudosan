import { describe, expect, it } from 'vitest';
import type { PropertySummary } from '@/types/property';
import {
	applyQuery,
	emptyQuery,
	isCoveredByQuickTab,
	isQuickTabActive,
	parseQuery,
	quickTabGroups,
	relaxCandidates,
	sortProperties,
	toggleQuickTab,
	toSearchParams,
	type SearchQuery,
} from '@/lib/search';

/** 最小のダミー。web/data は読まない */
const mk = (over: Partial<PropertySummary> & { no: string }): PropertySummary => ({
	slug: over.no.toLowerCase(),
	type: 'rental',
	kind: 'mansion',
	status: 'open',
	title: over.no,
	area: 'aoto',
	stations: [{ slug: 'aoto', walk: 5 }],
	lines: ['keisei-main'],
	features: [],
	collections: [],
	layout: '1K',
	areaSqm: 25,
	builtYm: '2015-04',
	lat: 0,
	lng: 0,
	thumb: null,
	publishedOn: '2026-09-01',
	rent: 80000,
	...over,
});
const NOW = new Date('2026-09-10T00:00:00+09:00');

describe('search.ts', () => {
	it('J-033 URL → 条件 → URL の往復で同じ結果になる', () => {
		const q: SearchQuery = {
			...emptyQuery('sale'),
			area: ['aoto', 'tateishi'],
			station: ['aoto'],
			priceMax: 4000,
			kind: ['house'],
			collection: ['central-30min'],
			builtMaxYears: 10,
			sqmMin: 50,
			sort: 'price_asc',
			page: 2,
		};
		const url = toSearchParams(q).toString();
		expect(parseQuery(new URLSearchParams(url))).toEqual(q);
		expect(toSearchParams(parseQuery(new URLSearchParams(url))).toString()).toBe(url);
	});

	it('J-033 既定値(賃貸・新着順・1ページ目)は URL に載せない', () => {
		expect(toSearchParams(emptyQuery()).toString()).toBe('');
	});

	it('J-033 walk_max=10:徒歩11分は落ち、10分は残る', () => {
		const list = [mk({ no: 'A', stations: [{ slug: 'aoto', walk: 10 }] }), mk({ no: 'B', stations: [{ slug: 'aoto', walk: 11 }] })];
		const q = parseQuery(new URLSearchParams('walk_max=10'));
		expect(applyQuery(list, q, NOW).map((p) => p.no)).toEqual(['A']);
	});

	it('J-040 built_max=1:築0年は残り、築2年は落ちる', () => {
		const list = [mk({ no: 'NEW', builtYm: '2026-03' }), mk({ no: 'OLD', builtYm: '2024-03' })];
		const q = parseQuery(new URLSearchParams('built_max=1'));
		expect(applyQuery(list, q, NOW).map((p) => p.no)).toEqual(['NEW']);
	});

	it('J-033 新着順:公開日の新しい順', () => {
		const list = [mk({ no: 'A', publishedOn: '2026-09-01' }), mk({ no: 'B', publishedOn: '2026-09-05' }), mk({ no: 'C', publishedOn: '2026-09-03' })];
		expect(sortProperties(list, 'new').map((p) => p.no)).toEqual(['B', 'C', 'A']);
	});

	it('J-033 成約済みは並び替えに関係なく末尾', () => {
		const list = [mk({ no: 'SOLD', status: 'sold', rent: 50000, publishedOn: '2026-09-09' }), mk({ no: 'A', rent: 90000, publishedOn: '2026-09-01' })];
		expect(sortProperties(list, 'new').map((p) => p.no)).toEqual(['A', 'SOLD']);
		expect(sortProperties(list, 'price_asc').map((p) => p.no)).toEqual(['A', 'SOLD']);
	});

	it('J-033 0件時の緩和:1つ外して件数が出る条件を 駅徒歩→築年→面積→設備→間取り→家賃→エリア の順で返す', () => {
		// 全件:徒歩15分・築20年・30㎡・設備なし・1K・8万円・青戸。どの条件を外しても他が効いて0件のまま、にはしない
		const list = [mk({ no: 'A', stations: [{ slug: 'aoto', walk: 15 }], builtYm: '2006-01', areaSqm: 30, layout: '1K', rent: 80000, area: 'aoto' })];
		// 駅徒歩と面積だけが合わない → 単独で外しても0件 → 累積に入る
		const q: SearchQuery = { ...emptyQuery(), walkMax: 10, sqmMin: 40 };
		const out = relaxCandidates(list, q, NOW);
		expect(out).toHaveLength(1);
		expect(out[0].label).toBe('駅徒歩・面積の条件を外す');
		expect(out[0].count).toBe(1);
	});

	it('J-033 0件時の緩和:単独で外して件数が出る条件は、指定順にすべて返す', () => {
		const list = [mk({ no: 'A', stations: [{ slug: 'aoto', walk: 15 }], areaSqm: 30 })];
		// 徒歩だけ合わない・面積は合う → 「駅徒歩の条件を外す」1件だけ。順序確認のため面積も付ける(面積を外しても徒歩で0件)
		const q: SearchQuery = { ...emptyQuery(), walkMax: 10, sqmMin: 20 };
		expect(relaxCandidates(list, q, NOW).map((c) => c.label)).toEqual(['駅徒歩の条件を外す']);
	});

	it('J-033 0件時の緩和:全部外しても0件なら候補なし(UI は「クリア」のみ)', () => {
		const list = [mk({ no: 'A', type: 'sale' })]; // 賃貸で探すと何も無い
		const q: SearchQuery = { ...emptyQuery('rental'), walkMax: 10, layout: ['1K'] };
		expect(relaxCandidates(list, q, NOW)).toEqual([]);
	});

	it('J-041 駅を複数選ぶと OR(どちらかの駅に一致すれば残る)', () => {
		const list = [mk({ no: 'A', stations: [{ slug: 'aoto', walk: 5 }] }), mk({ no: 'B', stations: [{ slug: 'oshiage', walk: 5 }] }), mk({ no: 'C', stations: [{ slug: 'kameari', walk: 5 }] })];
		const q: SearchQuery = { ...emptyQuery(), station: ['aoto', 'oshiage'] };
		expect(applyQuery(list, q, NOW).map((p) => p.no)).toEqual(['A', 'B']);
	});

	it('J-040 collection=<slug> で特集を絞れる。複数は OR', () => {
		const list = [mk({ no: 'A', collections: ['central-30min'] }), mk({ no: 'B', collections: ['zero-deposit'] }), mk({ no: 'C', collections: [] })];
		expect(applyQuery(list, parseQuery(new URLSearchParams('collection=central-30min')), NOW).map((p) => p.no)).toEqual(['A']);
		expect(applyQuery(list, parseQuery(new URLSearchParams('collection=central-30min,zero-deposit')), NOW).map((p) => p.no)).toEqual(['A', 'B']);
	});

	it('J-041 設備を複数選ぶと AND(すべて持つ物件だけ残る)', () => {
		const list = [mk({ no: 'A', features: ['pet-ok', 'autolock'] }), mk({ no: 'B', features: ['pet-ok'] })];
		const q: SearchQuery = { ...emptyQuery(), feature: ['pet-ok', 'autolock'] };
		expect(applyQuery(list, q, NOW).map((p) => p.no)).toEqual(['A']);
	});

	it('J-042 タブの ON は URL パラメータに載り、OFF で消える(collection / walk_max / built_max / feature)', () => {
		let q = emptyQuery();
		q = toggleQuickTab(q, { kind: 'collection', slug: 'central-30min', label: '' });
		q = toggleQuickTab(q, { kind: 'walk', max: 10, label: '' });
		q = toggleQuickTab(q, { kind: 'built', max: 1, label: '' });
		q = toggleQuickTab(q, { kind: 'feature', slug: 'pet-ok', label: '' });
		expect(toSearchParams(q).toString()).toBe('collection=central-30min&walk_max=10&built_max=1&feature=pet-ok');
		expect(parseQuery(new URLSearchParams(toSearchParams(q).toString()))).toEqual(q);
		q = toggleQuickTab(q, { kind: 'collection', slug: 'central-30min', label: '' });
		q = toggleQuickTab(q, { kind: 'walk', max: 10, label: '' });
		q = toggleQuickTab(q, { kind: 'built', max: 1, label: '' });
		q = toggleQuickTab(q, { kind: 'feature', slug: 'pet-ok', label: '' });
		expect(toSearchParams(q).toString()).toBe('');
	});

	it('J-042 駅徒歩・築年のタブは排他(10分以内を押すと5分以内は外れる)。ページは1に戻る', () => {
		let q: SearchQuery = { ...emptyQuery(), walkMax: 5, page: 3 };
		expect(isQuickTabActive(q, { kind: 'walk', max: 5, label: '' })).toBe(true);
		q = toggleQuickTab(q, { kind: 'walk', max: 10, label: '' });
		expect(q.walkMax).toBe(10);
		expect(isQuickTabActive(q, { kind: 'walk', max: 5, label: '' })).toBe(false);
		expect(q.page).toBe(1);
	});

	it('J-042 タブの表示はデータ判定:その種別に1件も無い特集・設備は出さない。駅徒歩・築年は常に出す', () => {
		const list = [
			mk({ no: 'R', collections: ['central-30min'], features: ['autolock'] }),
			mk({ no: 'S', type: 'sale', collections: ['near-station'], features: ['parking'], rent: undefined, price: 3000 }),
		];
		const names = { collectionName: (x: string) => x, featureName: (x: string) => x };
		const rental = quickTabGroups(list, 'rental', names);
		expect(rental.map((g) => g.title)).toEqual(['特集', '駅徒歩', '築年', '設備']);
		expect(rental[0].tabs.map((t) => (t.kind === 'collection' ? t.slug : ''))).toEqual(['central-30min']);
		expect(rental[3].tabs.map((t) => (t.kind === 'feature' ? t.slug : ''))).toEqual(['autolock']);
		const sale = quickTabGroups(list, 'sale', names);
		expect(sale[0].tabs.map((t) => (t.kind === 'collection' ? t.slug : ''))).toEqual(['near-station']);
		expect(sale[3].tabs.map((t) => (t.kind === 'feature' ? t.slug : ''))).toEqual(['parking']);
		expect(quickTabGroups([], 'rental', names).map((g) => g.title)).toEqual(['駅徒歩', '築年']);
	});

	it('J-042 条件タグ(×付き)はタブにある条件を出さない:特集・徒歩5/10・築1/5・上位6設備は隠れ、徒歩15・築10・7番目以降の設備は出る', () => {
		const q: SearchQuery = { ...emptyQuery(), walkMax: 15, builtMaxYears: 10 };
		expect(isCoveredByQuickTab({ ...q, walkMax: 10 }, 'walkMax')).toBe(true);
		expect(isCoveredByQuickTab(q, 'walkMax')).toBe(false);
		expect(isCoveredByQuickTab({ ...q, builtMaxYears: 5 }, 'builtMaxYears')).toBe(true);
		expect(isCoveredByQuickTab(q, 'builtMaxYears')).toBe(false);
		expect(isCoveredByQuickTab(q, 'feature', 'pet-ok')).toBe(true);
		expect(isCoveredByQuickTab(q, 'feature', 'reheating')).toBe(false);
		expect(isCoveredByQuickTab(q, 'collection', 'central-30min')).toBe(true);
	});
});
