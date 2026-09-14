import { feeLabel } from '@/lib/format';
import { initialCostLabel, monthsLabel } from '@/lib/initial-cost';
import type { PropertyDetail } from '@/types/property';

/**
 * 費用の行(J-080 → J-084 → J-088 → J-090 → J-090 の修正)。賃貸のみ。
 *
 * J-080 では右カラム(価格の下)に置いたが、右カラムが 880px まで伸びて 1280 / 1024 で
 * 上部の CTA がファーストビューから出た。内訳と合計は読み込む情報なので、
 * 物件データの「入居前に確認すること」へ移した(J-084)。
 *
 * **まとまりの見出し(毎月の内訳 / 最初に必要 / 更新時 / 入居時の目安合計)は置かない。**
 * J-090 で h4 にしたが、見出しと項目名が同じ列の同じ位置に並ぶため、どちらが見出しか見分けが付かなかった。
 * 4つのうち「更新時」と「入居時の目安合計」は見出しと項目が1対1で、項目数も7行程度なので、
 * 見出しが無くても**時点の順**で追える。
 *   管理費・共益費 → 駐車場 → 敷金 → 礼金 → 仲介手数料 → 更新料 →(区切り)→ 合計
 * 家賃は右カラムの「毎月」(家賃+管理費の合計)に置くのでここには出さない(J-093)。
 *
 * 線は「行の下線」だけで引き、**まとまりの最後の行は下線を引かない**(下にアコーディオンの線や
 * 合計の区切り線が来て二重に見えるため)。
 * 合計だけは性質が違う(他は条件、合計は計算結果)ので、**上の細い横線と余白で区切って最後**に置き、
 * 金額を太字にする(J-081)。範囲の注記(含まない項目まで書く・J-087)も値の下に残す。
 * 行の作り(ラベル 7.5em の固定幅・下の細い横線・値は本文サイズ)は情報表の行と揃える(J-052 → J-090)。
 * 値の欄は 32em を上限にして左寄せにする(全幅に伸ばすとラベルと値が離れて読みにくい)。
 * 合計が出せない物件(仲介手数料の文字列が読めない等)は、合計の行だけ出さない。
 * 売買は 02 §3-3 に仲介手数料が無いので、このブロック自体を使わない(確認の行は従来のまま)。
 */
export function CostBlock({ p }: { p: PropertyDetail }) {
	const r = p.rental;
	if (!r || p.rent == null) return null;

	const total = initialCostLabel({
		rent: p.rent,
		maintenanceFee: r.maintenanceFee,
		depositMonths: r.depositMonths,
		keyMoneyMonths: r.keyMoneyMonths,
		brokerageFee: r.brokerageFee,
	});

	// 時点の順(毎月 → 入居時 → 更新時)。見出しは置かず、この並びで追わせる
	const rows: [string, string][] = [
		['管理費・共益費', feeLabel(r.maintenanceFee)],
		['駐車場', p.parking || '—'],
		['敷金', monthsLabel(r.depositMonths)],
		['礼金', monthsLabel(r.keyMoneyMonths)],
		['仲介手数料', r.brokerageFee || '—'],
		['更新料', r.renewalFee || '—'],
	];

	const row = 'grid grid-cols-[7.5em_minmax(0,32em)] gap-x-2 py-2';

	return (
		<dl>
			{rows.map(([k, v], i) => (
				// 最後の行は下線を引かない(下に合計の区切り線やアコーディオンの線が来て二重に見えるため・03 §6 の線の規則)
				<div key={k} className={`${row} ${i === rows.length - 1 ? '' : 'border-b border-line'}`}>
					<dt className="text-small text-ink-weak">{k}</dt>
					<dd className={`text-small leading-[1.6] text-ink ${v === 'なし' ? 'font-bold' : ''}`}>{v}</dd>
				</div>
			))}
			{/* 合計の区切りは上線と余白で作る。pt は足さない(足すと行の中身が他の行より下にずれる) */}
			{total && (
				<div className={`${row} mt-3 border-t border-line`}>
					<dt className="text-small text-ink-weak">入居時の目安合計</dt>
					<dd className="tabular text-body font-bold text-sumi lg:text-body-pc">
						{total}
						<span className="mt-1 block text-xs font-normal text-ink-weak lg:text-xs-pc">家賃・管理費・敷金・礼金・仲介手数料の合計。保証料・保険料・日割り家賃は含みません</span>
					</dd>
				</div>
			)}
		</dl>
	);
}
