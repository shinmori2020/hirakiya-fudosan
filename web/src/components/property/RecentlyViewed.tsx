'use client';

import { useEffect, useState } from 'react';
import type { PropertySummary } from '@/types/property';
import { pushRecent, recentExcept } from '@/lib/recent';
import { PropertyCard } from '@/components/property/PropertyCard';

/**
 * 最近見た物件(01 §3-9・横スクロール)。localStorage の物件番号を index.json(全件)から引いて描く。
 * マウント時に現在の物件を先頭に記録し、自分自身は一覧から除く。サーバーは関与しない(rules/static-rendering.md §2)。
 * 初回描画は空(hydration のズレを避ける)。
 */
export function RecentlyViewed({ all, currentNo, stationNames, nowIso }: { all: PropertySummary[]; currentNo: string; stationNames: Record<string, string>; nowIso: string }) {
	// Server → Client には関数を渡せないので、駅名は辞書で受けてここで関数にする
	const stationName = (slug: string) => stationNames[slug] ?? slug;
	const [nos, setNos] = useState<string[]>([]);
	useEffect(() => {
		// localStorage は外部システム。effect で読み書きし、結果を state に反映する
		const next = pushRecent(currentNo);
		// eslint-disable-next-line react-hooks/set-state-in-effect -- 外部ストレージからの同期
		setNos(recentExcept(next, currentNo));
	}, [currentNo]);

	const items = nos.map((n) => all.find((p) => p.no === n)).filter((p): p is PropertySummary => !!p);
	if (items.length === 0) return null;
	const now = new Date(nowIso);
	return (
		<section aria-labelledby="recent-heading">
			<h2 id="recent-heading" className="text-h2 font-bold lg:text-h2-pc">
				最近見た物件
			</h2>
			<ul className="mt-6 flex gap-3 overflow-x-auto pb-2 lg:gap-4">
				{items.map((p) => (
					<li key={p.no} className="w-64 shrink-0 lg:w-72">
						<PropertyCard p={p} stationName={stationName} now={now} />
					</li>
				))}
			</ul>
		</section>
	);
}
