/**
 * 検索・絞り込みの純関数(rules/search.md)。これは初案。
 * URL クエリ ⇄ SearchQuery ⇄ 絞り込み結果。副作用なし。Client でも Server でも動く。
 *
 * クエリ名(URL):type / area / station / line / kind / rent_min / rent_max / price_min / price_max
 *               / layout / walk_max / built_max / sqm_min / feature / sort / page
 * 複数値はカンマ区切り。既定値と一致する項目は URL に載せない。
 */
import type { PropertySummary, PropertyType } from '@/types/property';

export type SortKey = 'new' | 'price_asc' | 'price_desc' | 'sqm_desc';

export interface SearchQuery {
	type: PropertyType;
	area: string[];
	station: string[];
	line: string[];
	kind: string[];
	rentMin?: number;
	rentMax?: number;
	priceMin?: number;
	priceMax?: number;
	layout: string[];
	walkMax?: number;
	builtMaxYears?: number;
	sqmMin?: number;
	feature: string[];
	sort: SortKey;
	page: number;
}

export const PAGE_SIZE = 20;

export const SORT_OPTIONS: { key: SortKey; label: (type: PropertyType) => string }[] = [
	{ key: 'new', label: () => '新着順' },
	{ key: 'price_asc', label: (t) => (t === 'rental' ? '家賃が安い順' : '価格が安い順') },
	{ key: 'price_desc', label: (t) => (t === 'rental' ? '家賃が高い順' : '価格が高い順') },
	{ key: 'sqm_desc', label: () => '広い順' },
];

/** 間取り(02 §3 の select と同じ順) */
export const LAYOUTS = ['1R', '1K', '1DK', '1LDK', '2K', '2DK', '2LDK', '3DK', '3LDK', '4LDK'] as const;

/** 家賃の刻み(円)。02 §6 の分布 5.5〜22万に合わせる */
export const RENT_STEPS = [50000, 60000, 70000, 80000, 90000, 100000, 120000, 150000, 200000] as const;
/** 価格の刻み(万円) */
export const PRICE_STEPS = [2000, 3000, 4000, 5000, 6000, 8000] as const;
export const WALK_STEPS = [5, 10, 15, 20] as const;
/** 築年数の刻み。1年以内は詳細の「新築」ポイントタグの遷移先(J-040) */
export const BUILT_STEPS = [1, 5, 10, 15, 20, 30] as const;
export const SQM_STEPS = [20, 30, 40, 50, 60, 80] as const;

const DEFAULT: SearchQuery = {
	type: 'rental',
	area: [],
	station: [],
	line: [],
	kind: [],
	layout: [],
	feature: [],
	sort: 'new',
	page: 1,
};

export function emptyQuery(type: PropertyType = 'rental'): SearchQuery {
	return { ...DEFAULT, type };
}

const list = (v: string | null) => (v ? v.split(',').filter(Boolean) : []);
const num = (v: string | null) => {
	if (v == null || v === '') return undefined;
	const n = Number(v);
	return Number.isFinite(n) && n > 0 ? n : undefined;
};

export function parseQuery(sp: URLSearchParams): SearchQuery {
	const type: PropertyType = sp.get('type') === 'sale' ? 'sale' : 'rental';
	const sortRaw = sp.get('sort');
	const sort: SortKey = SORT_OPTIONS.some((o) => o.key === sortRaw) ? (sortRaw as SortKey) : 'new';
	const page = Math.max(1, Math.floor(num(sp.get('page')) ?? 1));
	return {
		type,
		area: list(sp.get('area')),
		station: list(sp.get('station')),
		line: list(sp.get('line')),
		kind: list(sp.get('kind')),
		rentMin: num(sp.get('rent_min')),
		rentMax: num(sp.get('rent_max')),
		priceMin: num(sp.get('price_min')),
		priceMax: num(sp.get('price_max')),
		layout: list(sp.get('layout')),
		walkMax: num(sp.get('walk_max')),
		builtMaxYears: num(sp.get('built_max')),
		sqmMin: num(sp.get('sqm_min')),
		feature: list(sp.get('feature')),
		sort,
		page,
	};
}

