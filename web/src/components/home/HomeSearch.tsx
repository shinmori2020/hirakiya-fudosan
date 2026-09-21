'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { applyQuery, emptyQuery, LAYOUTS, PRICE_STEPS, RENT_STEPS, type SearchQuery } from '@/lib/search';
import type { PropertySummary } from '@/types/property';
import { homeSearchHref } from '@/lib/home';
import { formatPrice, formatRent } from '@/config/site';
import type { PropertyType } from '@/types/property';

/**
 * トップの検索フォーム(01 §1-1・実装順 3・J-056)。これは初案。
 * 賃貸 = エリア / 駅 / 家賃上限 / 間取り の4項目。スマホ(〜767)は間取りを出さず3項目(J-056)。
 * 並びは PC でも**1列の縦積み**(J-134 で2列 → J-135 で1列。FV の右 30% に置くため)。
 * 売買 = エリア / 価格上限 / 種目 の3項目。
 * 賃貸・売買はタブで切り替え、送信先はどちらも /properties。
 * 素の <form method="get" action="/properties"> なので JavaScript 無しでも動く。
 * **ボタンの件数(J-145)**:JavaScript 無し・水和前は「この条件で探す」。マウント後に applyQuery(一覧と同じ数え方・成約済みを含む)で
 * 「(◯件)」を付け、条件を変えるたびに更新する。0件でも送信は止めない(一覧の0件画面が緩和候補を出す・J-095)。
 * 03 v0.1 の「青緑ボタンに件数」が J-056 の素の GET で暗黙に外れていたのを戻した(J-142)。
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
	all,
	nowIso,
}: {
	/** 物件全件(index.json 相当)。件数の計算に使う(J-145) */
	all: PropertySummary[];
	nowIso: string;
	/** 区でまとめた町(表示順は config の serviceAreas 順) */
	areas: { ward: string; towns: { slug: string; name: string }[] }[];
	stationGroups: StationGroup[];
	kinds: { slug: string; name: string }[];
}) {
	const [type, setType] = useState<PropertyType>('rental');
	const router = useRouter();
	const rental = type === 'rental';
	const formRef = useRef<HTMLFormElement>(null);
	const now = useMemo(() => new Date(nowIso), [nowIso]);
	// 件数(J-145)。**水和前は出さない**(SSR と同じ HTML にするため)。mounted はサーバーで false・クライアントで true
	const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);
	// form の今の値(onChange で読む)。null = 何も選んでいない(タブ切替でリセット)
	const [formQuery, setFormQuery] = useState<SearchQuery | null>(null);
	const [flashKey, setFlashKey] = useState(0);
	const queryFromForm = (): SearchQuery => {
		const f = new FormData(formRef.current ?? undefined);
		const v = (k: string) => String(f.get(k) ?? '').trim();
		const q = emptyQuery(type);
		if (v('area')) q.area = [v('area')];
		if (rental) {
			if (v('station')) q.station = [v('station')];
			if (v('rent_max')) q.rentMax = Number(v('rent_max'));
			if (v('layout')) q.layout = [v('layout')];
		} else {
			if (v('price_max')) q.priceMax = Number(v('price_max'));
			if (v('kind')) q.kind = [v('kind')];
		}
		return q;
	};
	const query = formQuery ?? emptyQuery(type);
	// 描画時に導出する(effect で setState しない・React Compiler の規則)。一覧と同じ数え方(成約済みを含む・J-033)
	const count = mounted ? applyQuery(all, query, now).length : null;
	const recount = () => {
		const q = queryFromForm();
		const n = applyQuery(all, q, now).length;
		if (count !== null && n !== count) setFlashKey((k) => k + 1);
		setFormQuery(q);
	};
	const switchType = (t: PropertyType) => {
		setType(t);
		setFormQuery(null); // タブで form の中身が入れ替わる(選択は初期値に戻る)
	};

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
						onClick={() => switchType(t)}
						// タブは墨の塗り(03 §6・J-136)。一覧の SearchResults と同じ見た目。青緑は「この条件で探す」だけ
						className={`h-11 flex-1 cursor-pointer rounded-hr border text-body font-medium transition-colors duration-150 motion-reduce:transition-none lg:flex-none lg:px-6 lg:text-body-pc ${
							type === t ? 'border-sumi bg-sumi text-white' : 'border-line bg-surface text-sumi hover:border-sumi'
						}`}
					>
						{t === 'rental' ? '賃貸' : '売買'}
					</button>
				))}
			</div>

			<form ref={formRef} action="/properties" method="get" onSubmit={onSubmit} onChange={recount} className="mt-4">
				{!rental && <input type="hidden" name="type" value="sale" />}
				{/* J-134 → J-135:FV の右 30% に入るので、PC でも**1列に縦積み**(エリア → 駅 → 家賃 → 間取り → ボタン) */}
				<div className="grid gap-3">
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

					{/*
					  売買(3項目)でも枠の高さを賃貸(4項目・lg 以上)に揃える(J-135 の修正・09/22)。
					  ボタンの下に、間取りの欄と同じ高さの見えない欄を置き、空いた分を下の余白にする。
					  表示・読み上げ・送信のどれにも入れない(visibility hidden・aria-hidden・name なし・tabIndex -1)。
					*/}
					<button
						type="submit"
						className="h-12 cursor-pointer rounded-hr bg-accent px-6 text-body font-bold text-white transition-colors duration-150 hover:bg-accent-strong motion-reduce:transition-none lg:h-10 lg:text-body-pc"
					>
						この条件で探す
						{count !== null && (
							<span key={flashKey} className="tabular animate-count-flash-light motion-reduce:animate-none">
								({count}件)
							</span>
						)}
					</button>
					{!rental && (
						<div aria-hidden="true" className="invisible hidden lg:block">
							<Field label="間取り">
								<select className={selectClass} tabIndex={-1} disabled aria-hidden="true" />
							</Field>
						</div>
					)}
				</div>
			</form>
		</div>
	);
}

/** useSyncExternalStore の購読(変化しないので何もしない)。サーバー false / クライアント true の「マウント済み」を得るためだけ */
function subscribeNoop() {
	return () => {};
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
