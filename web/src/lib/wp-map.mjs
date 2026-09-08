/**
 * WordPress REST(hr-core)の生 JSON → PropertySummary / PropertyDetail / Term への変換。
 *
 * export-wp-data.mjs(ビルド前)と src/lib/properties.ts(DATA_SOURCE=api)の両方から使う。
 * 変換ロジックはここ1箇所。型は src/lib/wp-map.d.ts。
 *
 * 前提(hr-core.php):
 *  - post.hr_terms  … 全タクソノミーの slug 配列(_embed を辿らない)
 *  - post.acf       … ACF フィールド(show_in_rest)。数値は "" か 数値 か 文字列で来る
 *  - acf.property_type は term ID(条件表示用)。種別は hr_terms.property_type を使う
 */

const TAXONOMIES = [
	'property_type',
	'property_kind',
	'area',
	'line',
	'station',
	'feature_tag',
	'collection',
	'status',
];

/** "" / null / "123" / 123 → number | null */
export function num(v) {
	if (v === '' || v === null || v === undefined) return null;
	const n = typeof v === 'number' ? v : Number(v);
	return Number.isFinite(n) ? n : null;
}
function str(v) {
	// ACF の select(allow_null)は未選択で false を返す。'false' 文字列にしない
	return v === null || v === undefined || v === false ? '' : String(v);
}
function first(arr) {
	return Array.isArray(arr) && arr.length ? arr[0] : null;
}
/** textarea の改行区切りパス → 配列。uploads の絶対URLも相対に揃える */
function splitPaths(v, uploadsPrefix) {
	return str(v)
		.split(/\r?\n/)
		.map((s) => s.trim())
		.filter(Boolean)
		.map((p) => rewriteUpload(p, uploadsPrefix));
}
/** /wp-content/uploads/… または http://host/wp-content/uploads/… → /wp-uploads/… */
export function rewriteUpload(p, uploadsPrefix) {
	if (!p) return p;
	if (uploadsPrefix && p.startsWith(uploadsPrefix)) p = p.slice(uploadsPrefix.length);
	return p.replace(/^\/?wp-content\/uploads\//, '/wp-uploads/');
}

/** primary を先頭に。無ければそのまま */
function orderStations(slugs, primary) {
	const pr = str(primary);
	return pr && slugs.includes(pr) ? [pr, ...slugs.filter((s) => s !== pr)] : slugs;
}

/** post → PropertySummary(index.json 用) */
export function toSummary(post, opts = {}) {
	const t = post.hr_terms ?? {};
	const a = post.acf ?? {};
	const type = first(t.property_type) ?? 'rental';
	const images = splitPaths(a.images, opts.uploadsPrefix);
	// 最寄1駅目は acf.primary_station(F-005:hr_terms.station は名前順。hr-core 側でも並べ直すが、ここでも保証する)
	const stationSlugs = orderStations(t.station ?? [], a.primary_station);
	const stations = stationSlugs.map((slug, i) => ({
		slug,
		walk: num(i === 0 ? a.walk_minutes : a.walk_minutes_2) ?? 0,
	}));
	const s = {
		no: str(a.property_no),
		slug: post.slug,
		type,
		kind: first(t.property_kind) ?? 'mansion',
		status: first(t.status) ?? 'open',
		title: decode(post.title?.rendered ?? ''),
		area: first(t.area) ?? '',
		stations,
		lines: t.line ?? [],
		features: t.feature_tag ?? [],
		collections: t.collection ?? [],
		layout: str(a.layout),
		areaSqm: num(a.area_sqm),
		builtYm: str(a.built_ym),
		lat: num(a.lat) ?? 0,
		lng: num(a.lng) ?? 0,
		thumb: images[0] ?? null,
		publishedOn: str(a.published_on),
	};
	if (type === 'rental') {
		s.rent = num(a.rent) ?? 0;
		const rp = num(a.rent_previous);
		if (rp) s.rentPrevious = rp;
	} else {
		s.price = num(a.price) ?? 0;
		const pp = num(a.price_previous);
		if (pp) s.pricePrevious = pp;
	}
	return s;
}

/** post → PropertyDetail(1物件1ファイル用) */
export function toDetail(post, opts = {}) {
	const a = post.acf ?? {};
	const s = toSummary(post, opts);
	const d = {
		...s,
		address: str(a.address),
		staff: str(a.staff),
		walkMinutes: num(a.walk_minutes) ?? 0,
		walkMinutes2: num(a.walk_minutes_2),
		floor: num(a.floor),
		floorsTotal: num(a.floors_total),
		structure: str(a.structure),
		direction: str(a.direction),
		parking: str(a.parking),
		transactionType: str(a.transaction_type),
		updatedOn: str(a.updated_on),
		nextUpdateOn: str(a.next_update_on),
		comment: str(a.comment),
		images: splitPaths(a.images, opts.uploadsPrefix),
		floorplan: a.floorplan ? rewriteUpload(str(a.floorplan), opts.uploadsPrefix) : null,
	};
	if (s.type === 'rental') {
		d.rental = {
			maintenanceFee: num(a.maintenance_fee) ?? 0,
			depositMonths: num(a.deposit_months) ?? 0,
			keyMoneyMonths: num(a.key_money_months) ?? 0,
			brokerageFee: str(a.brokerage_fee),
			contractTerm: str(a.contract_term),
			renewalFee: str(a.renewal_fee),
			guarantorRequired: a.guarantor_required === true || a.guarantor_required === 1 || a.guarantor_required === '1',
			availableFrom: str(a.available_from),
		};
	} else {
		d.sale = {
			landSqm: num(a.land_sqm),
			buildingSqm: num(a.building_sqm),
			mgmtFee: num(a.mgmt_fee),
			repairFund: num(a.repair_fund),
			landRights: str(a.land_rights),
			zoning: str(a.zoning),
			bcr: num(a.bcr),
			far: num(a.far),
			roadAccess: str(a.road_access),
			handover: str(a.handover),
		};
	}
	return d;
}

/** REST の term → Term。parent は id なので slug に引き直す(同じ一覧の中で解決) */
export function toTerms(rawTerms) {
	const byId = new Map(rawTerms.map((t) => [t.id, t.slug]));
	return rawTerms.map((t) => ({
		slug: t.slug,
		name: decode(t.name),
		count: t.count ?? 0,
		parent: t.parent ? (byId.get(t.parent) ?? null) : null,
		meta: normalizeMeta(t.meta),
	}));
}
function normalizeMeta(meta) {
	if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return {};
	const out = {};
	for (const [k, v] of Object.entries(meta)) {
		if (v === '' || v === null || v === undefined) continue;
		const n = Number(v);
		out[k] = typeof v === 'string' && v !== '' && Number.isFinite(n) && /^-?\d+(\.\d+)?$/.test(v) ? n : v;
	}
	return out;
}

/** WP が返す HTML エンティティ(&#8211; 等)を戻す。タイトルと term 名だけに使う */
export function decode(s) {
	return String(s)
		.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
		.replace(/&amp;/g, '&')
		.replace(/&quot;/g, '"')
		.replace(/&#039;|&apos;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>');
}

/** タクソノミー slug → REST の rest_base(hr-core.php と一致させる) */
export const REST_BASE = {
	property_type: 'property_types',
	property_kind: 'property_kinds',
	area: 'areas',
	line: 'lines',
	station: 'stations',
	feature_tag: 'feature_tags',
	collection: 'collections',
	status: 'property_statuses',
};
export { TAXONOMIES };
