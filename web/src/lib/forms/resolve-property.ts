import 'server-only';
/**
 * 対象物件を ID から読み直す(I/O・J-105 で共通化)。クライアントの表示を信用せず、Action がこれで再解決する(J-102 e)。
 *  - 形が違う・一覧に無い → null(物件なし)
 *  - 成約済み → null + sold: true(呼び出し側で扱いを決める。/viewing は /contact へ、/contact は物件なしとして受ける)
 */
import { mainPrice } from '@/lib/format';
import { getProperties } from '@/lib/properties';
import { isPropertyNo } from '@/lib/viewing';

/** 画面・メールに出す最小の項目 */
export interface ResolvedProperty {
	no: string;
	title: string;
	priceLabel: string;
	thumb: string | null;
	type: 'rental' | 'sale';
}

export async function resolveProperty(no: string): Promise<{ property: ResolvedProperty | null; sold: boolean }> {
	if (!isPropertyNo(no)) return { property: null, sold: false };
	const p = (await getProperties()).find((x) => x.no === no);
	if (!p) return { property: null, sold: false };
	if (p.status === 'sold') return { property: null, sold: true };
	return { property: { no: p.no, title: p.title, priceLabel: mainPrice(p), thumb: p.thumb, type: p.type }, sold: false };
}
