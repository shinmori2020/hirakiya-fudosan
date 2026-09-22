'use client';

import Link from 'next/link';
import { Carousel } from '@/components/ui/Carousel';
import { PropertyCardMini } from '@/components/property/PropertyCardMini';
import type { PropertySummary } from '@/types/property';

/**
 * FV の左下に置く新着の小カード(03 §6・§7・§8「FV の動き」6・J-147)。
 * Carousel は Client Component で render / getKey に関数を渡すため、Server Component(page.tsx)からは
 * 直接使えない。ここで関数を作る(VoiceCarousel・RecentlyViewed と同じ形)。駅名は slug → 名前の表で受け取る。
 * 3枚見せ、8秒で1枚ずつ送る。hover / フォーカス / 非表示タブ / reduced-motion で止まる(Carousel の autoplay)。
 */
export function NewListingsMini({ items, stations }: { items: PropertySummary[]; stations: Record<string, string> }) {
	const stationName = (slug: string) => stations[slug] ?? slug;
	return (
		<Carousel
			items={items}
			getKey={(p) => p.no}
			perView={{ md: 3, lg: 3 }}
			autoplay={8000}
			dense
			heading={<p className="text-small text-white/90">新着物件</p>}
			extra={
				<Link href="/properties" className="text-small text-white underline underline-offset-2 hover:no-underline">
					すべて見る
				</Link>
			}
			render={(p) => <PropertyCardMini p={p} stationName={stationName} />}
		/>
	);
}
