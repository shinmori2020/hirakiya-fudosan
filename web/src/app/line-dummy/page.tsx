import type { Metadata } from 'next';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { company, mainOffice } from '@/config/site';

export const metadata: Metadata = {
	title: 'LINE について(ダミー)',
	description: `このサイトの LINE ボタンはダミーです。${company.notice}`,
};

const PRIMARY = 'flex h-12 w-full items-center justify-center rounded-hr bg-accent text-body font-bold text-white hover:bg-accent-strong lg:h-11 lg:text-body-pc';
const SECONDARY = 'flex h-12 w-full items-center justify-center rounded-hr border border-sumi bg-surface text-body font-medium text-sumi hover:bg-surface-alt lg:h-11 lg:text-body-pc';

/**
 * LINE(ダミー)の説明(実装順 6・J-117。01 共通要素の決定 09/05「リンク先を『架空サイトのため利用できません』の説明に向ける」)。
 * スマホ固定CTA と フッター の LINE ボタンの飛び先。実在のアカウントに見えるものは一切置かない(QR・ID・友だち追加ボタン)。
 * 文章ページの型(760 だけ・03 §7)。代わりの連絡手段(電話・フォーム)を出す。
 */
export default function LineDummyPage() {
	return (
		<section className="py-6 lg:py-8">
			<Container>
				<div className="mx-auto max-w-[760px]">
					<h1 className="text-h1 font-bold lg:text-h1-pc">LINE について</h1>
					<p className="mt-4 rounded-hr border border-line bg-surface-alt p-4 text-body lg:p-6 lg:text-body-pc" role="note">
						{company.notice}
					</p>
					<p className="mt-6 text-body text-ink lg:text-body-pc">
						このサイトの「LINE」ボタンは<strong>ダミー</strong>です。実在のアカウントはなく、友だち追加や QR コードも用意していません。実際の不動産会社のサイトでは、ここに LINE の友だち追加ボタンや、トークでの問い合わせ方法が入ります。
					</p>
					<p className="mt-4 text-body text-ink lg:text-body-pc">ご連絡は、お電話かフォームからお願いします(架空サイトのため、どちらも実際の対応には使われません)。</p>
					<div className="mt-8 grid gap-2 sm:grid-cols-2">
						<a href={`tel:${mainOffice.tel.replace(/-/g, '')}`} className={PRIMARY}>
							電話する({mainOffice.tel})
						</a>
						<Link href="/contact" className={SECONDARY}>
							フォームで問い合わせる
						</Link>
					</div>
					<p className="mt-4 text-small text-ink-weak lg:text-small-pc">
						営業時間 {company.hours}(定休日:{company.closed})
					</p>
				</div>
			</Container>
		</section>
	);
}
