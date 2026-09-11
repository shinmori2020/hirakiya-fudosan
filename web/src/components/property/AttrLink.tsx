import Link from 'next/link';

/**
 * 押せるもの(属性から一覧への回遊リンク)の見た目(J-051 → J-052 で統一)。
 * 詳細ページの「押せるもの」は次の2種類だけにする(J-052):
 *   chip / kind = 押せるチップ:白地 + 青緑の細枠 + 青緑の文字(ポイントタグ・設備・種目)
 *   text        = 押せる文字:青緑の文字・下線なし。hover で下線を出す(沿線・間取り・所在地・交通)
 * 色は 03 §2 の既存色だけを使う(枠と文字 = リンクの青緑 #176C6C、hover の背景 = 新着バッジの背景 #E0F2F1)。
 * hover / active は 150ms・cubic-bezier(0.4,0,0.2,1)・cursor pointer(J-035 と同じ規則)。
 * 塗りのバッジ(新着・値下げ)は「状態」なので変えない。線は「分類かつリンク」。
 */
export function AttrLink({ href, variant = 'text', children }: { href: string; variant?: 'text' | 'chip' | 'kind'; children: React.ReactNode }) {
	const base =
		'cursor-pointer rounded-hr text-accent-strong transition-[background-color,text-decoration-color] duration-150 hover:bg-badge-new-bg active:bg-badge-new-bg motion-reduce:transition-none';
	const style = {
		chip: 'block h-8 border border-accent bg-surface px-2 text-small leading-8 whitespace-nowrap',
		kind: 'inline-block border border-accent bg-surface px-2 py-0.5 text-xs font-bold lg:text-xs-pc',
		text: '-mx-0.5 px-0.5 no-underline hover:underline hover:decoration-accent hover:underline-offset-2',
	}[variant];
	return (
		<Link href={href} className={`${base} ${style}`}>
			{children}
		</Link>
	);
}
