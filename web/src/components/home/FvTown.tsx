'use client';

import { useEffect, useRef, useState } from 'react';
import { loadBlockTown } from '@/lib/vendor-script';

/**
 * トップの FV の背景の街(block-town.js 1.0.0・three.js 0.147.0・J-171)を包むだけの部品。本体は書き換えず、React で書き直さない。
 *  - 置き方:FV の section(relative isolate)の中の一番下の層に、空の div を敷く(aria-hidden・クリックを受けない)。中身は本体が足す canvas 1つ
 *  - 読み込みの順番:最初の表示の後(requestIdleCallback)に loadBlockTown()(中で loadThree() を先に読む)→ 書体の読み込み(document.fonts.ready)
 *    → **路線図ヒーローのパネルが描かれた後**(最初の rh:change。パネルが出る前に測ると、見出しの後ろの低い家の範囲がずれる。
 *    街は幅が変わった時にしか作り直さないため・SHIN の条件)→ mount。路線図が読めない時のために、パネルは 10 秒で待つのをやめる
 *  - quiet:後ろを低い家と空き地だけにする要素。**1つ目の真ん中がカメラの揺れの軸**なので、1024 以上はキャッチとパネルを含む左の列全体を渡す。
 *    〜1023 は左の列の箱が無い(見た目の並べ替えのため)ので、キャッチの塊とパネルを渡す。幅が 1024 を跨いだら渡し直す(setQuiet)
 *  - 電車は墨系(train: "ink")。03 の青緑の例外は足さない(SHIN の判断)
 *  - mount() が null(WebGL が使えない)の時は、止めるボタンを出さず、地の色(#F3F4F5)のまま
 *  - 片付けで destroy()(画面の切り替えで二重に描かない)。「動きを減らす」の設定では、本体が止まった状態で始める
 *  - 止めるボタンは FV の右下(5秒より長く自動で動くため・WCAG 2.2.2)。文字は「動きを止める」「動かす」
 * 路線図の部品の中の左の列・キャッチ・パネルは data-rm="column | lead | panel"(RouteMap.tsx)。
 */
const PANEL_WAIT_MS = 10000;

export function FvTown() {
	const ref = useRef<HTMLDivElement>(null);
	const townRef = useRef<BlockTownInstance | null>(null);
	const [ready, setReady] = useState(false);
	const [moving, setMoving] = useState(false);

	useEffect(() => {
		const el = ref.current;
		const section = el?.closest('section');
		if (!el || !section) return;
		let cancelled = false;
		const lg = window.matchMedia('(min-width: 64rem)');
		const pick = (key: string) => section.querySelector(`[data-rm="${key}"]`);
		const quiet = () => (lg.matches ? [pick('column')] : [pick('lead'), pick('panel')]).filter((x): x is Element => x !== null);

		// 路線図ヒーローのパネルが描かれたか(最初の rh:change)。もう描かれていればすぐ進む
		let onFirstChange = () => {};
		let waitTimer = 0;
		const panelReady = new Promise<void>((resolve) => {
			if (section.querySelector('.rh-panel')) return resolve();
			onFirstChange = () => resolve();
			section.addEventListener('rh:change', onFirstChange, { once: true });
			waitTimer = window.setTimeout(resolve, PANEL_WAIT_MS);
		});

		const start = async () => {
			const api = await loadBlockTown();
			if (cancelled || !api) return;
			await document.fonts.ready;
			await panelReady;
			if (cancelled) return;
			const town = api.mount(el, { quiet: quiet(), train: 'ink', onChange: (m) => setMoving(m) });
			if (!town) return; // WebGL が使えない時は地の色のまま。ボタンも出さない
			townRef.current = town;
			setMoving(town.moving);
			setReady(true);
		};
		// 最初の表示の後で読み込む(FV の文字と路線図を先に出す)
		const useIdle = 'requestIdleCallback' in window;
		const idleId = useIdle ? window.requestIdleCallback(() => void start()) : window.setTimeout(() => void start(), 200);

		const onBreakpoint = () => townRef.current?.setQuiet(quiet());
		lg.addEventListener('change', onBreakpoint);

		return () => {
			cancelled = true;
			if (useIdle) window.cancelIdleCallback(idleId);
			else window.clearTimeout(idleId);
			window.clearTimeout(waitTimer);
			section.removeEventListener('rh:change', onFirstChange);
			lg.removeEventListener('change', onBreakpoint);
			townRef.current?.destroy();
			townRef.current = null;
		};
	}, []);

	return (
		<>
			<div ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" />
			{ready && (
				<button
					type="button"
					onClick={() => (moving ? townRef.current?.pause() : townRef.current?.play())}
					className="absolute right-4 bottom-4 z-10 h-10 cursor-pointer rounded-hr border border-sumi bg-surface px-4 text-small font-medium text-sumi transition-colors duration-150 hover:bg-surface-alt motion-reduce:transition-none lg:right-8"
				>
					{moving ? '動きを止める' : '動かす'}
				</button>
			)}
		</>
	);
}
