/**
 * 構造化データ(J-083)。純関数。物件詳細ページの2つだけを先行実装する。
 *   - RealEstateListing … 物件そのもの(価格・面積・住所・緯度経度・取引態様・物件番号)
 *   - BreadcrumbList  … 画面のパンくずと同じ4階層(トップ → 種別の一覧 → エリア → 物件名。J-085 で3階層から変更)
 * Organization / llms.txt / sitemap / noindex / OGP と、サイト全体としての整合の検証は実装順 8。
 *
 * 決めたこと(J-083):
 *   - **賃貸は UnitPriceSpecification で月額を示す**。price 単体だと総額に読まれるため、
 *     businessFunction(LeaseOut = 貸し出し)と unitCode: MON(1ヶ月あたり)の2つで表す。
 *     管理費・共益費は請求が別なので月額に合算しない。入居時の目安合計(J-081)は当社の計算による
 *     目安で schema.org に対応する語彙が無いため、構造化データには入れない。
 *   - **売買は同じ Offer に price(円)** を書く。JSON は万円なので 10,000 倍する。businessFunction は既定(売却)。
 *   - **成約済みも出す**。J-037 でページを残すと決めた以上、画面と機械可読の内容を食い違わせない。
 *     状態は availability(公開中 InStock / 商談中 LimitedAvailability / 成約済み SoldOut)で示す。
 *   - potentialAction(内見予約)は入れない。フォームが未実装で、飛び先が 404 の URL を書くことになるため(実装順 5)。
 *   - 架空表記はそのまま出す。住所の番地は 0-0-0(制作計画 §7-9)。電話・免許番号はこの2つの型に含まれない。
 */
import type { PropertyDetail, PropertyKind, Status } from '@/types/property';

/** JSON-LD は入れ子が深いので、値の型は緩く持つ */
export type JsonLd = Record<string, unknown>;

/** 種目 → schema.org の型。土地は建物の型が無いので Place にする */
export function placeType(kind: PropertyKind): string {
	switch (kind) {
		case 'mansion':
		case 'apartment':
			return 'Apartment';
		case 'house':
		case 'house_rental':
			return 'SingleFamilyResidence';
		default:
			return 'Place';
	}
}

/** 掲載状態 → availability(成約済みも出す。J-083) */
export function availabilityFor(status: Status): string {
	switch (status) {
		case 'sold':
			return 'https://schema.org/SoldOut';
		case 'negotiating':
			return 'https://schema.org/LimitedAvailability';
		default:
			return 'https://schema.org/InStock';
	}
}

/** 「東京都葛飾区曳舟0-0-0」を 都道府県 / 区 / 以降 に分ける(番地は 0-0-0 のまま出す) */
export function addressParts(address: string, wardName: string): { region: string; locality: string; street: string } {
	const region = address.startsWith('東京都') ? '東京都' : '';
	const rest = address.slice(region.length);
	const locality = wardName && rest.startsWith(wardName) ? wardName : '';
	return { region, locality, street: rest.slice(locality.length) };
}

export interface ListingContext {
	/** 物件詳細ページの絶対 URL */
	url: string;
	/** 区名(住所の分割に使う) */
	wardName: string;
	/** 最寄1駅目の駅名(無ければ空) */
	stationName: string;
}

/** 物件の構造化データ(RealEstateListing) */
export function realEstateListing(p: PropertyDetail, ctx: ListingContext): JsonLd {
	const { region, locality, street } = addressParts(p.address, ctx.wardName);
	const about: JsonLd = {
		'@type': placeType(p.kind),
		name: p.title,
		address: {
			'@type': 'PostalAddress',
			streetAddress: street,
			addressLocality: locality,
			addressRegion: region,
			addressCountry: 'JP',
		},
		geo: { '@type': 'GeoCoordinates', latitude: p.lat, longitude: p.lng },
	};
	if (p.areaSqm != null) about.floorSize = { '@type': 'QuantitativeValue', value: p.areaSqm, unitCode: 'MTK' };
	if (p.sale?.landSqm != null) about.lotSize = { '@type': 'QuantitativeValue', value: p.sale.landSqm, unitCode: 'MTK' };
	if (p.builtYm) about.yearBuilt = Number(p.builtYm.slice(0, 4));
	if (p.floor != null) about.floorLevel = String(p.floor);
	if (p.floorsTotal != null) about.numberOfFloors = p.floorsTotal;

	const availability = availabilityFor(p.status);
	const offers: JsonLd =
		p.type === 'rental'
			? {
					'@type': 'Offer',
					availability,
					// 貸し出し + 1ヶ月あたり。price 単体だと総額に読まれる
					businessFunction: 'http://purl.org/goodrelations/v1#LeaseOut',
					priceSpecification: {
						'@type': 'UnitPriceSpecification',
						price: p.rent ?? 0,
						priceCurrency: 'JPY',
						unitCode: 'MON',
						referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON' },
					},
				}
			: {
					'@type': 'Offer',
					availability,
					// JSON は万円なので円に直す
					price: (p.price ?? 0) * 10000,
					priceCurrency: 'JPY',
				};

	const extras: JsonLd[] = [
		{ '@type': 'PropertyValue', name: '物件番号', value: p.no },
		{ '@type': 'PropertyValue', name: '取引態様', value: p.transactionType },
	];
	if (ctx.stationName) extras.push({ '@type': 'PropertyValue', name: '最寄駅', value: `${ctx.stationName}駅 徒歩${p.walkMinutes}分` });
	if (p.layout) extras.push({ '@type': 'PropertyValue', name: '間取り', value: p.layout });

	return {
		'@context': 'https://schema.org',
		'@type': 'RealEstateListing',
		name: p.title,
		url: ctx.url,
		identifier: p.no,
		description: p.comment,
		datePosted: p.publishedOn,
		dateModified: p.updatedOn,
		about,
		offers,
		additionalProperty: extras.filter((e) => e.value !== '' && e.value != null),
	};
}

export interface BreadcrumbContext {
	/** サイトの絶対 URL(末尾のスラッシュなし) */
	siteUrl: string;
	/** 物件詳細ページの絶対 URL */
	url: string;
	/** エリアの表示名(「墨田区曳舟」。J-085) */
	areaName: string;
	/** エリアの飛び先(サイト内の相対パス。町で絞った一覧 = J-051 の townHref と同じ) */
	areaHref: string;
}

/**
 * パンくず(画面の表示と同じ4階層。ずれると読み手と機械で違う階層になる)。
 * トップ → 種別の一覧 → エリア(町で絞った一覧)→ 物件名(J-085)。
 */
export function breadcrumbList(p: PropertyDetail, ctx: BreadcrumbContext): JsonLd {
	const listHref = p.type === 'rental' ? '/properties' : '/properties?type=sale';
	const typeLabel = p.type === 'rental' ? '賃貸' : '売買';
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: [
			{ '@type': 'ListItem', position: 1, name: 'トップ', item: `${ctx.siteUrl}/` },
			{ '@type': 'ListItem', position: 2, name: `${typeLabel}物件を探す`, item: `${ctx.siteUrl}${listHref}` },
			{ '@type': 'ListItem', position: 3, name: ctx.areaName, item: `${ctx.siteUrl}${ctx.areaHref}` },
			{ '@type': 'ListItem', position: 4, name: p.title, item: ctx.url },
		],
	};
}
