import Image from 'next/image';
import Link from 'next/link';
import type { PropertySummary } from '@/types/property';
import { badgesFor } from '@/lib/badges';
import { builtLabel, mainPrice, sqmLabel, walkLabel } from '@/lib/format';
import { Badge } from '@/components/property/Badge';

/**
 * 物件カード(03 §6 v0.5)。全幅で縦型1種類(画像上・文字下)。列数は一覧側のグリッドで変える。
 * 情報順:1 写真 3:2(バッジ左上・最大2)→ 2 家賃/価格(最大)→ 3 間取り・面積 → 4 最寄駅と徒歩 → 5 築年 → 6 物件名(最小・灰)
 * 管理費・階は詳細ページのみ(index.json に持たない)。成約済みは 60%。
 */
export function PropertyCard({
	p,
	stationName,
	now,
	priority = false,
}: {
	p: PropertySummary;
	stationName: (slug: string) => string;
	now: Date;
	/** 並び替え後の先頭2枚は eager(J-033) */
	priority?: boolean;
}) {
	const badges = badgesFor(p, now);
	const sold = p.status === 'sold';
	const st = p.stations[0];
	const built = builtLabel(p.builtYm, now);

	return (
		<article className={`overflow-hidden rounded-hr border border-line bg-surface ${sold ? 'opacity-60' : ''}`}>
			<Link href={`/properties/${p.no}`} className="block">
				<div className="relative aspect-[3/2] bg-surface-alt">
					{p.thumb ? (
						// プレースホルダー SVG は next/image の最適化を通らないため unoptimized
						<Image
							src={p.thumb}
							alt=""
							fill
							sizes="(min-width: 64rem) 400px, (min-width: 48rem) 50vw, 100vw"
							className="object-cover"
							unoptimized
							priority={priority}
							loading={priority ? 'eager' : 'lazy'}
						/>
					) : (
						<div className="flex h-full items-center justify-center text-small text-ink-weak">写真準備中</div>
					)}
					{badges.length > 0 && (
						<div className="absolute top-2 left-2 flex gap-1">
							{badges.map((b) => (
								<Badge key={b} kind={b} />
							))}
						</div>
					)}
				</div>
				<div className="p-3 lg:p-4">
					<p className="tabular text-price-card font-bold text-sumi lg:text-price-card-pc">{mainPrice(p)}</p>
					<p className="mt-1 text-small">
						{p.layout || (p.kind === 'land' ? '土地' : '—')} / {sqmLabel(p.areaSqm)}
					</p>
					{st && (
						<p className="text-small">
							{stationName(st.slug)}駅 {walkLabel(st.walk)}
						</p>
					)}
					{built && <p className="text-small text-ink-weak">{built}</p>}
					<p className="mt-2 truncate text-xs text-ink-weak lg:text-xs-pc">{p.title}</p>
				</div>
			</Link>
		</article>
	);
}
