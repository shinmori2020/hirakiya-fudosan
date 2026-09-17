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

/**
 * 所在地の区(査定 /sell・管理相談 /owner で共通。J-107 で ③ に作り、④ の着手時にここへ移した)。
 * slug はタクソノミー area の親(4区)に合わせ、対応エリア外を受けるため other を足す。
 */
export const WARDS = [
	{ slug: 'katsushika', label: '葛飾区' },
	{ slug: 'edogawa', label: '江戸川区' },
	{ slug: 'adachi', label: '足立区' },
	{ slug: 'sumida', label: '墨田区' },
	{ slug: 'other', label: 'その他' },
] as const;
export type Ward = (typeof WARDS)[number]['slug'];

/** 折り返しの目安(一律・J-102 d) */
export const REPLY_BY = '翌営業日まで';

/** 送信元の部署名(完了画面・自動返信。担当者名は出さない・J-102 d) */
export const DEPARTMENT = {
	viewing: '賃貸部',
	contact: '賃貸部',
	sell: '売買部', // 担当は売買主任(仮名 一郎)だが担当者名は出さない
	owner: '管理部', // 同上(架空 次郎・管理部主任)。使うのは ④ 着手時
} as const;
