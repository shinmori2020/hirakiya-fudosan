/**
 * 一覧カードのカテゴリータグ(J-044・J-046)。データから導出する純関数。押せない表示専用。
 * 優先順:特集(02 §2 の順)> 設備(02 §2 の順・エアコンは全件が持つので除外)。最大2つ、0なら空配列。
 * 詳細のポイントタグ(lib/points.ts)と同じ語彙・同じ優先順だが、駅徒歩・築年は含めない
 * (カードには「曳舟駅 徒歩8分」「築18年」の行が別にあるため重複させない)。
 */
import type { PropertySummary } from '@/types/property';
import { COLLECTION_ORDER, FEATURE_PRIORITY } from '@/lib/points';

export const CARD_TAG_MAX = 2;

export function cardTags(
	p: Pick<PropertySummary, 'collections' | 'features'>,
	names: { collectionName: (slug: string) => string; featureName: (slug: string) => string },
): string[] {
	const out: string[] = [];
	for (const c of COLLECTION_ORDER) {
		if (out.length >= CARD_TAG_MAX) break;
		if (p.collections.includes(c)) out.push(names.collectionName(c));
	}
	for (const f of FEATURE_PRIORITY) {
		if (out.length >= CARD_TAG_MAX) break;
		// 特集と同じ意味の設備(ペット可 / 敷金礼金ゼロ)は特集側が既に入っていれば出さない
		if (f === 'pet-ok' && p.collections.includes('pet-ok')) continue;
		if (f === 'zero-deposit' && p.collections.includes('zero-deposit')) continue;
		if (p.features.includes(f)) out.push(names.featureName(f));
	}
	return out.slice(0, CARD_TAG_MAX);
}
