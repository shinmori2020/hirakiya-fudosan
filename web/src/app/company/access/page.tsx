import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { DefList } from '@/components/guide/DefList';
import { Container } from '@/components/layout/Container';
import { MapLoader } from '@/components/property/MapLoader';
import { Breadcrumb } from '@/components/search/Breadcrumb';
import { company, offices } from '@/config/site';

export const metadata: Metadata = {
	title: '店舗案内・アクセス',
	description: `${offices.map((o) => o.name).join('・')}の住所・電話・営業時間・地図と駅からの道順。${company.notice}`,
};

const SECONDARY = 'flex h-12 w-full items-center justify-center rounded-hr border border-sumi bg-surface text-body font-medium text-sumi hover:bg-surface-alt lg:h-11 lg:text-body-pc';

/**
 * 店舗案内・アクセス(実装順 6・01 §9)。説明ページの型(03 §7・J-115)。
 * 要素:店舗写真(外観 → 03 §1「イメージ写真は使わない」なのでプレースホルダーの面)/ 地図(OSM・詳細と同じ MapLoader)+道順 /
 * 基本情報(住所・電話・営業時間・定休日・駐車場)/ 来店予約(/contact?kind=visit・着手前判断 K:独立フォームは作らない)。
 * 店舗ごとに1セクション(白・薄灰の交互)。値は config/site.ts の offices から。
 */
export default function AccessPage() {
	return (
		<>
			<section className="py-6 lg:py-8">
				<Container>
					<Breadcrumb items={[{ label: 'トップ', href: '/' }, { label: '会社概要', href: '/company' }, { label: '店舗案内・アクセス' }]} />
					<div className="mt-4 max-w-[760px]">
						<h1 className="text-h1 font-bold lg:text-h1-pc">店舗案内・アクセス</h1>
						<p className="mt-4 text-body text-ink lg:text-body-pc">
							{offices.map((o) => `${o.name}(${o.station} 徒歩${o.walk}分)`).join('と')}の2店舗です。ご来店の際は、事前にご予約いただくとお待たせしません。
						</p>
					</div>
				</Container>
			</section>

			{offices.map((o, i) => (
				<section key={o.slug} id={o.slug} className={`scroll-mt-24 py-12 lg:py-16 ${i % 2 === 0 ? 'bg-surface-alt' : ''}`}>
					<Container>
						<h2 className="text-h2 font-bold lg:text-h2-pc">{o.name}</h2>
						<div className="mt-6 grid gap-6 lg:grid-cols-2 lg:gap-8">
							<div>
								{/* 場所を示す写真(架空のためプレースホルダー・J-118)。面に文字ではなく画像で置く(03 §2・J-119) */}
								<div className="relative aspect-[3/2] w-full overflow-hidden rounded-hr bg-surface-alt">
									<Image src={`/placeholders/offices/${o.slug}.svg`} alt={`${o.name} の外観(架空・プレースホルダー)`} fill sizes="(min-width: 64rem) 600px, 100vw" unoptimized className="object-cover" />
								</div>
								<div className="mt-4">
									<DefList
										label={`${o.name}の基本情報`}
										rows={[
											{ k: '住所', v: o.address },
											{
												k: '電話',
												v: (
													<a href={`tel:${o.tel.replace(/-/g, '')}`} className="tabular text-accent-strong underline">
														{o.tel}
													</a>
												),
											},
											{ k: '営業時間', v: company.hours },
											{ k: '定休日', v: company.closed },
											{ k: '最寄駅', v: `${o.station} 徒歩${o.walk}分` },
											{ k: '駐車場', v: o.parking },
										]}
									/>
								</div>
							</div>
							<div>
								<MapLoader lat={o.lat} lng={o.lng} title={o.name} />
								<p className="mt-3 text-small text-ink lg:text-small-pc">
									<span className="font-bold text-sumi">駅からの道順:</span>
									{o.directions}
								</p>
								<div className="mt-4 max-w-[360px]">
									<Link href="/contact?kind=visit" className={SECONDARY}>
										来店を予約する
									</Link>
								</div>
							</div>
						</div>
					</Container>
				</section>
			))}
		</>
	);
}
