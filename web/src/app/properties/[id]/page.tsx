import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { Badge } from '@/components/property/Badge';
import { CtaBlock } from '@/components/property/CtaBlock';
import { Gallery } from '@/components/property/Gallery';
import { InfoTable } from '@/components/property/InfoTable';
import { KeySpecBand } from '@/components/property/KeySpecBand';
import { MapLoader } from '@/components/property/MapLoader';
import { PropertyCard } from '@/components/property/PropertyCard';
import { RecentlyViewed } from '@/components/property/RecentlyViewed';
import { company, formatRent, staff as staffList } from '@/config/site';
import { badgesFor } from '@/lib/badges';
import { builtLabel, feeLabel, mainPrice, walkLabel } from '@/lib/format';
import { pointChips } from '@/lib/points';
import { getProperties, getProperty, getTerms } from '@/lib/properties';
import { relatedProperties } from '@/lib/related';
import { keySpecs } from '@/lib/summary';

/**
 * 物件詳細(実装順 2・01 §3)。これは初案。
 * 全件を generateStaticParams で列挙し静的生成(rules/static-rendering.md §1)。一覧に無い ID は 404(dynamicParams = false)。
 * 順序(03 §7):ギャラリー → 物件名・価格・バッジ → 主CTA → 基本情報表 → コメント → 地図 → 関連4件 → 主CTA → 最近見た物件
 * 成約済み(J-037):404 にせず「この物件は成約しました」+類似4件。内見予約 CTA は出さない(初案)。
 */
export const dynamicParams = false;

