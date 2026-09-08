'use client';

import { serviceAreas } from '@/config/site';
import type { PropertySummary } from '@/types/property';
import { applyQuery, relaxCandidates, type SearchQuery } from '@/lib/search';
import type { TermMaps } from '@/components/search/FilterPanel';

/**
 * 0件時(01 §2-7・rules/search.md §4)。これは初案。
 * 「該当なし」で止めず、条件を1つ緩める候補(件数付き)+ 近隣エリア(同じ区の13町の中だけ)を出す。
 * 候補の並びは仮に「件数が多い順」。緩める順序は SHIN の判断。
 */
export function EmptyState({ all, q, onChange, terms, now }: { all: PropertySummary[]; q: SearchQuery; onChange: (q: SearchQuery) => void; terms: TermMaps; now: Date }) {
	const candidates = relaxCandidates(all, q, now);

	// 近隣エリア:選択中の町と同じ区の他の町(選択中は除く)。件数は他の条件を保ったまま
	const nearby: { slug: string; name: string; count: number }[] = [];
	if (q.area.length) {
		const selectedNames = new Set(q.area.map((s) => terms.area.find((t) => t.slug === s)?.name));
		for (const w of serviceAreas) {
			if (!w.towns.some((t) => selectedNames.has(t))) continue;
			for (const town of w.towns) {
				if (selectedNames.has(town)) continue;
				const term = terms.area.find((t) => t.name === town && t.parent);
				if (!term) continue;
				const count = applyQuery(all, { ...q, area: [term.slug], page: 1 }, now).length;
				if (count > 0) nearby.push({ slug: term.slug, name: term.name, count });
			}
		}
	}

	const item = 'flex h-11 w-full items-center justify-between rounded-hr border border-line bg-surface px-3 text-body hover:border-sumi lg:text-body-pc';
	return (
		<div className="rounded-hr bg-surface-alt p-4 lg:p-6">
			<h2 className="text-h2 font-bold lg:text-h2-pc">条件に合う物件がありませんでした</h2>
			{candidates.length > 0 && (
				<>
					<p className="mt-6 text-small text-ink-weak">条件を緩めると見つかります</p>
					<ul className="mt-2 space-y-2">
						{candidates.map((c) => (
							<li key={c.label}>
								<button type="button" onClick={() => onChange(c.query)} className={item}>
									<span>{c.label}</span>
									<span className="tabular font-bold text-sumi">{c.count}件</span>
								</button>
							</li>
						))}
					</ul>
				</>
			)}
			{nearby.length > 0 && (
				<>
					<p className="mt-6 text-small text-ink-weak">近くのエリアで探す</p>
					<ul className="mt-2 space-y-2">
						{nearby.map((n) => (
							<li key={n.slug}>
								<button type="button" onClick={() => onChange({ ...q, area: [n.slug], page: 1 })} className={item}>
									<span>{n.name}</span>
									<span className="tabular font-bold text-sumi">{n.count}件</span>
								</button>
							</li>
						))}
					</ul>
				</>
			)}
			{candidates.length === 0 && nearby.length === 0 && (
				<p className="mt-6">
					<button type="button" onClick={() => onChange({ ...q, area: [], station: [], line: [], kind: [], layout: [], feature: [], rentMin: undefined, rentMax: undefined, priceMin: undefined, priceMax: undefined, walkMax: undefined, builtMaxYears: undefined, sqmMin: undefined, page: 1 })} className={item}>
						条件をすべてクリア
					</button>
				</p>
			)}
		</div>
	);
}
