import { describe, expect, it } from 'vitest';
import type { PropertyDetail } from '@/types/property';
import { initialCostLabel, keySpecs, monthlyFeeLabel } from '@/lib/summary';

const NOW = new Date('2026-09-11T00:00:00+09:00');
const stationName = (s: string) => ({ hikifune: '曳舟', oshiage: '押上' })[s] ?? s;

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
	rental: { maintenanceFee: 0, depositMonths: 2, keyMoneyMonths: 1, brokerageFee: '家賃1ヶ月', contractTerm: '2年', renewalFee: 'なし', guarantorRequired: true, availableFrom: '即入居可' },
};
const sale = (over: Partial<PropertyDetail>): PropertyDetail => ({
	...base,
	type: 'sale',
	rent: undefined,
	maintenanceFee: undefined,
	rental: undefined,
	price: 3070,
	sale: { landSqm: null, buildingSqm: null, mgmtFee: 12000, repairFund: 14000, landRights: '所有権', zoning: '第一種住居', bcr: 60, far: 200, roadAccess: '北 4.0m 私道', handover: '即時' },
	...over,
});
const labels = (list: { label: string }[]) => list.map((x) => x.label);

describe('summary.ts', () => {
	it('J-047 賃貸は 家賃 / 初期費用 / 専有面積 / 築年 / 最寄駅 の5項目(順序固定)', () => {
		const out = keySpecs(base, stationName, NOW);
		expect(labels(out)).toEqual(['家賃', '初期費用', '専有面積', '築年', '最寄駅']);
		expect(out.map((x) => x.value)).toEqual(['8.2万円', '敷2・礼1・仲1', '35㎡', '築18年', '曳舟駅 徒歩8分']);
		expect(out[0].note).toBe('管理費 なし');
	});

	it('J-047 売買(マンション)は 価格 / 専有面積 / 築年 / 最寄駅 / 管理費・修繕 の5項目', () => {
		const out = keySpecs(sale({}), stationName, NOW);
		expect(labels(out)).toEqual(['価格', '専有面積', '築年', '最寄駅', '管理費・修繕']);
		expect(out.map((x) => x.value)).toEqual(['3,070万円', '35㎡', '築18年', '曳舟駅 徒歩8分', '管理費 1.2万円']);
	});

	it('J-047 マンションの5項目目は管理費と修繕積立金を合算せず併記する', () => {
		const out = keySpecs(sale({}), stationName, NOW);
		expect(out[4]).toEqual({ label: '管理費・修繕', value: '管理費 1.2万円', note: '修繕 1.4万円' });
	});

	it('J-047 マンションの管理費・修繕が無ければ「—」(項目は消さない・条件 a)', () => {
		const out = keySpecs(sale({ sale: { ...sale({}).sale!, mgmtFee: null, repairFund: null } }), stationName, NOW);
		expect(out[4]).toEqual({ label: '管理費・修繕', value: '管理費 —', note: '修繕 —' });
	});

	it('J-047 戸建・土地の5項目目は土地権利のまま', () => {
		expect(keySpecs(sale({ kind: 'house' }), stationName, NOW)[4]).toEqual({ label: '土地権利', value: '所有権' });
		expect(keySpecs(sale({ kind: 'land' }), stationName, NOW)[4]).toEqual({ label: '土地権利', value: '所有権' });
	});

	it('J-047 月額の費用は万円表記(12,000 → 1.2万円、10,000 → 1万円、0 と null は —)', () => {
		expect(monthlyFeeLabel(12000)).toBe('1.2万円');
		expect(monthlyFeeLabel(10000)).toBe('1万円');
		expect(monthlyFeeLabel(0)).toBe('—');
		expect(monthlyFeeLabel(null)).toBe('—');
	});

	it('J-047 戸建は面積が「土地・建物」の2値', () => {
		const out = keySpecs(sale({ kind: 'house', sale: { ...sale({}).sale!, landSqm: 90, buildingSqm: 100 } }), stationName, NOW);
		expect(out[1]).toEqual({ label: '土地・建物', value: '90㎡ / 100㎡' });
	});

	it('J-047 土地は面積が「土地面積」、築年は「—」(項目は消さない・条件 a)', () => {
		const out = keySpecs(sale({ kind: 'land', layout: '', areaSqm: null, builtYm: '', sale: { ...sale({}).sale!, landSqm: 120 } }), stationName, NOW);
		expect(labels(out)).toEqual(['価格', '土地面積', '築年', '最寄駅', '土地権利']);
		expect(out[1].value).toBe('120㎡');
		expect(out[2].value).toBe('—');
	});

	it('J-047 データが無い項目は「—」で項目数は変えない(条件 a)', () => {
		const out = keySpecs({ ...base, stations: [], areaSqm: null, builtYm: '', rent: undefined, rental: undefined }, stationName, NOW);
		expect(out).toHaveLength(5);
		expect(out.map((x) => x.value)).toEqual(['—', '—', '—', '—', '—']);
	});

	it('J-047 値に形容を付けない(条件 b):築5年でも「築5年」、徒歩3分でも「徒歩3分」', () => {
		const out = keySpecs({ ...base, builtYm: '2021-09', stations: [{ slug: 'hikifune', walk: 3 }] }, stationName, NOW);
		expect(out[3].value).toBe('築5年');
		expect(out[4].value).toBe('曳舟駅 徒歩3分');
	});

	it('J-047 初期費用の仲介手数料は月数で:1ヶ月 → 仲1、0.5ヶ月 → 仲0.5、無料 → 仲0', () => {
		expect(initialCostLabel(2, 1, '家賃1ヶ月')).toBe('敷2・礼1・仲1');
		expect(initialCostLabel(0, 0, '家賃0.5ヶ月')).toBe('敷0・礼0・仲0.5');
		expect(initialCostLabel(1, 0, '無料')).toBe('敷1・礼0・仲0');
	});
});
