'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LAYOUTS, PRICE_STEPS, RENT_STEPS } from '@/lib/search';
import { homeSearchHref } from '@/lib/home';
import { formatPrice, formatRent } from '@/config/site';
import type { PropertyType } from '@/types/property';

/**
 * トップの検索フォーム(01 §1-1・実装順 3・J-056)。これは初案。
 * 賃貸 = エリア / 駅 / 家賃上限 / 間取り の4項目。スマホ(〜767)は間取りを出さず3項目(J-056)。
 * 売買 = エリア / 価格上限 / 種目 の3項目。
 * 賃貸・売買はタブで切り替え、送信先はどちらも /properties。
 * 素の <form method="get" action="/properties"> なので JavaScript 無しでも動く。
 * JavaScript がある時だけ onSubmit で lib/home.ts の homeSearchHref を使い、空欄を落とした短い URL に置き換える。
 * 駅は沿線6本を optgroup にした単一のセレクト(エリアとは連動しない・SHIN 確定 09/12)。
 * 複数路線の駅は沿線の並び順で最初の1本にだけ置く(一覧の左カラム・J-034 B と同じ)。
 */
export interface StationGroup {
	lineSlug: string;
	lineName: string;
	stations: { slug: string; name: string }[];
}

export function HomeSearch({
	areas,
	stationGroups,
	kinds,
}: {
	/** 区でまとめた町(表示順は config の serviceAreas 順) */
	areas: { ward: string; towns: { slug: string; name: string }[] }[];
	stationGroups: StationGroup[];
	kinds: { slug: string; name: string }[];
}) {
	const [type, setType] = useState<PropertyType>('rental');
	const router = useRouter();
	const rental = type === 'rental';

	function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const f = new FormData(e.currentTarget);
		const v = (k: string) => String(f.get(k) ?? '');
		router.push(
			homeSearchHref(type, {
				area: v('area'),
				station: v('station'),
				rentMax: v('rent_max'),
				layout: v('layout'),
				priceMax: v('price_max'),
				kind: v('kind'),
			}),
		);
	}

	return (
		<div className="rounded-hr border border-line bg-surface p-4 lg:p-6">
			{/* 賃貸・売買のタブ(01 §1 の判断ポイント。別フォームにせず1つのフォームを切り替える) */}
			<div role="tablist" aria-label="物件の種別" className="flex gap-2">
				{(['rental', 'sale'] as const).map((t) => (
					<button
						key={t}
						type="button"
						role="tab"
						aria-selected={type === t}
						onClick={() => setType(t)}
						className={`h-10 flex-1 cursor-pointer rounded-hr border text-body font-bold transition-colors duration-150 motion-reduce:transition-none lg:h-9 lg:flex-none lg:px-6 lg:text-body-pc ${
							type === t ? 'border-accent bg-accent text-white' : 'border-line bg-surface text-ink hover:bg-badge-new-bg'
						}`}
					>
						{t === 'rental' ? '賃貸' : '売買'}
					</button>
				))}
			</div>

			<form action="/properties" method="get" onSubmit={onSubmit} className="mt-4">
				{!rental && <input type="hidden" name="type" value="sale" />}
				<div className={`grid gap-3 ${rental ? 'lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]' : 'lg:grid-cols-[repeat(3,minmax(0,1fr))_auto]'}`}>
					<Field label="エリア">
						<select name="area" className={selectClass} defaultValue="">
							<option value="">指定しない</option>
							{areas.map((w) => (
								<optgroup key={w.ward} label={w.ward}>
									{w.towns.map((t) => (
										<option key={t.slug} value={t.slug}>
											{t.name}
										</option>
									))}
								</optgroup>
							))}
						</select>
					</Field>

					{rental && (
						<Field label="駅">
							<select name="station" className={selectClass} defaultValue="">
								<option value="">指定しない</option>
								{stationGroups.map((g) => (
									<optgroup key={g.lineSlug} label={g.lineName}>
										{g.stations.map((s) => (
											<option key={s.slug} value={s.slug}>
												{s.name}駅
											</option>
										))}
									</optgroup>
								))}
							</select>
						</Field>
					)}

					{rental ? (
						<Field label="家賃(上限)">
							<select name="rent_max" className={selectClass} defaultValue="">
								<option value="">指定しない</option>
								{RENT_STEPS.map((v) => (
									<option key={v} value={v}>
										{formatRent(v)}以下
									</option>
								))}
							</select>
						</Field>
					) : (
						<Field label="価格(上限)">
							<select name="price_max" className={selectClass} defaultValue="">
								<option value="">指定しない</option>
								{PRICE_STEPS.map((v) => (
									<option key={v} value={v}>
										{formatPrice(v)}以下
									</option>
								))}
							</select>
						</Field>
					)}

					{rental ? (
						// スマホでは4つ目を出さない(J-056:3項目に留め、駅を足す判断を優先した)
						<Field label="間取り" className="hidden lg:block">
							<select name="layout" className={selectClass} defaultValue="">
								<option value="">指定しない</option>
								{LAYOUTS.map((v) => (
									<option key={v} value={v}>
										{v}
									</option>
								))}
							</select>
						</Field>
					) : (
						<Field label="種目">
							<select name="kind" className={selectClass} defaultValue="">
								<option value="">指定しない</option>
								{kinds.map((k) => (
									<option key={k.slug} value={k.slug}>
										{k.name}
									</option>
								))}
							</select>
						</Field>
					)}

					<button
						type="submit"
						className="h-12 cursor-pointer rounded-hr bg-accent px-6 text-body font-bold text-white transition-colors duration-150 hover:bg-accent-strong motion-reduce:transition-none lg:h-10 lg:self-end lg:text-body-pc"
					>
						この条件で探す
					</button>
				</div>
			</form>
		</div>
	);
}

/** 絞り込み欄のセレクトと同じ寸法・同じ hover(03 §6・J-035) */
const selectClass =
	'h-12 w-full cursor-pointer rounded-hr border border-line bg-surface px-2 text-body transition-[border-color,background-color] duration-150 motion-reduce:transition-none hover:border-ink-weak hover:bg-badge-new-bg focus:border-accent focus:ring-2 focus:ring-accent focus:outline-none lg:h-10 lg:text-body-pc';

function Field({ label, className = '', children }: { label: string; className?: string; children: React.ReactNode }) {
	return (
		<label className={`block ${className}`}>
			<span className="mb-1 block text-small text-ink-weak">{label}</span>
			{children}
		</label>
	);
}
