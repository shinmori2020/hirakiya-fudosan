import { Container } from '@/components/layout/Container';
import { company } from '@/config/site';

/**
 * 実装順 0 の確認用ページ。トップ本体は実装順 3 で置き換える。
 * 白と薄灰の帯を交互に(03 §7)、セクション間 48/64(§5)を確認する。
 */
export default function Home() {
	return (
		<>
			<section className="py-12 lg:py-16">
				<Container>
					<h1 className="text-h1 font-bold lg:text-h1-pc">{company.tagline}</h1>
					<p className="mt-6 text-ink-weak">
						土台(実装順 0)の確認ページです。ヘッダー・フッター・架空注記バー・ページ枠を確認します。トップページ本体は実装順 3 で作ります。
					</p>
				</Container>
			</section>
			<section className="bg-surface-alt py-12 lg:py-16">
				<Container>
					<h2 className="text-h2 font-bold lg:text-h2-pc">薄灰の帯</h2>
					<p className="mt-6">セクションは白と薄灰の帯を交互に置きます。見出しは H2 左寄せ。本文は 15px / 16px、行間 1.7。</p>
				</Container>
			</section>
		</>
	);
}
