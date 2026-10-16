import { describe, expect, it } from 'vitest';
import type { PropertySummary } from '@/types/property';
import { newsRelatedHref, newsRelatedProperties, relatedNews } from '@/lib/news';

/** 最小のダミー。web/data は読まない */
const mk = (no: string, over: Partial<PropertySummary> = {}): PropertySummary => ({
	no,
	slug: no.toLowerCase(),
	type: 'rental',
	kind: 'mansion',
	status: 'open',
	title: no,
	area: 'aoto',
	stations: [{ slug: 'aoto', walk: 5 }],
	lines: ['keisei-main'],
	features: [],
	collections: [],
	layout: '1K',
	areaSqm: 25,
	builtYm: '2015-04',
	lat: 0,
	lng: 0,
	thumb: null,
	publishedOn: '2026-09-01',
	photoCount: 3,
	hasFloorplan: true,
	floor: null,
	rent: 80000,
	...over,
});

describe('news.ts newsRelatedProperties', () => {
	it('01 §17-2 条件が無い記事は、関係する物件を出さない', () => {
		expect(newsRelatedProperties([mk('A')], undefined)).toEqual([]);
	});

	it('01 §17-2 種別が違う物件は出さない', () => {
		const out = newsRelatedProperties([mk('A'), mk('B', { type: 'sale' })], { type: 'rental' });
		expect(out.map((p) => p.no)).toEqual(['A']);
	});

	it('01 §17-2 駅の条件があれば、その駅を最寄り駅のどれかに持つ物件だけ(2駅目でもよい)', () => {
		const out = newsRelatedProperties(
			[
				mk('A', { stations: [{ slug: 'aoto', walk: 3 }] }),
				mk('B', { stations: [{ slug: 'keisei-tateishi', walk: 4 }, { slug: 'aoto', walk: 12 }] }),
				mk('C', { stations: [{ slug: 'oshiage', walk: 5 }] }),
			],
			{ type: 'rental', station: 'aoto' },
		);
		expect(out.map((p) => p.no)).toEqual(['A', 'B']);
	});

	it('J-038 成約済みは出さない(商談中は出す)', () => {
		const out = newsRelatedProperties([mk('A', { status: 'sold' }), mk('B', { status: 'negotiating' })], { type: 'rental' });
		expect(out.map((p) => p.no)).toEqual(['B']);
	});

	it('01 §17-2 新着順(公開日が同じなら物件番号順)で、最大4件', () => {
		const all = [
			mk('E', { publishedOn: '2026-09-01' }),
			mk('D', { publishedOn: '2026-09-05' }),
			mk('C', { publishedOn: '2026-09-03' }),
			mk('B', { publishedOn: '2026-09-03' }),
			mk('A', { publishedOn: '2026-08-01' }),
		];
		expect(newsRelatedProperties(all, { type: 'rental' }).map((p) => p.no)).toEqual(['D', 'B', 'C', 'E']);
	});
});

describe('news.ts newsRelatedHref', () => {
	it('J-051 賃貸は type を付けず、駅を station で渡す', () => {
		expect(newsRelatedHref({ type: 'rental', station: 'aoto' })).toBe('/properties?station=aoto');
	});

	it('J-051 売買は type=sale を付ける・駅が無ければ種別だけ', () => {
		expect(newsRelatedHref({ type: 'sale' })).toBe('/properties?type=sale');
	});

	it('01 §17-2 条件が無ければ null', () => {
		expect(newsRelatedHref(undefined)).toBeNull();
	});
});

describe('news.ts relatedNews', () => {
	const n = (slug: string, date: string, category: string) => ({ slug, date, category });

	it('01 §17-2 自分は出さない', () => {
		const out = relatedNews([n('a', '2026-09-01', 'x'), n('b', '2026-09-02', 'x')], n('a', '2026-09-01', 'x'));
		expect(out.map((x) => x.slug)).toEqual(['b']);
	});

	it('01 §17-2 同じカテゴリーを先に、それぞれ新しい順', () => {
		const all = [n('self', '2026-09-10', 'tips'), n('o1', '2026-09-09', 'info'), n('t1', '2026-08-01', 'tips'), n('t2', '2026-09-01', 'tips')];
		expect(relatedNews(all, all[0], 3).map((x) => x.slug)).toEqual(['t2', 't1', 'o1']);
	});

	it('01 §17-2 最大2件(既定)・記事が自分だけなら空', () => {
		const all = [n('a', '2026-09-01', 'x'), n('b', '2026-09-02', 'y'), n('c', '2026-09-03', 'z'), n('d', '2026-09-04', 'w')];
		expect(relatedNews(all, all[0])).toHaveLength(2);
		expect(relatedNews([all[0]], all[0])).toEqual([]);
	});
});
