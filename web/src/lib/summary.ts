/**
 * 物件概要まわりの数値の整形(純関数)。
 *
 * 経緯:J-047 で「キー項目の帯(5項目)」、J-059 で「決め手の3項目」を組み立てる keySpecs をここに置いていたが、
 * J-070 で右カラムに決め手を集約したため、3項目そのものを廃止した。
 * 3項目だけで使っていた keySpecs / layoutAreaLabel / monthlyFeeLabel / initialCostLabel も同時に削除した
 * (使われないまま残すと、次に読む人が現役の仕様だと誤解するため)。
 * 残すのは、右カラムで使う月額の合計だけ。
 */
const NONE = '—';

/**
 * 管理費+修繕積立金の月額合計(J-059 → J-070 で右カラムへ)。「管理費・修繕 月18,000円」の形。
 * どちらも無ければ null(その行を出さない)。内訳(合算しない併記)は情報表に残す。
 */
export function monthlyTotalLabel(mgmtFee: number | null | undefined, repairFund: number | null | undefined): string | null {
	const total = (mgmtFee ?? 0) + (repairFund ?? 0);
	if (total <= 0) return null;
	return `管理費・修繕 月${total.toLocaleString('ja-JP')}円`;
}

/** 月額の費用を「1.2万円」の形に。0 や null は「—」(情報表の併記で使う) */
export function monthlyFeeLabel(yen: number | null | undefined): string {
	if (yen == null || yen <= 0) return NONE;
	return `${(yen / 10000).toLocaleString('ja-JP', { maximumFractionDigits: 1 })}万円`;
}

/**
 * 毎月かかる費用の合計(J-092 の基準 → J-093)。右カラムの価格の直下に1行で出す。
 *   賃貸           家賃 + 管理費・共益費
 *   売買マンション   管理費 + 修繕積立金(「毎月の維持費」。ローンは含めないので「支払い」とは呼ばない)
 *   戸建・土地      無い(null を返し、行ごと出さない。欠損ではなく性質)
 * 内訳は物件データの「毎月の内訳」に置く(同じ項目を2箇所に出さない・J-092)。
 */
export function monthlyCost(p: {
	type: 'rental' | 'sale';
	rent?: number | null;
	rental?: { maintenanceFee: number } | null;
	sale?: { mgmtFee: number | null; repairFund: number | null } | null;
}): number | null {
	if (p.type === 'rental') {
		if (p.rent == null || p.rent <= 0) return null;
		return p.rent + (p.rental?.maintenanceFee ?? 0);
	}
	const total = (p.sale?.mgmtFee ?? 0) + (p.sale?.repairFund ?? 0);
	return total > 0 ? total : null;
}

/** 上の合計の表示。「87,000円」。出せない時は null(行ごと出さない) */
export function monthlyCostLabel(p: Parameters<typeof monthlyCost>[0]): string | null {
	const total = monthlyCost(p);
	return total == null ? null : `${total.toLocaleString('ja-JP')}円`;
}

/**
 * 「毎月」の行を出すかどうか(J-093 の残件)。計算(monthlyCost)は変えず、出す条件だけをここに持つ。
 * 管理費・共益費が無い賃貸では合計が家賃と同額になり、大きな価格表記のすぐ下に同じ金額が
 * 別の書式で並ぶだけで情報が増えない。J-092 の「戸建・土地は行ごと出さない(「—」も出さない)」と
 * 同じ考え方で、**値がある時だけ出す**(0円の行を作らない)。
 */
export function showsMonthlyCost(p: Parameters<typeof monthlyCost>[0]): boolean {
	if (p.type === 'rental') return (p.rental?.maintenanceFee ?? 0) > 0;
	return monthlyCost(p) != null;
}
