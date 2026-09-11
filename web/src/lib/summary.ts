/**
 * 物件概要の「決め手の3項目」(J-059)。詳細ページの「物件概要」直下に出す。
 * J-047 では5項目の帯(家賃 / 初期費用 / 専有面積 / 築年 / 最寄駅)だったが、
 * 住まい探しで重視される順(立地 → 価格 → 間取り・広さ)に合わせて3項目に置き換えた。
 *
 * 賃貸:交通(補足に町)/ 家賃(補足に 敷2・礼1・仲1)/ 間取り・専有面積(補足に築年・J-063)
 * 売買:所在地(補足に 最寄駅 徒歩分)/ 価格(マンションは補足に 管理費・修繕の月額合計)/ 間取り・専有面積(補足に築年・J-063)
 *   戸建:所在地 / 価格 / 間取り・建物面積(補足に 土地面積)
 *   土地:所在地 / 価格 / 土地面積(補足に 建ぺい率・容積率)
 *
 * J-047 から引き継ぐ条件:
 *   a. 項目は種別ごとに固定。値の良し悪しで出し分けない。データが無い項目は「—」
 *   b. 値だけ出す。形容(築浅・駅近など)は付けない。評価はポイントタグに任せる
 * 外れた条件:「本文より1段だけ大きい」。横一列に5項目を詰める前提が無くなったため(J-059)
 * 築年は J-059 の時点で「築浅ほど良いという見せ方になり、築年の古い物件が不利に見える」ことを懸念して3項目から外した。
 * J-063 で補足の小さい文字として戻したが、値のみ・煽り文なし(条件 b)は変えない。
 * 管理費と修繕積立金は、この3項目では月額の合計を1つ出す(購入は毎月の支払いで判断されるため)。
 * 内訳(合算しない併記・J-047)は下の情報表に残す。
 */
import type { PropertyDetail } from '@/types/property';
import { formatPrice, formatRent } from '@/config/site';
import { builtLabel, sqmLabel, walkLabel } from '@/lib/format';

export interface KeySpec {
	label: string;
	value: string;
	/** 値の下に小さく添える補足。無ければ undefined */
	note?: string;
}

const NONE = '—';

/** 月額の費用を「1.2万円」の形に(J-047。情報表の併記で使う)。0 や null は「—」 */
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

/**
 * 管理費+修繕積立金の月額合計(J-059)。「管理費・修繕 月18,000円」の形。
 * どちらも無ければ null(補足を出さない)。
 */
export function monthlyTotalLabel(mgmtFee: number | null | undefined, repairFund: number | null | undefined): string | null {
	const total = (mgmtFee ?? 0) + (repairFund ?? 0);
	if (total <= 0) return null;
	return `管理費・修繕 月${total.toLocaleString('ja-JP')}円`;
}

/** 間取りと面積を1つの値に。「1LDK / 35㎡」。どちらか欠ければ残った方だけ */
export function layoutAreaLabel(layout: string, sqm: number | null): string {
	const parts = [layout.trim(), sqm != null ? sqmLabel(sqm) : ''].filter((v) => v !== '');
	return parts.length > 0 ? parts.join(' / ') : NONE;
}

export interface KeySpecNames {
	stationName: (slug: string) => string;
	/** 「葛飾区青戸」。区+町(タクソノミーから作る) */
	areaLabel: (slug: string) => string;
}

export function keySpecs(p: PropertyDetail, names: KeySpecNames, now: Date = new Date()): KeySpec[] {
	const st = p.stations[0];
	const station = st ? `${names.stationName(st.slug)}駅 ${walkLabel(st.walk)}` : NONE;
	const town = names.areaLabel(p.area) || NONE;
	// 3項目目の補足(J-063)。築年が取れない物件(土地など)は付けない
	const built = p.builtYm ? (builtLabel(p.builtYm, now) ?? undefined) : undefined;

	if (p.type === 'rental') {
		const r = p.rental;
		return [
			{ label: '交通', value: station, note: town },
			{
				label: '家賃',
				value: p.rent != null ? formatRent(p.rent) : NONE,
				note: r ? initialCostLabel(r.depositMonths, r.keyMoneyMonths, r.brokerageFee) : undefined,
			},
			{ label: '間取り・専有面積', value: layoutAreaLabel(p.layout, p.areaSqm), note: built },
		];
	}

	const s = p.sale;
	const price: KeySpec = { label: '価格', value: p.price != null ? formatPrice(p.price) : NONE };
	if (p.kind === 'mansion') {
		const monthly = monthlyTotalLabel(s?.mgmtFee, s?.repairFund);
		if (monthly) price.note = monthly;
	}

	let third: KeySpec;
	if (p.kind === 'land') {
		third = {
			label: '土地面積',
			value: sqmLabel(s?.landSqm ?? null),
			note: s?.bcr != null || s?.far != null ? `建ぺい率 ${s?.bcr ?? NONE}% / 容積率 ${s?.far ?? NONE}%` : undefined,
		};
	} else if (p.kind === 'house') {
		third = {
			label: '間取り・建物面積',
			value: layoutAreaLabel(p.layout, s?.buildingSqm ?? null),
			note: s?.landSqm != null ? `土地 ${sqmLabel(s.landSqm)}` : undefined,
		};
	} else {
		third = { label: '間取り・専有面積', value: layoutAreaLabel(p.layout, p.areaSqm), note: built };
	}

	return [{ label: '所在地', value: town, note: station }, price, third];
}
