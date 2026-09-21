/**
 * 営業中の判定(03 §7・J-143)。**純関数**。現在時刻は呼び出し側が渡す(ビルド時刻で固定しないため・static-rendering.md)。
 * 時刻は Asia/Tokyo に固定して読む(閲覧者の端末のタイムゾーンに左右されない)。
 *
 * 返す文言は3つ + 開店前の「そのまま」:
 *   open   … 営業中 9:30〜18:30
 *   closed … 本日は終了しました・翌営業日は◯曜
 *   holiday… 本日定休日・翌営業日は◯曜
 *   before … 開店前(0:00〜9:29)。状態文は出さず、現状の「9:30〜18:30 / 水曜定休」のまま
 * 祝日・臨時休業は判定しない(データが無い。お知らせで告知する・03 §7)。
 */
const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'] as const;

export interface OpenStatus {
	state: 'open' | 'closed' | 'holiday' | 'before';
	/** 画面に出す文言。before は null(現状の文言を使う) */
	label: string | null;
}

/** 「9:30〜18:30」→ [570, 1110](分) */
export function parseHours(hours: string): [number, number] {
	const m = hours.match(/^(\d{1,2}):(\d{2})[〜~-](\d{1,2}):(\d{2})$/);
	if (!m) throw new Error(`営業時間の書式が読めない: ${hours}`);
	return [Number(m[1]) * 60 + Number(m[2]), Number(m[3]) * 60 + Number(m[4])];
}

/** 「水曜」→ 3 */
export function parseClosedDay(closed: string): number {
	const i = WEEKDAYS.indexOf(closed.replace(/曜.*$/, '') as (typeof WEEKDAYS)[number]);
	if (i < 0) throw new Error(`定休日の書式が読めない: ${closed}`);
	return i;
}

/** now を Asia/Tokyo の 曜日(0〜6)と 分(0〜1439)に直す */
export function tokyoClock(now: Date): { weekday: number; minutes: number } {
	const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tokyo', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(now);
	const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
	const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
	return { weekday, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

/** 翌営業日の曜日名(定休日を飛ばす) */
export function nextOpenDay(weekday: number, closedDay: number): string {
	let d = (weekday + 1) % 7;
	if (d === closedDay) d = (d + 1) % 7;
	return `${WEEKDAYS[d]}曜`;
}

export function openStatus(now: Date, hours: string, closed: string): OpenStatus {
	const [open, close] = parseHours(hours);
	const closedDay = parseClosedDay(closed);
	const { weekday, minutes } = tokyoClock(now);
	if (weekday === closedDay) return { state: 'holiday', label: `本日定休日・翌営業日は${nextOpenDay(weekday, closedDay)}` };
	if (minutes < open) return { state: 'before', label: null };
	if (minutes < close) return { state: 'open', label: `営業中 ${hours}` };
	return { state: 'closed', label: `本日は終了しました・翌営業日は${nextOpenDay(weekday, closedDay)}` };
}
