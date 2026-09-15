/**
 * 内見予約・問い合わせフォーム(/contact)の選択肢(実装順 5・J-102)。
 * 3本のフォームは別実装(J-007)なので、ここは /contact の分だけ。/sell /owner は自分の config を持つ。
 * slug は URL(`?kind=`)と Zod の enum に使う。**これは初案の slug**(forms.md §1)。
 */

export const CONTACT_KINDS = [
	{ slug: 'viewing', label: '内見希望' },
	{ slug: 'vacancy', label: '空室確認' },
	{ slug: 'question', label: '質問' },
	{ slug: 'visit', label: '来店予約' },
	{ slug: 'corporate', label: '法人のお問い合わせ' },
	{ slug: 'recruit', label: '採用のお問い合わせ' },
] as const;
export type ContactKind = (typeof CONTACT_KINDS)[number]['slug'];

/** `?kind=` が無い・不正な時の種別 */
export const DEFAULT_KIND: ContactKind = 'question';

/** 希望日時の時間帯(03 §6 フォーム部品 2。カレンダー UI は作らない) */
export const TIME_SLOTS = [
	{ slug: 'morning', label: '午前' },
	{ slug: 'afternoon', label: '午後' },
	{ slug: 'evening', label: '夕方以降' },
] as const;
export type TimeSlot = (typeof TIME_SLOTS)[number]['slug'];

/** 希望連絡方法(forms.md §1 の共通項目) */
export const CONTACT_METHODS = [
	{ slug: 'phone', label: '電話' },
	{ slug: 'email', label: 'メール' },
	{ slug: 'line', label: 'LINE' },
] as const;
export type ContactMethod = (typeof CONTACT_METHODS)[number]['slug'];

/** 送信元の部署名(完了画面・自動返信。担当者名は出さない・J-102 d) */
export const CONTACT_DEPARTMENT = '賃貸部';

/** 折り返しの目安(一律・J-102 d) */
export const CONTACT_REPLY_BY = '翌営業日まで';
