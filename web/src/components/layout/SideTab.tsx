'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { footerArrows } from '@/config/nav';
import { showsSideTab } from '@/lib/side-tab';

/**
 * PC 右端に固定の縦タブ「物件を探す」(J-027)。墨背景・白文字(J-029)。PC のみ。
 * **探す画面では自分自身への導線になるので出さない**(J-033 項目11)。
 * **トップも出さない**(FV の帯に検索があり、同じ入口が並ぶため・J-151)。
 * 対象のパスは lib/side-tab.ts に1か所でまとめている(一覧・詳細・入口3ページ・条件固定38ページ・トップ)。
 */
export function SideTab() {
	const pathname = usePathname();
	if (!showsSideTab(pathname)) return null;
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
