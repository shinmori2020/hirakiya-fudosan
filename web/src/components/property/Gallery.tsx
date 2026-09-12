'use client';

import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import {
	buildSlides,
	counterLabel,
	hasArrows,
	indexFromScroll,
	isInsideContained,
	nextIndex,
	prevIndex,
	type Slide,
} from '@/lib/gallery';

/**
 * 写真ギャラリー(01 §3-1 / J-048・J-049)。メイン(3:2)+サムネイル行の並びは J-033 のまま。
 * メイン画像を押すとモーダル(<dialog>)が開き、拡大画像・左右矢印・「3 / 6」・サムネイル行・× を出す。
 * ライブラリは足さず、<dialog> と CSS で作る(J-048・SHIN 採用)。
 *
 * 送りの仕組みは PC とスマホで分かれる(J-049):
 * - PC(lg 以上):矢印・← →・サムネイルで transform のスライド。次へ = 右から入り左へ抜ける、
 *   前へ = 左から入り右へ抜ける。200ms。端でも同じ向きのまま 6 → 1 / 1 → 6 と巡回する(複製は使わない)
 * - スマホ(〜767):メイン画像もモーダルも scroll-snap の横スワイプ(慣性は端末のまま)。端では止まる
 * 表示中の番号は状態(index)で持ち、スクロール位置からは読み直さない(J-048 の連打の詰まり対策)。
 * 開閉は 200ms / cubic-bezier(0.4, 0, 0.2, 1)(03 §8)。prefers-reduced-motion では無効(globals.css)。
 * 写真0枚の物件(3件)はメインに写真を出さず「写真準備中」と出す。押すとモーダルが開き、間取り図1枚だけを出す(J-049)。
 * J-067:モーダルの矢印・閉じる(×)はカーソルを pointer にし、select-none も揃える。
 *   メイン画像は cursor-zoom-in(拡大を開くため)、サムネイルは cursor-pointer のまま。
 * F-008:サムネイルとメイン画像のボタンは select-none。矢印の連打やダブルクリックでテキスト選択が走ると、
 *   選択ハイライト(青)がサムネイルの画像の上に乗るため。フォーカスの表示(:focus-visible)には触らない。
 * プレースホルダー SVG なので next/image は unoptimized。
 */

/** 送りのアニメーション時間(ms)。03 §8 の開閉と同じ */
const SLIDE_MS = 200;

/** スワイプ用トラックを指定のスライドまで動かす(瞬時)。非表示(幅0)の時は何もしない */
function scrollToSlide(el: HTMLDivElement | null, index: number) {
	if (!el || el.clientWidth === 0) return;
	el.scrollTo({ left: el.clientWidth * index, behavior: 'auto' });
}

type Anim = { from: number; dir: 1 | -1 };

/** PC の送り。今の1枚と、送り中だけ出る前の1枚を重ねて transform で動かす(複製は持たない) */
function SlideStage({
	slides,
	index,
	anim,
	title,
	sizes,
	priority = false,
}: {
	slides: Slide[];
	index: number;
	anim: Anim | null;
	title: string;
	sizes: string;
	priority?: boolean;
}) {
	const current = slides[index];
	const outgoing = anim ? slides[anim.from] : null;
	if (!current) return null;
	return (
		<>
			{outgoing && anim && (
				<div
					key={`out-${anim.from}`}
					className={`absolute inset-0 ${anim.dir === 1 ? 'hr-slide-out-left' : 'hr-slide-out-right'}`}
					aria-hidden="true"
				>
					<Image src={outgoing.src} alt="" fill sizes={sizes} className="object-contain" unoptimized />
				</div>
			)}
			<div
				key={`in-${index}`}
				className={`absolute inset-0 ${anim ? (anim.dir === 1 ? 'hr-slide-in-right' : 'hr-slide-in-left') : ''}`}
			>
				<Image
					src={current.src}
					alt={`${title} ${current.label}`}
					fill
					sizes={sizes}
					className="object-contain"
					unoptimized
					priority={priority && index === 0}
				/>
			</div>
		</>
	);
}

/** 写真0枚の物件のメイン。写真の代わりに「写真準備中」、押すと間取り図をモーダルで出す(J-049) */
function PhotolessMain({ onClick }: { onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label="間取り図を拡大する"
			className="flex aspect-[3/2] w-full shrink-0 cursor-zoom-in flex-col items-center justify-center gap-1 text-ink-weak"
		>
			<span className="text-body lg:text-body-pc">写真準備中</span>
			<span className="text-small lg:text-small-pc">間取り図を見る</span>
		</button>
	);
}

