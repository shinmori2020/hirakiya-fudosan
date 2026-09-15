import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { Breadcrumb } from '@/components/search/Breadcrumb';
import { EntryList } from '@/components/search/EntryList';
import { company, serviceAreas } from '@/config/site';
import { entryCounts, townsByWard } from '@/lib/entries';
import { getProperties, getTerms } from '@/lib/properties';

export const metadata: Metadata = {
	title: 'エリアから探す',
	description: `葛飾区・江戸川区・足立区・墨田区の13町から、賃貸・売買物件を探せます。${company.notice}`,
};

/**
 * エリアから探す(実装順 4・01 §5・J-095 判断3・6)。区ごとに13町を並べ、賃貸 / 売買の件数を付ける。
 * 地図は置かない(01 §5「地図または一覧」の一覧側。地図は物件詳細だけ)。紹介文(01 §5 要素3・任意)は書かない。
 * 町名・区名は config/site.ts の serviceAreas(02 §8 の13町)から。slug はタクソノミーで引く。
 */
export default async function AreaIndexPage() {
	const [all, areaTerms] = await Promise.all([getProperties(), getTerms('area')]);
	const wards = townsByWard(serviceAreas, areaTerms);

	return (
		<section className="py-6 lg:py-8">
			<Container>
				<Breadcrumb items={[{ label: 'トップ', href: '/' }, { label: 'エリアから探す' }]} />
				<h1 className="mt-4 text-h1 font-bold lg:text-h1-pc">エリアから探す</h1>
				<p className="mt-2 text-body text-ink-weak lg:text-body-pc">対応エリアは4区13町です。町を選ぶと、その町の物件一覧に移ります。</p>
				<div className="mt-8 grid gap-8 md:grid-cols-2">
					{wards.map((w) => (
						<section key={w.ward}>
							<h2 className="text-h2 font-bold lg:text-h2-pc">{w.ward}</h2>
							<div className="mt-2">
								<EntryList items={entryCounts(all, 'area', w.towns)} hrefBase="/area" />
							</div>
						</section>
					))}
				</div>
			</Container>
		</section>
	);
}
