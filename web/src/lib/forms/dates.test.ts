import { describe, expect, it } from 'vitest';
import { isClosedDay, isPastDate, parseDateOnly, preferredLabel, todayJst, weekdayOf } from '@/lib/forms/dates';

describe('forms/dates.ts', () => {
	it('J-105 日付は暦日として扱い、存在しない日と形の違う値は落とす', () => {
		expect(parseDateOnly('2026-09-20')).toEqual({ y: 2026, m: 9, d: 20 });
		expect(parseDateOnly('2026-02-30')).toBeNull();
		expect(parseDateOnly('2026/09/20')).toBeNull();
	});

	it('J-105 過去日は today との文字列比較。今日は可', () => {
		expect(isPastDate('2026-09-15', '2026-09-16')).toBe(true);
		expect(isPastDate('2026-09-16', '2026-09-16')).toBe(false);
	});

	it('J-105 曜日:2026-09-16 は水曜(3)。定休日の判定は曜日番号で', () => {
		expect(weekdayOf('2026-09-16')).toBe(3);
		expect(weekdayOf('bad')).toBeNull();
		expect(isClosedDay('2026-09-16', 3)).toBe(true);
		expect(isClosedDay('2026-09-17', 3)).toBe(false);
	});

	it('J-105 表示は「2026年9月20日(日) 午前(9:30〜12:00)」。時間帯が無ければ日付だけ、日付が無ければ空', () => {
		expect(preferredLabel('2026-09-20', '午前(9:30〜12:00)')).toBe('2026年9月20日(日) 午前(9:30〜12:00)');
		expect(preferredLabel('2026-09-20', '')).toBe('2026年9月20日(日)');
		expect(preferredLabel('', '午前(9:30〜12:00)')).toBe('');
	});

	it('J-105 今日(日本時間)は UTC の日付とずれうる(UTC 15:30 は JST では翌日)', () => {
		expect(todayJst(new Date('2026-09-15T15:30:00Z'))).toBe('2026-09-16');
		expect(todayJst(new Date('2026-09-15T14:30:00Z'))).toBe('2026-09-15');
	});
});
