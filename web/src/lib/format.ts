/** 表示用の整形(純関数)。会社の値は config/site.ts、物件の値は data/ から来る */
import { formatPrice, formatRent } from '@/config/site';
import type { PropertySummary } from '@/types/property';
import { builtYears } from '@/lib/search';

/** カードの主数字。賃貸は家賃(万円)、売買は価格(万円) */
export function mainPrice(p: PropertySummary): string {
	if (p.type === 'rental') return p.rent != null ? formatRent(p.rent) : '—';
	return p.price != null ? formatPrice(p.price) : '—';
}

/** 「築12年」「新築」。土地(builtYm 空)は null */
export function builtLabel(builtYm: string, now: Date = new Date()): string | null {
	const y = builtYears(builtYm, now);
	if (y == null) return null;
	return y === 0 ? '新築' : `築${y}年`;
}

export function sqmLabel(sqm: number | null): string {
	return sqm != null ? `${sqm}㎡` : '—';
}

/** 「徒歩8分」(J-041) */
export function walkLabel(minutes: number): string {
	return `徒歩${minutes}分`;
}

/** 管理費・共益費などの月額。0 や null は「なし」、それ以外は「5,000円」(J-041) */
export function feeLabel(yen: number | null | undefined): string {
	return yen != null && yen > 0 ? `${yen.toLocaleString('ja-JP')}円` : 'なし';
}
