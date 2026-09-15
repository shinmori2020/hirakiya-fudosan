/**
 * 特集(collection)の持ち方(J-099)。
 *
 * 特集には2種類ある。
 *  - **属性で持つもの**(pet-ok / zero-deposit / house-rental / central-30min / near-station)
 *    物件の値が変わらない限り結果が変わらない。WordPress のタクソノミーに保存し、JSON に書き出す
 *  - **計算で絞るもの**(new-built)
 *    **時間の経過だけで対象が出入りする**ので保存しない。読み込み時に築年月から判定する
 *
 * 判断の基準は「同じ物件が、時間の経過だけで特集から出入りするか」。出入りするなら保存しない。
 * 保存すると、書き出した日の判定が画面に残り続ける(2021年築を「新築・築浅」として出し続ける、など)。
 *
 * 築5年以内の判定はクイックタブ「築浅」(built_max=5)と同じ `builtYears` を使う。同じ条件を2通りに書かない。
 * 築年月が空の物件(土地)は `builtYears` が null になるので、対象から外れる。
 */
import type { PropertySummary } from '@/types/property';
import { builtYears } from '@/lib/search';

/** 計算で絞る特集(保存しない)。ここに挙げた slug は JSON のタグを無視して判定し直す */
export const COMPUTED_COLLECTIONS = ['new-built'] as const;

/** 「新築・築浅」の上限(年)。クイックタブ「築浅」と同じ値 */
export const NEW_BUILT_MAX_YEARS = 5;

/** その物件が「新築・築浅」に該当するか。築年月が無い(土地)は false */
export function isNewBuilt(p: Pick<PropertySummary, 'builtYm'>, now: Date): boolean {
	const y = builtYears(p.builtYm, now);
	return y != null && y <= NEW_BUILT_MAX_YEARS;
}

/** 保存された特集から計算対象を外し、計算の結果を足したもの。並びは元の順を保ち、計算分は末尾 */
export function collectionsFor(p: Pick<PropertySummary, 'builtYm' | 'collections'>, now: Date): string[] {
	const kept = p.collections.filter((c) => !COMPUTED_COLLECTIONS.includes(c as (typeof COMPUTED_COLLECTIONS)[number]));
	return isNewBuilt(p, now) ? [...kept, 'new-built'] : kept;
}

/**
 * 読み込んだ物件の特集を計算し直す。`lib/properties.ts` が JSON / REST から読んだ直後に1回通すので、
 * 画面側(一覧の絞り込み・入口の件数・クイックタブ・カードのタグ・ポイントタグ)は何も意識しなくてよい。
 */
export function withComputedCollections<T extends Pick<PropertySummary, 'builtYm' | 'collections'>>(list: T[], now: Date): T[] {
	return list.map((p) => ({ ...p, collections: collectionsFor(p, now) }));
}
