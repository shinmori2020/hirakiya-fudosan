'use client';

import Link from 'next/link';
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
	// 目的のタブ4つ(借りる / 買う / 売る / 貸す・J-151)。借りる・買うは検索、売る・貸すはフォームへの案内
	const [mode, setMode] = useState<'rent' | 'buy' | 'sell' | 'owner'>('rent');
	const sellOrOwner = mode === 'sell' || mode === 'owner';
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
	// option の件数(J-145 の続き):今の条件のうち key だけを value に置き換えた時の件数。水和前は出さない(SSR と一致させる)
	const optionCount = (key: 'area' | 'station' | 'rent_max' | 'layout' | 'price_max' | 'kind', value: string): string => {
		if (count === null) return '';
		const q: SearchQuery = { ...query }; // 描画中は ref を読まない(React Compiler の規則)。状態から導出した query を複製する
		if (key === 'area') q.area = [value];
		else if (key === 'station') q.station = [value];
		else if (key === 'rent_max') q.rentMax = Number(value);
		else if (key === 'layout') q.layout = [value];
		else if (key === 'price_max') q.priceMax = Number(value);
		else q.kind = [value];
		return `(${applyQuery(all, q, now).length}件)`;
	};
	const recount = () => {
		const q = queryFromForm();
		const n = applyQuery(all, q, now).length;
		if (count !== null && n !== count) setFlashKey((k) => k + 1);
		setFormQuery(q);
	};
	const switchType = (t: PropertyType) => {
		// タブで入れ替わるのは**種別固有の項目だけ**(駅・家賃・間取り ⇄ 価格・種目)。
		// **エリアは賃貸・売買で同じ select**(条件分岐の外)なので DOM の値が残る。件数も引き継いで種別で数え直す。
		// 09/22 の実測:ここで formQuery を null に戻していたため、select は「お花茶屋」のままボタンだけ (40件) に戻っていた。
		const next = emptyQuery(t);
		next.area = [...query.area];
		const n = applyQuery(all, next, now).length;
		if (count !== null && n !== count) setFlashKey((k) => k + 1);
		setType(t);
		setFormQuery(next);
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
			{/* 目的のタブ(J-151)。借りる・買うは1つのフォームを賃貸・売買で切り替える(01 §1 の判断ポイント) */}
			<div role="tablist" aria-label="目的" className="flex gap-2">
				{([
					['rent', '借りる'],
					['buy', '買う'],
					['sell', '売る'],
					['owner', '貸す'],
				] as const).map(([m, label]) => (
					<button
						key={m}
						type="button"
						role="tab"
						aria-selected={mode === m}
						onClick={() => {
							setMode(m);
							if (m === 'rent') switchType('rental');
							if (m === 'buy') switchType('sale');
						}}
						// タブは墨の塗り(03 §6・J-136)。一覧の SearchResults と同じ見た目。青緑は「この条件で探す」だけ
						className={`h-11 flex-1 cursor-pointer rounded-hr border text-body font-medium transition-colors duration-150 motion-reduce:transition-none lg:flex-none lg:px-6 lg:text-body-pc ${
							mode === m ? 'border-sumi bg-sumi text-white' : 'border-line bg-surface text-sumi hover:border-sumi'
						}`}
					>
						{label}
					</button>
				))}
			</div>
			{/*
			  売る・貸すの行と検索のフォームを同じ枠に重ねる(J-151)。枠の高さは検索のフォームで決まるので、
			  4つのタブで帯の高さが変わらない(〜1023 で 393 → 180 に縮んでいた)。売る・貸すの中身は枠の上下中央。
			  売る・貸すの間、フォームは見えない・押せない・読み上げない(invisible + inert)
			*/}
			<div className="mt-4 grid">
				{sellOrOwner && (
					// 売る・貸す:1行の説明 + フォームへのボタン(文言は仮・J-151)
					<div className="col-start-1 row-start-1 flex flex-col justify-center gap-3 lg:flex-row lg:items-center lg:justify-between">
						<p className="text-body text-ink lg:text-body-pc">{mode === 'sell' ? '売却の査定を無料で承ります' : '賃貸管理のご相談を承ります'}</p>
						<Link
							href={mode === 'sell' ? '/sell#form' : '/owner#form'}
							className="flex h-12 items-center justify-center rounded-hr bg-accent px-6 text-body font-bold text-white transition-colors duration-150 hover:bg-accent-strong motion-reduce:transition-none lg:h-10 lg:text-body-pc"
						>
							{mode === 'sell' ? '査定を依頼する' : '管理を相談する'}
						</Link>
					</div>
				)}

				<form
					ref={formRef}
					action="/properties"
					method="get"
					onSubmit={onSubmit}
					onChange={recount}
					inert={sellOrOwner}
					className={`col-start-1 row-start-1 ${sellOrOwner ? 'invisible' : ''}`}
				>
					{!rental && <input type="hidden" name="type" value="sale" />}
					{/* J-151:1024 以上は横1行(各欄は同じ幅で伸び縮み・右端にボタン)。〜1023 は縦積み */}
					<div className={`grid gap-3 lg:min-h-16 lg:items-end lg:gap-4 ${rental ? 'lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]' : 'lg:grid-cols-[repeat(3,minmax(0,1fr))_auto]'}`}>
						<Field label="エリア">
							<select name="area" className={selectClass} defaultValue="">
								<option value="">指定しない</option>
								{areas.map((w) => (
									<optgroup key={w.ward} label={w.ward}>
										{w.towns.map((t) => (
											<option key={t.slug} value={t.slug}>
												{t.name}
												{optionCount('area', t.slug)}
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
													{s.name}駅{optionCount('station', s.slug)}
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
											{formatRent(v)}以下{optionCount('rent_max', String(v))}
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
											{formatPrice(v)}以下{optionCount('price_max', String(v))}
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
											{optionCount('layout', v)}
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
											{optionCount('kind', k.slug)}
										</option>
									))}
								</select>
							</Field>
						)}

						<button
							type="submit"
							className="h-12 cursor-pointer rounded-hr bg-accent px-6 text-body font-bold text-white transition-colors duration-150 hover:bg-accent-strong motion-reduce:transition-none lg:h-10 lg:whitespace-nowrap lg:text-body-pc"
						>
							この条件で探す
							{count !== null && (
								<span key={flashKey} className="tabular animate-count-flash-light motion-reduce:animate-none">
									({count}件)
								</span>
							)}
						</button>
					</div>
				</form>
			</div>
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
