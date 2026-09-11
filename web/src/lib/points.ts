/**
 * 「この物件のポイント」チップ(J-039・J-040)。データから導出する純関数。新しい文章は作らない。
 * 最大3つ。優先順(J-040 調整・SHIN 09/10):
 *   1 特集(collection・02 §2 の名前をそのまま。並びは 02 §2 の順)
 *   2 駅徒歩(最寄1駅目 5分以内 → 「駅徒歩5分以内」/ 6〜10分 → 「駅徒歩10分以内」)
 *   3 築年(築0年 → 「新築」/ 築5年以内 → 「築浅・築N年」)
 *   4 設備:02 §2 の並び順。エアコンは全件が持つので除外
 * 重複除外:特集「駅徒歩5分」があれば駅徒歩の段を出さない。特集「新築・築浅」があれば築年の段を出さない。
 *           特集「ペット可」があれば設備「ペット可」を出さない(同じ意味を同じ物件に2つ出さない)。
 * 出さないもの(SHIN 決定):値下げ・種目・間取り・費用系・2駅利用可。
 * 合うものが3つ未満なら少ないまま。
 * 各チップは同じ条件の一覧へのリンク。URL は lib/links.ts の listHref(J-051 で他の属性リンクと同じ仕組みに統一)。
 * 新築は built_max=1。売買は type=sale を付ける。
 */
import type { PropertySummary, PropertyType } from '@/types/property';
import { listHref } from '@/lib/links';
import { builtYears } from '@/lib/search';

export const POINT_MAX = 3;
export const WALK_NEAR = 5;
export const WALK_MID = 10;
export const BUILT_NEW_MAX = 5;
export const BUILT_BRAND_NEW_MAX = 1;

/** 02 §2 の特集の並び */
export const COLLECTION_ORDER = ['central-30min', 'zero-deposit', 'pet-ok', 'house-rental', 'near-station', 'new-built'];

/** 02 §2 の設備の並び(FilterPanel と同じ)。エアコンは含めない */
export const FEATURE_PRIORITY = [
	'pet-ok',
	'autolock',
	'parking',
	'delivery-box',
	'separate-bath',
	'washstand',
	'reheating',
	'south-facing',
	'corner-room',
	'upper-floor',
	'zero-deposit',
	'move-in-now',
	'instrument-ok',
	'office-ok',
];

export interface PointChip {
	label: string;
	/** 同じ条件の一覧 URL */
	href: string;
}

export interface PointNames {
	featureName: (slug: string) => string;
	collectionName: (slug: string) => string;
}

export function pointChips(
	p: Pick<PropertySummary, 'stations' | 'builtYm' | 'features' | 'collections' | 'type'>,
	names: PointNames,
	now: Date = new Date(),
): PointChip[] {
	const out: PointChip[] = [];
	const href = (params: Record<string, string | number>) => listHref(p.type as PropertyType, params);

	// 1 特集(02 §2 の順)
	const cols = COLLECTION_ORDER.filter((c) => p.collections.includes(c));
	for (const c of cols) {
		if (out.length >= POINT_MAX) break;
		out.push({ label: names.collectionName(c), href: href({ collection: c }) });
	}

	// 2 駅徒歩(特集「駅徒歩5分」があれば出さない)
	const walk = p.stations[0]?.walk;
	if (!cols.includes('near-station')) {
		if (walk != null && walk <= WALK_NEAR) out.push({ label: `駅徒歩${WALK_NEAR}分以内`, href: href({ walk_max: WALK_NEAR }) });
		else if (walk != null && walk <= WALK_MID) out.push({ label: `駅徒歩${WALK_MID}分以内`, href: href({ walk_max: WALK_MID }) });
	}

	// 3 築年(特集「新築・築浅」があれば出さない)
	if (!cols.includes('new-built')) {
		const years = builtYears(p.builtYm, now);
		if (years === 0) out.push({ label: '新築', href: href({ built_max: BUILT_BRAND_NEW_MAX }) });
		else if (years != null && years <= BUILT_NEW_MAX) out.push({ label: `築浅・築${years}年`, href: href({ built_max: BUILT_NEW_MAX }) });
	}

	// 4 設備(特集「ペット可」があれば設備「ペット可」は出さない)
	for (const slug of FEATURE_PRIORITY) {
		if (out.length >= POINT_MAX) break;
		if (slug === 'pet-ok' && cols.includes('pet-ok')) continue;
		if (p.features.includes(slug)) out.push({ label: names.featureName(slug), href: href({ feature: slug }) });
	}
	return out.slice(0, POINT_MAX);
}
