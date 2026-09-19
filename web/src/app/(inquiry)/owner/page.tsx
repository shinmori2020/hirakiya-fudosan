import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { OwnerForm } from '@/components/forms/OwnerForm';
import { OwnerExplanation } from './Explanation';
import { company } from '@/config/site';

export const metadata: Metadata = {
	title: '管理・空室のご相談(オーナー様へ)',
	description: `賃貸管理の受託・空室のご相談を承ります。${company.formNotice}`,
};

/**
 * 管理・空室のご相談(実装順 5・J-105 ④ → J-108)。フォームは実装順 5(案A)、説明(管理サービスの内容・管理実績・管理料の目安・空室対策・01 §12 の要素1〜4)は実装順 6 で足した。
 * 説明は Server で描画して OwnerForm に渡し、左カラムの h1 と #form の間に入る。BtoB の切替は文言のみ(J-116)。
 * page.tsx では searchParams を読まない(static-rendering.md §2)。④ はクエリを使わないので Suspense も要らない。
 * レイアウトは ①②③ と同じ(03 §7 フォームページ):lg 以上 3fr / 2fr・gap 32。
 */
export default function OwnerPage() {
	// Turnstile の site key は公開値。サーバーで env を読んで props で渡す(NEXT_PUBLIC_ にしない)
	const turnstileSiteKey = process.env.TURNSTILE_SITE_KEY ?? '';

	return (
		<section className="py-6 lg:py-8">
			<Container>
				<div className="lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-8">
					<OwnerForm turnstileSiteKey={turnstileSiteKey} explanation={<OwnerExplanation />} />
				</div>
			</Container>
		</section>
	);
}
