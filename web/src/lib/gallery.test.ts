import { describe, expect, it } from 'vitest';
import { buildSlides, clampIndex, counterLabel, hasArrows, indexFromScroll, isInsideContained, nextIndex, prevIndex } from '@/lib/gallery';

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

	it('F-007 object-contain の余白(絵のない部分)はクリックで閉じる側。絵の中は閉じない', () => {
		// 1248×750 の箱に 3:2(1200×800)を contain → 絵は 1125×750・左右に 61.5 の余白
		expect(isInsideContained(30, 375, 1248, 750, 1200, 800)).toBe(false); // 左の余白
		expect(isInsideContained(1220, 375, 1248, 750, 1200, 800)).toBe(false); // 右の余白
		expect(isInsideContained(624, 375, 1248, 750, 1200, 800)).toBe(true); // 中央
		expect(isInsideContained(62, 10, 1248, 750, 1200, 800)).toBe(true); // 絵の左端
	});

	it('F-007 上下に余白が出る向きでも同じ(正方形の箱に横長の画像)', () => {
		expect(isInsideContained(500, 10, 1000, 1000, 800, 500)).toBe(false); // 上の余白
		expect(isInsideContained(500, 500, 1000, 1000, 800, 500)).toBe(true);
	});

	it('F-007 元画像の寸法が取れない時は絵の中とみなす(閉じない)', () => {
		expect(isInsideContained(10, 10, 1248, 750, 0, 0)).toBe(true);
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
