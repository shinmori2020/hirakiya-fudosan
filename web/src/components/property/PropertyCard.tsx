import Image from 'next/image';
import Link from 'next/link';
import { Camera } from 'lucide-react';
import type { PropertySummary } from '@/types/property';
import { badgesFor } from '@/lib/badges';
import { cardTags } from '@/lib/card-tags';
import { builtLabel, feeLabel, mainPrice, sqmLabel, walkLabel } from '@/lib/format';
import { Badge } from '@/components/property/Badge';

/**
 * 物件カード(03 §6 v0.20・J-033 → J-046)。全幅で縦型1種類(画像上・文字下)。列数は一覧側のグリッドで変える。
 * 情報順(J-046):
 *   1 写真 3:2(左上バッジ最大2 / 左下 種目ラベル / 右下 写真枚数)
 *   2 家賃(+管理費・賃貸のみ)/ 価格 — 最大
 *   3 間取り / 面積 / 階(戸建・土地は階なし)
 *   4 最寄1駅目と徒歩分(2駅目は出さない)
 *   5 築年
 *   6 カテゴリータグ 最大2(J-044・押せない。0なら行なし)
 *   7 物件名 + 区・町(最小・灰)
 * 成約済みは 60%。
 */
export function PropertyCard({
	p,
	stationName,
	now,
	priority = false,
	kindName,
	areaLabel,
	tagNames,
}: {
	p: PropertySummary;
	stationName: (slug: string) => string;
	now: Date;
	/** 並び替え後の先頭2枚は eager(J-033) */
	priority?: boolean;
	/** 種目の表示名(画像左下・J-046)。省略時は出さない */
	kindName?: (slug: string) => string;
	/** 「墨田区曳舟」(J-046)。省略時は出さない */
	areaLabel?: (slug: string) => string;
	/** カテゴリータグの表示名(J-044)。省略時はタグ行を出さない */
	tagNames?: { collectionName: (slug: string) => string; featureName: (slug: string) => string };
}) {
	const badges = badgesFor(p, now);
	const sold = p.status === 'sold';
	const st = p.stations[0];
	const built = builtLabel(p.builtYm, now);
	const tags = tagNames ? cardTags(p, tagNames) : [];
	// 階は建物のあるものだけ(戸建・土地は出さない)
	const showFloor = p.floor != null && (p.kind === 'mansion' || p.kind === 'apartment');
	const overlay = 'rounded-hr bg-sumi/70 px-1.5 py-0.5 text-xs text-white lg:text-xs-pc';

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
					{/* 画像内ラベル(J-046):左下 種目 / 右下 写真枚数。本物の写真に載る前提で薄い墨の半透明地 */}
					{kindName && <span className={`absolute bottom-2 left-2 ${overlay}`}>{kindName(p.kind)}</span>}
					<span className={`absolute right-2 bottom-2 flex items-center gap-1 ${overlay}`}>
						{p.photoCount > 0 ? (
							<>
								<Camera size={12} aria-hidden="true" />
								<span className="tabular">{p.photoCount}枚</span>
							</>
						) : (
							<span>{p.hasFloorplan ? '間取り図のみ' : '写真準備中'}</span>
						)}
					</span>
				</div>
				<div className="p-3 lg:p-4">
					<p className="flex flex-wrap items-baseline gap-x-2">
						<span className="tabular text-price-card font-bold text-sumi lg:text-price-card-pc">{mainPrice(p)}</span>
						{p.type === 'rental' && (
							<span className="text-xs text-ink-weak lg:text-xs-pc">
								管理費 {p.maintenanceFee != null && p.maintenanceFee > 0 ? feeLabel(p.maintenanceFee) : 'なし'}
							</span>
						)}
					</p>
					<p className="mt-1 text-small">
						{p.layout || (p.kind === 'land' ? '土地' : '—')} / {sqmLabel(p.areaSqm)}
						{showFloor ? ` / ${p.floor}階` : ''}
					</p>
					{st && (
						<p className="text-small">
							{stationName(st.slug)}駅 {walkLabel(st.walk)}
						</p>
					)}
					{built && <p className="text-small text-ink-weak">{built}</p>}
					{/*
					 * カテゴリータグ(J-044):押せない表示専用。0なら中身を出さない。
					 * ただし枠(min-h)は残し、タグあり・なしでカードの高さが1行分以上ずれないようにする(J-046 の制約)。
					 */}
					<ul className="mt-2 flex min-h-6 flex-wrap gap-1" aria-label="この物件の特徴">
						{tags.map((t) => (
							<li key={t} className="rounded-hr border border-line bg-surface-alt px-1.5 py-0.5 text-xs text-ink-weak lg:text-xs-pc">
								{t}
							</li>
						))}
					</ul>
					<p className="mt-2 truncate text-xs text-ink-weak lg:text-xs-pc">
						{p.title}
						{areaLabel && <span className="ml-1">{areaLabel(p.area)}</span>}
					</p>
				</div>
			</Link>
		</article>
	);
}
