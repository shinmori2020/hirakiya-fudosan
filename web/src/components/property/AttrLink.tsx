import Link from 'next/link';

/**
 * 属性から一覧への回遊リンク(J-051)。見た目は元の文字・チップのまま変えない。
 * hover / active で背景を淡い青緑(#E0F2F1 = badge-new-bg)・150ms・cubic-bezier(0.4,0,0.2,1)(J-035 と同じ)。
 * chip = 設備チップ(枠線あり)、text = 本文中の文字(所在地・駅・沿線・間取り)、
 * kind = 種目(J-050。状態バッジと同じ行に置くので、塗りは持たせず枠線だけ・同じ最小サイズ)。
 */
export function AttrLink({ href, variant = 'text', children }: { href: string; variant?: 'text' | 'chip' | 'kind'; children: React.ReactNode }) {
	const base =
		'cursor-pointer rounded-hr transition-colors duration-150 hover:bg-badge-new-bg active:bg-badge-new-bg motion-reduce:transition-none';
	const style = {
		chip: 'block h-8 border border-line bg-surface px-2 text-small leading-8 whitespace-nowrap text-ink',
		kind: 'inline-block border border-line bg-surface px-2 py-0.5 text-xs font-bold text-ink-weak lg:text-xs-pc',
		text: '-mx-0.5 px-0.5 underline decoration-line underline-offset-2 hover:decoration-accent',
	}[variant];
	return (
		<Link href={href} className={`${base} ${style}`}>
			{children}
		</Link>
	);
}
