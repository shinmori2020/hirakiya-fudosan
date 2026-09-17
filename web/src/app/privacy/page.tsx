import type { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import { company, mainOffice } from '@/config/site';

export const metadata: Metadata = {
	title: 'プライバシーポリシー',
	description: `${company.name}のプライバシーポリシー。${company.notice}`,
};

/**
 * プライバシーポリシー(01「プライバシーポリシー / 404」・forms.md §2)。実装順 7 から前倒し(J-102 f)。
 * 静的な文章ページ(03 §7 文章ページ・J-103):部品は使わず、最大幅 760 を中央に置く。H1 も列の中。
 * 中身は forms.md §2 の3点(取得する情報 / 保存しない旨 / 架空である旨)+ Turnstile の分。
 * noindex は実装順 8 でまとめて扱うので、ここでは触らない。
 */
export default function PrivacyPage() {
	return (
		<section className="py-6 lg:py-8">
			<Container>
				<div className="mx-auto max-w-[760px]">
					<h1 className="text-h1 font-bold lg:text-h1-pc">プライバシーポリシー</h1>
					<p className="mt-4 text-body text-ink lg:text-body-pc">
						{company.name}(以下「当社」)は、このサイトのお問い合わせフォームで受け取る情報を次のとおり扱います。
					</p>

					<h2 className="mt-8 text-h2 font-bold lg:text-h2-pc">このサイトについて</h2>
					<p className="mt-2 text-body lg:text-body-pc">
						{company.notice}
						会社名・住所・電話番号・免許番号・担当者名・物件はすべて架空です。フォームから送信された内容は、実際の物件のご案内や契約には使われません。
					</p>

					<h2 className="mt-8 text-h2 font-bold lg:text-h2-pc">取得する情報</h2>
					<p className="mt-2 text-body lg:text-body-pc">
						お問い合わせフォームに入力された情報(氏名・ふりがな・電話番号・メールアドレス・希望連絡方法・備考)と、対象物件を指定した場合はその物件番号を受け取ります。フォームごとに、次の情報も受け取ります。内見予約は希望日時、お問い合わせはお問い合わせの種別、査定依頼は物件種別・所在地・面積・築年・間取り・現況・売却希望時期・査定の種類、管理・空室のご相談はご相談の種類・物件所在地・戸数・現在の管理状況です。
					</p>

					<h2 className="mt-8 text-h2 font-bold lg:text-h2-pc">保存しないこと</h2>
					<p className="mt-2 text-body lg:text-body-pc">
						送信された内容は、サイト制作者宛のメール1通としてのみ届きます。データベース・サーバーのログ・ファイルには残しません。入力されたメールアドレスがある場合は、受け付けた旨の自動返信を1通お送りします。送信内容を第三者に提供することはありません。
					</p>

					<h2 className="mt-8 text-h2 font-bold lg:text-h2-pc">スパム対策について</h2>
					<p className="mt-2 text-body lg:text-body-pc">
						フォームの送信には Cloudflare Turnstile を使っています。送信の際に、ブラウザの種類や IP アドレスなどのアクセス情報が Cloudflare に送られ、自動送信かどうかの判定に使われます。この判定に通らない送信は受け付けません。
					</p>

					<h2 className="mt-8 text-h2 font-bold lg:text-h2-pc">お問い合わせ先</h2>
					<p className="mt-2 text-body lg:text-body-pc">
						この方針についてのお問い合わせは、サイト内のお問い合わせフォームからお願いします(架空サイトのため、電話番号 {mainOffice.tel} への発信はつながりません)。
					</p>
				</div>
			</Container>
		</section>
	);
}
