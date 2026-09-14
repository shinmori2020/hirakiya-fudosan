import { feeLabel } from '@/lib/format';
import { initialCostLabel, monthsLabel } from '@/lib/initial-cost';
import type { PropertyDetail } from '@/types/property';

/**
 * 右カラムの費用(J-080)。賃貸のみ。
 *
 * J-070 で帯を廃止して右カラムに移した時、敷金・礼金だけを移し替えたため仲介手数料が項目として落ちていた。
 * 01 §3「初期費用(敷金・礼金・仲介手数料)は隠さない」に戻すため、費用を3つに分けて出す。
 *   毎月         家賃 / 管理費・共益費
 *   最初に必要    敷金 / 礼金 / 仲介手数料
 *   入居時の目安合計  合計(J-081 の純関数)+ 範囲の注記
 * 区分の見出しは最小(11 / 12px)・灰、項目は小(13px)。ラベル幅は 6.5em の固定(情報表・要約と同じ規則・J-052)。
 * 合計が出せない物件(仲介手数料の文字列が読めない等)は、その区分ごと出さない。
 * 売買は 02 §3-3 に仲介手数料が無いので、このブロック自体を出さない(価格の下は管理費+修繕の月額合計のまま)。
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

	const groups: { title: string; rows: [string, string][] }[] = [
		{
			title: '毎月',
			rows: [
				['家賃', `${p.rent.toLocaleString('ja-JP')}円`],
				['管理費・共益費', feeLabel(r.maintenanceFee)],
			],
		},
		{
			title: '最初に必要',
			rows: [
				['敷金', monthsLabel(r.depositMonths)],
				['礼金', monthsLabel(r.keyMoneyMonths)],
				['仲介手数料', r.brokerageFee || '—'],
			],
		},
	];

	return (
		<div className="mt-3 space-y-3">
			{groups.map((g) => (
				<div key={g.title}>
					<p className="text-xs text-ink-weak lg:text-xs-pc">{g.title}</p>
					<dl className="mt-1 grid grid-cols-[6.5em_minmax(0,1fr)] gap-x-2 gap-y-1">
						{g.rows.map(([k, v]) => (
							<div key={k} className="col-span-2 grid grid-cols-subgrid">
								<dt className="text-small text-ink-weak">{k}</dt>
								<dd className={`text-small text-ink ${v === 'なし' ? 'font-bold' : ''}`}>{v}</dd>
							</div>
						))}
					</dl>
				</div>
			))}
			{total && (
				<div>
					<p className="text-xs text-ink-weak lg:text-xs-pc">入居時の目安合計</p>
					<p className="tabular mt-1 text-body font-bold text-sumi lg:text-body-pc">{total}</p>
					<p className="mt-1 text-xs text-ink-weak lg:text-xs-pc">家賃・管理費・敷金・礼金・仲介手数料の5項目の合計</p>
				</div>
			)}
		</div>
	);
}
