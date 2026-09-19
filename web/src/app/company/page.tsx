import type { Metadata } from 'next';
import Link from 'next/link';
import { DefList } from '@/components/guide/DefList';
import { Container } from '@/components/layout/Container';
import { company, history, mainOffice, offices, serviceAreas, staff } from '@/config/site';

export const metadata: Metadata = {
	title: '会社概要',
	description: `${company.name}の会社概要・沿革。${company.notice}`,
};

/**
 * 会社概要(実装順 6・01 §8)。説明ページの型(03 §7・J-115)。
 * 要素:代表挨拶(300字・案)/ 会社概要表 / 沿革 / スタッフ紹介へ・店舗案内へ(スタッフは独立ページ・着手前判断 C)。
 * 値はすべて config/site.ts から取る(fictional-data.md §2)。免許番号・所属団体は業界慣習の書式のまま「(架空)」を添える。
 * **代表挨拶の文はすべて初案**(01 §8「案」。SHIN が書き換える前提)。
 */

const YEARS = new Date().getFullYear() - Number(company.founded.slice(0, 4));

/** 代表挨拶(初案・約300字)。趣旨は 01 §8「青砥で創業して25年、管理から始めて売買まで」 */
const GREETING = [
	`${company.shortName}は、${history[0].year}年に青砥の駅前で賃貸の仲介から始めた会社です。部屋を借りる方のご案内を続けるうちに、貸す側のオーナー様から「入居のあとも見てほしい」と頼まれることが増え、${history[1].year}年から賃貸管理を始めました。いまは${company.managedUnits}戸をお預かりしています。`,
	`管理をしていると、建物の状態も、入居者の方の困りごとも、実物で分かります。その積み重ねが売買の仲介にも生きると考え、${history[2].year}年から売買を始めました。借りる・買う・貸す・売る、どの段階でも同じ担当が実物を見て説明する。それがこの${YEARS}年で変わらないやり方です。`,
	'小さな会社ですので、できることには限りがあります。その代わり、できないことは先にお伝えします。まずはお気軽にご相談ください。',
];

export default function CompanyPage() {
	const representative = staff[0];
	const overview = [
		{ k: '社名', v: company.name },
		{ k: '所在地', v: `${mainOffice.address}(${mainOffice.name})` },
		{ k: '設立', v: company.foundedLabel },
		{ k: '代表者', v: `代表取締役 ${company.representative}(架空)` },
		{ k: '免許番号', v: `${company.license}(架空)` },
		{ k: '所属団体', v: company.association },
		{ k: '事業内容', v: company.business.join(' / ') },
		{ k: '従業員数', v: `${company.staffCount}名(2店舗)` },
		{ k: '管理戸数', v: `${company.managedUnits}戸(入居率 ${company.occupancyRate}%)` },
		{ k: '取扱エリア', v: serviceAreas.map((a) => `${a.ward}(${a.towns.join('・')})`).join(' / ') },
		{ k: '営業時間', v: `${company.hours} / 定休日 ${company.closed}` },
	];

	return (
		<>
			<section className="py-6 lg:py-8">
				<Container>
					<div className="max-w-[760px]">
						<h1 className="text-h1 font-bold lg:text-h1-pc">会社概要</h1>
						<p className="mt-4 text-body text-ink lg:text-body-pc">{company.tagline}</p>
						<p className="mt-2 text-small text-ink-weak lg:text-small-pc">{company.notice}</p>
					</div>
				</Container>
			</section>

			<section className="bg-surface-alt py-12 lg:py-16">
				<Container>
					<div className="max-w-[760px]">
						<h2 className="text-h2 font-bold lg:text-h2-pc">代表挨拶</h2>
						<div className="mt-6 space-y-4">
							{GREETING.map((p) => (
								<p key={p.slice(0, 12)} className="text-body text-ink lg:text-body-pc">
									{p}
								</p>
							))}
						</div>
						<p className="mt-6 text-small text-ink lg:text-small-pc">
							{representative.role} <span className="font-bold text-sumi">{representative.name}</span>
							<span className="ml-1 text-ink-weak">(架空・{representative.qualifications.join('・')})</span>
						</p>
					</div>
				</Container>
			</section>

			<section className="py-12 lg:py-16">
				<Container>
					<h2 className="text-h2 font-bold lg:text-h2-pc">会社概要</h2>
					<div className="mt-6">
						<DefList rows={overview} label="会社概要" />
					</div>
				</Container>
			</section>

			<section className="bg-surface-alt py-12 lg:py-16">
				<Container>
					<h2 className="text-h2 font-bold lg:text-h2-pc">沿革</h2>
					<div className="mt-6">
						<DefList rows={history.map((h) => ({ k: `${h.year}年`, v: h.text }))} label="沿革" />
					</div>
				</Container>
			</section>

			<section className="py-12 lg:py-16">
				<Container>
					{/* 導線はトップの3枚カードと同じ形(枠あり・押せる)。同じ面に白いカードを2列続けない規則(J-058)は、この面がカードだけなので当たらない */}
					<ul className="grid gap-4 lg:grid-cols-2">
						<li>
							<Link href="/company/staff" className="block h-full rounded-hr border border-line bg-surface p-4 transition-colors duration-150 hover:bg-badge-new-bg motion-reduce:transition-none lg:p-6">
								<p className="text-h3 font-bold text-sumi lg:text-h3-pc">スタッフ紹介</p>
								<p className="mt-2 text-small text-ink-weak lg:text-small-pc">{company.staffCount}名の役職・保有資格と、それぞれのひとこと。</p>
							</Link>
						</li>
						<li>
							<Link href="/company/access" className="block h-full rounded-hr border border-line bg-surface p-4 transition-colors duration-150 hover:bg-badge-new-bg motion-reduce:transition-none lg:p-6">
								<p className="text-h3 font-bold text-sumi lg:text-h3-pc">店舗案内・アクセス</p>
								<p className="mt-2 text-small text-ink-weak lg:text-small-pc">{offices.map((o) => o.name).join('・')}の地図と、駅からの道順。</p>
							</Link>
						</li>
					</ul>
				</Container>
			</section>
		</>
	);
}
