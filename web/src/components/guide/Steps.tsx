/**
 * 流れ(手順)の部品(03 §7 説明ページ・J-115)。番号+見出し+1行。
 * md 以上は横並びの段、〜767 は縦積み。フォームの右カラムの「進み方」(縦積み3段・J-107)とは形を分ける。
 * 色は付けない(番号の丸は薄灰・墨文字)。押せない。説明文は本文(15 / 16px・03 §7 の文字の用途・J-119)。
 */
export interface Step {
	title: string;
	text: string;
}

export function Steps({ steps, label }: { steps: readonly Step[]; label: string }) {
	const cols = steps.length >= 6 ? 'md:grid-cols-3 lg:grid-cols-6' : steps.length === 5 ? 'md:grid-cols-5' : 'md:grid-cols-3';
	return (
		<ol aria-label={label} className={`grid gap-4 ${cols} md:gap-3 lg:gap-4`}>
			{steps.map((s, i) => (
				<li key={s.title} className="flex gap-3 md:block">
					<span className="tabular flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-alt text-small font-bold text-sumi">{i + 1}</span>
					<span className="md:mt-2 md:block">
						<span className="block text-body font-bold text-sumi lg:text-body-pc">{s.title}</span>
						<span className="mt-1 block text-body text-ink lg:text-body-pc">{s.text}</span>
					</span>
				</li>
			))}
		</ol>
	);
}
