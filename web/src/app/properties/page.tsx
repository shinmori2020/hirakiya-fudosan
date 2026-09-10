import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Container } from '@/components/layout/Container';
import { SearchResults } from '@/components/search/SearchResults';
import { getProperties, getTerms } from '@/lib/properties';

export const metadata: Metadata = {
	title: '物件を探す',
	description: '葛飾区・京成線沿線の賃貸・売買物件を条件で絞り込んで探せます。',
};

/**
 * 物件一覧(実装順 1・方式③)。これは初案。
 * Server Component は index.json とタクソノミーを読んで静的な殻を出すだけ。searchParams は読まない(rules/static-rendering.md §2)。
 * 条件の解釈・絞り込みは Client(SearchResults)が URL クエリで行う。
 */
export default async function PropertiesPage() {
	const [all, area, station, feature, kind, collection] = await Promise.all([
		getProperties(),
		getTerms('area'),
		getTerms('station'),
		getTerms('feature_tag'),
		getTerms('property_kind'),
		getTerms('collection'),
	]);
	// バッジの「新着」判定はビルド時刻を基準にする(静的生成。クライアントと同じ値を使い hydration のズレを防ぐ)
	const nowIso = new Date().toISOString();

	return (
		<section className="py-8 lg:py-12">
			<Container>
				<h1 className="text-h1 font-bold lg:text-h1-pc">物件を探す</h1>
				<div className="mt-6">
					<Suspense fallback={<p className="text-ink-weak">読み込み中…</p>}>
						<SearchResults all={all} terms={{ area, station, feature, kind, collection }} nowIso={nowIso} />
					</Suspense>
				</div>
			</Container>
		</section>
	);
}
