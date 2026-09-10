'use client';

import { X } from 'lucide-react';
import { formatPrice, formatRent } from '@/config/site';
import { isCoveredByQuickTab, type SearchQuery } from '@/lib/search';
import type { TermMaps } from '@/components/search/FilterPanel';

/** 現在の条件をタグで表示。× で1つ外す(URL を書き換える・rules/search.md §2)。クイックタブにある条件(特集・徒歩5/10・築1/5・上位6設備)は出さない(J-042) */
export function ActiveConditions({ q, onChange, terms }: { q: SearchQuery; onChange: (q: SearchQuery) => void; terms: TermMaps }) {
	const name = (list: { slug: string; name: string }[], slug: string) => list.find((t) => t.slug === slug)?.name ?? slug;
	const tags: { label: string; remove: () => void }[] = [];
	const without = <K extends 'area' | 'station' | 'layout' | 'feature' | 'kind' | 'collection'>(key: K, v: string) => ({ ...q, [key]: q[key].filter((x) => x !== v) });

	q.area.forEach((v) => tags.push({ label: name(terms.area, v), remove: () => onChange(without('area', v)) }));
	q.station.forEach((v) => tags.push({ label: `${name(terms.station, v)}駅`, remove: () => onChange(without('station', v)) }));
	q.kind.forEach((v) => tags.push({ label: name(terms.kind, v), remove: () => onChange(without('kind', v)) }));
	q.collection.filter((v) => !isCoveredByQuickTab(q, 'collection', v)).forEach((v) => tags.push({ label: name(terms.collection, v), remove: () => onChange(without('collection', v)) }));
	if (q.rentMin != null) tags.push({ label: `${formatRent(q.rentMin)}〜`, remove: () => onChange({ ...q, rentMin: undefined }) });
	if (q.rentMax != null) tags.push({ label: `〜${formatRent(q.rentMax)}`, remove: () => onChange({ ...q, rentMax: undefined }) });
	if (q.priceMin != null) tags.push({ label: `${formatPrice(q.priceMin)}〜`, remove: () => onChange({ ...q, priceMin: undefined }) });
	if (q.priceMax != null) tags.push({ label: `〜${formatPrice(q.priceMax)}`, remove: () => onChange({ ...q, priceMax: undefined }) });
	q.layout.forEach((v) => tags.push({ label: v, remove: () => onChange(without('layout', v)) }));
	if (q.walkMax != null && !isCoveredByQuickTab(q, 'walkMax')) tags.push({ label: `徒歩${q.walkMax}分以内`, remove: () => onChange({ ...q, walkMax: undefined }) });
	if (q.builtMaxYears != null && !isCoveredByQuickTab(q, 'builtMaxYears')) tags.push({ label: `築${q.builtMaxYears}年以内`, remove: () => onChange({ ...q, builtMaxYears: undefined }) });
	if (q.sqmMin != null) tags.push({ label: `${q.sqmMin}㎡以上`, remove: () => onChange({ ...q, sqmMin: undefined }) });
	q.feature.filter((v) => !isCoveredByQuickTab(q, 'feature', v)).forEach((v) => tags.push({ label: name(terms.feature, v), remove: () => onChange(without('feature', v)) }));

	if (tags.length === 0) return null;
	return (
		<ul className="flex flex-wrap gap-2" aria-label="現在の条件">
			{tags.map((t) => (
				<li key={t.label}>
					<button
						type="button"
						onClick={t.remove}
						className="flex h-8 items-center gap-1 rounded-hr border border-line bg-surface-alt px-2 text-small text-ink hover:border-sumi"
						aria-label={`${t.label} を外す`}
					>
						{t.label}
						<X size={16} aria-hidden="true" />
					</button>
				</li>
			))}
		</ul>
	);
}
