'use client';

import type { PropertySummary } from '@/types/property';
import { isQuickTabActive, quickTabGroups, toggleQuickTab, type SearchQuery } from '@/lib/search';
import { Chip } from '@/components/search/Chip';
import type { TermMaps } from '@/components/search/FilterPanel';

/**
 * クイック条件タブ(J-042)。賃貸/売買タブの下・件数の上。
 * 並び(左カラムの区分と同じ):特集 / 駅徒歩 / 築年 / 設備(上位6つ)。表示はデータ判定(lib/search.ts quickTabGroups)。
 * 押すと URL の条件が ON/OFF(左カラムのチェック・セレクトと同じパラメータ)。選択中は塗り(J-035 のチップと同じ見た目)。
 * PC(lg 以上):区分見出し付きで折り返し。スマホ・タブレット:見出しを省き、横スクロールの1行。
 */
export function QuickTabs({ all, q, onChange, terms }: { all: PropertySummary[]; q: SearchQuery; onChange: (q: SearchQuery) => void; terms: TermMaps }) {
	const groups = quickTabGroups(all, q.type, {
		collectionName: (slug) => terms.collection.find((t) => t.slug === slug)?.name ?? slug,
		featureName: (slug) => terms.feature.find((t) => t.slug === slug)?.name ?? slug,
	});
	if (groups.length === 0) return null;
	return (
		<nav aria-label="クイック条件" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0 [scrollbar-width:thin]">
			<div className="flex gap-x-1 gap-y-2 lg:flex-wrap lg:items-center">
				{groups.map((g, gi) => (
					<div key={g.title} className="flex shrink-0 items-center gap-x-1 lg:shrink">
						{/* 区分見出し(PC のみ)。2つ目以降は左に区切り */}
						<span className={`hidden text-xs text-ink-weak lg:inline lg:text-xs-pc ${gi > 0 ? 'ml-3 border-l border-line pl-3' : ''}`}>{g.title}</span>
						{g.tabs.map((t) => (
							<Chip key={`${t.kind}-${'slug' in t ? t.slug : t.max}`} label={t.label} pressed={isQuickTabActive(q, t)} onClick={() => onChange(toggleQuickTab(q, t))} />
						))}
					</div>
				))}
			</div>
		</nav>
	);
}
