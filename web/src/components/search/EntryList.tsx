import Link from 'next/link';
import { attrClass } from '@/components/property/AttrLink';
import type { EntryCount } from '@/lib/entries';

/**
 * 入口ページ(/area /line /feature)の行(実装順 4・J-095 判断6・8・J-096)。
 * 名前 → 条件固定の一覧、賃貸○件 / 売買○件 → 同じ一覧の種別タブ。**0件も件数を出してリンクを残す**(判断6。
 * 押した先の 0件画面が近隣エリアや条件の緩和を案内する)。押せるものは J-052 の「押せる文字」(J-096 で一覧側にも適用)。
 * 件数は一覧の件数表示と同じ数え方(成約済みを含む・lib/entries.ts)。
 * **件数は名前の直後・同じ行に置く**(J-138。右端寄せだと 1280 で名前と件数が 560〜1180px 離れ、視線が往復していた)。
 */
export function EntryList({ items, hrefBase, description }: { items: EntryCount[]; hrefBase: string; description?: (slug: string) => string | undefined }) {
	return (
		<ul className="divide-y divide-line">
			{items.map((it) => {
				const href = `${hrefBase}/${it.slug}`;
				const desc = description?.(it.slug);
				return (
					<li key={it.slug} className="py-3">
						<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
							<Link href={href} className={`${attrClass('text')} text-body font-bold lg:text-body-pc`}>
								{it.name}
							</Link>
							<p className="flex shrink-0 gap-3 text-small">
								<Link href={href} className={attrClass('text')}>
									賃貸 <span className="tabular">{it.rental}</span>件
								</Link>
								<Link href={`${href}?type=sale`} className={attrClass('text')}>
									売買 <span className="tabular">{it.sale}</span>件
								</Link>
							</p>
						</div>
						{desc && <p className="mt-1 text-body text-ink-weak lg:text-body-pc">{desc}</p>}
					</li>
				);
			})}
		</ul>
	);
}
