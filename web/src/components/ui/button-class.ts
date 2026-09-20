/**
 * ボタン・選択肢の行の class(03 §6 部品)。**ここが唯一の出所**。
 *
 * 同じ文字列を9ファイルが別々に持っていた(フォーム4本・TargetProperty・/guide・/voice・/line-dummy・/company/access)ため、
 * 1箇所に集めた(09/20 の重複調査 A-1)。**部品にはしない**:フォーム4本の UI と Action の流れは
 * 別実装のまま比べるのが記録の目的(J-007・J-105)で、見た目の値を共有しても工程の比較は壊れない。
 *
 * 値を変える時は 03 §6 を先に直して版を上げる(03 §10 の B)。
 */

/** 主ボタン:進む操作(確認する / 送信する / 物件を探す)。青緑の塗り+白文字(03 §2 の強調は主CTAだけ) */
export const PRIMARY = 'flex h-12 w-full items-center justify-center rounded-hr bg-accent text-body font-bold text-white hover:bg-accent-strong lg:h-11 lg:text-body-pc';

/** 副ボタン:戻る・並べて置く操作(修正する / トップへ戻る / 質問する)。白地+墨の枠線(文字は 500・03 §4) */
export const SECONDARY = 'flex h-12 w-full items-center justify-center rounded-hr border border-sumi bg-surface text-body font-medium text-sumi hover:bg-surface-alt lg:h-11 lg:text-body-pc';

/** 選択肢の行(ラジオ・チェックボックスを囲む label)。当たり判定を 44 以上に保つ(min-h-11) */
export const CHOICE = 'flex min-h-11 cursor-pointer items-center gap-2 rounded-hr px-1 text-body transition-[background-color] duration-150 hover:bg-badge-new-bg motion-reduce:transition-none lg:text-body-pc';
