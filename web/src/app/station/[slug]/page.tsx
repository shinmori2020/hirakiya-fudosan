import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FixedSearchPage } from '@/components/search/FixedSearchPage';
import { company, lines } from '@/config/site';
import { getTerms } from '@/lib/properties';

/**
 * 駅で固定した一覧(実装順 4・01 §6 の導線「駅 → 物件一覧(駅条件付き)」・J-095 判断2・4)。
 * 13駅を generateStaticParams で列挙。パンくずは トップ > 沿線・駅から探す > 駅名(沿線は駅が複数の沿線に属しうるので階層に入れない)。
 */
export const dynamicParams = false;

export async function generateStaticParams() {
	return (await getTerms('station')).map((t) => ({ slug: t.slug }));
}

async function findStation(slug: string) {
	const t = (await getTerms('station')).find((s) => s.slug === slug);
	if (!t) return null;
	const lineNames = String(t.meta.lines ?? '')
		.split(',')
		.map((l) => lines.find((x) => x.slug === l)?.name)
		.filter((n) => !!n) as string[];
	return { term: t, lineNames };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
	const { slug } = await params;
	const hit = await findStation(slug);
	if (!hit) return { title: '駅が見つかりません' };
	return {
		title: `${hit.term.name}駅の物件`,
		description: `${hit.lineNames.join('・')} ${hit.term.name}駅が最寄りの賃貸・売買物件を条件で絞り込んで探せます。${company.notice}`,
	};
}

export default async function StationPage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const hit = await findStation(slug);
	if (!hit) notFound();
	return (
		<FixedSearchPage
			fixed={{ key: 'station', slug }}
			title={`${hit.term.name}駅の物件`}
			lead={hit.lineNames.length ? hit.lineNames.join('・') : undefined}
			crumbs={[{ label: 'トップ', href: '/' }, { label: '沿線・駅から探す', href: '/line' }, { label: `${hit.term.name}駅` }]}
		/>
	);
}
