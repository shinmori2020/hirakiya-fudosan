import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { Breadcrumb } from '@/components/search/Breadcrumb';
import { DefList } from '@/components/guide/DefList';
import { PRIMARY } from '@/components/ui/button-class';
import { company } from '@/config/site';

export const metadata: Metadata = {
	title: '管理について',
	description: '管理サービスの内容と管理料の目安、空室対策をまとめています。管理のご相談は無料です。',
};

/**
 * 管理について(説明のページ・J-154。01 §12 の要素1〜4)。相談のフォームは /owner の1か所だけで、ここには置かない。
 * 中身は J-154 まで /owner の左カラムにあった説明(実装順 6・(inquiry)/owner/Explanation.tsx)を、文も値も変えずに移したもの。**文章と架空値は初案**。
 * BtoB の切替は文言のみ(J-116):色・面・部品は変えず、呼びかけを「オーナー様」に、CTA を「管理を相談する」にする。
 * 型は 03 §7 説明ページ(J-115):見出しの段(パンくず・H1・リード)→ 白 / 薄灰の交互のセクション。本文は 760、数字のカード・表は幅いっぱい。
 * フォームへのボタン(青緑・主CTA)は見出しの近くと末尾(03 §7・J-154)。行き先は /owner#form。売却の説明(/sell/about)への押せる文字を1つ置く。
 * (inquiry) のグループには入れない(/sell/about と同じ理由)。
 */

const SERVICES = [
	{ head: '入居者募集', text: '募集条件の相談、物件サイトへの掲載、内見の案内、申込の審査まで。' },
	{ head: '家賃集金', text: '毎月の集金と送金、滞納時の督促。送金明細を毎月お送りします。' },
	{ head: 'クレーム対応', text: '設備の故障・騒音・近隣の困りごとを当社が受け、必要な手配をします。' },
	{ head: '退去精算', text: '立会い、原状回復の見積り、敷金の精算までを代行します。' },
	{ head: '修繕手配', text: '協力業者への発注と工事の確認。金額はオーナー様の承認を得てから。' },
];

const VACANCY = [
	{ head: '募集条件の見直し', text: '家賃を下げる前に、初期費用・契約期間・入居時期の条件を変えてみます。' },
	{ head: '写真と掲載文の作り直し', text: '一覧で選ばれる写真の順番と、部屋の使い方が分かる文に直します。' },
	{ head: '小さな設備の追加', text: 'モニターホン・温水洗浄便座など、家賃1ヶ月分以内で決まりやすくなる設備から。' },
];

const FORM_HREF = '/owner#form';

