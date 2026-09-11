'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { PropertySummary } from '@/types/property';
import { pushRecent, recentExcept } from '@/lib/recent';
import { PropertyCard } from '@/components/property/PropertyCard';

/**
 * 最近見た物件(01 §3-9)。localStorage の物件番号を index.json(全件)から引いて描く。
 * マウント時に現在の物件を先頭に記録し、自分自身は一覧から除く。サーバーは関与しない(rules/static-rendering.md §2)。
 * 初回描画は空(hydration のズレを避ける)。
 *
 * J-064 → J-065:横スクロールバーをやめてカルーセルにする。送りの作りはギャラリー(J-049)に合わせる。
 *  - md(768)以上:矢印で transform のスライド。**1件ずつ**送る(J-065。J-064 は1画面ずつだった)
 *    次へ = 右から1枚入って左へ1枚抜ける、前へ = その逆。200ms・03 §8 のイージング
 *    1画面の枚数は 768〜1023 が2枚、1024 以上が4枚
 *  - 端はループする(J-065)。末尾の次は先頭、先頭の前は末尾。向きは変えないので巻き戻して見えない。
 *    J-064 で巡回させなかった理由(最後のページが4枚のうち1枚になる)は、1件ずつ送りになったので無くなった。
 *    矢印に disabled を入れない(J-049 で端の disabled がフォーカスを奪う不具合が出た経緯があり、ループなら起きない)
 *  - スマホ(〜767):scroll-snap の横スワイプのまま(慣性は端末のまま)。1枚強が見える幅
 *  - 件数が1画面の枚数以下なら矢印を出さない
 * 仕組み:表示枚数+1枚だけを並べ、1枚分ずらしてから並びを回して位置を戻す(画像の複製は持たない)。
 * カード部品(J-046)はそのまま使い、中身は変えない。
 */
export function RecentlyViewed({
	all,
	currentNo,
	stationNames,
	kindNames,
	areaLabels,
	featureNames,
	collectionNames,
	nowIso,
}: {
	all: PropertySummary[];
	currentNo: string;
	stationNames: Record<string, string>;
	kindNames: Record<string, string>;
	areaLabels: Record<string, string>;
	featureNames: Record<string, string>;
	collectionNames: Record<string, string>;
	nowIso: string;
}) {
	// Server → Client には関数を渡せないので、表示名は辞書で受けてここで関数にする(F-005 の教訓)
	const stationName = (slug: string) => stationNames[slug] ?? slug;
	const kindName = (slug: string) => kindNames[slug] ?? slug;
	const areaLabel = (slug: string) => areaLabels[slug] ?? slug;
	const tagNames = {
		collectionName: (slug: string) => collectionNames[slug] ?? slug,
		featureName: (slug: string) => featureNames[slug] ?? slug,
	};
	const [nos, setNos] = useState<string[]>([]);
	/** 1画面の枚数。0 = スマホ(スワイプ)。幅で切り替える */
	const [perView, setPerView] = useState(0);
	/** 左端に出ている物件の番号(1件ずつ動く。幅が変わっても保つ・J-065) */
	const [start, setStart] = useState(0);
	/** 送り中の状態。running = false の1フレームだけ初期位置を置き、次のフレームで動かす */
	const [slide, setSlide] = useState<{ dir: 1 | -1; running: boolean } | null>(null);
	const timer = useRef<number | null>(null);

	useEffect(() => {
		// localStorage は外部システム。effect で読み書きし、結果を state に反映する
		const next = pushRecent(currentNo);
		// eslint-disable-next-line react-hooks/set-state-in-effect -- 外部ストレージからの同期
		setNos(recentExcept(next, currentNo));
	}, [currentNo]);

	useEffect(() => {
		return () => {
			if (timer.current !== null) window.clearTimeout(timer.current);
		};
	}, []);

	useEffect(() => {
		const wide = window.matchMedia('(min-width: 64rem)');
		const mid = window.matchMedia('(min-width: 48rem)');
		// 幅が変わっても start は保つ(1件ずつ送りなので、左端の物件は幅に関係なく意味が同じ・J-065)
		const apply = () => {
			setPerView(wide.matches ? 4 : mid.matches ? 2 : 0);
		};
		apply();
		wide.addEventListener('change', apply);
		mid.addEventListener('change', apply);
		return () => {
			wide.removeEventListener('change', apply);
			mid.removeEventListener('change', apply);
		};
	}, []);

	const items = nos.map((n) => all.find((p) => p.no === n)).filter((p): p is PropertySummary => !!p);
	if (items.length === 0) return null;
	const now = new Date(nowIso);

	const paged = perView > 0;
	const arrows = paged && items.length > perView;
	const wrap = (i: number) => ((i % items.length) + items.length) % items.length;
	// 送り中だけ1枚多く並べる。次へは今の先頭から、前へは1つ前から並べる
	const base = slide?.dir === -1 ? wrap(start - 1) : start;
	const windowSize = Math.min(items.length, arrows ? perView + 1 : perView);
	const shown = arrows ? Array.from({ length: windowSize }, (_, i) => items[wrap(base + i)]) : items;
	// 1枚分の移動量(トラックの幅 = 1画面分なので 100 / perView %)
	const step = perView > 0 ? 100 / perView : 0;
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

	const card = (p: PropertySummary) => (
		<PropertyCard p={p} stationName={stationName} now={now} kindName={kindName} areaLabel={areaLabel} tagNames={tagNames} />
	);

	return (
		<section aria-labelledby="recent-heading">
			<div className="flex items-center justify-between">
				<h2 id="recent-heading" className="text-h2 font-bold lg:text-h2-pc">
					最近見た物件
				</h2>
				{arrows && (
					<div className="flex gap-2">
						<button
							type="button"
							onClick={() => go(-1)}
							aria-label="前の物件"
							className="flex size-9 cursor-pointer items-center justify-center rounded-hr border border-line bg-surface text-sumi transition-colors duration-150 hover:bg-badge-new-bg motion-reduce:transition-none"
						>
							<ChevronLeft size={20} aria-hidden="true" />
						</button>
						<button
							type="button"
							onClick={() => go(1)}
							aria-label="次の物件"
							className="flex size-9 cursor-pointer items-center justify-center rounded-hr border border-line bg-surface text-sumi transition-colors duration-150 hover:bg-badge-new-bg motion-reduce:transition-none"
						>
							<ChevronRight size={20} aria-hidden="true" />
						</button>
					</div>
				)}
			</div>

			{paged ? (
				// md 以上:1件ずつ transform でスライド(200ms・03 §8 のイージング)
				<div className="-mx-1.5 mt-6 overflow-hidden lg:-mx-2">
					<ul
						className={`flex ${slide?.running ? 'transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none' : ''}`}
						style={{ transform: `translateX(${offset}%)` }}
					>
						{shown.map((p) => (
							<li key={p.no} className="shrink-0 px-1.5 lg:px-2" style={{ width: `${step}%` }}>
								{card(p)}
							</li>
						))}
					</ul>
				</div>
			) : (
				// スマホ:scroll-snap の横スワイプ(1枚強が見える幅)
				<ul className="hr-scroll-x mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1">
					{items.map((p) => (
						<li key={p.no} className="w-[85%] shrink-0 snap-start">
							{card(p)}
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
