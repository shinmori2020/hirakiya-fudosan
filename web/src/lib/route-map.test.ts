import { describe, expect, it } from 'vitest';
import type { PropertySummary } from '@/types/property';
import { checkStations, routeItems, type RouteMapData } from '@/lib/route-map';

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
