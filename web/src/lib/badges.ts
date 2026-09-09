/**
 * 新着・値下げの判定(docs/02 §2・§3、rules/search.md §3)。
 * タクソノミーやフィールドに「新着」「値下げ」を持たせず、日付と価格から導出する。
 */
import type { PropertySummary } from '@/types/property';

export const NEW_DAYS = 14;

/** 公開日から NEW_DAYS 日以内 */
export function isNew(p: Pick<PropertySummary, 'publishedOn'>, now: Date = new Date()): boolean {
	if (!p.publishedOn) return false;
	const published = new Date(`${p.publishedOn}T00:00:00+09:00`);
	const diff = (now.getTime() - published.getTime()) / 86_400_000;
	return diff >= 0 && diff <= NEW_DAYS;
}

/** 前回価格が現在より高い(期間の条件は付けない) */
export function isDiscounted(p: Pick<PropertySummary, 'rent' | 'rentPrevious' | 'price' | 'pricePrevious'>): boolean {
	if (p.rentPrevious && p.rent) return p.rentPrevious > p.rent;
	if (p.pricePrevious && p.price) return p.pricePrevious > p.price;
	return false;
}

export type Badge = 'sold' | 'negotiating' | 'discount' | 'new';

/** 表示するバッジ。優先度 成約済み > 商談中 > 値下げ > 新着。最大2つ。成約済みは単独(新着・値下げを併記しない・J-038) */
export function badgesFor(p: PropertySummary, now: Date = new Date()): Badge[] {
	if (p.status === 'sold') return ['sold'];
	const out: Badge[] = [];
	if (p.status === 'negotiating') out.push('negotiating');
	if (isDiscounted(p)) out.push('discount');
	if (isNew(p, now)) out.push('new');
	return out.slice(0, 2);
}

export const BADGE_LABEL: Record<Badge, string> = {
	sold: '成約済み',
	negotiating: '商談中',
	discount: '値下げ',
	new: '新着',
};
