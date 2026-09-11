import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import type { PropertyDetail } from '@/types/property';
import { AttrLink } from '@/components/property/AttrLink';
import { builtLabel, dateLabel, feeLabel, walkLabel } from '@/lib/format';
import { addressParts, featureHref, lineHref, stationHref, townHref, wardHref } from '@/lib/links';

/**
 * 物件概要の表(01 §3-4・03 §6)。J-060 で「決め手 → 設備 → 確認 → 詳細」の4段に整理した。
 *  - 決め手の3項目(J-059)は KeySpecBand。ここには出さない
 *  - 設備:独立したブロック。アコーディオンには入れない(J-060)
 *  - 「入居前に確認すること」(売買は「購入前に確認すること」):開いたまま・2列
 *      賃貸 = 管理費・共益費 / 更新料 / 入居可能日 / 向き / 駐車場
 *      売買 = 管理費 / 修繕積立金 / 引渡し / 向き / 駐車場(戸建・土地に無い項目は出さない)
 *      向きを残すのは日当たりが重視条件の上位に入るため。階数は内見で見る情報なので詳細へ送る(J-060)
 *  - 「詳細情報」:素の <details> / <summary> で畳む。初期状態は閉じる。JavaScript は使わない(J-056 項目4 と同じ理由)
 *      中は小見出しで 建物(売買は 土地・建物)と 契約・掲載(売買は 掲載)に分ける
 * 決め手の3項目に出した値(交通の1駅目・家賃・間取り・専有面積・町・初期費用 / 売買は町・価格・管理費+修繕の合計)は表から外す。
 * 沿線と2駅目は 交通 の行ごと消えるため、詳細情報の「建物」に残した(J-060 の重複確認で見つけた穴)。
 * ラベル幅 6.5em(J-052)・保証人の太字(J-055)・リンク(J-051)は畳んだ中でも同じ。
 */
type Row = { k: string; v: ReactNode; strong?: boolean };
type Group = { title: string; left: Row[]; right: Row[] };

