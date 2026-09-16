import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Container } from '@/components/layout/Container';
import { ContactForm, type ContactPropertyOption } from '@/components/forms/ContactForm';
import { company } from '@/config/site';
import { mainPrice } from '@/lib/format';
import { getProperties, getTerms } from '@/lib/properties';

export const metadata: Metadata = {
	title: '内見予約・お問い合わせ',
	description: `内見のご希望・空室確認・ご質問はこちらから。${company.formNotice}`,
};

/**
 * 内見予約・問い合わせ(実装順 5・01 §4・J-102 → 骨格は J-103)。フォーム3本の1本目。
 * page.tsx では searchParams を読まない(static-rendering.md §2。読むとこのルートが Dynamic になる)。
 * `?property` `?kind` は Client(ContactForm)が useSearchParams で読む(Suspense で包む)。
 *
 * レイアウト(03 §7 フォームページ・J-103):lg 以上は物件詳細と同じ 3fr / 2fr・gap 32。
 * 列の中身は ContactForm が3つの子(H1と注記 / 対象物件 / フォーム)として返し、ここではその置き場所だけを決める。
 * Suspense は DOM を作らないので、3つの子がそのままグリッドの子になる。
 * 〜1023 は grid を効かせず、DOM の順(注記 → 対象物件 → フォーム)で縦に積む。
 *
 * 対象物件の表示用に、index.json の必要最小の項目(番号 / 名前 / 家賃(価格)/ 写真1枚 / 種別 / 成約済みか)を
 * props で渡す。Action 側では ID から読み直して再解決する(クライアントの表示を信用しない)。
 */
export default async function ContactPage() {
	const [all, areas, stations] = await Promise.all([getProperties(), getTerms('area'), getTerms('station')]);
	// 要約の名前(区+町 / 駅名)。13 + 13 件の対応表をそのまま渡し、クライアントで引く(J-104)
	const areaLabels = Object.fromEntries(areas.filter((t) => t.parent).map((t) => [t.slug, `${areas.find((w) => w.slug === t.parent)?.name ?? ''}${t.name}`]));
	const stationNames = Object.fromEntries(stations.map((t) => [t.slug, t.name]));
	const options: ContactPropertyOption[] = all.map((p) => ({
		no: p.no,
		title: p.title,
		priceLabel: mainPrice(p),
		thumb: p.thumb,
		type: p.type,
		sold: p.status === 'sold',
		// 右カラムの要約に使う項目(index.json にあるものだけ・J-104)
		layout: p.layout,
		areaSqm: p.areaSqm,
		builtYm: p.builtYm,
		stations: p.stations,
		area: p.area,
	}));
	// 築年の基準はビルド時刻。クライアントで new Date() を使うと静的な HTML と食い違うため、値で渡す(一覧の nowIso と同じ)
	const nowIso = new Date().toISOString();
	// Turnstile の site key は公開値。サーバーで env を読んで props で渡す(NEXT_PUBLIC_ にしない。.env.example の名前のまま)
	const turnstileSiteKey = process.env.TURNSTILE_SITE_KEY ?? '';

	return (
		<section className="py-6 lg:py-8">
			<Container>
				<div className="lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-8">
					<Suspense fallback={<p className="text-ink-weak">読み込み中…</p>}>
						<ContactForm options={options} turnstileSiteKey={turnstileSiteKey} names={{ areaLabels, stationNames }} nowIso={nowIso} />
					</Suspense>
				</div>
			</Container>
		</section>
	);
}