/** 既定値と同じ項目は落として短い URL にする */
export function toSearchParams(q: SearchQuery): URLSearchParams {
	const sp = new URLSearchParams();
	if (q.type !== 'rental') sp.set('type', q.type);
	const setList = (k: string, v: string[]) => v.length && sp.set(k, v.join(','));
	const setNum = (k: string, v?: number) => v != null && sp.set(k, String(v));
	setList('area', q.area);
	setList('station', q.station);
	setList('line', q.line);
	setList('kind', q.kind);
	setNum('rent_min', q.rentMin);
	setNum('rent_max', q.rentMax);
	setNum('price_min', q.priceMin);
	setNum('price_max', q.priceMax);
	setList('layout', q.layout);
	setNum('walk_max', q.walkMax);
	setNum('built_max', q.builtMaxYears);
	setNum('sqm_min', q.sqmMin);
	setList('feature', q.feature);
	if (q.sort !== 'new') sp.set('sort', q.sort);
	if (q.page > 1) sp.set('page', String(q.page));
	return sp;
}

export function builtYears(builtYm: string, now: Date): number | null {
	const m = /^(\d{4})-(\d{2})$/.exec(builtYm);
	if (!m) return null;
	const years = now.getFullYear() - Number(m[1]) - (now.getMonth() + 1 < Number(m[2]) ? 1 : 0);
	return Math.max(0, years);
}

/** 条件で絞る(並び替え・ページ送りは含まない) */
export function applyQuery(all: PropertySummary[], q: SearchQuery, now: Date = new Date()): PropertySummary[] {
	return all.filter((p) => {
		if (p.type !== q.type) return false;
		if (q.area.length && !q.area.includes(p.area)) return false;
		if (q.station.length && !p.stations.some((s) => q.station.includes(s.slug))) return false;
		if (q.line.length && !p.lines.some((l) => q.line.includes(l))) return false;
		if (q.kind.length && !q.kind.includes(p.kind)) return false;
		if (q.type === 'rental') {
			if (q.rentMin != null && (p.rent ?? 0) < q.rentMin) return false;
			if (q.rentMax != null && (p.rent ?? Infinity) > q.rentMax) return false;
		} else {
			if (q.priceMin != null && (p.price ?? 0) < q.priceMin) return false;
			if (q.priceMax != null && (p.price ?? Infinity) > q.priceMax) return false;
		}
		if (q.layout.length && !q.layout.includes(p.layout)) return false;
		if (q.walkMax != null && (p.stations[0]?.walk ?? Infinity) > q.walkMax) return false;
		if (q.builtMaxYears != null) {
			const y = builtYears(p.builtYm, now);
			if (y == null || y > q.builtMaxYears) return false;
		}
		if (q.sqmMin != null && (p.areaSqm ?? 0) < q.sqmMin) return false;
		if (q.feature.length && !q.feature.every((f) => p.features.includes(f))) return false;
		return true;
	});
}

/** 並び替え。成約済みは常に後ろ(初案) */
export function sortProperties(items: PropertySummary[], sort: SortKey): PropertySummary[] {
	const price = (p: PropertySummary) => (p.type === 'rental' ? p.rent ?? 0 : p.price ?? 0);
	const cmp: Record<SortKey, (a: PropertySummary, b: PropertySummary) => number> = {
		new: (a, b) => b.publishedOn.localeCompare(a.publishedOn) || a.no.localeCompare(b.no),
		price_asc: (a, b) => price(a) - price(b) || a.no.localeCompare(b.no),
		price_desc: (a, b) => price(b) - price(a) || a.no.localeCompare(b.no),
		sqm_desc: (a, b) => (b.areaSqm ?? 0) - (a.areaSqm ?? 0) || a.no.localeCompare(b.no),
	};
	return [...items].sort((a, b) => Number(a.status === 'sold') - Number(b.status === 'sold') || cmp[sort](a, b));
}

