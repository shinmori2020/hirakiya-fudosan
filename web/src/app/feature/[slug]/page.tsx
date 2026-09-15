import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FixedSearchPage } from '@/components/search/FixedSearchPage';
import { collectionDescriptions, company } from '@/config/site';
import { getTerms } from '@/lib/properties';

/**
 * 特集で固定した一覧(実装順 4・01 §7「説明文+該当物件一覧」・J-095 判断7)。
 * 特集6件はタクソノミー collection(手動付与)。説明文は config/site.ts の collectionDescriptions から。
 * クイックタブからはその特集のタブが消える(固定なので外せない・QuickTabs)。
 */
export const dynamicParams = false;

export async function generateStaticParams() {
	return (await getTerms('collection')).map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
	const { slug } = await params;
	const t = (await getTerms('collection')).find((c) => c.slug === slug);
	if (!t) return { title: '特集が見つかりません' };
	return {
		title: `${t.name}の物件`,
		description: `${collectionDescriptions[slug] ?? `${t.name}の物件一覧。`}${company.notice}`,
	};
}

export default async function FeaturePage({ params }: { params: Promise<{ slug: string }> }) {
	const { slug } = await params;
	const t = (await getTerms('collection')).find((c) => c.slug === slug);
	if (!t) notFound();
	return (
		<FixedSearchPage
			fixed={{ key: 'collection', slug }}
			title={`${t.name}の物件`}
			lead={collectionDescriptions[slug]}
			crumbs={[{ label: 'トップ', href: '/' }, { label: '特集', href: '/feature' }, { label: t.name }]}
		/>
	);
}
