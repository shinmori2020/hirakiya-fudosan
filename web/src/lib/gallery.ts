/**
 * ギャラリーのスライダー位置計算(J-048)。純関数。
 * 写真の後に間取り図を最後の1枚として並べる。末尾は循環しない(最後の次は最後のまま、最初の前は最初のまま)。
 */
export interface Slide {
	src: string;
	/** 「写真 1」「間取り図」。alt とサムネイルのラベルに使う */
	label: string;
	kind: 'photo' | 'floorplan';
}

export function buildSlides(images: string[], floorplan: string | null): Slide[] {
	const photos = images.map<Slide>((src, i) => ({ src, label: `写真 ${i + 1}`, kind: 'photo' }));
	return floorplan ? [...photos, { src: floorplan, label: '間取り図', kind: 'floorplan' }] : photos;
}

/** 0〜count-1 に収める。count が 0 なら 0 */
export function clampIndex(index: number, count: number): number {
	if (count <= 0) return 0;
	return Math.min(Math.max(Math.floor(index), 0), count - 1);
}

/** 次へ。最後なら最後のまま(循環しない) */
export function nextIndex(index: number, count: number): number {
	return clampIndex(index + 1, count);
}

/** 前へ。最初なら最初のまま(循環しない) */
export function prevIndex(index: number, count: number): number {
	return clampIndex(index - 1, count);
}

/** 「3 / 6」。1枚以下なら空文字(表示しない) */
export function counterLabel(index: number, count: number): string {
	return count > 1 ? `${clampIndex(index, count) + 1} / ${count}` : '';
}

/** 矢印を出すか(2枚以上) */
export function hasArrows(count: number): boolean {
	return count > 1;
}

/** scroll-snap のスクロール位置(px)→ スライド番号。1枚の幅で割って四捨五入 */
export function indexFromScroll(scrollLeft: number, slideWidth: number, count: number): number {
	if (slideWidth <= 0) return 0;
	return clampIndex(Math.round(scrollLeft / slideWidth), count);
}

/**
 * object-contain の画像で、クリック位置が「絵が描かれている範囲」の中かどうか(F-007)。
 * img の箱はスライド全体に広がるので、上下左右の余白(絵のない部分)も img に当たる。
 * 元画像の寸法が取れない時(naturalW/H が 0)は絵の中とみなす = 閉じない。
 */
export function isInsideContained(
	x: number,
	y: number,
	boxW: number,
	boxH: number,
	naturalW: number,
	naturalH: number,
): boolean {
	if (naturalW <= 0 || naturalH <= 0 || boxW <= 0 || boxH <= 0) return true;
	const scale = Math.min(boxW / naturalW, boxH / naturalH);
	const w = naturalW * scale;
	const h = naturalH * scale;
	const left = (boxW - w) / 2;
	const top = (boxH - h) / 2;
	return x >= left && x <= left + w && y >= top && y <= top + h;
}
