import { feeLabel } from '@/lib/format';
import { initialCostLabel, monthsLabel } from '@/lib/initial-cost';
import type { PropertyDetail } from '@/types/property';

/**
 * 費用のまとまり(J-080 → J-084)。賃貸のみ。
 *
 * J-080 では右カラム(価格の下)に置いたが、右カラムが 880px まで伸びて写真の下端(640px)と差が開き、
 * 1280 / 1024 で上部の CTA がファーストビューから出た。内訳と合計は「読み込む情報」で、
 * 一目で確かめる情報が並ぶ右カラムとは性格が違うため、物件データの「入居前に確認すること」の
 * お金側(左列)へ移した(J-084)。右カラムに残るのは大きな価格表記だけ。
 *
 * 並びは時点順:
 *   毎月         家賃 / 管理費・共益費 / 駐車場(月額が発生するので 03 の分類どおりお金側)
 *   最初に必要    敷金 / 礼金 / 仲介手数料(01 §3「初期費用は隠さない」)
 *   更新時       更新料
 *   入居時の目安合計  合計(J-081 の純関数)+ 範囲の注記(含まない項目まで書く・J-087)
 * 家賃の行を出すのは、注記が「5項目の合計」と書いている以上、内訳に家賃が無いと検算できないため。
 * 行の作り(ラベル 6.5em・下の細い横線・値は本文サイズ)は情報表の行と揃える(J-052)。
 * まとまりの見出しは h4(アコーディオンの見出し h3 の下にぶら下げる。<p> だと読み上げの構造で
 * 10行がフラットに並び、どこからが「最初に必要」なのかが分からないため)。文字の大きさは変えない。
 * 合計が出せない物件(仲介手数料の文字列が読めない等)は、そのまとまりごと出さない。
 * 売買は 02 §3-3 に仲介手数料が無いので、このブロック自体を使わない(確認の左列は従来の行のまま)。
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
				['駐車場', p.parking || '—'],
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
		{ title: '更新時', rows: [['更新料', r.renewalFee || '—']] },
	];

	return (
		<div>
			{groups.map((g) => (
				<div key={g.title}>
					<h4 className="pt-3 text-xs text-ink-weak lg:text-xs-pc">{g.title}</h4>
					{/* 見出しは dl の外に置く(dl の中に置けるのは dt / dd / div だけ)。まとまりごとに dl を閉じる */}
					<dl>
						{g.rows.map(([k, v]) => (
							<div key={k} className="grid grid-cols-[6.5em_minmax(0,1fr)] gap-x-2 border-b border-line py-2">
								<dt className="text-small text-ink-weak">{k}</dt>
								<dd className={`text-body leading-[1.5] text-ink lg:text-body-pc ${v === 'なし' ? 'font-bold' : ''}`}>{v}</dd>
							</div>
						))}
					</dl>
				</div>
			))}
			{total && (
				<div>
					<h4 className="pt-3 text-xs text-ink-weak lg:text-xs-pc">入居時の目安合計</h4>
					<dl className="grid grid-cols-[6.5em_minmax(0,1fr)] gap-x-2 border-b border-line py-2">
						<dt className="text-small text-ink-weak">合計</dt>
						<dd className="tabular text-body font-bold text-sumi lg:text-body-pc">
							{total}
							<span className="mt-1 block text-xs font-normal text-ink-weak lg:text-xs-pc">家賃・管理費・敷金・礼金・仲介手数料の合計。保証料・保険料・日割り家賃は含みません</span>
						</dd>
					</dl>
				</div>
			)}
		</div>
	);
}
