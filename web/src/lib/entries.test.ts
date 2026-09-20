import { describe, expect, it } from 'vitest';
import type { PropertySummary } from '@/types/property';
import { countBy, coveredCounts, entryCounts, stationsByLine, townsByWard } from '@/lib/entries';

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

const list = [
	mk({ no: 'R1', area: 'aoto', stations: [{ slug: 'aoto', walk: 5 }], lines: ['keisei-main', 'keisei-oshiage'], collections: ['pet-ok'] }),
	mk({ no: 'R2', area: 'aoto', status: 'sold' }),
	mk({ no: 'R3', area: 'tateishi', stations: [{ slug: 'keisei-tateishi', walk: 3 }], lines: ['keisei-oshiage'] }),
	mk({ no: 'S1', type: 'sale', kind: 'house', area: 'aoto', rent: undefined, price: 3000 }),
];

describe('entries.ts', () => {
	it('J-095 件数は種別で分け、成約済みも含める(一覧の件数表示と同じ数え方)', () => {
		expect(countBy(list, 'rental', 'area', 'aoto')).toBe(2);
		expect(countBy(list, 'sale', 'area', 'aoto')).toBe(1);
		expect(countBy(list, 'rental', 'area', 'tateishi')).toBe(1);
	});

	it('J-095 駅・沿線・特集は物件側が配列で持つので、含まれていれば数える', () => {
		expect(countBy(list, 'rental', 'station', 'aoto')).toBe(2);
		expect(countBy(list, 'rental', 'line', 'keisei-oshiage')).toBe(2);
		expect(countBy(list, 'rental', 'collection', 'pet-ok')).toBe(1);
	});

	it('J-095 0件の項目も 0 で返す(入口では「0件」と出してリンクを残す)', () => {
		expect(entryCounts(list, 'area', [{ slug: 'aoto', name: '青戸' }, { slug: 'hirai', name: '平井' }])).toEqual([
			{ slug: 'aoto', name: '青戸', rental: 2, sale: 1 },
			{ slug: 'hirai', name: '平井', rental: 0, sale: 0 },
		]);
	});

	it('J-095 区ごとの町は config の並びを保ち、タクソノミーに無い町名は落とす', () => {
		const terms = [
			{ slug: 'katsushika', name: '葛飾区', parent: null },
			{ slug: 'aoto', name: '青戸', parent: 'katsushika' },
			{ slug: 'tateishi', name: '立石', parent: 'katsushika' },
		];
		expect(townsByWard([{ ward: '葛飾区', towns: ['立石', '青戸', '架空町'] }], terms)).toEqual([
			{ ward: '葛飾区', towns: [{ slug: 'tateishi', name: '立石' }, { slug: 'aoto', name: '青戸' }] },
		]);
	});

	it('J-095 複数の沿線に属する駅は、入口ではそれぞれの沿線の下に出す', () => {
		const stations = [
			{ slug: 'aoto', name: '青砥', meta: { lines: 'keisei-main,keisei-oshiage' } },
			{ slug: 'ohanajaya', name: 'お花茶屋', meta: { lines: 'keisei-main' } },
		];
		const out = stationsByLine([{ slug: 'keisei-main', name: '京成本線' }, { slug: 'keisei-oshiage', name: '京成押上線' }], stations);
		expect(out[0].stations.map((s) => s.slug)).toEqual(['aoto', 'ohanajaya']);
		expect(out[1].stations.map((s) => s.slug)).toEqual(['aoto']);
	});

	it('J-126 入口で辿れる物件数は、同じ物件を1回だけ数える(沿線は1物件が2本に乗る)', () => {
		const all = [
			mk({ no: 'HR-R-0001', lines: ['keisei-main', 'keisei-oshiage'] }),
			mk({ no: 'HR-R-0002', lines: ['keisei-main'] }),
			mk({ no: 'HR-S-0001', type: 'sale', lines: ['jr-sobu'] }),
		];
		// 足し算(entryCounts の合計)なら 2 + 1 = 3 になるが、実際の賃貸は2件
		expect(coveredCounts(all, 'line', ['keisei-main', 'keisei-oshiage'])).toEqual({ rental: 2, sale: 0 });
		expect(coveredCounts(all, 'line', ['keisei-main', 'jr-sobu'])).toEqual({ rental: 2, sale: 1 });
		// 該当なしは 0
		expect(coveredCounts(all, 'collection', ['pet-ok'])).toEqual({ rental: 0, sale: 0 });
	});
});
