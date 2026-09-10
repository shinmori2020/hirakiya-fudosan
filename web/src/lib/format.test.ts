import { describe, expect, it } from 'vitest';
import type { PropertySummary } from '@/types/property';
import { builtLabel, feeLabel, mainPrice, sqmLabel, walkLabel } from '@/lib/format';

const base: PropertySummary = {
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
	publishedOn: '2026-09-01',
	photoCount: 3,
	hasFloorplan: true,
	floor: null,
};
const NOW = new Date('2026-09-10T00:00:00+09:00');

describe('format.ts', () => {
	it('03 §6 家賃 82,000円は「8.2万円」', () => {
		expect(mainPrice({ ...base, rent: 82000 })).toBe('8.2万円');
	});

	it('03 §6 家賃 100,000円は「10万円」(10.0万円にしない)', () => {
		expect(mainPrice({ ...base, rent: 100000 })).toBe('10万円');
	});

	it('03 §6 売買 3,500万円は「3,500万円」(桁区切り)', () => {
		expect(mainPrice({ ...base, type: 'sale', price: 3500 })).toBe('3,500万円');
	});

	it('03 §6 値が無ければ「—」', () => {
		expect(mainPrice({ ...base, rent: undefined })).toBe('—');
	});

	it('J-041 徒歩8分は「徒歩8分」', () => {
		expect(walkLabel(8)).toBe('徒歩8分');
	});

	it('J-041 管理費 0 / null は「なし」、5,000 は「5,000円」', () => {
		expect(feeLabel(0)).toBe('なし');
		expect(feeLabel(null)).toBe('なし');
		expect(feeLabel(5000)).toBe('5,000円');
	});

	it('03 §6 築年:2008年4月は今(2026年9月)から「築18年」、当年は「新築」、土地(空)は null', () => {
		expect(builtLabel('2008-04', NOW)).toBe('築18年');
		expect(builtLabel('2026-03', NOW)).toBe('新築');
		expect(builtLabel('', NOW)).toBeNull();
	});

	it('03 §6 面積は「35㎡」、無ければ「—」', () => {
		expect(sqmLabel(35)).toBe('35㎡');
		expect(sqmLabel(null)).toBe('—');
	});
});
