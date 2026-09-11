import Link from 'next/link';

/**
 * 詳細ページの CTA(01 §3-3・§3-8。上下2箇所で同じ)。
 * 配置(J-050・J-064):内見予約(売買は「見学を予約する」・青緑)と「この物件を問い合わせる」の2つ。
 *   layout="stack"(既定):全幅で縦に2つ。右カラム(幅が狭い)はこのまま(J-050)
 *   layout="row":スマホは縦、640 以上は左=内見予約 / 右=問い合わせ の2列(J-064。ページ下部の CTA が横に長すぎたため)
 * (J-038 判断 5 の3列 → J-039 で2列 → J-050 で電話を外して2つ → J-064 で下部だけ2列)
 * 電話はヘッダー右上とスマホの固定 CTA(FixedCta)に残すので、詳細ページ本文には置かない。
 * 物件 ID は URL パラメータで引き継ぐ(J-037:/reserve?property=HR-R-0001)。
 * 成約済みは内見予約を出さない(J-038 判断1)。2列でも残る1つが全幅になるだけで崩れない。
 */
export function CtaBlock({
	no,
	type,
	sold = false,
	layout = 'stack',
}: {
	no: string;
	type: 'rental' | 'sale';
	sold?: boolean;
	layout?: 'stack' | 'row';
}) {
	const reserveLabel = type === 'sale' ? '見学を予約する' : '内見を予約する';
	const q = `?property=${encodeURIComponent(no)}`;
	// 2列にするのはボタンが2つある時だけ。成約済み(1つ)は全幅のまま
	const row = layout === 'row' && !sold;
	return (
		<div className={`grid gap-2 ${row ? 'sm:grid-cols-2' : ''}`}>
			{!sold && (
				<Link href={`/reserve${q}`} className="flex h-12 items-center justify-center rounded-hr bg-accent text-body font-bold text-white hover:bg-accent-strong lg:h-11 lg:text-body-pc">
					{reserveLabel}
				</Link>
			)}
			<Link
				href={`/contact${q}`}
				className="flex h-12 items-center justify-center rounded-hr border border-sumi bg-surface px-2 text-center text-body font-medium text-sumi hover:bg-surface-alt lg:h-11 lg:text-body-pc"
			>
				この物件を問い合わせる
			</Link>
		</div>
	);
}
