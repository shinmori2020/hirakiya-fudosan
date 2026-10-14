/**
 * 路線図ヒーロー(route-hero.js 2.0.0)に渡すデータ。
 *
 *  - items:物件ごとの種類と駅。路線図はこれから「選んだ駅のどれかに当たる物件」を重ならずに数える(一覧の
 *    station=a,b と同じ数え方・search.ts)。成約済みも一覧に出るので含める(一覧の件数と同じ・J-033)
 *  - checkStations:路線図の駅と、サイトの駅(タクソノミー station・02 §8 の13駅)が同じかを確かめる。
 *    ずれていたらビルドを止める(駅の id は一覧の絞り込みにそのまま渡すため)
 *
 * 路線図のデータは web/data/route-map/schematic.json(_kits/route-hero-kit/data/schematic.json をそのまま置いた)。
 */
import type { PropertySummary, PropertyType } from '@/types/property';

export interface RouteItem {
	type: PropertyType;
	stations: string[];
}

/** schematic.json のうち、サイトが読む所だけの型(他の項目は route-hero.js がそのまま読む) */
export interface RouteMapData {
	stations: { id: string; name: string }[];
	lines: { id: string; name: string; path: (string | [number, number])[] }[];
	types?: { id: string; label: string }[];
	[key: string]: unknown;
}

/** block-layout.json(FV の block-map の路線図だけの駅の位置・J-173)。他の項目は block-map.js がそのまま読む */
export interface RouteLayout {
	stations: Record<string, [number, number]>;
	lines: Record<string, (string | [number, number])[]>;
	[key: string]: unknown;
}

/**
 * 駅ごと・種類ごとの件数(FV の路線図の駅名の札に出す数・J-173)。路線図ヒーローに渡すのと同じ items から数える。
 * 1物件が2駅に属していれば、その2駅それぞれに1件ずつ数える(駅の丸の数字と同じ。一覧の station=駅 の件数と同じ)
 */
export function stationCounts(items: readonly RouteItem[], types: readonly { id: string }[]): Record<string, Record<string, number>> {
	const counts: Record<string, Record<string, number>> = {};
	for (const t of types) counts[t.id] = {};
	for (const it of items) {
		const byType = counts[it.type];
		if (!byType) continue;
		for (const id of new Set(it.stations)) byType[id] = (byType[id] ?? 0) + 1;
	}
	return counts;
}

/**
 * block-layout.json が、路線図ヒーローの schematic.json と合っているかを確かめる(J-173・SHIN の条件)。問題の一覧を返す(空なら問題なし)。
 *  - 駅の id が同じか(片方にだけある駅)
 *  - 路線の id が同じか(片方にだけある路線)
 *  - **路線ごとの駅の並び順が同じか**(通り道の [x, y] の通過点は除いて比べる)
 */
export function checkLayout(layout: RouteLayout, map: RouteMapData): string[] {
	const problems: string[] = [];
	const mapStations = new Set(map.stations.map((s) => s.id));
	const layoutStations = new Set(Object.keys(layout.stations));
	for (const id of layoutStations) if (!mapStations.has(id)) problems.push(`block-layout の駅 ${id} が schematic に無い`);
	for (const id of mapStations) if (!layoutStations.has(id)) problems.push(`schematic の駅 ${id} が block-layout に無い`);
	const mapLines = new Map(map.lines.map((l) => [l.id, l.path]));
	for (const id of Object.keys(layout.lines)) if (!mapLines.has(id)) problems.push(`block-layout の路線 ${id} が schematic に無い`);
	for (const [id, path] of mapLines) {
		const lp = layout.lines[id];
		if (!lp) {
			problems.push(`schematic の路線 ${id} が block-layout に無い`);
			continue;
		}
		const a = path.filter((p): p is string => typeof p === 'string');
		const b = lp.filter((p): p is string => typeof p === 'string');
		if (a.join('>') !== b.join('>')) problems.push(`路線 ${id} の駅の並びが違う:schematic ${a.join('>')} / block-layout ${b.join('>')}`);
	}
	return problems;
}

/** 物件の一覧から items を作る。成約済みも含める */
export function routeItems(all: readonly PropertySummary[]): RouteItem[] {
	return all.map((p) => ({ type: p.type, stations: p.stations.map((s) => s.slug) }));
}

/**
 * 路線図の駅とサイトの駅が同じかを確かめる。問題の一覧を返す(空なら問題なし)。
 *  - 路線図にあってサイトに無い駅(出してよい地名の外)
 *  - サイトにあって路線図に無い駅
 *  - 駅名の違い
 *  - 路線の通り道に書いた駅の id が、路線図の駅に無い
 */
export function checkStations(map: RouteMapData, siteStations: readonly { slug: string; name: string }[]): string[] {
	const problems: string[] = [];
	const site = new Map(siteStations.map((s) => [s.slug, s.name]));
	const drawn = new Map(map.stations.map((s) => [s.id, s.name]));
	for (const [id, name] of drawn) {
		if (!site.has(id)) problems.push(`路線図の駅 ${id}(${name})がサイトの駅に無い`);
		else if (site.get(id) !== name) problems.push(`駅名が違う:${id} 路線図「${name}」/ サイト「${site.get(id)}」`);
	}
	for (const [slug, name] of site) {
		if (!drawn.has(slug)) problems.push(`サイトの駅 ${slug}(${name})が路線図に無い`);
	}
	for (const line of map.lines) {
		for (const p of line.path) {
			if (typeof p === 'string' && !drawn.has(p)) problems.push(`路線 ${line.id} の通り道の ${p} が路線図の駅に無い`);
		}
	}
	return problems;
}
