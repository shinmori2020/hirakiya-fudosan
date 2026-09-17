/**
 * 管理・空室相談フォーム(/owner)の選択肢と文言(実装順 5・J-105 ④ → J-108)。
 * 共通の選択肢(希望連絡方法・区・部署名)は config/forms.ts。slug は Zod の enum に使う。
 * 相談内容から「売却」を外し、上部に査定依頼へのリンクを置く(SHIN の項目表・J-105)。
 */

export const OWNER_TOPICS = [
	{ slug: 'entrust', label: '管理委託' },
	{ slug: 'vacancy', label: '空室のご相談' },
] as const;
export type OwnerTopic = (typeof OWNER_TOPICS)[number]['slug'];

/** 現在の管理状況(任意) */
export const OWNER_MANAGES = [
	{ slug: 'self', label: '自主管理' },
	{ slug: 'other', label: '他社管理' },
] as const;
export type OwnerManage = (typeof OWNER_MANAGES)[number]['slug'];

/** 戸数の上限(J-108)。桁の打ち間違い(8000・電話番号の貼り付け)をその場で気づかせるための上限 */
export const UNITS_MAX = 1000;

/** 備考のラベル(任意。commonRows の引数に渡す) */
export const OWNER_NOTE_LABEL = 'ご相談の内容';

/** 売却の相談はこちらへ(相談内容から外した分の導線・J-105) */
export const SELL_LINK = { href: '/sell#form', text: '売却をご検討の方は査定依頼へ' } as const;
