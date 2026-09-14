/**
 * 売買の仲介手数料(J-094)。純関数。
 *
 * 02 §3-3 に売買の仲介手数料のフィールドは無い。**価格から計算して出す**:
 * 法定の上限額は式が決まっているので、架空の数字を作らずに済み、シードの再投入も要らない。
 *   売買価格が 400万円を超える場合の上限 = 価格 × 3% + 6万円 + 消費税
 * 400万円以下は式が変わる(200万円以下 5% / 200〜400万円 4%)が、02 §6 の価格は
 * 2,000〜7,000万円なので**この範囲の式だけを実装し、400万円以下は null を返して出さない**
 * (データに無い範囲の分岐を書くと、使われない仕様がコードに残る)。
 *
 * 端数は**切り捨て**。J-081 の入居時の目安合計は「実際より少なく見せない」ので切り上げたが、
 * こちらは**上限額**なので、上限を超えないほうへ倒す。
 * 賃貸の仲介手数料は 02 §3-2 の brokerageFee(select の文字列)のままで、この関数は使わない。
 */

/** 消費税率。会社情報ではなく計算の一部なので config/site.ts ではなくここに置く */
export const CONSUMPTION_TAX_RATE = 0.1;

/** この式が使える下限(売買価格 400万円超) */
const FORMULA_MIN_YEN = 4_000_000;

/**
 * 仲介手数料の上限額(円)。price は 02 の単位に合わせて**万円**で渡す。
 * 価格が無い・400万円以下なら null(行ごと出さない)。
 */
export function brokerageCapYen(priceMan: number | null | undefined): number | null {
	if (priceMan == null || priceMan <= 0) return null;
	const yen = priceMan * 10000;
	if (yen <= FORMULA_MIN_YEN) return null;
	return Math.floor((yen * 0.03 + 60000) * (1 + CONSUMPTION_TAX_RATE));
}

/** 表示用。「1,089,000円」。出せない時は null */
export function brokerageCapLabel(priceMan: number | null | undefined): string | null {
	const yen = brokerageCapYen(priceMan);
	return yen == null ? null : `${yen.toLocaleString('ja-JP')}円`;
}
