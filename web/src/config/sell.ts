/**
 * 査定依頼フォーム(/sell)の選択肢と文言(実装順 5・J-105 ③)。
 * 共通の選択肢は config/forms.ts。slug は Zod の enum に使う。
 * 物件種別の slug は既存のタクソノミー property_kind に合わせる(賃貸用の apartment / house_rental は出さない)。
 * 区の slug はタクソノミー area の親(4区)に other(対応エリア外)を足したもの。
 */

export const SELL_KINDS = [
	{ slug: 'mansion', label: 'マンション' },
	{ slug: 'house', label: '戸建' },
	{ slug: 'land', label: '土地' },
] as const;
export type SellKind = (typeof SELL_KINDS)[number]['slug'];

/** 面積のラベルは種別で変える(専有面積 / 建物面積 / 土地面積)。欄は1つ */
export const AREA_LABEL: Readonly<Record<SellKind, string>> = {
	mansion: '専有面積',
	house: '建物面積',
	land: '土地面積',
};

/** 土地では築年・間取りの欄を出さない(SHIN の項目表・J-105) */
export const hasBuiltAndLayout = (kind: SellKind): boolean => kind !== 'land';

/** 所在地の区。対応エリア外も受けるので other を置く(自由入力側に町名以下を書いてもらう) */
export const SELL_WARDS = [
	{ slug: 'katsushika', label: '葛飾区' },
	{ slug: 'edogawa', label: '江戸川区' },
	{ slug: 'adachi', label: '足立区' },
	{ slug: 'sumida', label: '墨田区' },
	{ slug: 'other', label: 'その他' },
] as const;
export type SellWard = (typeof SELL_WARDS)[number]['slug'];

export const SELL_CONDITIONS = [
	{ slug: 'live', label: '居住中' },
	{ slug: 'vacant', label: '空き' },
	{ slug: 'rented', label: '賃貸中' },
] as const;
export type SellCondition = (typeof SELL_CONDITIONS)[number]['slug'];

/** 売却希望時期は日付ではなく選択肢(lib/forms/dates.ts は使わない) */
export const SELL_TIMINGS = [
	{ slug: '3m', label: '3ヶ月以内' },
	{ slug: '6m', label: '半年以内' },
	{ slug: '1y', label: '1年以内' },
	{ slug: 'undecided', label: '未定' },
] as const;
export type SellTiming = (typeof SELL_TIMINGS)[number]['slug'];

/** 査定の種類(01 §11 の判断ポイント)。「相談してから」があるので必須にしても詰まらない(SHIN・09/17) */
export const SELL_ASSESSMENTS = [
	{ slug: 'desk', label: '机上査定' },
	{ slug: 'visit', label: '訪問査定' },
	{ slug: 'later', label: '相談してから決める' },
] as const;
export type SellAssessment = (typeof SELL_ASSESSMENTS)[number]['slug'];

/** 間取りは一覧の選択肢(lib/search の LAYOUTS)+ その他 */
export const LAYOUT_OTHER = 'other';

/** 備考のラベル(任意。commonRows の引数に渡す) */
export const SELL_NOTE_LABEL = 'ご要望・ご質問';
