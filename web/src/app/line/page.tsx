import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { attrClass } from '@/components/property/AttrLink';
import { Breadcrumb } from '@/components/search/Breadcrumb';
import { EntryList } from '@/components/search/EntryList';
import { company, lines } from '@/config/site';
import { countBy, entryCounts, stationsByLine } from '@/lib/entries';
import { getProperties, getTerms } from '@/lib/properties';

export const metadata: Metadata = {
	title: '沿線・駅から探す',
	description: `京成線・JR・東武の6沿線13駅から、賃貸・売買物件を探せます。${company.notice}`,
};

/**
 * 沿線・駅から探す(実装順 4・01 §6・J-095 判断8)。沿線6本と、その駅を件数つきで**最初から全部出す**(選ぶと展開、にはしない。
 * 13駅なら1画面に収まり、開閉の操作が1回増えるだけになるため)。沿線名 → 沿線で固定した一覧、駅名 → 駅で固定した一覧。
 * 複数の沿線に属する駅(青砥・押上 など)はそれぞれの沿線の下に出す(lib/entries.ts stationsByLine)。
 */
export default async function LineIndexPage() {
	const [all, stationTerms] = await Promise.all([getProperties(), getTerms('station')]);
	const groups = stationsByLine(lines, stationTerms);

	return (
		<section className="py-6 lg:py-8">
			<Container>
				<Breadcrumb items={[{ label: 'トップ', href: '/' }, { label: '沿線・駅から探す' }]} />
				<h1 className="mt-4 text-h1 font-bold lg:text-h1-pc">沿線・駅から探す</h1>
				<p className="mt-2 text-body text-ink-weak lg:text-body-pc">6沿線13駅に対応しています。沿線名を選ぶとその沿線の物件一覧、駅名を選ぶとその駅の物件一覧に移ります。</p>
				<div className="mt-8 grid gap-8 md:grid-cols-2">
					{groups.map(({ line, stations }) => (
						<section key={line.slug}>
							<h2 className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
								<Link href={`/line/${line.slug}`} className={`${attrClass('text')} text-h2 font-bold lg:text-h2-pc`}>
									{line.name}
								</Link>
								<span className="flex gap-3 text-small">
									<Link href={`/line/${line.slug}`} className={attrClass('text')}>
										賃貸 <span className="tabular">{countBy(all, 'rental', 'line', line.slug)}</span>件
									</Link>
									<Link href={`/line/${line.slug}?type=sale`} className={attrClass('text')}>
										売買 <span className="tabular">{countBy(all, 'sale', 'line', line.slug)}</span>件
									</Link>
								</span>
							</h2>
							<div className="mt-2">
								<EntryList items={entryCounts(all, 'station', stations).map((s) => ({ ...s, name: `${s.name}駅` }))} hrefBase="/station" />
							</div>
						</section>
					))}
				</div>
			</Container>
		</section>
	);
}
