'use client';

import { ChevronDown } from 'lucide-react';
import type { Term } from '@/types/property';
import { lines as LINES, serviceAreas } from '@/config/site';
import { formatPrice, formatRent } from '@/config/site';
import { BUILT_STEPS, LAYOUTS, PRICE_STEPS, RENT_STEPS, SQM_STEPS, WALK_STEPS, type SearchQuery } from '@/lib/search';

export interface TermMaps {
	area: Term[];
	station: Term[];
	feature: Term[];
	kind: Term[];
}

/**
 * 絞り込みパネル(01 §2-2・J-033)。
 * 制御コンポーネント:value / onChange。PC は左サイドで即時反映、スマホはドロワーで下書き → 適用。
 * 上4つ(エリア / 駅 / 家賃or価格 / 間取りor種目)+ 詳細条件(駅徒歩 / 築年 / 面積 / 設備)。
 * 文字サイズ(J-035):項目は 小 13px(本文より1段下)、区名・沿線名は 最小 11/12px、「エリア」「駅」の見出しは H3 のまま。
 * collapseAdvanced(スマホ)では詳細条件を折りたたむ。駅は沿線6本でグループ化(config/site.ts の lines 順)。
 */
export function FilterPanel({
	value: q,
	onChange,
	terms,
	collapseAdvanced = false,
}: {
	value: SearchQuery;
	onChange: (q: SearchQuery) => void;
	terms: TermMaps;
	collapseAdvanced?: boolean;
}) {
	const toggle = (key: 'area' | 'station' | 'layout' | 'feature' | 'kind', v: string) => {
		const cur = q[key];
		onChange({ ...q, [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
	};
	const setNum = (key: 'rentMin' | 'rentMax' | 'priceMin' | 'priceMax' | 'walkMax' | 'builtMaxYears' | 'sqmMin', v: string) =>
		onChange({ ...q, [key]: v === '' ? undefined : Number(v) });
	const areaSlugByName = (name: string) => terms.area.find((t) => t.slug === name || (t.name === name && t.parent))?.slug;

	// 駅を沿線でグループ化(config/site.ts の lines 順)。複数路線の駅は各路線に出す(重複表示は許容・J-034)
	const stationGroups = LINES.map((line) => ({
		line,
		items: terms.station.filter((t) => String(t.meta.lines ?? '').split(',').includes(line.slug)),
	})).filter((g) => g.items.length > 0);

	const advancedCount =
		[q.walkMax, q.builtMaxYears, q.sqmMin].filter((v) => v != null).length + (q.type === 'rental' ? q.feature.length : 0);

	const advanced = (
		<div className="space-y-6">
			{q.type === 'rental' && (
				<Group title="駅徒歩">
					<Select value={q.walkMax} onChange={(v) => setNum('walkMax', v)} blank="指定なし" options={WALK_STEPS.map((n) => [n, `${n}分以内`])} />
				</Group>
			)}
			<Group title="築年数">
				<Select value={q.builtMaxYears} onChange={(v) => setNum('builtMaxYears', v)} blank="指定なし" options={BUILT_STEPS.map((n) => [n, `${n}年以内`])} />
			</Group>
			<Group title="面積">
				<Select value={q.sqmMin} onChange={(v) => setNum('sqmMin', v)} blank="指定なし" options={SQM_STEPS.map((n) => [n, `${n}㎡以上`])} />
			</Group>
			{q.type === 'rental' && (
				<Group title="設備・条件">
					<div className="flex flex-wrap gap-x-4 gap-y-2">
						{terms.feature.map((t) => (
							<Check key={t.slug} label={t.name} checked={q.feature.includes(t.slug)} onChange={() => toggle('feature', t.slug)} />
						))}
					</div>
				</Group>
			)}
		</div>
	);

	return (
		<div className="space-y-6">
			<Group title="エリア">
				{serviceAreas.map((w) => (
					<div key={w.ward} className="mb-3 last:mb-0">
						<p className="mb-1 text-xs text-ink-weak lg:text-xs-pc">{w.ward}</p>
						<div className="flex flex-wrap gap-x-4 gap-y-2">
							{w.towns.map((town) => {
								const slug = areaSlugByName(town);
								if (!slug) return null;
								return <Check key={slug} label={town} checked={q.area.includes(slug)} onChange={() => toggle('area', slug)} />;
							})}
						</div>
					</div>
				))}
			</Group>

			{/* 駅はチップ(トグルボタン)。沿線ごとに横流し。選択中は青緑の塗り、未選択は枠のみ(J-034) */}
			<Group title="駅">
				{stationGroups.map((g) => (
					<div key={g.line.slug} className="mb-3 last:mb-0">
						<p className="mb-1 text-xs text-ink-weak lg:text-xs-pc">{g.line.name}</p>
						<div className="flex flex-wrap gap-2">
							{g.items.map((t) => (
								<Chip key={`${g.line.slug}-${t.slug}`} label={t.name} pressed={q.station.includes(t.slug)} onClick={() => toggle('station', t.slug)} />
							))}
						</div>
					</div>
				))}
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
					<div className="flex flex-wrap gap-x-4 gap-y-2">
						{LAYOUTS.map((l) => (
							<Check key={l} label={l} checked={q.layout.includes(l)} onChange={() => toggle('layout', l)} />
						))}
					</div>
				</Group>
			) : (
				<Group title="種目">
					<div className="flex flex-wrap gap-x-4 gap-y-2">
						{terms.kind
							.filter((k) => ['mansion', 'house', 'land'].includes(k.slug))
							.map((k) => (
								<Check key={k.slug} label={k.name} checked={q.kind.includes(k.slug)} onChange={() => toggle('kind', k.slug)} />
							))}
					</div>
				</Group>
			)}

			{collapseAdvanced ? (
				<details className="hr-accordion group border-t border-line pt-4">
					<summary className="flex cursor-pointer list-none items-center justify-between text-h3 font-bold text-sumi [&::-webkit-details-marker]:hidden">
						<span>
							詳細条件
							{advancedCount > 0 && <span className="tabular ml-2 text-small font-normal text-ink-weak">({advancedCount})</span>}
						</span>
						<ChevronDown size={20} aria-hidden="true" className="text-ink-weak transition-transform duration-200 group-open:rotate-180" />
					</summary>
					<div className="pt-4">{advanced}</div>
				</details>
			) : (
				advanced
			)}
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

/** チップ:角丸 6px(03 §5)・高さ 40(スマホ)/ 32(PC)・余白 8(J-035)。選択中は青緑の塗り+白文字、未選択は灰線の枠+墨文字 */
function Chip({ label, pressed, onClick }: { label: string; pressed: boolean; onClick: () => void }) {
	return (
		<button
			type="button"
			aria-pressed={pressed}
			onClick={onClick}
			data-chip
			className={`h-10 rounded-hr border px-2 text-small whitespace-nowrap transition-colors duration-150 lg:h-8 ${
				pressed ? 'border-accent bg-accent font-bold text-white' : 'border-line bg-surface text-ink hover:border-sumi'
			}`}
		>
			{label}
		</button>
	);
}

/** チェックボックスは項目文字(小 13px)と同じ高さ(J-035 条件追加)。色・角丸はブラウザ既定+accent のまま */
function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
	return (
		<label className="flex min-h-11 items-center gap-2 text-small lg:min-h-0">
			<input type="checkbox" checked={checked} onChange={onChange} className="size-[13px] accent-accent" />
			{label}
		</label>
	);
}

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
			className="h-[46px] w-full rounded-hr border border-line bg-surface px-3 text-small focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent"
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
