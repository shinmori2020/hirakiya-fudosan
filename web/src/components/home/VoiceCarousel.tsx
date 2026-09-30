'use client';

import { ChevronLeft, ChevronRight, Pause, Play, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import type { Voice } from '@/config/site';
import { Container } from '@/components/layout/Container';
import { VoiceCard, VoiceSpeaker } from '@/components/voice/VoiceCard';
import { AUTOPLAY_MS, initialStopped, shouldAutoAdvance, stoppedAfter, type Interaction } from '@/lib/voice-autoplay';
import { loopSlots, posOfReal, settle, startPos } from '@/lib/voice-loop';

/**
 * トップのお客様の声(J-128 → J-162 → J-163)。
 *  - カードの中身は /voice と同じ `VoiceCard`。トップは本文3行で「…」+「全文を読む」。**カード全体をボタン**にし、押すと全文のモーダル(J-162)
 *  - **並べ方(J-163)**:左右とも画面の端まで伸ばし、**今のカードを画面の中央**に置く(読み込んだ時は A が中央・左に F・右に B)。
 *    カードの幅と位置は globals.css の `.hr-voice-loop`(100cqw から計算するので、サーバーの HTML の時点で位置が決まる)
 *  - **無限ループ(J-163)**:前のクローン n 枚 + もとの n 枚 + 後のクローン n 枚を並べ、一方向に途切れず送る。
 *    クローンに入ったら、動き終わった後に見た目が同じもとの位置へ瞬間的に戻す(transition を外して位置を変える)。位置の計算は lib/voice-loop.ts
 *  - **クローンは見た目だけ**:aria-hidden・tabIndex -1。押した時はもとのカードの内容のモーダルを開き、閉じたらもとのカードへフォーカスを戻す
 *  - **キーボードで中央以外のカードに移ったら、そのカードを中央へ送る**(マウスで押した時の focus では送らない)
 *  - 自動送り(6秒・止まる条件・触った後・停止 / 再生・reduced-motion)は J-162 のまま。止める決め方は lib/voice-autoplay.ts
 *  - スマホも「位置をずらす」作り(J-163)。横に 10px 以上動いたらスワイプとみなして自動送りを止め、指を離した時に 40px 以上動いていたら1枚送る。
 *    縦のスクロールは touch-action: pan-y でブラウザに任せる。スワイプの直後のクリック(モーダルを開く)は捨てる
 *  - 送る動きは 200ms・03 §8 のイージング。reduced-motion では動かさない
 * 配列はトップと /voice が共有する `config/site.ts` の `voices`(J-056 項目9)。ここではデータを持たない。
 */
const SLIDE_MS = 200;
/** 横にこれ以上動いたらスワイプとみなす */
const SWIPE_START_PX = 10;
/** 指を離した時に、これ以上横に動いていたら1枚送る */
const SWIPE_SEND_PX = 40;

/* 前後の矢印は 1024 以上だけ(J-162 のまま。〜1023 はスワイプ)。停止 / 再生はスマホでも出す */
const ARROW =
	'size-9 cursor-pointer items-center justify-center rounded-hr border border-line bg-surface text-sumi transition-colors duration-150 hover:bg-badge-new-bg motion-reduce:transition-none';

function subscribeReduced(cb: () => void) {
	const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
	mq.addEventListener('change', cb);
	return () => mq.removeEventListener('change', cb);
}

export function VoiceCarousel({ voices, heading, extra }: { voices: readonly Voice[]; heading: ReactNode; extra?: ReactNode }) {
	const n = voices.length;
	const slots = loopSlots(n);

	/* ---------- 位置(中央のカードの番号)と送り ---------- */
	const [pos, setPos] = useState(() => startPos(n));
	/** 送る時だけ transition を付ける(クローンからもとの位置へ戻す時は付けない) */
	const [animate, setAnimate] = useState(false);
	const busy = useRef(false);
	const settleTimer = useRef<number | null>(null);

	useEffect(() => {
		return () => {
			if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);
		};
	}, []);

	function moveTo(next: number) {
		if (busy.current) return;
		busy.current = true;
		setAnimate(true);
		setPos(next);
		settleTimer.current = window.setTimeout(() => {
			busy.current = false;
			const s = settle(next, n);
			if (s !== next) {
				// 見た目が同じもとの位置へ、transition を外して瞬間的に戻す
				setAnimate(false);
				setPos(s);
			}
		}, SLIDE_MS + 20);
	}
	const go = (dir: 1 | -1) => moveTo(pos + dir);

	/* ---------- 自動送り(J-162 のまま) ---------- */
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
	const [hovering, setHovering] = useState(false);
	const [focusWithin, setFocusWithin] = useState(false);
	const [hidden, setHidden] = useState(false);
	/** モーダルを開いているか / 中に出す声(閉じるフェードの間も中身を残すため、声は閉じても消さない) */
	const [open, setOpen] = useState(false);
	const [current, setCurrent] = useState<Voice | null>(null);

	useEffect(() => {
		const onVis = () => setHidden(document.visibilityState === 'hidden');
		document.addEventListener('visibilitychange', onVis);
		return () => document.removeEventListener('visibilitychange', onVis);
	}, []);

	const advancing = shouldAutoAdvance({ stopped, hovering, focusWithin, modalOpen: open, hidden });
	/** interval から最新の go を呼ぶための参照(描画中には触らず effect で更新する) */
	const advanceRef = useRef<() => void>(() => {});
	useEffect(() => {
		advanceRef.current = () => go(1);
	});
	useEffect(() => {
		if (!advancing) return;
		const id = window.setInterval(() => advanceRef.current(), AUTOPLAY_MS);
		return () => window.clearInterval(id);
	}, [advancing]);

	/* ---------- モーダル(J-162 のまま) ---------- */
	const dialogRef = useRef<HTMLDialogElement>(null);
	/** もとのカード(クローンを押した時も、閉じた後はもとのカードへ戻す) */
	const realButtons = useRef<(HTMLButtonElement | null)[]>([]);
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

	function openModal(k: number) {
		returnTo.current = realButtons.current[k] ?? null;
		interact('open-modal');
		setCurrent(voices[k]);
		setOpen(true);
	}

	/** dialog が閉じた(×・Esc・外を押した)。もとのカードにフォーカスを戻す */
	function onClose() {
		setOpen(false);
		returnTo.current?.focus();
	}

	/* ---------- スワイプ ---------- */
	const touch = useRef<{ x: number; y: number; dx: number; swiping: boolean } | null>(null);
	/** スワイプの直後のクリックを捨てる */
	const justSwiped = useRef(false);

	return (
		<div
			onPointerEnter={(e) => {
				if (e.pointerType === 'mouse') setHovering(true);
			}}
			onPointerLeave={(e) => {
				if (e.pointerType === 'mouse') setHovering(false);
			}}
			onFocus={() => setFocusWithin(true)}
			onBlur={(e) => {
				if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusWithin(false);
			}}
		>
			<Container>
				<div className="flex items-center justify-between gap-4">
					{heading}
					<div className="flex items-center gap-3">
						{extra}
						<div className="flex gap-2">
							<button
								type="button"
								onClick={() => {
									interact('arrow');
									go(-1);
								}}
								aria-label="前へ"
								className={`hidden lg:flex ${ARROW}`}
							>
								<ChevronLeft size={20} aria-hidden="true" />
							</button>
							<button
								type="button"
								onClick={() => {
									interact('arrow');
									go(1);
								}}
								aria-label="次へ"
								className={`hidden lg:flex ${ARROW}`}
							>
								<ChevronRight size={20} aria-hidden="true" />
							</button>
							{/* 停止 / 再生(J-162)。5秒以上自動で動くものには止める手段を置く */}
							<button
								type="button"
								onClick={() => interact(stopped ? 'play' : 'pause')}
								aria-label={stopped ? '自動送りを再開する' : '自動送りを止める'}
								className={`flex ${ARROW}`}
							>
								{stopped ? <Play size={20} aria-hidden="true" /> : <Pause size={20} aria-hidden="true" />}
							</button>
						</div>
					</div>
				</div>
			</Container>

			{/* 列は画面の端から端まで。位置は --i(中央のカードの番号)から CSS で決める */}
			<div className="hr-voice-loop mt-6">
				<ul
					className={`hr-voice-loop__track ${animate ? 'transition-transform duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none' : ''}`}
					style={{ '--i': pos } as CSSProperties}
					onTouchStart={(e) => {
						touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, dx: 0, swiping: false };
					}}
					onTouchMove={(e) => {
						const t = touch.current;
						if (!t) return;
						t.dx = e.touches[0].clientX - t.x;
						const dy = e.touches[0].clientY - t.y;
						if (!t.swiping && Math.abs(t.dx) >= SWIPE_START_PX && Math.abs(t.dx) > Math.abs(dy)) {
							t.swiping = true;
							interact('swipe');
						}
					}}
					onTouchEnd={() => {
						const t = touch.current;
						touch.current = null;
						if (!t?.swiping) return;
						justSwiped.current = true;
						window.setTimeout(() => {
							justSwiped.current = false;
						}, 400);
						if (Math.abs(t.dx) >= SWIPE_SEND_PX) go(t.dx < 0 ? 1 : -1);
					}}
					onClickCapture={(e) => {
						if (!justSwiped.current) return;
						e.preventDefault();
						e.stopPropagation();
					}}
				>
					{slots.map((s, i) => (
						<li key={i} aria-hidden={s.clone || undefined}>
							<button
								type="button"
								ref={
									s.clone
										? undefined
										: (el) => {
												realButtons.current[s.real] = el;
											}
								}
								tabIndex={s.clone ? -1 : undefined}
								onClick={() => openModal(s.real)}
								onFocus={
									s.clone
										? undefined
										: (e) => {
												// キーボードで移った時だけ中央へ(マウスで押した時・モーダルから戻した時は送らない)
												if (e.currentTarget.matches(':focus-visible') && pos !== posOfReal(s.real, n)) moveTo(posOfReal(s.real, n));
											}
								}
								aria-haspopup="dialog"
								className="flex h-full w-full cursor-pointer flex-col rounded-hr border border-line bg-surface p-4 text-left transition-colors duration-150 hover:bg-badge-new-bg motion-reduce:transition-none lg:p-6"
							>
								<VoiceCard
									voice={voices[s.real]}
									clamp
									footer={<span className="text-small text-accent-strong underline lg:text-small-pc">全文を読む</span>}
								/>
							</button>
						</li>
					))}
				</ul>
			</div>

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
		</div>
	);
}
