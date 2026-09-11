import type { ReactNode } from 'react';
import type { PropertyDetail } from '@/types/property';
import { AttrLink } from '@/components/property/AttrLink';
import { formatPrice, formatRent } from '@/config/site';
import { builtLabel, feeLabel, sqmLabel, walkLabel } from '@/lib/format';
import { addressParts, featureHref, layoutHref, lineHref, stationHref, townHref, wardHref } from '@/lib/links';

/**
 * 基本情報表(01 §3-4・03 §6・J-039・J-047)。
 * 4区分(基本 / 費用 / 建物 / 契約・掲載)の小見出し。区分の間は 24(03 の余白スケール1段)。
 * PC(lg 以上)は左右2ペア×1行、スマホ・タブレットは1列。奇数なら最後のペアは左だけ。
 * 「設備」は非操作チップ(一覧の駅チップと同じ見た目)。
 * J-047:枠線・ラベル列の背景色をやめ、項目間は細い横線1本のみ。ラベルは薄い小さめの文字、値は本文色。
 *        家賃・初期費用の強調(J-039)はキー項目の帯(KeySpecBand)へ移したので通常の太さ(emphasis は残すが見た目は同じ)。
 * 取引態様・物件番号・情報更新日・次回更新予定日を必ず含む(決定 2026-09-05)。
 * J-051:所在地(区・町)・交通(駅)・沿線・間取り・設備を、その条件で絞った一覧へのリンクにする。
 *        リンクにしないのは 向き・入居可能日・階・面積・築年・金額(一覧の左カラムに絞り込みが無い項目)。
 */
