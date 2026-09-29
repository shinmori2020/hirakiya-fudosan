'use client';

import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { shouldAutoAdvance, type Interaction } from '@/lib/voice-autoplay';

/** 自動送り(J-162・お客様の声だけ)。止めている状態は呼び出し側が持つ(モーダルの開閉と合わせるため) */
export interface CarouselAutoplay {
	/** 送る間隔(ms) */
	ms: number;
	/** 触った後・停止ボタン・reduced-motion の初期値で止めている */
	stopped: boolean;
	/** 外から止める(モーダルを開いている間) */
	hold: boolean;
	/** 矢印・スワイプ・停止 / 再生 が使われた */
	onInteract: (kind: Interaction) => void;
}

/**
 * カルーセル(J-064 → J-065 → **J-128 で中身を差し替えられる形にした** → J-162 で右端まで伸ばす形と自動送りを足した)。
 * 物件カード(最近見た物件)と声のカードが同じ作りだったので、送りの仕組みだけをここに置く。
 * **中身は呼び出し側が `render` で描く**(この部品はデータの形を知らない)。
 *
 * 送りの規則は J-064 / J-065 のまま:
 *  - md(768)以上:矢印で transform のスライド。**1件ずつ**送る(次へ = 右から1枚入って左へ1枚抜ける)。200ms・03 §8 のイージング
 *  - 端はループする。**矢印に disabled を入れない**(J-049 で端の disabled がフォーカスを奪った経緯)
 *  - スマホ(〜767):scroll-snap の横スワイプ(1枚強が見える幅)
 *  - 件数が1画面の枚数以下なら矢印を出さない
 * 仕組み:表示枚数+1枚だけを並べ、1枚分ずらしてから並びを回して位置を戻す(複製は持たない)。
 *
 * **bleed(J-162・お客様の声だけ)**:列の左端は見出しに揃えたまま、右側を画面の右端まで伸ばす(次のカードが途中まで見える)。
 * md 以上は表示枚数+2枚を並べ、外枠の右の余白を負にして画面の右端まで広げる。カードの幅は今のまま(コンテナの幅 / 枚数)にするため、
 * 列の幅は `100cqw`(この部品の幅)から決める。〜767 はスワイプの列をコンテナの余白ぶん右へ伸ばす。
 * はみ出した分でページ全体が横にスクロールしないよう、置く側の section に `overflow-x: clip` を付ける。
 *
 * **autoplay(J-162・03 §8 の例外)**:止まる条件(マウス・フォーカス・モーダル・見えていない)と、触った後に止める決め方は
 * `lib/voice-autoplay.ts`。J-147 の自動送り(J-149 で消した)の止め方を流用した。矢印の横に停止 / 再生のボタンを出す。
 * 読み上げで毎回知らせない(aria-live を付けない)。
 */
