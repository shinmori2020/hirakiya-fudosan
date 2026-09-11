import { describe, expect, it } from 'vitest';
import type { PropertyDetail } from '@/types/property';
import { initialCostLabel, keySpecs, layoutAreaLabel, monthlyFeeLabel, monthlyTotalLabel } from '@/lib/summary';

const names = {
	stationName: (s: string) => ({ hikifune: '曳舟', oshiage: '押上' })[s] ?? s,
	areaLabel: (s: string) => ({ hikifune: '墨田区曳舟', aoto: '葛飾区青戸' })[s] ?? s,
};

const base: PropertyDetail = {
	no: 'HR-R-0001',
	slug: 'hr-r-0001',
	type: 'rental',
	kind: 'mansion',
	status: 'open',
	title: 'X',
	area: 'hikifune',
	stations: [{ slug: 'hikifune', walk: 8 }],
	lines: [],
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
	maintenanceFee: 0,
	address: '東京都墨田区曳舟0-0-0',
	staff: '仮名 美咲',
	walkMinutes: 8,
	walkMinutes2: null,
	floorsTotal: 14,
	structure: 'RC',
	direction: '北',
	parking: 'なし',
	transactionType: '媒介',
	updatedOn: '2026-09-08',
	nextUpdateOn: '2026-09-22',
	comment: '',
	images: [],
	floorplan: null,
	rental: {
		maintenanceFee: 0,
		depositMonths: 2,
		keyMoneyMonths: 1,
		brokerageFee: '家賃1ヶ月',
		contractTerm: '2年',
		renewalFee: 'なし',
		guarantorRequired: true,
		availableFrom: '即入居可',
	},
};

const sale = (over: Partial<PropertyDetail>): PropertyDetail => ({
	...base,
	area: 'aoto',
	type: 'sale',
	layout: '3LDK',
	areaSqm: 75,
	rent: undefined,
	maintenanceFee: undefined,
	rental: undefined,
	price: 3070,
	sale: {
		landSqm: null,
		buildingSqm: null,
		mgmtFee: 12000,
		repairFund: 6000,
		landRights: '所有権',
		zoning: '第一種住居',
		bcr: 60,
		far: 200,
		roadAccess: '北 4.0m 私道',
		handover: '即時',
	},
	...over,
});

describe('summary.ts', () => {
	it('J-059 賃貸は 交通 / 家賃 / 間取り・専有面積 の3項目(順序固定)', () => {
		const out = keySpecs(base, names);
		expect(out.map((x) => x.label)).toEqual(['交通', '家賃', '間取り・専有面積']);
		expect(out.map((x) => x.value)).toEqual(['曳舟駅 徒歩8分', '8.2万円', '1LDK / 35㎡']);
	});

	it('J-059 賃貸の補足:交通の下に町、家賃の下に 敷2・礼1・仲1', () => {
		const out = keySpecs(base, names);
		expect(out[0].note).toBe('墨田区曳舟');
		expect(out[1].note).toBe('敷2・礼1・仲1');
		expect(out[2].note).toBeUndefined();
	});

	it('J-059 売買(マンション)は 所在地 / 価格 / 間取り・専有面積。所在地の下に最寄駅', () => {
		const out = keySpecs(sale({}), names);
		expect(out.map((x) => x.label)).toEqual(['所在地', '価格', '間取り・専有面積']);
		expect(out.map((x) => x.value)).toEqual(['葛飾区青戸', '3,070万円', '3LDK / 75㎡']);
		expect(out[0].note).toBe('曳舟駅 徒歩8分');
	});

	it('J-059 売買(マンション)の価格の下は管理費と修繕積立金の月額合計(内訳は情報表に残す)', () => {
		expect(keySpecs(sale({}), names)[1].note).toBe('管理費・修繕 月18,000円');
	});

	it('J-059 管理費も修繕積立金も無いマンションは価格の補足を出さない', () => {
		const out = keySpecs(sale({ sale: { ...sale({}).sale!, mgmtFee: null, repairFund: null } }), names);
		expect(out[1].note).toBeUndefined();
		expect(out).toHaveLength(3);
	});

	it('J-059 戸建は 間取り・建物面積 で、補足に土地面積(管理費は無いので価格の補足も出さない)', () => {
		const out = keySpecs(sale({ kind: 'house', sale: { ...sale({}).sale!, landSqm: 90, buildingSqm: 100 } }), names);
		expect(out.map((x) => x.label)).toEqual(['所在地', '価格', '間取り・建物面積']);
		expect(out[2].value).toBe('3LDK / 100㎡');
		expect(out[2].note).toBe('土地 90㎡');
		expect(out[1].note).toBeUndefined();
	});

	it('J-059 土地は 土地面積 で、補足に建ぺい率・容積率', () => {
		const out = keySpecs(sale({ kind: 'land', layout: '', areaSqm: null, sale: { ...sale({}).sale!, landSqm: 120 } }), names);
		expect(out.map((x) => x.label)).toEqual(['所在地', '価格', '土地面積']);
		expect(out[2].value).toBe('120㎡');
		expect(out[2].note).toBe('建ぺい率 60% / 容積率 200%');
	});

	it('J-059 データが無い項目は「—」で、項目数は3のまま(J-047 の条件 a を引き継ぐ)', () => {
		const out = keySpecs({ ...base, stations: [], areaSqm: null, layout: '', rent: undefined, rental: undefined }, names);
		expect(out).toHaveLength(3);
		expect(out.map((x) => x.value)).toEqual(['—', '—', '—']);
	});

	it('J-059 値に形容を付けない(条件 b):徒歩3分でも「徒歩3分」のまま', () => {
		const out = keySpecs({ ...base, stations: [{ slug: 'hikifune', walk: 3 }] }, names);
		expect(out[0].value).toBe('曳舟駅 徒歩3分');
	});

	it('J-059 間取りと面積は「1LDK / 35㎡」。欠けた方は出さない', () => {
		expect(layoutAreaLabel('1LDK', 35)).toBe('1LDK / 35㎡');
		expect(layoutAreaLabel('', 35)).toBe('35㎡');
		expect(layoutAreaLabel('1LDK', null)).toBe('1LDK');
		expect(layoutAreaLabel('', null)).toBe('—');
	});

	it('J-059 月額の合計は「管理費・修繕 月18,000円」。片方だけでも出し、0 と null は出さない', () => {
		expect(monthlyTotalLabel(12000, 6000)).toBe('管理費・修繕 月18,000円');
		expect(monthlyTotalLabel(12000, null)).toBe('管理費・修繕 月12,000円');
		expect(monthlyTotalLabel(0, 0)).toBeNull();
		expect(monthlyTotalLabel(null, null)).toBeNull();
	});

	it('J-047 月額の費用は万円表記(12,000 → 1.2万円、10,000 → 1万円、0 と null は —)', () => {
		expect(monthlyFeeLabel(12000)).toBe('1.2万円');
		expect(monthlyFeeLabel(10000)).toBe('1万円');
		expect(monthlyFeeLabel(0)).toBe('—');
		expect(monthlyFeeLabel(null)).toBe('—');
	});

	it('J-047 初期費用の仲介手数料は月数で:1ヶ月 → 仲1、0.5ヶ月 → 仲0.5、無料 → 仲0', () => {
		expect(initialCostLabel(2, 1, '家賃1ヶ月')).toBe('敷2・礼1・仲1');
		expect(initialCostLabel(0, 0, '家賃0.5ヶ月')).toBe('敷0・礼0・仲0.5');
		expect(initialCostLabel(1, 0, '無料')).toBe('敷1・礼0・仲0');
	});
});
