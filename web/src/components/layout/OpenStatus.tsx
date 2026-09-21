'use client';

import { useEffect, useState } from 'react';
import { openStatus } from '@/lib/open-status';

/**
 * 営業中の表示(03 §7・J-143)。PC ヘッダーの電話ボタン2行目。
 * **サーバーと水和前は fallback(現状の「9:30〜18:30 / 水曜定休」)を出し、マウント後に現在時刻で差し替える**。
 * サーバーで時刻を読むとビルド時刻で固定される(static-rendering.md)ため、判定は必ずクライアント。
 * 開店前(before)は状態文が無いので fallback のまま。1分ごとに再判定する(境界の 9:30 / 18:30 をまたぐため)。
 */
export function OpenStatus({ hours, closed, fallback, className }: { hours: string; closed: string; fallback: string; className?: string }) {
	const [label, setLabel] = useState<string | null>(null);

	useEffect(() => {
		const tick = () => setLabel(openStatus(new Date(), hours, closed).label);
		tick();
		const id = window.setInterval(tick, 60_000);
		return () => window.clearInterval(id);
	}, [hours, closed]);

	return <span className={className}>{label ?? fallback}</span>;
}
