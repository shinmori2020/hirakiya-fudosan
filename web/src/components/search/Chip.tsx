'use client';

/**
 * チップ(トグルボタン)。03 §6:角丸 6px・高さ 40(スマホ)/ 32(PC)・13px・内側余白 8(J-034・J-035)。
 * 選択中は青緑の塗り+白文字、未選択は灰線の枠+墨文字。hover(PC)/ active(スマホ)で枠・文字が青緑、背景は淡い青緑 #E0F2F1。
 * 背景・枠・文字色を 150ms・cubic-bezier(0.4,0,0.2,1) で遷移。駅フィルター(FilterPanel)とクイック条件タブ(QuickTabs・J-042)で共用。
 */
export function Chip({ label, pressed, onClick }: { label: string; pressed: boolean; onClick: () => void }) {
	return (
		<button
			type="button"
			aria-pressed={pressed}
			onClick={onClick}
			data-chip
			className={`h-10 cursor-pointer rounded-hr border px-2 text-small whitespace-nowrap transition-[background-color,border-color,color] duration-150 motion-reduce:transition-none lg:h-8 ${
				pressed
					? 'border-accent bg-accent font-bold text-white'
					: 'border-line bg-surface text-ink hover:border-accent hover:bg-badge-new-bg hover:text-accent-strong active:border-accent active:bg-badge-new-bg active:text-accent-strong'
			}`}
		>
			{label}
		</button>
	);
}
