import { describe, expect, it } from 'vitest';
import { isSearchPage, showsSideTab } from '@/lib/side-tab';

describe('side-tab.ts', () => {
	it('J-033 一覧と詳細は探す画面(縦タブを出さない)', () => {
		expect(isSearchPage('/properties')).toBe(true);
		expect(isSearchPage('/properties/HR-R-0001')).toBe(true);
	});

	it('J-033 実装順 4 の入口3ページも探す画面', () => {
		expect(isSearchPage('/area')).toBe(true);
		expect(isSearchPage('/line')).toBe(true);
		expect(isSearchPage('/feature')).toBe(true);
	});

	it('J-033 条件固定の4種類も探す画面', () => {
		expect(isSearchPage('/area/aoto')).toBe(true);
		expect(isSearchPage('/line/keisei-main')).toBe(true);
		expect(isSearchPage('/station/aoto')).toBe(true);
		expect(isSearchPage('/feature/pet-ok')).toBe(true);
	});

	it('J-033 探す画面でないページでは縦タブを出す(トップ・404・会社案内)', () => {
		expect(showsSideTab('/')).toBe(true);
		expect(showsSideTab('/this-page-does-not-exist')).toBe(true);
		expect(showsSideTab('/company')).toBe(true);
		expect(showsSideTab('/owner')).toBe(true);
	});

	it('J-033 前方一致だけで判定しない:似た名前の別のパスは探す画面にしない', () => {
		expect(isSearchPage('/areas')).toBe(false);
		expect(isSearchPage('/lines-guide')).toBe(false);
		expect(isSearchPage('/features')).toBe(false);
		expect(isSearchPage('/stationery')).toBe(false);
		expect(isSearchPage('/property')).toBe(false);
	});

	it('J-033 末尾のスラッシュは同じ扱い。ルートは探す画面ではない', () => {
		expect(isSearchPage('/area/')).toBe(true);
		expect(isSearchPage('/properties/')).toBe(true);
		expect(isSearchPage('/')).toBe(false);
	});
});
