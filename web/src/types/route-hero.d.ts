/**
 * route-hero.js 2.0.0(web/public/vendor/route-hero/2.0.0/)が作る window.RouteHero の、このサイトで使う分だけの型。
 * 本体は書き換えない。データの形は web/data/route-map/schematic.json と lib/route-map.ts。
 */
import type { RouteItem, RouteMapData } from '@/lib/route-map';

declare global {
	interface RouteHeroDetail {
		type: string;
		stations: string[];
		names: string[];
		count: number;
		url: string;
	}

	interface RouteHeroInstance {
		get(): RouteHeroDetail;
		destroy(): void;
	}

	interface RouteHeroApi {
		version: string;
		mount(
			host: HTMLElement,
			options: {
				data: RouteMapData;
				items?: readonly RouteItem[];
				searchUrl?: string;
				layout?: 'split' | 'stack' | 'none';
				label?: string;
			},
		): RouteHeroInstance | null;
	}

	interface Window {
		RouteHero?: RouteHeroApi;
	}
}

export {};
