import { beforeEach, describe, expect, it } from 'vitest';
import { pushRecent, readRecent, recentExcept, RECENT_MAX } from '@/lib/recent';

/** localStorage の最小スタブ(node 環境)。web/data は読まない */
function installStorage() {
	const store = new Map<string, string>();
	Object.defineProperty(globalThis, 'window', {
		configurable: true,
		value: {
			localStorage: {
				getItem: (k: string) => store.get(k) ?? null,
				setItem: (k: string, v: string) => void store.set(k, v),
				removeItem: (k: string) => void store.delete(k),
			},
		},
	});
}

describe('recent.ts', () => {
	beforeEach(installStorage);

	it('J-038 見た順に先頭へ入る', () => {
		pushRecent('A');
		pushRecent('B');
		expect(readRecent()).toEqual(['B', 'A']);
	});

	it('J-038 同じ物件は1件だけ(再訪で先頭に移る)', () => {
		pushRecent('A');
		pushRecent('B');
		pushRecent('A');
		expect(readRecent()).toEqual(['A', 'B']);
	});

	it('J-038 11件目を見ると最古が消えて10件のまま', () => {
		for (let i = 1; i <= RECENT_MAX + 1; i++) pushRecent(`P${i}`);
		const list = readRecent();
		expect(list).toHaveLength(RECENT_MAX);
		expect(list[0]).toBe(`P${RECENT_MAX + 1}`);
		expect(list).not.toContain('P1');
	});

	it('J-038 今見ている物件は表示から除く', () => {
		expect(recentExcept(['A', 'B', 'C'], 'A')).toEqual(['B', 'C']);
	});

	it('J-038 履歴が無ければ空配列', () => {
		expect(readRecent()).toEqual([]);
		expect(recentExcept([], 'A')).toEqual([]);
	});

	it('J-038 localStorage が壊れていても空配列を返す', () => {
		window.localStorage.setItem('hr:recent', '{not json');
		expect(readRecent()).toEqual([]);
	});
});
