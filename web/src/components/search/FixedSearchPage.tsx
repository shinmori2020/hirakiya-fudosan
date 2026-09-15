import { Suspense } from 'react';
import { Container } from '@/components/layout/Container';
import { Breadcrumb, type Crumb } from '@/components/search/Breadcrumb';
import { SearchResults } from '@/components/search/SearchResults';
import type { FixedCondition } from '@/lib/search';
import { getProperties, getTerms } from '@/lib/properties';

/**
 * 条件固定の一覧の殻(実装順 4・J-095 判断4)。/area/[slug] /line/[slug] /station/[slug] /feature/[slug] が共通で使う。
 * /properties と同じ方式③:Server はデータとパンくず・h1 を出すだけで searchParams は読まない(rules/static-rendering.md §2)。
 * 固定条件(fixed)は URL のパスが持ち、SearchResults が読み時に足し・書き時に落とす(lib/search.ts applyFixed / stripFixed)。
 * 種別の切替(賃貸 / 売買)は /properties と同じタブ(?type=sale)。h1・パンくずは種別に依らない語にする。
 */
export async function FixedSearchPage({ fixed, title, lead, crumbs }: { fixed: FixedCondition; title: string; lead?: string; crumbs: Crumb[] }) {
	const [all, area, station, feature, kind, collection] = await Promise.all([
		getProperties(),
		getTerms('area'),
		getTerms('station'),
		getTerms('feature_tag'),
		getTerms('property_kind'),
		getTerms('collection'),
	]);
	const nowIso = new Date().toISOString();

	return (
		<section className="py-6 lg:py-8">
			<Container>
				<Breadcrumb items={crumbs} />
				<h1 className="mt-4 text-h1 font-bold lg:text-h1-pc">{title}</h1>
				{lead && <p className="mt-2 text-body text-ink-weak lg:text-body-pc">{lead}</p>}
				<div className="mt-6">
					<Suspense fallback={<p className="text-ink-weak">読み込み中…</p>}>
						<SearchResults all={all} terms={{ area, station, feature, kind, collection }} nowIso={nowIso} fixed={fixed} />
					</Suspense>
				</div>
			</Container>
		</section>
	);
}
