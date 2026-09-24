import Image from 'next/image';
import { ChevronDown } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { FvCopy } from '@/components/home/FvCopy';
import { HomeSearch, type StationGroup } from '@/components/home/HomeSearch';
import { VoiceCarousel } from '@/components/home/VoiceCarousel';
import { Container } from '@/components/layout/Container';
import { attrClass } from '@/components/property/AttrLink';
import { MapLoader } from '@/components/property/MapLoader';
import { PropertyCard } from '@/components/property/PropertyCard';
import { company, lines as LINES, news, offices, serviceAreas, voices } from '@/config/site';
import { isNew } from '@/lib/badges';
import { dateLabel } from '@/lib/format';
import { listHref } from '@/lib/links';
import { latestProperties } from '@/lib/home';
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
/** FV の補足はつなぎ記号を使わない(J-135・SHIN の指示 09/21)ので半角スペースで区切る */
const wardLabelFv = serviceAreas.map((w) => w.ward).join(' ');

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
	// 2段目の入れ替え候補(J-144)。{n} は新着の件数(03 §2 の新着 = 公開14日以内・成約済みを除く)、{offices} は店舗名
	const newCount = all.filter((p) => p.status !== 'sold' && isNew(p, now)).length;
	const officeNames = offices.map((o) => o.name.replace(/(本店|支店)$/, '')).join('と');
	// 新着が0件の時は「新着物件は0件です」を出さない(件数の行だけ落とす。09/22 の実測で 0件だった)
	const taglineSubs = company.taglineSubs.filter((t) => newCount > 0 || !t.includes('{n}')).map((t) => t.replace('{n}', String(newCount)).replace('{offices}', officeNames));
	// 入口の件数(一覧の件数表示と同じ数え方。成約済みも含む・J-033)
	const totalRental = all.filter((p) => p.type === 'rental').length;
	const totalSale = all.filter((p) => p.type === 'sale').length;

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

	// 3枚の導線カード。写真は「場所・物件を示すもの」だけ置く(J-118)。
	// 初めての方へ = 店舗の外観(/company/access と同じ青砥本店の画像を流用。店内の接客風景は雰囲気を作るだけの写真に寄るため使わない・SHIN 09/20)
	// 写真は**実在の店名・施設名が写っていないもの**だけ(fictional-data.md §3)。
	// 店舗が写るものは看板が読めてしまうので、当面プレースホルダーのまま(SHIN の判断待ち)
	const guides = [
		{ href: '/guide', title: '初めての方へ', text: '部屋探しの流れと、先に決めておくと早いことをまとめています。', photo: '/placeholders/offices/aoto.svg', alt: '', unoptimized: true },
		{ href: '/sell', title: '売却をお考えの方へ', text: '相場の見方と、査定でお出しする数字の根拠をご説明します。', photo: '/placeholders/guides/sell.svg', alt: '', unoptimized: true },
		{ href: '/owner', title: 'オーナー様へ', text: '管理のご相談と空室対策。家賃を下げる前にできることから。', photo: '/photos/guide-apartment.jpg', alt: '賃貸の建物の外観(仮の写真)', unoptimized: false },
	];

	return (
		<>
			{/*
			  1 ファーストビュー(J-056 → J-130 で墨の面に)。03 §7 v0.95 の条件を守る:
			   - 面は墨、文字は白・補足は白 80%
			   - **検索フォームのパネルは白のまま**(入力欄を墨地に置かない。HomeSearch が bg-surface の箱を持つ)
			   - 青緑は「この条件で探す」の1箇所だけ(§2)
			   - 写真は**場所を示すもの**(店舗の外観・架空のためプレースホルダー・J-118 / J-129)。lg 以上だけ出す
			     (〜1023 で出すと縦に伸びて検索フォームがファーストビューから出るため)
			  最上部の架空注記バー(墨)とは**白いヘッダーが間に入る**ので、面は繋がらない。
			*/}
			{/* 高さは内容+上下の余白(48 / 64)で決める(J-140。J-132 の「画面の高さに合わせる」は撤回)。スマホの下余白は固定CTA ぶん(§5 の例外・96) */}
			<section className="relative isolate overflow-hidden bg-sumi pt-12 pb-24 lg:py-16">
				{/* 背景の写真(場所を示す写真・フリー素材・J-131。出所は docs/assets.md)。LCP なので priority */}
				<Image src="/photos/fv-town.jpg" alt="" fill priority sizes="100vw" className="-z-10 animate-fv-zoom object-cover object-center motion-reduce:animate-none" />
				{/*
				  墨の膜(03 §2・J-133 → J-135 → J-146)。**濃さに勾配を付け、位置がゆっくり動く**(§8「FV の動き」の5つ目)。
				  左上 55% → 右下 70%(〜1023 は 60% → 70%。390 は写真の明るい壁が文字の下に来るため)。色は墨のまま。
				  外の箱が FV の大きさ、中の面が 200%×200% で、中の面を translate で往復させる(JS なし)。
				  最も薄い瞬間でも見出しの下地の平均で 4.5:1 以上(§2・J-146 で実測)。文字影は残す。
				*/}
				<div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
					<div
						data-veil
						className="absolute top-0 left-0 h-[200%] w-[200%] -translate-x-1/2 -translate-y-1/2 animate-fv-veil bg-[linear-gradient(135deg,rgba(43,47,51,0.6)_0%,rgba(43,47,51,0.7)_100%)] motion-reduce:animate-none lg:bg-[linear-gradient(135deg,rgba(43,47,51,0.55)_0%,rgba(43,47,51,0.7)_100%)]"
					/>
				</div>
				<Container>
					{/*
					  J-134 → J-135:1280 以上は**左にキャッチ・右に検索フォーム**の2列。**右は 30%**(J-135。写真を広く見せる)。
					  〜1023 は縦に積む(キャッチ → 補足 → ボタン → フォーム)。
					  補足の1行は**最上部の架空注記バーと同じ内容**だったので外した(J-134。保留だった「FV の架空表記」の解消)。
					*/}
					<div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_40%] lg:items-center lg:gap-8">
						{/* min-w-0:中のカルーセル(表示枚数+1枚を並べる)が 1fr の列を押し広げないように(J-147 の実装で検索パネルが右にはみ出した) */}
						<div className="min-w-0">
							{/*
							  キャッチ2段(J-135)。膜が 30% と薄いので**墨の影**で読ませ、読み込み時に1回だけ出現効果を付ける。
							  どちらも**1段目・2段目だけ**(03 §7・§8・J-136)。補足と副ボタンには付けない。prefers-reduced-motion では止める。
							*/}
							<div className="animate-fv-in motion-reduce:animate-none">
								{/* 2段とも H1(24 / 32px・J-140)。Display は使わない。2段目は見出しの続きなので p で出す */}
								<h1 className="text-h1 font-bold text-white [text-shadow:0_2px_8px_rgba(43,47,51,0.6)] lg:text-h1-pc">{company.tagline}</h1>
								{/* 2段目は10秒ごとに入れ替わる(03 §8「FV の動き」・J-144)。初期 HTML は1本目 */}
								<FvCopy items={taglineSubs} className="mt-2 text-h1 font-bold text-white [text-shadow:0_2px_8px_rgba(43,47,51,0.6)] lg:text-h1-pc" />
							</div>
							{/* 補足は1行(09/22)。区名と業務は助詞「で」で分ける(「・」は使わない・J-135)。390 では折り返してよい */}
							<p className="mt-3 text-small text-white/90">{wardLabelFv}で賃貸 売買 賃貸管理</p>
							{/* 副ボタン「初めての方へ」は J-148 で外した(導線3枚が FV の直下に来て、行き先が同じになるため) */}
							{/* 新着の小カードの行(J-147)は J-149 で外した。FV に詰め込みすぎて窮屈に見えたため。新着は下のセクション(大カード8枚)が担う */}
						</div>
						{/* パネルは白のまま(入力欄を墨地に置かない・03 §7 v0.95)。キャッチの 200ms 後に出る(03 §8「FV の動き」・J-142) */}
						<div className="animate-fv-in-late motion-reduce:animate-none">
							<HomeSearch areas={areas} stationGroups={stationGroups} kinds={kinds} all={all} nowIso={now.toISOString()} />
						</div>
					</div>
				</Container>
				{/*
				  スクロール矢印(03 §6 部品・§8「FV の動き」・J-142)。1024 以上だけ(390 は FV の直下に固定CTA が来る)。
				  押すと新着物件へ。上下 8px・1.5秒のループは中の span に付け、外の a は位置だけ持つ(transform を分ける)。
				*/}
				<a
					href="#new"
					aria-label="新着物件へ"
					className="absolute bottom-2 left-1/2 hidden size-11 -translate-x-1/2 cursor-pointer items-center justify-center text-white lg:flex"
				>
					<span aria-hidden="true" className="animate-fv-bob [filter:drop-shadow(0_2px_8px_rgba(43,47,51,0.6))] motion-reduce:animate-none">
						<ChevronDown size={20} />
					</span>
				</a>
			</section>

			{/* 2 初めての方へ / 売却 / オーナー様 の3枚。J-148 で FV の直後に(売却・オーナーの入口を2画面目に上げる) */}
			<section className="py-12 lg:py-16">
				<Container>
					<ul className="grid gap-4 lg:grid-cols-3">
						{guides.map((g) => (
							<li key={g.href}>
								<Link
									href={g.href}
									className="block h-full overflow-hidden rounded-hr border border-line bg-surface transition-colors duration-150 hover:bg-badge-new-bg motion-reduce:transition-none"
								>
									{/* 場所・物件を示す写真(架空のためプレースホルダー・J-118)。売却事例カードと同じ 3:2 */}
									<div className="relative aspect-[3/2] w-full bg-surface-alt">
										<Image src={g.photo} alt={g.alt} fill sizes="(min-width: 64rem) 400px, 100vw" unoptimized={g.unoptimized} className="object-cover" />
									</div>
									<div className="p-4 lg:p-6">
										<p className="text-h3 font-bold text-sumi lg:text-h3-pc">{g.title}</p>
										<p className="mt-2 text-small text-ink-weak lg:text-small-pc">{g.text}</p>
									</div>
								</Link>
							</li>
						))}
					</ul>
				</Container>
			</section>

			{/* 3 会社の強み3点。J-148 で導線の次に(会社の信頼) */}
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

			{/* 4 新着物件(成約済みは出さない・公開日順8件)。J-148 で4番目に(FV の小カードと重なるため。J-140 の3を撤回)。id は FV の矢印の行き先(J-142) */}
			<section id="new" className="scroll-mt-24 py-12 lg:py-16">
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

			{/*
			  5 探し方の入口(J-141):**左 1/4 に見出し・説明・件数 / 右 3/4 にチップ3グループ**。
			  カードは使わない(上の新着と下の導線3枚がカードなので、3カラムのカードを続けると同じ形が3つ並ぶ・J-058)。
			  リンク先は J-051 の listHref(新しい URL の作り方は足さない)。〜1023 は縦積み。
			*/}
			<section className="bg-surface-alt py-12 lg:py-16">
				<Container>
					<div className="lg:grid lg:grid-cols-4 lg:gap-8">
						<div className="lg:col-span-1">
							<h2 className="text-h2 font-bold lg:text-h2-pc">探し方から選ぶ</h2>
							<p className="mt-2 text-small text-ink-weak">場所や特集から入ることもできます</p>
							{/* 件数は押せる文字(03 §6・J-052)。一覧の件数表示と同じ数え方(成約済みを含む・J-033) */}
							<p className="mt-3 flex gap-3 text-small">
								<Link href="/properties" className={attrClass('text')}>
									賃貸 <span className="tabular">{totalRental}</span>件
								</Link>
								<Link href="/properties?type=sale" className={attrClass('text')}>
									売買 <span className="tabular">{totalSale}</span>件
								</Link>
							</p>
						</div>
						<div className="mt-8 space-y-6 lg:col-span-3 lg:mt-0">
							{[
								{ title: 'エリアから探す', href: '/area', items: areas.flatMap((w) => w.towns).map((t) => ({ key: t.slug, name: t.name, href: listHref('rental', { area: t.slug }) })) },
								{ title: '沿線・駅から探す', href: '/line', items: LINES.map((l) => ({ key: l.slug, name: l.name, href: listHref('rental', { line: l.slug }) })) },
								{ title: '特集から探す', href: '/feature', items: collectionTerms.map((c) => ({ key: c.slug, name: collectionName(c.slug), href: listHref('rental', { collection: c.slug }) })) },
							].map((g) => (
								<section key={g.title}>
									<div className="flex items-baseline gap-3">
										<h3 className="text-h3 font-bold text-sumi lg:text-h3-pc">{g.title}</h3>
										<Link href={g.href} className="text-small text-accent-strong underline">
											一覧
										</Link>
									</div>
									<ul className="mt-3 flex flex-wrap gap-x-1 gap-y-2">
										{g.items.map((it) => (
											<EntryLink key={it.key} href={it.href}>
												{it.name}
											</EntryLink>
										))}
									</ul>
								</section>
							))}
						</div>
					</div>
				</Container>
			</section>

			{/* 6 お客様の声(架空・config。/voice と同じ配列)。6件をカルーセルで1件ずつ送る(J-128) */}
			<section className="py-12 lg:py-16" aria-labelledby="voice-heading">
				<Container>
					<VoiceCarousel
						voices={voices}
						heading={
							<h2 id="voice-heading" className="text-h2 font-bold lg:text-h2-pc">
								お客様の声
							</h2>
						}
						extra={
							<Link href="/voice" className="text-small text-accent-strong underline">
								すべて見る
							</Link>
						}
					/>
				</Container>
			</section>

			{/* 7 お知らせ(最新3件・config。実装順 7 の /news と同じ配列) */}
			<section className="bg-surface-alt py-12 lg:py-16">
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
			<section className="py-12 lg:py-16">
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


/** 入口のリンク(押せるチップ・J-052 と同じ形) */
function EntryLink({ href, children }: { href: string; children: React.ReactNode }) {
	return (
		<li>
			<Link
				href={href}
				className="block h-8 cursor-pointer rounded-hr border border-accent bg-surface px-2 text-small leading-8 whitespace-nowrap text-accent-strong transition-colors duration-150 hover:bg-badge-new-bg motion-reduce:transition-none"
			>
				{children}
			</Link>
		</li>
	);
}

