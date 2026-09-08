'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { footerArrows } from '@/config/nav';

/**
 * PC 右端に固定の縦タブ「物件を探す」(J-027)。墨背景・白文字(J-029)。PC のみ。
 * 一覧ページ(/properties 配下)では自分自身への導線なので出さない(J-033)。
 */
export function SideTab() {
	const pathname = usePathname();
	if (pathname.startsWith('/properties')) return null;
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
