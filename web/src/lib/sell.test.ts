import { describe, expect, it } from 'vitest';
import { areaLabel, EMPTY_SELL, readSell, sellRows, sellSubject, validateSell, type SellInput } from '@/lib/sell';

const YEAR = 2026;
/** 通る最小の入力(共通の必須3つ + 固有の必須4つ) */
const ok = (over: Partial<SellInput> = {}): SellInput => ({
	...EMPTY_SELL,
	name: '架空 太郎',
	phone: '03-0000-0000',
	agree: true,
	kind: 'mansion',
	ward: 'katsushika',
	address: '青戸0-0-0',
	condition: 'live',
	assessment: 'desk',
	...over,
});

describe('sell.ts', () => {
	it('J-105 ③ 固有の必須は 物件種別・所在地(区+住所)・現況・査定の種類。エラーは欄ごとに1つ', () => {
		const r = validateSell(EMPTY_SELL, YEAR);
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(Object.keys(r.errors).sort()).toEqual(['address', 'agree', 'assessment', 'condition', 'kind', 'name', 'phone', 'ward']);
	});

	it('J-105 ③ 区が「その他」でも住所は必須(対応エリア外も受けるが、どこかは書いてもらう)', () => {
		expect(validateSell(ok({ ward: 'other', address: '' }), YEAR).ok).toBe(false);
		expect(validateSell(ok({ ward: 'other', address: '架空市0-0-0' }), YEAR).ok).toBe(true);
	});

	it('J-105 ③ 土地は築年・間取りを見ない(空欄でも通り、送られてきても値を残さない)', () => {
		const empty = validateSell(ok({ kind: 'land', layout: '', builtYear: '' }), YEAR);
		expect(empty.ok).toBe(true);
		const sent = validateSell(ok({ kind: 'land', layout: '3LDK', builtYear: '1800' }), YEAR);
		expect(sent.ok).toBe(true);
		if (sent.ok) expect([sent.values.layout, sent.values.builtYear]).toEqual(['', '']);
	});

	it('J-105 ③ マンションで面積が数字でなければ落とす。文言は種別のラベルで言う', () => {
		const r = validateSell(ok({ areaSqm: '広め' }), YEAR);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.errors.areaSqm).toBe('専有面積は数字で入力してください(単位:㎡)');
		expect(validateSell(ok({ areaSqm: '0' }), YEAR).ok).toBe(false);
		// 全角は半角に直してから読む(電話と同じ)
		const z = validateSell(ok({ areaSqm: '６５．５' }), YEAR);
		expect(z.ok).toBe(true);
		if (z.ok) expect(z.values.areaSqm).toBe('65.5');
	});

	it('J-105 ③ 築年は西暦4桁・1900〜今年の範囲(戸建・マンションのみ)', () => {
		expect(validateSell(ok({ kind: 'house', builtYear: '2005' }), YEAR).ok).toBe(true);
		expect(validateSell(ok({ kind: 'house', builtYear: '平成17' }), YEAR).ok).toBe(false);
		expect(validateSell(ok({ kind: 'house', builtYear: String(YEAR + 1) }), YEAR).ok).toBe(false);
		expect(validateSell(ok({ kind: 'house', builtYear: '1899' }), YEAR).ok).toBe(false);
	});

	it('J-105 ③ 面積のラベルは種別で変わる(未選択の間は「面積」)', () => {
		expect([areaLabel('mansion'), areaLabel('house'), areaLabel('land'), areaLabel('')]).toEqual(['専有面積', '建物面積', '土地面積', '面積']);
	});

	it('J-105 ③ 確認行:土地では築年・間取りの行が出ない。備考のラベルは「ご要望・ご質問」', () => {
		const mansion = sellRows(ok({ areaSqm: '65.5', builtYear: '2005', layout: '2LDK', timing: '6m' }));
		expect(mansion.map((r) => r.label)).toEqual(['物件種別', '所在地', '専有面積', '築年', '間取り', '現況', '売却希望時期', '査定の種類', 'お名前', 'ふりがな', '電話番号', 'メール', '希望連絡方法', 'ご要望・ご質問']);
		expect(mansion[1].value).toBe('葛飾区青戸0-0-0');
		expect(mansion[2].value).toBe('65.5㎡');
		const land = sellRows(ok({ kind: 'land' }));
		expect(land.map((r) => r.label)).not.toContain('築年');
		expect(land.map((r) => r.label)).not.toContain('間取り');
		// 任意の未入力は「—」(03 §6 フォーム部品 7)
		expect(land.find((r) => r.label === '売却希望時期')?.value).toBe('—');
	});

	it('J-105 ③ FormData の読み取り:無いキーは空、件名は種別と査定の種類', () => {
		const fd = new Map<string, string>([
			['kind', 'land'],
			['ward', 'sumida'],
			['assessment', 'visit'],
			['agree', 'on'],
		]);
		const v = readSell({ get: (k) => fd.get(k) ?? null });
		expect([v.kind, v.ward, v.assessment, v.agree, v.address, v.layout]).toEqual(['land', 'sumida', 'visit', true, '', '']);
		expect(sellSubject(ok({ kind: 'land', assessment: 'visit' }))).toBe('[査定依頼] 土地・訪問査定');
	});
});