export function paginate<T>(items: T[], page: number, size = PAGE_SIZE) {
	const totalPages = Math.max(1, Math.ceil(items.length / size));
	const current = Math.min(page, totalPages);
	return { items: items.slice((current - 1) * size, current * size), page: current, totalPages };
}

/** 有効な条件の数(type・sort・page は除く) */
export function activeConditionCount(q: SearchQuery): number {
	return (
		q.area.length +
		q.station.length +
		q.line.length +
		q.kind.length +
		q.layout.length +
		q.feature.length +
		[q.rentMin, q.rentMax, q.priceMin, q.priceMax, q.walkMax, q.builtMaxYears, q.sqmMin].filter((v) => v != null).length
	);
}

export interface RelaxCandidate {
	label: string;
	query: SearchQuery;
	count: number;
}

/**
 * 0件時の「条件を緩める」候補(rules/search.md §4・J-033)。
 * 緩める順序(SHIN・09/08):駅徒歩 → 築年 → 面積 → 設備 → 間取り(種目)→ 家賃(価格)→ エリア(駅・沿線)
 * 1. まず条件を1つだけ外した候補を、この順で出す(件数 1 以上のもの)
 * 2. どれを1つ外しても0件なら、この順に累積して外し、初めて 1 件以上になった組み合わせを1つ出す
 */
const RELAX_STEPS: { label: string; has: (q: SearchQuery) => boolean; drop: (q: SearchQuery) => SearchQuery }[] = [
	{ label: '駅徒歩', has: (q) => q.walkMax != null, drop: (q) => ({ ...q, walkMax: undefined }) },
	{ label: '築年数', has: (q) => q.builtMaxYears != null, drop: (q) => ({ ...q, builtMaxYears: undefined }) },
	{ label: '面積', has: (q) => q.sqmMin != null, drop: (q) => ({ ...q, sqmMin: undefined }) },
	{ label: '設備', has: (q) => q.feature.length > 0, drop: (q) => ({ ...q, feature: [] }) },
	{ label: '間取り', has: (q) => q.layout.length > 0, drop: (q) => ({ ...q, layout: [] }) },
	{ label: '種目', has: (q) => q.kind.length > 0, drop: (q) => ({ ...q, kind: [] }) },
	{ label: '家賃', has: (q) => q.rentMin != null || q.rentMax != null, drop: (q) => ({ ...q, rentMin: undefined, rentMax: undefined }) },
	{ label: '価格', has: (q) => q.priceMin != null || q.priceMax != null, drop: (q) => ({ ...q, priceMin: undefined, priceMax: undefined }) },
	{ label: 'エリア', has: (q) => q.area.length > 0, drop: (q) => ({ ...q, area: [] }) },
	{ label: '駅', has: (q) => q.station.length > 0, drop: (q) => ({ ...q, station: [] }) },
	{ label: '沿線', has: (q) => q.line.length > 0, drop: (q) => ({ ...q, line: [] }) },
];

export function relaxCandidates(all: PropertySummary[], q: SearchQuery, now: Date = new Date()): RelaxCandidate[] {
	const count = (query: SearchQuery) => applyQuery(all, { ...query, page: 1 }, now).length;
	const steps = RELAX_STEPS.filter((s) => s.has(q));

	// 1. 単独で外す
	const single = steps
		.map((s) => {
			const query = { ...s.drop(q), page: 1 };
			return { label: `${s.label}の条件を外す`, query, count: count(query) };
		})
		.filter((c) => c.count > 0);
	if (single.length > 0) return single;

	// 2. 順に累積して外す
	let cur = q;
	const dropped: string[] = [];
	for (const s of steps) {
		cur = { ...s.drop(cur), page: 1 };
		dropped.push(s.label);
		const n = count(cur);
		if (n > 0) return [{ label: `${dropped.join('・')}の条件を外す`, query: cur, count: n }];
	}
	return [];
}
