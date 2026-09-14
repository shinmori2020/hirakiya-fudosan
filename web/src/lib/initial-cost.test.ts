import { describe, expect, it } from 'vitest';
import { brokerageMonths, initialCostLabel, initialCostTotal, monthsLabel } from '@/lib/initial-cost';

describe('initial-cost.ts', () => {
	it('J-081 仲介手数料の select は月数に直す(家賃1ヶ月 = 1・0.5ヶ月 = 0.5・無料 = 0)', () => {
		expect(brokerageMonths('家賃1ヶ月')).toBe(1);
		expect(brokerageMonths('0.5ヶ月')).toBe(0.5);
		expect(brokerageMonths('無料')).toBe(0);
	});

	it('J-081 読めない文字列と空は null(推測で 0 や 1 にしない)', () => {
		expect(brokerageMonths('要相談')).toBeNull();
		expect(brokerageMonths('')).toBeNull();
		expect(brokerageMonths(null)).toBeNull();
	});

	it('J-081 合計は 家賃+管理費+敷金+礼金+仲介手数料 の5項目(家賃1ヶ月)', () => {
		// 80,000 × (1 + 2 + 1 + 1) + 5,000 = 405,000
		expect(initialCostTotal({ rent: 80000, maintenanceFee: 5000, depositMonths: 2, keyMoneyMonths: 1, brokerageFee: '家賃1ヶ月' })).toBe(405000);
	});

	it('J-081 仲介手数料 0.5ヶ月は家賃の半額を足す', () => {
		// 80,000 × (1 + 1 + 1 + 0.5) + 5,000 = 285,000
		expect(initialCostTotal({ rent: 80000, maintenanceFee: 5000, depositMonths: 1, keyMoneyMonths: 1, brokerageFee: '0.5ヶ月' })).toBe(285000);
	});

	it('J-081 仲介手数料が無料なら家賃分を足さない', () => {
		// 80,000 × (1 + 1 + 1) + 5,000 = 245,000
		expect(initialCostTotal({ rent: 80000, maintenanceFee: 5000, depositMonths: 1, keyMoneyMonths: 1, brokerageFee: '無料' })).toBe(245000);
	});

	it('J-081 敷金・礼金が 0 の物件は家賃+管理費+仲介手数料だけになる', () => {
		// 75,000 × (1 + 0 + 0 + 1) + 0 = 150,000
		expect(initialCostTotal({ rent: 75000, maintenanceFee: 0, depositMonths: 0, keyMoneyMonths: 0, brokerageFee: '家賃1ヶ月' })).toBe(150000);
	});

	it('J-081 1円未満の端数は切り上げる(実際より少なく見せない)', () => {
		// 75,001 × (1 + 0.5) = 112,501.5 → 112,502
		expect(initialCostTotal({ rent: 75001, maintenanceFee: 0, depositMonths: 0, keyMoneyMonths: 0, brokerageFee: '0.5ヶ月' })).toBe(112502);
	});

	it('J-081 家賃が無い(売買)と仲介手数料が読めない物件は合計を出さない', () => {
		expect(initialCostTotal({ rent: null, maintenanceFee: 0, depositMonths: 1, keyMoneyMonths: 1, brokerageFee: '家賃1ヶ月' })).toBeNull();
		expect(initialCostTotal({ rent: 80000, maintenanceFee: 0, depositMonths: 1, keyMoneyMonths: 1, brokerageFee: '要相談' })).toBeNull();
	});

	it('J-081 表示はカンマ区切りの円。出せない時は null', () => {
		expect(initialCostLabel({ rent: 80000, maintenanceFee: 5000, depositMonths: 2, keyMoneyMonths: 1, brokerageFee: '家賃1ヶ月' })).toBe('405,000円');
		expect(initialCostLabel({ rent: null, maintenanceFee: null, depositMonths: null, keyMoneyMonths: null, brokerageFee: null })).toBeNull();
	});

	it('J-081 敷金・礼金の表示は 0 を「なし」にする(情報表と揃える)', () => {
		expect(monthsLabel(2)).toBe('2ヶ月');
		expect(monthsLabel(0)).toBe('なし');
		expect(monthsLabel(null)).toBe('なし');
	});
});
