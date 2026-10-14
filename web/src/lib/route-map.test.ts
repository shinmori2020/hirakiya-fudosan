import { describe, expect, it } from 'vitest';
import type { PropertySummary } from '@/types/property';
import { checkLayout, checkStations, routeItems, stationCounts, type RouteLayout, type RouteMapData } from '@/lib/route-map';

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
	photoCount: 3,
	hasFloorplan: true,
	floor: null,
	rent: 80000,
	...over,
});

const map = (stations: [string, string][], path: (string | [number, number])[] = []): RouteMapData => ({
	stations: stations.map(([id, name]) => ({ id, name })),
	lines: [{ id: 'keisei-main', name: '京成本線', path }],
});

describe('route-map.ts routeItems', () => {
	it('J-033 物件ごとに種類と駅の slug を、駅の順のまま並べる', () => {
		const items = routeItems([
			mk({ no: 'HR-R-0001', stations: [{ slug: 'aoto', walk: 3 }, { slug: 'keisei-tateishi', walk: 12 }] }),
			mk({ no: 'HR-S-0001', type: 'sale', stations: [{ slug: 'oshiage', walk: 5 }] }),
		]);
		expect(items).toEqual([
			{ type: 'rental', stations: ['aoto', 'keisei-tateishi'] },
			{ type: 'sale', stations: ['oshiage'] },
		]);
	});

	it('J-033 成約済み・商談中も含める(一覧に出るため)', () => {
		const items = routeItems([mk({ no: 'A', status: 'sold' }), mk({ no: 'B', status: 'negotiating' }), mk({ no: 'C' })]);
		expect(items).toHaveLength(3);
	});

	it('J-033 物件が0件なら空', () => {
		expect(routeItems([])).toEqual([]);
	});
});

describe('route-map.ts checkStations', () => {
	const site = [
		{ slug: 'aoto', name: '青砥' },
		{ slug: 'keisei-tateishi', name: '京成立石' },
	];

	it('02 §8 路線図の駅とサイトの駅が同じなら問題なし', () => {
		expect(checkStations(map([['aoto', '青砥'], ['keisei-tateishi', '京成立石']], ['aoto', [1, 2], 'keisei-tateishi']), site)).toEqual([]);
	});

	it('02 §8 サイトに無い駅を描いていたら問題(出してよい地名の外)', () => {
		const p = checkStations(map([['aoto', '青砥'], ['keisei-tateishi', '京成立石'], ['takasago', '京成高砂']]), site);
		expect(p).toEqual(['路線図の駅 takasago(京成高砂)がサイトの駅に無い']);
	});

	it('02 §8 サイトの駅が路線図に無ければ問題', () => {
		expect(checkStations(map([['aoto', '青砥']]), site)).toEqual(['サイトの駅 keisei-tateishi(京成立石)が路線図に無い']);
	});

	it('02 §8 前の版の id(tateishi)は、サイトに無い駅と無い駅の両方で見つかる', () => {
		const p = checkStations(map([['aoto', '青砥'], ['tateishi', '京成立石']]), site);
		expect(p).toContain('路線図の駅 tateishi(京成立石)がサイトの駅に無い');
		expect(p).toContain('サイトの駅 keisei-tateishi(京成立石)が路線図に無い');
	});

	it('02 §8 駅名が違えば問題', () => {
		expect(checkStations(map([['aoto', '青戸'], ['keisei-tateishi', '京成立石']]), site)).toEqual([
			'駅名が違う:aoto 路線図「青戸」/ サイト「青砥」',
		]);
	});

	it('02 §8 路線の通り道に、路線図に無い駅の id があれば問題(通過点 [x, y] は問題にしない)', () => {
		const p = checkStations(map([['aoto', '青砥'], ['keisei-tateishi', '京成立石']], ['aoto', [480, 240], 'keisei-koiwa']), site);
		expect(p).toEqual(['路線 keisei-main の通り道の keisei-koiwa が路線図の駅に無い']);
	});
});

