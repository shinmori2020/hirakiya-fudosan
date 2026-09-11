'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { PropertySummary } from '@/types/property';
import { pushRecent, recentExcept } from '@/lib/recent';
import { PropertyCard } from '@/components/property/PropertyCard';

/**
 * 最近見た物件(01 §3-9)。localStorage の物件番号を index.json(全件)から引いて描く。
 * マウント時に現在の物件を先頭に記録し、自分自身は一覧から除く。サーバーは関与しない(rules/static-rendering.md §2)。
 * 初回描画は空(hydration のズレを避ける)。
 *
 * J-064:横スクロールバーをやめてカルーセルにする。送りの作りはギャラリー(J-049)に合わせる。
 *  - md(768)以上:矢印で transform のスライド。次へ = 右から入って左へ抜ける、前へ = その逆。200ms
 *    1画面の枚数は 768〜1023 が2枚、1024 以上が4枚
 *  - スマホ(〜767):scroll-snap の横スワイプのまま(慣性は端末のまま)。1枚強が見える幅
 *  - 端では止める(ギャラリーは巡回させたが、ここは件数が可変で最後のページが半端になるため。J-064 で SHIN 採用)
 *  - 件数が1画面の枚数以下なら矢印を出さない
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
	const [page, setPage] = useState(0);

	useEffect(() => {
		// localStorage は外部システム。effect で読み書きし、結果を state に反映する
		const next = pushRecent(currentNo);
		// eslint-disable-next-line react-hooks/set-state-in-effect -- 外部ストレージからの同期
		setNos(recentExcept(next, currentNo));
	}, [currentNo]);

	useEffect(() => {
		const wide = window.matchMedia('(min-width: 64rem)');
		const mid = window.matchMedia('(min-width: 48rem)');
		const apply = () => {
			setPerView(wide.matches ? 4 : mid.matches ? 2 : 0);
			setPage(0);
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
	const pages = paged ? Math.ceil(items.length / perView) : 1;
	const current = Math.min(page, pages - 1);
	const arrows = paged && pages > 1;

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
							onClick={() => setPage(Math.max(0, current - 1))}
							disabled={current === 0}
							aria-label="前の物件"
							className="flex size-9 cursor-pointer items-center justify-center rounded-hr border border-line bg-surface text-sumi transition-colors duration-150 hover:bg-badge-new-bg disabled:cursor-default disabled:opacity-30 disabled:hover:bg-surface motion-reduce:transition-none"
						>
							<ChevronLeft size={20} aria-hidden="true" />
						</button>
						<button
							type="button"
							onClick={() => setPage(Math.min(pages - 1, current + 1))}
							disabled={current === pages - 1}
							aria-label="次の物件"
							className="flex size-9 cursor-pointer items-center justify-center rounded-hr border border-line bg-surface text-sumi transition-colors duration-150 hover:bg-badge-new-bg disabled:cursor-default disabled:opacity-30 disabled:hover:bg-surface motion-reduce:transition-none"
						>
							<ChevronRight size={20} aria-hidden="true" />
						</button>
					</div>
				)}
			</div>

			{paged ? (
				// md 以上:ページ単位で transform のスライド(200ms・03 §8 のイージング)
				<div className="-mx-1.5 mt-6 overflow-hidden lg:-mx-2">
					<ul
						className="flex transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none"
						style={{ transform: `translateX(-${current * 100}%)` }}
					>
						{items.map((p) => (
							<li key={p.no} className="shrink-0 px-1.5 lg:px-2" style={{ width: `${100 / perView}%` }}>
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