export async function generateStaticParams() {
	const all = await getProperties();
	return all.map((p) => ({ id: p.no }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
	const { id } = await params;
	const p = await getProperty(id);
	if (!p) return { title: '物件が見つかりません' };
	return {
		title: `${p.title} | ${mainPrice(p)}`,
		description: `${p.address}。${p.layout ? `${p.layout}・` : ''}${p.areaSqm ?? ''}㎡。${company.notice}`,
	};
}

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const [p, all, stations, features, collections, kinds, areas] = await Promise.all([
		getProperty(id),
		getProperties(),
		getTerms('station'),
		getTerms('feature_tag'),
		getTerms('collection'),
		getTerms('property_kind'),
		getTerms('area'),
	]);
	if (!p) notFound();

	const nowIso = new Date().toISOString();
	const now = new Date(nowIso);
	const stationName = (slug: string) => stations.find((t) => t.slug === slug)?.name ?? slug;
	const featureName = (slug: string) => features.find((t) => t.slug === slug)?.name ?? slug;
	const badges = badgesFor(p, now);
	const sold = p.status === 'sold';
	const related = relatedProperties(all, p, 4);
	const typeLabel = p.type === 'rental' ? '賃貸' : '売買';
	const collectionName = (slug: string) => collections.find((t) => t.slug === slug)?.name ?? slug;
	// 関連4件・最近見た物件のカード(J-046)
	const kindName = (slug: string) => kinds.find((t) => t.slug === slug)?.name ?? slug;
	const areaLabel = (slug: string) => {
		const town = areas.find((t) => t.slug === slug);
		const ward = town?.parent ? areas.find((t) => t.slug === town.parent) : undefined;
		return town ? `${ward?.name ?? ''}${town.name}` : slug;
	};
	const kindNames = Object.fromEntries(kinds.map((t) => [t.slug, t.name]));
	const areaLabels = Object.fromEntries(areas.filter((t) => t.parent).map((t) => [t.slug, `${areas.find((w) => w.slug === t.parent)?.name ?? ''}${t.name}`]));
	const featureNames = Object.fromEntries(features.map((t) => [t.slug, t.name]));
	const collectionNames = Object.fromEntries(collections.map((t) => [t.slug, t.name]));
	const points = pointChips(p, { featureName, collectionName }, now);
	const staffInfo = staffList.find((st) => st.name === p.staff);
	const second = p.stations[1];
	// 右カラムの要約(J-039):築年 / 向き / 入居可能日(売買は引渡し)/ 最寄2駅目
	const summary: [string, string][] = [
		['築年', p.builtYm ? (builtLabel(p.builtYm, now) ?? '—') : '—'],
		['向き', p.direction || '—'],
		[p.type === 'rental' ? '入居可能日' : '引渡し', (p.type === 'rental' ? p.rental?.availableFrom : p.sale?.handover) || '—'],
		['2駅目', second ? `${stationName(second.slug)}駅 ${walkLabel(second.walk)}` : '—'],
	];

	return (
		<>
			<section className="py-6 lg:py-8">
				<Container>
					{/* パンくず(01 共通要素) */}
					<nav aria-label="現在位置" className="text-small text-ink-weak">
						<ol className="flex flex-wrap items-center gap-2">
							<li>
								<Link href="/" className="hover:underline">
									トップ
								</Link>
							</li>
							<li aria-hidden="true">/</li>
							<li>
								<Link href={p.type === 'rental' ? '/properties' : '/properties?type=sale'} className="hover:underline">
									{typeLabel}物件を探す
								</Link>
							</li>
							<li aria-hidden="true">/</li>
							<li aria-current="page" className="text-ink">
								{p.title}
							</li>
						</ol>
					</nav>

					{sold && (
						<div role="status" className="mt-6 rounded-hr border border-line bg-surface-alt p-4 lg:p-6">
							<p className="text-h3 font-bold text-sumi lg:text-h3-pc">この物件は成約しました</p>
							<p className="mt-2 text-small text-ink-weak">ご覧いただきありがとうございます。下に同じエリア・条件の物件を表示しています。</p>
						</div>
					)}

					<div className="mt-6 lg:grid lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-8">
						{/* 1 ギャラリー */}
						<Gallery images={p.images} floorplan={p.floorplan} title={p.title} />

						{/* 2 物件名・価格・バッジ → 3 CTA */}
						<div className="mt-6 lg:mt-0">
							{badges.length > 0 && (
								<div className="flex gap-1">
									{badges.map((b) => (
										<Badge key={b} kind={b} />
									))}
								</div>
							)}
							<h1 className="mt-2 text-h1 font-bold lg:text-h1-pc">{p.title}</h1>
							<p className="mt-1 text-small text-ink-weak">
								{p.address} / {p.stations[0] ? `${stationName(p.stations[0].slug)}駅 ${walkLabel(p.stations[0].walk)}` : ''}
							</p>
							<p className="tabular mt-4 text-price-detail font-bold text-sumi lg:text-price-detail-pc">{mainPrice(p)}</p>
							{p.type === 'rental' && p.rental && (
								<p className="text-small text-ink-weak">
									管理費・共益費 {feeLabel(p.rental.maintenanceFee)} / 敷金{' '}
									{p.rental.depositMonths === 0 ? 'なし' : `${p.rental.depositMonths}ヶ月`} / 礼金 {p.rental.keyMoneyMonths === 0 ? 'なし' : `${p.rental.keyMoneyMonths}ヶ月`}
								</p>
							)}
							{p.type === 'rental' && p.rent != null && p.rentPrevious != null && p.rentPrevious > p.rent && (
								<p className="text-small text-badge-discount-fg">値下げ前 {formatRent(p.rentPrevious)}</p>
							)}
							<p className="mt-2 text-small">
								{p.layout || (p.kind === 'land' ? '土地' : '')}
								{p.areaSqm != null ? ` / ${p.areaSqm}㎡` : ''}
								{p.floor != null ? ` / ${p.floor}階` : ''}
							</p>
							{/* 要約(J-039):2列×2行 */}
							<dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line pt-4 text-small">
								{summary.map(([k, v]) => (
									<div key={k} className="flex gap-2">
										<dt className="shrink-0 text-ink-weak">{k}</dt>
										<dd className="text-ink">{v}</dd>
									</div>
								))}
							</dl>
							<div className="mt-6">
								<CtaBlock no={p.no} type={p.type} sold={sold} />
							</div>
						</div>
					</div>
				</Container>
			</section>

			{/* 4 基本情報表(J-039:4区分・PC 2ペア) */}
			<section className="bg-surface-alt py-12 lg:py-16">
				<Container>
					<h2 className="text-h2 font-bold lg:text-h2-pc">物件概要</h2>
					{/* キー項目の帯(J-047・案 A)。項目は固定・値のみ・本文より1段大きいだけ */}
					<div className="mt-6">
						<KeySpecBand specs={keySpecs(p, stationName, now)} />
					</div>
					<div className="mt-6">
						<InfoTable p={p} stationName={stationName} featureName={featureName} now={now} />
					</div>
				</Container>
			</section>

			{/* 5 この物件について:ポイントチップ → 本文 → 担当者カード(J-039) */}
			<section className="py-12 lg:py-16">
				<Container>
					<h2 className="text-h2 font-bold lg:text-h2-pc">この物件について</h2>
					{/* ポイントタグは同じ条件の一覧へのリンク(J-040)。見た目は据え置き、hover は J-035 と同じ 150ms */}
					{points.length > 0 && (
						<ul className="mt-6 flex flex-wrap gap-x-1 gap-y-2" aria-label="この物件のポイント">
							{points.map((pt) => (
								<li key={pt.label}>
									<Link
										href={pt.href}
										className="block h-8 rounded-hr border border-accent bg-badge-new-bg px-2 text-small leading-8 font-bold whitespace-nowrap text-accent-strong transition-[background-color,border-color,color] duration-150 hover:bg-accent hover:text-white active:bg-accent active:text-white motion-reduce:transition-none"
									>
										{pt.label}
									</Link>
								</li>
							))}
						</ul>
					)}
					<p className="mt-6 whitespace-pre-line">{p.comment}</p>
					{/* 担当者カード:イニシャル枠+氏名+役職・資格(config/site.ts)。一言はデータに無いので出さない */}
					<div className="mt-6 flex items-center gap-4 rounded-hr border border-line bg-surface p-4">
						<div aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-hr bg-surface-alt text-h3 font-bold text-ink-weak">
							{p.staff.trim().charAt(0)}
						</div>
						<div>
							<p className="text-small text-ink-weak">担当</p>
							<p className="font-bold text-sumi">
								{p.staff}
								<span className="ml-1 text-xs font-normal text-ink-weak lg:text-xs-pc">(架空)</span>
							</p>
							{staffInfo && (
								<p className="text-small text-ink-weak">
									{staffInfo.role}
									{staffInfo.qualifications.length > 0 ? ' / ' + staffInfo.qualifications.join('・') : ''}
								</p>
							)}
						</div>
					</div>
				</Container>
			</section>

			{/* 6 地図 */}
			<section className="bg-surface-alt py-12 lg:py-16">
				<Container>
					<h2 className="text-h2 font-bold lg:text-h2-pc">所在地</h2>
					<p className="mt-2 text-small text-ink-weak">{p.address}(架空の住所のため、ピンの位置は町の代表座標付近です)</p>
					<div className="mt-6">
						<MapLoader lat={p.lat} lng={p.lng} title={p.title} />
					</div>
				</Container>
			</section>

			{/* 7 関連4件 */}
			{related.length > 0 && (
				<section className="py-12 lg:py-16">
					<Container>
						<div className="flex items-baseline justify-between">
							<h2 className="text-h2 font-bold lg:text-h2-pc">{sold ? '同じエリア・条件の物件' : '同じエリア・条件の物件'}</h2>
							<Link href={`/properties?${p.type === 'sale' ? 'type=sale&' : ''}area=${p.area}`} className="text-small text-accent-strong underline">
								すべて見る
							</Link>
						</div>
						<ul className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4 lg:gap-4">
							{related.map((r) => (
								<li key={r.no}>
									<PropertyCard p={r} stationName={stationName} now={now} kindName={kindName} areaLabel={areaLabel} tagNames={{ collectionName, featureName }} />
								</li>
							))}
						</ul>
					</Container>
				</section>
			)}

			{/* 8 CTA(下部) */}
			<section className="bg-surface-alt py-12 lg:py-16">
				<Container>
					<h2 className="text-h2 font-bold lg:text-h2-pc">{sold ? 'お問い合わせ' : 'この物件を見てみる'}</h2>
					<div className="mt-6">
						<CtaBlock no={p.no} type={p.type} sold={sold} />
					</div>
					<p className="mt-4 text-xs text-ink-weak lg:text-xs-pc">{company.formNotice}</p>
				</Container>
			</section>

			{/* 9 最近見た物件(Client・localStorage) */}
			<section className="py-12 lg:py-16">
				<Container>
					<RecentlyViewed
						all={all}
						currentNo={p.no}
						stationNames={Object.fromEntries(stations.map((t) => [t.slug, t.name]))}
						kindNames={kindNames}
						areaLabels={areaLabels}
						featureNames={featureNames}
						collectionNames={collectionNames}
						nowIso={nowIso}
					/>
				</Container>
			</section>
		</>
	);
}
