import type { ReactNode } from 'react';
import type { PropertyDetail } from '@/types/property';
import { formatPrice, formatRent } from '@/config/site';
import { builtLabel, sqmLabel } from '@/lib/format';

/**
 * 基本情報表(01 §3-4・03 §6・J-039)。
 * 4区分(基本 / 費用 / 建物 / 契約・掲載)の小見出し。区分の間は 24(03 の余白スケール1段)。
 * PC(lg 以上)は左右2ペア×1行、スマホ・タブレットは1列。奇数なら最後のペアは左だけ。
 * 「設備」は非操作チップ(一覧の駅チップと同じ見た目)。家賃(価格)・初期費用の値は一段大きく太字。
 * 取引態様・物件番号・情報更新日・次回更新予定日を必ず含む(決定 2026-09-05)。
 */
type Row = { k: string; v: ReactNode; emphasis?: boolean };
type Section = { title: string; rows: Row[] };

export function InfoTable({ p, stationName, featureName, now }: { p: PropertyDetail; stationName: (s: string) => string; featureName: (s: string) => string; now: Date }) {
	const ym = (v: string) => {
		const m = /^(\d{4})-(\d{2})$/.exec(v);
		return m ? `${m[1]}年${Number(m[2])}月` : '—';
	};
	const ymd = (v: string) => {
		const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
		return m ? `${m[1]}年${Number(m[2])}月${Number(m[3])}日` : v || '—';
	};
	const built = p.builtYm ? `${ym(p.builtYm)}(${builtLabel(p.builtYm, now) ?? '—'})` : '—';
	const traffic = p.stations.map((s) => `${stationName(s.slug)}駅 徒歩${s.walk}分`).join(' / ') || '—';
	const floor = p.floor != null ? `${p.floor}階${p.floorsTotal != null ? ` / ${p.floorsTotal}階建` : ''}` : p.floorsTotal != null ? `${p.floorsTotal}階建` : '—';
	const months = (n: number) => (n === 0 ? 'なし' : `${n}ヶ月`);
	const yen = (n: number) => `${n.toLocaleString('ja-JP')}円`;

	const featureChips =
		p.features.length > 0 ? (
			<ul className="flex flex-wrap gap-x-1 gap-y-2" aria-label="設備">
				{p.features.map((f) => (
					<li key={f} className="h-8 rounded-hr border border-line bg-surface px-2 text-small leading-8 whitespace-nowrap text-ink">
						{featureName(f)}
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
			{ title: '基本', rows: [{ k: '所在地', v: p.address }, { k: '交通', v: traffic }, { k: '間取り', v: p.layout || '—' }, { k: '専有面積', v: sqmLabel(p.areaSqm) }] },
			{
				title: '費用',
				rows: [
					{ k: '家賃', v: formatRent(p.rent ?? 0), emphasis: true },
					{ k: '管理費・共益費', v: r.maintenanceFee > 0 ? yen(r.maintenanceFee) : 'なし' },
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
		const basic: Row[] = [{ k: '所在地', v: p.address }, { k: '交通', v: traffic }];
		if (p.kind === 'land') basic.push({ k: '土地面積', v: sqmLabel(s.landSqm) });
		else {
			basic.push({ k: '間取り', v: p.layout || '—' }, { k: '専有面積', v: sqmLabel(p.areaSqm) });
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
					<dl className="grid grid-cols-1 overflow-hidden rounded-hr border border-line bg-surface lg:grid-cols-2">
						{sec.rows.map((row, i) => (
							<div
								key={row.k}
								className={`grid grid-cols-[112px_minmax(0,1fr)] border-line lg:grid-cols-[144px_minmax(0,1fr)] ${i > 0 ? 'border-t' : ''} ${i === 1 ? 'lg:border-t-0' : ''} ${i % 2 === 1 ? 'lg:border-l' : ''}`}
							>
								<dt className="bg-surface-alt px-3 py-2 text-small font-medium text-ink-weak lg:px-4">{row.k}</dt>
								<dd className={`px-3 py-2 lg:px-4 ${row.emphasis ? 'tabular text-h3 font-bold text-sumi lg:text-h3-pc' : 'text-body leading-[1.5] lg:text-body-pc'}`}>{row.v}</dd>
							</div>
						))}
					</dl>
				</section>
			))}
		</div>
	);
}
