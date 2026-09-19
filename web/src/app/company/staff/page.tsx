import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { Container } from '@/components/layout/Container';
import { Breadcrumb } from '@/components/search/Breadcrumb';
import { company, staff } from '@/config/site';

export const metadata: Metadata = {
	title: 'スタッフ紹介',
	description: `${company.name}のスタッフ${company.staffCount}名。役職・保有資格・ひとこと。${company.notice}`,
};

/**
 * スタッフ紹介(実装順 6・01 §8 要素4)。独立ページ(着手前判断 C)。説明ページの型(03 §7・J-115)。
 * 顔写真はプレースホルダー SVG(3:4・架空表記入り・J-053。判断 D)。8名の姓は 架空 / 見本 / 仮名 のみ(fictional-data.md §1)。
 * カードは一覧カードと同じ縦型(画像上・文字下)で、列数だけ幅で変える(03 §6):〜767 2列 / 768〜 3列 / 1024〜 4列。
 * フォームの宛先になる3名には、担当のフォームへの押せる文字を添える(staff.formTarget)。**ひとことの文は初案**。
 */

const FORM_LINK: Readonly<Record<NonNullable<(typeof staff)[number]['formTarget']>, { label: string; href: string }>> = {
	contact: { label: 'お問い合わせの担当', href: '/contact' },
	sell: { label: '査定依頼の担当', href: '/sell#form' },
	owner: { label: '管理のご相談の担当', href: '/owner#form' },
};

export default function StaffPage() {
	return (
		<>
			<section className="py-6 lg:py-8">
				<Container>
					<Breadcrumb items={[{ label: 'トップ', href: '/' }, { label: '会社概要', href: '/company' }, { label: 'スタッフ紹介' }]} />
					<div className="mt-4 max-w-[760px]">
						<h1 className="text-h1 font-bold lg:text-h1-pc">スタッフ紹介</h1>
						<p className="mt-4 text-body text-ink lg:text-body-pc">
							2店舗{company.staffCount}名です。内見・査定・管理のご相談は、それぞれ担当の部署がお受けします。
						</p>
						{/* 実在の方と誤認されないよう、氏名が架空であることをページの上でも明示する(00 §7-9・J-057 と同じ考え) */}
						<p className="mt-2 text-small text-ink-weak lg:text-small-pc">氏名・顔写真はすべて架空です(写真はプレースホルダー)。</p>
					</div>
				</Container>
			</section>

			<section className="bg-surface-alt py-12 lg:py-16">
				<Container>
					<ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 lg:gap-4">
						{staff.map((s) => {
							const link = s.formTarget ? FORM_LINK[s.formTarget] : null;
							return (
								<li key={s.name} className="flex flex-col rounded-hr border border-line bg-surface p-3 lg:p-4">
									<div className="relative aspect-[3/4] w-full overflow-hidden rounded-hr bg-surface-alt">
										{/* プレースホルダー SVG は next/image の最適化を通らないため unoptimized(一覧カードと同じ) */}
										<Image src={s.photo} alt="" fill sizes="(min-width: 64rem) 300px, (min-width: 48rem) 33vw, 50vw" unoptimized className="object-cover" />
									</div>
									<p className="mt-3 text-small text-ink-weak lg:text-small-pc">{s.role}</p>
									<p className="text-body font-bold text-sumi lg:text-body-pc">
										{s.name}
										<span className="ml-1 text-xs font-normal text-ink-weak lg:text-xs-pc">(架空)</span>
									</p>
									<p className="mt-1 text-xs text-ink-weak lg:text-xs-pc">{s.qualifications.length > 0 ? s.qualifications.join('・') : '—'}</p>
									<p className="mt-2 text-small text-ink lg:text-small-pc">{s.comment}</p>
									{link && (
										<p className="mt-auto pt-3 text-small lg:text-small-pc">
											<Link href={link.href} className="text-accent-strong underline">
												{link.label}
											</Link>
										</p>
									)}
								</li>
							);
						})}
					</ul>
				</Container>
			</section>
		</>
	);
}
