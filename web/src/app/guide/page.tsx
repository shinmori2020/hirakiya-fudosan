import type { Metadata } from 'next';
import Link from 'next/link';
import { DefList } from '@/components/guide/DefList';
import { Steps, type Step } from '@/components/guide/Steps';
import { Container } from '@/components/layout/Container';
import { company } from '@/config/site';
import { PRIMARY, SECONDARY } from '@/components/ui/button-class';

export const metadata: Metadata = {
	title: '初めての方へ(流れ・費用)',
	description: `部屋探しの流れ、初期費用の内訳、必要書類、購入の流れ。${company.notice}`,
};

/**
 * 初めての方へ(実装順 6・01 §14)。説明ページの型(03 §7・J-115):本文は 760、流れと表は幅いっぱい。
 * 賃貸と売買は1ページに同居させ、h1 直下のページ内リンクで飛ぶ(着手前判断 F・初案のまま)。
 * 初期費用は項目と「目安の式」だけ(判断 G)。金額の例は物件詳細の「入居時の目安合計」(J-080)に任せて二重にしない。
 * **文章はすべて初案**(SHIN が書き換える前提)。実在の制度の説明は一般的な範囲に留め、金額・割合は「目安」と書く。
 */

const RENTAL_STEPS: readonly Step[] = [
	{ title: '検索', text: 'エリア・駅・家賃の上限・間取りで絞ります。先に「譲れない条件」を2つ決めると早いです。' },
	{ title: '内見', text: '気になる物件を2〜3件まとめて見ます。日程は物件ページの「内見を予約する」から。' },
	{ title: '申込', text: '入居申込書に、勤務先・年収・連帯保証人または保証会社の利用を記入します。' },
	{ title: '審査', text: '貸主と保証会社が審査します。通常2〜5日。結果は担当からご連絡します。' },
	{ title: '契約', text: '重要事項説明を受け、契約書に署名・押印。初期費用をお振込みいただきます。' },
	{ title: '入居', text: '鍵をお渡しします。入居時の室内の状態は写真で残しておくと退去時に安心です。' },
];

const SALE_STEPS: readonly Step[] = [
	{ title: '資金計画', text: '自己資金と借入の上限から、探す価格帯を決めます。事前審査はこの段階で。' },
	{ title: '検索・見学', text: 'エリア・価格・種目で絞り、現地を見学します。周辺は時間帯を変えて見ると違いが分かります。' },
	{ title: '購入申込', text: '価格と引渡し時期の希望を書いた申込書を売主へ出します。' },
	{ title: '売買契約', text: '重要事項説明のあと契約。手付金をお支払いいただきます。' },
	{ title: '住宅ローン', text: '本審査と金銭消費貸借契約。火災保険もこの時期に決めます。' },
	{ title: '決済・引渡し', text: '残代金の支払いと所有権移転登記を同日に行い、鍵をお渡しします。' },
];

const COSTS = [
	{ k: '敷金', v: '家賃の1ヶ月分が目安。退去時の原状回復費を差し引いて返還されます。' },
	{ k: '礼金', v: '家賃の0〜1ヶ月分が目安。返還はありません。' },
	{ k: '仲介手数料', v: '家賃の0.5〜1ヶ月分+消費税が上限です。' },
	{ k: '前家賃', v: '入居月の家賃(月の途中なら日割り)+翌月分。' },
	{ k: '火災保険', v: '2年で1.5〜2万円が目安。加入は契約の条件になることが多いです。' },
	{ k: '保証会社', v: '初回は家賃の50〜100%が目安。連帯保証人の代わりに利用します。' },
] as const;

const DOCUMENTS = [
	{ k: '申込時', v: '本人確認書類(運転免許証・マイナンバーカード等)、勤務先の分かるもの(社員証・名刺等)' },
	{ k: '審査時', v: '収入証明(源泉徴収票・給与明細3ヶ月分・確定申告書のいずれか)' },
	{ k: '契約時', v: '住民票、印鑑、銀行口座の分かるもの。連帯保証人を立てる場合はその方の印鑑証明' },
] as const;

