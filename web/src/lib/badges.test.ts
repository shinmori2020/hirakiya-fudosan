import { describe, expect, it } from 'vitest';
import type { PropertySummary } from '@/types/property';
import { badgesFor, isDiscounted, isNew } from '@/lib/badges';

const NOW = new Date('2026-09-15T00:00:00+09:00');
const mk = (over: Partial<PropertySummary>): PropertySummary => ({
	no: 'X',
	slug: 'x',
	type: 'rental',
	kind: 'mansion',
	status: 'open',
	title: 'X',
	area: 'aoto',
	stations: [],
	lines: [],
	features: [],
	collections: [],
	layout: '1K',
	areaSqm: 25,
	builtYm: '2015-04',
	lat: 0,
	lng: 0,
	thumb: null,
	publishedOn: '2026-01-01',
	photoCount: 3,
	hasFloorplan: true,
	floor: null,
	rent: 80000,
	...over,
});

describe('badges.ts', () => {
	it('02 §3 公開14日以内は新着、15日は新着でない', () => {
		expect(isNew({ publishedOn: '2026-09-01' }, NOW)).toBe(true); // 14日
		expect(isNew({ publishedOn: '2026-08-31' }, NOW)).toBe(false); // 15日
	});

	it('02 §3 前回家賃 > 現家賃なら値下げ、同額は値下げでない', () => {
		expect(isDiscounted({ rent: 80000, rentPrevious: 85000 })).toBe(true);
		expect(isDiscounted({ rent: 80000, rentPrevious: 80000 })).toBe(false);
	});

	it('02 §3 商談中は「商談中」', () => {
		expect(badgesFor(mk({ status: 'negotiating' }), NOW)).toEqual(['negotiating']);
	});

	it('J-038 成約済みは「成約済み」のみ(14日以内でも新着を併記しない)', () => {
		expect(badgesFor(mk({ status: 'sold', publishedOn: '2026-09-10', rent: 80000, rentPrevious: 90000 }), NOW)).toEqual(['sold']);
	});

	it('02 §3 新着と値下げは同時に出る(成約済み > 商談中 > 値下げ > 新着 の順)', () => {
		expect(badgesFor(mk({ publishedOn: '2026-09-10', rent: 80000, rentPrevious: 90000 }), NOW)).toEqual(['discount', 'new']);
	});

	it('rules/search.md §3 同時表示は最大2つ(商談中+値下げ+新着 → 商談中・値下げ)', () => {
		expect(badgesFor(mk({ status: 'negotiating', publishedOn: '2026-09-10', rent: 80000, rentPrevious: 90000 }), NOW)).toEqual(['negotiating', 'discount']);
	});
});
