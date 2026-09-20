import type { Metadata } from 'next';
import Link from 'next/link';
import { HomeSearch, type StationGroup } from '@/components/home/HomeSearch';
import { Container } from '@/components/layout/Container';
import { MapLoader } from '@/components/property/MapLoader';
import { PropertyCard } from '@/components/property/PropertyCard';
import { company, lines as LINES, news, offices, serviceAreas, voices } from '@/config/site';
import { dateLabel } from '@/lib/format';
import { latestProperties } from '@/lib/home';
import { coveredCounts } from '@/lib/entries';
import { getProperties, getTerms } from '@/lib/properties';

/**
 * トップ(実装順 3・01 §1)。これは初案。
 * 並び(01 §1):FV(キャッチ+検索フォーム)→ 探し方の入口3導線 → 新着 → 強み3点 → 3枚のカード → お客様の声 → お知らせ → 店舗案内。
 * 白と薄灰の帯を交互に(03 §7)。値は config/site.ts と data/ から取り、ベタ書きしない。
 * 新着の抽出と検索 URL の組み立ては lib/home.ts の純関数(J-056・テスト先行)。
 * 入口のリンクは J-051 の listHref を使う(新しい URL の作り方は足さない)。
 * カードの表示アニメ(J-036)はトップには持ち込まない(条件が変わらないため・J-056 項目11)。
 */
/** 対応エリアの区名(config の serviceAreas から作る。地名をベタ書きしない) */
const wardLabel = serviceAreas.map((w) => w.ward).join('・');

export const metadata: Metadata = {
	title: `${company.name} | ${company.tagline}`,
	description: `${wardLabel}の賃貸・売買・賃貸管理。${company.notice}`,
};

