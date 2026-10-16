import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { NewsList } from '@/components/news/NewsList';
import { company, news } from '@/config/site';

export const metadata: Metadata = {
	title: 'お知らせ・コラム',
	description: `営業のお知らせ・お部屋探しのコツ・地域情報(架空)。${company.notice}`,
};

/**
 * お知らせ・コラムの一覧(実装順 7・01 §17-1)。トップの最新3件と同じ config/site.ts の news を全部出す(J-056 項目9)。
 * 説明ページの型(03 §7・J-115)。トップ直下の1枚なのでパンくずは出さない(03 §7)。
 * 行の形はトップと同じ `NewsList`(日付・カテゴリーの灰タグ・題名)。**カテゴリーの絞り込みは付けない**(記事3件のため・初案)。
 */
export default function NewsIndexPage() {
	return (
		<>
			<section className="py-6 lg:py-8">
				<Container>
					<div className="max-w-[760px]">
						<h1 className="text-h1 font-bold lg:text-h1-pc">お知らせ・コラム</h1>
						<p className="mt-4 text-body text-ink lg:text-body-pc">営業のお知らせと、お部屋探しのコツ・地域の情報をまとめています。</p>
						<p className="mt-2 text-small text-ink-weak lg:text-small-pc">記事はすべて架空です。</p>
					</div>
				</Container>
			</section>

			<section className="pb-12 lg:pb-16">
				<Container>
					<div className="max-w-[760px] border-t border-line">
						<NewsList items={news} />
					</div>
				</Container>
			</section>
		</>
	);
}
