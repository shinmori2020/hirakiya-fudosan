import { UserRound } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Voice } from '@/config/site';

/**
 * お客様の声のカードの中身(J-162・03 §6)。トップ(VoiceCarousel)と /voice で同じ形にする。
 * 外枠(カードの面・押せるかどうか)は呼び出し側が持つ。ここは中身だけ:
 *   話し手の塊(薄灰の丸 + 人型・名前・属性)→ 本文 →(トップだけ)「全文を読む」
 * 人型は全カード同じ(03 §6 アイコンの例外・J-162)。名乗りには必ず「(架空)」を添える(J-057・00 §7-9)。
 * トップではボタンの中に置くので、要素はすべて span(block)にする(button の中に div / p は置けない)。
 */
export function VoiceSpeaker({ voice }: { voice: Voice }) {
	return (
		<span className="flex items-center gap-3">
			<span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-alt text-sumi">
				<UserRound size={20} />
			</span>
			<span className="block min-w-0">
				<span className="block text-body font-bold text-sumi lg:text-body-pc">{voice.who}(架空)</span>
				<span className="block text-small text-ink-weak lg:text-small-pc">
					{voice.town} / {voice.kind} / {voice.attr}
				</span>
			</span>
		</span>
	);
}

export function VoiceCard({ voice, clamp = false, footer, textClassName = 'text-small lg:text-small-pc' }: {
	voice: Voice;
	/** トップ:本文を3行で切る(溢れる時は3行目の終わりを「…」) */
	clamp?: boolean;
	/** カードの一番下に置くもの(トップの「全文を読む」) */
	footer?: ReactNode;
	/** 本文の文字の大きさ(トップは小・/voice は本文) */
	textClassName?: string;
}) {
	return (
		<>
			<VoiceSpeaker voice={voice} />
			{/* 3行で切る時は display: -webkit-box が要るので block を付けない(block が勝つと切れない) */}
			<span className={`mt-3 text-ink ${textClassName} ${clamp ? 'line-clamp-3' : 'block'}`}>{voice.text}</span>
			{footer && <span className="mt-auto block pt-3">{footer}</span>}
		</>
	);
}
