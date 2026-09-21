'use client';

import { useEffect, useState } from 'react';

/**
 * FV の2段目のコピーの入れ替え(03 §8「FV の動き」・J-144)。
 * **初期 HTML は1本目**(サーバーと水和で同じ)。マウント後、10秒ごとに 200ms のフェードで次へ。
 * prefers-reduced-motion では入れ替え自体を止めて1本目のまま。aria-live は付けない(読み上げは初期の1本目だけ)。
 * 出現効果(J-135 の fv-in)は親の箱が持つので、ここでは初回に何もしない。
 */
const INTERVAL = 10_000;
const FADE = 200;

export function FvCopy({ items, className }: { items: readonly string[]; className?: string }) {
	const [index, setIndex] = useState(0);
	const [visible, setVisible] = useState(true);

	useEffect(() => {
		if (items.length < 2) return;
		if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
		let fade: number | undefined;
		const id = window.setInterval(() => {
			setVisible(false);
			fade = window.setTimeout(() => {
				setIndex((i) => (i + 1) % items.length);
				setVisible(true);
			}, FADE);
		}, INTERVAL);
		return () => {
			window.clearInterval(id);
			if (fade) window.clearTimeout(fade);
		};
	}, [items.length]);

	return (
		<p className={`${className ?? ''} transition-opacity duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none ${visible ? 'opacity-100' : 'opacity-0'}`}>
			{items[index]}
		</p>
	);
}
