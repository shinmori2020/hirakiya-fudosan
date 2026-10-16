import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { PageBand } from '@/components/layout/PageBand';
import { NewsList } from '@/components/news/NewsList';
import { PropertyCard } from '@/components/property/PropertyCard';
import { Breadcrumb } from '@/components/search/Breadcrumb';
import { company, news, type NewsBlock } from '@/config/site';
import { dateLabel } from '@/lib/format';
import { newsRelatedHref, newsRelatedProperties, relatedNews } from '@/lib/news';
import { getProperties, getTerms } from '@/lib/properties';

/**
 * お知らせ・コラムの記事(実装順 7・01 §17-2「本文 / 関連物件 / 関連記事」)。記事は config/site.ts の news(WordPress は通さない・SHIN の判断)。
 * 説明ページの型(03 §7・J-115):本文は最大幅 760、物件カードは幅いっぱい。セクションは白と薄灰の交互。
 *  - 関係する物件:記事ごとの条件(種別 + 駅)に合う物件を新着順に4件(lib/news.ts)。条件の無い記事では出さない
 *  - ほかの記事:同じカテゴリーを先に2件。行の形は一覧・トップと同じ NewsList
 */
export const dynamicParams = false;

export function generateStaticParams() {
	return news.map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
	const { slug } = await params;
	const n = news.find((x) => x.slug === slug);
	if (!n) return { title: '記事が見つかりません' };
	return { title: n.title, description: `${n.lead}${company.notice}` };
}

function Block({ b, first }: { b: NewsBlock; first: boolean }) {
	if ('h' in b) return <h2 className={`${first ? '' : 'mt-8 lg:mt-12'} text-h2 font-bold lg:text-h2-pc`}>{b.h}</h2>;
	if ('ul' in b)
		return (
			<ul className="mt-4 list-disc pl-6 text-body lg:text-body-pc">
				{b.ul.map((t) => (
					<li key={t} className="mt-1 first:mt-0">
						{t}
					</li>
				))}
			</ul>
		);
	return <p className={`${first ? '' : 'mt-4'} text-body lg:text-body-pc`}>{b.p}</p>;
}

export default async function NewsArticlePage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const n = news.find((x) => x.slug === slug);
	if (!n) notFound();

	const [all, stations, features, collections, kinds, areas] = await Promise.all([
		getProperties(),
		getTerms('station'),
		getTerms('feature_tag'),
		getTerms('collection'),
		getTerms('property_kind'),
		getTerms('area'),
	]);
	const now = new Date();
	const stationName = (s: string) => stations.find((t) => t.slug === s)?.name ?? s;
	const featureName = (s: string) => features.find((t) => t.slug === s)?.name ?? s;
	const collectionName = (s: string) => collections.find((t) => t.slug === s)?.name ?? s;
	const kindName = (s: string) => kinds.find((t) => t.slug === s)?.name ?? s;
	const areaLabel = (s: string) => {
		const town = areas.find((t) => t.slug === s);
		const ward = town?.parent ? areas.find((t) => t.slug === town.parent) : undefined;
		return town ? `${ward?.name ?? ''}${town.name}` : s;
	};

	const props = newsRelatedProperties(all, n.related, 4);
	const propsHref = newsRelatedHref(n.related);
	const others = relatedNews(news, n, 2);
	// 白と薄灰の交互(03 §7)。本文の段が白なので、その後ろを 薄灰 → 白 … の順に塗る
	const tail = [props.length > 0 ? 'props' : null, others.length > 0 ? 'others' : null].filter(Boolean);
	const face = (key: string) => (tail.indexOf(key) % 2 === 0 ? 'bg-surface-alt py-12 lg:py-16' : 'py-12 lg:py-16');

	return (
		<>
			<article>
				{/* 見出しの帯(J-176・03 §7)。h1 は帯の中。パンくず・リード・注記は帯の直下 */}
				<PageBand title={n.title} />
				<section className="pt-6 pb-12 lg:pt-8 lg:pb-16">
					<Container>
						<Breadcrumb items={[{ label: 'トップ', href: '/' }, { label: 'お知らせ・コラム', href: '/news' }, { label: n.title }]} />
						<div className="mt-4 max-w-[760px]">
							<p className="flex items-center gap-3">
								<span className="tabular text-small text-ink-weak lg:text-small-pc">{dateLabel(n.date)}</span>
								<span className="inline-block rounded-hr border border-line px-2 py-0.5 text-xs whitespace-nowrap text-ink-weak lg:text-xs-pc">{n.category}</span>
							</p>
							<p className="mt-4 text-body text-ink lg:text-body-pc">{n.lead}</p>
							<p className="mt-2 text-small text-ink-weak lg:text-small-pc">架空の記事です。</p>
							<div className="mt-8 border-t border-line pt-8 lg:mt-12 lg:pt-12">
								{n.body.map((b, i) => (
									<Block key={i} b={b} first={i === 0} />
								))}
							</div>
						</div>
					</Container>
				</section>
			</article>

			{props.length > 0 && (
				<section className={face('props')}>
					<Container>
						<div className="flex items-baseline justify-between">
							<h2 className="text-h2 font-bold lg:text-h2-pc">この記事に関係する物件</h2>
							{propsHref && (
								<Link href={propsHref} className="text-small text-accent-strong underline">
									すべて見る
								</Link>
							)}
						</div>
						<ul className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4 lg:gap-4">
							{props.map((p) => (
								<li key={p.no}>
									<PropertyCard p={p} stationName={stationName} now={now} kindName={kindName} areaLabel={areaLabel} tagNames={{ collectionName, featureName }} />
								</li>
							))}
						</ul>
					</Container>
				</section>
			)}

			{others.length > 0 && (
				<section className={face('others')}>
					<Container>
						<div className="flex items-baseline justify-between">
							<h2 className="text-h2 font-bold lg:text-h2-pc">ほかの記事</h2>
							<Link href="/news" className="text-small text-accent-strong underline">
								すべて見る
							</Link>
						</div>
						<div className="mt-6 max-w-[760px] border-t border-line">
							<NewsList items={others} />
						</div>
					</Container>
				</section>
			)}
		</>
	);
}
