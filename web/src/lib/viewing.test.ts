import { describe, expect, it } from 'vitest';
import { closedDayHits, EMPTY_VIEWING, isPropertyNo, readViewing, validateViewing, viewingRows, viewingSubject, type ViewingInput } from '@/lib/viewing';

const TODAY = '2026-09-16';
/** 通る最小の入力 */
const ok = (over: Partial<ViewingInput> = {}): ViewingInput => ({
	...EMPTY_VIEWING,
	property: 'HR-R-0001',
	date1: '2026-09-20',
	slot1: 'morning',
	name: '架空 太郎',
	phone: '03-0000-0000',
	agree: true,
	...over,
});

describe('viewing.ts', () => {
	it('J-105 物件番号は HR-R-0001 / HR-S-0001 の形だけ(実在・成約済みは index.json 側)', () => {
		expect(isPropertyNo('HR-R-0001')).toBe(true);
		expect(isPropertyNo('HR-S-0020')).toBe(true);
		expect(isPropertyNo('hr-r-0001')).toBe(false);
		expect(isPropertyNo('')).toBe(false);
		expect(isPropertyNo(null)).toBe(false);
	});

	it('J-105 必須は 対象物件・第1希望(日付+時間帯)・氏名・電話・同意', () => {
		const r = validateViewing({ ...EMPTY_VIEWING }, TODAY);
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(Object.keys(r.errors).sort()).toEqual(['agree', 'date1', 'name', 'phone', 'property']);
		expect(r.errors.property).toBe('対象の物件が指定されていません');
		expect(r.errors.date1).toBe('第1希望の日付を選んでください');
	});

	it('J-105 第1希望は日付と時間帯の両方。日付だけなら時間帯のエラー', () => {
		const r = validateViewing(ok({ slot1: '' }), TODAY);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.errors.slot1).toBe('第1希望の時間帯を選んでください');
	});

	it('J-105 第2希望は任意。ただし日付を入れたら時間帯も求める。過去日・存在しない日は通さない', () => {
		expect(validateViewing(ok(), TODAY).ok).toBe(true);
		const half = validateViewing(ok({ date2: '2026-09-21' }), TODAY);
		expect(half.ok).toBe(false);
		if (!half.ok) expect(half.errors.slot2).toBe('第2希望の時間帯を選んでください');
		expect(validateViewing(ok({ date2: '2026-09-21', slot2: 'evening' }), TODAY).ok).toBe(true);
		const past = validateViewing(ok({ date1: '2026-09-01' }), TODAY);
		if (!past.ok) expect(past.errors.date1).toBe('今日以降の日付を選んでください');
		const bad = validateViewing(ok({ date1: '2026-02-30' }), TODAY);
		if (!bad.ok) expect(bad.errors.date1).toBe('日付の形が違います');
		// 今日は可
		expect(validateViewing(ok({ date1: TODAY }), TODAY).ok).toBe(true);
	});

	it('J-105 通った値は電話を半角に正規化する', () => {
		const r = validateViewing(ok({ phone: '０３−００００−００００' }), TODAY);
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.values.phone).toBe('03-0000-0000');
	});

	it('J-105 定休日(水曜)は通す。確認画面の注記のために該当する希望を返す', () => {
		// 2026-09-16 と 09-23 は水曜
		expect(validateViewing(ok({ date1: '2026-09-23' }), TODAY).ok).toBe(true);
		expect(closedDayHits({ date1: '2026-09-23', date2: '' })).toEqual(['第1希望']);
		expect(closedDayHits({ date1: '2026-09-20', date2: '2026-09-23' })).toEqual(['第2希望']);
		expect(closedDayHits({ date1: '2026-09-23', date2: '2026-09-30' })).toEqual(['第1希望', '第2希望']);
		expect(closedDayHits({ date1: '2026-09-20', date2: '' })).toEqual([]);
	});

	it('J-105 FormData の読み取り:共通項目+固有項目。無いキーは空', () => {
		const fd = new Map<string, string>([
			['property', 'HR-R-0001'],
			['date1', '2026-09-20'],
			['slot1', 'morning'],
			['name', '架空 太郎'],
			['agree', 'on'],
		]);
		const v = readViewing({ get: (k) => fd.get(k) ?? null });
		expect(v.property).toBe('HR-R-0001');
		expect(v.slot1).toBe('morning');
		expect(v.date2).toBe('');
		expect(v.agree).toBe(true);
	});

	it('J-105 確認画面の行:対象物件 → 第1希望 → 第2希望 → 連絡先。時間帯は時刻つきの文言', () => {
		const rows = viewingRows(ok({ email: 'a@example.com', method: 'phone' }), '曳舟テラス0-1');
		expect(rows.map((r) => r.label)).toEqual(['対象物件', '第1希望', '第2希望', 'お名前', 'ふりがな', '電話番号', 'メール', '希望連絡方法', '備考']);
		expect(rows[0].value).toBe('曳舟テラス0-1(HR-R-0001)');
		expect(rows[1].value).toBe('2026年9月20日(日) 午前(9:30〜12:00)');
		expect(rows[2].value).toBe('—');
	});

	it('J-105 件名は用件と物件番号。売買は「見学予約」', () => {
		expect(viewingSubject('HR-R-0001', 'rental')).toBe('[内見予約] HR-R-0001');
		expect(viewingSubject('HR-S-0009', 'sale')).toBe('[見学予約] HR-S-0009');
	});
});