export default function OwnerAboutPage() {
	return (
		<>
			<section className="py-6 lg:py-8">
				<Container>
					{/* 2階層目なのでパンくずを出す(03 §7 説明ページ・J-119) */}
					<Breadcrumb items={[{ label: 'トップ', href: '/' }, { label: '管理のご相談', href: '/owner' }, { label: '管理について' }]} />
					<div className="mt-4 max-w-[760px]">
						<h1 className="text-h1 font-bold lg:text-h1-pc">管理について</h1>
						<p className="mt-4 text-body text-ink lg:text-body-pc">管理サービスの内容と管理料の目安、空室対策をまとめています。</p>
						<div className="mt-6">
							<Link href={FORM_HREF} className={PRIMARY}>
								管理を相談する
							</Link>
						</div>
						{/* 売却は別のフォーム(J-105 ④)。説明のページ同士をつなぐ(J-154) */}
						<p className="mt-4 text-body lg:text-body-pc">
							<Link href="/sell/about" className="text-accent-strong underline">
								売却をお考えの方は「売却について」へ
							</Link>
						</p>
					</div>
				</Container>
			</section>

			<section className="bg-surface-alt py-12 lg:py-16">
				<Container>
					<div className="max-w-[760px]">
						<h2 className="text-h2 font-bold lg:text-h2-pc">管理サービスの内容</h2>
						<p className="mt-2 text-body text-ink lg:text-body-pc">募集から退去までを一社でお受けします。一部だけのご依頼もご相談ください。</p>
						{/* 会社の説明なので枠も背景も持たせない(J-058) */}
						<ul className="mt-6 grid gap-4 md:grid-cols-2">
							{SERVICES.map((s) => (
								<li key={s.head}>
									<p className="text-h3 font-bold text-sumi lg:text-h3-pc">{s.head}</p>
									<p className="mt-1 text-body text-ink lg:text-body-pc">{s.text}</p>
								</li>
							))}
						</ul>
					</div>
				</Container>
			</section>

			<section className="py-12 lg:py-16">
				<Container>
					<h2 className="text-h2 font-bold lg:text-h2-pc">
						管理実績
						<span className="ml-2 text-small font-normal text-ink-weak lg:text-small-pc">(架空値)</span>
					</h2>
					<ul className="mt-6 grid grid-cols-3 gap-3 lg:gap-4">
						{[
							{ n: `${company.managedUnits}`, unit: '戸', label: '管理戸数' },
							{ n: `${company.occupancyRate}`, unit: '%', label: '入居率' },
							{ n: `${company.avgVacancyDays}`, unit: '日', label: '平均空室期間' },
						].map((k) => (
							<li key={k.label} className="rounded-hr border border-line bg-surface p-3 text-center lg:p-4">
								<p className="tabular text-h2 font-bold text-sumi lg:text-h2-pc">
									{k.n}
									<span className="ml-0.5 text-small font-normal lg:text-small-pc">{k.unit}</span>
								</p>
								<p className="mt-1 text-xs text-ink-weak lg:text-xs-pc">{k.label}</p>
							</li>
						))}
					</ul>
				</Container>
			</section>

			<section className="bg-surface-alt py-12 lg:py-16">
				<Container>
					<h2 className="text-h2 font-bold lg:text-h2-pc">管理料の目安</h2>
					<div className="mt-6">
						<DefList
							label="管理料の目安"
							rows={[
								{ k: '管理料', v: `月額家賃の${company.managementFeeRate}%(税別・架空値)` },
								{ k: '含まれるもの', v: '入居者募集 / 家賃集金 / クレーム対応 / 退去立会い / 修繕手配' },
								{ k: '別途かかるもの', v: '募集時の広告料・原状回復や修繕の実費・保証会社の費用' },
								{ k: '契約期間', v: '1年(自動更新)。解約は3ヶ月前のご連絡で' },
							]}
						/>
					</div>
				</Container>
			</section>

			<section className="py-12 lg:py-16">
				<Container>
					<div className="max-w-[760px]">
						<h2 className="text-h2 font-bold lg:text-h2-pc">空室対策の提案</h2>
						<p className="mt-2 text-body text-ink lg:text-body-pc">家賃を下げる前にできることから、順にご提案します。</p>
						<ol className="mt-6 space-y-4">
							{VACANCY.map((v, i) => (
								<li key={v.head} className="flex gap-3">
									<span className="tabular flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-alt text-small font-bold text-sumi">{i + 1}</span>
									<span>
										<span className="block text-body font-bold text-sumi lg:text-body-pc">{v.head}</span>
										<span className="mt-1 block text-body text-ink lg:text-body-pc">{v.text}</span>
									</span>
								</li>
							))}
						</ol>
					</div>
				</Container>
			</section>

			{/* 末尾のフォームへのボタン(J-154)。文は /owner の右カラムと同じ一文 */}
			<section className="bg-surface-alt py-12 lg:py-16">
				<Container>
					<div className="max-w-[760px]">
						<p className="text-body text-ink lg:text-body-pc">ご相談は無料です。他社で管理中のご相談も承ります。</p>
						<div className="mt-4">
							<Link href={FORM_HREF} className={PRIMARY}>
								管理を相談する
							</Link>
						</div>
					</div>
				</Container>
			</section>
		</>
	);
}
