import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Container } from '@/components/layout/Container';
import type { PropertyOption } from '@/components/forms/TargetProperty';
import { ViewingForm } from '@/components/forms/ViewingForm';
import { company } from '@/config/site';
import { mainPrice } from '@/lib/format';
import { getProperties, getTerms } from '@/lib/properties';

export const metadata: Metadata = {
	title: '内見予約',
	description: `物件の内見・見学のご予約はこちらから。${company.formNotice}`,
};

/**
 * 内見予約(実装順 5・J-105 ①。J-102 の /contact から内見を切り出したもの)。
 * page.tsx では searchParams を読まない(static-rendering.md §2)。`?property` は Client(ViewingForm)が読み、
 * 無い・不正・成約済みなら /contact へ移る(◆1:注記は出さない)。
 * レイアウトは 03 §7 フォームページ:lg 以上 3fr / 2fr、右に対象物件(J-104 の密度)。ContactForm と同じく
 * 3つの子(H1と注記 / 対象物件 / フォーム)を返し、置き場所はここのグリッドが決める。
 */
export default async function ViewingPage() {
	const [all, areas, stations] = await Promise.all([getProperties(), getTerms('area'), getTerms('station')]);
	const areaLabels = Object.fromEntries(areas.filter((t) => t.parent).map((t) => [t.slug, `${areas.find((w) => w.slug === t.parent)?.name ?? ''}${t.name}`]));
	const stationNames = Object.fromEntries(stations.map((t) => [t.slug, t.name]));
	const options: PropertyOption[] = all.map((p) => ({
		no: p.no,
		title: p.title,
		priceLabel: mainPrice(p),
		thumb: p.thumb,
		type: p.type,
		sold: p.status === 'sold',
		layout: p.layout,
		areaSqm: p.areaSqm,
		builtYm: p.builtYm,
		stations: p.stations,
		area: p.area,
	}));
	const nowIso = new Date().toISOString();
	const turnstileSiteKey = process.env.TURNSTILE_SITE_KEY ?? '';

	return (
		<section className="py-6 lg:py-8">
			<Container>
				<div className="lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-8">
					<Suspense fallback={<p className="text-ink-weak">読み込み中…</p>}>
						<ViewingForm options={options} names={{ areaLabels, stationNames }} nowIso={nowIso} turnstileSiteKey={turnstileSiteKey} />
					</Suspense>
				</div>
			</Container>
		</section>
	);
}