type Row = { k: string; v: ReactNode; emphasis?: boolean };
type Section = { title: string; rows: Row[] };

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
	/** 所在地のリンク用:区名・町名と、その区に属する町の slug すべて(区の絞り込みは一覧に無いため OR で並べる) */
	area: { wardName: string; townName: string; wardTownSlugs: string[] };
	now: Date;
}) {
	const ym = (v: string) => {
		const m = /^(\d{4})-(\d{2})$/.exec(v);
		return m ? `${m[1]}年${Number(m[2])}月` : '—';
	};
	const ymd = (v: string) => {
		const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
		return m ? `${m[1]}年${Number(m[2])}月${Number(m[3])}日` : v || '—';
	};
	const built = p.builtYm ? `${ym(p.builtYm)}(${builtLabel(p.builtYm, now) ?? '—'})` : '—';
	// 交通:駅名だけリンク(徒歩分はリンクにしない)
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
	// 所在地:区と町だけリンク
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
	const layoutRow = p.layout ? <AttrLink href={layoutHref(p.type, p.layout)}>{p.layout}</AttrLink> : '—';
	const floor = p.floor != null ? `${p.floor}階${p.floorsTotal != null ? ` / ${p.floorsTotal}階建` : ''}` : p.floorsTotal != null ? `${p.floorsTotal}階建` : '—';
	const months = (n: number) => (n === 0 ? 'なし' : `${n}ヶ月`);
	const yen = (n: number) => `${n.toLocaleString('ja-JP')}円`;

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
		) : (
			'—'
		);

	const sections: Section[] = [];
	if (p.type === 'rental' && p.rental) {
		const r = p.rental;
		sections.push(
			{
				title: '基本',
				rows: [
					{ k: '所在地', v: addressRow },
					{ k: '交通', v: traffic },
					{ k: '沿線', v: linesRow },
					{ k: '間取り', v: layoutRow },
					{ k: '専有面積', v: sqmLabel(p.areaSqm) },
				],
			},
			{
				title: '費用',
				rows: [
					{ k: '家賃', v: formatRent(p.rent ?? 0), emphasis: true },
					{ k: '管理費・共益費', v: feeLabel(r.maintenanceFee) },
					{ k: '初期費用', v: `敷金 ${months(r.depositMonths)} / 礼金 ${months(r.keyMoneyMonths)} / 仲介手数料 ${r.brokerageFee}`, emphasis: true },
					{ k: '更新料', v: r.renewalFee || '—' },
				],
			},
			{
				title: '建物',
				rows: [
					{ k: '築年月', v: built },
					{ k: '階数', v: floor },
					{ k: '構造', v: p.structure || '—' },
					{ k: '向き', v: p.direction || '—' },
					{ k: '駐車場', v: p.parking || '—' },
					{ k: '設備', v: featureChips },
				],
			},
			{
				title: '契約・掲載',
				rows: [
					{ k: '契約期間', v: r.contractTerm || '—' },
					{ k: '保証人', v: r.guarantorRequired ? '必要(保証会社利用可・架空)' : '不要' },
					{ k: '入居可能日', v: r.availableFrom || '—' },
					{ k: '取引態様', v: p.transactionType || '—' },
					{ k: '物件番号', v: p.no },
					{ k: '情報更新日', v: ymd(p.updatedOn) },
					{ k: '次回更新予定日', v: ymd(p.nextUpdateOn) },
				],
			},
		);
	} else if (p.sale) {
		const s = p.sale;
		const basic: Row[] = [
			{ k: '所在地', v: addressRow },
			{ k: '交通', v: traffic },
			{ k: '沿線', v: linesRow },
		];
		if (p.kind === 'land') basic.push({ k: '土地面積', v: sqmLabel(s.landSqm) });
		else {
			basic.push({ k: '間取り', v: layoutRow }, { k: '専有面積', v: sqmLabel(p.areaSqm) });
			if (s.landSqm != null) basic.push({ k: '土地面積', v: sqmLabel(s.landSqm) });
			if (s.buildingSqm != null) basic.push({ k: '建物面積', v: sqmLabel(s.buildingSqm) });
		}
		const cost: Row[] = [{ k: '価格', v: formatPrice(p.price ?? 0), emphasis: true }];
		if (s.mgmtFee != null) cost.push({ k: '管理費', v: `${yen(s.mgmtFee)}/月` });
		if (s.repairFund != null) cost.push({ k: '修繕積立金', v: `${yen(s.repairFund)}/月` });
		const building: Row[] = [];
		if (p.kind !== 'land') building.push({ k: '築年月', v: built }, { k: '階数', v: floor }, { k: '構造', v: p.structure || '—' }, { k: '向き', v: p.direction || '—' });
		building.push({ k: '駐車場', v: p.parking || '—' }, { k: '権利', v: s.landRights || '—' }, { k: '用途地域', v: s.zoning || '—' });
		if (s.bcr != null || s.far != null) building.push({ k: '建ぺい率 / 容積率', v: `${s.bcr ?? '—'}% / ${s.far ?? '—'}%` });
		building.push({ k: '接道', v: s.roadAccess || '—' });
		if (p.features.length) building.push({ k: '設備', v: featureChips });
		sections.push(
			{ title: '基本', rows: basic },
			{ title: '費用', rows: cost },
			{ title: '建物・土地', rows: building },
			{
				title: '契約・掲載',
				rows: [
					{ k: '引渡し', v: s.handover || '—' },
					{ k: '取引態様', v: p.transactionType || '—' },
					{ k: '物件番号', v: p.no },
					{ k: '情報更新日', v: ymd(p.updatedOn) },
					{ k: '次回更新予定日', v: ymd(p.nextUpdateOn) },
				],
			},
		);
	}

	return (
		<div className="space-y-6">
			{sections.map((sec) => (
				<section key={sec.title} aria-labelledby={`info-${sec.title}`}>
					<h3 id={`info-${sec.title}`} className="mb-2 text-h3 font-bold text-sumi lg:text-h3-pc">
						{sec.title}
					</h3>
					{/* PC は2ペア×1行(奇数なら最後は左だけ)。スマホ・タブレットは1列 */}
					{/* J-047:枠・ラベル背景なし。項目間は細い横線1本(PC の2ペアは左右とも同じ線) */}
					<dl className="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-8">
						{sec.rows.map((row) => (
							<div key={row.k} className="grid grid-cols-[112px_minmax(0,1fr)] border-b border-line py-2 lg:grid-cols-[144px_minmax(0,1fr)]">
								<dt className="text-small text-ink-weak">{row.k}</dt>
								<dd className={`text-body leading-[1.5] text-ink lg:text-body-pc ${row.emphasis ? 'tabular' : ''}`}>{row.v}</dd>
							</div>
						))}
					</dl>
				</section>
			))}
		</div>
	);
}
