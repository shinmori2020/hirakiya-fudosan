import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FixedSearchPage } from '@/components/search/FixedSearchPage';
import { company } from '@/config/site';
import { getTerms } from '@/lib/properties';

/**
 * 町で固定した一覧(実装順 4・01 §5 の導線「エリア → 物件一覧(エリア条件付き)」・J-095 判断2・4)。
 * 13町を generateStaticParams で列挙し静的生成。区(parent が無い term)や一覧に無い slug は 404(dynamicParams = false)。
 */
export const dynamicParams = false;

async function towns() {
	return (await getTerms('area')).filter((t) => t.parent);
}
async function findTown(slug: string) {
	const terms = await getTerms('area');
	const town = terms.find((t) => t.slug === slug && t.parent);
	if (!town) return null;
	const ward = terms.find((t) => t.slug === town.parent);
	return { town, wardName: ward?.name ?? '' };
}

export async function generateStaticParams() {
	return (await towns()).map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
	const { slug } = await params;
	const hit = await findTown(slug);
	if (!hit) return { title: 'エリアが見つかりません' };
	const name = `${hit.wardName}${hit.town.name}`;
	return {
		title: `${name}の物件`,
		description: `${name}の賃貸・売買物件を条件で絞り込んで探せます。${company.notice}`,
	};
}

export default async function AreaPage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const hit = await findTown(slug);
	if (!hit) notFound();
	const name = `${hit.wardName}${hit.town.name}`;
	return (
		<FixedSearchPage
			fixed={{ key: 'area', slug }}
			title={`${name}の物件`}
			crumbs={[{ label: 'トップ', href: '/' }, { label: 'エリアから探す', href: '/area' }, { label: name }]}
		/>
	);
}
