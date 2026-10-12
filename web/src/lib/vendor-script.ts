/**
 * 外から持ち込んだ JS(web/public/vendor/<名前>/<版>/)の読み込み口。
 * ページや部品は自分で <script> を書かず、必ずここの関数を通す(置き場所と版をこの1か所で持つ)。
 *
 *  - 何度呼ばれても、読み込むのは1回だけ。2回目からは同じ結果を返す
 *  - 読めない / 版が違う / 時間内に終わらない 時は null を返す。呼んだ側は、その部品を出さずに表示を続ける
 *  - サーバー側では読まない(window が無ければ null)。useEffect の中から呼ぶ
 *
 * 読み込みの決め方(1回だけ・時間切れ・版の確かめ)は onceLoader の純関数。テストは vendor-script.test.ts
 */

/** 路線図ヒーロー(route-hero.js)。_kits/route-hero-kit から書き換えずに置いた。出所と SHA-256 は docs/assets.md */
const ROUTE_HERO = { version: '2.0.0', src: '/vendor/route-hero/2.0.0/route-hero.js' } as const;

/** 読み込みを待つ上限。超えたら「無い」として扱う */
export const LOAD_TIMEOUT_MS = 8000;

/**
 * 1回だけ読み込む関数を作る。
 * load:読み込み(失敗したら reject)/ pick:読み込んだ後に中身を確かめて返す(版が違えば null)。
 */
export function onceLoader<T>(load: () => Promise<void>, pick: () => T | null, timeoutMs: number): () => Promise<T | null> {
	let result: Promise<T | null> | null = null;
	return () => {
		if (!result) {
			result = new Promise<T | null>((resolve) => {
				const timer = setTimeout(() => resolve(null), timeoutMs);
				load().then(
					() => {
						clearTimeout(timer);
						try {
							resolve(pick());
						} catch {
							resolve(null);
						}
					},
					() => {
						clearTimeout(timer);
						resolve(null);
					},
				);
			});
		}
		return result;
	};
}

/** <script> を1つ足して、読み終わったら解決する(失敗したら reject) */
function appendScript(src: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const s = document.createElement('script');
		s.src = src;
		s.async = true;
		s.onload = () => resolve();
		s.onerror = () => reject(new Error(`読み込めませんでした: ${src}`));
		document.head.appendChild(s);
	});
}

const routeHeroLoader = onceLoader(
	() => appendScript(ROUTE_HERO.src),
	() => (window.RouteHero?.version === ROUTE_HERO.version ? window.RouteHero : null),
	LOAD_TIMEOUT_MS,
);

/** route-hero.js を読み込んで RouteHero を返す。読めない・版が違う・時間切れ・サーバー側は null */
export function loadRouteHero(): Promise<RouteHeroApi | null> {
	if (typeof window === 'undefined') return Promise.resolve(null);
	return routeHeroLoader();
}
