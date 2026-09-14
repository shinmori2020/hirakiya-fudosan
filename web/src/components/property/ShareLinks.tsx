'use client';

import { Check, Link2, Share2 } from 'lucide-react';
import { useEffect, useState, useSyncExternalStore } from 'react';

/**
 * 共有導線(J-086)。URL コピーと LINE の2つだけ。
 *
 * 置き場所はページ下部の CTA(「この物件を見てみる」)の中。右カラムは J-084 で写真と高さを揃えたので触らない。
 * 成約済みでも出す(J-038 で消したのは内見予約だけ。情報を家族に送る場面は残る)。
 *
 * JS が動かない環境の扱い:
 *   - LINE は素の <a>(外部 URL)なので JS 無しでも動く。
 *   - **URL コピーはボタンなので、JS が動いて Clipboard API が使える時だけ出す。**
 *     押せるのに何も起きないボタンを画面に残さないため、マウント後に判定して表示する。
 * 静的書き出し(rules/static-rendering.md)には影響しない。cookie も header も読まず、
 *   URL は Server Component から絶対 URL を渡してもらう(location を読まない)。
 */
export function ShareLinks({ url, title }: { url: string; title: string }) {
	// サーバーでは false、ブラウザで JS が動いた時だけ true。effect で状態を置き換えない形にする
	const canCopy = useSyncExternalStore(
		() => () => {},
		() => typeof navigator !== 'undefined' && !!navigator.clipboard,
		() => false,
	);
	const [copied, setCopied] = useState(false);

	useEffect(() => {
		if (!copied) return;
		const t = setTimeout(() => setCopied(false), 2000);
		return () => clearTimeout(t);
	}, [copied]);

	async function copy() {
		try {
			await navigator.clipboard.writeText(url);
			setCopied(true);
		} catch {
			/* 権限が無い等。文言は変えない(コピーできていないのに「しました」と出さないため) */
		}
	}

	const button = 'flex h-11 items-center justify-center gap-1 rounded-hr border border-line bg-surface px-4 text-small text-ink select-none hover:bg-badge-new-bg transition-colors duration-150 motion-reduce:transition-none cursor-pointer';
	const lineShare = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;

	return (
		<div className="mt-4 flex flex-wrap items-center gap-2">
			<span className="flex items-center gap-1 text-xs text-ink-weak lg:text-xs-pc">
				<Share2 aria-hidden="true" className="size-4 text-accent" />
				この物件を共有
			</span>
			{canCopy && (
				<button type="button" onClick={copy} className={button}>
					{copied ? <Check aria-hidden="true" className="size-4 text-accent" /> : <Link2 aria-hidden="true" className="size-4 text-accent" />}
					{copied ? 'コピーしました' : 'URL をコピー'}
				</button>
			)}
			{/* 外部サイト。新しいタブで開く(戻れるように) */}
			<a href={lineShare} target="_blank" rel="noopener noreferrer" className={button}>
				LINE で送る
			</a>
			{/* コピーの結果は読み上げにも伝える(ボタンの文字が変わるだけでは気づけないため) */}
			<span aria-live="polite" className="sr-only">
				{copied ? 'URL をコピーしました' : ''}
			</span>
		</div>
	);
}
