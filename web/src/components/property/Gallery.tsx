'use client';

import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { buildSlides, counterLabel, hasArrows, indexFromScroll, nextIndex, prevIndex } from '@/lib/gallery';

/**
 * 写真ギャラリー(01 §3-1 / J-048)。メイン(3:2)+サムネイル行の並びは J-033 のまま。
 * メイン画像を押すとモーダル(<dialog>)が開き、拡大画像・左右矢印・「3 / 6」・サムネイル行・× を出す。
 * ライブラリは足さず、<dialog> と CSS の scroll-snap で作る(J-048・SHIN 採用)。
 * 端では循環しない。間取り図は最後の1枚。写真0枚の物件は間取り図1枚だけで矢印を出さない。
 * スマホ(〜767)ではメイン画像自体も横スワイプできる(PC は overflow を止めて矢印とサムネイルで操作)。
 * 開閉は 200ms / cubic-bezier(0.4, 0, 0.2, 1)(03 §8)。prefers-reduced-motion では無効(globals.css)。
 * プレースホルダー SVG なので next/image は unoptimized。
 */

/**
 * 指定のスライドまでスクロールする。scroll-snap があるので位置は 1枚幅 × 番号。
 * 移動は瞬時(behavior: auto)。滑らかスクロールにすると、その途中位置を onScroll が拾って
 * 矢印・キーの連打が端で詰まる。スワイプ時の動きは端末側の慣性のまま。
 */
function scrollToSlide(el: HTMLDivElement | null, index: number) {
	if (!el) return;
	el.scrollTo({ left: el.clientWidth * index, behavior: 'auto' });
}

