'use client';

import dynamic from 'next/dynamic';

/**
 * Leaflet は window に依存し SSR できないため、Client Component の中で ssr:false の dynamic import にする
 * (Next.js 16 のガイド:ssr:false は Client Component 内でのみ有効。Server Component では使えない)。
 */
const PropertyMap = dynamic(() => import('@/components/property/PropertyMap'), {
	ssr: false,
	loading: () => <div className="h-64 w-full animate-pulse rounded-hr border border-line bg-surface-alt lg:h-80" aria-hidden="true" />,
});

export function MapLoader(props: { lat: number; lng: number; title: string }) {
	return <PropertyMap {...props} />;
}
