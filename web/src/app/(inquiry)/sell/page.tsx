import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { SellForm } from '@/components/forms/SellForm';
import { SellExplanation } from './Explanation';
import { company } from '@/config/site';

export const metadata: Metadata = {
	title: '売却・査定のご相談',
	description: `マンション・戸建・土地の査定を承ります(無料)。${company.formNotice}`,
};

/**
 * 売却・査定のご相談(実装順 5・J-105 ③)。フォームは実装順 5(案A)、説明(売却の流れ・当社で売る理由・売却事例・01 §11 の要素1〜3)は実装順 6 で足した。
 * 説明は Server で描画して SellForm に渡し、左カラムの h1 と #form の間に入る(右カラムには入れない・03 §7 v0.88)。
 * page.tsx では searchParams を読まない(static-rendering.md §2)。③ はクエリを使わないので Suspense も要らない。
 * レイアウトは ①② と同じ(03 §7 フォームページ):lg 以上 3fr / 2fr・gap 32。
 * 3つの子(H1と説明 / 右カラム / フォーム)は SellForm が返し、ここではその置き場所だけを決める。
 */
export default function SellPage() {
	// Turnstile の site key は公開値。サーバーで env を読んで props で渡す(NEXT_PUBLIC_ にしない)
	const turnstileSiteKey = process.env.TURNSTILE_SITE_KEY ?? '';

	return (
		<section className="py-6 lg:py-8">
			<Container>
				<div className="lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-8">
					<SellForm turnstileSiteKey={turnstileSiteKey} explanation={<SellExplanation />} />
				</div>
			</Container>
		</section>
	);
}
