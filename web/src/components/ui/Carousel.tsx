'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * カルーセル(J-064 → J-065 → **J-128 で中身を差し替えられる形にした**)。
 * 物件カード(最近見た物件)と声のカードが同じ作りだったので、送りの仕組みだけをここに置く。
 * **中身は呼び出し側が `render` で描く**(この部品はデータの形を知らない)。
 *
 * 送りの規則は J-064 / J-065 のまま:
 *  - md(768)以上:矢印で transform のスライド。**1件ずつ**送る(次へ = 右から1枚入って左へ1枚抜ける)。200ms・03 §8 のイージング
 *  - 端はループする。**矢印に disabled を入れない**(J-049 で端の disabled がフォーカスを奪った経緯)
 *  - スマホ(〜767):scroll-snap の横スワイプ(1枚強が見える幅)
 *  - 件数が1画面の枚数以下なら矢印を出さない
 * 仕組み:表示枚数+1枚だけを並べ、1枚分ずらしてから並びを回して位置を戻す(複製は持たない)。
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
}) {
	/** 1画面の枚数。0 = スマホ(スワイプ)。幅で切り替える */
	const [per, setPer] = useState(0);
	/** 左端に出ている要素の位置(1件ずつ動く。幅が変わっても保つ・J-065) */
	const [start, setStart] = useState(0);
	/** 送り中の状態。running = false の1フレームだけ初期位置を置き、次のフレームで動かす */
	const [slide, setSlide] = useState<{ dir: 1 | -1; running: boolean } | null>(null);
	const timer = useRef<number | null>(null);

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

	if (items.length === 0) return null;

	const paged = per > 0;
	const arrows = paged && items.length > per;
	const wrap = (i: number) => ((i % items.length) + items.length) % items.length;
	const base = slide?.dir === -1 ? wrap(start - 1) : start;
	const windowSize = Math.min(items.length, arrows ? per + 1 : per);
	const shown = arrows ? Array.from({ length: windowSize }, (_, i) => items[wrap(base + i)]) : items;
	const step = per > 0 ? 100 / per : 0;
	const offset = slide ? (slide.dir === 1 ? (slide.running ? -step : 0) : slide.running ? 0 : -step) : 0;

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

	const ARROW =
		'flex size-9 cursor-pointer items-center justify-center rounded-hr border border-line bg-surface text-sumi transition-colors duration-150 hover:bg-badge-new-bg motion-reduce:transition-none';

	return (
		<div aria-label={heading ? undefined : label}>
			{(heading || extra || arrows) && (
				<div className="flex items-center justify-between gap-4">
					{heading}
					<div className="flex items-center gap-3">
						{extra}
						{arrows && (
							<div className="flex gap-2">
								<button type="button" onClick={() => go(-1)} aria-label="前へ" className={ARROW}>
									<ChevronLeft size={20} aria-hidden="true" />
								</button>
								<button type="button" onClick={() => go(1)} aria-label="次へ" className={ARROW}>
									<ChevronRight size={20} aria-hidden="true" />
								</button>
							</div>
						)}
					</div>
				</div>
			)}

			{paged ? (
				// md 以上:1件ずつ transform でスライド(200ms・03 §8 のイージング)
				<div className="-mx-1.5 mt-6 overflow-hidden lg:-mx-2">
					<ul
						className={`flex ${slide?.running ? 'transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none' : ''}`}
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
				// スマホ:scroll-snap の横スワイプ
				<ul className="hr-scroll-x mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
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
