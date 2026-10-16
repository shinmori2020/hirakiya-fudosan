import { Container } from '@/components/layout/Container';

/**
 * 見出しの帯(J-176・03 §7「見出しの帯」)。説明・文章のページの先頭に置き、ページの h1 をこの中に出す(h1 はページに1つ)。
 * 背景はトップの FV と同じ街の止まった画像(block-map-kit の header-town 1.0.0)。飾りなので CSS の背景にする(globals.css の .hr-page-band)。
 * 動きも操作もないのでサーバーの部品のまま。パンくず・リード・注記は帯の直下に、各ページが置く(SHIN の判断)。
 * h1 は中身の列(Container)の左に最大 760。PC は帯の上下の真ん中、スマホは下半分で2行まで(題名は約 28 文字まで)。
 */
const IMAGE = { pc: '/page-band/1.0.0/header-town-pc.webp', sp: '/page-band/1.0.0/header-town-sp.webp' } as const; // globals.css の .hr-page-band と同じ
const MD_UP = '(min-width: 48rem)';
const SP_ONLY = '(max-width: 47.9375rem)';

export function PageBand({ title }: { title: string }) {
	return (
		<div className="hr-page-band">
			{/* 帯の画像がこのページの LCP になるので、先に読み始める(J-176・SHIN の条件:幅で分け、スマホでは PC 用を読まない)。
			    React 19 は <link> を <head> に移す。media に合わない方は読まれない */}
			<link rel="preload" as="image" href={IMAGE.pc} media={MD_UP} fetchPriority="high" />
			<link rel="preload" as="image" href={IMAGE.sp} media={SP_ONLY} fetchPriority="high" />
			<Container className="hr-page-band__inner">
				<h1 className="max-w-[760px] text-h1 font-bold text-pretty text-sumi [word-break:auto-phrase] lg:text-h1-pc">{title}</h1>
			</Container>
		</div>
	);
}
