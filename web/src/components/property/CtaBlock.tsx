import Link from 'next/link';

/**
 * 詳細ページの CTA(01 §3-3・§3-8。上下2箇所で同じ)。
 * 配置(J-050):内見予約(売買は「見学を予約する」・青緑)と「この物件を問い合わせる」の2つを全幅で縦に。
 * (J-038 判断 5 の3列 → J-039 で2列 → J-050 で電話を外して2つ)
 * 電話はヘッダー右上とスマホの固定 CTA(FixedCta)に残すので、詳細ページ本文には置かない。
 * 物件 ID は URL パラメータで引き継ぐ(J-037:/reserve?property=HR-R-0001)。
 * 成約済みは内見予約を出さず、問い合わせと電話だけ(J-038)。
 */
export function CtaBlock({ no, type, sold = false }: { no: string; type: 'rental' | 'sale'; sold?: boolean }) {
	const reserveLabel = type === 'sale' ? '見学を予約する' : '内見を予約する';
	const q = `?property=${encodeURIComponent(no)}`;
	return (
		<div className="grid gap-2">
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
