/**
 * 「この物件のポイント」チップ(J-039)。データから導出する純関数。新しい文章は作らない。
 * 最大3つ。優先順:1 駅徒歩(最寄1駅目 5分以内 → 「駅徒歩5分以内」/ 6〜10分 → 「駅徒歩10分以内」)
 *                2 築年(築0年 → 「新築」/ 築5年以内 → 「築浅・築N年」)
 *                3 設備:02 §2 の並び順。エアコンは全件が持つので除外
 * 合うものが3つ未満なら少ないまま。
 */
import type { PropertySummary } from '@/types/property';
import { builtYears } from '@/lib/search';

export const POINT_MAX = 3;
export const WALK_NEAR = 5;
export const WALK_MID = 10;
export const BUILT_NEW_MAX = 5;

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

export function pointChips(p: Pick<PropertySummary, 'stations' | 'builtYm' | 'features'>, featureName: (slug: string) => string, now: Date = new Date()): string[] {
	const out: string[] = [];
	const walk = p.stations[0]?.walk;
	if (walk != null && walk <= WALK_NEAR) out.push(`駅徒歩${WALK_NEAR}分以内`);
	else if (walk != null && walk <= WALK_MID) out.push(`駅徒歩${WALK_MID}分以内`);

	const years = builtYears(p.builtYm, now);
	if (years === 0) out.push('新築');
	else if (years != null && years <= BUILT_NEW_MAX) out.push(`築浅・築${years}年`);

	for (const slug of FEATURE_PRIORITY) {
		if (out.length >= POINT_MAX) break;
		if (p.features.includes(slug)) out.push(featureName(slug));
	}
	return out.slice(0, POINT_MAX);
}
