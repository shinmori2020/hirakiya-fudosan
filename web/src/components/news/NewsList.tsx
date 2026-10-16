import Link from 'next/link';
import type { NewsItem } from '@/config/site';
import { dateLabel } from '@/lib/format';

/**
 * お知らせの行の並び(日付・カテゴリー・題名)。トップの最新3件(J-056 項目9・J-058)・/news・記事の下の「ほかの記事」で同じ形を使う(実装順 7)。
 * 行ごとに灰線で区切り、行全体を押せる。カテゴリーは押せないタグ(灰枠・灰文字。物件の属性タグとは別系統・J-057)。
 */
export function NewsList({ items }: { items: readonly NewsItem[] }) {
	return (
		<ul>
			{items.map((n) => (
				<li key={n.slug} className="border-b border-line">
					<Link
						href={`/news/${n.slug}`}
						className="flex flex-col gap-1 py-3 transition-colors duration-150 hover:bg-badge-new-bg motion-reduce:transition-none lg:flex-row lg:items-center lg:gap-4"
					>
						<span className="tabular shrink-0 text-small text-ink-weak lg:w-[7.5em] lg:text-small-pc">{dateLabel(n.date)}</span>
						{/* 幅を最長の「部屋探しのコツ」(6文字)に固定し、行どうしで題名の左端を揃える(J-058) */}
						<span className="inline-block w-[8.5em] shrink-0 self-start rounded-hr border border-line px-2 py-0.5 text-center text-xs whitespace-nowrap text-ink-weak lg:text-xs-pc">
							{n.category}
						</span>
						<span className="text-body lg:text-body-pc">{n.title}</span>
					</Link>
				</li>
			))}
		</ul>
	);
}
