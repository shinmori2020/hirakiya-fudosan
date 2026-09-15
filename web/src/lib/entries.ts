/**
 * 探し方の入口(エリア / 沿線・駅 / 特集)の件数集計(実装順 4・J-095)。純関数。
 *
 * 入口ページは「町ごとに賃貸○件 / 売買○件」を並べ、押すと条件固定の一覧(/area/[slug] など)へ飛ぶ。
 * 件数は**一覧ページの件数表示と同じ数え方**にする(成約済みも含む・J-033 で一覧は成約済みを末尾に出すと決めた)。
 * 入口で「5件」と見て押した先が「4件」になると数字が信用されなくなるため。
 * 0件の町・駅もそのまま 0 を返す(入口では「0件」と出してリンクを残す・J-095 判断6)。
 */
import type { PropertySummary, PropertyType } from '@/types/property';

export type EntryKey = 'area' | 'station' | 'line' | 'collection';

/** ある値(slug)を持つ物件の数。種別で分ける */
export function countBy(all: PropertySummary[], type: PropertyType, key: EntryKey, slug: string): number {
	return all.filter((p) => p.type === type && has(p, key, slug)).length;
}

function has(p: PropertySummary, key: EntryKey, slug: string): boolean {
	switch (key) {
		case 'area':
			return p.area === slug;
		case 'station':
			return p.stations.some((s) => s.slug === slug);
		case 'line':
			return p.lines.includes(slug);
		case 'collection':
			return p.collections.includes(slug);
	}
}

export interface EntryCount {
	slug: string;
	name: string;
	rental: number;
	sale: number;
}

/** slug と表示名の一覧に、賃貸・売買の件数を付ける。並びは渡した順を保つ */
export function entryCounts(all: PropertySummary[], key: EntryKey, terms: { slug: string; name: string }[]): EntryCount[] {
	return terms.map((t) => ({
		slug: t.slug,
		name: t.name,
		rental: countBy(all, 'rental', key, t.slug),
		sale: countBy(all, 'sale', key, t.slug),
	}));
}

/**
 * 区ごとの町(入口ページの見出しの単位)。config/site.ts の serviceAreas は町名しか持たないので、
 * タクソノミー(slug・name・parent)と突き合わせて slug を引く。一覧に無い町名は落とす(13町の外に出ない)。
 */
export function townsByWard(
	wards: readonly { ward: string; towns: readonly string[] }[],
	areaTerms: { slug: string; name: string; parent: string | null }[],
): { ward: string; towns: { slug: string; name: string }[] }[] {
	return wards.map((w) => ({
		ward: w.ward,
		towns: w.towns
			.map((name) => areaTerms.find((t) => t.name === name && t.parent))
			.filter((t): t is { slug: string; name: string; parent: string | null } => !!t)
			.map((t) => ({ slug: t.slug, name: t.name })),
	}));
}

/**
 * 沿線ごとの駅(入口ページ用)。駅は複数の沿線に属しうる(青砥 = 京成本線 + 京成押上線)ので、
 * **入口ではそれぞれの沿線の下に出す**(左カラムの「最初の沿線にだけ置く」J-034 とは目的が違う:
 * 左カラムは選択の重複を避けるため、入口は「この沿線にはこの駅がある」を示すため)。
 * 駅の並びはタクソノミーの順(名前順)ではなく、渡した stationOrder があればそれに従う。
 */
export function stationsByLine(
	lines: readonly { slug: string; name: string }[],
	stationTerms: { slug: string; name: string; meta: Record<string, string | number> }[],
): { line: { slug: string; name: string }; stations: { slug: string; name: string }[] }[] {
	return lines.map((line) => ({
		line,
		stations: stationTerms
			.filter((t) =>
				String(t.meta.lines ?? '')
					.split(',')
					.includes(line.slug),
			)
			.map((t) => ({ slug: t.slug, name: t.name })),
	}));
}
