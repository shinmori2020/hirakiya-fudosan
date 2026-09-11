import { JapaneseYen, LayoutGrid, MapPin, Square, TrainFront, type LucideIcon } from 'lucide-react';
import type { KeySpec } from '@/lib/summary';

/**
 * 物件概要の決め手の3項目(J-059。J-047 の5項目の帯を置き換えたもの)。「物件概要」見出しの直下。
 * PC(lg 以上):3等分のグリッド(1項目 約400px)。セルの間に細い縦線。
 * スマホ(〜767):1列に積み、区切りは横線のみ。
 * 各セルは ラベル(最小・灰・左に lucide 20px)+ 値(H2・1行)+ 補足(小・灰)を左揃えで上下に。
 * 白い角丸カード(灰線・影なし)は J-047 のまま残す:セクションの薄灰の上に置くので、
 * 地色の帯だと背景に溶けて項目が離れて見える(J-047 の2回目の条件追加で直した点)。
 * 誇張回避は lib/summary.ts のとおり(種別ごとに項目固定・値のみ)。
 */
const ICONS: Record<string, LucideIcon> = {
	交通: TrainFront,
	所在地: MapPin,
	家賃: JapaneseYen,
	価格: JapaneseYen,
	'間取り・専有面積': LayoutGrid,
	'間取り・建物面積': LayoutGrid,
	土地面積: Square,
};

export function KeySpecBand({ specs }: { specs: KeySpec[] }) {
	return (
		<dl className="grid grid-cols-1 overflow-hidden rounded-hr border border-line bg-surface lg:grid-cols-3" aria-label="この物件の決め手">
			{specs.map((s, i) => {
				const Icon = ICONS[s.label];
				return (
					<div
						key={s.label}
						className={`min-w-0 px-4 py-3 lg:px-6 lg:py-4 ${i > 0 ? 'border-t border-line lg:border-t-0 lg:border-l' : ''}`}
					>
						<dt className="flex items-center gap-1 text-xs text-ink-weak lg:text-xs-pc">
							{Icon && <Icon size={20} aria-hidden="true" className="shrink-0 text-accent" />}
							{s.label}
						</dt>
						<dd className="tabular mt-1 truncate text-h2 font-bold text-sumi lg:text-h2-pc">{s.value}</dd>
						{s.note && <dd className="mt-0.5 truncate text-small text-ink-weak lg:text-small-pc">{s.note}</dd>}
					</div>
				);
			})}
		</dl>
	);
}
