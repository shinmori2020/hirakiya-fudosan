import { describe, expect, it } from 'vitest';
import { loopSlots, posOfReal, realOf, settle, startPos } from '@/lib/voice-loop';

describe('voice-loop.ts', () => {
	it('J-163 前後に n 枚ずつクローンを並べ、全部で 3n 枚', () => {
		const s = loopSlots(3);
		expect(s).toHaveLength(9);
		expect(s.map((x) => x.real)).toEqual([0, 1, 2, 0, 1, 2, 0, 1, 2]);
		expect(s.map((x) => x.clone)).toEqual([true, true, true, false, false, false, true, true, true]);
	});

	it('J-163 読み込んだ時はもとの1枚目が中央(前のクローンの直後)', () => {
		expect(startPos(6)).toBe(6);
		expect(realOf(startPos(6), 6)).toBe(0);
	});

	it('J-163 位置からもとのカードの番号を出す(クローンでも同じカード)', () => {
		expect(realOf(5, 6)).toBe(5); // 前のクローンの F
		expect(realOf(11, 6)).toBe(5); // もとの F
		expect(realOf(12, 6)).toBe(0); // 後のクローンの A
	});

	it('J-163 もとのカード k を中央に置く位置', () => {
		expect(posOfReal(0, 6)).toBe(6);
		expect(posOfReal(5, 6)).toBe(11);
	});

	it('J-163 F の次は後のクローンの A へ進み、動き終わったらもとの A に戻す', () => {
		expect(settle(12, 6)).toBe(6);
	});

	it('J-163 A の前は前のクローンの F へ戻り、動き終わったらもとの F に戻す', () => {
		expect(settle(5, 6)).toBe(11);
	});

	it('J-163 もとのカードの範囲にいる時は動かさない(境界:n と 2n-1)', () => {
		expect(settle(6, 6)).toBe(6);
		expect(settle(11, 6)).toBe(11);
	});

	it('J-163 戻す前後で中央のカードは同じ', () => {
		for (const p of [5, 12]) expect(realOf(settle(p, 6), 6)).toBe(realOf(p, 6));
	});
});
