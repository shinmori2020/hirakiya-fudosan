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
	[key: string]: unknown;
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
