/**
 * 物件データの型(docs/02-物件データ設計.md §7)。
 *
 * - `PropertySummary` は data/properties/index.json の1要素(一覧・検索・地図が読む)
 * - `PropertyDetail` は data/properties/HR-R-0001.json(詳細ページが読む)
 * - 新着・値下げはここに持たせない。`lib/badges.ts` の純関数で判定する
 * - 値はすべて架空。番地は 0-0-0、写真はプレースホルダー
 */

export type PropertyType = 'rental' | 'sale';
export type PropertyKind = 'mansion' | 'apartment' | 'house_rental' | 'house' | 'land';
export type Status = 'open' | 'negotiating' | 'sold';

export interface StationRef {
	slug: string;
	/** 徒歩(分)。1駅目は walk_minutes、2駅目は walk_minutes_2 */
	walk: number;
}

/** index.json の1要素 */
export interface PropertySummary {
	no: string; // HR-R-0001 / HR-S-0001。URL の [id]
	slug: string; // WP の post_name(= no の小文字)
	type: PropertyType;
	kind: PropertyKind;
	status: Status;
	title: string;
	area: string; // 町 slug(aoto 等)
	stations: StationRef[];
	lines: string[];
	features: string[];
	collections: string[];
	rent?: number; // 円(賃貸)
	price?: number; // 万円(売買)
	layout: string; // '' は土地
	areaSqm: number | null;
	builtYm: string; // 'YYYY-MM'。土地は ''
	lat: number;
	lng: number;
	thumb: string | null; // images[0] または null(写真0枚)
	publishedOn: string; // 'YYYY-MM-DD'
	// 一覧カードに出す項目(J-046 で追加。02 §5)
	photoCount: number; // 写真の枚数(間取り図は含まない)
	hasFloorplan: boolean; // 間取り図の有無(写真0枚の時の表示に使う)
	floor: number | null; // 所在階。戸建・土地は null
	maintenanceFee?: number; // 管理費・共益費(円・賃貸のみ)
	rentPrevious?: number;
	pricePrevious?: number;
}

/** 詳細ページ用。3-1〜3-3 の全項目 */
export interface PropertyDetail extends PropertySummary {
	address: string; // 東京都葛飾区青戸0-0-0
	staff: string;
	walkMinutes: number;
	walkMinutes2: number | null;
	floor: number | null;
	floorsTotal: number | null;
	structure: string;
	direction: string;
	parking: string;
	transactionType: string;
	updatedOn: string;
	nextUpdateOn: string;
	comment: string;
	images: string[]; // /wp-uploads/placeholders/HR-R-0001-1.svg …
	floorplan: string | null;

	// 賃貸専用(売買では undefined)
	rental?: {
		maintenanceFee: number;
		depositMonths: number;
		keyMoneyMonths: number;
		brokerageFee: string;
		contractTerm: string;
		renewalFee: string;
		guarantorRequired: boolean;
		availableFrom: string;
	};
	// 売買専用(賃貸では undefined)
	sale?: {
		landSqm: number | null;
		buildingSqm: number | null;
		mgmtFee: number | null;
		repairFund: number | null;
		landRights: string;
		zoning: string;
		bcr: number | null;
		far: number | null;
		roadAccess: string;
		handover: string;
	};
}

/** data/taxonomies/*.json の1要素 */
export interface Term {
	slug: string;
	name: string;
	count: number;
	parent: string | null; // area のみ(区の slug)。他は null
	meta: Record<string, string | number>; // station: lines(カンマ区切り)・area_slug / area: lat・lng
}

export type TaxonomyName =
	| 'property_type'
	| 'property_kind'
	| 'area'
	| 'line'
	| 'station'
	| 'feature_tag'
	| 'collection'
	| 'status';

/** data/meta.json */
export interface ExportMeta {
	exportedAt: string; // ISO
	source: string; // WORDPRESS_API_URL
	wordpress: string | null; // 例 '6.9.4'
	counts: { properties: number; rental: number; sale: number } & Record<string, number>;
}
