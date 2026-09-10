/**
 * 物件概要のキー項目の帯(J-047)。詳細ページの「物件概要」直下に出す5項目を組み立てる純関数。
 * 誇張を避ける3条件(SHIN・09/11):
 *   a. 項目は全物件で固定。値の良し悪しで出し分けない。データが無い項目は「—」
 *   b. 値だけ出す。形容(築浅・駅近など)は付けない。評価はポイントタグに任せる
 *   c. 文字は本文より1段大きいだけ。ラベルを必ず横に付ける(表示側)
 * 賃貸:家賃(管理費を小さく併記)/ 初期費用(敷2・礼1・仲1)/ 専有面積 / 築年 / 最寄駅 徒歩分
 * 売買:価格 / 面積(マンション=専有、戸建=土地・建物、土地=土地)/ 築年(土地は「—」)/ 最寄駅 徒歩分 /
 *       5項目目は マンション=管理費・修繕積立金(合算せず併記・J-047 条件追加)、戸建・土地=土地権利
 */
import type { PropertyDetail } from '@/types/property';
import { formatPrice, formatRent } from '@/config/site';
import { builtLabel, feeLabel, sqmLabel, walkLabel } from '@/lib/format';

export interface KeySpec {
	label: string;
	value: string;
	/** 値の横に小さく添える補足(管理費など)。無ければ undefined */
	note?: string;
}

const NONE = '—';

/** 月額の費用を「1.2万円」の形に(合算しない・J-047 条件追加)。0 や null は「—」 */
export function monthlyFeeLabel(yen: number | null | undefined): string {
	if (yen == null || yen <= 0) return NONE;
	return `${(yen / 10000).toLocaleString('ja-JP', { maximumFractionDigits: 1 })}万円`;
}

/** 「敷2・礼1・仲1」。仲介手数料は「家賃1ヶ月 / 0.5ヶ月 / 無料」の文字列から月数を読む */
export function initialCostLabel(depositMonths: number, keyMoneyMonths: number, brokerageFee: string): string {
	const m = /([\d.]+)\s*ヶ月/.exec(brokerageFee);
	const broker = /無料/.test(brokerageFee) ? '0' : m ? m[1] : NONE;
	return `敷${depositMonths}・礼${keyMoneyMonths}・仲${broker}`;
}

export function keySpecs(p: PropertyDetail, stationName: (slug: string) => string, now: Date = new Date()): KeySpec[] {
	const st = p.stations[0];
	const station = st ? `${stationName(st.slug)}駅 ${walkLabel(st.walk)}` : NONE;
	const built = p.builtYm ? (builtLabel(p.builtYm, now) ?? NONE) : NONE;

	if (p.type === 'rental') {
		const r = p.rental;
		return [
			{ label: '家賃', value: p.rent != null ? formatRent(p.rent) : NONE, note: r ? `管理費 ${feeLabel(r.maintenanceFee)}` : undefined },
			{ label: '初期費用', value: r ? initialCostLabel(r.depositMonths, r.keyMoneyMonths, r.brokerageFee) : NONE },
			{ label: '専有面積', value: sqmLabel(p.areaSqm) },
			{ label: '築年', value: built },
			{ label: '最寄駅', value: station },
		];
	}

	const s = p.sale;
	let areaLabel = '専有面積';
	let areaValue = sqmLabel(p.areaSqm);
	if (p.kind === 'land') {
		areaLabel = '土地面積';
		areaValue = sqmLabel(s?.landSqm ?? null);
	} else if (p.kind === 'house') {
		areaLabel = '土地・建物';
		const land = s?.landSqm != null ? sqmLabel(s.landSqm) : NONE;
		const bld = s?.buildingSqm != null ? sqmLabel(s.buildingSqm) : NONE;
		areaValue = `${land} / ${bld}`;
	}
	// 5項目目:マンションは管理費・修繕積立金(月額を合算せず併記)、戸建・土地は土地権利(J-047 条件追加)
	const last: KeySpec =
		p.kind === 'mansion'
			? { label: '管理費・修繕', value: `管理費 ${monthlyFeeLabel(s?.mgmtFee)}`, note: `修繕 ${monthlyFeeLabel(s?.repairFund)}` }
			: { label: '土地権利', value: s?.landRights || NONE };
	return [
		{ label: '価格', value: p.price != null ? formatPrice(p.price) : NONE },
		{ label: areaLabel, value: areaValue },
		{ label: '築年', value: p.kind === 'land' ? NONE : built },
		{ label: '最寄駅', value: station },
		last,
	];
}
