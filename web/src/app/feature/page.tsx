import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { Breadcrumb } from '@/components/search/Breadcrumb';
import { EntryList } from '@/components/search/EntryList';
import { collectionDescriptions, company } from '@/config/site';
import { QUICK_COLLECTIONS } from '@/lib/search';
import { entryCounts } from '@/lib/entries';
import { getProperties, getTerms } from '@/lib/properties';

export const metadata: Metadata = {
	title: '特集から探す',
	description: `都心まで30分以内・敷礼ゼロ・ペット可など、6つの特集から賃貸・売買物件を探せます。${company.notice}`,
};

/**
 * 特集(実装順 4・01 §7・J-095 判断7)。特集6件(タクソノミー collection・02 §2 の並び)に説明文と件数を付ける。
 * 説明文は config/site.ts の collectionDescriptions。カード化はせず、エリア・沿線と同じ行の形にする(入口3ページで形を揃える)。
 */
export default async function FeatureIndexPage() {
	const [all, terms] = await Promise.all([getProperties(), getTerms('collection')]);
	// 02 §2 の並び(REST は名前順で返る)
	const ordered = QUICK_COLLECTIONS.map((slug) => terms.find((t) => t.slug === slug)).filter((t): t is NonNullable<typeof t> => !!t);

	return (
		<section className="py-6 lg:py-8">
			<Container>
				<Breadcrumb items={[{ label: 'トップ', href: '/' }, { label: '特集' }]} />
				<h1 className="mt-4 text-h1 font-bold lg:text-h1-pc">特集から探す</h1>
				<p className="mt-2 text-body text-ink-weak lg:text-body-pc">条件をまとめた6つの特集です。特集名を選ぶと、その条件で絞った物件一覧に移ります。</p>
				{/* 入口ページは md 以上で2列(03 §7)。6件を3件ずつに分ける(/area /line は区・沿線の群で列を作るが、特集は群が無いので件数で割る) */}
				<div className="mt-8 grid gap-8 md:grid-cols-2">
					{[ordered.slice(0, 3), ordered.slice(3)].map((half, i) => (
						<EntryList key={i} items={entryCounts(all, 'collection', half)} hrefBase="/feature" description={(slug) => collectionDescriptions[slug]} />
					))}
				</div>
			</Container>
		</section>
	);
}
