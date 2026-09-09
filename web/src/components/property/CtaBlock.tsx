import Link from 'next/link';
import { company, mainOffice } from '@/config/site';

/**
 * 詳細ページの CTA(01 §3-3・§3-8。上下2箇所で同じ)。これは初案。
 * 内見予約(主・青緑)/ この物件について問い合わせる(副)/ 電話(墨・営業時間付き)。
 * 物件 ID は URL パラメータで引き継ぐ(J-037:/reserve?property=HR-R-0001)。
 * 成約済みは内見予約を出さず、問い合わせと電話だけ(J-038)。売買は「見学を予約する」(J-038 判断 3)。
 */
export function CtaBlock({ no, type, sold = false }: { no: string; type: 'rental' | 'sale'; sold?: boolean }) {
	const reserveLabel = type === 'sale' ? '見学を予約する' : '内見を予約する'; // J-038 判断 3
	const q = `?property=${encodeURIComponent(no)}`;
	return (
		<div className="grid gap-2 sm:grid-cols-3">
			{!sold && (
				<Link href={`/reserve${q}`} className="flex h-12 items-center justify-center rounded-hr bg-accent text-body font-bold text-white hover:bg-accent-strong lg:h-11 lg:text-body-pc">
					{reserveLabel}
				</Link>
			)}
			<Link href={`/contact${q}`} className="flex h-12 items-center justify-center rounded-hr border border-sumi bg-surface text-body font-medium text-sumi hover:bg-surface-alt lg:h-11 lg:text-body-pc">
				この物件について問い合わせる
			</Link>
			<a href={`tel:${mainOffice.tel.replace(/-/g, '')}`} className="flex h-12 flex-col items-center justify-center rounded-hr bg-sumi text-white lg:h-11">
				<span className="tabular text-body font-bold leading-tight lg:text-body-pc">{mainOffice.tel}</span>
				<span className="text-xs leading-tight lg:text-xs-pc">
					{company.hours} / {company.closed}定休
				</span>
			</a>
		</div>
	);
}
