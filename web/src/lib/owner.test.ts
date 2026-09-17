import { describe, expect, it } from 'vitest';
import { EMPTY_OWNER, ownerRows, ownerSubject, readOwner, validateOwner, type OwnerInput } from '@/lib/owner';

/** 通る最小の入力(共通の必須3つ + 固有の必須3つ) */
const ok = (over: Partial<OwnerInput> = {}): OwnerInput => ({
	...EMPTY_OWNER,
	name: '架空 太郎',
	phone: '03-0000-0000',
	agree: true,
	topic: 'entrust',
	ward: 'katsushika',
	address: '青戸0-0-0',
	...over,
});

describe('owner.ts', () => {
	it('J-108 固有の必須は 相談内容・所在地(区+住所)。戸数と管理状況は任意', () => {
		const r = validateOwner(EMPTY_OWNER);
		expect(r.ok).toBe(false);
		if (r.ok) return;
		expect(Object.keys(r.errors).sort()).toEqual(['address', 'agree', 'name', 'phone', 'topic', 'ward']);
		expect(validateOwner(ok()).ok).toBe(true); // 戸数・管理状況・備考が空でも通る
	});

	it('J-105 ④ 相談内容に「売却」は無い(査定依頼へ分けたため)', () => {
		expect(validateOwner(ok({ topic: 'sale' as OwnerInput['topic'] })).ok).toBe(false);
		expect(validateOwner(ok({ topic: 'vacancy' })).ok).toBe(true);
	});

	it('J-108 戸数は任意だが、入っていれば 1〜1000 の整数', () => {
		expect(validateOwner(ok({ units: '' })).ok).toBe(true);
		expect(validateOwner(ok({ units: '1' })).ok).toBe(true);
		expect(validateOwner(ok({ units: '1000' })).ok).toBe(true);
		expect(validateOwner(ok({ units: '0' })).ok).toBe(false);
		expect(validateOwner(ok({ units: '1001' })).ok).toBe(false);
		expect(validateOwner(ok({ units: '2.5' })).ok).toBe(false);
		const r = validateOwner(ok({ units: '八戸' }));
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.errors.units).toBe('戸数は1以上の整数で入力してください(最大1000)');
	});

	it('J-108 戸数は全角とカンマを直してから読む(通った値も半角で残す)', () => {
		const r = validateOwner(ok({ units: '１,２００' }));
		expect(r.ok).toBe(false); // 1200 は上限超え
		const z = validateOwner(ok({ units: '１２０' }));
		expect(z.ok).toBe(true);
		if (z.ok) expect(z.values.units).toBe('120');
	});

	it('J-105 ④ 区が「その他」でも住所は必須(③ と同じ)', () => {
		expect(validateOwner(ok({ ward: 'other', address: '' })).ok).toBe(false);
		expect(validateOwner(ok({ ward: 'other', address: '架空市0-0-0' })).ok).toBe(true);
	});

	it('J-108 確認行の並びと空欄の「—」。備考のラベルは「ご相談の内容」', () => {
		const rows = ownerRows(ok({ units: '12', manage: 'self' }));
		expect(rows.map((r) => r.label)).toEqual(['ご相談の種類', '物件所在地', '戸数', '現在の管理状況', 'お名前', 'ふりがな', '電話番号', 'メール', '希望連絡方法', 'ご相談の内容']);
		expect(rows[1].value).toBe('葛飾区青戸0-0-0');
		expect(rows[2].value).toBe('12戸');
		const bare = ownerRows(ok());
		expect(bare[2].value).toBe('—');
		expect(bare[3].value).toBe('—');
	});

	it('J-108 FormData の読み取り:無いキーは空。件名は相談の種類', () => {
		const fd = new Map<string, string>([
			['topic', 'vacancy'],
			['ward', 'adachi'],
			['agree', 'on'],
		]);
		const v = readOwner({ get: (k) => fd.get(k) ?? null });
		expect([v.topic, v.ward, v.agree, v.address, v.units, v.manage]).toEqual(['vacancy', 'adachi', true, '', '', '']);
		expect(ownerSubject(ok({ topic: 'vacancy' }))).toBe('[管理・空室のご相談] 空室のご相談');
	});
});
