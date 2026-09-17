'use client';

import Script from 'next/script';
import { useEffect, useRef } from 'react';

type RenderOptions = {
	sitekey: string;
	theme?: 'light' | 'dark' | 'auto';
	language?: string;
	callback?: (token: string) => void;
	'expired-callback'?: () => void;
	'error-callback'?: () => void;
	'timeout-callback'?: () => void;
};
declare global {
	interface Window {
		turnstile?: { render: (el: HTMLElement, opts: RenderOptions) => string; remove?: (id: string) => void; reset?: (id: string) => void };
		onloadTurnstileCallback?: () => void;
	}
}

/**
 * Cloudflare Turnstile(J-102 b)。公式ドキュメントの「explicit rendering」:
 * api.js を ?render=explicit で読み、window.turnstile.render() で置く。
 * render() が container の中に hidden input `cf-turnstile-response` を自動で足すので、
 * 囲んでいる <form> の送信にトークンが乗る。Action 側で siteverify に掛ける。
 * ライブラリは足さない。siteKey が無い(開発時)なら何も出さず、`onToken` も呼ばない。
 *
 * **トークンは即座には出ない**(実測で確認画面が出てから約1.5秒。F-011)。取得・失効・失敗を `onToken` で親に伝え、
 * 親は空の間「送信する」を押せなくする(J-106)。失効・失敗時は '' を返して押せない状態に戻す。
 */
export function Turnstile({ siteKey, onToken, resetOn }: { siteKey: string; onToken?: (token: string) => void; /** 値が変わるたびにウィジェットを作り直す(送信に失敗した後。トークンは1回しか使えない・J-114) */ resetOn?: unknown }) {
	const ref = useRef<HTMLDivElement>(null);
	const idRef = useRef<string | null>(null);

	// onToken は親の setState をそのまま渡す前提(参照が変わらないので、この効果は1度だけ動く)
	useEffect(() => {
		if (!siteKey) return;
		const el = ref.current;
		if (!el) return;
		const render = () => {
			if (idRef.current || !window.turnstile) return;
			idRef.current = window.turnstile.render(el, {
				sitekey: siteKey,
				theme: 'light',
				language: 'ja',
				callback: (token) => onToken?.(token),
				'expired-callback': () => onToken?.(''),
				'error-callback': () => onToken?.(''),
				'timeout-callback': () => onToken?.(''),
			});
		};
		if (window.turnstile) render();
		else window.onloadTurnstileCallback = render;
		return () => {
			if (idRef.current && window.turnstile?.remove) window.turnstile.remove(idRef.current);
			idRef.current = null;
		};
	}, [siteKey, onToken]);

	// 送信に失敗して確認画面に戻った時、消費済みのトークンのままだと次も「確認に失敗しました」になる(J-114)
	useEffect(() => {
		if (!idRef.current || !window.turnstile?.reset) return;
		window.turnstile.reset(idRef.current);
		onToken?.('');
		// resetOn が変わった時だけ動かす(onToken は親の setState で参照が変わらない)
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [resetOn]);

	if (!siteKey) return null;
	return (
		<>
			<Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback&render=explicit" strategy="afterInteractive" />
			<div ref={ref} className="min-h-[65px]" />
		</>
	);
}
