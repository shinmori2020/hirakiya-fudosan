'use client';

import Script from 'next/script';
import { useEffect, useRef } from 'react';

declare global {
	interface Window {
		turnstile?: { render: (el: HTMLElement, opts: { sitekey: string; theme?: 'light' | 'dark' | 'auto'; language?: string }) => string; remove?: (id: string) => void };
		onloadTurnstileCallback?: () => void;
	}
}

/**
 * Cloudflare Turnstile(J-102 b)。公式ドキュメントの「explicit rendering」:
 * api.js を ?render=explicit で読み、window.turnstile.render() で置く。
 * render() が container の中に hidden input `cf-turnstile-response` を自動で足すので、
 * 囲んでいる <form> の送信にトークンが乗る。Action 側で siteverify に掛ける。
 * ライブラリは足さない。siteKey が無い(開発時)なら何も出さない。
 */
export function Turnstile({ siteKey }: { siteKey: string }) {
	const ref = useRef<HTMLDivElement>(null);
	const idRef = useRef<string | null>(null);

	useEffect(() => {
		if (!siteKey) return;
		const el = ref.current;
		if (!el) return;
		const render = () => {
			if (idRef.current || !window.turnstile) return;
			idRef.current = window.turnstile.render(el, { sitekey: siteKey, theme: 'light', language: 'ja' });
		};
		if (window.turnstile) render();
		else window.onloadTurnstileCallback = render;
		return () => {
			if (idRef.current && window.turnstile?.remove) window.turnstile.remove(idRef.current);
			idRef.current = null;
		};
	}, [siteKey]);

	if (!siteKey) return null;
	return (
		<>
			<Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback&render=explicit" strategy="afterInteractive" />
			<div ref={ref} className="min-h-[65px]" />
		</>
	);
}
