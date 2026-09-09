'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { mainOffice } from '@/config/site';
import { footerColumns, lineDummy } from '@/config/nav';

/**
 * スマホ固定CTA(03 §7・J-030)。下部・3ボタン。順序は 電話 / LINE(ダミー)/ 内見予約(右端=親指側)。
 * 青緑は主CTA(内見予約)だけ。電話は墨、LINE は副ボタン(白・墨枠)。
 * 高さは layout の下余白(h-16 = 64px)と合わせる。
 * 物件詳細(/properties/HR-…)では内見予約に物件 ID を引き継ぐ(J-037:/reserve?property=ID)。それ以外は /contact。
 * 成約済み物件(soldNos・layout が index.json から渡す)では内見予約を隠し、電話・LINE の2列(J-038 判断 1)。売買は「見学予約」(判断 3)。
 */
export function FixedCta({ soldNos = [] }: { soldNos?: string[] }) {
	const pathname = usePathname();
	const m = /^\/properties\/([A-Za-z0-9-]+)$/.exec(pathname);
	const contact = footerColumns[4].items[0]; // 内見予約・お問い合わせ
	const reserveHref = m ? `/reserve?property=${encodeURIComponent(m[1])}` : contact.href;
	const sold = !!m && soldNos.includes(m[1]);
	const reserveLabel = m && m[1].startsWith('HR-S-') ? '見学予約' : '内見予約';
	return (
		<div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface lg:hidden">
			<div className={`grid h-16 gap-2 px-2 py-2 ${sold ? 'grid-cols-2' : 'grid-cols-3'}`}>
				<a
					href={`tel:${mainOffice.tel.replace(/-/g, '')}`}
					className="flex flex-col items-center justify-center rounded-hr bg-sumi text-white"
				>
					<span className="text-small font-bold">電話</span>
					<span className="tabular text-xs leading-tight">{mainOffice.tel}</span>
				</a>
				<Link
					href={lineDummy.href}
					className="flex flex-col items-center justify-center rounded-hr border border-sumi bg-surface text-sumi"
				>
					<span className="text-small font-bold">LINE</span>
					<span className="text-xs leading-tight">(ダミー)</span>
				</Link>
				{!sold && (
					<Link
						href={reserveHref}
						className="flex items-center justify-center rounded-hr bg-accent text-small font-bold text-white hover:bg-accent-strong"
					>
						{reserveLabel}
					</Link>
				)}
			</div>
		</div>
	);
}
