import { describe, expect, it } from 'vitest';
import type { PropertySummary } from '@/types/property';
import { relatedProperties } from '@/lib/related';

const mk = (no: string, over: Partial<PropertySummary> = {}): PropertySummary => ({
	no,
	slug: no.toLowerCase(),
	type: 'rental',
	kind: 'mansion',
	status: 'open',
	title: no,
	area: 'aoto',
	stations: [],
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
const self = mk('SELF', { area: 'aoto', lines: ['keisei-main'] });

describe('related.ts', () => {
	it('J-038 同町が4件以上あれば同町だけで4件', () => {
		const all = [self, mk('A1'), mk('A2'), mk('A3'), mk('A4'), mk('A5'), mk('L1', { area: 'oshiage' })];
		const out = relatedProperties(all, self);
		expect(out).toHaveLength(4);
		expect(out.every((p) => p.area === 'aoto')).toBe(true);
	});

	it('J-038 同町が2件なら残りは同沿線で埋める', () => {
		const all = [self, mk('A1'), mk('A2'), mk('L1', { area: 'oshiage' }), mk('L2', { area: 'hikifune' }), mk('T1', { area: 'kameari', lines: ['jr-joban'] })];
		expect(relatedProperties(all, self).map((p) => p.no)).toEqual(['A1', 'A2', 'L1', 'L2']);
	});

	it('J-038 同沿線でも足りなければ同種別で埋める', () => {
		const all = [self, mk('A1'), mk('L1', { area: 'oshiage' }), mk('T1', { area: 'kameari', lines: ['jr-joban'] }), mk('T2', { area: 'ayase', lines: ['jr-joban'] })];
		expect(relatedProperties(all, self).map((p) => p.no)).toEqual(['A1', 'L1', 'T1', 'T2']);
	});

	it('J-038 自分自身は含まない', () => {
		expect(relatedProperties([self, mk('A1')], self).map((p) => p.no)).toEqual(['A1']);
	});

	it('J-038 各段の中は新着順', () => {
		const all = [self, mk('OLD', { publishedOn: '2026-08-01' }), mk('NEW', { publishedOn: '2026-09-05' }), mk('MID', { publishedOn: '2026-08-20' })];
		expect(relatedProperties(all, self).map((p) => p.no)).toEqual(['NEW', 'MID', 'OLD']);
	});

	it('J-041 成約済みは含めない', () => {
		const all = [self, mk('SOLD', { status: 'sold' }), mk('A1')];
		expect(relatedProperties(all, self).map((p) => p.no)).toEqual(['A1']);
	});

	it('J-038 種別が違う物件は含めない(賃貸の関連に売買は出ない)', () => {
		const all = [self, mk('S1', { type: 'sale', price: 3000, rent: undefined })];
		expect(relatedProperties(all, self)).toEqual([]);
	});
});
