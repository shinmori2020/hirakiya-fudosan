import Link from 'next/link';
import { company, offices } from '@/config/site';
import { footerArrows, footerColumns, footerLegal } from '@/config/nav';

/**
 * フッター(J-027・03 §7)。墨背景・白文字。
 * 左に会社情報(2店舗・営業時間・架空注記)、サイトマップ5列、矢印リンク2本、最下段に著作・プライバシー・宅建業法表示。
 */
export function Footer() {
	return (
		<footer className="bg-sumi text-white">
			<div className="mx-auto w-full max-w-(--container-content) px-4 py-12 lg:px-8 lg:py-16">
				<div className="grid gap-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
					{/* 会社情報 */}
					<div>
						<p className="text-h3 font-bold lg:text-h3-pc">{company.name}</p>
						<p className="mt-2 text-small text-white/80">
							{company.license} / 所属団体 {company.association}
						</p>
						<ul className="mt-6 space-y-4">
							{offices.map((o) => (
								<li key={o.slug} className="text-small">
									<p className="font-bold">{o.name}</p>
									<p>{o.address}</p>
									<p>
										{o.station} 徒歩{o.walk}分
									</p>
									<p className="tabular">
										TEL {o.tel} / {company.hours} / {company.closed}定休
									</p>
								</li>
							))}
						</ul>
						<p className="mt-6 text-xs text-white/80 lg:text-xs-pc">{company.notice}</p>
					</div>

					{/* サイトマップ5列 */}
					{/*
					 * サイトマップ(J-030)。スマホ(md 未満)は details/summary のアコーディオン・初期は閉・右端に ∨(開くと ∧)。
					 * PC(md 以上)は5列で常時展開(details を open 扱いにし、summary の印は非表示)。JS なし。
					 */}
					<nav aria-label="サイトマップ">
						{/* スマホ:見出し5つのアコーディオン(閉じた details は中身を描画しないため、PC 用は別に描く) */}
						<div className="border-t border-white/20 md:hidden">
							{footerColumns.map((col) => (
								<details key={col.heading} className="group border-b border-white/20">
									<summary className="flex cursor-pointer list-none items-center justify-between py-3 text-small font-bold [&::-webkit-details-marker]:hidden">
										{col.heading}
										<span aria-hidden="true" className="text-white/80 group-open:hidden">
											∨
										</span>
										<span aria-hidden="true" className="hidden text-white/80 group-open:inline">
											∧
										</span>
									</summary>
									<ul className="mb-3 space-y-2">
										{col.items.map((item) => (
											<li key={item.href}>
												<Link href={item.href} className="text-small text-white/80 hover:text-white hover:underline">
													{item.label}
												</Link>
											</li>
										))}
									</ul>
								</details>
							))}
						</div>
						{/* PC:5列で常時展開 */}
						<div className="hidden md:grid md:grid-cols-5 md:gap-4">
							{footerColumns.map((col) => (
								<div key={col.heading}>
									<p className="text-small font-bold">{col.heading}</p>
									<ul className="mt-3 space-y-2">
										{col.items.map((item) => (
											<li key={item.href}>
												<Link href={item.href} className="text-small text-white/80 hover:text-white hover:underline">
													{item.label}
												</Link>
											</li>
										))}
									</ul>
								</div>
							))}
						</div>
					</nav>
				</div>

				{/* 矢印リンク2本 */}
				<div className="mt-12 grid gap-3 sm:grid-cols-2 lg:gap-4">
					{footerArrows.map((a) => (
						<Link
							key={a.href}
							href={a.href}
							className="flex h-12 items-center justify-between rounded-hr border border-white/60 px-4 font-bold hover:bg-white hover:text-sumi lg:h-11"
						>
							<span>{a.label}</span>
							<span aria-hidden="true">→</span>
						</Link>
					))}
				</div>

				{/* 最下段 */}
				<div className="mt-12 flex flex-col gap-3 border-t border-white/20 pt-6 text-xs lg:flex-row lg:items-center lg:justify-between lg:text-xs-pc">
					<ul className="flex flex-wrap gap-4">
						{footerLegal.map((l) => (
							<li key={l.href}>
								<Link href={l.href} className="text-white/80 hover:text-white hover:underline">
									{l.label}
								</Link>
							</li>
						))}
					</ul>
					<p className="text-white/80">
						© {company.founded.slice(0, 4)}–{new Date().getFullYear()} {company.name}
					</p>
				</div>
			</div>
		</footer>
	);
}
