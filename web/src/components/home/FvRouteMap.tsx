'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { stationCounts, type RouteItem, type RouteLayout, type RouteMapData } from '@/lib/route-map';
import { loadBlockMap, loadRouteHero } from '@/lib/vendor-script';

/**
 * トップの FV(J-173)。路線図ヒーロー(route-hero.js 2.0.0)と、ブロックで組んだ街の中の路線図(block-map.js 1.0.1・J-174)をつなぐだけの部品。
 * どちらの本体も書き換えず、React で書き直さない。
 *  - 路線図ヒーロー:件数・選択・検索ボタンのリンクを受け持つ。パネルは左の列(panel)、平面の路線図は右の列(flat)。
 *    平面の路線図は 768 以上では CSS で隠し、767 以下と WebGL が使えない時(mount が null)だけ出す
 *  - block-map:768 以上の時だけ、最初の表示の後(requestIdleCallback)に three.js と block-map.js を読み、書体の読み込みと
 *    路線図ヒーローのパネルが描かれた後に mount する(**767 以下では読まない**。後で 768 以上になった時に読む・SHIN の条件)。
 *    quiet は見出しとパネルの列(copy)、area は路線図の場所取りの空の div(aspect-ratio 660 / 460)、labels は FV いっぱいの札の層
 *  - つなぎ方:札が押されたら hero.select()、rh:change を受けたら map.update()(件数は items から stationCounts で数える)、
 *    左のパネルの路線のチップに乗せた時・フォーカスした時は map.highlight(路線)
 *  - 止めるボタンは FV の右下で、3D を出している時(onLayout の shown)だけ
 *  - **Tab の順は 見出し → パネル → 止めるボタン → 駅名の札13**(SHIN の条件)。HTML の上で 文字の列 → 止めるボタン → 札の層 の順に置く
 *    (重なりは z-index で決めるので、見た目は README の層のまま:街 0 / 文字の列 1 / 札 2 / 止めるボタン 3)
 *  - 767 以下は J-168 のまま キャッチ → 平面の路線図 → パネル(見た目だけ CSS で並べ替え)。768〜1199 は キャッチ → パネル → 3D の路線図
 *  - 片付けで、block-map と路線図ヒーローの両方を destroy(画面の切り替えで二重に描かない)
 * lead(キャッチ2段と補足)はサーバーで作った要素なので、兄弟と並べず、それだけを包む div に入れる(J-165)。
 */
const MD_UP = '(min-width: 48rem)';
const PANEL_WAIT_MS = 10000;
const HIGHLIGHT_OFF_MS = 150;

