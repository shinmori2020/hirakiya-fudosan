import Image from 'next/image';
import Link from 'next/link';
import type { PropertySummary } from '@/types/property';
import { mainPrice, sqmLabel, walkLabel } from '@/lib/format';

/**
 * 物件の小カード(03 §6・J-147)。**トップの FV の左下だけ**で使う。
 * 左に写真(3:2・幅 96)、右に 家賃 / 価格 → 間取り / 面積 → 駅 徒歩分 の3行。
 * 一覧カード(PropertyCard・7項目)の縮小ではなく、探す段階で効く3つだけを出す別部品。
 * バッジ・種目ラベル・写真枚数・タグ・物件名・町は出さない(物件名は詳細で読む)。
 * 写真はこの制作ではプレースホルダー SVG のまま(J-131)。next/image の最適化を通らないので unoptimized。
 */
export function PropertyCardMini({ p, stationName }: { p: PropertySummary; stationName: (slug: string) => string }) {
	const st = p.stations[0];
	return (
		<Link href={`/properties/${p.no}`} className="flex gap-2 rounded-hr border border-line bg-surface p-2 transition-colors duration-150 hover:bg-badge-new-bg motion-reduce:transition-none">
			<div className="relative aspect-[3/2] w-24 shrink-0 overflow-hidden rounded-hr bg-surface-alt">
				{p.thumb ? (
					<Image src={p.thumb} alt="" fill sizes="96px" className="object-cover" unoptimized />
				) : (
					<div className="flex h-full items-center justify-center text-xs text-ink-weak">写真準備中</div>
				)}
			</div>
			<div className="min-w-0">
				<p className="tabular text-small font-bold text-sumi">{mainPrice(p)}</p>
				<p className="truncate text-small text-ink">
					{p.layout || (p.kind === 'land' ? '土地' : '—')} / {sqmLabel(p.areaSqm)}
				</p>
				{st && (
					<p className="truncate text-small text-ink-weak">
						{stationName(st.slug)}駅 {walkLabel(st.walk)}
					</p>
				)}
			</div>
		</Link>
	);
}
