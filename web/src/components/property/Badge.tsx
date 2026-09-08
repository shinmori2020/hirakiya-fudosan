import { BADGE_LABEL, type Badge as BadgeKind } from '@/lib/badges';

/** ステータスバッジ(03 §2 の4種。強調色とは別系統)。最小サイズ 11px / 12px */
const STYLE: Record<BadgeKind, string> = {
	new: 'bg-badge-new-bg text-badge-new-fg',
	discount: 'bg-badge-discount-bg text-badge-discount-fg',
	negotiating: 'bg-badge-negotiating-bg text-badge-negotiating-fg',
	sold: 'bg-badge-sold-bg text-badge-sold-fg',
};

export function Badge({ kind }: { kind: BadgeKind }) {
	return (
		<span className={`inline-block rounded-hr px-2 py-0.5 text-xs font-bold lg:text-xs-pc ${STYLE[kind]}`}>{BADGE_LABEL[kind]}</span>
	);
}
