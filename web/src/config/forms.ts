/**
 * フォーム4本の共通の選択肢と文言(J-105)。
 * ロジックと I/O は共通、UI と Server Action の流れは別実装(J-007 の出所は工程の比較なので、共通化は記録に影響しない)。
 * フォーム固有の選択肢は config/contact.ts(種別)・config/viewing.ts(時間帯)に置く。
 */

/** 希望連絡方法(forms.md §1 の共通項目) */
export const CONTACT_METHODS = [
	{ slug: 'phone', label: '電話' },
	{ slug: 'email', label: 'メール' },
	{ slug: 'line', label: 'LINE' },
] as const;
export type ContactMethod = (typeof CONTACT_METHODS)[number]['slug'];

/** 折り返しの目安(一律・J-102 d) */
export const REPLY_BY = '翌営業日まで';

/** 送信元の部署名(完了画面・自動返信。担当者名は出さない・J-102 d)。/sell /owner は着手時に足す */
export const DEPARTMENT = {
	viewing: '賃貸部',
	contact: '賃貸部',
} as const;
