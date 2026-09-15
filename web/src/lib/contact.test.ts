import { describe, expect, it } from 'vitest';
import {
	confirmRows,
	EMPTY_INPUT,
	isPastDate,
	isPhone,
	isPropertyNo,
	kindFromQuery,
	mailSubject,
	normalizePhone,
	parseDateOnly,
	preferredLabel,
	readInput,
	validateContact,
	type ContactInput,
} from '@/lib/contact';

const TODAY = '2026-09-15';
/** 通る最小の入力 */
const ok = (over: Partial<ContactInput> = {}): ContactInput => ({ ...EMPTY_INPUT, name: '架空 太郎', phone: '03-0000-0000', agree: true, ...over });

describe('contact.ts', () => {
	it('J-102 ?kind= は一覧にある slug だけ受け付け、無い・不正なら「質問」', () => {
		expect(kindFromQuery('viewing')).toBe('viewing');
		expect(kindFromQuery('recruit')).toBe('recruit');
		expect(kindFromQuery(null)).toBe('question');
		expect(kindFromQuery('')).toBe('question');
		expect(kindFromQuery('VIEWING')).toBe('question');
		expect(kindFromQuery('<script>')).toBe('question');
	});

	it('J-102 物件番号は HR-R-0001 / HR-S-0001 の形だけ(実在の確認は index.json 側)', () => {
		expect(isPropertyNo('HR-R-0001')).toBe(true);
		expect(isPropertyNo('HR-S-0020')).toBe(true);
		expect(isPropertyNo('hr-r-0001')).toBe(false);
		expect(isPropertyNo('HR-R-1')).toBe(false);
		expect(isPropertyNo('HR-X-0001')).toBe(false);
		expect(isPropertyNo(null)).toBe(false);
	});

	it('J-102 電話番号:全角・空白・長音を直し、数字10〜11桁で先頭0だけ通す', () => {
		expect(normalizePhone('０３−００００−００００')).toBe('03-0000-0000');
		expect(normalizePhone('090 0000 0000')).toBe('09000000000');
		expect(isPhone('03-0000-0000')).toBe(true);
		expect(isPhone('09000000000')).toBe(true);
		expect(isPhone('0300000000')).toBe(true); // 10桁
		expect(isPhone('1234567890')).toBe(false); // 先頭が0でない
		expect(isPhone('03-0000')).toBe(false); // 桁が足りない
		expect(isPhone('abc')).toBe(false);
	});

	it('J-102 日付は暦日として扱う(存在しない日は落とす・過去日は today との文字列比較)', () => {
		expect(parseDateOnly('2026-09-20')).toEqual({ y: 2026, m: 9, d: 20 });
		expect(parseDateOnly('2026-02-30')).toBeNull();
		expect(parseDateOnly('2026/09/20')).toBeNull();
		expect(isPastDate('2026-09-14', TODAY)).toBe(true);
		expect(isPastDate('2026-09-15', TODAY)).toBe(false); // 今日は可
		expect(preferredLabel('2026-09-20', 'morning')).toBe('2026年9月20日(日) 午前');
		expect(preferredLabel('2026-09-20', '')).toBe('2026年9月20日(日)');
		expect(preferredLabel('', 'morning')).toBe('');
	});

	it('J-102 必須は 氏名・電話・同意 だけ(質問の場合)。エラーは欄ごとに1つ', () => {
		const r = validateContact({ ...EMPTY_INPUT, kind: 'question' }, TODAY);
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(Object.keys(r.errors).sort()).toEqual(['agree', 'name', 'phone']);
		expect(r.errors.phone).toBe('電話番号を入力してください');
		expect(r.errors.agree).toBe('プライバシーポリシーへの同意にチェックを入れてください');
	});

	it('J-102 内見希望だけ第1希望の日付が必須。第2希望は任意。過去日は通さない', () => {
		const missing = validateContact(ok({ kind: 'viewing' }), TODAY);
		expect(missing.ok).toBe(false);
		if (!missing.ok) expect(missing.errors.date1).toBe('第1希望の日付を選んでください');

		const past = validateContact(ok({ kind: 'viewing', date1: '2026-09-01' }), TODAY);
		expect(past.ok).toBe(false);
		if (!past.ok) expect(past.errors.date1).toBe('今日以降の日付を選んでください');

		const fine = validateContact(ok({ kind: 'viewing', date1: '2026-09-20', slot1: 'morning' }), TODAY);
		expect(fine.ok).toBe(true);
		// 質問なら日付が空でも通る
		expect(validateContact(ok({ kind: 'question' }), TODAY).ok).toBe(true);
	});

	it('J-102 通った値は正規化する:電話は半角、内見希望でない時の希望日時は捨てる', () => {
		const r = validateContact(ok({ kind: 'vacancy', phone: '０３-０００0-0000', date1: '2026-09-20', slot1: 'morning' }), TODAY);
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.values.phone).toBe('03-0000-0000');
		expect(r.values.date1).toBe('');
		expect(r.values.slot1).toBe('');
	});

	it('J-102 メールは空を許し、入っていれば形を見る。物件番号は形が違えば落とす', () => {
		expect(validateContact(ok({ email: '' }), TODAY).ok).toBe(true);
		expect(validateContact(ok({ email: 'name@example.com' }), TODAY).ok).toBe(true);
		const bad = validateContact(ok({ email: 'not-an-email' }), TODAY);
		expect(bad.ok).toBe(false);
		if (!bad.ok) expect(bad.errors.email).toContain('メールアドレスの形');
		expect(validateContact(ok({ property: 'HR-R-0001' }), TODAY).ok).toBe(true);
		expect(validateContact(ok({ property: 'HR-R-1' }), TODAY).ok).toBe(false);
	});

	it('J-102 FormData の読み取り:無いキーは空、同意は on/1 だけ true、種別は既定に倒す', () => {
		const fd = new Map<string, string>([
			['name', ' 架空 太郎 '],
			['agree', 'on'],
			['kind', 'bogus'],
		]);
		const v = readInput({ get: (k) => fd.get(k) ?? null });
		expect(v.name).toBe(' 架空 太郎 ');
		expect(v.agree).toBe(true);
		expect(v.kind).toBe('question');
		expect(v.phone).toBe('');
		expect(v.date1).toBe('');
	});

	it('J-102 確認画面の行:任意で空は「—」、希望日時は内見希望の時だけ、対象物件が無ければ「指定なし」', () => {
		const rows = confirmRows(ok({ kind: 'question', email: '' }));
		expect(rows.map((r) => r.label)).toEqual(['対象物件', '種別', 'お名前', 'ふりがな', '電話番号', 'メール', '希望連絡方法', '備考']);
		expect(rows[0].value).toBe('指定なし');
		expect(rows.find((r) => r.label === 'ふりがな')?.value).toBe('—');
		expect(rows.find((r) => r.label === '希望連絡方法')?.value).toBe('—');

		const viewing = confirmRows(ok({ kind: 'viewing', property: 'HR-R-0001', date1: '2026-09-20', slot1: 'evening', method: 'line' }), '曳舟テラス0-1');
		expect(viewing[0].value).toBe('曳舟テラス0-1(HR-R-0001)');
		expect(viewing.map((r) => r.label).slice(0, 4)).toEqual(['対象物件', '種別', '第1希望', '第2希望']);
		expect(viewing[2].value).toBe('2026年9月20日(日) 夕方以降');
		expect(viewing[3].value).toBe('—');
		expect(viewing.find((r) => r.label === '希望連絡方法')?.value).toBe('LINE');
	});

	it('J-102 メールの件名は頭に種別、物件があれば番号', () => {
		expect(mailSubject('viewing', 'HR-R-0001')).toBe('[内見希望] お問い合わせ(HR-R-0001)');
		expect(mailSubject('question', '')).toBe('[質問] お問い合わせ');
	});
});
