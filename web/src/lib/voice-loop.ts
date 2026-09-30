/**
 * お客様の声のカルーセルの無限ループ(J-163・03 §6)。位置の計算だけをここに置く(部品は状態を持ってここに聞く)。
 *
 * 並べ方:前のクローン n 枚 + もとの n 枚 + 後のクローン n 枚(合わせて 3n 枚)。
 * 位置(pos)は「画面の中央に来ているカードの番号」(0 始まり・3n 枚の中の番号)。
 *  - 読み込んだ時は、もとの1枚目(A)が中央:pos = n
 *  - 送る時は pos を ±1 して動かす(F の次は後のクローンの A へ、A の前は前のクローンの F へ。巻き戻さない)
 *  - 動き終わってクローンに入っていたら、見た目が同じもとのカードの位置へ瞬間的に戻す(settle)
 */

export interface LoopSlot {
	/** もとのカードの番号(0〜n-1) */
	real: number;
	/** クローンか(読み上げ・Tab に出さない) */
	clone: boolean;
}

/** 並べるカード(3n 枚)。前後の n 枚ずつがクローン */
export function loopSlots(n: number): LoopSlot[] {
	return Array.from({ length: n * 3 }, (_, i) => ({ real: i % n, clone: i < n || i >= n * 2 }));
}

/** 読み込んだ時の位置(もとの1枚目が中央) */
export function startPos(n: number): number {
	return n;
}

/** その位置に出ているもとのカードの番号 */
export function realOf(pos: number, n: number): number {
	return ((pos % n) + n) % n;
}

/** もとのカード k を中央に置く位置 */
export function posOfReal(k: number, n: number): number {
	return n + k;
}

/** 動き終わった後の位置。クローンに入っていたら、同じカードのもとの位置へ戻す(見た目は変わらない) */
export function settle(pos: number, n: number): number {
	if (pos >= n * 2) return pos - n;
	if (pos < n) return pos + n;
	return pos;
}
