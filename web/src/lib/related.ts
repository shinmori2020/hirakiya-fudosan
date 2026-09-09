/**
 * 関連物件(01 §3-7「同じエリア・同条件の物件 4件」)。純関数。これは初案。
 * 優先:同じ種別 × 同じ町 → 同じ種別 × 同じ沿線 → 同じ種別。成約済みと自分自身は除く。新着順。
 */
import type { PropertySummary } from '@/types/property';

export function relatedProperties(all: PropertySummary[], self: PropertySummary, limit = 4): PropertySummary[] {
	const pool = all.filter((p) => p.no !== self.no && p.type === self.type && p.status !== 'sold');
	const byDate = (a: PropertySummary, b: PropertySummary) => b.publishedOn.localeCompare(a.publishedOn) || a.no.localeCompare(b.no);
	const out: PropertySummary[] = [];
	const push = (list: PropertySummary[]) => {
		for (const p of list.sort(byDate)) {
			if (out.length >= limit) break;
			if (!out.some((o) => o.no === p.no)) out.push(p);
		}
	};
	push(pool.filter((p) => p.area === self.area));
	push(pool.filter((p) => p.lines.some((l) => self.lines.includes(l))));
	push(pool);
	return out.slice(0, limit);
}
