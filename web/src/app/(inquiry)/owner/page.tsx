import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { OwnerForm } from '@/components/forms/OwnerForm';
import { company } from '@/config/site';

export const metadata: Metadata = {
	title: '管理・空室のご相談(オーナー様へ)',
	description: `賃貸管理の受託・空室のご相談を承ります。${company.formNotice}`,
};

/**
 * 管理・空室のご相談(実装順 5・J-105 ④ → J-108)。今回はフォームだけ(案A の切り分け・③ と同じ)。
 * 説明(管理サービスの内容・管理実績・管理料の目安・空室対策・01 §12 の要素1〜4)は実装順 6 でこのページに足す。
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
					<OwnerForm turnstileSiteKey={turnstileSiteKey} />
				</div>
			</Container>
		</section>
	);
}