export function Gallery({ images, floorplan, title }: { images: string[]; floorplan: string | null; title: string }) {
	const slides = buildSlides(images, floorplan);
	const count = slides.length;
	const [index, setIndex] = useState(0);
	const [open, setOpen] = useState(false);
	const dialogRef = useRef<HTMLDialogElement>(null);
	const mainRef = useRef<HTMLDivElement>(null);
	const modalRef = useRef<HTMLDivElement>(null);
	const current = slides[index];
	const counter = counterLabel(index, count);
	const arrows = hasArrows(count);

	// モーダルを開いている間は背面をスクロールさせない(焦点は dialog が閉じ込める)
	useEffect(() => {
		if (!open) return;
		const prev = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = prev;
		};
	}, [open]);

	// ← → キー。端で矢印ボタンが disabled になるとフォーカスが外れるため、
	// dialog ではなく document で拾う(Esc と焦点の閉じ込めは dialog の既定に任せる)
	useEffect(() => {
		if (!open || !arrows) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
			e.preventDefault();
			const el = modalRef.current;
			const now = el ? indexFromScroll(el.scrollLeft, el.clientWidth, count) : 0;
			const to = e.key === 'ArrowRight' ? nextIndex(now, count) : prevIndex(now, count);
			setIndex(to);
			scrollToSlide(modalRef.current, to);
			scrollToSlide(mainRef.current, to);
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [open, arrows, count]);

	/** 番号を変える。メインとモーダル、両方の位置を合わせる */
	function go(i: number) {
		setIndex(i);
		scrollToSlide(mainRef.current, i);
		scrollToSlide(modalRef.current, i);
	}

	function openModal() {
		const d = dialogRef.current;
		if (!d || !current) return;
		d.showModal();
		scrollToSlide(modalRef.current, index); // 開いた時点の写真に合わせる
		setOpen(true);
	}

	return (
		<div>
			{/* メイン。スマホは横スワイプ(scroll-snap)、PC は 1枚固定 */}
			<div
				ref={mainRef}
				onScroll={(e) => setIndex(indexFromScroll(e.currentTarget.scrollLeft, e.currentTarget.clientWidth, count))}
				className="hr-scroll-x relative flex snap-x snap-mandatory overflow-x-auto rounded-hr border border-line bg-surface-alt lg:overflow-x-hidden"
			>
				{count === 0 ? (
					<div className="flex aspect-[3/2] w-full items-center justify-center text-body text-ink-weak">写真準備中</div>
				) : (
					slides.map((s, i) => (
						<button
							key={s.src}
							type="button"
							onClick={openModal}
							aria-label={`${s.label}を拡大する`}
							className="relative aspect-[3/2] w-full shrink-0 snap-center cursor-zoom-in"
						>
							<Image
								src={s.src}
								alt={`${title} ${s.label}`}
								fill
								sizes="(min-width: 64rem) 720px, 100vw"
								className="object-contain"
								unoptimized
								priority={i === 0}
							/>
						</button>
					))
				)}
				{images.length === 0 && count > 0 && (
					<span className="pointer-events-none absolute top-2 left-2 rounded-hr bg-badge-negotiating-bg px-2 py-0.5 text-xs text-badge-negotiating-fg lg:text-xs-pc">
						写真準備中(間取り図のみ)
					</span>
				)}
			</div>

			{count > 1 && (
				<ul className="hr-scroll-x mt-2 flex gap-2 overflow-x-auto pb-1" aria-label="写真の一覧">
					{slides.map((s, i) => (
						<li key={s.src} className="shrink-0">
							<button
								type="button"
								onClick={() => go(i)}
								aria-pressed={i === index}
								aria-label={s.label}
								className={`relative block h-14 w-21 overflow-hidden rounded-hr border transition-colors duration-150 motion-reduce:transition-none lg:h-16 lg:w-24 ${
									i === index ? 'border-accent' : 'border-line hover:border-sumi'
								}`}
							>
								<Image src={s.src} alt="" fill sizes="96px" className="object-cover" unoptimized />
							</button>
						</li>
					))}
				</ul>
			)}

			{/* 拡大モーダル。背景クリックと Esc で閉じる(Esc は dialog の既定) */}
			<dialog
				ref={dialogRef}
				onClose={() => setOpen(false)}
				onClick={(e) => {
					// 画像そのものと操作ボタン以外(余白・背景)を押したら閉じる
					const t = e.target as HTMLElement;
					if (!t.closest('button') && t.tagName !== 'IMG') dialogRef.current?.close();
				}}
				aria-label={`${title} の写真`}
				className="hr-dialog m-auto max-h-dvh w-dvw max-w-none bg-sumi/95 p-0 text-surface"
			>
				<div className="flex h-dvh w-dvw flex-col gap-2 p-2 lg:gap-3 lg:p-4">
					<div className="flex shrink-0 items-center justify-between">
						<span className="tabular text-small text-surface lg:text-small-pc">{counter}</span>
						<button
							type="button"
							onClick={() => dialogRef.current?.close()}
							aria-label="閉じる"
							className="rounded-hr border border-surface/40 p-2 transition-colors duration-150 hover:bg-surface/15 motion-reduce:transition-none"
						>
							<X size={20} aria-hidden="true" />
						</button>
					</div>

					<div className="relative min-h-0 flex-1">
						<div
							ref={modalRef}
							onScroll={(e) => setIndex(indexFromScroll(e.currentTarget.scrollLeft, e.currentTarget.clientWidth, count))}
							className="hr-scroll-x flex h-full snap-x snap-mandatory overflow-x-auto"
						>
							{slides.map((s) => (
								<div key={s.src} className="relative h-full w-full shrink-0 snap-center">
									<Image
										src={s.src}
										alt={`${title} ${s.label}`}
										fill
										sizes="(min-width: 64rem) 1200px, 100vw"
										className="object-contain"
										unoptimized
									/>
								</div>
							))}
						</div>
						{arrows && (
							<>
								<button
									type="button"
									onClick={() => go(prevIndex(index, count))}
									disabled={index === 0}
									aria-label="前の写真"
									className="absolute top-1/2 left-1 -translate-y-1/2 rounded-hr border border-surface/40 bg-sumi/70 p-2 transition-colors duration-150 hover:bg-sumi disabled:opacity-30 motion-reduce:transition-none lg:left-3"
								>
									<ChevronLeft size={24} aria-hidden="true" />
								</button>
								<button
									type="button"
									onClick={() => go(nextIndex(index, count))}
									disabled={index === count - 1}
									aria-label="次の写真"
									className="absolute top-1/2 right-1 -translate-y-1/2 rounded-hr border border-surface/40 bg-sumi/70 p-2 transition-colors duration-150 hover:bg-sumi disabled:opacity-30 motion-reduce:transition-none lg:right-3"
								>
									<ChevronRight size={24} aria-hidden="true" />
								</button>
							</>
						)}
					</div>

					{count > 1 && (
						<ul className="hr-scroll-x flex shrink-0 justify-start gap-2 overflow-x-auto lg:justify-center" aria-label="写真の一覧(拡大)">
							{slides.map((s, i) => (
								<li key={s.src} className="shrink-0">
									<button
										type="button"
										onClick={() => go(i)}
										aria-pressed={i === index}
										aria-label={s.label}
										className={`relative block h-12 w-18 overflow-hidden rounded-hr border transition-colors duration-150 motion-reduce:transition-none lg:h-14 lg:w-21 ${
											i === index ? 'border-accent' : 'border-surface/40 hover:border-surface'
										}`}
									>
										<Image src={s.src} alt="" fill sizes="84px" className="object-cover" unoptimized />
									</button>
								</li>
							))}
						</ul>
					)}
				</div>
			</dialog>
		</div>
	);
}
