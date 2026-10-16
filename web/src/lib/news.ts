/**
 * お知らせ・コラム(実装順 7・01 §17)。純関数。これは初案。
 *  - newsRelatedProperties:記事の「関係する物件」(記事ごとの条件:種別 + 駅〔任意〕)。成約済みは除く。新着順
 *  - newsRelatedHref:その条件の一覧への URL(「すべて見る」)。URL の作り方は lib/links.ts の listHref に寄せる(J-051)
 *  - relatedNews:記事の下の「ほかの記事」。自分を除き、同じカテゴリー → それ以外 の順、それぞれ新しい順
 */
import { listHref } from '@/lib/links';
import type { PropertySummary } from '@/types/property';

export interface NewsRelatedCondition {
	type: 'rental' | 'sale';
	station?: string;
}

export interface NewsLike {
	slug: string;
	date: string;
	category: string;
}

const byNewest = (a: PropertySummary, b: PropertySummary) => b.publishedOn.localeCompare(a.publishedOn) || a.no.localeCompare(b.no);

/** 記事の条件に合う物件(成約済みを除く・新着順・最大 limit 件)。条件が無ければ空 */
export function newsRelatedProperties(all: readonly PropertySummary[], cond: NewsRelatedCondition | undefined, limit = 4): PropertySummary[] {
	if (!cond) return [];
	return all
		.filter((p) => p.type === cond.type && p.status !== 'sold')
		.filter((p) => !cond.station || p.stations.some((s) => s.slug === cond.station))
		.sort(byNewest)
		.slice(0, limit);
}

/** 記事の条件の一覧への URL。条件が無ければ null */
export function newsRelatedHref(cond: NewsRelatedCondition | undefined): string | null {
	if (!cond) return null;
	return listHref(cond.type, cond.station ? { station: cond.station } : {});
}

/** ほかの記事(自分を除く・同じカテゴリーを先に・それぞれ新しい順・最大 limit 件) */
export function relatedNews<T extends NewsLike>(all: readonly T[], self: NewsLike, limit = 2): T[] {
	const byDate = (a: T, b: T) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug);
	const others = all.filter((n) => n.slug !== self.slug);
	const same = others.filter((n) => n.category === self.category).sort(byDate);
	const rest = others.filter((n) => n.category !== self.category).sort(byDate);
	return [...same, ...rest].slice(0, limit);
}
