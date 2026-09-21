import { describe, expect, it } from 'vitest';
import { nextOpenDay, openStatus, parseClosedDay, parseHours, tokyoClock } from './open-status';

/** Asia/Tokyo の日時を UTC の Date に(JST = UTC+9) */
const jst = (y: number, mo: number, d: number, h: number, mi: number) => new Date(Date.UTC(y, mo - 1, d, h - 9, mi));

describe('J-143 営業中の判定(純関数・Asia/Tokyo 固定)', () => {
	it('03 §7:営業時間の文字列を分に直す', () => {
		expect(parseHours('9:30〜18:30')).toEqual([570, 1110]);
	});
	it('03 §7:定休日の曜日を数に直す(「水曜」→ 3)', () => {
		expect(parseClosedDay('水曜')).toBe(3);
	});
	it('03 §7:端末のタイムゾーンに左右されず Asia/Tokyo で読む(UTC 0:00 = JST 9:00 月曜)', () => {
		// 2026-09-21 は月曜
		expect(tokyoClock(new Date(Date.UTC(2026, 8, 21, 0, 0)))).toEqual({ weekday: 1, minutes: 540 });
	});
	it('03 §7:営業時間内は「営業中」(月曜 12:00)', () => {
		expect(openStatus(jst(2026, 9, 21, 12, 0), '9:30〜18:30', '水曜')).toEqual({ state: 'open', label: '営業中 9:30〜18:30' });
	});
	it('03 §7:境界 — 開店の 9:30 ちょうどは営業中、閉店の 18:30 ちょうどは終了', () => {
		expect(openStatus(jst(2026, 9, 21, 9, 30), '9:30〜18:30', '水曜').state).toBe('open');
		expect(openStatus(jst(2026, 9, 21, 18, 30), '9:30〜18:30', '水曜').state).toBe('closed');
	});
	it('03 §7:閉店後は「本日は終了しました・翌営業日は◯曜」(月曜 19:00 → 火曜)', () => {
		expect(openStatus(jst(2026, 9, 21, 19, 0), '9:30〜18:30', '水曜').label).toBe('本日は終了しました・翌営業日は火曜');
	});
	it('03 §7:火曜の閉店後は翌営業日が水曜(定休)を飛ばして木曜', () => {
		expect(openStatus(jst(2026, 9, 22, 19, 0), '9:30〜18:30', '水曜').label).toBe('本日は終了しました・翌営業日は木曜');
	});
	it('03 §7:定休日は時刻にかかわらず「本日定休日・翌営業日は木曜」(水曜 12:00)', () => {
		expect(openStatus(jst(2026, 9, 23, 12, 0), '9:30〜18:30', '水曜')).toEqual({ state: 'holiday', label: '本日定休日・翌営業日は木曜' });
	});
	it('03 §7:開店前(9:00)は状態文を出さず、現状の文言のまま(label は null)', () => {
		expect(openStatus(jst(2026, 9, 21, 9, 0), '9:30〜18:30', '水曜')).toEqual({ state: 'before', label: null });
	});
	it('03 §7:翌営業日の計算 — 土曜の次は日曜(定休ではないので飛ばさない)', () => {
		expect(nextOpenDay(6, 3)).toBe('日曜');
		expect(nextOpenDay(2, 3)).toBe('木曜');
	});
});
