import { Calendar, FileText, JapaneseYen, Receipt, Square, TrainFront, type LucideIcon } from 'lucide-react';
import type { KeySpec } from '@/lib/summary';

/**
 * 物件概要のキー項目のカード(J-047・案 A → 条件追加 09/11)。「物件概要」見出しの直下。
 * 初案は薄灰の帯だったが、セクションの薄灰に溶けて項目が離れて見えたため、白い角丸カード(灰線・影なし)に変更。
 * PC(lg 以上):5等分のグリッド。セルの間に細い縦線。高さは 80px 前後。
 * スマホ(〜767):同じカードのまま2列×3行。セルの区切りは横線のみ(縦線なし)。
 * 各セルは ラベル(最小・灰・左に lucide 16px)+ 値(H3・1段大)を左揃えで上下に。
 * 誇張回避の3条件(項目固定・値のみ・1段だけ)は lib/summary.ts のとおり変えない。
 */
const ICONS: Record<string, LucideIcon> = {
	家賃: JapaneseYen,
	価格: JapaneseYen,
	初期費用: Receipt,
	'管理費・修繕': Receipt,
	専有面積: Square,
	土地面積: Square,
	'土地・建物': Square,
	築年: Calendar,
	最寄駅: TrainFront,
	土地権利: FileText,
};

export function KeySpecBand({ specs }: { specs: KeySpec[] }) {
	return (
		<dl
			className="grid grid-cols-2 overflow-hidden rounded-hr border border-line bg-surface lg:grid-cols-5"
			aria-label="物件概要のキー項目"
		>
			{specs.map((s, i) => {
				const Icon = ICONS[s.label];
				return (
					<div
						key={s.label}
						className={`min-w-0 px-3 py-2 lg:px-4 lg:py-3 ${
							// スマホ:2列×3行なので上の行との間に横線。PC:2列目以降の左に縦線
							i >= 2 ? 'border-t border-line' : ''
						} ${i % 2 === 1 ? 'border-l border-line' : ''} lg:border-t-0 ${i > 0 ? 'lg:border-l' : 'lg:border-l-0'}`}
					>
						<dt className="flex items-center gap-1 text-xs text-ink-weak lg:text-xs-pc">
							{Icon && <Icon size={16} aria-hidden="true" className="shrink-0" />}
							{s.label}
						</dt>
						<dd className="tabular mt-0.5 truncate text-h3 font-bold text-sumi lg:text-h3-pc">
							{s.value}
							{s.note && <span className="ml-1 text-xs font-normal text-ink-weak lg:text-xs-pc">{s.note}</span>}
						</dd>
					</div>
				);
			})}
		</dl>
	);
}
