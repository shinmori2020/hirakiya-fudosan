import { Building2, Handshake, TrendingUp } from 'lucide-react';
import Image from 'next/image';
import { Steps, type Step } from '@/components/guide/Steps';
import { company, formatPrice, saleCases } from '@/config/site';

/**
 * /sell の説明部分(実装順 6・01 §11 要素1〜3)。Server Component。SellForm の左カラム(h1 と #form の間)に差し込む。
 * 説明ページの型(03 §7・J-115)の左カラム版:本文 760・流れは md 以上で横並び。白/薄灰の帯はページ全体の面なので、
 * 2カラムの左だけでは作らず、見出しと余白(セクション間 48 / 64・03 §5)で区切る。
 * 右カラムの「査定の進み方」(送信の先・J-107)とは重ねない。**文章はすべて初案**。売却事例は架空(config/site.ts の saleCases)。
 */

const FLOW: readonly Step[] = [
	{ title: '査定', text: '机上または訪問で価格の目安をお出しします。根拠になった条件も一緒に。' },
	{ title: '媒介契約', text: '売り出し価格と販売の進め方を決めて契約します。専任か一般かもここで。' },
	{ title: '販売活動', text: '物件サイトへの掲載と、管理物件のオーナー様・入居者の方へのご案内。' },
	{ title: '契約', text: '買主様と売買契約。手付金を受け取ります。' },
	{ title: '引渡し', text: '残代金の受領と所有権移転登記。鍵をお渡しして完了です。' },
];

const YEARS = new Date().getFullYear() - Number(company.founded.slice(0, 4));

export function SellExplanation() {
	const reasons = [
		{ icon: Building2, head: `管理${company.managedUnits}戸のつながり`, text: 'お預かりしている物件のオーナー様・入居者の方に先にご案内できます。広告に出す前に買主が見つかることがあります。' },
		{ icon: TrendingUp, head: `地域${YEARS}年の相場感`, text: '同じ町で貸してきた実績があるので、賃料から見た価格の妥当性も説明できます。' },
		{ icon: Handshake, head: '売らない選択も一社で', text: '売却と貸し出しを比べたい時は、管理をしている当社がどちらの数字も出します。' },
	];

	return (
		<div className="max-w-[760px] space-y-12 lg:space-y-16">
			<section>
				<h2 className="text-h2 font-bold lg:text-h2-pc">売却の流れ</h2>
				<p className="mt-2 text-body text-ink lg:text-body-pc">査定から引渡しまで、一般的に3〜6ヶ月です。</p>
				<div className="mt-6">
					<Steps steps={FLOW} label="売却の流れ" />
				</div>
			</section>

			<section>
				<h2 className="text-h2 font-bold lg:text-h2-pc">当社で売る理由</h2>
				{/* 会社の説明なので枠も背景も持たせない(J-058。トップの強み3点と同じ形) */}
				<ul className="mt-6 grid gap-6 md:grid-cols-3 md:gap-4">
					{reasons.map((r) => (
						<li key={r.head}>
							<r.icon size={24} aria-hidden="true" className="text-accent" />
							<p className="mt-2 text-h3 font-bold text-sumi lg:text-h3-pc">{r.head}</p>
							<p className="mt-1 text-body text-ink lg:text-body-pc">{r.text}</p>
						</li>
					))}
				</ul>
			</section>

			<section>
				<h2 className="text-h2 font-bold lg:text-h2-pc">
					売却事例
					<span className="ml-2 text-small font-normal text-ink-weak lg:text-small-pc">(架空)</span>
				</h2>
				<p className="mt-2 text-small text-ink-weak lg:text-small-pc">3件とも架空の事例です。数字は実際の相場を参照していません。</p>
				<ul className="mt-6 grid gap-3 md:grid-cols-3 lg:gap-4">
					{saleCases.map((c) => (
						<li key={`${c.town}-${c.kind}`} className="rounded-hr border border-line bg-surface p-4">
							{/* 物件を示す写真(架空のためプレースホルダー・J-118)。一覧カードと同じ 3:2・unoptimized */}
							<div className="relative mb-3 aspect-[3/2] w-full overflow-hidden rounded-hr bg-surface-alt">
								<Image src={c.photo} alt="" fill sizes="(min-width: 64rem) 240px, (min-width: 48rem) 33vw, 100vw" unoptimized className="object-cover" />
							</div>
							<p className="text-small text-ink-weak lg:text-small-pc">
								{c.ward}
								{c.town} / {c.kind}
							</p>
							<p className="mt-1 text-body font-bold text-sumi lg:text-body-pc">{c.name ?? `${c.town}の${c.kind}`}</p>
							<p className="mt-1 text-xs text-ink-weak lg:text-xs-pc">
								{c.areaSqm}㎡{c.builtYear ? ` / ${c.builtYear}年築` : ''}
							</p>
							<dl className="mt-3 space-y-1 text-small lg:text-small-pc">
								<div className="flex justify-between gap-2">
									<dt className="text-ink-weak">査定額</dt>
									<dd className="tabular text-ink">{formatPrice(c.assessedMan)}</dd>
								</div>
								<div className="flex justify-between gap-2">
									<dt className="text-ink-weak">成約価格</dt>
									<dd className="tabular font-bold text-sumi">{formatPrice(c.soldMan)}</dd>
								</div>
								<div className="flex justify-between gap-2">
									<dt className="text-ink-weak">成約まで</dt>
									<dd className="tabular text-ink">{c.days}日</dd>
								</div>
							</dl>
							<p className="mt-3 text-body text-ink lg:text-body-pc">{c.note}</p>
						</li>
					))}
				</ul>
			</section>
		</div>
	);
}
