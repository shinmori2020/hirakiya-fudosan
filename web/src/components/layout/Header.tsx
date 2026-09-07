'use client';

import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { company, mainOffice } from '@/config/site';
import { headerNav } from '@/config/nav';

/**
 * ヘッダー(03 §7 v0.3)。白。ロゴ / メニュー5 / 電話(PC は営業時間付き・スマホは番号のみ J-029)。
 * スマホはロゴ+電話+ハンバーガー。メニューはオーバーレイ(J-030)。スクロール後は高さを詰めて固定。
 * オーバーレイは header の子として absolute で直下に置く(J-031:位置を JS で測ると、注記バーが
 * スクロールで消えた後にズレて隙間が出るため)。開閉は 200ms のトランジション。
 */
export function Header() {
	const [open, setOpen] = useState(false);
	const [compact, setCompact] = useState(false);

	useEffect(() => {
		const onScroll = () => setCompact(window.scrollY > 8);
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	}, []);

	// オーバーレイ表示中は背面をスクロールさせない
	useEffect(() => {
		document.body.style.overflow = open ? 'hidden' : '';
		return () => {
			document.body.style.overflow = '';
		};
	}, [open]);

	return (
		<header className="sticky top-0 z-40 border-b border-line bg-surface">
			<div
				className={`mx-auto flex w-full max-w-(--container-content) items-center justify-between gap-4 px-4 transition-[padding] duration-200 lg:px-8 ${
					compact ? 'py-2' : 'py-3 lg:py-4'
				}`}
			>
				<Link href="/" className="text-h3 font-bold text-sumi lg:text-h2" aria-label={`${company.name} トップ`}>
					{company.shortName}
				</Link>

				<nav aria-label="メイン" className="hidden lg:block">
					<ul className="flex items-center gap-6">
						{headerNav.map((item) => (
							<li key={item.href}>
								<Link href={item.href} className="text-body-pc font-medium text-sumi hover:text-accent-strong">
									{item.label}
								</Link>
							</li>
						))}
					</ul>
				</nav>

				<div className="flex items-center gap-2">
					<a
						href={`tel:${mainOffice.tel.replace(/-/g, '')}`}
						className="flex h-11 flex-col items-center justify-center rounded-hr bg-sumi px-3 text-white lg:px-4"
					>
						<span className="tabular text-small font-bold leading-tight lg:text-body-pc">{mainOffice.tel}</span>
						<span className="hidden text-xs-pc leading-tight lg:block">
							{company.hours} / {company.closed}定休
						</span>
					</a>
					<button
						type="button"
						className="flex h-11 w-11 items-center justify-center rounded-hr border border-line text-sumi lg:hidden"
						aria-expanded={open}
						aria-controls="mobile-menu"
						aria-label={open ? 'メニューを閉じる' : 'メニューを開く'}
						onClick={() => setOpen((v) => !v)}
					>
						{open ? <X aria-hidden="true" size={20} /> : <Menu aria-hidden="true" size={20} />}
					</button>
				</div>
			</div>

			{/* オーバーレイのメニュー(スマホ)。ヘッダー直下(top-full)に密着。閉時は不可視+操作不可 */}
			<div
				id="mobile-menu"
				aria-hidden={!open}
				className={`absolute inset-x-0 top-full z-40 h-dvh bg-sumi/60 transition-[opacity,visibility] duration-200 lg:hidden ${
					open ? 'visible opacity-100' : 'invisible opacity-0'
				}`}
				onClick={() => setOpen(false)}
			>
				<nav
					aria-label="メイン(スマホ)"
					className={`max-h-full overflow-y-auto bg-surface px-4 py-2 shadow-panel transition-transform duration-200 ${
						open ? 'translate-y-0' : '-translate-y-2'
					}`}
					onClick={(e) => e.stopPropagation()}
				>
					<ul>
						{headerNav.map((item) => (
							<li key={item.href} className="border-b border-line last:border-b-0">
								<Link
									href={item.href}
									className="block py-3 font-medium text-sumi"
									tabIndex={open ? 0 : -1}
									onClick={() => setOpen(false)}
								>
									{item.label}
								</Link>
							</li>
						))}
					</ul>
					<p className="py-3 text-small text-ink-weak">
						{company.hours} / {company.closed}定休
					</p>
				</nav>
			</div>
		</header>
	);
}
