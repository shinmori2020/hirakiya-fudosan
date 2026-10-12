'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import type { RouteItem, RouteMapData } from '@/lib/route-map';
import { loadRouteHero } from '@/lib/vendor-script';

/**
 * 路線図ヒーロー(route-hero.js 2.0.0)を包むだけの部品。本体は書き換えず、React で書き直さない。
 *  - 本体は lib/vendor-script.ts の loadRouteHero() で読む(サーバーでは読まない・1回だけ)。読めない時は何も描かない
 *  - mount する要素は空の div。中身とクラスは本体が足すので、React では触らない(見た目のクラスは外側の div に付ける)
 *  - data- 属性による自動の描画は使わない(2.0.0 にはもう無い)。片付けで destroy() を呼ぶ(画面遷移で二重に描かない)
 *  - 件数は items(物件ごとの種類と駅)から本体が重ならずに数える。データは getRouteMap()(サーバー側・ビルドの時)
 *  - 検索ボタンは普通のリンク。押した時の rh:go を止めて router.push に渡し、ページを読み込み直さずに一覧へ移る
 *    (Ctrl・⌘ などを押しながらのクリックは、本体が rh:go を出さずリンクのまま開く)
 * 色・タブの見た目の合わせは globals.css の .hr-route-map。
 */
export function RouteMap({
	data,
	items,
	layout = 'split',
	className = '',
}: {
	data: RouteMapData;
	items: readonly RouteItem[];
	layout?: 'split' | 'stack';
	className?: string;
}) {
	const ref = useRef<HTMLDivElement>(null);
	const router = useRouter();

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		let hero: RouteHeroInstance | null = null;
		let cancelled = false;
		const onGo = (e: Event) => {
			e.preventDefault();
			router.push((e as CustomEvent<RouteHeroDetail>).detail.url);
		};
		el.addEventListener('rh:go', onGo);
		loadRouteHero().then((api) => {
			if (cancelled || !api) return;
			hero = api.mount(el, { data, items, searchUrl: '/properties?type={type}&station={stations}', layout });
		});
		return () => {
			cancelled = true;
			el.removeEventListener('rh:go', onGo);
			hero?.destroy();
		};
	}, [data, items, layout, router]);

	return (
		<div className={`hr-route-map ${className}`}>
			<div ref={ref} />
		</div>
	);
}
