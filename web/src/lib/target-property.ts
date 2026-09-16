/**
 * フォームの右カラムに出す対象物件の要約(実装順 5・J-104)。純関数。
 *
 * 詳細ページの右カラムの要約(J-068)と同じ密度にするための行を作る。
 * 読むのは **index.json にある項目だけ**(向き・入居可能日は index.json に無いので出さない。
 * 1件のためにもう1つ JSON を読み直さない)。
 * 値が無い行は**出さない**:土地は 間取り・面積・築年が空なので、最寄駅と所在地の2行になる。
 * 「—」を並べるより行ごと落とすほうが、送信前に確かめたい情報が読み取りやすい(03 §6 の「確認」の区分と同じ扱い)。
 */
import type { PropertySummary } from '@/types/property';
import { builtLabel, sqmLabel, walkLabel } from '@/lib/format';

export interface SummaryRow {
	label: string;
	value: string;
}

/** 要約に使う項目だけを取り出した形(page.tsx が index.json から詰める) */
export type TargetPropertyFields = Pick<PropertySummary, 'layout' | 'areaSqm' | 'builtYm' | 'stations' | 'area'>;

/**
 * 上から 間取り / 面積 / 築年 / 最寄駅(1駅目だけ)/ 所在地(区・町)。
 * 名前の引き当ては呼び出し側から渡す(lib は web/data を読まない・J-041)。
 */
export function targetPropertyRows(p: TargetPropertyFields, names: { stationName: (slug: string) => string; areaLabel: (slug: string) => string }, now: Date): SummaryRow[] {
	const st = p.stations[0];
	const built = builtLabel(p.builtYm, now);
	const rows: (SummaryRow | null)[] = [
		p.layout ? { label: '間取り', value: p.layout } : null,
		p.areaSqm != null ? { label: '面積', value: sqmLabel(p.areaSqm) } : null,
		built ? { label: '築年', value: built } : null,
		// 2駅目は出さない(右カラムは値だけで完結する項目に絞る・J-092)
		st ? { label: '最寄駅', value: `${names.stationName(st.slug)}駅 ${walkLabel(st.walk)}` } : null,
		p.area ? { label: '所在地', value: names.areaLabel(p.area) } : null,
	];
	return rows.filter((r): r is SummaryRow => r !== null);
}
