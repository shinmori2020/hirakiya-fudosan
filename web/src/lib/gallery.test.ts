import { describe, expect, it } from 'vitest';
import { buildSlides, clampIndex, counterLabel, hasArrows, indexFromScroll, nextIndex, prevIndex } from '@/lib/gallery';

describe('gallery.ts', () => {
	it('J-048 間取り図はギャラリーの最後の1枚(サムネイル行と同じ順)', () => {
		const s = buildSlides(['/a.svg', '/b.svg'], '/plan.svg');
		expect(s.map((x) => x.src)).toEqual(['/a.svg', '/b.svg', '/plan.svg']);
		expect(s.map((x) => x.label)).toEqual(['写真 1', '写真 2', '間取り図']);
		expect(s[2].kind).toBe('floorplan');
	});

	it('J-048 写真0枚は間取り図1枚だけ。間取り図も無ければ0枚', () => {
		expect(buildSlides([], '/plan.svg')).toHaveLength(1);
		expect(buildSlides([], null)).toEqual([]);
	});

	it('J-048 次へ:最後の次は最後のまま(循環しない)', () => {
		expect(nextIndex(0, 6)).toBe(1);
		expect(nextIndex(5, 6)).toBe(5);
	});

	it('J-048 前へ:最初の前は最初のまま(循環しない)', () => {
		expect(prevIndex(3, 6)).toBe(2);
		expect(prevIndex(0, 6)).toBe(0);
	});

	it('J-048 枚数表示は「3 / 6」。1枚なら出さない', () => {
		expect(counterLabel(2, 6)).toBe('3 / 6');
		expect(counterLabel(0, 1)).toBe('');
	});

	it('J-048 矢印は2枚以上のときだけ(写真0枚+間取り図1枚は矢印なし)', () => {
		expect(hasArrows(1)).toBe(false);
		expect(hasArrows(2)).toBe(true);
	});

	it('J-048 範囲外の番号は端に収める。0枚なら 0', () => {
		expect(clampIndex(-1, 6)).toBe(0);
		expect(clampIndex(9, 6)).toBe(5);
		expect(clampIndex(2, 0)).toBe(0);
	});

	it('J-048 スワイプ後のスクロール位置からスライド番号を求める(1枚幅で四捨五入・端で止まる)', () => {
		expect(indexFromScroll(0, 390, 6)).toBe(0);
		expect(indexFromScroll(390, 390, 6)).toBe(1);
		expect(indexFromScroll(560, 390, 6)).toBe(1); // 1.44 → 1
		expect(indexFromScroll(620, 390, 6)).toBe(2); // 1.59 → 2
		expect(indexFromScroll(9999, 390, 6)).toBe(5);
		expect(indexFromScroll(100, 0, 6)).toBe(0);
	});
});
