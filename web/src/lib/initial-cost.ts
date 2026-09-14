/**
 * 入居時に必要な費用(J-081)。純関数。
 *
 * 01 §3「初期費用(敷金・礼金・仲介手数料)は隠さない」に対する計算。
 * 単位が3種類あるので、すべて円に揃えてから足す:
 *   - 敷金・礼金 …… 家賃の「ヶ月」数
 *   - 仲介手数料 …… select の文字列(「家賃1ヶ月」「0.5ヶ月」「無料」)
 *   - 管理費・共益費 …… 円
 * 合計は「家賃 + 管理費・共益費 + 敷金 + 礼金 + 仲介手数料」の5項目だけ。
 * 保険料・保証料・前家賃の日割りは 02 にデータが無いので含めない(注記で明示する)。
 * 対象は賃貸のみ。売買は 02 §3-3 に仲介手数料のフィールドが無いため合計を出さない。
 */

/** 仲介手数料の select を家賃の「ヶ月」数に。読めない文字列は null(合計を出さない) */
export function brokerageMonths(fee: string | null | undefined): number | null {
	const v = (fee ?? '').trim();
	if (v === '') return null;
	if (v.includes('無料')) return 0;
	const m = /([\d.]+)\s*ヶ月/.exec(v);
	if (!m) return null;
	const n = Number(m[1]);
	return Number.isFinite(n) ? n : null;
}

export interface InitialCostInput {
	rent: number | null | undefined;
	maintenanceFee: number | null | undefined;
	depositMonths: number | null | undefined;
	keyMoneyMonths: number | null | undefined;
	brokerageFee: string | null | undefined;
}

/**
 * 入居時の目安合計(円)。家賃が無い、または仲介手数料が読めない時は null。
 * 0.5ヶ月で1円未満の端数が出るため、合計を切り上げる(実際より少なく見せない)。
 */
export function initialCostTotal({ rent, maintenanceFee, depositMonths, keyMoneyMonths, brokerageFee }: InitialCostInput): number | null {
	if (rent == null || rent <= 0) return null;
	const broker = brokerageMonths(brokerageFee);
	if (broker == null) return null;
	const months = 1 + (depositMonths ?? 0) + (keyMoneyMonths ?? 0) + broker;
	return Math.ceil(rent * months + (maintenanceFee ?? 0));
}

/** 合計の表示。「418,000円」。出せない時は null(ブロックごと出さない) */
export function initialCostLabel(input: InitialCostInput): string | null {
	const total = initialCostTotal(input);
	return total == null ? null : `${total.toLocaleString('ja-JP')}円`;
}

/** 敷金・礼金の表示。0 は「なし」、それ以外は「2ヶ月」(情報表の「なし」の扱いと揃える) */
export function monthsLabel(months: number | null | undefined): string {
	return months == null || months <= 0 ? 'なし' : `${months}ヶ月`;
}