export default function GuidePage() {
	return (
		<>
			<section className="py-6 lg:py-8">
				<Container>
					<div className="max-w-[760px]">
						<h1 className="text-h1 font-bold lg:text-h1-pc">初めての方へ</h1>
						<p className="mt-4 text-body text-ink lg:text-body-pc">部屋探しと住まいの購入の流れ、かかる費用、用意する書類をまとめました。分からないことは、どの段階でもお電話・フォームでお尋ねください。</p>
						<ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-small lg:text-small-pc">
							<li>
								<a href="#rental" className="text-accent-strong underline">
									借りる方(賃貸)
								</a>
							</li>
							<li>
								<a href="#sale" className="text-accent-strong underline">
									買う方(売買)
								</a>
							</li>
						</ul>
					</div>
				</Container>
			</section>

			<section id="rental" className="scroll-mt-24 bg-surface-alt py-12 lg:py-16">
				<Container>
					<h2 className="text-h2 font-bold lg:text-h2-pc">部屋探しの流れ</h2>
					<p className="mt-2 max-w-[760px] text-body text-ink lg:text-body-pc">検索から入居まで、早い方で2週間、ゆっくり探して1〜2ヶ月が目安です。</p>
					<div className="mt-6">
						<Steps steps={RENTAL_STEPS} label="部屋探しの流れ" />
					</div>
				</Container>
			</section>

			<section className="py-16 lg:py-24">
				<Container>
					<h2 className="text-h2 font-bold lg:text-h2-pc">初期費用の内訳</h2>
					<p className="mt-2 max-w-[760px] text-body text-ink lg:text-body-pc">
						合計は家賃の4〜6ヶ月分が目安です。物件ごとの目安額は、各物件ページの「入居時の目安合計」に出しています。
					</p>
					<div className="mt-6">
						<DefList rows={COSTS} label="初期費用の内訳" />
					</div>
				</Container>
			</section>

			<section className="bg-surface-alt py-8 lg:py-12">
				<Container>
					<h2 className="text-h2 font-bold lg:text-h2-pc">必要書類</h2>
					<p className="mt-2 max-w-[760px] text-body text-ink lg:text-body-pc">物件・貸主によって増えることがあります。申込の前に担当からお伝えします。</p>
					<div className="mt-6">
						<DefList rows={DOCUMENTS} label="必要書類" />
					</div>
				</Container>
			</section>

			<section id="sale" className="scroll-mt-24 py-12 lg:py-16">
				<Container>
					<h2 className="text-h2 font-bold lg:text-h2-pc">購入の流れ(売買)</h2>
					<p className="mt-2 max-w-[760px] text-body text-ink lg:text-body-pc">申込から引渡しまで1〜2ヶ月が目安です。住宅ローンの事前審査を先に済ませておくと、申込の時に動きやすくなります。</p>
					<div className="mt-6">
						<Steps steps={SALE_STEPS} label="購入の流れ" />
					</div>
				</Container>
			</section>

			<section className="bg-surface-alt py-12 lg:py-16">
				<Container>
					<div className="max-w-[760px]">
						<h2 className="text-h2 font-bold lg:text-h2-pc">まず探してみる</h2>
						<p className="mt-2 text-body text-ink lg:text-body-pc">条件が固まっていなくても大丈夫です。気になる物件があれば、そのページからそのまま内見のご予約ができます。</p>
						<div className="mt-6 grid gap-2 sm:grid-cols-2">
							<Link href="/properties" className={PRIMARY}>
								物件を探す
							</Link>
							<Link href="/contact?kind=question" className={SECONDARY}>
								質問する
							</Link>
						</div>
					</div>
				</Container>
			</section>
		</>
	);
}
