import { describe, expect, it } from 'vitest';
import { AUTOPLAY_MS, initialStopped, shouldAutoAdvance, stoppedAfter, type AutoplayState } from '@/lib/voice-autoplay';

const idle: AutoplayState = { stopped: false, hovering: false, focusWithin: false, modalOpen: false, hidden: false };

describe('voice-autoplay.ts', () => {
	it('J-162 止まる条件が1つも無ければ送る', () => {
		expect(shouldAutoAdvance(idle)).toBe(true);
	});

	it('J-162 マウスを乗せている間は送らない', () => {
		expect(shouldAutoAdvance({ ...idle, hovering: true })).toBe(false);
	});

	it('J-162 フォーカスがカルーセルの中にある間は送らない', () => {
		expect(shouldAutoAdvance({ ...idle, focusWithin: true })).toBe(false);
	});

	it('J-162 モーダルを開いている間は送らない', () => {
		expect(shouldAutoAdvance({ ...idle, modalOpen: true })).toBe(false);
	});

	it('J-162 画面が見えていない間は送らない', () => {
		expect(shouldAutoAdvance({ ...idle, hidden: true })).toBe(false);
	});

	it('J-162 止めている間は送らない(触った後・停止ボタン)', () => {
		expect(shouldAutoAdvance({ ...idle, stopped: true })).toBe(false);
	});

	it('J-162 動きを減らす設定の人は最初から止めている', () => {
		expect(initialStopped(true)).toBe(true);
		expect(initialStopped(false)).toBe(false);
	});

	it('J-162 矢印・スワイプ・モーダル・停止ボタンの後は止める', () => {
		expect(stoppedAfter('arrow')).toBe(true);
		expect(stoppedAfter('swipe')).toBe(true);
		expect(stoppedAfter('open-modal')).toBe(true);
		expect(stoppedAfter('pause')).toBe(true);
	});

	it('J-162 再生ボタンだけが再開する', () => {
		expect(stoppedAfter('play')).toBe(false);
	});

	it('J-162 間隔は6秒', () => {
		expect(AUTOPLAY_MS).toBe(6000);
	});
});
