import Link from 'next/link';
import { mainOffice } from '@/config/site';
import { footerColumns, lineDummy } from '@/config/nav';

/**
 * スマホ固定CTA(03 §7・J-030)。下部・3ボタン。順序は 電話 / LINE(ダミー)/ 内見予約(右端=親指側)。
 * 青緑は主CTA(内見予約)だけ。電話は墨、LINE は副ボタン(白・墨枠)。
 * 高さは layout の main 下余白(pb-20 = 80px)と合わせる。
 */
export function FixedCta() {
	const contact = footerColumns[4].items[0]; // 内見予約・お問い合わせ
	return (
		<div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface lg:hidden">
			<div className="grid h-16 grid-cols-3 gap-2 px-2 py-2">
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
				<Link
					href={contact.href}
					className="flex items-center justify-center rounded-hr bg-accent text-small font-bold text-white hover:bg-accent-strong"
				>
					内見予約
				</Link>
			</div>
		</div>
	);
}