/**
 * サムネイル行。ページ側(白地)とモーダル側(暗地)で寸法と枠色だけ変える。
 * J-066:選択中は青緑の太枠(2px)。選択していない枠も同じ 2px(色だけ変える)にして、
 * 選び直しても画像の大きさが動かないようにする。
 * ホバー中のサムネイルは不透明度を下げて「押せる・今どれを指しているか」を見せる(150ms・03 §8 のイージング)。
 * 選択中のサムネイルはホバーしても変化させない(押しても表示が変わらないため)。
 * モーダルは地色が濃い(墨95%)ので、不透明度を下げると地に沈んで暗くなる。
 * 同じ「薄くなる」見え方にするため、モーダル側は明度を上げる(brightness)で薄くする。
 */
function Thumbs({
	slides,
	index,
	variant,
	onSelect,
}: {
	slides: Slide[];
	index: number;
	variant: 'page' | 'modal';
	onSelect: (i: number, dir: 1 | -1) => void;
}) {
	return (
		<ul
			className={`hr-scroll-x flex shrink-0 gap-2 overflow-x-auto ${variant === 'page' ? 'mt-2 pb-1' : 'lg:justify-center'}`}
			aria-label={variant === 'page' ? '写真の一覧' : '写真の一覧(拡大)'}
		>
			{slides.map((s, i) => (
				<li key={s.src} className="shrink-0">
					<button
						type="button"
						onClick={() => onSelect(i, i > index ? 1 : -1)}
						aria-pressed={i === index}
						aria-label={s.label}
						className={`group relative block cursor-pointer overflow-hidden rounded-hr border-2 transition-colors duration-150 select-none motion-reduce:transition-none ${
							variant === 'page' ? 'h-14 w-21 lg:h-16 lg:w-24' : 'h-12 w-18 lg:h-14 lg:w-21'
						} ${
							i === index ? 'border-accent' : variant === 'page' ? 'border-line hover:border-accent' : 'border-surface/40 hover:border-surface'
						}`}
					>
						<Image
							src={s.src}
							alt=""
							fill
							sizes="96px"
							className={`object-cover transition-[opacity,filter] duration-150 motion-reduce:transition-none ${
								i === index ? '' : variant === 'page' ? 'group-hover:opacity-60' : 'group-hover:brightness-150'
							}`}
							unoptimized
						/>
					</button>
				</li>
			))}
		</ul>
	);
}