export function FvRouteMap({ data, layout, items, lead }: { data: RouteMapData; layout: RouteLayout; items: readonly RouteItem[]; lead: ReactNode }) {
	const router = useRouter();
	const city = useRef<HTMLDivElement>(null);
	const labels = useRef<HTMLDivElement>(null);
	const copy = useRef<HTMLDivElement>(null);
	const panel = useRef<HTMLDivElement>(null);
	const area = useRef<HTMLDivElement>(null);
	const flat = useRef<HTMLDivElement>(null);
	const mapRef = useRef<BlockMapInstance | null>(null);
	const [shown, setShown] = useState(false);
	const [moving, setMoving] = useState(false);
	const [noGl, setNoGl] = useState(false);

	const types = useMemo(() => data.types ?? [], [data]);
	const counts = useMemo(() => stationCounts(items, types), [items, types]);

	useEffect(() => {
		const flatEl = flat.current;
		const panelEl = panel.current;
		if (!flatEl || !panelEl) return;
		let cancelled = false;
		let hero: RouteHeroInstance | null = null;
		let map: BlockMapInstance | null = null;
		let off = () => {};
		let hlTimer = 0;

		const typeLabel = (id: string) => types.find((t) => t.id === id)?.label ?? '';
		const stateOf = (d: RouteHeroDetail): BlockMapState => ({ type: d.type, typeLabel: typeLabel(d.type), types, selected: d.stations, counts });

		// 1) 路線図ヒーロー(件数・選択・リンク)はすぐに出す
		const onGo = (e: Event) => {
			e.preventDefault();
			router.push((e as CustomEvent<RouteHeroDetail>).detail.url);
		};
		flatEl.addEventListener('rh:go', onGo);
		let heroReadyResolve: () => void = () => {};
		const heroReady = new Promise<void>((resolve) => {
			heroReadyResolve = resolve;
		});
		const heroWait = window.setTimeout(() => heroReadyResolve(), PANEL_WAIT_MS);
		loadRouteHero().then((api) => {
			if (cancelled) return;
			if (api) hero = api.mount(flatEl, { data, items, searchUrl: '/properties?type={type}&station={stations}', panel: panelEl });
			heroReadyResolve();
		});

		// 2) 3D は 768 以上の時だけ、最初の表示の後で読む(それまでは地の色のまま)
		const mq = window.matchMedia(MD_UP);
		let started = false;
		let idleId = 0;
		const useIdle = 'requestIdleCallback' in window;
		const start3d = () => {
			if (started || !mq.matches) return;
			started = true;
			const run = async () => {
				const api = await loadBlockMap();
				if (cancelled) return;
				if (!api) return setNoGl(true); // three.js か block-map.js が読めない時も、平面の路線図を出す
				await document.fonts.ready;
				await heroReady;
				if (cancelled || !city.current || !area.current || !labels.current || !copy.current) return;
				map = api.mount(city.current, {
					data,
					layout,
					area: area.current,
					labels: labels.current,
					quiet: [copy.current],
					onToggle: (id) => {
						if (!hero) return;
						const s = hero.get().stations;
						hero.select(s.includes(id) ? s.filter((x) => x !== id) : s.concat(id));
					},
					onChange: (m) => setMoving(m),
					onLayout: ({ shown: s }) => setShown(s),
				});
				if (!map) return setNoGl(true); // WebGL が使えない時は、どの幅でも平面の路線図
				mapRef.current = map;
				setMoving(map.moving);
				const m = map;
				const onChange = (e: Event) => m.update(stateOf((e as CustomEvent<RouteHeroDetail>).detail));
				flatEl.addEventListener('rh:change', onChange);
				if (hero) m.update(stateOf(hero.get()));
				// 外した時は 150ms 待ってから全部の線に戻す(03 §8 の hover の時間)。その間に隣のチップへ入ったら戻さない。
				// すぐ戻すと、チップの間の隙間を通る時に全部の線が一瞬濃くなってチカチカする
				const chips = Array.from(panelEl.querySelectorAll<HTMLElement>('.rh-linechip'));
				const handlers = chips.map((chip, i) => {
					const on = () => {
						window.clearTimeout(hlTimer);
						m.highlight(data.lines[i]?.id ?? null);
					};
					const offHl = () => {
						window.clearTimeout(hlTimer);
						hlTimer = window.setTimeout(() => m.highlight(null), HIGHLIGHT_OFF_MS);
					};
					chip.addEventListener('pointerenter', on);
					chip.addEventListener('focus', on);
					chip.addEventListener('pointerleave', offHl);
					chip.addEventListener('blur', offHl);
					return { chip, on, offHl };
				});
				off = () => {
					window.clearTimeout(hlTimer);
					flatEl.removeEventListener('rh:change', onChange);
					for (const h of handlers) {
						h.chip.removeEventListener('pointerenter', h.on);
						h.chip.removeEventListener('focus', h.on);
						h.chip.removeEventListener('pointerleave', h.offHl);
						h.chip.removeEventListener('blur', h.offHl);
					}
				};
			};
			const go = () => void run();
			idleId = useIdle ? window.requestIdleCallback(go) : window.setTimeout(go, 200);
		};
		start3d();
		// 767 以下で開いた後に 768 以上になった時(画面の回転など)は、その時に読む
		mq.addEventListener('change', start3d);

		return () => {
			cancelled = true;
			mq.removeEventListener('change', start3d);
			if (useIdle) window.cancelIdleCallback(idleId);
			else window.clearTimeout(idleId);
			window.clearTimeout(heroWait);
			off();
			mapRef.current?.destroy();
			mapRef.current = null;
			map = null;
			flatEl.removeEventListener('rh:go', onGo);
			hero?.destroy();
		};
	}, [data, layout, items, counts, types, router]);

	return (
		<section className={`hr-fv hr-route-map hr-route-map--on-alt relative isolate overflow-hidden bg-surface-alt ${noGl ? 'is-flat' : ''}`}>
			{/* 3D を描く所(mount する空の div)。一番下の層 */}
			<div ref={city} aria-hidden="true" className="pointer-events-none absolute inset-0 z-0" />
			{/* 文字の列(z 1)。中身の最大幅は 1600(J-172) */}
			<div className="relative z-[1] mx-auto w-full max-w-[1600px] px-4 pt-12 pb-16 lg:px-8">
				<div className="hr-fv__grid grid grid-cols-1 gap-6">
					{/* 見出しとパネルの列(quiet)。767 以下は箱を消して(contents)、見た目だけ キャッチ → 路線図 → パネル(J-168) */}
					<div ref={copy} data-rm="column" className="min-w-0 max-md:contents">
						<div data-rm="lead" className="min-w-0">
							{lead}
						</div>
						{/* パネルは JS で後から描くので、描く前から場所を取っておく(J-167。高さは測った値・RouteMap の時と同じ考え方) */}
						<div data-rm="panel" className="hr-fv__panel mt-6 min-w-0 max-md:order-3 max-md:mt-0">
							<div ref={panel} />
						</div>
					</div>
					<div className="min-w-0 max-md:order-2">
						{/* 路線図の場所取り(area に渡す・中身なし)。768 以上で出す */}
						<div ref={area} className="hr-fv__area" />
						{/* 路線図ヒーローの平面の路線図(767 以下と WebGL が使えない時だけ出す) */}
						<div className="hr-fv__flat hr-route-map__map">
							<div ref={flat} />
						</div>
					</div>
				</div>
			</div>
			{/* 止めるボタン(z 3)。3D を出している時だけ。Tab ではパネルの後・駅名の札の前 */}
			{shown && !noGl && (
				<button
					type="button"
					onClick={() => (moving ? mapRef.current?.pause() : mapRef.current?.play())}
					className="absolute right-4 bottom-4 z-[3] h-10 cursor-pointer rounded-hr border border-sumi bg-surface px-4 text-small font-medium text-sumi transition-colors duration-150 hover:bg-surface-alt motion-reduce:transition-none lg:right-8"
				>
					{moving ? '動きを止める' : '動かす'}
				</button>
			)}
			{/* 駅名の札の層(z 2)。FV いっぱいに重ね、札のボタンだけがクリックを受ける */}
			<div ref={labels} className="pointer-events-none absolute inset-0 z-[2]" />
		</section>
	);
}
