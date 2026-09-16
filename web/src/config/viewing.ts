/**
 * 内見予約(/viewing)の選択肢(J-105)。
 * 時間帯は営業時間 9:30〜18:30 を3区分(SHIN の項目表・09/16)。slug は URL やデータに出ず、フォームの値にだけ使う。
 */
export const TIME_SLOTS = [
	{ slug: 'morning', label: '午前(9:30〜12:00)' },
	{ slug: 'afternoon', label: '午後(13:00〜15:00)' },
	{ slug: 'evening', label: '夕方(15:00〜18:30)' },
] as const;
export type TimeSlot = (typeof TIME_SLOTS)[number]['slug'];

/** 定休日(0 = 日 … 6 = 土)。site.ts の company.closed(「水曜」)と同じ意味。選べなくはせず、確認画面で注記する */
export const CLOSED_WEEKDAY = 3;
