import { describe, expect, it } from 'vitest';
import type { PropertyDetail } from '@/types/property';
import { availabilityFor, breadcrumbList, placeType, realEstateListing } from '@/lib/schema';

/** 最小のダミー(web/data は読まない・J-041)。値は架空表記のまま(番地 0-0-0) */
const mk = (over: Partial<PropertyDetail> = {}): PropertyDetail =>
	({
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
		lat: 35.7182,
		lng: 139.8153,
		thumb: null,
		publishedOn: '2026-09-01',
		photoCount: 5,
		hasFloorplan: true,
		floor: 5,
		address: '東京都墨田区曳舟0-0-0',
		staff: '仮名 美咲',
		walkMinutes: 8,
		walkMinutes2: 18,
		floorsTotal: 14,
		structure: 'RC',
		direction: '北',
		parking: '近隣',
		transactionType: '媒介',
		updatedOn: '2026-09-05',
		nextUpdateOn: '2026-09-19',
		comment: '墨田区曳舟、最寄りは曳舟駅で徒歩8分です。',
		images: [],
		floorplan: null,
		rent: 82000,
		rental: {
			maintenanceFee: 0,
			depositMonths: 2,
			keyMoneyMonths: 1,
			brokerageFee: '家賃1ヶ月',
			contractTerm: '2年',
			renewalFee: 'なし',
			guarantorRequired: true,
			availableFrom: '2026-10-29',
		},
		...over,
	}) as PropertyDetail;

const ctx = { url: 'https://example.test/properties/HR-R-0001', wardName: '墨田区', stationName: '曳舟' };

