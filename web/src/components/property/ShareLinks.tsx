'use client';

import { Check, Link2, Send } from 'lucide-react';
import { attrClass } from '@/components/property/AttrLink';
import { useEffect, useState, useSyncExternalStore } from 'react';

/**
 * 共有導線(J-086)。URL コピーと LINE の2つだけ。
 *
 * 置き場所はページ下部の CTA(「この物件を見てみる」)の中、注意書きの1行上。右カラムは J-084 で写真と高さを揃えたので触らない。
 * **見た目は J-052 の「押せる文字」**(青緑の文字・下線なし・hover で下線と淡い青緑の背景)。
 * J-086 では主CTA と同じ高さ・枠線のボタンにしていたが、格下の用件に主CTA と同じ重みが付くのでやめた(J-089)。
 * 新しい見た目は作らず、属性リンクと同じ class(attrClass)を使う。見出し「この物件を共有」も外して段を減らす。
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

	// 押せる文字(J-052)。アイコンを添えるので inline-flex にし、選択は走らせない(F-008)
	const link = `${attrClass('text')} inline-flex items-center gap-1 text-small select-none`;
	const lineShare = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;

	return (
		<div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
			{canCopy && (
				<button type="button" onClick={copy} className={link}>
					{copied ? <Check aria-hidden="true" className="size-4" /> : <Link2 aria-hidden="true" className="size-4" />}
					{copied ? 'コピーしました' : 'URL をコピー'}
				</button>
			)}
			{/* 外部サイト。新しいタブで開く(戻れるように) */}
			<a href={lineShare} target="_blank" rel="noopener noreferrer" className={link}>
				<Send aria-hidden="true" className="size-4" />
				LINE で送る
			</a>
			{/* コピーの結果は読み上げにも伝える(ボタンの文字が変わるだけでは気づけないため) */}
			<span aria-live="polite" className="sr-only">
				{copied ? 'URL をコピーしました' : ''}
			</span>
		</div>
	);
}
