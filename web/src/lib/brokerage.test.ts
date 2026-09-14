import { describe, expect, it } from 'vitest';
import { brokerageCapLabel, brokerageCapYen, CONSUMPTION_TAX_RATE } from '@/lib/brokerage';

describe('brokerage.ts', () => {
	it('J-094 上限は 価格 × 3% + 6万円 + 消費税(3,100万円 → 1,089,000円)', () => {
		// 31,000,000 × 0.03 = 930,000 / +60,000 = 990,000 / ×1.1 = 1,089,000
		expect(brokerageCapYen(3100)).toBe(1089000);
		expect(brokerageCapLabel(3100)).toBe('1,089,000円');
	});

	it('J-094 価格が変われば比例して増える(2,000万円 → 726,000円 / 7,000万円 → 2,376,000円)', () => {
		expect(brokerageCapYen(2000)).toBe(726000);
		expect(brokerageCapYen(7000)).toBe(2376000);
	});

	it('J-094 400万円以下は式が変わるので出さない(02 §6 の価格は 2,000〜7,000万円)', () => {
		expect(brokerageCapYen(400)).toBeNull();
		expect(brokerageCapYen(300)).toBeNull();
		expect(brokerageCapYen(401)).toBe(1000 * 0 + Math.floor((4010000 * 0.03 + 60000) * 1.1));
	});

	it('J-094 価格が無い物件(賃貸)は出さない', () => {
		expect(brokerageCapYen(null)).toBeNull();
		expect(brokerageCapYen(undefined)).toBeNull();
		expect(brokerageCapLabel(null)).toBeNull();
	});

	it('J-094 端数は切り捨てる(上限額なので超えない側に倒す)', () => {
		// 02 の価格は万円単位なので実際には端数が出ないが、式としては切り捨てを保証する
		const raw = (4105 * 10000 * 0.03 + 60000) * (1 + CONSUMPTION_TAX_RATE);
		expect(brokerageCapYen(4105)).toBe(Math.floor(raw));
		expect(brokerageCapYen(4105)).toBeLessThanOrEqual(raw);
	});

	it('J-094 消費税率は定数で持つ(税率が変わる時にここだけ直す)', () => {
		expect(CONSUMPTION_TAX_RATE).toBe(0.1);
	});
});
