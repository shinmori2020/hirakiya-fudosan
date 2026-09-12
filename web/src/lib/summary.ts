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
