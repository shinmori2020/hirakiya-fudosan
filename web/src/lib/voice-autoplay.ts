/**
 * お客様の声のカルーセルの自動送り(J-162・03 §8 の例外)。
 * 送るかどうかの決め方だけをここに置く(縦タブの lib/side-tab.ts と同じ形。部品は状態を集めてここに聞く)。
 *
 *  - 6秒ごとに1枚ずつ送る(流れ続けると文字が読めないため)
 *  - 止まる時:マウスを乗せている間 / フォーカスが中にある間 / モーダルを開いている間 / 画面が見えていない間
 *  - 触った後(矢印・スワイプ・カードを押してモーダルを開く・停止ボタン)は、ページを開き直すまで送らない。
 *    「再生」ボタンだけが再開できる
 *  - prefers-reduced-motion の人には、最初は送らない(ボタンは「再生」の状態で出す)
 */

/** 送る間隔(ms) */
export const AUTOPLAY_MS = 6000;

export interface AutoplayState {
	/** 触った後・停止ボタン・reduced-motion の初期値で止めている */
	stopped: boolean;
	/** マウスを乗せている */
	hovering: boolean;
	/** キーボードのフォーカスがカルーセルの中にある */
	focusWithin: boolean;
	/** モーダルを開いている */
	modalOpen: boolean;
	/** 画面が見えていない(ほかのタブを見ている等) */
	hidden: boolean;
}

/** 今、自動で送ってよいか。どれか1つでも止まる条件があれば送らない */
export function shouldAutoAdvance(s: AutoplayState): boolean {
	return !s.stopped && !s.hovering && !s.focusWithin && !s.modalOpen && !s.hidden;
}

/** 最初の「止めている」状態。動きを減らす設定の人には最初から送らない */
export function initialStopped(reducedMotion: boolean): boolean {
	return reducedMotion;
}

/** 使われた操作 */
export type Interaction = 'arrow' | 'swipe' | 'open-modal' | 'pause' | 'play';

/** 操作の後の「止めている」状態。再生ボタンだけが再開する。ほかの操作はすべて止める */
export function stoppedAfter(interaction: Interaction): boolean {
	return interaction !== 'play';
}
