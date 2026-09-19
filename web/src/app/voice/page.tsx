import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { company, voices } from '@/config/site';

/** 群の順(J-122)。voices の kind と同じ語 */
const KINDS = ['賃貸', '売買', '管理'] as const;

export const metadata: Metadata = {
	title: 'お客様の声',
	description: `賃貸・売買・管理でご利用いただいた方の声(架空)。${company.notice}`,
};

const SECONDARY = 'flex h-12 w-full items-center justify-center rounded-hr border border-sumi bg-surface text-body font-medium text-sumi hover:bg-surface-alt lg:h-11 lg:text-body-pc';

/**
 * お客様の声(実装順 6・01 §16)。トップと同じ config/site.ts の voices を読む(J-056 項目9:別のデータ経路を作らない)。
 * 事例カード:属性 / 探した条件(町・種別)/ コメント。**架空である旨をカードとページの両方に明記**(J-057)。
 * カードの形はトップと同じ(白・灰線・角丸 6)。件数を増やす時は config に足す。
 * 3件を1列に並べるだけだと「どの相談の声か」が読めないので、**賃貸 / 売買 / 管理 で3群に分ける**(J-122)。件数は増やさない。
 */
export default function VoicePage() {
	return (
		<>
			<section className="py-6 lg:py-8">
				<Container>
					<div className="max-w-[760px]">
						<h1 className="text-h1 font-bold lg:text-h1-pc">お客様の声</h1>
						<p className="mt-4 text-body text-ink lg:text-body-pc">賃貸・売買・管理でご利用いただいた方から、あとで聞かせていただいた話です。</p>
						<p className="mt-2 text-small text-ink-weak lg:text-small-pc">すべて架空の事例です。実在の方の声ではありません。</p>
					</div>
				</Container>
			</section>

			{KINDS.map((kind, i) => (
				<section key={kind} className={i % 2 === 0 ? 'bg-surface-alt py-12 lg:py-16' : 'py-12 lg:py-16'}>
				<Container>
					<h2 className="text-h2 font-bold lg:text-h2-pc">{kind}のご相談</h2>
					<ul className="mt-6 grid max-w-[760px] gap-4">
						{voices.filter((v) => v.kind === kind).map((v) => (
							<li key={v.who} className="rounded-hr border border-line bg-surface p-4 lg:p-6">
								<p className="text-small text-ink-weak lg:text-small-pc">
									{v.town} / {v.kind} / {v.attr}
								</p>
								<p className="mt-2 text-body text-ink lg:text-body-pc">{v.text}</p>
								<p className="mt-3 text-xs text-ink-weak lg:text-xs-pc">{v.who}(架空)</p>
							</li>
						))}
					</ul>
				</Container>
				</section>
			))}

			<section className="py-12 lg:py-16">
				<Container>
					<div className="max-w-[760px]">
						<h2 className="text-h2 font-bold lg:text-h2-pc">ご相談はこちらから</h2>
						<div className="mt-6 grid gap-2 sm:grid-cols-3">
							<Link href="/properties" className={SECONDARY}>
								物件を探す
							</Link>
							<Link href="/sell#form" className={SECONDARY}>
								査定を依頼する
							</Link>
							<Link href="/owner#form" className={SECONDARY}>
								管理を相談する
							</Link>
						</div>
					</div>
				</Container>
			</section>
		</>
	);
}
