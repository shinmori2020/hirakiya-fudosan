/**
 * 「この物件のポイント」チップ(J-039・J-040)。データから導出する純関数。新しい文章は作らない。
 * 最大3つ。優先順:1 駅徒歩(最寄1駅目 5分以内 → 「駅徒歩5分以内」/ 6〜10分 → 「駅徒歩10分以内」)
 *                2 築年(築0年 → 「新築」/ 築5年以内 → 「築浅・築N年」)
 *                3 設備:02 §2 の並び順。エアコンは全件が持つので除外
 * 合うものが3つ未満なら少ないまま。
 * 各チップは同じ条件の一覧へのリンク(J-040)。URL は lib/search.ts のクエリ名(walk_max / built_max / feature)に合わせる。
 * 新築は built_max=1(J-040 で一覧の築年数セレクトに「1年以内」を追加)。売買は type=sale を付ける。
 */
import type { PropertySummary, PropertyType } from '@/types/property';
import { builtYears } from '@/lib/search';

export const POINT_MAX = 3;
export const WALK_NEAR = 5;
export const WALK_MID = 10;
export const BUILT_NEW_MAX = 5;
export const BUILT_BRAND_NEW_MAX = 1;

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

export function pointChips(
	p: Pick<PropertySummary, 'stations' | 'builtYm' | 'features' | 'type'>,
	featureName: (slug: string) => string,
	now: Date = new Date(),
): PointChip[] {
	const out: PointChip[] = [];
	const href = (params: Record<string, string | number>) => {
		const sp = new URLSearchParams();
		if ((p.type as PropertyType) === 'sale') sp.set('type', 'sale');
		for (const [k, v] of Object.entries(params)) sp.set(k, String(v));
		return `/properties?${sp.toString()}`;
	};

	const walk = p.stations[0]?.walk;
	if (walk != null && walk <= WALK_NEAR) out.push({ label: `駅徒歩${WALK_NEAR}分以内`, href: href({ walk_max: WALK_NEAR }) });
	else if (walk != null && walk <= WALK_MID) out.push({ label: `駅徒歩${WALK_MID}分以内`, href: href({ walk_max: WALK_MID }) });

	const years = builtYears(p.builtYm, now);
	if (years === 0) out.push({ label: '新築', href: href({ built_max: BUILT_BRAND_NEW_MAX }) });
	else if (years != null && years <= BUILT_NEW_MAX) out.push({ label: `築浅・築${years}年`, href: href({ built_max: BUILT_NEW_MAX }) });

	for (const slug of FEATURE_PRIORITY) {
		if (out.length >= POINT_MAX) break;
		if (p.features.includes(slug)) out.push({ label: featureName(slug), href: href({ feature: slug }) });
	}
	return out.slice(0, POINT_MAX);
}
