/**
 * 問い合わせフォーム(/contact)の選択肢(実装順 5・J-102 → J-105)。
 * 内見予約は /viewing に分けたので、種別に「内見希望」は無い(J-105)。共通の選択肢は config/forms.ts。
 * slug は URL(`?kind=`)と Zod の enum に使う。**これは初案の slug**(forms.md §1)。
 */

export const CONTACT_KINDS = [
	{ slug: 'vacancy', label: '空室確認' },
	{ slug: 'question', label: '質問' },
	{ slug: 'visit', label: '来店予約' },
	{ slug: 'corporate', label: '法人のお問い合わせ' },
	{ slug: 'recruit', label: '採用のお問い合わせ' },
] as const;
export type ContactKind = (typeof CONTACT_KINDS)[number]['slug'];

/** `?kind=` が無い・不正な時の種別(viewing が来ても「質問」に倒れる・J-105) */
export const DEFAULT_KIND: ContactKind = 'question';