export function Gallery({ images, floorplan, title }: { images: string[]; floorplan: string | null; title: string }) {
	const slides = buildSlides(images, floorplan);
	const count = slides.length;
	const [index, setIndex] = useState(0);
	const [anim, setAnim] = useState<Anim | null>(null);
	const [open, setOpen] = useState(false);
	const dialogRef = useRef<HTMLDialogElement>(null);
	const mainRef = useRef<HTMLDivElement>(null);
	const modalRef = useRef<HTMLDivElement>(null);
	const timerRef = useRef<number | null>(null);
	const counter = counterLabel(index, count);
	const arrows = hasArrows(count);
	/** 写真0枚・間取り図だけの物件。メインには間取り図を出さず「写真準備中」と出す(J-049) */
	const photoless = images.length === 0 && count > 0;

	useEffect(() => {
		return () => {
			if (timerRef.current !== null) window.clearTimeout(timerRef.current);
		};
	}, []);

	// モーダルを開いている間は背面をスクロールさせない(焦点は dialog が閉じ込める)
	useEffect(() => {
		if (!open) return;
		const prev = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = prev;
		};
	}, [open]);

	/** 番号を変える。dir は PC のスライドの向き(1 = 右から入る / -1 = 左から入る) */
	function go(i: number, dir: 1 | -1) {
		if (i === index) return;
		setIndex(i);
		setAnim({ from: index, dir });
		if (timerRef.current !== null) window.clearTimeout(timerRef.current);
		timerRef.current = window.setTimeout(() => setAnim(null), SLIDE_MS);
		scrollToSlide(mainRef.current, i);
		scrollToSlide(modalRef.current, i);
	}

	// ← → キー。端で矢印にフォーカスが無い場合もあるので document で拾う
	// (Esc と焦点の閉じ込めは dialog の既定に任せる)
	useEffect(() => {
		if (!open || !arrows) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
			e.preventDefault();
			if (e.key === 'ArrowRight') go(nextIndex(index, count), 1);
			else go(prevIndex(index, count), -1);
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, arrows, count, index]);

	function openModal() {
		const d = dialogRef.current;
		if (!d || count === 0) return;
		d.showModal();
		scrollToSlide(modalRef.current, index); // 開いた時点の写真に合わせる(スマホのトラック)
		setOpen(true);
	}

	/** 絵の外(背景・余白)を押したら閉じる。操作ボタンと絵の上は閉じない(F-007) */
	function onDialogClick(e: React.MouseEvent<HTMLDialogElement>) {
		const t = e.target as HTMLElement;
		if (t.closest('button')) return;
		if (t.tagName === 'IMG') {
			const img = t as HTMLImageElement;
			const r = img.getBoundingClientRect();
			if (isInsideContained(e.clientX - r.left, e.clientY - r.top, r.width, r.height, img.naturalWidth, img.naturalHeight))
				return;
		}
		dialogRef.current?.close();
	}

	/** スワイプ(スマホ)の着地位置から番号を取り直す。アニメーションは付けない */
	function onTrackScroll(e: React.UIEvent<HTMLDivElement>) {
		const el = e.currentTarget;
		if (el.clientWidth === 0) return; // PC では非表示なので無視する
		setIndex(indexFromScroll(el.scrollLeft, el.clientWidth, count));
	}

	return (
		<div>
			<div className="relative">
				{/* スマホ:メイン画像を横スワイプ(タップでモーダル) */}
				<div
					ref={mainRef}
					onScroll={onTrackScroll}
					className="hr-scroll-x flex snap-x snap-mandatory overflow-x-auto rounded-hr border border-line bg-surface-alt lg:hidden"
				>
					{count === 0 ? (
						<div className="flex aspect-[3/2] w-full items-center justify-center text-body text-ink-weak">写真準備中</div>
					) : photoless ? (
						<PhotolessMain onClick={openModal} />
					) : (
						slides.map((s, i) => (
							<button
								key={s.src}
								type="button"
								onClick={openModal}
								aria-label={`${s.label}を拡大する`}
								className="relative aspect-[3/2] w-full shrink-0 snap-center cursor-zoom-in select-none"
							>
								<Image
									src={s.src}
									alt={`${title} ${s.label}`}
									fill
									sizes="100vw"
									className="object-contain"
									unoptimized
									priority={i === 0}
								/>
							</button>
						))
					)}
				</div>

				{/* PC:transform のスライド */}
				<div className="hidden overflow-hidden rounded-hr border border-line bg-surface-alt lg:block">
					{count === 0 ? (
						<div className="flex aspect-[3/2] w-full items-center justify-center text-body text-ink-weak">写真準備中</div>
					) : photoless ? (
						<PhotolessMain onClick={openModal} />
					) : (
						<button
							type="button"
							onClick={openModal}
							aria-label={`${slides[index]?.label ?? '写真'}を拡大する`}
							className="relative block aspect-[3/2] w-full cursor-zoom-in select-none"
						>
							<SlideStage slides={slides} index={index} anim={anim} title={title} sizes="720px" priority />
						</button>
					)}
				</div>

			</div>

			{count > 1 && <Thumbs slides={slides} index={index} variant="page" onSelect={go} />}

			{/* 拡大モーダル。背景クリックと Esc で閉じる(Esc は dialog の既定) */}
			<dialog
				ref={dialogRef}
				onClose={() => setOpen(false)}
				onClick={onDialogClick}
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
							className="cursor-pointer rounded-hr border border-surface/40 p-2 transition-colors duration-150 select-none hover:bg-surface/15 motion-reduce:transition-none"
						>
							<X size={20} aria-hidden="true" />
						</button>
					</div>

					<div className="relative min-h-0 flex-1 overflow-hidden">
						{/* スマホ:スワイプ */}
						<div
							ref={modalRef}
							onScroll={onTrackScroll}
							className="hr-scroll-x flex h-full snap-x snap-mandatory overflow-x-auto lg:hidden"
						>
							{slides.map((s) => (
								<div key={s.src} className="relative h-full w-full shrink-0 snap-center">
									<Image src={s.src} alt={`${title} ${s.label}`} fill sizes="100vw" className="object-contain" unoptimized />
								</div>
							))}
						</div>
						{/* PC:transform のスライド */}
						<div className="relative hidden h-full lg:block">
							<SlideStage slides={slides} index={index} anim={anim} title={title} sizes="1200px" />
						</div>
						{arrows && (
							<>
								<button
									type="button"
									onClick={() => go(prevIndex(index, count), -1)}
									aria-label="前の写真"
									className="absolute top-1/2 left-1 -translate-y-1/2 cursor-pointer rounded-hr border border-surface/40 bg-sumi/70 p-2 transition-colors duration-150 select-none hover:bg-sumi motion-reduce:transition-none lg:left-3"
								>
									<ChevronLeft size={24} aria-hidden="true" />
								</button>
								<button
									type="button"
									onClick={() => go(nextIndex(index, count), 1)}
									aria-label="次の写真"
									className="absolute top-1/2 right-1 -translate-y-1/2 cursor-pointer rounded-hr border border-surface/40 bg-sumi/70 p-2 transition-colors duration-150 select-none hover:bg-sumi motion-reduce:transition-none lg:right-3"
								>
									<ChevronRight size={24} aria-hidden="true" />
								</button>
							</>
						)}
					</div>

					{count > 1 && <Thumbs slides={slides} index={index} variant="modal" onSelect={go} />}
				</div>
			</dialog>
		</div>
	);
}
