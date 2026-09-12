import { AttrLink } from '@/components/property/AttrLink';
import { featureHref } from '@/lib/links';
import type { PropertyType } from '@/types/property';

/**
 * 設備のチップ(J-052 の押せるチップ)。各チップはその設備で絞った一覧へのリンク(J-051)。
 * J-074:物件概要の先頭から右カラム(スペックの下・要約の上)へ移した。
 * 右カラムでは見出しを置かず、チップだけを並べる(「ペット可」「オートロック」など単語で意味が分かるため)。
 * 読み上げ用にリスト自体へ aria-label="設備" を付ける。
 */
export function FeatureChips({ features, type, featureName }: { features: string[]; type: PropertyType; featureName: (slug: string) => string }) {
	if (features.length === 0) return null;
	return (
		<ul className="flex flex-wrap gap-x-1 gap-y-2" aria-label="設備">
			{features.map((f) => (
				<li key={f}>
					<AttrLink href={featureHref(type, f)} variant="chip">
						{featureName(f)}
					</AttrLink>
				</li>
			))}
		</ul>
	);
}
