/**
 * 物件・タクソノミーの読み込み層。Nordic Works の wordpress.ts と同じ DATA_SOURCE 切替方式。
 *
 *  DATA_SOURCE=static … data/*.json を読む(本番ビルド・Vercel)。WP には到達しない
 *  DATA_SOURCE=api    … WORDPRESS_API_URL の REST を読む(開発時)。変換は wp-map.mjs と共通
 *
 * Server Component / generateStaticParams からだけ呼ぶ(node:fs を使う)。
 * cookies() / headers() は使わない(rules/static-rendering.md)。
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { REST_BASE, toDetail, toSummary, toTerms } from '@/lib/wp-map.mjs';
import type { ExportMeta, PropertyDetail, PropertySummary, TaxonomyName, Term } from '@/types/property';

const USE_STATIC = process.env.DATA_SOURCE === 'static';
const API_URL = process.env.WORDPRESS_API_URL ?? 'http://localhost:8080/wp-json';
const DATA_DIR = path.join(process.cwd(), 'data');

if (!USE_STATIC && typeof window === 'undefined' && !process.env.WORDPRESS_API_URL) {
	console.warn('[properties] WORDPRESS_API_URL 未設定。既定の http://localhost:8080/wp-json を使います(DATA_SOURCE=static なら無視)');
}

async function readJson<T>(rel: string): Promise<T | null> {
	try {
		return JSON.parse(await fs.readFile(path.join(DATA_DIR, rel), 'utf8')) as T;
	} catch {
		return null;
	}
}

async function wpFetch<T>(resource: string): Promise<T | null> {
	try {
		// 開発時のみ。本番は static なので到達しない。キャッシュは明示(Next.js の既定は no-store)
		const res = await fetch(`${API_URL}/wp/v2/${resource}`, { cache: 'force-cache' });
		if (!res.ok) {
			console.error(`[wp] ${resource} -> ${res.status}`);
			return null;
		}
		return (await res.json()) as T;
	} catch (err) {
		console.error(`[wp] ${resource} fetch error:`, err);
		return null;
	}
}
async function wpFetchAll(resource: string): Promise<unknown[]> {
	const all: unknown[] = [];
	for (let page = 1; ; page++) {
		const data = await wpFetch<unknown[]>(`${resource}?per_page=100&page=${page}`);
		if (!data || data.length === 0) break;
		all.push(...data);
		if (data.length < 100) break;
	}
	return all;
}
const mapOpts = { uploadsPrefix: new URL(API_URL).origin };

/** 全件の一覧用サブセット */
export async function getProperties(): Promise<PropertySummary[]> {
	if (USE_STATIC) return (await readJson<PropertySummary[]>('properties/index.json')) ?? [];
	return (await wpFetchAll('properties')).map((p) => toSummary(p, mapOpts));
}

/** 物件番号(HR-R-0001)で1件 */
export async function getProperty(no: string): Promise<PropertyDetail | null> {
	if (USE_STATIC) return readJson<PropertyDetail>(`properties/${no}.json`);
	const data = await wpFetch<unknown[]>(`properties?slug=${no.toLowerCase()}`);
	return data && data[0] ? toDetail(data[0], mapOpts) : null;
}

/** タクソノミーの用語一覧 */
export async function getTerms(tax: TaxonomyName): Promise<Term[]> {
	if (USE_STATIC) return (await readJson<Term[]>(`taxonomies/${tax}.json`)) ?? [];
	return toTerms(await wpFetchAll(REST_BASE[tax]));
}

/** export の情報(static のみ。api 時は null) */
export async function getExportMeta(): Promise<ExportMeta | null> {
	return USE_STATIC ? readJson<ExportMeta>('meta.json') : null;
}

// ---- よく使う絞り込み(純粋な配列操作。検索の本体は lib/search.ts に置く) ----

export function byType(list: PropertySummary[], type: PropertySummary['type']) {
	return list.filter((p) => p.type === type);
}
export function byArea(list: PropertySummary[], area: string) {
	return list.filter((p) => p.area === area);
}
export function byLine(list: PropertySummary[], line: string) {
	return list.filter((p) => p.lines.includes(line));
}
export function byStation(list: PropertySummary[], station: string) {
	return list.filter((p) => p.stations.some((s) => s.slug === station));
}
export function byCollection(list: PropertySummary[], collection: string) {
	return list.filter((p) => p.collections.includes(collection));
}
/** 掲載中(成約済みを除く) */
export function onlyListed(list: PropertySummary[]) {
	return list.filter((p) => p.status !== 'sold');
}
