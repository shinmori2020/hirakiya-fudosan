'use client';

import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import type { Term } from '@/types/property';
import { lines as LINES, serviceAreas } from '@/config/site';
import { formatPrice, formatRent } from '@/config/site';
import { BUILT_STEPS, LAYOUTS, PRICE_STEPS, RENT_STEPS, SQM_STEPS, WALK_STEPS, type FixedCondition, type SearchQuery } from '@/lib/search';
import { Chip } from '@/components/search/Chip';
import { attrClass } from '@/components/property/AttrLink';

export interface TermMaps {
	area: Term[];
	station: Term[];
	feature: Term[];
	kind: Term[];
	collection: Term[];
}

/**
 * 設備の表示順(02 §2 の並び)。REST は名前順で返るのでここで並べ直す。先頭 FEATURE_TOP 件を常時表示、残りは「もっと見る」(J-034 C)
 */
const FEATURE_ORDER = [
	'pet-ok',
	'autolock',
	'parking',
	'delivery-box',
	'separate-bath',
	'washstand',
	'reheating',
	'aircon',
	'south-facing',
	'corner-room',
	'upper-floor',
	'zero-deposit',
	'move-in-now',
	'instrument-ok',
	'office-ok',
];
const FEATURE_TOP = 6;

/**
 * 絞り込みパネル(01 §2-2・J-033・J-034・J-035)。
 * 制御コンポーネント:value / onChange。PC は左サイドで即時反映、スマホはドロワーで下書き → 適用。
 * 構成(PC・ドロワー共通・J-034 A):常時表示 = エリア / 駅 / 家賃or価格 / 間取りor種目。
 * 「詳細条件」(details・初期は閉・選択中の件数を見出しに)= 駅徒歩 / 築年数 / 面積 / 設備・条件。折りたたみの状態は URL に入れない。
 * 駅は沿線6本でグループ化(config/site.ts の lines 順)。複数路線の駅は最初の路線にだけ置く(J-034 B・重複なし)。
 * 駅徒歩・設備は売買にも出す(J-042・J-043)。設備はその種別に該当のあるものだけ(availableFeatures・02 §4)。
 * 文字サイズ(J-035):項目は 小 13px、区名・沿線名は 最小 11/12px、見出しは H3。
 *
 * 条件固定の一覧(J-095 判断4・初案「固定として表示し、変更不可」):
 *   エリア固定 = エリアの区分を「青戸(このページの条件)」+ 入口へのリンクに置き換える。駅の区分はそのまま
 *   駅固定   = 駅の区分を同じ形に置き換える。エリアの区分はそのまま
 *   沿線固定 = 駅の区分をその沿線の駅だけにし、沿線名の下に固定の注記。J-034 の「最初の沿線にだけ置く」は沿線が1本なので効かない
 *   特集固定 = 左カラムに特集は無いので変えない(クイックタブ側でそのタブを消す)
 */
