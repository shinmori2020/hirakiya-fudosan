'use client';

import Link from 'next/link';
import { serviceAreas } from '@/config/site';
import type { PropertySummary } from '@/types/property';
import { activeConditionCount, nearbyAreas, relaxCandidates, stripFixed, toSearchParams, type FixedCondition, type SearchQuery } from '@/lib/search';
import type { TermMaps } from '@/components/search/FilterPanel';

/** 固定条件ごとの入口ページ(J-095 判断3)。固定条件だけで0件の時の逃げ道 */
const ENTRY: Record<FixedCondition['key'], { href: string; label: string }> = {
	area: { href: '/area', label: '他のエリアから探す' },
	station: { href: '/line', label: '他の沿線・駅から探す' },
	line: { href: '/line', label: '他の沿線・駅から探す' },
	collection: { href: '/feature', label: '他の特集から探す' },
};

/**
 * 0件時(01 §2-7・rules/search.md §4)。これは初案。
 * 「該当なし」で止めず、条件を1つ緩める候補(件数付き)+ 近隣エリア(同じ区の13町の中だけ)を出す。
 * 緩める順序は lib/search.ts RELAX_STEPS(J-033)。
 * 条件固定の一覧(J-095):固定した条件は緩和候補に出さない(判断5)。近隣エリアは、エリア固定なら
 * その町のページ(/area/[slug])へ移る(同じ部品の中で条件を書き換えると URL のパスと矛盾するため)。
 */
export function EmptyState({
	all,
	q,
	onChange,
	terms,
	now,
	fixed,
	onClear,
}: {
	all: PropertySummary[];
	q: SearchQuery;
	onChange: (q: SearchQuery) => void;
	terms: TermMaps;
	now: Date;
	fixed?: FixedCondition;
	/** 「条件をすべてクリア」。固定条件は残す(SearchResults が渡す) */
	onClear: () => void;
}) {
	const candidates = relaxCandidates(all, q, now, fixed);
	const nearby = nearbyAreas(all, q, terms.area, serviceAreas, now);
	// 利用者が変えられる条件が残っているか(固定条件は含めない)
	const hasOwnConditions = activeConditionCount(stripFixed(q, fixed)) > 0;

	const item = 'flex h-11 w-full items-center justify-between rounded-hr border border-line bg-surface px-3 text-body hover:border-sumi lg:text-body-pc';
	const nearbyHref = (slug: string) => {
		const s = toSearchParams(stripFixed({ ...q, page: 1 }, fixed)).toString();
		return s ? `/area/${slug}?${s}` : `/area/${slug}`;
	};
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
								{fixed?.key === 'area' ? (
									<Link href={nearbyHref(n.slug)} className={item}>
										<span>{n.name}</span>
										<span className="tabular font-bold text-sumi">{n.count}件</span>
									</Link>
								) : (
									<button type="button" onClick={() => onChange({ ...q, area: [n.slug], page: 1 })} className={item}>
										<span>{n.name}</span>
										<span className="tabular font-bold text-sumi">{n.count}件</span>
									</button>
								)}
							</li>
						))}
					</ul>
				</>
			)}
			{candidates.length === 0 && nearby.length === 0 && (
				<p className="mt-6">
					{hasOwnConditions || !fixed ? (
						<button type="button" onClick={onClear} className={item}>
							条件をすべてクリア
						</button>
					) : (
						// 固定条件だけで0件(例:その町に売買が無い)。クリアするものが無いので入口ページへ
						<Link href={ENTRY[fixed.key].href} className={item}>
							{ENTRY[fixed.key].label}
						</Link>
					)}
				</p>
			)}
		</div>
	);
}
