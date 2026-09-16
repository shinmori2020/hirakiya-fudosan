'use client';

import { ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { attrClass } from '@/components/property/AttrLink';
import type { TargetPropertyFields } from '@/lib/target-property';

/** page.tsx が index.json から渡す項目(表示用。Action は ID から読み直す) */
export interface PropertyOption extends TargetPropertyFields {
	no: string;
	title: string;
	priceLabel: string;
	thumb: string | null;
	type: 'rental' | 'sale';
	sold: boolean;
}

/** 要約の名前の対応表(区+町 / 駅名)。page.tsx がタクソノミーから作って渡す */
export interface PropertyNames {
	areaLabels: Record<string, string>;
	stationNames: Record<string, string>;
}

const SECONDARY = 'flex h-12 w-full items-center justify-center rounded-hr border border-sumi bg-surface text-body font-medium text-sumi hover:bg-surface-alt lg:h-11 lg:text-body-pc';

/**
 * フォームページの右カラム「対象物件」(03 §7 フォームページ・J-103 → 密度は J-104)。表示専用の部品で、
 * /viewing と /contact が同じものを使う(一覧カードと同じ扱いの「表示部品」。フォームの UI・Action は別実装のまま・J-105)。
 * 骨格は物件の有無で変えない:枠は必ず出し、中身だけを 物件 / 指定なし / 成約済み で替える。
 * 物件ありは詳細の右カラムと同じ密度:写真 3:2 → 価格・物件名・番号 → 要約(J-068 の規則・最終行の下にも線)→「物件ページに戻る」。
 */
export function TargetProperty({
	property,
	sold,
	rows,
	emptyNote,
}: {
	property: PropertyOption | null;
	sold: boolean;
	rows: { label: string; value: string }[];
	/** 物件が無い時に添える案内(/contact は物件ページからの入り方を示す・J-105 ②)。成約済みには出さない */
	emptyNote?: string;
}) {
	return (
		<section aria-labelledby="target-property" className="rounded-hr border border-line bg-surface p-4 lg:p-6">
			<h2 id="target-property" className="text-h3 font-bold text-sumi lg:text-h3-pc">
				対象物件
			</h2>
			{property ? (
				<>
					<div className="relative mt-3 aspect-[3/2] w-full overflow-hidden rounded-hr bg-surface-alt">
						{property.thumb ? (
							<Image src={property.thumb} alt={`${property.title} の写真`} fill sizes="(min-width: 64rem) 480px, 100vw" unoptimized className="object-cover" />
						) : (
							<div className="flex h-full items-center justify-center text-body text-ink-weak lg:text-body-pc">写真準備中</div>
						)}
					</div>
					<p className="tabular mt-3 text-price-card font-bold text-sumi lg:text-price-card-pc">{property.priceLabel}</p>
					<p className="mt-1 text-small text-ink">{property.title}</p>
					<p className="tabular text-xs text-ink-weak lg:text-xs-pc">{property.no}</p>
					{rows.length > 0 && (
						<dl className="mt-4">
							{rows.map((r) => (
								<div key={r.label} className="flex border-b border-line py-2">
									<dt className="w-[6.5em] shrink-0 text-small text-ink-weak">{r.label}</dt>
									<dd className="min-w-0 text-small text-ink">{r.value}</dd>
								</div>
							))}
						</dl>
					)}
					<p className="mt-4">
						<Link href={`/properties/${property.no}`} className={`${attrClass('text')} inline-flex items-center gap-1 text-small`}>
							<ArrowLeft size={16} aria-hidden="true" />
							物件ページに戻る
						</Link>
					</p>
				</>
			) : (
				<>
					<p className="mt-3 text-body text-ink lg:text-body-pc">{sold ? 'この物件は成約しています。物件を指定しないお問い合わせとして受け付けます。' : '物件を指定せずに送ります。'}</p>
					{!sold && emptyNote && <p className="mt-2 text-small text-ink-weak">{emptyNote}</p>}
					<Link href="/properties" className={`${SECONDARY} mt-4`}>
						物件を探す
					</Link>
				</>
			)}
		</section>
	);
}