export function Carousel<T>({
	items,
	getKey,
	render,
	label,
	heading,
	extra,
	perView = { md: 2, lg: 4 },
	mobileWidth = '85%',
	bleed = false,
	autoplay,
}: {
	items: readonly T[];
	getKey: (item: T) => string;
	render: (item: T) => ReactNode;
	/** 見出しが無い時に領域へ付ける名前(読み上げ用) */
	label?: string;
	/** 見出し(左)。h2 を渡す */
	heading?: ReactNode;
	/** 見出しの右に添えるもの(「すべて見る」等)。矢印はこれより右に出る */
	extra?: ReactNode;
	/** 1画面の枚数。〜767 はスワイプなので使わない */
	perView?: { md: number; lg: number };
	/** スマホで1枚が占める幅 */
	mobileWidth?: string;
	/** 右側を画面の右端まで伸ばす(J-162) */
	bleed?: boolean;
	/** 自動送り(J-162) */
	autoplay?: CarouselAutoplay;
}) {
	/** 1画面の枚数。0 = スマホ(スワイプ)。幅で切り替える */
	const [per, setPer] = useState(0);
	/** 左端に出ている要素の位置(1件ずつ動く。幅が変わっても保つ・J-065) */
	const [start, setStart] = useState(0);
	/** 送り中の状態。running = false の1フレームだけ初期位置を置き、次のフレームで動かす */
	const [slide, setSlide] = useState<{ dir: 1 | -1; running: boolean } | null>(null);
	const timer = useRef<number | null>(null);
	/** 自動送りを止める条件(マウス・フォーカス・見えていない)。モーダルと「触った後」は autoplay が持つ */
	const [hovering, setHovering] = useState(false);
	const [focusWithin, setFocusWithin] = useState(false);
	const [hidden, setHidden] = useState(false);
	/** スマホのスワイプの列(自動送りでは scrollTo で1枚ずつ送る) */
	const listRef = useRef<HTMLUListElement>(null);
	/** スワイプの判定:触り始めの位置。横に 10px 以上動いたらスワイプとみなす(タップや縦のスクロールでは止めない) */
	const touch = useRef<{ x: number; y: number; done: boolean } | null>(null);
	/** interval から最新の送りを呼ぶための参照(描画中には触らず effect で更新する) */
	const advanceRef = useRef<() => void>(() => {});

	useEffect(() => {
		return () => {
			if (timer.current !== null) window.clearTimeout(timer.current);
		};
	}, []);

	useEffect(() => {
		const wide = window.matchMedia('(min-width: 64rem)');
		const mid = window.matchMedia('(min-width: 48rem)');
		const apply = () => setPer(wide.matches ? perView.lg : mid.matches ? perView.md : 0);
		apply();
		wide.addEventListener('change', apply);
		mid.addEventListener('change', apply);
		return () => {
			wide.removeEventListener('change', apply);
			mid.removeEventListener('change', apply);
		};
	}, [perView.lg, perView.md]);

	const hasAutoplay = !!autoplay;
	useEffect(() => {
		if (!hasAutoplay) return;
		const onVis = () => setHidden(document.visibilityState === 'hidden');
		document.addEventListener('visibilitychange', onVis);
		return () => document.removeEventListener('visibilitychange', onVis);
	}, [hasAutoplay]);

	const advancing = autoplay
		? shouldAutoAdvance({ stopped: autoplay.stopped, hovering, focusWithin, modalOpen: autoplay.hold, hidden })
		: false;
	const ms = autoplay?.ms ?? 0;
	useEffect(() => {
		if (!advancing) return;
		const id = window.setInterval(() => advanceRef.current(), ms);
		return () => window.clearInterval(id);
	}, [advancing, ms]);

	const paged = per > 0;
	const arrows = paged && items.length > per;
	const wrap = (i: number) => ((i % items.length) + items.length) % items.length;

	function go(dir: 1 | -1) {
		if (slide) return; // 送り中の多重クリックは無視する
		setSlide({ dir, running: false });
		requestAnimationFrame(() => requestAnimationFrame(() => setSlide({ dir, running: true })));
		if (timer.current !== null) window.clearTimeout(timer.current);
		timer.current = window.setTimeout(() => {
			setStart((s) => wrap(s + dir));
			setSlide(null);
		}, 200);
	}

	/** スマホ:スワイプの列を1枚ぶん送る。最後まで行ったら最初に戻す */
	function scrollStep() {
		const ul = listRef.current;
		const first = ul?.firstElementChild as HTMLElement | null;
		if (!ul || !first) return;
		const gap = parseFloat(getComputedStyle(ul).columnGap) || 0;
		const max = ul.scrollWidth - ul.clientWidth;
		const next = ul.scrollLeft >= max - 2 ? 0 : Math.min(ul.scrollLeft + first.getBoundingClientRect().width + gap, max);
		ul.scrollTo({ left: next, behavior: 'smooth' });
	}

	useEffect(() => {
		advanceRef.current = () => (per > 0 ? go(1) : scrollStep());
	});

	if (items.length === 0) return null;

	const base = slide?.dir === -1 ? wrap(start - 1) : start;
	const extraShown = bleed ? 2 : 1;
	const windowSize = Math.min(items.length, arrows ? per + extraShown : per);
	const shown = arrows ? Array.from({ length: windowSize }, (_, i) => items[wrap(base + i)]) : items;
	const step = per > 0 ? 100 / per : 0;
	const offset = slide ? (slide.dir === 1 ? (slide.running ? -step : 0) : slide.running ? 0 : -step) : 0;

	const ARROW =
		'flex size-9 cursor-pointer items-center justify-center rounded-hr border border-line bg-surface text-sumi transition-colors duration-150 hover:bg-badge-new-bg motion-reduce:transition-none';

	return (
		<div
			aria-label={heading ? undefined : label}
			className={bleed ? '@container' : undefined}
			onPointerEnter={autoplay ? (e) => { if (e.pointerType === 'mouse') setHovering(true); } : undefined}
			onPointerLeave={autoplay ? (e) => { if (e.pointerType === 'mouse') setHovering(false); } : undefined}
			onFocus={autoplay ? () => setFocusWithin(true) : undefined}
			onBlur={autoplay ? (e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusWithin(false); } : undefined}
		>
			{(heading || extra || arrows || autoplay) && (
				<div className="flex items-center justify-between gap-4">
					{heading}
					<div className="flex items-center gap-3">
						{extra}
						{(arrows || autoplay) && (
							<div className="flex gap-2">
								{arrows && (
									<>
										<button type="button" onClick={() => { autoplay?.onInteract('arrow'); go(-1); }} aria-label="前へ" className={ARROW}>
											<ChevronLeft size={20} aria-hidden="true" />
										</button>
										<button type="button" onClick={() => { autoplay?.onInteract('arrow'); go(1); }} aria-label="次へ" className={ARROW}>
											<ChevronRight size={20} aria-hidden="true" />
										</button>
									</>
								)}
								{autoplay && (
									// 停止 / 再生(J-162)。5秒以上自動で動くものには止める手段を置く。スマホ(矢印なし)でも出す
									<button
										type="button"
										onClick={() => autoplay.onInteract(autoplay.stopped ? 'play' : 'pause')}
										aria-label={autoplay.stopped ? '自動送りを再開する' : '自動送りを止める'}
										className={ARROW}
									>
										{autoplay.stopped ? <Play size={20} aria-hidden="true" /> : <Pause size={20} aria-hidden="true" />}
									</button>
								)}
							</div>
						)}
					</div>
				</div>
			)}

			{paged ? (
				// md 以上:1件ずつ transform でスライド(200ms・03 §8 のイージング)。bleed は右の余白を負にして画面の右端まで広げる
				<div className="-mx-1.5 mt-6 overflow-hidden lg:-mx-2" style={bleed ? { marginRight: 'calc((100% - 100vw) / 2)' } : undefined}>
					<ul
						className={`flex ${bleed ? 'w-[calc(100cqw+0.75rem)] lg:w-[calc(100cqw+1rem)]' : ''} ${slide?.running ? 'transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none' : ''}`}
						style={{ transform: `translateX(${offset}%)` }}
					>
						{shown.map((item) => (
							<li key={getKey(item)} className="shrink-0 px-1.5 lg:px-2" style={{ width: `${step}%` }}>
								{render(item)}
							</li>
						))}
					</ul>
				</div>
			) : (
				// スマホ:scroll-snap の横スワイプ。bleed はコンテナの余白ぶん(16px)右へ伸ばす。横にスワイプしたら自動送りを止める
				<ul
					ref={listRef}
					onTouchStart={autoplay ? (e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, done: false }; } : undefined}
					onTouchMove={
						autoplay
							? (e) => {
									const t = touch.current;
									if (!t || t.done) return;
									const dx = Math.abs(e.touches[0].clientX - t.x);
									const dy = Math.abs(e.touches[0].clientY - t.y);
									if (dx > 10 && dx > dy) {
										t.done = true;
										autoplay.onInteract('swipe');
									}
								}
							: undefined
					}
					className={`hr-scroll-x mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 ${bleed ? '-mr-4' : ''}`}
				>
					{items.map((item) => (
						<li key={getKey(item)} className="shrink-0 snap-start" style={{ width: mobileWidth }}>
							{render(item)}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
