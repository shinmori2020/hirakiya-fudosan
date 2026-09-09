import { describe, expect, it } from 'vitest';
import { pointChips } from '@/lib/points';

const NOW = new Date('2026-09-10T00:00:00+09:00');
const name = (slug: string) => ({ 'pet-ok': 'ペット可', autolock: 'オートロック', parking: '駐車場', aircon: 'エアコン', 'delivery-box': '宅配ボックス' })[slug] ?? slug;
const mk = (walk: number, builtYm: string, features: string[] = []) => ({ stations: [{ slug: 'aoto', walk }], builtYm, features, type: 'rental' as const });
const labels = (...args: Parameters<typeof mk>) => pointChips(mk(...args), name, NOW).map((c) => c.label);

describe('points.ts', () => {
	it('J-039 徒歩4分・5分は「駅徒歩5分以内」', () => {
		expect(labels(4, '2010-01')).toEqual(['駅徒歩5分以内']);
		expect(labels(5, '2010-01')).toEqual(['駅徒歩5分以内']);
	});

	it('J-039 徒歩6分・10分は「駅徒歩10分以内」', () => {
		expect(labels(6, '2010-01')).toEqual(['駅徒歩10分以内']);
		expect(labels(10, '2010-01')).toEqual(['駅徒歩10分以内']);
	});

	it('J-039 徒歩11分は駅のチップを出さない', () => {
		expect(labels(11, '2010-01')).toEqual([]);
	});

	it('J-039 築0年は「新築」', () => {
		expect(labels(15, '2026-04')).toEqual(['新築']);
	});

	it('J-039 築5年は「築浅・築5年」、築6年は出さない', () => {
		expect(labels(15, '2021-09')).toEqual(['築浅・築5年']);
		expect(labels(15, '2020-09')).toEqual([]);
	});

	it('J-039 設備は 02 §2 の順(ペット可 → オートロック → 駐車場)で、エアコンは出さない', () => {
		expect(labels(15, '2010-01', ['aircon', 'parking', 'autolock', 'pet-ok'])).toEqual(['ペット可', 'オートロック', '駐車場']);
	});

	it('J-039 4つ以上該当しても3つまで', () => {
		expect(labels(3, '2026-01', ['pet-ok', 'autolock', 'parking'])).toEqual(['駅徒歩5分以内', '新築', 'ペット可']);
	});

	it('J-039 1つしか該当しなければ1つのまま(埋め合わせない)', () => {
		expect(labels(15, '2010-01', ['aircon', 'delivery-box'])).toEqual(['宅配ボックス']);
	});

	it('J-040 各チップは一覧の URL(walk_max / built_max / feature)を持ち、売買は type=sale が付く', () => {
		const rental = pointChips(mk(3, '2026-01', ['pet-ok']), name, NOW);
		expect(rental.map((c) => c.href)).toEqual(['/properties?walk_max=5', '/properties?built_max=1', '/properties?feature=pet-ok']);
		const sale = pointChips({ ...mk(8, '2021-09', []), type: 'sale' }, name, NOW);
		expect(sale.map((c) => c.href)).toEqual(['/properties?type=sale&walk_max=10', '/properties?type=sale&built_max=5']);
	});
});
