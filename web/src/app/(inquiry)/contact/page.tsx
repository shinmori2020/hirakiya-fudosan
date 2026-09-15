import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Container } from '@/components/layout/Container';
import { ContactForm, type ContactPropertyOption } from '@/components/forms/ContactForm';
import { company } from '@/config/site';
import { mainPrice } from '@/lib/format';
import { getProperties } from '@/lib/properties';

export const metadata: Metadata = {
	title: '内見予約・お問い合わせ',
	description: `内見のご希望・空室確認・ご質問はこちらから。${company.formNotice}`,
};

/**
 * 内見予約・問い合わせ(実装順 5・01 §4・J-102)。フォーム3本の1本目。
 * page.tsx では searchParams を読まない(static-rendering.md §2。読むとこのルートが Dynamic になる)。
 * `?property` `?kind` は Client(ContactForm)が useSearchParams で読む(Suspense で包む)。
 * 対象物件の表示用に、index.json の必要最小の項目(番号 / 名前 / 家賃(価格)/ 写真1枚 / 種別 / 成約済みか)を
 * props で渡す。Action 側では ID から読み直して再解決する(クライアントの表示を信用しない)。
 */
export default async function ContactPage() {
	const options: ContactPropertyOption[] = (await getProperties()).map((p) => ({
		no: p.no,
		title: p.title,
		priceLabel: mainPrice(p),
		thumb: p.thumb,
		type: p.type,
		sold: p.status === 'sold',
	}));
	// Turnstile の site key は公開値。サーバーで env を読んで props で渡す(NEXT_PUBLIC_ にしない。.env.example の名前のまま)
	const turnstileSiteKey = process.env.TURNSTILE_SITE_KEY ?? '';

	return (
		<section className="py-6 lg:py-8">
			<Container>
				<div className="max-w-[760px]">
					<Suspense fallback={<p className="text-ink-weak">読み込み中…</p>}>
						<ContactForm options={options} turnstileSiteKey={turnstileSiteKey} />
					</Suspense>
				</div>
			</Container>
		</section>
	);
}
