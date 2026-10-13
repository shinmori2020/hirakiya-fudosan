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
 *  - **lead を渡すと2列**(トップの FV・J-167):1024 以上は 左 = lead + パネル / 右 = 路線図(5 : 7・間 32)、〜1023 は lead → 路線図 → パネル(J-168)。
 *    パネルは本体の panel オプションで左の列の空の div に入れる。lead はサーバーで作った要素なので、兄弟と並べず
 *    それだけを包む div に入れる(兄弟と並べると開発時に key の警告が出る・J-165)
 *  - lead が無い時は、本体の並べ方(split:1024 以上で左にパネル・右に路線図)にまかせる
 * 色・タブの見た目の合わせは globals.css の .hr-route-map。
 */
export function RouteMap({
	data,
	items,
	lead,
	leadClassName = '',
	className = '',
}: {
	data: RouteMapData;
	items: readonly RouteItem[];
	lead?: ReactNode;
	/** lead を包む div に足すクラス(トップの FV の〜1023 で、キャッチの塊だけ墨にする・J-170) */
	leadClassName?: string;
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
			className={`hr-route-map grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:grid-rows-[1fr_auto_auto_1fr] lg:gap-x-8 lg:gap-y-0 ${className}`}
		>
			{/*
			  HTML の順は lead → パネル → 路線図(読み上げと Tab の順。1024 以上の見た目と同じ)。
			  1024 以上:左の列の2・3段目に lead とパネル、右の列に路線図(4段ぶん)。1段目と4段目が余りを分け合うので、左は上下中央になる。
			  〜1023:見た目だけ lead → 路線図 → パネル(J-168。路線図を FV の顔として最初の画面に入れる。駅を選ぶと路線図のすぐ下に検索ボタンが出る)
			*/}
			<div className={`min-w-0 lg:col-start-1 lg:row-start-2 ${leadClassName}`}>{lead}</div>
			{/* パネルと路線図は JS で後から描くので、描く前から場所を取っておく(取らないと、描いた瞬間に下の中身が
			    1280 で 約 586px 下へずれた・J-167)。パネルの高さは幅で変わるので、測った値の最小の高さ(10/13・3001):
			    〜413 は 347 / 414〜767 は 301〜259 / 768〜1023 は 261〜218(768 に合わせて 261)/ 1024 以上は 303。広い側で少し空きが出るのは、ずれより小さい害として受ける */}
			<div className="min-h-[347px] min-w-0 max-lg:order-3 sm:min-h-[259px] md:min-h-[261px] lg:col-start-1 lg:row-start-3 lg:mt-6 lg:min-h-[303px]">
				<div ref={panelRef} />
			</div>
			<div className="hr-route-map__map min-w-0 max-lg:order-2 lg:col-start-2 lg:row-span-4 lg:row-start-1 lg:self-center">
				<div ref={mapRef} />
			</div>
		</div>
	);
}
