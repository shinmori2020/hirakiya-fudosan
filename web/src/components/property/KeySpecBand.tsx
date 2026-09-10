import type { KeySpec } from '@/lib/summary';

/**
 * 物件概要のキー項目の帯(J-047・案 A)。「物件概要」見出しの直下。
 * 薄灰の帯・角丸 6・余白 12〜16。PC は5項目を横並び、スマホは2列で折り返し。
 * 値は本文より1段大きいだけ(H3 17/18px)。ラベルは必ず横(上)に付ける。形容は付けない(lib/summary.ts の3条件)。
 */
export function KeySpecBand({ specs }: { specs: KeySpec[] }) {
	return (
		<dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-hr bg-surface-alt p-3 lg:grid-cols-5 lg:gap-x-6 lg:p-4" aria-label="物件概要のキー項目">
			{specs.map((s) => (
				<div key={s.label} className="min-w-0">
					<dt className="text-xs text-ink-weak lg:text-xs-pc">{s.label}</dt>
					<dd className="tabular mt-0.5 text-h3 font-bold text-sumi lg:text-h3-pc">
						{s.value}
						{s.note && <span className="ml-1 text-xs font-normal text-ink-weak lg:text-xs-pc">{s.note}</span>}
					</dd>
				</div>
			))}
		</dl>
	);
}