describe('schema.ts', () => {
	it('J-083 賃貸は UnitPriceSpecification で月額を示す(貸し出し + 1ヶ月あたり。管理費は合算しない)', () => {
		const offers = realEstateListing(mk(), ctx).offers as Record<string, never>;
		expect(offers['@type']).toBe('Offer');
		expect(offers.businessFunction).toBe('http://purl.org/goodrelations/v1#LeaseOut');
		expect(offers.priceSpecification).toMatchObject({
			'@type': 'UnitPriceSpecification',
			price: 82000,
			priceCurrency: 'JPY',
			unitCode: 'MON',
		});
		// 入居時の目安合計(J-081)や管理費を混ぜない
		expect(offers.price).toBeUndefined();
	});

	it('J-083 売買は price に円で入れる(JSON は万円なので 10,000 倍。businessFunction は既定)', () => {
		const sale = mk({
			no: 'HR-S-0003',
			type: 'sale',
			rent: undefined,
			rental: undefined,
			price: 3070,
			sale: { landSqm: null, buildingSqm: null, mgmtFee: 11000, repairFund: 9000, landRights: '所有権', zoning: '第一種住居', bcr: 60, far: 200, roadAccess: '', handover: '相談' },
		});
		const offers = realEstateListing(sale, ctx).offers as Record<string, never>;
		expect(offers.price).toBe(30700000);
		expect(offers.priceCurrency).toBe('JPY');
		expect(offers.businessFunction).toBeUndefined();
		expect(offers.priceSpecification).toBeUndefined();
	});

	it('J-083 戸建は SingleFamilyResidence。土地面積は lotSize に入る', () => {
		const house = mk({
			no: 'HR-S-0009',
			type: 'sale',
			kind: 'house',
			rent: undefined,
			rental: undefined,
			price: 4980,
			areaSqm: 94,
			sale: { landSqm: 62, buildingSqm: 94, mgmtFee: null, repairFund: null, landRights: '所有権', zoning: '準工業', bcr: 60, far: 400, roadAccess: '南 4.5m 公道', handover: '相談' },
		});
		const about = realEstateListing(house, ctx).about as Record<string, never>;
		expect(about['@type']).toBe('SingleFamilyResidence');
		expect(about.lotSize).toMatchObject({ value: 62, unitCode: 'MTK' });
		expect(about.floorSize).toMatchObject({ value: 94, unitCode: 'MTK' });
	});

	it('J-083 土地は建物の型が無いので Place。築年・階数は入れない', () => {
		const land = mk({
			no: 'HR-S-0017',
			type: 'sale',
			kind: 'land',
			rent: undefined,
			rental: undefined,
			price: 3200,
			layout: '',
			areaSqm: null,
			builtYm: '',
			floor: null,
			floorsTotal: null,
			sale: { landSqm: 97, buildingSqm: null, mgmtFee: null, repairFund: null, landRights: '所有権', zoning: '第二種住居', bcr: 60, far: 400, roadAccess: '南 4.0m 私道', handover: '即時' },
		});
		const ld = realEstateListing(land, ctx);
		const about = ld.about as Record<string, never>;
		expect(placeType('land')).toBe('Place');
		expect(about['@type']).toBe('Place');
		expect(about.yearBuilt).toBeUndefined();
		expect(about.floorLevel).toBeUndefined();
		expect(about.lotSize).toMatchObject({ value: 97 });
		// 間取りが無い物件は additionalProperty に間取りを入れない
		expect(JSON.stringify(ld.additionalProperty)).not.toContain('間取り');
	});

	it('J-083 掲載状態は availability で示す(成約済みもページを残すので出す)', () => {
		expect(availabilityFor('open')).toBe('https://schema.org/InStock');
		expect(availabilityFor('negotiating')).toBe('https://schema.org/LimitedAvailability');
		expect(availabilityFor('sold')).toBe('https://schema.org/SoldOut');
		const sold = realEstateListing(mk({ no: 'HR-R-0025', status: 'sold' }), ctx).offers as Record<string, never>;
		expect(sold.availability).toBe('https://schema.org/SoldOut');
	});

	it('J-083 住所は番地 0-0-0 のまま出し、都道府県・区・以降に分ける(架空表記・制作計画 §7-9)', () => {
		const about = realEstateListing(mk(), ctx).about as Record<string, never>;
		expect(about.address).toMatchObject({
			'@type': 'PostalAddress',
			addressRegion: '東京都',
			addressLocality: '墨田区',
			streetAddress: '曳舟0-0-0',
			addressCountry: 'JP',
		});
		expect(about.geo).toMatchObject({ latitude: 35.7182, longitude: 139.8153 });
	});

	it('J-083 → J-085 パンくずは画面の4階層と同じ(トップ → 種別の一覧 → エリア → 物件名)', () => {
		const crumb = { siteUrl: 'https://example.test', url: ctx.url, areaName: '墨田区曳舟', areaHref: '/properties?area=hikifune' };
		const b = breadcrumbList(mk(), crumb);
		const items = b.itemListElement as { position: number; name: string; item: string }[];
		expect(items.map((i) => i.position)).toEqual([1, 2, 3, 4]);
		expect(items.map((i) => i.name)).toEqual(['トップ', '賃貸物件を探す', '墨田区曳舟', '曳舟テラス0-1']);
		expect(items[1].item).toBe('https://example.test/properties');
		expect(items[2].item).toBe('https://example.test/properties?area=hikifune');
	});

	it('J-085 売買はエリアも種別つきの一覧へ飛ばす(飛び先は J-051 の townHref と同じ URL)', () => {
		const sale = breadcrumbList(mk({ type: 'sale' }), {
			siteUrl: 'https://example.test',
			url: ctx.url,
			areaName: '墨田区押上',
			areaHref: '/properties?type=sale&area=oshiage',
		});
		const items = sale.itemListElement as { name: string; item: string }[];
		expect(items[1]).toMatchObject({ name: '売買物件を探す', item: 'https://example.test/properties?type=sale' });
		expect(items[2]).toMatchObject({ name: '墨田区押上', item: 'https://example.test/properties?type=sale&area=oshiage' });
	});

	it('J-102 → J-105 potentialAction は内見予約の入口。飛び先は画面の CTA と同じ /viewing?property=ID', () => {
		const pa = realEstateListing(mk(), ctx).potentialAction as { '@type': string; name: string; target: { urlTemplate: string } };
		expect(pa['@type']).toBe('ReserveAction');
		expect(pa.name).toBe('内見を予約する');
		expect(pa.target.urlTemplate).toBe('https://example.test/viewing?property=HR-R-0001');
		// 売買は「見学」
		const sale = realEstateListing(mk({ type: 'sale', kind: 'house', rent: undefined, price: 3100, sale: undefined }), ctx).potentialAction as { name: string };
		expect(sale.name).toBe('見学を予約する');
	});

	it('J-102 成約済みには potentialAction を出さない(画面でも内見予約を出さない・J-038 と整合)', () => {
		expect(realEstateListing(mk({ status: 'sold' }), ctx).potentialAction).toBeUndefined();
	});
});
