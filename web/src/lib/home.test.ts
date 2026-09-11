import { describe, expect, it } from 'vitest';
import type { PropertySummary } from '@/types/property';
import { HOME_NEW_LIMIT, homeSearchHref, latestProperties } from '@/lib/home';

const base: PropertySummary = {
	no: 'HR-R-0001',
	slug: 'hr-r-0001',
	type: 'rental',
	kind: 'mansion',
	status: 'open',
	title: '曳舟テラス0-1',
	area: 'hikifune',
	stations: [{ slug: 'hikifune', walk: 8 }],
	lines: ['tobu-skytree'],
	features: [],
	collections: [],
	layout: '1LDK',
	areaSqm: 35,
	builtYm: '2008-04',
	lat: 0,
	lng: 0,
	thumb: null,
	publishedOn: '2026-09-01',
	photoCount: 3,
	hasFloorplan: true,
	floor: 5,
	rent: 82000,
};
const make = (over: Partial<PropertySummary>): PropertySummary => ({ ...base, ...over });

describe('home.ts', () => {
	it('J-056 新着は公開日の新しい順に並べる(賃貸・売買は混ぜる)', () => {
		const out = latestProperties([
			make({ no: 'HR-R-0002', publishedOn: '2026-09-01' }),
			make({ no: 'HR-S-0001', type: 'sale', publishedOn: '2026-09-05' }),
			make({ no: 'HR-R-0003', publishedOn: '2026-09-03' }),
		]);
		expect(out.map((p) => p.no)).toEqual(['HR-S-0001', 'HR-R-0003', 'HR-R-0002']);
	});

	it('J-056 成約済みは新着に出さない', () => {
		const out = latestProperties([
			make({ no: 'HR-R-0002', publishedOn: '2026-09-09', status: 'sold' }),
			make({ no: 'HR-R-0003', publishedOn: '2026-09-01' }),
		]);
		expect(out.map((p) => p.no)).toEqual(['HR-R-0003']);
	});

	it('J-056 商談中は新着に出す(成約済みだけを外す)', () => {
		const out = latestProperties([make({ no: 'HR-R-0004', status: 'negotiating' })]);
		expect(out.map((p) => p.no)).toEqual(['HR-R-0004']);
	});

	it('J-056 公開日が同じなら物件番号の昇順(ビルドのたびに並びが変わらないように)', () => {
		const out = latestProperties([make({ no: 'HR-R-0009' }), make({ no: 'HR-R-0002' }), make({ no: 'HR-R-0005' })]);
		expect(out.map((p) => p.no)).toEqual(['HR-R-0002', 'HR-R-0005', 'HR-R-0009']);
	});

	it('J-056 既定は8件。足りなければあるだけ出す', () => {
		expect(HOME_NEW_LIMIT).toBe(8);
		const many = Array.from({ length: 12 }, (_, i) => make({ no: `HR-R-00${10 + i}` }));
		expect(latestProperties(many)).toHaveLength(8);
		expect(latestProperties(many.slice(0, 3))).toHaveLength(3);
	});

	it('J-056 賃貸の検索は type を付けない。クエリ名は lib/search.ts と同じ', () => {
		expect(homeSearchHref('rental', { area: 'hikifune', station: 'oshiage', rentMax: 100000, layout: '1LDK' })).toBe(
			'/properties?area=hikifune&station=oshiage&rent_max=100000&layout=1LDK',
		);
	});

	it('J-056 売買は type=sale を付け、価格上限と種目を載せる', () => {
		expect(homeSearchHref('sale', { area: 'aoto', priceMax: 4000, kind: 'house' })).toBe('/properties?type=sale&area=aoto&price_max=4000&kind=house');
	});

	it('J-056 「指定しない」(空欄)は URL に載せない', () => {
		expect(homeSearchHref('rental', { area: '', station: '', rentMax: '', layout: '' })).toBe('/properties?');
		expect(homeSearchHref('rental', { rentMax: 90000 })).toBe('/properties?rent_max=90000');
	});

	it('J-056 エリアと駅は同時に指定できる(一覧側で AND・SHIN 確定 09/12)', () => {
		expect(homeSearchHref('rental', { area: 'aoto', station: 'aoto' })).toBe('/properties?area=aoto&station=aoto');
	});

	it('J-056 売買のフォームに駅と間取りは無いので、渡されても URL に載せない', () => {
		expect(homeSearchHref('sale', { area: 'aoto', station: 'aoto', layout: '3LDK', priceMax: 5000 })).toBe('/properties?type=sale&area=aoto&price_max=5000');
	});
});
