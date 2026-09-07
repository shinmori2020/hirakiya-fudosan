'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { company, mainOffice } from '@/config/site';
import { headerNav } from '@/config/nav';

/**
 * ヘッダー(03 §7 v0.2)。白。ロゴ / メニュー5 / 電話(PC は営業時間付き・スマホは番号のみ J-029)。
 * スマホはロゴ+電話+ハンバーガー。メニューはオーバーレイ(J-030)。スクロール後は高さを詰めて固定。
 */
export function Header() {
	const [open, setOpen] = useState(false);
	const [compact, setCompact] = useState(false);
	const barRef = useRef<HTMLDivElement>(null);
	const [barHeight, setBarHeight] = useState(0);

	// オーバーレイをヘッダーの下端から始めるため、ヘッダーの高さを測る
	useEffect(() => {
		const el = barRef.current;
		if (!el) return;
		const measure = () => setBarHeight(el.getBoundingClientRect().bottom);
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => ro.disconnect();
	}, [compact]);

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
				ref={barRef}
				className={`mx-auto flex w-full max-w-(--container-content) items-center justify-between gap-4 px-4 transition-[padding] lg:px-8 ${
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
						className="flex h-11 w-11 flex-col items-center justify-center gap-1 rounded-hr border border-line lg:hidden"
						aria-expanded={open}
						aria-controls="mobile-menu"
						aria-label={open ? 'メニューを閉じる' : 'メニューを開く'}
						onClick={() => setOpen((v) => !v)}
					>
						<span className="block h-0.5 w-5 bg-sumi" />
						<span className="block h-0.5 w-5 bg-sumi" />
						<span className="block h-0.5 w-5 bg-sumi" />
					</button>
				</div>
			</div>

			{/* オーバーレイのメニュー(スマホ) */}
			<div
				id="mobile-menu"
				hidden={!open}
				className="fixed inset-x-0 bottom-0 z-40 bg-sumi/60 lg:hidden"
				style={{ top: barHeight }}
				onClick={() => setOpen(false)}
			>
				<nav
					aria-label="メイン(スマホ)"
					className="max-h-full overflow-y-auto bg-surface px-4 py-2 shadow-panel"
					onClick={(e) => e.stopPropagation()}
				>
					<ul>
						{headerNav.map((item) => (
							<li key={item.href} className="border-b border-line last:border-b-0">
								<Link href={item.href} className="block py-3 font-medium text-sumi" onClick={() => setOpen(false)}>
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
