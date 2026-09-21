import { DefList } from '@/components/guide/DefList';
import { company } from '@/config/site';

/**
 * /owner の説明部分(実装順 6・01 §12 要素1〜4)。Server Component。OwnerForm の左カラム(h1 と #form の間)に差し込む。
 * BtoB の切替は文言のみ(J-116):色・面・部品は変えず、呼びかけを「オーナー様」に、CTA を「管理のご相談」にする。
 * 数字(管理戸数・入居率・平均空室期間・管理料)は config/site.ts の company から。**文章と架空値は初案**。
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

export function OwnerExplanation() {
	return (
		<div className="max-w-[760px] space-y-12 lg:space-y-16">
			<section>
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
			</section>

			<section>
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
			</section>

			<section>
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
			</section>

			<section>
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
			</section>
		</div>
	);
}
