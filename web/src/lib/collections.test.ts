import { describe, expect, it } from 'vitest';
import { collectionsFor, isNewBuilt, withComputedCollections } from '@/lib/collections';

const NOW = new Date('2026-09-15T00:00:00+09:00');
/** 最小のダミー。web/data は読まない */
const mk = (builtYm: string, collections: string[] = []) => ({ builtYm, collections });

describe('collections.ts', () => {
	it('J-099 「新築・築浅」は築5年以内。境界の築5年は入り、築6年は外れる(2026-09-15 時点)', () => {
		expect(isNewBuilt(mk('2026-06'), NOW)).toBe(true);
		expect(isNewBuilt(mk('2021-09'), NOW)).toBe(true); // ちょうど5年
		expect(isNewBuilt(mk('2021-08'), NOW)).toBe(true); // 5年(月を過ぎているだけ)
		expect(isNewBuilt(mk('2020-10'), NOW)).toBe(true); // まだ5年(月が来ていない)
		expect(isNewBuilt(mk('2020-09'), NOW)).toBe(false); // 6年
	});

	it('J-099 築年月が空の物件(土地)は対象外', () => {
		expect(isNewBuilt(mk(''), NOW)).toBe(false);
		expect(collectionsFor(mk('', ['new-built', 'near-station']), NOW)).toEqual(['near-station']);
	});

	it('J-099 保存されたタグは信用せず、築年月から判定し直す(古い書き出しの結果を画面に残さない)', () => {
		// タグは付いているが築6年 → 外す
		expect(collectionsFor(mk('2020-01', ['new-built', 'pet-ok']), NOW)).toEqual(['pet-ok']);
		// タグが無くても築5年以内 → 足す
		expect(collectionsFor(mk('2025-01', ['pet-ok']), NOW)).toEqual(['pet-ok', 'new-built']);
	});

	it('J-099 計算しない特集(属性で持つもの)はそのまま残り、並びも変わらない', () => {
		expect(collectionsFor(mk('2020-01', ['zero-deposit', 'pet-ok', 'house-rental', 'central-30min', 'near-station']), NOW)).toEqual([
			'zero-deposit',
			'pet-ok',
			'house-rental',
			'central-30min',
			'near-station',
		]);
	});

	it('J-099 一覧に通すと各物件の特集が置き換わる(元の配列は変えない)', () => {
		const list = [mk('2026-01', []), mk('2010-01', ['new-built'])];
		const out = withComputedCollections(list, NOW);
		expect(out.map((p) => p.collections)).toEqual([['new-built'], []]);
		expect(list[1].collections).toEqual(['new-built']);
	});
});
