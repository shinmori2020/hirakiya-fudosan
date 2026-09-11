/**
 * トップページの純関数(実装順 3 / J-056)。副作用なし・data/ を読まない。
 * URL の組み立ては lib/links.ts の listHref に寄せる(J-051 と同じ仕組み。新しい作り方は足さない)。
 */
import type { PropertySummary, PropertyType } from '@/types/property';
import { listHref } from '@/lib/links';

/** トップの新着に出す件数(01 §1 の「最新6〜8件」の上限。PC 4列×2行) */
export const HOME_NEW_LIMIT = 8;

/**
 * 新着物件(公開日の新しい順)。成約済みは出さない(売れた物件を入口に置かない)。
 * 賃貸・売買は混ぜる。同じ公開日は物件番号の昇順で並びを固定する(ビルドのたびに変わらないように)。
 */
export function latestProperties(all: PropertySummary[], limit: number = HOME_NEW_LIMIT): PropertySummary[] {
	return all
		.filter((p) => p.status !== 'sold')
		.slice()
		.sort((a, b) => b.publishedOn.localeCompare(a.publishedOn) || a.no.localeCompare(b.no))
		.slice(0, Math.max(0, limit));
}

/** トップの検索フォームの入力(賃貸 = エリア / 駅 / 家賃上限 / 間取り、売買 = エリア / 価格上限 / 種目) */
export interface HomeSearchInput {
	area?: string;
	station?: string;
	/** 賃貸:家賃の上限(円) */
	rentMax?: number | string;
	/** 賃貸:間取り(PC のみ入力欄を出す) */
	layout?: string;
	/** 売買:価格の上限(万円) */
	priceMax?: number | string;
	/** 売買:種目 */
	kind?: string;
}

/**
 * 検索フォームの入力から一覧の URL を作る。
 * 空欄(「指定しない」)は URL に載せない。エリアと駅は同時に指定できる(一覧側で AND・SHIN 確定 09/12)。
 * 賃貸は既定なので type を付けず、売買だけ type=sale を付ける(listHref の規則)。
 */
export function homeSearchHref(type: PropertyType, input: HomeSearchInput): string {
	const params: Record<string, string> = {};
	const put = (k: string, v: string | number | undefined) => {
		const s = v == null ? '' : String(v).trim();
		if (s !== '') params[k] = s;
	};
	put('area', input.area);
	if (type === 'rental') {
		put('station', input.station);
		put('rent_max', input.rentMax);
		put('layout', input.layout);
	} else {
		put('price_max', input.priceMax);
		put('kind', input.kind);
	}
	return listHref(type, params);
}
