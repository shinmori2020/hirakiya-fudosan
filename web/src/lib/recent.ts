/**
 * 最近見た物件(01 §3-9)。ブラウザの localStorage に物件番号だけを持つ(rules/static-rendering.md §2:サーバーは関与しない)。
 * 最大 10 件。読み書きは Client Component からだけ呼ぶ。
 */
const KEY = 'hr:recent';
export const RECENT_MAX = 10;

export function readRecent(): string[] {
	try {
		const raw = window.localStorage.getItem(KEY);
		const arr = raw ? (JSON.parse(raw) as unknown) : [];
		return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [];
	} catch {
		return [];
	}
}

export function pushRecent(no: string): string[] {
	const next = [no, ...readRecent().filter((x) => x !== no)].slice(0, RECENT_MAX);
	try {
		window.localStorage.setItem(KEY, JSON.stringify(next));
	} catch {
		/* private mode 等。表示だけ行う */
	}
	return next;
}
