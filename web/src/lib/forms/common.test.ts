import { describe, expect, it } from 'vitest';
import { commonRows, commonSchema, EMPTY_COMMON, firstErrors, isPhone, normalizeCommon, normalizePhone, readCommon } from '@/lib/forms/common';

const ok = { ...EMPTY_COMMON, name: '架空 太郎', phone: '03-0000-0000', agree: true };

describe('forms/common.ts', () => {
	it('J-105 電話番号:全角・空白・ダッシュ類を直し、数字10〜11桁で先頭0だけ通す', () => {
		expect(normalizePhone('０３−００００−００００')).toBe('03-0000-0000');
		expect(normalizePhone('090 0000 0000')).toBe('09000000000');
		expect(isPhone('03-0000-0000')).toBe(true);
		expect(isPhone('0300000000')).toBe(true);
		expect(isPhone('1234567890')).toBe(false);
		expect(isPhone('03-0000')).toBe(false);
	});

	it('J-105 共通の必須は 氏名・電話・同意 だけ。エラーは欄ごとに1つ', () => {
		const r = commonSchema.safeParse(EMPTY_COMMON);
		expect(r.success).toBe(false);
		if (r.success) return;
		expect(Object.keys(firstErrors(r.error.issues)).sort()).toEqual(['agree', 'name', 'phone']);
	});

	it('J-105 メールは空を許し、入っていれば形を見る。備考は上限だけ(必須はフォームごと)', () => {
		expect(commonSchema.safeParse({ ...ok, email: '' }).success).toBe(true);
		expect(commonSchema.safeParse({ ...ok, email: 'name@example.com' }).success).toBe(true);
		expect(commonSchema.safeParse({ ...ok, email: 'not-an-email' }).success).toBe(false);
		expect(commonSchema.safeParse({ ...ok, note: '' }).success).toBe(true);
		expect(commonSchema.safeParse({ ...ok, note: 'あ'.repeat(1001) }).success).toBe(false);
	});

	it('J-105 FormData の読み取り:無いキーは空、同意は on/1 だけ true', () => {
		const fd = new Map<string, string>([
			['name', ' 架空 太郎 '],
			['agree', 'on'],
			['method', 'line'],
		]);
		const v = readCommon({ get: (k) => fd.get(k) ?? null });
		expect(v.name).toBe(' 架空 太郎 ');
		expect(v.agree).toBe(true);
		expect(v.method).toBe('line');
		expect(v.phone).toBe('');
		expect(readCommon({ get: () => null }).agree).toBe(false);
	});

	it('J-105 正規化は電話だけ(半角に)。他はそのまま', () => {
		expect(normalizeCommon({ ...ok, phone: '０３-０００0-0000' }).phone).toBe('03-0000-0000');
	});

	it('J-105 確認画面の共通行:空の任意項目は「—」、備考のラベルは差し替えられる', () => {
		const rows = commonRows({ ...ok, method: 'line' });
		expect(rows.map((r) => r.label)).toEqual(['お名前', 'ふりがな', '電話番号', 'メール', '希望連絡方法', '備考']);
		expect(rows.find((r) => r.label === 'ふりがな')?.value).toBe('—');
		expect(rows.find((r) => r.label === '希望連絡方法')?.value).toBe('LINE');
		expect(commonRows(ok, 'ご質問の内容').at(-1)?.label).toBe('ご質問の内容');
	});
});