export function InfoTable({
	p,
	stationName,
	featureName,
	lineName,
	area,
	now,
}: {
	p: PropertyDetail;
	stationName: (s: string) => string;
	featureName: (s: string) => string;
	lineName: (s: string) => string;
	/** 所在地のリンク用:区名・町名と、その区に属する町の slug すべて */
	area: { wardName: string; townName: string; wardTownSlugs: string[] };
	now: Date;
}) {
	const ym = (v: string) => {
		const m = /^(\d{4})-(\d{2})$/.exec(v);
		return m ? `${m[1]}年${Number(m[2])}月` : '—';
	};
	const built = p.builtYm ? `${ym(p.builtYm)}(${builtLabel(p.builtYm, now) ?? '—'})` : '—';
	const floor =
		p.floor != null ? `${p.floor}階${p.floorsTotal != null ? ` / ${p.floorsTotal}階建` : ''}` : p.floorsTotal != null ? `${p.floorsTotal}階建` : '—';
	const yen = (n: number) => `${n.toLocaleString('ja-JP')}円`;

	const linesRow =
		p.lines.length > 0 ? (
			<span>
				{p.lines.map((l, i) => (
					<span key={l}>
						{i > 0 && ' / '}
						<AttrLink href={lineHref(p.type, l)}>{lineName(l)}</AttrLink>
					</span>
				))}
			</span>
		) : (
			'—'
		);
	const addressRow = (
		<span>
			{addressParts(p.address, area.wardName, area.townName).map((part, i) =>
				part.link === null ? (
					<span key={i}>{part.text}</span>
				) : (
					<AttrLink key={i} href={part.link === 'ward' ? wardHref(p.type, area.wardTownSlugs) : townHref(p.type, p.area)}>
						{part.text}
					</AttrLink>
				),
			)}
		</span>
	);
	const traffic =
		p.stations.length > 0 ? (
			<span>
				{p.stations.map((s, i) => (
					<span key={s.slug}>
						{i > 0 && ' / '}
						<AttrLink href={stationHref(p.type, s.slug)}>{stationName(s.slug)}駅</AttrLink> {walkLabel(s.walk)}
					</span>
				))}
			</span>
		) : (
			'—'
		);

	const featureChips =
		p.features.length > 0 ? (
			<ul className="flex flex-wrap gap-x-1 gap-y-2" aria-label="設備">
				{p.features.map((f) => (
					<li key={f}>
						<AttrLink href={featureHref(p.type, f)} variant="chip">
							{featureName(f)}
						</AttrLink>
					</li>
				))}
			</ul>
		) : null;

	// ---- 確認(開いたまま)と詳細(畳む)を種別ごとに組み立てる
	let checkTitle = '入居前に確認すること';
	const checkLeft: Row[] = [];
	const checkRight: Row[] = [];
	const detail: Group[] = [];

	if (p.type === 'rental' && p.rental) {
		const r = p.rental;
		checkLeft.push(
			{ k: '管理費・共益費', v: feeLabel(r.maintenanceFee) },
			{ k: '更新料', v: r.renewalFee || '—' },
			{ k: '入居可能日', v: dateLabel(r.availableFrom) },
		);
		checkRight.push({ k: '向き', v: p.direction || '—' }, { k: '駐車場', v: p.parking || '—' });
		detail.push(
			{
				title: '建物',
				left: [
					{ k: '所在地', v: addressRow },
					{ k: '交通', v: traffic },
					{ k: '沿線', v: linesRow },
				],
				right: [
					{ k: '築年月', v: built },
					{ k: '構造', v: p.structure || '—' },
					{ k: '階数', v: floor },
				],
			},
			{
				title: '契約・掲載',
				left: [
					{ k: '契約期間', v: r.contractTerm || '—' },
					{ k: '保証人', v: r.guarantorRequired ? '必要(保証会社利用可・架空)' : '不要', strong: true },
					{ k: '取引態様', v: p.transactionType || '—' },
				],
				right: [
					{ k: '物件番号', v: p.no },
					{ k: '情報更新日', v: dateLabel(p.updatedOn) },
					{ k: '次回更新予定日', v: dateLabel(p.nextUpdateOn) },
				],
			},
		);
	} else if (p.sale) {
		const s = p.sale;
		checkTitle = '購入前に確認すること';
		// 管理費・修繕積立金はマンションだけ(戸建・土地には無い項目なので出さない)
		if (s.mgmtFee != null) checkLeft.push({ k: '管理費', v: `${yen(s.mgmtFee)}/月` });
		if (s.repairFund != null) checkLeft.push({ k: '修繕積立金', v: `${yen(s.repairFund)}/月` });
		checkLeft.push({ k: '引渡し', v: dateLabel(s.handover) });
		if (p.kind !== 'land') checkRight.push({ k: '向き', v: p.direction || '—' });
		checkRight.push({ k: '駐車場', v: p.parking || '—' });

		const left: Row[] = [
			{ k: '所在地', v: addressRow },
			{ k: '交通', v: traffic },
			{ k: '沿線', v: linesRow },
		];
		if (p.kind !== 'land') left.push({ k: '築年月', v: built }, { k: '構造', v: p.structure || '—' }, { k: '階数', v: floor });
		const right: Row[] = [
			{ k: '土地権利', v: s.landRights || '—' },
			{ k: '用途地域', v: s.zoning || '—' },
		];
		if (s.bcr != null || s.far != null) right.push({ k: '建ぺい率 / 容積率', v: `${s.bcr ?? '—'}% / ${s.far ?? '—'}%` });
		right.push({ k: '接道', v: s.roadAccess || '—' });
		detail.push(
			{ title: '土地・建物', left, right },
			{
				title: '掲載',
				left: [
					{ k: '取引態様', v: p.transactionType || '—' },
					{ k: '物件番号', v: p.no },
				],
				right: [
					{ k: '情報更新日', v: dateLabel(p.updatedOn) },
					{ k: '次回更新予定日', v: dateLabel(p.nextUpdateOn) },
				],
			},
		);
	}

	// 値が「なし」「不要」の行と、有無が判断に効く行(保証人)は太字(J-054・J-055)
	const rowEl = (row: Row) => (
		<div key={row.k} className="grid grid-cols-[6.5em_minmax(0,1fr)] gap-x-2 border-b border-line py-2">
			<dt className="text-small text-ink-weak">{row.k}</dt>
			<dd className={`text-body leading-[1.5] text-ink lg:text-body-pc ${row.strong || row.v === 'なし' || row.v === '不要' ? 'font-bold' : ''}`}>
				{row.v}
			</dd>
		</div>
	);
	const twoColumns = (left: Row[], right: Row[]) => (
		<dl className="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-8">
			<div>{left.map(rowEl)}</div>
			<div>{right.map(rowEl)}</div>
		</dl>
	);

	return (
		<div className="space-y-8">
			{/* 設備:アコーディオンに入れず、独立したブロックのまま(J-060) */}
			{featureChips && (
				<section aria-labelledby="info-設備">
					<h3 id="info-設備" className="mb-2 text-h3 font-bold text-sumi lg:text-h3-pc">
						設備
					</h3>
					{featureChips}
				</section>
			)}

			{/* 確認:開いたまま。左 = お金と時期 / 右 = 部屋まわり(J-060) */}
			{(checkLeft.length > 0 || checkRight.length > 0) && (
				<section aria-labelledby="info-確認">
					<h3 id="info-確認" className="mb-2 text-h3 font-bold text-sumi lg:text-h3-pc">
						{checkTitle}
					</h3>
					{twoColumns(checkLeft, checkRight)}
				</section>
			)}

			{/* 詳細:素の details(JS なし)。初期は閉じるが中身は HTML に存在するのでクロールと構造化データに影響しない */}
			<details className="hr-accordion group border-t border-line">
				<summary className="flex cursor-pointer list-none items-center justify-between py-3 text-h3 font-bold text-sumi transition-colors duration-150 hover:text-accent-strong motion-reduce:transition-none lg:text-h3-pc">
					詳細情報
					<ChevronDown
						size={20}
						aria-hidden="true"
						className="shrink-0 transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
					/>
				</summary>
				<div className="space-y-6 pb-4">
					{detail.map((g) => (
						<section key={g.title} aria-labelledby={`info-${g.title}`}>
							<h4 id={`info-${g.title}`} className="mb-2 text-small font-bold text-ink-weak">
								{g.title}
							</h4>
							{twoColumns(g.left, g.right)}
						</section>
					))}
				</div>
			</details>
		</div>
	);
}
