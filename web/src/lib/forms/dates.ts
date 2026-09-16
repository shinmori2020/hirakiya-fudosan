/**
 * 希望日時の純関数(J-102 → J-105 で共通化)。`<input type="date">` の 'YYYY-MM-DD' を、
 * 時刻に依らず**暦日**として扱う(タイムゾーンで日付がずれないように UTC の 0 時で組む)。
 */
const WEEKDAY = ['日', '月', '火', '水', '木', '金', '土'];

export function parseDateOnly(v: string): { y: number; m: number; d: number } | null {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
	if (!m) return null;
	const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
	const dt = new Date(Date.UTC(y, mo - 1, d));
	if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null; // 2月30日など
	return { y, m: mo, d };
}

/** 今日(暦日)より前か。today も 'YYYY-MM-DD' で渡す(文字列比較で足りる) */
export function isPastDate(v: string, today: string): boolean {
	return v < today;
}

/** 曜日(0 = 日 … 6 = 土)。形が違えば null */
export function weekdayOf(v: string): number | null {
	const p = parseDateOnly(v);
	return p ? new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay() : null;
}

/** 定休日か(J-105:選べなくはせず、確認画面で注記する) */
export function isClosedDay(v: string, closedWeekday: number): boolean {
	return weekdayOf(v) === closedWeekday;
}

/** '2026-09-20' + '午前(9:30〜12:00)' → '2026年9月20日(日) 午前(9:30〜12:00)'。日付が無ければ '' */
export function preferredLabel(date: string, slotLabel: string): string {
	const p = parseDateOnly(date);
	if (!p) return '';
	const w = WEEKDAY[new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()];
	return `${p.y}年${p.m}月${p.d}日(${w})${slotLabel ? ` ${slotLabel}` : ''}`;
}

/** 今日(日本時間)の 'YYYY-MM-DD'。Action が過去日の判定に使う */
export function todayJst(now: Date = new Date()): string {
	return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
