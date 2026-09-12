import { describe, expect, it } from 'vitest';
import { monthlyFeeLabel, monthlyTotalLabel } from '@/lib/summary';

describe('summary.ts', () => {
	it('J-059 → J-070 月額の合計は「管理費・修繕 月18,000円」。片方だけでも出し、0 と null は出さない', () => {
		expect(monthlyTotalLabel(12000, 6000)).toBe('管理費・修繕 月18,000円');
		expect(monthlyTotalLabel(12000, null)).toBe('管理費・修繕 月12,000円');
		expect(monthlyTotalLabel(0, 0)).toBeNull();
		expect(monthlyTotalLabel(null, null)).toBeNull();
	});

	it('J-047 月額の費用は万円表記(12,000 → 1.2万円、10,000 → 1万円、0 と null は —)', () => {
		expect(monthlyFeeLabel(12000)).toBe('1.2万円');
		expect(monthlyFeeLabel(10000)).toBe('1万円');
		expect(monthlyFeeLabel(0)).toBe('—');
		expect(monthlyFeeLabel(null)).toBe('—');
	});
});
