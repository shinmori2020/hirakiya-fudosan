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
/**
 * three.js 0.147.0 の global build(window.THREE)。npm からは入れず、three@0.147.0 の build/three.min.js と LICENSE を置いた(J-171)。
 * トップ(FV の路線図・J-173。768 以上の時だけ)で読む。後で物件詳細(間取りの 3D)でも読む予定。**three.js を読むのはここだけ**
 */
const THREE_LIB = { revision: '147', src: '/vendor/three/0.147.0/three.min.js' } as const;
/**
 * FV の路線図(block-map.js・ブロックで組んだ街の中の線路と駅)。three.js の後に読む。_kits/block-map-kit から書き換えずに置いた(J-173)。
 * J-171 の block-town.js(背景の街)は J-173 でサイトから消した
 */
const BLOCK_MAP = { version: '1.0.0', src: '/vendor/block-map/1.0.0/block-map.js' } as const;

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

/** 版の確かめ:読み込んだものの版(文字列)が、置いた版と同じか */
export function versionMatches(actual: unknown, expected: string): boolean {
	return typeof actual === 'string' && actual === expected;
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
	() => (versionMatches(window.RouteHero?.version, ROUTE_HERO.version) ? (window.RouteHero ?? null) : null),
	LOAD_TIMEOUT_MS,
);

/** route-hero.js を読み込んで RouteHero を返す。読めない・版が違う・時間切れ・サーバー側は null */
export function loadRouteHero(): Promise<RouteHeroApi | null> {
	if (typeof window === 'undefined') return Promise.resolve(null);
	return routeHeroLoader();
}

const threeLoader = onceLoader(
	() => appendScript(THREE_LIB.src),
	() => (versionMatches(window.THREE?.REVISION, THREE_LIB.revision) ? (window.THREE ?? null) : null),
	LOAD_TIMEOUT_MS,
);

/** three.js 0.147.0 を読み込んで THREE を返す。読めない・版が違う(REVISION が "147" でない)・時間切れ・サーバー側は null */
export function loadThree(): Promise<ThreeGlobal | null> {
	if (typeof window === 'undefined') return Promise.resolve(null);
	return threeLoader();
}

const blockMapLoader = onceLoader(
	async () => {
		// three.js が無いと描けないので、先に three.js を読む(読めなければ路線図も読まない)
		if (!(await loadThree())) throw new Error('three.js を読めませんでした');
		await appendScript(BLOCK_MAP.src);
	},
	() => (versionMatches(window.BlockMap?.version, BLOCK_MAP.version) ? (window.BlockMap ?? null) : null),
	// three.js の読み込み(最大 8秒)を含むので、上限は2倍にする
	LOAD_TIMEOUT_MS * 2,
);

/** FV の路線図(block-map.js 1.0.0)を読み込んで BlockMap を返す。three.js が読めない時も null。呼ぶのは 768 以上の時だけ(J-173) */
export function loadBlockMap(): Promise<BlockMapApi | null> {
	if (typeof window === 'undefined') return Promise.resolve(null);
	return blockMapLoader();
}