describe('route-map.ts stationCounts', () => {
	const types = [{ id: 'rental' }, { id: 'sale' }];

	it('J-173 駅ごと・種類ごとに数える(2駅に属する物件は両方の駅に1件ずつ)', () => {
		const c = stationCounts(
			[
				{ type: 'rental', stations: ['aoto', 'keisei-tateishi'] },
				{ type: 'rental', stations: ['aoto'] },
				{ type: 'sale', stations: ['aoto'] },
			],
			types,
		);
		expect(c).toEqual({ rental: { aoto: 2, 'keisei-tateishi': 1 }, sale: { aoto: 1 } });
	});

	it('J-173 物件が0件でも、種類ごとの空の入れ物は作る(0件の駅は数が無い)', () => {
		expect(stationCounts([], types)).toEqual({ rental: {}, sale: {} });
	});

	it('J-173 同じ物件に同じ駅が2回書かれていても1件と数える・種類に無い物件は数えない', () => {
		const c = stationCounts([{ type: 'rental', stations: ['aoto', 'aoto'] }], [{ id: 'rental' }]);
		expect(c).toEqual({ rental: { aoto: 1 } });
		expect(stationCounts([{ type: 'sale', stations: ['aoto'] }], [{ id: 'rental' }])).toEqual({ rental: {} });
	});
});

describe('route-map.ts checkLayout', () => {
	const sch = (lines: [string, (string | [number, number])[]][], stations = ['aoto', 'keisei-tateishi', 'oshiage']): RouteMapData => ({
		stations: stations.map((id) => ({ id, name: id })),
		lines: lines.map(([id, path]) => ({ id, name: id, path })),
	});
	const lay = (lines: Record<string, (string | [number, number])[]>, stations = ['aoto', 'keisei-tateishi', 'oshiage']): RouteLayout => ({
		stations: Object.fromEntries(stations.map((id, i) => [id, [i, i] as [number, number]])),
		lines,
	});

	it('J-173 駅・路線・路線ごとの駅の並びが同じなら問題なし(通過点 [x, y] は数えない)', () => {
		const p = checkLayout(lay({ 'keisei-oshiage': [[-1, 0], 'oshiage', 'keisei-tateishi', [5, 5], 'aoto'] }), sch([['keisei-oshiage', ['oshiage', [2, 2], 'keisei-tateishi', 'aoto']]]));
		expect(p).toEqual([]);
	});

	it('J-173 路線ごとの駅の並び順が違えば問題(SHIN の条件)', () => {
		const p = checkLayout(lay({ 'keisei-oshiage': ['oshiage', 'aoto', 'keisei-tateishi'] }), sch([['keisei-oshiage', ['oshiage', 'keisei-tateishi', 'aoto']]]));
		expect(p).toEqual(['路線 keisei-oshiage の駅の並びが違う:schematic oshiage>keisei-tateishi>aoto / block-layout oshiage>aoto>keisei-tateishi']);
	});

	it('J-173 並びが逆向き(端から端までを反対に書いた)も問題', () => {
		const p = checkLayout(lay({ l: ['aoto', 'oshiage'] }), sch([['l', ['oshiage', 'aoto']]]));
		expect(p).toHaveLength(1);
	});

	it('J-173 片方にだけある駅・路線は問題', () => {
		const p = checkLayout(
			lay({ l: ['aoto'], extra: ['aoto'] }, ['aoto', 'takasago']),
			sch([['l', ['aoto']], ['only', ['aoto']]], ['aoto', 'oshiage']),
		);
		expect(p).toEqual([
			'block-layout の駅 takasago が schematic に無い',
			'schematic の駅 oshiage が block-layout に無い',
			'block-layout の路線 extra が schematic に無い',
			'schematic の路線 only が block-layout に無い',
		]);
	});
});
