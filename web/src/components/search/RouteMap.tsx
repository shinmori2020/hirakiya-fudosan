'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, type ReactNode } from 'react';
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
 *  - **lead を渡すと2列**(トップの FV・J-167 → J-172):1024 以上は 左 = lead + パネル / 右 = 路線図(左 minmax(0, 1fr) : 右 min(58%, 820px)・間 32。路線図の白いカードは最大 820px)、〜1023 は lead → 路線図 → パネル(J-168)。
 *    パネルは本体の panel オプションで左の列の空の div に入れる。lead はサーバーで作った要素なので、兄弟と並べず
 *    それだけを包む div に入れる(兄弟と並べると開発時に key の警告が出る・J-165)
 *  - **左の列(lead + パネル)は1つの要素**(data-rm="column"・J-171)。トップの FV の背景の街が、これを quiet の1つ目(カメラの揺れの軸)に使う。
 *    〜1023 は見た目の並べ替え(lead → 路線図 → パネル)のために、左の列の箱を消す(display: contents)。印は data-rm="column | lead | panel | map"
 *  - lead が無い時は、本体の並べ方(split:1024 以上で左にパネル・右に路線図)にまかせる
 * 色・タブの見た目の合わせは globals.css の .hr-route-map。
 */
export function RouteMap({
	data,
	items,
	lead,
	className = '',
}: {
	data: RouteMapData;
	items: readonly RouteItem[];
	lead?: ReactNode;
	className?: string;
}) {
	const mapRef = useRef<HTMLDivElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);
	const router = useRouter();
	const twoColumns = lead !== undefined;

	useEffect(() => {
		const el = mapRef.current;
		const panel = panelRef.current;
		if (!el) return;
		let hero: RouteHeroInstance | null = null;
		let cancelled = false;
		const onGo = (e: Event) => {
			e.preventDefault();
			router.push((e as CustomEvent<RouteHeroDetail>).detail.url);
		};
		// rh:go は mount した要素に届く(親へも伝わる)。パネルを分けた時もパネルの検索ボタンから mount した要素に届く
		el.addEventListener('rh:go', onGo);
		loadRouteHero().then((api) => {
			if (cancelled || !api) return;
			hero = api.mount(el, {
				data,
				items,
				searchUrl: '/properties?type={type}&station={stations}',
				...(twoColumns && panel ? { panel } : { layout: 'split' as const }),
			});
		});
		return () => {
			cancelled = true;
			el.removeEventListener('rh:go', onGo);
			hero?.destroy();
		};
	}, [data, items, router, twoColumns]);

	if (!twoColumns) {
		return (
			<div className={`hr-route-map ${className}`}>
				<div ref={mapRef} />
			</div>
		);
	}
	return (
		<div
			className={`hr-route-map grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_min(58%,820px)] lg:items-center lg:gap-x-8 ${className}`}
		>
			{/*
			  HTML の順は lead → パネル → 路線図(読み上げと Tab の順。1024 以上の見た目と同じ)。
			  1024 以上:左の列(lead + パネル)を1つの要素にして、右の路線図と上下中央で並べる(J-171。FV の背景の街の quiet の1つ目にする)。
			  〜1023:左の列の箱を消し(contents)、見た目だけ lead → 路線図 → パネル(J-168。路線図を FV の顔として最初の画面に入れる。駅を選ぶと路線図のすぐ下に検索ボタンが出る)
			*/}
			<div data-rm="column" className="max-lg:contents lg:min-w-0">
			<div data-rm="lead" className="min-w-0">{lead}</div>
			{/* パネルと路線図は JS で後から描くので、描く前から場所を取っておく(取らないと、描いた瞬間に下の中身が
			    1280 で 約 586px 下へずれた・J-167)。パネルの高さは幅で変わるので、測った値の最小の高さ(10/13・3001):
			    〜413 は 347 / 414〜767 は 301〜259 / 768〜1023 は 261〜218(768 に合わせて 261)/ 1024 以上は 303。
			    J-172 で左の列が 1fr になって狭まり、1024〜1099 は 345・1100〜1366 は 303・1440 以上は 261(10/14・3001)なので、1024〜 345 / 1280〜 303 / 1536〜 261 にした。広い側で少し空きが出るのは、ずれより小さい害として受ける */}
			<div data-rm="panel" className="min-h-[347px] min-w-0 max-lg:order-3 sm:min-h-[259px] md:min-h-[261px] lg:mt-6 lg:min-h-[345px] xl:min-h-[303px] 2xl:min-h-[261px]">
				<div ref={panelRef} />
			</div>
			</div>
			<div data-rm="map" className="hr-route-map__map min-w-0 max-lg:order-2">
				<div ref={mapRef} />
			</div>
		</div>
	);
}
