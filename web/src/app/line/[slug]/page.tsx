import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FixedSearchPage } from '@/components/search/FixedSearchPage';
import { company, lines } from '@/config/site';

/**
 * 沿線で固定した一覧(実装順 4・01 §6・J-095 判断2・4)。沿線6本は config/site.ts の lines(タクソノミー line と同じ slug)。
 * 一覧に無い slug は 404(dynamicParams = false)。左カラムの駅チップはこの沿線の駅だけになる(FilterPanel)。
 */
export const dynamicParams = false;

export function generateStaticParams() {
	return lines.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
	const { slug } = await params;
	const line = lines.find((l) => l.slug === slug);
	if (!line) return { title: '沿線が見つかりません' };
	return {
		title: `${line.name}の物件`,
		description: `${line.name}沿線の賃貸・売買物件を駅や条件で絞り込んで探せます。${company.notice}`,
	};
}

export default async function LinePage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const line = lines.find((l) => l.slug === slug);
	if (!line) notFound();
	return (
		<FixedSearchPage
			fixed={{ key: 'line', slug }}
			title={`${line.name}の物件`}
			crumbs={[{ label: 'トップ', href: '/' }, { label: '沿線・駅から探す', href: '/line' }, { label: line.name }]}
		/>
	);
}
