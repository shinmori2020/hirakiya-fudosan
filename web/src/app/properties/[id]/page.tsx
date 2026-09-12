import { LayoutGrid, TrainFront } from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Container } from '@/components/layout/Container';
import { Badge } from '@/components/property/Badge';
import { CtaBlock } from '@/components/property/CtaBlock';
import { FeatureChips } from '@/components/property/FeatureChips';
import { Gallery } from '@/components/property/Gallery';
import { InfoTable } from '@/components/property/InfoTable';
import { MapLoader } from '@/components/property/MapLoader';
import { PropertyCard } from '@/components/property/PropertyCard';
import { RecentlyViewed } from '@/components/property/RecentlyViewed';
import { company, formatPrice, formatRent, lines as LINES, staff as staffList } from '@/config/site';
import { AttrLink } from '@/components/property/AttrLink';
import { badgesFor } from '@/lib/badges';
import { builtLabel, dateLabel, feeLabel, mainPrice, sqmLabel, walkLabel } from '@/lib/format';
import { kindHref } from '@/lib/links';
import { pointChips } from '@/lib/points';
import { getProperties, getProperty, getTerms } from '@/lib/properties';
import { relatedProperties } from '@/lib/related';
import { monthlyTotalLabel } from '@/lib/summary';

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
	// 所在地・沿線のリンク用(J-051)
	const lineName = (slug: string) => LINES.find((l) => l.slug === slug)?.name ?? slug;
	const townTerm = areas.find((t) => t.slug === p.area);
	const wardTerm = townTerm?.parent ? areas.find((t) => t.slug === townTerm.parent) : undefined;
	const addressArea = {
		wardName: wardTerm?.name ?? '',
		townName: townTerm?.name ?? '',
		wardTownSlugs: wardTerm ? areas.filter((t) => t.parent === wardTerm.slug).map((t) => t.slug) : [],
	};
	const staffInfo = staffList.find((st) => st.name === p.staff);
	const second = p.stations[1];
	// 右カラムの要約(J-039):築年 / 向き / 入居可能日(売買は引渡し)/ 最寄2駅目
	const summary: [string, string][] = [
		['築年', p.builtYm ? (builtLabel(p.builtYm, now) ?? '—') : '—'],
		['向き', p.direction || '—'],
		[p.type === 'rental' ? '入居可能日' : '引渡し', dateLabel(p.type === 'rental' ? p.rental?.availableFrom : p.sale?.handover)],
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
							{/* 状態バッジ(塗り)と種目(枠線のみのリンク)を同じ行に。形を変えて種類の違いを見せる(J-050) */}
							<div className="flex flex-wrap items-center gap-1">
								{badges.map((b) => (
									<Badge key={b} kind={b} />
								))}
								<AttrLink href={kindHref(p.type, p.kind)} variant="kind">
									{kindName(p.kind)}
								</AttrLink>
							</div>
							<h1 className="mt-2 text-h1 font-bold lg:text-h1-pc">{p.title}</h1>
							{/*
							 * J-070:決め手は右カラムに集約する(物件概要の3項目は廃止)。
							 * 駅徒歩と町名は1行(J-073)。探す段階で効くのは駅徒歩で、町名はその補足。
							 * 駅徒歩・家賃・スペックに lucide のアイコン(J-063 と同じ選定)。物件名には付けない。
							 * J-071 → J-074:アイコンは隣の文字の大きさに合わせる(本文の行は 16px)。揃えは行の文字の大きさで変える:
							 *   大きい文字(価格)はベースライン、本文サイズの行は中央(items-center)。本文サイズでベースラインに載せると
							 *   アイコンが文字より上に見えるため。
							 * J-072:価格にはアイコンを付けない(大きさを合わせても価格より目立つため)。駅徒歩とスペックの 16px は据え置き。
							 *   住所は区・町までにする(番地は 0-0-0 の架空表記で情報量が無く、探す段階では使わない)。完全な住所は詳細情報に残す。
							 */}
							{/* J-073:駅徒歩と町名は同じ行に。町名は場所の補足なので薄く・細く、区切りはスペックと同じ「/」 */}
							{/* J-074:本文サイズの行はベースライン揃えだとアイコンが上に見えるので中央揃えにする */}
							<p className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-0 text-body font-bold text-sumi lg:text-body-pc">
								<TrainFront aria-hidden="true" className="size-4 shrink-0 text-accent" />
								<span>{p.stations[0] ? `${stationName(p.stations[0].slug)}駅 ${walkLabel(p.stations[0].walk)}` : '—'}</span>
								<span className="text-small font-normal text-ink-weak">/ {areaLabel(p.area)}</span>
							</p>
							{/* J-072:価格の左のアイコンは外す。左端は物件名・住所・内訳・要約と揃える(この列の縦のラインを通す) */}
							<p className="tabular mt-4 text-price-detail font-bold text-sumi lg:text-price-detail-pc">{mainPrice(p)}</p>
							{p.type === 'rental' && p.rental && (
								<p className="text-small text-ink-weak">
									管理費・共益費 {feeLabel(p.rental.maintenanceFee)} / 敷金{' '}
									{p.rental.depositMonths === 0 ? 'なし' : `${p.rental.depositMonths}ヶ月`} / 礼金 {p.rental.keyMoneyMonths === 0 ? 'なし' : `${p.rental.keyMoneyMonths}ヶ月`}
								</p>
							)}
							{/* 売買は毎月の支払いが判断材料なので、価格の下に管理費+修繕積立金の合計を出す(J-059 の考え方を引き継ぐ) */}
							{p.type === 'sale' && monthlyTotalLabel(p.sale?.mgmtFee, p.sale?.repairFund) && (
								<p className="text-small text-ink-weak">{monthlyTotalLabel(p.sale?.mgmtFee, p.sale?.repairFund)}</p>
							)}
							{p.type === 'rental' && p.rent != null && p.rentPrevious != null && p.rentPrevious > p.rent && (
								<p className="text-small text-badge-discount-fg">値下げ前 {formatRent(p.rentPrevious)}</p>
							)}
							{p.type === 'sale' && p.price != null && p.pricePrevious != null && p.pricePrevious > p.price && (
								<p className="text-small text-badge-discount-fg">値下げ前 {formatPrice(p.pricePrevious)}</p>
							)}
							<p className="mt-3 flex items-center gap-1 text-body font-bold text-sumi lg:text-body-pc">
								<LayoutGrid aria-hidden="true" className="size-4 shrink-0 text-accent" />
								{p.kind === 'land'
									? `土地 ${sqmLabel(p.sale?.landSqm ?? null)}`
									: `${p.layout}${p.areaSqm != null ? ` / ${p.areaSqm}㎡` : ''}${p.floor != null ? ` / ${p.floor}階` : ''}`}
							</p>
							{/* J-074:設備のチップを物件概要から右カラム(スペックの下・要約の上)へ移した */}
							<div className="mt-3">
								<FeatureChips features={p.features} type={p.type} featureName={featureName} />
							</div>
							{/*
							 * 要約(J-039 → J-068 → J-069)。PC(lg 以上)は縦1列にして拾い読みできるようにする。
							 * ラベルは 6.5em の固定幅(情報表と同じ規則・J-052)。値はその右に詰める。
							 * J-069:各行の下に細い横線(情報表と同じ border-line 1px)。最終行の下にも引くので4本。
							 *   行の高さは情報表と同じ上下 8 にし、行間(gap)は 0 にする(線と余白が二重にならないように)。
							 * スマホ(〜1023)は従来どおり2列×2行のまま(縦に伸ばすと CTA が下に押されるため)。
							 *   2列のままで各セルに線を引くと横に2本並んで表に見えるので、線は縦1列の時だけ引く。
							 * J-070:スペックの下にあった区切り線は削除し、余白(24)で区切る(要約の罫線と役割が混ざるため)。
							 */}
							<dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-2 text-small lg:grid-cols-1 lg:gap-y-0">
								{summary.map(([k, v]) => (
									<div
										key={k}
										className="flex gap-2 lg:grid lg:grid-cols-[6.5em_minmax(0,1fr)] lg:gap-x-2 lg:border-b lg:border-line lg:py-2"
									>
										<dt className="shrink-0 text-ink-weak">{k}</dt>
										<dd className="text-ink">{v}</dd>
									</div>
								))}
							</dl>
							{/* 電話を外した分、要約と CTA の間を詰める(J-050:24 → 16)。1024 以上は2列(J-075) */}
							<div className="mt-4">
								<CtaBlock no={p.no} type={p.type} sold={sold} layout="sidebar" />
							</div>
						</div>
					</div>
				</Container>
			</section>

			{/* 4 基本情報表(J-039:4区分・PC 2ペア) */}
			<section className="bg-surface-alt py-12 lg:py-16">
				<Container>
					{/* J-076:見出しは「物件データ」。概要は右カラムが担い、ここは数値と条件の置き場 */}
					<h2 className="text-h2 font-bold lg:text-h2-pc">物件データ</h2>
					{/* J-070:決め手の3項目(J-047 の帯 → J-059 の3項目)は廃止。決め手は右カラムに集約した */}
					<div className="mt-4">
						<InfoTable p={p} stationName={stationName} lineName={lineName} area={addressArea} now={now} />
					</div>
				</Container>
			</section>

			{/* 5 この物件について:ポイントチップ → 本文 → 担当者カード(J-039) */}
			<section className="py-12 lg:py-16">
				<Container>
					<h2 className="text-h2 font-bold lg:text-h2-pc">この物件について</h2>
					{/* ポイントタグは同じ条件の一覧へのリンク(J-040)。見た目は設備・種目と同じ「押せるチップ」に統一(J-052) */}
					{points.length > 0 && (
						<ul className="mt-6 flex flex-wrap gap-x-1 gap-y-2" aria-label="この物件のポイント">
							{points.map((pt) => (
								<li key={pt.label}>
									<AttrLink href={pt.href} variant="chip">
										{pt.label}
									</AttrLink>
								</li>
							))}
						</ul>
					)}
					{/*
					 * 担当者コメント(J-053)。本文を担当者カードの中に入れて1枚にまとめる。
					 * カードは全幅。PC(sm 以上)は左に顔写真(プレースホルダー・3:4・幅 240)、右に 氏名・役職・資格 と紹介文。
					 * スマホ(〜639)は上下に積み、写真は幅 160(3:4)。右のテキストに最大幅は付けない。
					 */}
					<div className="mt-6 flex flex-col gap-4 rounded-hr border border-line bg-surface p-4 sm:flex-row sm:gap-6 lg:p-6">
						<div className="relative aspect-[3/4] w-40 shrink-0 overflow-hidden rounded-hr bg-surface-alt sm:w-60">
							<Image
								src={staffInfo?.photo ?? '/placeholders/staff/staff-1.svg'}
								alt={`${p.staff}(架空)`}
								fill
								sizes="(min-width: 40rem) 240px, 160px"
								className="object-cover"
								unoptimized
							/>
						</div>
						<div className="min-w-0">
							<p className="font-bold text-sumi">
								<span className="mr-2 text-xs font-normal text-ink-weak lg:text-xs-pc">担当</span>
								{p.staff}
								<span className="ml-1 text-xs font-normal text-ink-weak lg:text-xs-pc">(架空)</span>
							</p>
							{staffInfo && (
								<p className="mt-0.5 text-small text-ink-weak">
									{staffInfo.role}
									{staffInfo.qualifications.length > 0 ? ' / ' + staffInfo.qualifications.join('・') : ''}
								</p>
							)}
							<p className="mt-3 border-t border-line pt-3 whitespace-pre-line">{p.comment}</p>
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
					{/* 下部の CTA は 640 以上で2列(J-064)。注意書きはその下に全幅で残す */}
					<div className="mt-6">
						<CtaBlock no={p.no} type={p.type} sold={sold} layout="row" />
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
