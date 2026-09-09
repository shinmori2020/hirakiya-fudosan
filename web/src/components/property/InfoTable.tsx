import type { PropertyDetail } from '@/types/property';
import { formatPrice, formatRent } from '@/config/site';
import { builtLabel, sqmLabel } from '@/lib/format';

/**
 * 基本情報表(01 §3-4・03 §6)。2列、見出し列は薄灰。取引態様・物件番号・情報更新日・次回更新予定日を必ず含む(決定 2026-09-05)。
 * 初期費用(敷金・礼金・仲介手数料)は隠さず1行で出す。これは初案。
 */
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
	const traffic = p.stations.map((s) => `${stationName(s.slug)}駅 徒歩${s.walk}分`).join(' / ');
	const floor = p.floor != null ? `${p.floor}階${p.floorsTotal != null ? ` / ${p.floorsTotal}階建` : ''}` : p.floorsTotal != null ? `${p.floorsTotal}階建` : '—';
	const months = (n: number) => (n === 0 ? 'なし' : `${n}ヶ月`);

	const rows: [string, string][] = [
		['所在地', p.address],
		['交通', traffic || '—'],
	];
	if (p.type === 'rental' && p.rental) {
		const r = p.rental;
		rows.push(
			['家賃', formatRent(p.rent ?? 0)],
			['管理費・共益費', r.maintenanceFee > 0 ? `${r.maintenanceFee.toLocaleString('ja-JP')}円` : 'なし'],
			['初期費用', `敷金 ${months(r.depositMonths)} / 礼金 ${months(r.keyMoneyMonths)} / 仲介手数料 ${r.brokerageFee}`],
			['間取り', p.layout || '—'],
			['専有面積', sqmLabel(p.areaSqm)],
			['築年月', built],
			['階数', floor],
			['構造', p.structure || '—'],
			['向き', p.direction || '—'],
			['駐車場', p.parking || '—'],
			['設備', p.features.length ? p.features.map(featureName).join('・') : '—'],
			['契約期間', r.contractTerm || '—'],
			['更新料', r.renewalFee || '—'],
			['保証人', r.guarantorRequired ? '必要(保証会社利用可・架空)' : '不要'],
			['入居可能日', r.availableFrom || '—'],
		);
	} else if (p.sale) {
		const s = p.sale;
		rows.push(['価格', formatPrice(p.price ?? 0)]);
		if (p.kind === 'land') {
			rows.push(['土地面積', sqmLabel(s.landSqm)]);
		} else {
			rows.push(['間取り', p.layout || '—'], ['専有面積', sqmLabel(p.areaSqm)]);
			if (s.landSqm != null) rows.push(['土地面積', sqmLabel(s.landSqm)]);
			if (s.buildingSqm != null) rows.push(['建物面積', sqmLabel(s.buildingSqm)]);
			rows.push(['築年月', built], ['階数', floor], ['構造', p.structure || '—'], ['向き', p.direction || '—']);
		}
		if (s.mgmtFee != null) rows.push(['管理費', `${s.mgmtFee.toLocaleString('ja-JP')}円/月`]);
		if (s.repairFund != null) rows.push(['修繕積立金', `${s.repairFund.toLocaleString('ja-JP')}円/月`]);
		rows.push(['駐車場', p.parking || '—'], ['権利', s.landRights || '—'], ['用途地域', s.zoning || '—']);
		if (s.bcr != null || s.far != null) rows.push(['建ぺい率 / 容積率', `${s.bcr ?? '—'}% / ${s.far ?? '—'}%`]);
		rows.push(['接道', s.roadAccess || '—'], ['引渡し', s.handover || '—']);
	}
	rows.push(
		['取引態様', p.transactionType || '—'],
		['物件番号', p.no],
		['情報更新日', ymd(p.updatedOn)],
		['次回更新予定日', ymd(p.nextUpdateOn)],
	);

	return (
		<table className="w-full border-collapse text-body leading-[1.5] lg:text-body-pc">
			<tbody>
				{rows.map(([k, v]) => (
					<tr key={k} className="border-b border-line last:border-b-0">
						<th scope="row" className="w-32 bg-surface-alt px-3 py-2 text-left text-small font-medium text-ink-weak lg:w-44 lg:px-4">
							{k}
						</th>
						<td className="px-3 py-2 lg:px-4">{v}</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}
