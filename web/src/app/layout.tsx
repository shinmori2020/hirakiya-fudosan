import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Noto_Sans_JP } from 'next/font/google';
import './globals.css';
import { company, SITE_URL } from '@/config/site';
import { NoticeBar } from '@/components/layout/NoticeBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SideTab } from '@/components/layout/SideTab';
import { FixedCta } from '@/components/layout/FixedCta';
import { getProperties } from '@/lib/properties';

/* 書体は Noto Sans JP 1種のみ(03 §3) */
const notoSansJp = Noto_Sans_JP({
	subsets: ['latin'],
	weight: ['400', '500', '700'],
	display: 'swap',
	variable: '--font-noto-sans-jp',
});

export const metadata: Metadata = {
	metadataBase: new URL(SITE_URL),
	title: {
		default: `${company.name} | ${company.tagline}`,
		template: `%s | ${company.shortName}`,
	},
	description: `${company.notice} 葛飾区・京成線沿線の賃貸・売買・管理。`,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
	// 成約済みの物件番号(固定 CTA が詳細ページで内見予約を隠すため・J-038)。index.json から。動的 API は読まない
	const soldNos = (await getProperties()).filter((p) => p.status === 'sold').map((p) => p.no);
	return (
		<html lang="ja" className={`${notoSansJp.variable} h-full antialiased`}>
			<body className="flex min-h-full flex-col">
				{/*
				 * 本文へのスキップリンク。キーボードだけで使う人が、ヘッダーのリンク7個を毎回通らずに本文へ行けるようにする。
				 * 普段は見えず(sr-only)、Tab でフォーカスが当たった時だけ左上に出す(focus:not-sr-only)。
				 * z-50 はヘッダー(z-40)より上。位置は fixed にして、どのページでも同じ場所に出す。
				 */}
				<a
					href="#main"
					className="sr-only rounded-hr bg-sumi text-body font-bold text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2"
				>
					本文へスキップ
				</a>
				<NoticeBar />
				<Header />
				<main id="main" tabIndex={-1} className="flex-1">
					{children}
				</main>
				<Footer />
				{/* 固定CTA(64px)の分だけページ末尾に余白を取り、フッター最下段を隠さない(J-030)。スマホのみ */}
				<div className="h-16 lg:hidden" aria-hidden="true" />
				<SideTab />
				<FixedCta soldNos={soldNos} />
			</body>
		</html>
	);
}
