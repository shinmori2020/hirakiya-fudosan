'use client';

import type { PropertySummary } from '@/types/property';
import { isQuickTabActive, quickTabGroups, toggleQuickTab, type QuickTabGroup, type SearchQuery } from '@/lib/search';
import { Chip } from '@/components/search/Chip';
import type { TermMaps } from '@/components/search/FilterPanel';

/**
 * クイック条件タブ(J-042)。賃貸/売買タブの下・件数の上。
 * 並び(左カラムの区分と同じ):特集 / 駅徒歩 / 築年 / 設備(上位6つ)。表示はデータ判定(lib/search.ts quickTabGroups)。
 * 押すと URL の条件が ON/OFF(左カラムのチェック・セレクトと同じパラメータ)。選択中は塗り(J-035 のチップと同じ見た目)。
 *
 * 帯(J-042 条件追加・09/11):md 以上は薄灰の帯(角丸 6・余白 12)で囲い、見出しを同じ幅の列で左端に揃える。
 *   1行目:特集。2行目:駅徒歩 | 築年(細い区切り線)。3行目:設備(1280px で2行目に収まらなかったため単独行・09/11 実測)。
 * スマホ(〜767px):帯を外し、見出しを省いて横スクロールの1行。
 */
export function QuickTabs({ all, q, onChange, terms }: { all: PropertySummary[]; q: SearchQuery; onChange: (q: SearchQuery) => void; terms: TermMaps }) {
	const groups = quickTabGroups(all, q.type, {
		collectionName: (slug) => terms.collection.find((t) => t.slug === slug)?.name ?? slug,
		featureName: (slug) => terms.feature.find((t) => t.slug === slug)?.name ?? slug,
	});
	if (groups.length === 0) return null;
	const byTitle = (t: string) => groups.find((g) => g.title === t);
	const collection = byTitle('特集');
	const second = (['駅徒歩', '築年'] as const).map(byTitle).filter((g): g is QuickTabGroup => !!g);
	const feature = byTitle('設備');

	const chips = (g: QuickTabGroup) =>
		g.tabs.map((t) => (
			<Chip key={`${t.kind}-${'slug' in t ? t.slug : t.max}`} label={t.label} pressed={isQuickTabActive(q, t)} onClick={() => onChange(toggleQuickTab(q, t))} />
		));

	return (
		<nav aria-label="クイック条件">
			{/* スマホ:1行の横スクロール(見出しなし・帯なし) */}
			<div className="-mx-4 flex gap-x-1 overflow-x-auto px-4 md:hidden [scrollbar-width:thin]">
				{groups.map((g) => (
					<div key={g.title} className="flex shrink-0 gap-x-1">
						{chips(g)}
					</div>
				))}
			</div>

			{/* md 以上:帯。見出し列は同じ幅(4rem)で左端に揃え、チップの開始位置を揃える */}
			<div className="hidden rounded-hr bg-surface-alt p-3 md:block">
				<div className="grid grid-cols-[4rem_minmax(0,1fr)] gap-y-2">
					{collection && (
						<>
							<span className="pt-2 text-xs text-ink-weak lg:text-xs-pc">{collection.title}</span>
							<div className="flex flex-wrap gap-x-1 gap-y-2">{chips(collection)}</div>
						</>
					)}
					{second.length > 0 && (
						<>
							<span className="pt-2 text-xs text-ink-weak lg:text-xs-pc">{second[0].title}</span>
							<div className="flex flex-wrap gap-x-1 gap-y-2">
								{second.map((g, i) => (
									<div key={g.title} className={`flex flex-wrap items-center gap-x-1 gap-y-2 ${i > 0 ? 'ml-2 border-l border-line pl-3' : ''}`}>
										{i > 0 && <span className="text-xs text-ink-weak lg:text-xs-pc">{g.title}</span>}
										{chips(g)}
									</div>
								))}
							</div>
						</>
					)}
					{feature && (
						<>
							<span className="pt-2 text-xs text-ink-weak lg:text-xs-pc">{feature.title}</span>
							<div className="flex flex-wrap gap-x-1 gap-y-2">{chips(feature)}</div>
						</>
					)}
				</div>
			</div>
		</nav>
	);
}
