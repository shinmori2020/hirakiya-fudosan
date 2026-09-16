import { describe, expect, it } from 'vitest';
import { confirmRows, EMPTY_INPUT, isPropertyNo, kindFromQuery, mailSubject, noteField, readInput, validateContact, type ContactInput } from '@/lib/contact';

/** 通る最小の入力。既定の「質問」は備考が必須になるので(J-105 ②)、素の必須だけを見たい時は空室確認にする */
const ok = (over: Partial<ContactInput> = {}): ContactInput => ({ ...EMPTY_INPUT, kind: 'vacancy', name: '架空 太郎', phone: '03-0000-0000', agree: true, ...over });

describe('contact.ts', () => {
	it('J-105 ?kind= は5種だけ受け付け、無い・不正・viewing は「質問」', () => {
		expect(kindFromQuery('vacancy')).toBe('vacancy');
		expect(kindFromQuery('recruit')).toBe('recruit');
		expect(kindFromQuery(null)).toBe('question');
		expect(kindFromQuery('')).toBe('question');
		expect(kindFromQuery('viewing')).toBe('question'); // 内見予約は /viewing に分けた
		expect(kindFromQuery('<script>')).toBe('question');
	});

	it('J-102 物件番号は HR-R-0001 / HR-S-0001 の形だけ(実在の確認は index.json 側)', () => {
		expect(isPropertyNo('HR-R-0001')).toBe(true);
		expect(isPropertyNo('HR-X-0001')).toBe(false);
		expect(isPropertyNo(null)).toBe(false);
	});

	it('J-102 共通の必須は 氏名・電話・同意。エラーは欄ごとに1つ', () => {
		const r = validateContact({ ...EMPTY_INPUT, kind: 'vacancy' });
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(Object.keys(r.errors).sort()).toEqual(['agree', 'name', 'phone']);
		expect(r.errors.phone).toBe('電話番号を入力してください');
		// 既定の「質問」では備考も必須になる(J-105 ②)
		const q = validateContact({ ...EMPTY_INPUT });
		if (!q.ok) expect(Object.keys(q.errors).sort()).toEqual(['agree', 'name', 'note', 'phone']);
	});

	it('J-102 通った値は電話を半角に正規化する。物件番号は形が違えば落とす', () => {
		const r = validateContact(ok({ phone: '０３-０００0-0000', property: 'HR-R-0001' }));
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.values.phone).toBe('03-0000-0000');
		expect(validateContact(ok({ property: 'HR-R-1' })).ok).toBe(false);
		expect(validateContact(ok({ property: '' })).ok).toBe(true);
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
		expect(v.property).toBe('');
	});

	it('J-105 確認画面の行:対象物件 → 種別 → 連絡先。希望日時の行は無い(内見予約は /viewing)', () => {
		const rows = confirmRows(ok({ kind: 'vacancy', email: '' }));
		expect(rows.map((r) => r.label)).toEqual(['対象物件', '種別', 'お名前', 'ふりがな', '電話番号', 'メール', '希望連絡方法', '備考']);
		expect(rows[0].value).toBe('指定なし');
		expect(rows[1].value).toBe('空室確認');
		expect(rows.find((r) => r.label === 'メール')?.value).toBe('—');
		expect(confirmRows(ok({ property: 'HR-R-0001' }), '曳舟テラス0-1')[0].value).toBe('曳舟テラス0-1(HR-R-0001)');
	});

	it('J-105 備考のラベル・必須・補足は種別で変わる(質問と来店予約だけ必須)', () => {
		expect(noteField('question')).toEqual({ label: 'ご質問の内容', required: true });
		expect(noteField('visit')).toEqual({ label: 'ご希望の日時', required: true, hint: '例:9月20日(日)の午後' });
		expect(noteField('vacancy').label).toBe('備考');
		expect(noteField('vacancy').required).toBe(false);
		expect(noteField('corporate').required).toBe(false);
		expect(noteField('recruit').required).toBe(false);
	});

	it('J-105 必須の種別で備考が空ならエラー。文言はその種別のラベルで言う', () => {
		const q = validateContact(ok({ kind: 'question', note: '' }));
		expect(q.ok).toBe(false);
		if (!q.ok) expect(q.errors.note).toBe('ご質問の内容を入力してください');
		const v = validateContact(ok({ kind: 'visit', note: '   ' })); // 空白だけも空として扱う
		expect(v.ok).toBe(false);
		if (!v.ok) expect(v.errors.note).toBe('ご希望の日時を入力してください');
		expect(validateContact(ok({ kind: 'question', note: '内見の流れを知りたいです' })).ok).toBe(true);
		// 他の種別では空でも通る
		expect(validateContact(ok({ kind: 'vacancy', note: '' })).ok).toBe(true);
		expect(validateContact(ok({ kind: 'corporate', note: '' })).ok).toBe(true);
	});

	it('J-105 確認画面の備考の行は入力画面と同じラベルにする', () => {
		expect(confirmRows(ok({ kind: 'question', note: '内見の流れを知りたいです' })).at(-1)).toEqual({ label: 'ご質問の内容', value: '内見の流れを知りたいです' });
		expect(confirmRows(ok({ kind: 'visit', note: '9月20日の午後' })).at(-1)?.label).toBe('ご希望の日時');
		expect(confirmRows(ok({ kind: 'vacancy' })).at(-1)).toEqual({ label: '備考', value: '—' });
	});

	it('J-102 メールの件名は頭に種別、物件があれば番号', () => {
		expect(mailSubject('vacancy', 'HR-R-0001')).toBe('[空室確認] お問い合わせ(HR-R-0001)');
		expect(mailSubject('question', '')).toBe('[質問] お問い合わせ');
	});
});
