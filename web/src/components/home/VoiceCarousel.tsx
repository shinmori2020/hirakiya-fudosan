'use client';

import { X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { Voice } from '@/config/site';
import { Carousel } from '@/components/ui/Carousel';
import { VoiceCard, VoiceSpeaker } from '@/components/voice/VoiceCard';
import { AUTOPLAY_MS, initialStopped, stoppedAfter, type Interaction } from '@/lib/voice-autoplay';

/**
 * トップのお客様の声(J-128 → J-162)。
 *  - カードの中身は /voice と同じ `VoiceCard`(話し手の塊 = 薄灰の丸 + 人型・名前・属性 → 本文)。トップは本文3行で「…」、
 *    一番下に「全文を読む」。**カード全体をボタン**にし、押すと全文のモーダルを開く(03 §6・J-162)
 *  - モーダルは物件詳細の写真のモーダル(J-048)と同じ作り:`<dialog>` の showModal()・開閉は `hr-dialog`(不透明度 200ms)。
 *    Esc とフォーカスの閉じ込めは dialog の既定。外を押す・× で閉じる。閉じたらもとのカードにフォーカスを戻す。背景はスクロールさせない
 *  - 並べ方は右端まで伸ばす(bleed)、6秒ごとの自動送り(03 §8 の例外)。止める決め方は lib/voice-autoplay.ts
 * 配列はトップと /voice が共有する `config/site.ts` の `voices`(J-056 項目9)。ここではデータを持たない。
 */
function subscribeReduced(cb: () => void) {
	const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
	mq.addEventListener('change', cb);
	return () => mq.removeEventListener('change', cb);
}

export function VoiceCarousel({ voices, heading, extra }: { voices: readonly Voice[]; heading: React.ReactNode; extra?: React.ReactNode }) {
	/** 動きを減らす設定(サーバーと水和の時は false。水和の後に実際の値へ) */
	const reduced = useSyncExternalStore(
		subscribeReduced,
		() => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
		() => false,
	);
	/** 触った後・停止 / 再生 で決めた「止めている」状態。まだ触っていなければ null(reduced-motion の初期値に従う) */
	const [userStopped, setUserStopped] = useState<boolean | null>(null);
	const stopped = userStopped ?? initialStopped(reduced);
	const interact = (kind: Interaction) => setUserStopped(stoppedAfter(kind));

	/** モーダルを開いているか / 中に出す声(閉じるフェードの間も中身を残すため、声は閉じても消さない) */
	const [open, setOpen] = useState(false);
	const [current, setCurrent] = useState<Voice | null>(null);
	const dialogRef = useRef<HTMLDialogElement>(null);
	/** 閉じた後にフォーカスを戻すカード */
	const returnTo = useRef<HTMLButtonElement | null>(null);

	useEffect(() => {
		if (!open) return;
		dialogRef.current?.showModal();
		// 開いている間は背面をスクロールさせない(写真のモーダルと同じ)
		const prev = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.body.style.overflow = prev;
		};
	}, [open]);

	function openModal(v: Voice, card: HTMLButtonElement) {
		returnTo.current = card;
		interact('open-modal');
		setCurrent(v);
		setOpen(true);
	}

	/** dialog が閉じた(×・Esc・外を押した)。もとのカードにフォーカスを戻す */
	function onClose() {
		setOpen(false);
		returnTo.current?.focus();
	}

	return (
		<>
			<Carousel
				items={voices}
				getKey={(v) => v.who}
				heading={heading}
				extra={extra}
				perView={{ md: 2, lg: 3 }}
				bleed
				autoplay={{ ms: AUTOPLAY_MS, stopped, hold: open, onInteract: interact }}
				render={(v) => (
					<button
						type="button"
						onClick={(e) => openModal(v, e.currentTarget)}
						aria-haspopup="dialog"
						className="flex h-full w-full cursor-pointer flex-col rounded-hr border border-line bg-surface p-4 text-left transition-colors duration-150 hover:bg-badge-new-bg motion-reduce:transition-none lg:p-6"
					>
						<VoiceCard
							voice={v}
							clamp
							footer={<span className="text-small text-accent-strong underline lg:text-small-pc">全文を読む</span>}
						/>
					</button>
				)}
			/>

			{/* 全文のモーダル(J-162)。外を押した時は dialog 自身が押される(中身は内側の箱)ので、target で見分けて閉じる */}
			<dialog
				ref={dialogRef}
				onClose={onClose}
				onClick={(e) => {
					if (e.target === e.currentTarget) dialogRef.current?.close();
				}}
				aria-labelledby="voice-modal-title"
				className="hr-dialog m-auto w-[calc(100%-2rem)] max-w-lg rounded-hr border-0 bg-transparent p-0"
			>
				{current && (
					<div className="rounded-hr bg-surface p-6 lg:p-8">
						<div className="flex items-start justify-between gap-4">
							<h3 id="voice-modal-title" className="sr-only">
								{current.who}(架空)の声
							</h3>
							<VoiceSpeaker voice={current} />
							<button
								type="button"
								onClick={() => dialogRef.current?.close()}
								aria-label="閉じる"
								className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-hr text-sumi transition-colors duration-150 hover:bg-surface-alt motion-reduce:transition-none"
							>
								<X size={20} aria-hidden="true" />
							</button>
						</div>
						<p className="mt-4 text-body text-ink lg:text-body-pc">{current.text}</p>
						<p className="mt-6 border-t border-line pt-4">
							<Link href="/voice" className="text-body text-accent-strong underline lg:text-body-pc">
								お客様の声をすべて見る
							</Link>
						</p>
					</div>
				)}
			</dialog>
		</>
	);
}
