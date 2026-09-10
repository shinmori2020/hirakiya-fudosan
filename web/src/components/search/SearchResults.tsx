'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { PropertySummary } from '@/types/property';
import {
	activeConditionCount,
	applyQuery,
	paginate,
	parseQuery,
	SORT_OPTIONS,
	sortProperties,
	toSearchParams,
	type SearchQuery,
	type SortKey,
} from '@/lib/search';
import { PropertyCard } from '@/components/property/PropertyCard';
import { ActiveConditions } from '@/components/search/ActiveConditions';
import { EmptyState } from '@/components/search/EmptyState';
import { FilterPanel, type TermMaps } from '@/components/search/FilterPanel';
import { Pagination } from '@/components/search/Pagination';
import { QuickTabs } from '@/components/search/QuickTabs';

/**
 * 検索結果(方式③:静的な殻 + Client で index.json を絞る)。これは初案。
 * 条件・並び・ページはすべて URL(router.push)に載せ、戻るで復元される(rules/search.md §2)。
 * PC:左に絞り込み(常時・即時反映)+ 右にカード2列。スマホ:1列、絞り込みはドロワー(適用ボタンに件数)。
 */
export function SearchResults({ all, terms, nowIso }: { all: PropertySummary[]; terms: TermMaps; nowIso: string }) {
	const sp = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const now = useMemo(() => new Date(nowIso), [nowIso]);
	const q = useMemo(() => parseQuery(new URLSearchParams(sp.toString())), [sp]);

	const filtered = useMemo(() => applyQuery(all, q, now), [all, q, now]);
	const sorted = useMemo(() => sortProperties(filtered, q.sort), [filtered, q.sort]);
	const { items, page, totalPages } = paginate(sorted, q.page);

	const update = (next: SearchQuery) => {
		const s = toSearchParams(next).toString();
		router.push(s ? `${pathname}?${s}` : pathname, { scroll: false });
	};
	const change = (next: SearchQuery) => update({ ...next, page: 1 });

	// スマホのドロワー:下書きを持ち、適用で URL に反映
	const [drawer, setDrawer] = useState(false);
	const [draft, setDraft] = useState<SearchQuery>(q);
	const openDrawer = () => {
		setDraft(q); // 開くたびに現在の URL の条件から下書きを作り直す
		setDrawer(true);
	};
	useEffect(() => {
		document.body.style.overflow = drawer ? 'hidden' : '';
		return () => {
			document.body.style.overflow = '';
		};
	}, [drawer]);
	const draftCount = useMemo(() => applyQuery(all, draft, now).length, [all, draft, now]);

	// J-036(3回目):切り替えのたびに一覧全体を現れ直させる。外枠の key に URL クエリを使い、全カードを再マウントする。
	// 順番ずらしは表示順 × 30ms(上限 210ms・8枚目以降は同時)
	const queryKey = sp.toString();
	const STAGGER_MS = 30;
	const STAGGER_MAX = 7;
	const delayFor = (index: number) => `${Math.min(index, STAGGER_MAX) * STAGGER_MS}ms`;
	// 件数が変わった時だけ数字を青緑 → 墨へ 300ms(初回は光らせない)。前回の件数は state に保持(ref を描画中に読まない)
	const [snap, setSnap] = useState<{ key: string; count: number; prevCount: number | null } | null>(null);
	if (snap === null || snap.key !== queryKey) {
		setSnap({ key: queryKey, count: filtered.length, prevCount: snap?.count ?? null });
	}
	const prevCount = snap && snap.key === queryKey ? snap.prevCount : null;
	const countChanged = prevCount !== null && prevCount !== filtered.length;

	const stationName = (slug: string) => terms.station.find((t) => t.slug === slug)?.name ?? slug;
	// J-043:設備はその種別に1件以上あるものだけ左カラム・ドロワーに出す(売買はペット可など賃貸限定の設備を出さない)
	const featuresFor = (type: SearchQuery['type']) => Array.from(new Set(all.filter((p) => p.type === type).flatMap((p) => p.features)));
	const availableFeatures = useMemo(() => featuresFor(q.type), [all, q.type]); // eslint-disable-line react-hooks/exhaustive-deps -- featuresFor は all だけに依存
	const typeLabel = q.type === 'rental' ? '賃貸' : '売買';
	const condCount = activeConditionCount(q);

	return (
		<div className="lg:grid lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-8">
			{/* PC:左サイドの絞り込み(常時) */}
			<aside className="hidden lg:block">
				{/* ヘッダー直下(compact 時の高さ 61px → top 64)に固定。上限は 画面高 − ヘッダー高 − 余白 16、超える分はカラム内でスクロール(J-034) */}
				<div className="sticky top-16 max-h-[calc(100dvh-4rem-1rem)] overflow-y-auto rounded-hr border border-line p-3 [scrollbar-width:thin]">
					<FilterPanel value={q} onChange={change} terms={terms} availableFeatures={availableFeatures} />
				</div>
			</aside>

			<div>
				{/* 賃貸 / 売買 の切替 */}
				<div className="flex gap-2" role="tablist" aria-label="種別">
					{(['rental', 'sale'] as const).map((t) => (
						<Link
							key={t}
							role="tab"
							aria-selected={q.type === t}
							href={t === 'rental' ? pathname : `${pathname}?type=sale`}
							className={`flex h-11 flex-1 items-center justify-center rounded-hr border text-body font-medium lg:flex-none lg:px-6 lg:text-body-pc ${
								q.type === t ? 'border-sumi bg-sumi text-white' : 'border-line text-sumi hover:border-sumi'
							}`}
						>
							{t === 'rental' ? '賃貸' : '売買'}
						</Link>
					))}
				</div>

				{/* クイック条件タブ(J-042):詳細のポイントタグと同じ語彙。押すと URL の条件が ON/OFF(左カラムと連動) */}
				<div className="mt-4">
					<QuickTabs all={all} q={q} onChange={change} terms={terms} />
				</div>
				{/* タブに無い条件(エリア・家賃・間取り・面積など)だけ × 付きで表示 */}
				<div className="mt-3">
					<ActiveConditions q={q} onChange={change} terms={terms} />
				</div>

				{/* 件数・並び替え・(スマホ)絞り込みボタン */}
				<div className="mt-4 flex items-center justify-between gap-2">
					<p className="text-body lg:text-body-pc">
						<span
							key={filtered.length}
							className={`tabular text-h2 font-bold text-sumi lg:text-h2-pc ${countChanged ? 'animate-count-flash motion-reduce:animate-none' : ''}`}
						>
							{filtered.length}
						</span>{' '}
						件
					</p>
					<div className="flex items-center gap-2">
						<label className="flex items-center gap-2 text-small text-ink-weak">
							<span className="hidden sm:inline">並び替え</span>
							<select
								value={q.sort}
								onChange={(e) => change({ ...q, sort: e.target.value as SortKey })}
								className="h-11 rounded-hr border border-line bg-surface px-2 text-body text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent lg:text-body-pc"
								aria-label="並び替え"
							>
								{SORT_OPTIONS.map((o) => (
									<option key={o.key} value={o.key}>
										{o.label(q.type)}
									</option>
								))}
							</select>
						</label>
						<button
							type="button"
							onClick={openDrawer}
							className="flex h-11 items-center gap-1 rounded-hr border border-sumi px-3 text-body font-medium text-sumi lg:hidden"
							aria-haspopup="dialog"
						>
							<SlidersHorizontal size={20} aria-hidden="true" />
							絞り込み{condCount > 0 && <span className="tabular">({condCount})</span>}
						</button>
					</div>
				</div>

				{/*
				 * 一覧(J-036・3回目)。条件・並び替え・タブ・ページが変わるたび外枠の key が変わり、全カードが現れ直す:
				 * list-in(300ms・不透明度 0→1・8px 上昇)+ 表示順の順番ずらし 30ms × 最大7(最大遅延 210ms)。
				 * 0件表示も同じ。prefers-reduced-motion では animate-none。FLIP は入れない。
				 * 経緯:外枠再マウント+150ms フェード(却下:チカチカ)→ 新規カードのみ 150ms(却下:分かりにくい)
				 *     → 新規カードのみ 300ms+上昇+順番ずらし → SHIN の希望で「切り替えるたびに表示し直す」に(300ms+上昇+順番ずらしは維持)。
				 */}
				<div key={queryKey} className="mt-6">
					{filtered.length === 0 ? (
						<div className="animate-list-in motion-reduce:animate-none">
							<EmptyState all={all} q={q} onChange={change} terms={terms} now={now} />
						</div>
					) : (
						// 〜767px 1列 / 768px〜 2列(03 §7 v0.5)。左カラムは lg から
						<ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:gap-4">
							{items.map((p, i) => (
								<li key={p.no} className="animate-list-in motion-reduce:animate-none" style={{ animationDelay: delayFor(i) }}>
									<PropertyCard p={p} stationName={stationName} now={now} priority={i < 2} />
								</li>
							))}
						</ul>
					)}
				</div>

				<div className="mt-8">
					<Pagination page={page} totalPages={totalPages} onChange={(p) => update({ ...q, page: p })} />
				</div>
			</div>

			{/* スマホ:絞り込みドロワー */}
			<div
				role="dialog"
				aria-modal="true"
				aria-label={`${typeLabel}の絞り込み`}
				aria-hidden={!drawer}
				className={`fixed inset-0 z-50 bg-sumi/60 transition-[opacity,visibility] duration-200 lg:hidden ${drawer ? 'visible opacity-100' : 'invisible opacity-0'}`}
				onClick={() => setDrawer(false)}
			>
				<div
					className={`absolute inset-y-0 right-0 flex w-[calc(100%-48px)] max-w-sm flex-col bg-surface shadow-panel transition-transform duration-200 ${drawer ? 'translate-x-0' : 'translate-x-full'}`}
					onClick={(e) => e.stopPropagation()}
				>
					<div className="flex items-center justify-between border-b border-line px-4 py-3">
						<p className="text-h3 font-bold text-sumi">絞り込み</p>
						<button type="button" onClick={() => setDrawer(false)} className="flex h-11 w-11 items-center justify-center rounded-hr text-sumi" aria-label="閉じる">
							<X size={20} aria-hidden="true" />
						</button>
					</div>
					<div className="flex-1 overflow-y-auto px-4 py-4">
						<FilterPanel value={draft} onChange={setDraft} terms={terms} availableFeatures={featuresFor(draft.type)} />
					</div>
					<div className="grid grid-cols-[auto_1fr] gap-2 border-t border-line p-3">
						<button
							type="button"
							onClick={() => setDraft({ ...draft, area: [], station: [], line: [], kind: [], layout: [], feature: [], rentMin: undefined, rentMax: undefined, priceMin: undefined, priceMax: undefined, walkMax: undefined, builtMaxYears: undefined, sqmMin: undefined })}
							className="h-12 rounded-hr border border-sumi px-4 text-body font-medium text-sumi"
						>
							クリア
						</button>
						<button
							type="button"
							onClick={() => {
								change(draft);
								setDrawer(false);
							}}
							className="h-12 rounded-hr bg-accent text-body font-bold text-white hover:bg-accent-strong"
						>
							<span className="tabular">{draftCount}</span>件を表示
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
