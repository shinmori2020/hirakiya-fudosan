import type { ReactNode } from 'react';

/**
 * 説明ページの「ラベル:値」の表(03 §6 情報表の規則:ラベル 7.5em 固定幅・小 13px・ラベルは灰、値は墨。
 * 線は行の下だけ(最終行の下にも線)。J-052 → J-090 の規則を物件詳細以外でも同じにする(J-115)。
 * 会社概要表・初期費用の内訳・管理料の目安で使う。押せる値は呼び出し側が <a> を渡す。
 */
export interface DefRow {
	k: string;
	v: ReactNode;
}

export function DefList({ rows, label }: { rows: readonly DefRow[]; label?: string }) {
	return (
		<dl aria-label={label}>
			{rows.map((r) => (
				<div key={r.k} className="flex gap-4 border-b border-line py-2">
					<dt className="w-[7.5em] shrink-0 text-small text-ink-weak lg:text-small-pc">{r.k}</dt>
					<dd className="min-w-0 text-small text-ink lg:text-small-pc">{r.v}</dd>
				</div>
			))}
		</dl>
	);
}
