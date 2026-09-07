import Link from 'next/link';
import { footerArrows } from '@/config/nav';

/**
 * PC 右端に固定の縦タブ「物件を探す」(J-027)。PC のみ。
 * 色は 03 に無いので仮に墨(電話ボタンと同系)。青緑は検索ボタン・主CTA限定のため使っていない。
 */
export function SideTab() {
	const search = footerArrows[0];
	return (
		<Link
			href={search.href}
			className="fixed top-1/2 right-0 z-30 hidden -translate-y-1/2 rounded-l-[6px] bg-sumi px-2 py-4 text-small font-bold text-white [writing-mode:vertical-rl] hover:bg-accent-strong lg:block"
		>
			{search.label}
		</Link>
	);
}