export default async function Home() {
	const [all, areaTerms, stationTerms, collectionTerms, kindTerms] = await Promise.all([
		getProperties(),
		getTerms('area'),
		getTerms('station'),
		getTerms('collection'),
		getTerms('property_kind'),
	]);
	const now = new Date();

	// エリア:config の表示順(区 → 町)で、タクソノミーの slug に対応させる
	const areas = serviceAreas.map((w) => {
		const towns: { slug: string; name: string }[] = [];
		for (const name of w.towns) {
			const term = areaTerms.find((t) => t.name === name && t.parent);
			if (term) towns.push({ slug: term.slug, name: term.name });
		}
		return { ward: String(w.ward), towns };
	});

	// 駅:沿線6本でグループ化。複数路線の駅は沿線の並び順で最初の1本にだけ置く(J-034 B と同じ・J-056)
	const used = new Set<string>();
	const stationGroups: StationGroup[] = LINES.map((line) => ({
		lineSlug: line.slug,
		lineName: line.name,
		stations: stationTerms
			.filter((t) => {
				if (used.has(t.slug)) return false;
				if (!String(t.meta?.lines ?? '').split(',').includes(line.slug)) return false;
				used.add(t.slug);
				return true;
			})
			.map((t) => ({ slug: t.slug, name: t.name })),
	}));

	const kinds = kindTerms.map((t) => ({ slug: t.slug, name: t.name }));

	// 入口カードの件数(J-126)。チップを外した代わりに「何件の入口が何件の物件に繋がるか」を1行で出す。
	// 数え方は入口ページと同じ(lib/entries.ts・成約済みを含む・J-095)。
	const entrySummary = (key: 'area' | 'line' | 'collection', terms: { slug: string; name: string }[], unit: string) => {
		const { rental, sale } = coveredCounts(all, key, terms.map((t) => t.slug));
		return `${terms.length}${unit} / 賃貸${rental}件・売買${sale}件`;
	};
	const townTerms = areas.flatMap((w) => w.towns);
	const latest = latestProperties(all);
	const stationName = (slug: string) => stationTerms.find((t) => t.slug === slug)?.name ?? slug;
	const kindName = (slug: string) => kindTerms.find((t) => t.slug === slug)?.name ?? slug;
	const collectionName = (slug: string) => collectionTerms.find((t) => t.slug === slug)?.name ?? slug;
	const featureTerms = await getTerms('feature_tag');
	const featureName = (slug: string) => featureTerms.find((t) => t.slug === slug)?.name ?? slug;
	const areaLabel = (slug: string) => {
		const town = areaTerms.find((t) => t.slug === slug);
		const ward = town?.parent ? areaTerms.find((t) => t.slug === town.parent) : undefined;
		return town ? `${ward?.name ?? ''}${town.name}` : slug;
	};

	// 強み3点(01 §1-4)を数字の形に(J-127)。/owner の管理実績と同じ作り(数字 + 単位小 + 説明)だが、
	// **会社の説明なので枠も背景も持たせない**(J-058)。数値は config から取り、ベタ書きしない
	const strengths = [
		{
			n: `${company.managedUnits}`,
			unit: '戸',
			label: '管理戸数',
			text: `入居率${company.occupancyRate}%。貸すところまで見ているので、部屋の状態や入居後の話を実物ベースで説明できます。`,
		},
		{
			n: `${now.getFullYear() - Number(company.founded.slice(0, 4))}`,
			unit: '年',
			label: '青砥・立石で創業',
			text: '2店舗とも駅から徒歩3分以内。地元の物件を、地元で見てきた担当が案内します。',
		},
		{
			// 3つ目だけ数字が無いと枠が1つ空くので「1社」にする(J-127)。3つの中で一番小さい数字が意味では逆に効く
			n: '1',
			unit: '社',
			label: '借りる・買う・貸す・売る',
			text: '同じ窓口でご相談いただけます。引越し・売却・管理で担当が変わりません。',
		},
	];

	const guides = [
		{ href: '/guide', title: '初めての方へ', text: '部屋探しの流れと、先に決めておくと早いことをまとめています。' },
		{ href: '/sell', title: '売却をお考えの方へ', text: '相場の見方と、査定でお出しする数字の根拠をご説明します。' },
		{ href: '/owner', title: 'オーナー様へ', text: '管理のご相談と空室対策。家賃を下げる前にできることから。' },
	];

	return (
		<>
			{/* 1 ファーストビュー:キャッチ + 検索フォーム(画像は置かない・J-056 項目1) */}
			<section className="py-8 lg:py-12">
				<Container>
					<h1 className="text-h1 font-bold text-sumi lg:text-display-pc">{company.tagline}</h1>
					<p className="mt-2 text-small text-ink-weak lg:text-small-pc">
						{wardLabel}の賃貸・売買・賃貸管理。{company.notice}
					</p>
					<div className="mt-6">
						<HomeSearch areas={areas} stationGroups={stationGroups} kinds={kinds} />
					</div>
				</Container>
			</section>

			{/* 2 探し方の入口:エリア / 沿線・駅 / 特集(J-051 の listHref でリンク) */}
			<section className="bg-surface-alt py-12 lg:py-16">
				<Container>
					<h2 className="text-h2 font-bold lg:text-h2-pc">探し方から選ぶ</h2>
					{/* チップ28個は入口ページと同じ語の並びで、件数も駅も種別も入口ページの方が多い(J-126)。
					    トップは「どの入口があるか」と件数だけにして、名前の一覧は入口ページに任せる */}
					<div className="mt-6 grid gap-4 lg:grid-cols-3">
						<EntryCard title="エリアから探す" href="/area" summary={entrySummary('area', townTerms, 'エリア')} text="13の町から、住みたい場所で絞ります。" />
						<EntryCard title="沿線・駅から探す" href="/line" summary={entrySummary('line', LINES.map((l) => ({ slug: l.slug, name: l.name })), '沿線')} text="6沿線13駅。通勤・通学の路線から探せます。" />
						<EntryCard title="特集から探す" href="/feature" summary={entrySummary('collection', collectionTerms.map((c) => ({ slug: c.slug, name: collectionName(c.slug) })), '特集')} text="敷金礼金なし・ペット可など、条件のまとまりから。" />
					</div>
				</Container>
			</section>

			{/* 3 新着物件(成約済みは出さない・公開日順8件) */}
			<section className="py-12 lg:py-16">
				<Container>
					<div className="flex items-baseline justify-between">
						<h2 className="text-h2 font-bold lg:text-h2-pc">新着物件</h2>
						<Link href="/properties" className="text-small text-accent-strong underline">
							すべて見る
						</Link>
					</div>
					<ul className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4 lg:gap-4">
						{latest.map((p, i) => (
							<li key={p.no}>
								<PropertyCard
									p={p}
									stationName={stationName}
									now={now}
									priority={i < 2}
									kindName={kindName}
									areaLabel={areaLabel}
									tagNames={{ collectionName, featureName }}
								/>
							</li>
						))}
					</ul>
				</Container>
			</section>

			{/* 4 会社の強み3点 */}
			<section className="bg-surface-alt py-12 lg:py-16">
				<Container>
					<h2 className="text-h2 font-bold lg:text-h2-pc">ヒラキヤ不動産の3つの強み</h2>
					{/* 会社の説明なので枠も背景も持たせない。下の3枚(導線)とは役割が違うので形を分ける(J-058) */}
					<ul className="mt-6 grid gap-6 md:grid-cols-3 lg:gap-8">
						{strengths.map((s) => (
							<li key={s.label}>
								<p className="tabular text-h2 font-bold text-sumi lg:text-h2-pc">
									{s.n}
									<span className="ml-1 text-small font-normal lg:text-small-pc">{s.unit}</span>
								</p>
								<p className="mt-1 text-h3 font-bold text-sumi lg:text-h3-pc">{s.label}</p>
								<p className="mt-2 text-small text-ink lg:text-small-pc">{s.text}</p>
							</li>
						))}
					</ul>
				</Container>
			</section>

			{/* 5 初めての方へ / 売却 / オーナー様 の3枚 */}
			<section className="py-12 lg:py-16">
				<Container>
					<ul className="grid gap-4 lg:grid-cols-3">
						{guides.map((g) => (
							<li key={g.href}>
								<Link
									href={g.href}
									className="block h-full rounded-hr border border-line bg-surface p-4 transition-colors duration-150 hover:bg-badge-new-bg motion-reduce:transition-none lg:p-6"
								>
									<p className="text-h3 font-bold text-sumi lg:text-h3-pc">{g.title}</p>
									<p className="mt-2 text-small text-ink-weak lg:text-small-pc">{g.text}</p>
								</Link>
							</li>
						))}
					</ul>
				</Container>
			</section>

			{/* 6 お客様の声(架空・config。実装順 6 の /voice と同じ配列) */}
			<section className="bg-surface-alt py-12 lg:py-16">
				<Container>
					<div className="flex items-baseline justify-between">
						<h2 className="text-h2 font-bold lg:text-h2-pc">お客様の声</h2>
						<Link href="/voice" className="text-small text-accent-strong underline">
							すべて見る
						</Link>
					</div>
					<ul className="mt-6 grid gap-4 lg:grid-cols-3">
						{voices.map((v) => (
							<li key={v.who} className="rounded-hr border border-line bg-surface p-4 lg:p-6">
								<p className="text-small text-ink-weak lg:text-small-pc">
									{v.town} / {v.kind} / {v.attr}
								</p>
								<p className="mt-2 text-small text-ink lg:text-small-pc">{v.text}</p>
								{/* 実在の方と誤認されないよう、名乗りは記号だけにして架空表記を必ず添える(J-057・00 §7-9) */}
								<p className="mt-2 text-xs text-ink-weak lg:text-xs-pc">{v.who}(架空)</p>
							</li>
						))}
					</ul>
				</Container>
			</section>

			{/* 7 お知らせ(最新3件・config。実装順 7 の /news と同じ配列) */}
			<section className="py-12 lg:py-16">
				<Container>
					<div className="flex items-baseline justify-between">
						<h2 className="text-h2 font-bold lg:text-h2-pc">お知らせ</h2>
						<Link href="/news" className="text-small text-accent-strong underline">
							すべて見る
						</Link>
					</div>
					<ul className="mt-6">
						{news.slice(0, 3).map((n) => (
							<li key={n.slug} className="border-b border-line">
								<Link
									href={`/news/${n.slug}`}
									className="flex flex-col gap-1 py-3 transition-colors duration-150 hover:bg-badge-new-bg motion-reduce:transition-none lg:flex-row lg:items-center lg:gap-4"
								>
									<span className="tabular shrink-0 text-small text-ink-weak lg:w-[7.5em] lg:text-small-pc">{dateLabel(n.date)}</span>
									{/* お知らせのカテゴリーは押せないタグ(灰枠・灰文字)。物件の属性タグ(青緑・リンク)とは別系統(J-057) */}
									{/* 幅を最長の「部屋探しのコツ」(6文字)に固定し、3行ともタイトルの左端を揃える(J-058) */}
									<span className="inline-block w-[8.5em] shrink-0 self-start rounded-hr border border-line px-2 py-0.5 text-center text-xs whitespace-nowrap text-ink-weak lg:text-xs-pc">
										{n.category}
									</span>
									<span className="text-body lg:text-body-pc">{n.title}</span>
								</Link>
							</li>
						))}
					</ul>
				</Container>
			</section>

			{/* 8 店舗案内(地図は詳細と同じ部品を再利用・OSM) */}
			<section className="bg-surface-alt py-12 lg:py-16">
				<Container>
					<h2 className="text-h2 font-bold lg:text-h2-pc">店舗案内</h2>
					<ul className="mt-6 grid gap-6 lg:grid-cols-2">
						{offices.map((o) => (
							<li key={o.slug} className="rounded-hr border border-line bg-surface p-4 lg:p-6">
								<p className="text-h3 font-bold text-sumi lg:text-h3-pc">
									{o.name}
									<span className="ml-2 text-xs font-normal text-ink-weak lg:text-xs-pc">{o.kind}</span>
								</p>
								<p className="mt-2 text-small text-ink lg:text-small-pc">{o.address}</p>
								<p className="text-small text-ink-weak lg:text-small-pc">
									{o.station} 徒歩{o.walk}分 / TEL {o.tel}
								</p>
								<p className="text-small text-ink-weak lg:text-small-pc">
									{company.hours} / {company.closed}定休
								</p>
								<div className="mt-4">
									<MapLoader lat={o.lat} lng={o.lng} title={o.name} />
								</div>
							</li>
						))}
					</ul>
				</Container>
			</section>
		</>
	);
}

/**
 * 入口カード(J-126):見出し + 1行の説明 + 件数。カード全体が入口ページへのリンク。
 * 中に町・沿線・特集の名前は並べない(同じ並びが入口ページにあり、そちらは件数・駅・種別まで出る)。
 */
function EntryCard({ title, href, summary, text }: { title: string; href: string; summary: string; text: string }) {
	return (
		<Link href={href} className="block h-full rounded-hr border border-line bg-surface p-4 transition-colors duration-150 hover:bg-badge-new-bg motion-reduce:transition-none lg:p-6">
			<h3 className="text-h3 font-bold text-sumi lg:text-h3-pc">{title}</h3>
			<p className="mt-2 text-small text-ink lg:text-small-pc">{text}</p>
			<p className="tabular mt-2 text-small text-ink-weak lg:text-small-pc">{summary}</p>
		</Link>
	);
}

