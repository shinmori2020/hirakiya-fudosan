'use client';

import type { Voice } from '@/config/site';
import { Carousel } from '@/components/ui/Carousel';

/**
 * トップのお客様の声(J-128)。カードの形はトップ・/voice と同じ(白・灰線・角丸 6)。
 * 送りは `Carousel`(J-064 / J-065 の規則:PC は1件ずつ 200ms・端はループ、スマホは横スワイプ)。
 * **PC は3枚見せて1件送り**(声は6件・J-125)。名乗りは記号だけで、カードに「(架空)」を必ず添える(J-057)。
 * 配列はトップと /voice が共有する `config/site.ts` の `voices`(J-056 項目9)。ここではデータを持たない。
 */
export function VoiceCarousel({ voices, heading, extra }: { voices: readonly Voice[]; heading: React.ReactNode; extra?: React.ReactNode }) {
	return (
		<Carousel
			items={voices}
			getKey={(v) => v.who}
			heading={heading}
			extra={extra}
			perView={{ md: 2, lg: 3 }}
			render={(v) => (
				<div className="h-full rounded-hr border border-line bg-surface p-4 lg:p-6">
					<p className="text-small text-ink-weak lg:text-small-pc">
						{v.town} / {v.kind} / {v.attr}
					</p>
					<p className="mt-2 text-small text-ink lg:text-small-pc">{v.text}</p>
					{/* 実在の方と誤認されないよう、名乗りには必ず架空表記を添える(J-057・00 §7-9) */}
					<p className="mt-2 text-xs text-ink-weak lg:text-xs-pc">{v.who}(架空)</p>
				</div>
			)}
		/>
	);
}
