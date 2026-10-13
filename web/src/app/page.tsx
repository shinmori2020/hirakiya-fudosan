import Image from 'next/image';
import type { Metadata } from 'next';
import Link from 'next/link';
import { FvCopy } from '@/components/home/FvCopy';
import { HomeSearch, type StationGroup } from '@/components/home/HomeSearch';
import { VoiceCarousel } from '@/components/home/VoiceCarousel';
import { Container } from '@/components/layout/Container';
import { attrClass } from '@/components/property/AttrLink';
import { MapLoader } from '@/components/property/MapLoader';
import { PropertyCard } from '@/components/property/PropertyCard';
import { RouteMap } from '@/components/search/RouteMap';
import { PRIMARY } from '@/components/ui/button-class';
import { company, lines as LINES, news, offices, serviceAreas, voices } from '@/config/site';
import { isNew } from '@/lib/badges';
import { dateLabel } from '@/lib/format';
import { listHref } from '@/lib/links';
import { latestProperties } from '@/lib/home';
import { getProperties, getRouteMap, getTerms } from '@/lib/properties';

/**
 * トップ(実装順 3・01 §1)。これは初案。
 * 並び(03 §7・J-148 → J-156):FV → 導線3枚 → 強み3点 → 売る・貸すのご相談 → 新着 → 探し方から選ぶ → お客様の声 → お知らせ → 店舗案内。
 * (01 §1 の当初の並びは FV → 探し方の入口3導線 → 新着 → 強み3点 → 3枚のカード → 声 → お知らせ → 店舗)
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
	const [all, areaTerms, stationTerms, collectionTerms, kindTerms, routeMap] = await Promise.all([
		getProperties(),
		getTerms('area'),
		getTerms('station'),
		getTerms('collection'),
		getTerms('property_kind'),
		getRouteMap(),
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
		{ href: '/sell/about', title: '売却をお考えの方へ', text: '売却の流れと、当社で売る理由・売却事例をまとめています。', photo: '/placeholders/guides/sell.svg', alt: '', unoptimized: true },
		{ href: '/owner/about', title: 'オーナー様へ', text: '管理サービスの内容と管理料の目安、空室対策をまとめています。', photo: '/photos/guide-apartment.jpg', alt: '賃貸の建物の外観(仮の写真)', unoptimized: false },
	];

	// 売る・貸すのご相談(J-156 → J-157 → J-159 → J-160 → J-161)。全幅の2分割で、面は写真(今はプレースホルダー)。各面の中央に 見出し・文・ボタン だけを白文字で浮かせる。
	// 文は /sell/about・/owner/about の中身から2文ずつ(初案)。行き先に #form を付けない(フォームのページはフォームが最初の画面に入り、見出しの近くの押せる文字も見てほしいため)
	// 写真:左 = 住宅街か戸建ての外観 / 右 = 集合住宅の外観(未設定。FV のギミック用とは別のものを選ぶ・page-records/トップ.md の写真待ち)
	const consults = [
		{ head: '売りたい方へ', text: '査定は無料です。売るか貸すか決めていない段階でも、両方の数字を並べてご説明します。', button: '査定を依頼する', href: '/sell', photo: '/placeholders/consult/sell.svg' },
		{ head: '貸したい方へ', text: '募集から退去までを一社でお受けします。一部だけのご依頼もご相談ください。', button: '管理を相談する', href: '/owner', photo: '/placeholders/consult/owner.svg' },
	];

	return (
		<>
			{/*
			  1 ファーストビュー(J-151 → J-167)。上 = 路線図ヒーロー / 下 = 操作する帯(白のカード・賃貸 / 売買のタブ + 検索)。03 §7 v1.31。
			   - 上(J-167):1024 以上は 左 = キャッチ2段 + 補足 + 路線図のパネル / 右 = 路線図(5 : 7)、〜1023 は縦に積む。
			     部品は components/search/RouteMap.tsx(route-hero.js 2.0.0 を包むだけ)。データは getRouteMap()(駅がサイトの13駅とずれたらビルドを止める)
			   - 写真・膜・文字影・写真のズーム・膜の揺らぎは J-167 でやめた(J-150・J-146・J-153・J-142 の2つ・J-135 の文字影)
			   - 面は薄灰(次の導線3枚が白・その次の強み3点が薄灰で交互を保つ)。路線図の地は白(.hr-route-map--on-alt)。文字は墨
			   - 帯は路線図の下に続ける。J-151 の「写真に 80px 跨がせる」はやめた(跨がせると路線図の下の駅が隠れる)
			   - 青緑は 帯の検索ボタン・路線図の検索ボタン・路線図で選んでいる駅と路線(§2・§6 のチップ)。路線図のタブは墨(globals.css で合わせた)
			   - 出現の動きはキャッチ(260ms)→ 200ms 後に帯(§8 の FV の例外のまま)。路線図には付けない
			*/}
			<section className="bg-surface-alt pt-8 pb-12 lg:pt-12 lg:pb-16">
				<Container>
					<RouteMap
						data={routeMap.data}
						items={routeMap.items}
						className="hr-route-map--on-alt"
						lead={
							<>
								{/* キャッチ2段(J-135 → J-140)。読み込み時に1回だけ出現効果(§8)。文字影は J-167 で外した(墨の文字を薄灰に置くため)。
								    左の列が狭くなり「…くださ / い」と1文字の行ができたので、折り返しを整える(J-161 の文と同じ text-pretty + auto-phrase)。
								    2段目は入れ替わる文で1行と2行が混ざるので、2行分の高さを取っておく(入れ替わるたびに下のパネルが動かないように) */}
								<div className="animate-fv-in motion-reduce:animate-none">
									{/* 2段とも H1(24 / 32px・J-140)。Display は使わない。2段目は見出しの続きなので p で出す */}
									<h1 className="text-h1 font-bold text-pretty [word-break:auto-phrase] lg:text-h1-pc">{company.tagline}</h1>
									{/* 2段目は10秒ごとに入れ替わる(03 §8「FV の動き」・J-144)。初期 HTML は1本目 */}
									<FvCopy items={taglineSubs} className="mt-2 min-h-[2lh] text-h1 font-bold text-pretty text-sumi [word-break:auto-phrase] lg:text-h1-pc" />
								</div>
								{/* 補足は1行(09/22)。区名と業務は助詞「で」で分ける(「・」は使わない・J-135)。390 では折り返してよい */}
								<p className="mt-3 text-small text-ink-weak">{wardLabelFv}で賃貸 売買 賃貸管理</p>
							</>
						}
					/>
					{/* 操作する帯(J-151 → J-152)。J-167 で路線図の下に続ける形に(跨がせない) */}
					<div className="mt-6 animate-fv-in-late motion-reduce:animate-none lg:mt-8">
						<HomeSearch areas={areas} stationGroups={stationGroups} kinds={kinds} all={all} nowIso={now.toISOString()} />
					</div>
				</Container>
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

			{/*
			  4 売る・貸すのご相談(J-156 → J-157 → J-159)。強み3点の直後(会社の信頼 → 申し込む の順。導線3枚は読む入口、ここは申し込む入口)。
			  全幅を左右に二分割(J-157)。〜1023 は上下に積む。左右それぞれの面を写真にする(今はプレースホルダー・03 §2 の墨系)。
			   - 膜はプレースホルダーの間は掛けない(J-160。今の面の上では白文字が膜なしで 4.5:1 を超える)。写真に替えたら FV と同じ測り方(J-146)で決める
			   - 文字の塊は 1024 以上で J-159 のパネルの位置と大きさのまま(それぞれの半分の中で左右・上下とも中央・幅の上限 480px)。背景と灰線は J-160 で外した。
			     〜1023 は内側の余白を外し、文字の左端をほかのセクションと同じ 16px にする(J-161)
			   - 中は左揃えで 見出し H3・文・ボタン。見出しの見た目はほかのセクションの H2 と同じ大きさ(J-161)。見出しと文は白。
			     文は折り返しを整える(text-pretty + word-break: auto-phrase で、行末に1〜2文字だけの行を作らない)
			   - ボタンは白地 + 墨の文字・高さ 56px・幅は文字に合わせる。hover は地を薄灰に(白地の SECONDARY と同じ・文字は墨のまま)。白地なので白い枠は要らない(J-161)
			     部品 PRIMARY は変えず、置く側の [&>a]:… で地と文字の色を決める(白地の SECONDARY は墨の枠・墨の文字で形が合わない)
			   - H2 は読み上げだけ(画面には出さない)。面全体は押せない(ボタンを押す形)
			*/}
			<section aria-labelledby="consult-heading">
				<h2 id="consult-heading" className="sr-only">
					売る・貸すのご相談
				</h2>
				<ul className="grid lg:grid-cols-2">
					{consults.map((c) => (
						<li key={c.href} className="relative isolate flex items-center justify-center px-4 py-16 lg:px-8 lg:py-20">
							{/* 写真の面(場所を示す写真・今はプレースホルダー・J-118)。面を示すだけなので alt は空 */}
							<Image src={c.photo} alt="" fill sizes="(min-width: 64rem) 50vw, 100vw" unoptimized className="-z-10 object-cover" />
							<div className="w-full max-w-[480px] lg:p-8">
								<h3 className="text-h2 font-bold text-white lg:text-h2-pc">{c.head}</h3>
								<p className="mt-2 text-body text-pretty text-white [word-break:auto-phrase] lg:text-body-pc">{c.text}</p>
								<div className="mt-6 [&>a]:inline-flex [&>a]:h-14 [&>a]:w-auto [&>a]:bg-surface [&>a]:px-8 [&>a]:text-sumi [&>a:hover]:bg-surface-alt [&>a:hover]:text-sumi">
									<Link href={c.href} className={PRIMARY}>
										{c.button}
									</Link>
								</div>
							</div>
						</li>
					))}
				</ul>
			</section>

			{/* 5 新着物件(成約済みは出さない・公開日順8件)。J-148 で4番目に(FV の小カードと重なるため。J-140 の3を撤回)→ J-156 で5番目・面は薄灰。id は FV の矢印の行き先だった(J-142) */}
			<section id="new" className="scroll-mt-24 bg-surface-alt py-12 lg:py-16">
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
			  6 探し方の入口(J-141)。面は白(J-156 で付け替え):**左 1/4 に見出し・説明・件数 / 右 3/4 にチップ3グループ**。
			  カードは使わない(上の新着と下の導線3枚がカードなので、3カラムのカードを続けると同じ形が3つ並ぶ・J-058)。
			  リンク先は J-051 の listHref(新しい URL の作り方は足さない)。〜1023 は縦積み。
			*/}
			<section className="py-12 lg:py-16">
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

			{/* 7 お客様の声(架空・config。/voice と同じ配列)。6件をカルーセルで1件ずつ送る(J-128)。面は薄灰(J-156) */}
			<section className="overflow-x-clip bg-surface-alt py-12 lg:py-16" aria-labelledby="voice-heading">
				{/* 見出しの列はコンテナの中、カードの列は画面の端から端まで(J-163)。コンテナは VoiceCarousel の中で見出しの列だけに掛ける */}
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
			</section>

			{/* 8 お知らせ(最新3件・config。実装順 7 の /news と同じ配列)。面は白(J-156) */}
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

			{/* 9 店舗案内(地図は詳細と同じ部品を再利用・OSM)。面は薄灰(J-156) */}
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