export function FilterPanel({
	value: q,
	onChange,
	terms,
	availableFeatures,
	fixed,
}: {
	value: SearchQuery;
	onChange: (q: SearchQuery) => void;
	terms: TermMaps;
	/** その種別に1件以上ある設備の slug(J-043・データ判定)。省略時は全設備 */
	availableFeatures?: readonly string[];
	fixed?: FixedCondition;
}) {
	const toggle = (key: 'area' | 'station' | 'layout' | 'feature' | 'kind', v: string) => {
		const cur = q[key];
		onChange({ ...q, [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
	};
	const setNum = (key: 'rentMin' | 'rentMax' | 'priceMin' | 'priceMax' | 'walkMax' | 'builtMaxYears' | 'sqmMin', v: string) =>
		onChange({ ...q, [key]: v === '' ? undefined : Number(v) });
	const areaSlugByName = (name: string) => terms.area.find((t) => t.slug === name || (t.name === name && t.parent))?.slug;

	// 固定条件の表示名(エリア = 区+町 / 駅 = 駅名+駅 / 沿線 = 沿線名)
	const fixedName = (() => {
		if (!fixed) return '';
		if (fixed.key === 'area') {
			const town = terms.area.find((t) => t.slug === fixed.slug);
			const ward = town?.parent ? terms.area.find((t) => t.slug === town.parent) : undefined;
			return town ? `${ward?.name ?? ''}${town.name}` : fixed.slug;
		}
		if (fixed.key === 'station') return `${terms.station.find((t) => t.slug === fixed.slug)?.name ?? fixed.slug}駅`;
		if (fixed.key === 'line') return LINES.find((l) => l.slug === fixed.slug)?.name ?? fixed.slug;
		return '';
	})();

	// 駅を沿線でグループ化。複数路線の駅は lines 順で最初の路線にだけ置く(J-034 B)。沿線固定ならその沿線だけ
	const placed = new Set<string>();
	const stationGroups = LINES.filter((line) => fixed?.key !== 'line' || line.slug === fixed.slug).map((line) => ({
		line,
		items: terms.station.filter((t) => {
			if (placed.has(t.slug)) return false;
			if (!String(t.meta.lines ?? '').split(',').includes(line.slug)) return false;
			placed.add(t.slug);
			return true;
		}),
	})).filter((g) => g.items.length > 0);

	// 設備:02 §2 の順に並べ、上位6つ+「もっと見る」(J-034 C)
	const features = [...terms.feature]
		.filter((t) => !availableFeatures || availableFeatures.includes(t.slug))
		.sort((a, b) => {
		const ia = FEATURE_ORDER.indexOf(a.slug);
		const ib = FEATURE_ORDER.indexOf(b.slug);
			return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
		});
	const [moreFeatures, setMoreFeatures] = useState(false);
	const hiddenSelected = features.slice(FEATURE_TOP).filter((t) => q.feature.includes(t.slug)).length;
	const visibleFeatures = moreFeatures ? features : features.slice(0, FEATURE_TOP);

	const advancedCount = [q.walkMax, q.builtMaxYears, q.sqmMin].filter((v) => v != null).length + q.feature.length;

	return (
		<div className="space-y-6">
			<Group title="エリア">
				{fixed?.key === 'area' ? (
					<Fixed name={fixedName} href="/area" linkLabel="他のエリアから探す" />
				) : (
					serviceAreas.map((w) => (
					<div key={w.ward} className="mb-3 last:mb-0">
						<p className="mb-1 text-xs text-ink-weak lg:text-xs-pc">{w.ward}</p>
						<div className="flex flex-wrap gap-x-3 gap-y-2">
							{w.towns.map((town) => {
								const slug = areaSlugByName(town);
								if (!slug) return null;
								return <Check key={slug} label={town} checked={q.area.includes(slug)} onChange={() => toggle('area', slug)} />;
							})}
						</div>
					</div>
					))
				)}
			</Group>

			{/* 駅はチップ(トグルボタン)。沿線ごとに横流し。選択中は青緑の塗り、未選択は枠のみ(J-034) */}
			<Group title="駅">
				{fixed?.key === 'station' ? (
					<Fixed name={fixedName} href="/line" linkLabel="他の沿線・駅から探す" />
				) : (
					stationGroups.map((g) => (
						<div key={g.line.slug} className="mb-3 last:mb-0">
							<p className="mb-1 text-xs text-ink-weak lg:text-xs-pc">
								{g.line.name}
								{fixed?.key === 'line' && <span className="ml-1">(このページの条件)</span>}
							</p>
							<div className="flex flex-wrap gap-x-1 gap-y-2">
								{g.items.map((t) => (
									<Chip key={t.slug} label={t.name} pressed={q.station.includes(t.slug)} onClick={() => toggle('station', t.slug)} />
								))}
							</div>
							{fixed?.key === 'line' && (
								<p className="mt-2">
									<Link href="/line" className={`${attrClass('text')} text-small`}>
										他の沿線・駅から探す
									</Link>
								</p>
							)}
						</div>
					))
				)}
			</Group>

			{q.type === 'rental' ? (
				<Group title="家賃">
					<div className="flex items-center gap-2">
						<Select value={q.rentMin} onChange={(v) => setNum('rentMin', v)} blank="下限なし" options={RENT_STEPS.map((n) => [n, formatRent(n)])} />
						<span className="text-small text-ink-weak">〜</span>
						<Select value={q.rentMax} onChange={(v) => setNum('rentMax', v)} blank="上限なし" options={RENT_STEPS.map((n) => [n, formatRent(n)])} />
					</div>
				</Group>
			) : (
				<Group title="価格">
					<div className="flex items-center gap-2">
						<Select value={q.priceMin} onChange={(v) => setNum('priceMin', v)} blank="下限なし" options={PRICE_STEPS.map((n) => [n, formatPrice(n)])} />
						<span className="text-small text-ink-weak">〜</span>
						<Select value={q.priceMax} onChange={(v) => setNum('priceMax', v)} blank="上限なし" options={PRICE_STEPS.map((n) => [n, formatPrice(n)])} />
					</div>
				</Group>
			)}

			{q.type === 'rental' ? (
				<Group title="間取り">
					<div className="flex flex-wrap gap-x-3 gap-y-2">
						{LAYOUTS.map((l) => (
							<Check key={l} label={l} checked={q.layout.includes(l)} onChange={() => toggle('layout', l)} />
						))}
					</div>
				</Group>
			) : (
				<Group title="種目">
					<div className="flex flex-wrap gap-x-3 gap-y-2">
						{terms.kind
							.filter((k) => ['mansion', 'house', 'land'].includes(k.slug))
							.map((k) => (
								<Check key={k.slug} label={k.name} checked={q.kind.includes(k.slug)} onChange={() => toggle('kind', k.slug)} />
							))}
					</div>
				</Group>
			)}

			{/* 詳細条件(PC・ドロワー共通)。初期は閉。選択中の件数を見出しに出す。開閉は J-031 のトランジション(hr-accordion) */}
			<details className="hr-accordion group border-t border-line pt-4">
				<summary className="flex cursor-pointer list-none items-center justify-between text-h3 font-bold text-sumi lg:text-h3-pc [&::-webkit-details-marker]:hidden">
					<span>
						詳細条件
						{advancedCount > 0 && <span className="tabular ml-2 text-small font-normal text-ink-weak">({advancedCount})</span>}
					</span>
					<ChevronDown size={20} aria-hidden="true" className="text-ink-weak transition-transform duration-200 group-open:rotate-180" />
				</summary>
				<div className="space-y-6 pt-4">
					{/* 駅徒歩・設備は売買にも出す(J-042・クイックタブと連動させるため) */}
					<Group title="駅徒歩">
						<Select value={q.walkMax} onChange={(v) => setNum('walkMax', v)} blank="指定なし" options={WALK_STEPS.map((n) => [n, `${n}分以内`])} />
					</Group>
					<Group title="築年数">
						<Select value={q.builtMaxYears} onChange={(v) => setNum('builtMaxYears', v)} blank="指定なし" options={BUILT_STEPS.map((n) => [n, `${n}年以内`])} />
					</Group>
					<Group title="面積">
						<Select value={q.sqmMin} onChange={(v) => setNum('sqmMin', v)} blank="指定なし" options={SQM_STEPS.map((n) => [n, `${n}㎡以上`])} />
					</Group>
					{(
						<Group title="設備・条件">
							<div className="flex flex-wrap gap-x-3 gap-y-2">
								{visibleFeatures.map((t) => (
									<Check key={t.slug} label={t.name} checked={q.feature.includes(t.slug)} onChange={() => toggle('feature', t.slug)} />
								))}
							</div>
							{features.length > FEATURE_TOP && (
								<button
									type="button"
									onClick={() => setMoreFeatures((v) => !v)}
									aria-expanded={moreFeatures}
									className="mt-2 flex h-8 cursor-pointer items-center gap-1 text-small text-accent-strong underline"
								>
									{moreFeatures ? '閉じる' : `もっと見る(他 ${features.length - FEATURE_TOP} 件${hiddenSelected > 0 ? `・選択中 ${hiddenSelected}` : ''})`}
									<ChevronDown size={16} aria-hidden="true" className={`transition-transform duration-200 ${moreFeatures ? 'rotate-180' : ''}`} />
								</button>
							)}
						</Group>
					)}
				</div>
			</details>
		</div>
	);
}

/**
 * 固定条件の表示(J-095 判断4)。チェック・チップの代わりに「このページの条件」として名前を出し、変えたい人は入口ページへ。
 * 文字は項目と同じ 小 13px。リンクは押せる文字(J-052 → J-096 で一覧側にも適用)
 */
function Fixed({ name, href, linkLabel }: { name: string; href: string; linkLabel: string }) {
	return (
		<div className="text-small">
			<p className="font-bold text-sumi">
				{name}
				<span className="ml-1 font-normal text-ink-weak">(このページの条件)</span>
			</p>
			<p className="mt-2">
				<Link href={href} className={attrClass('text')}>
					{linkLabel}
				</Link>
			</p>
		</div>
	);
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<fieldset>
			<legend className="mb-2 text-h3 font-bold text-sumi lg:text-h3-pc">{title}</legend>
			{children}
		</fieldset>
	);
}

/** チェックボックスは項目文字(小 13px)と同じ高さ(J-035 条件追加)。色・角丸はブラウザ既定+accent のまま。
 *  hover / active で枠を一段濃く見せる(native の border は CSS で変えられないため、同位置に 1px の outline を重ねる。focus-visible の輪郭は変えない) */
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
	return (
		<label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-hr text-small transition-[background-color] duration-150 motion-reduce:transition-none hover:bg-badge-new-bg active:bg-badge-new-bg lg:min-h-0">
			<input
				type="checkbox"
				checked={checked}
				onChange={onChange}
				className="size-[13px] cursor-pointer accent-accent transition-[outline-color] duration-150 outline-1 -outline-offset-1 outline-transparent motion-reduce:transition-none [&:hover:not(:focus-visible)]:outline-ink-weak [&:active:not(:focus-visible)]:outline-ink-weak"
			/>
			{label}
		</label>
	);
}

/** 絞り込み欄のセレクト:13px・高さ 40(スマホ)/ 32(PC)・余白 8。チップと同じ寸法(J-035 条件追加)。並び替えのセレクトは別(SearchResults) */
function Select({
	value,
	onChange,
	blank,
	options,
}: {
	value?: number;
	onChange: (v: string) => void;
	blank: string;
	options: (readonly [number, string])[];
}) {
	return (
		<select
			value={value ?? ''}
			onChange={(e) => onChange(e.target.value)}
			className="h-10 w-full cursor-pointer rounded-hr border border-line bg-surface px-2 text-small transition-[border-color,background-color] duration-150 motion-reduce:transition-none hover:border-ink-weak hover:bg-badge-new-bg active:border-ink-weak active:bg-badge-new-bg focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent lg:h-8"
		>
			<option value="">{blank}</option>
			{options.map(([v, label]) => (
				<option key={v} value={v}>
					{label}
				</option>
			))}
		</select>
	);
}
