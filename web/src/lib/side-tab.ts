/**
 * PC 右端の縦タブ「物件を探す」を出すかどうか(J-033 項目11 の適用)。
 *
 * J-033 で「一覧では縦タブを出さない」と決めた。理由は**自分自身への導線になる**ため。
 * 実装は `/properties` だけを見ていたので、実装順 4 で作った入口ページ(/area /line /feature)と
 * 条件固定の一覧(/area/[slug] /line/[slug] /station/[slug] /feature/[slug])が判定から漏れていた。
 * 判断を増やしたのではなく、**同じ判断の対象が増えた**だけなので、ここでパスの一覧として1か所にまとめる。
 *
 * 404・会社案内などは対象外(探す画面ではないので縦タブを出す)。
 * **トップも出さない(J-151)**:FV の帯に検索があり、同じ入口が並ぶため(J-033 の考え方を当てはめた)。
 */
const SEARCH_PATHS = ['/properties', '/area', '/line', '/station', '/feature'] as const;

/** そのパスが「探す画面」か。完全一致か、その配下(`/area/aoto`)だけを対象にする(`/areas` は別のパス) */
export function isSearchPage(pathname: string): boolean {
	const p = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
	return SEARCH_PATHS.some((base) => p === base || p.startsWith(`${base}/`));
}

/** 縦タブを出すか(探す画面とトップでは出さない) */
export function showsSideTab(pathname: string): boolean {
	if (pathname === '/') return false;
	return !isSearchPage(pathname);
}
