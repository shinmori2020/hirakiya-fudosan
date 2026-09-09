import Link from 'next/link';
import { company, mainOffice } from '@/config/site';

/**
 * 詳細ページの CTA(01 §3-3・§3-8。上下2箇所で同じ)。
 * 配置(J-039):内見予約(売買は「見学を予約する」・青緑)を全幅で上、下に「問い合わせる」「電話」を2列。
 * (J-038 判断 5 の「3列」を J-039 で変更)
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
			<div className="grid grid-cols-2 gap-2">
				<Link href={`/contact${q}`} className="flex h-12 items-center justify-center rounded-hr border border-sumi bg-surface px-2 text-center text-small font-medium leading-tight text-sumi hover:bg-surface-alt lg:h-11">
					この物件について
					<br />
					問い合わせる
				</Link>
				<a href={`tel:${mainOffice.tel.replace(/-/g, '')}`} className="flex h-12 flex-col items-center justify-center rounded-hr bg-sumi text-white lg:h-11">
					<span className="tabular text-body font-bold leading-tight lg:text-body-pc">{mainOffice.tel}</span>
					<span className="text-xs leading-tight lg:text-xs-pc">
						{company.hours} / {company.closed}定休
					</span>
				</a>
			</div>
		</div>
	);
}
