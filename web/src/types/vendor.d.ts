/**
 * web/public/vendor/ に置いた外の JS が作る window の値のうち、このサイトで使う分だけの型(J-171)。本体は書き換えない。
 * 路線図ヒーローの型は route-hero.d.ts。
 */
declare global {
	/** three.js 0.147.0 の global build。版の確かめに REVISION だけを見る(描くのは block-town.js) */
	interface ThreeGlobal {
		REVISION: string;
	}

	interface BlockTownInstance {
		play(): BlockTownInstance;
		pause(): BlockTownInstance;
		setQuiet(list: Element[]): BlockTownInstance;
		relayout(): BlockTownInstance;
		destroy(): void;
		readonly moving: boolean;
		info(): { size: unknown; blocks: number; running: boolean; moving: boolean; clock: number };
	}

	interface BlockTownApi {
		version: string;
		mount(
			host: HTMLElement,
			options: {
				/** 後ろを低い家と空き地だけにする要素。1つ目の真ん中がカメラの揺れの軸 */
				quiet?: Element[];
				moving?: boolean;
				train?: 'teal' | 'ink';
				onChange?: (moving: boolean) => void;
			},
		): BlockTownInstance | null;
	}

	interface Window {
		THREE?: ThreeGlobal;
		BlockTown?: BlockTownApi;
	}
}

export {};
