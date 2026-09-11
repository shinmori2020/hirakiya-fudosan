/**
 * 属性から一覧への回遊リンク(J-051)。URL の作り方は J-040 のポイントタグと同じ:
 * lib/search.ts のクエリ名(type / kind / station / line / layout / area / feature …)をそのまま使い、
 * 複数値はカンマ区切り(エリア・駅・沿線・種目・間取りは OR、設備は AND。J-041)。
 * 売買の物件からのリンクだけ type=sale を付ける(既定は賃貸なので付けない)。
 * リンクにするのは一覧の左カラム(J-034)に絞り込みがある項目だけ。向き・入居可能日・階・面積・築年・金額はリンクにしない。
 */
import type { PropertyType } from '@/types/property';

export type ListParam = string | number | string[];

/** 一覧への URL を作る。空の値は載せない */
export function listHref(type: PropertyType, params: Record<string, ListParam>): string {
	const sp = new URLSearchParams();
	if (type === 'sale') sp.set('type', 'sale');
	for (const [k, v] of Object.entries(params)) {
		const s = Array.isArray(v) ? v.filter(Boolean).join(',') : String(v);
		if (s !== '') sp.set(k, s);
	}
	return `/properties?${sp.toString()}`;
}

/** 種目(マンション / アパート / 戸建 …)。J-050 の 4 */
export const kindHref = (type: PropertyType, slug: string) => listHref(type, { kind: slug });
/** 駅 */
export const stationHref = (type: PropertyType, slug: string) => listHref(type, { station: slug });
/** 沿線 */
export const lineHref = (type: PropertyType, slug: string) => listHref(type, { line: slug });
/** 間取り(1LDK など。一覧の間取りは値そのもの) */
export const layoutHref = (type: PropertyType, layout: string) => listHref(type, { layout });
/** 設備。1つずつ個別に(一覧の設備は AND なので1つだけ渡す) */
export const featureHref = (type: PropertyType, slug: string) => listHref(type, { feature: slug });
/** 町(エリアの絞り込みは町単位) */
export const townHref = (type: PropertyType, townSlug: string) => listHref(type, { area: townSlug });
/** 区。一覧に区の絞り込みは無いので、その区の町をすべて OR で並べる */
export const wardHref = (type: PropertyType, townSlugs: string[]) => listHref(type, { area: townSlugs });

export type AddressPart = { text: string; link: 'ward' | 'town' | null };

/**
 * 住所を「区」「町」「それ以外」に分ける(所在地のリンク用)。
 * 例:東京都墨田区曳舟0-0-0 + 墨田区 + 曳舟 → 東京都 / 墨田区(区)/ 曳舟(町)/ 0-0-0
 * 町名は区より後ろから探す(「葛飾区青戸」のように区名と町名が続くため)。見つからない名前は飛ばす。
 */
export function addressParts(address: string, wardName: string, townName: string): AddressPart[] {
	const marks: { start: number; end: number; link: 'ward' | 'town' }[] = [];
	const wardAt = wardName ? address.indexOf(wardName) : -1;
	if (wardAt >= 0) marks.push({ start: wardAt, end: wardAt + wardName.length, link: 'ward' });
	const from = wardAt >= 0 ? wardAt + wardName.length : 0;
	const townAt = townName ? address.indexOf(townName, from) : -1;
	if (townAt >= 0) marks.push({ start: townAt, end: townAt + townName.length, link: 'town' });

	const out: AddressPart[] = [];
	let cursor = 0;
	for (const m of marks) {
		if (m.start > cursor) out.push({ text: address.slice(cursor, m.start), link: null });
		out.push({ text: address.slice(m.start, m.end), link: m.link });
		cursor = m.end;
	}
	if (cursor < address.length) out.push({ text: address.slice(cursor), link: null });
	return out;
}
