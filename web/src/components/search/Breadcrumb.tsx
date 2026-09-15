import Link from 'next/link';

export interface Crumb {
	label: string;
	href?: string;
}

/**
 * パンくず(01 共通要素)。物件詳細と同じ見た目(text-small・灰・「/」区切り)。
 * 条件固定の一覧と入口ページ(実装順 4・J-095 判断9)で使う。最後の要素はリンクにしない(現在地)。
 * 種別(賃貸 / 売買)は URL のクエリ = クライアントの状態なので、静的な HTML のパンくずには入れない。
 */
export function Breadcrumb({ items }: { items: Crumb[] }) {
	return (
		<nav aria-label="現在位置" className="text-small text-ink-weak">
			<ol className="flex flex-wrap items-center gap-2">
				{items.map((c, i) => (
					<li key={`${c.label}-${i}`} className="contents">
						{i > 0 && <span aria-hidden="true">/</span>}
						{c.href ? (
							<Link href={c.href} className="hover:underline">
								{c.label}
							</Link>
						) : (
							<span aria-current="page" className="text-ink">
								{c.label}
							</span>
						)}
					</li>
				))}
			</ol>
		</nav>
	);
}
