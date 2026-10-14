/**
 * web/public/vendor/ に置いた外の JS が作る window の値のうち、このサイトで使う分だけの型(J-171 → J-173)。本体は書き換えない。
 * 路線図ヒーローの型は route-hero.d.ts。
 */
import type { RouteLayout, RouteMapData } from '@/lib/route-map';

declare global {
	/** three.js 0.147.0 の global build。版の確かめに REVISION だけを見る(描くのは block-map.js) */
	interface ThreeGlobal {
		REVISION: string;
	}

	/** block-map.js の update() に渡す、件数と選んでいる駅 */
	interface BlockMapState {
		type: string;
		typeLabel: string;
		types: { id: string; label: string }[];
		selected: string[];
		counts: Record<string, Record<string, number>>;
	}

	interface BlockMapInstance {
		update(state: BlockMapState): BlockMapInstance;
		highlight(lineId: string | null): BlockMapInstance;
		play(): BlockMapInstance;
		pause(): BlockMapInstance;
		relayout(): BlockMapInstance;
		destroy(): void;
		readonly moving: boolean;
		info(): Record<string, unknown>;
	}

	interface BlockMapApi {
		version: string;
		mount(
			host: HTMLElement,
			options: {
				data: RouteMapData;
				layout: RouteLayout;
				/** 路線図を置く場所(中身のない div。大きさだけを使う) */
				area: HTMLElement;
				/** 駅名の札を並べる層(FV いっぱいの div) */
				labels: HTMLElement;
				/** 見出しとパネルの列。この列は上から下まで空き地にする */
				quiet: Element[];
				onToggle?: (stationId: string) => void;
				onChange?: (moving: boolean) => void;
				onLayout?: (layout: { shown: boolean }) => void;
				moving?: boolean;
			},
		): BlockMapInstance | null;
	}

	interface Window {
		THREE?: ThreeGlobal;
		BlockMap?: BlockMapApi;
	}
}

export {};
