import type { ReactNode } from 'react';
import type { PropertyDetail } from '@/types/property';
import { AttrLink } from '@/components/property/AttrLink';
import { formatPrice, formatRent } from '@/config/site';
import { builtLabel, feeLabel, sqmLabel, walkLabel } from '@/lib/format';
import { addressParts, featureHref, layoutHref, lineHref, stationHref, townHref, wardHref } from '@/lib/links';

/**
 * 基本情報表(01 §3-4・03 §6・J-039・J-047・J-054)。
 * J-054:区分をデータの種類別(基本 / 費用 / 建物 / 契約・掲載)から、読む人の関心順に組み替えた。
 *   賃貸 A「入居の条件」(左 = 交通 / 間取り / 専有面積 / 階数 / 向き / 駐車場 / 入居可能日、右 = 家賃 / 管理費・共益費 / 初期費用 / 更新料)
 *        B「建物と所在地」(所在地 / 沿線 / 築年月 / 構造)C「契約と掲載」(左 = 契約 / 右 = 掲載)
 *   売買 A「購入の条件」(左 = 交通 / 間取り / 面積 / 階数 / 向き / 駐車場 / 引渡し、右 = 価格 / 管理費 / 修繕積立金)
 *        B「土地・建物の仕様」C「掲載情報」
 *   A は帯(J-047)と同じ白い角丸カードに入れて先に読ませ、B・C はカードなし・見出しを薄い文字色にして確認用と分かるようにする。
 *   設備ブロックは A の直下(選ぶ条件なので確認用より上)。項目は減らさない・折りたたまない。
 * J-055:入居可能日(売買は引渡し)は A の右列の末尾へ。沿線は独立した行をやめ、交通の値の下に小さい文字で添える(行は増やさない)。
 *        保証人は値にかかわらず太字。
 * 区分の間は 24(03 の余白スケール1段)。
 * PC(lg 以上)は左右2ペア×1行、スマホ・タブレットは1列。奇数なら最後のペアは左だけ。
 * 「設備」は非操作チップ(一覧の駅チップと同じ見た目)。
 * J-047:枠線・ラベル列の背景色をやめ、項目間は細い横線1本のみ。ラベルは薄い小さめの文字、値は本文色。
 *        家賃・初期費用の強調(J-039)はキー項目の帯(KeySpecBand)へ移したので通常の太さ(emphasis は残すが見た目は同じ)。
 * 取引態様・物件番号・情報更新日・次回更新予定日を必ず含む(決定 2026-09-05)。
 * J-051:所在地(区・町)・交通(駅)・沿線・間取り・設備を、その条件で絞った一覧へのリンクにする。
 *        リンクにしないのは 向き・入居可能日・階・面積・築年・金額(一覧の左カラムに絞り込みが無い項目)。
 * J-052:設備は2列の表から出し、表の下に全幅のブロック(見出し「設備」)として置く。
 *        面積(専有・土地・建物)は「基本」から「建物」へ移し、基本 = 所在地 / 交通 / 沿線 / 間取り の左2・右2にする
 *        (02 §5 に、設備を抜いた建物の右列へ足せる未使用のフィールドが無いため)。
 *        「契約・掲載」は 左 = 契約(契約期間 / 入居可能日 / 保証人 / 取引態様)、右 = 掲載(物件番号 / 情報更新日 / 次回更新予定日)に分ける。
 *        ラベル列は 6.5em 前後の固定幅(「管理費・共益費」「次回更新予定日」が折り返さない最小幅)。
 */
/** strong = 値にかかわらず太字にする項目(J-055:保証人。有無そのものが判断に効く) */
type Row = { k: string; v: ReactNode; emphasis?: boolean; strong?: boolean };
/**
 * rows = 左→右へ順に流す。left / right を持つ区分は列を固定する(J-052)。
 * lead = 帯の直下に置く「条件」の区分(J-054)。白カードに入れて先に読ませる。
 */
type Section = { title: string; rows?: Row[]; left?: Row[]; right?: Row[]; lead?: boolean };

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
	// J-055:沿線は独立した行をやめ、交通の値の下に小さい文字で添える(1行の中で2段。リンクは維持)
	const trafficWithLines = (
		<>
			{traffic}
			{p.lines.length > 0 && <span className="mt-0.5 block text-small text-ink-weak">{linesRow}</span>}
		</>
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
				title: '入居の条件',
				lead: true,
				left: [
					{ k: '交通', v: trafficWithLines },
					{ k: '間取り', v: layoutRow },
					{ k: '専有面積', v: sqmLabel(p.areaSqm) },
					{ k: '階数', v: floor },
					{ k: '向き', v: p.direction || '—' },
					{ k: '駐車場', v: p.parking || '—' },
				],
				right: [
					{ k: '家賃', v: formatRent(p.rent ?? 0), emphasis: true },
					{ k: '管理費・共益費', v: feeLabel(r.maintenanceFee) },
					{ k: '初期費用', v: `敷金 ${months(r.depositMonths)} / 礼金 ${months(r.keyMoneyMonths)} / 仲介手数料 ${r.brokerageFee}`, emphasis: true },
					{ k: '更新料', v: r.renewalFee || '—' },
					// 入居可能日は「いつ入れるか」= 費用と同じ検討材料なので右の末尾へ(J-055)
					{ k: '入居可能日', v: r.availableFrom || '—' },
				],
			},
			{
				title: '建物と所在地',
				left: [{ k: '所在地', v: addressRow }],
				right: [
					{ k: '築年月', v: built },
					{ k: '構造', v: p.structure || '—' },
				],
			},
			{
				title: '契約と掲載',
				left: [
					{ k: '契約期間', v: r.contractTerm || '—' },
					// 保証人は有無そのものが判断に効くので、値にかかわらず太字(J-055)
					{ k: '保証人', v: r.guarantorRequired ? '必要(保証会社利用可・架空)' : '不要', strong: true },
					{ k: '取引態様', v: p.transactionType || '—' },
				],
				right: [
					{ k: '物件番号', v: p.no },
					{ k: '情報更新日', v: ymd(p.updatedOn) },
					{ k: '次回更新予定日', v: ymd(p.nextUpdateOn) },
				],
			},
		);
	} else if (p.sale) {
		const s = p.sale;
		// A「購入の条件」の左:交通 / 間取り / 面積 / 階数 / 向き / 駐車場 / 引渡し
		const cond: Row[] = [{ k: '交通', v: trafficWithLines }];
		if (p.kind === 'land') cond.push({ k: '土地面積', v: sqmLabel(s.landSqm) });
		else {
			cond.push({ k: '間取り', v: layoutRow }, { k: '専有面積', v: sqmLabel(p.areaSqm) });
			if (s.landSqm != null) cond.push({ k: '土地面積', v: sqmLabel(s.landSqm) });
			if (s.buildingSqm != null) cond.push({ k: '建物面積', v: sqmLabel(s.buildingSqm) });
			cond.push({ k: '階数', v: floor }, { k: '向き', v: p.direction || '—' });
		}
		cond.push({ k: '駐車場', v: p.parking || '—' });
		// A の右:価格まわり
		const cost: Row[] = [{ k: '価格', v: formatPrice(p.price ?? 0), emphasis: true }];
		if (s.mgmtFee != null) cost.push({ k: '管理費', v: `${yen(s.mgmtFee)}/月` });
		if (s.repairFund != null) cost.push({ k: '修繕積立金', v: `${yen(s.repairFund)}/月` });
		// 賃貸の「入居可能日」にあたる項目(いつ手に入るか)なので右の末尾へ(J-055)
		cost.push({ k: '引渡し', v: s.handover || '—' });
		// B「土地・建物の仕様」の左右
		const specLeft: Row[] = [{ k: '所在地', v: addressRow }];
		if (p.kind !== 'land') specLeft.push({ k: '築年月', v: built }, { k: '構造', v: p.structure || '—' });
		const specRight: Row[] = [
			{ k: '権利', v: s.landRights || '—' },
			{ k: '用途地域', v: s.zoning || '—' },
		];
		if (s.bcr != null || s.far != null) specRight.push({ k: '建ぺい率 / 容積率', v: `${s.bcr ?? '—'}% / ${s.far ?? '—'}%` });
		specRight.push({ k: '接道', v: s.roadAccess || '—' });
		sections.push(
			{ title: '購入の条件', lead: true, left: cond, right: cost },
			{ title: '土地・建物の仕様', left: specLeft, right: specRight },
			{
				title: '掲載情報',
				left: [
					{ k: '取引態様', v: p.transactionType || '—' },
					{ k: '物件番号', v: p.no },
				],
				right: [
					{ k: '情報更新日', v: ymd(p.updatedOn) },
					{ k: '次回更新予定日', v: ymd(p.nextUpdateOn) },
				],
			},
		);
	}

	// J-052:ラベル列は 6.5em 固定。「管理費・共益費」「次回更新予定日」が折り返さない最小幅
	// J-054:「なし」は見落としやすいので太字にする。色は付けない(リンクの青緑と紛らわしくなるため)
	const rowEl = (row: Row) => (
		<div key={row.k} className="grid grid-cols-[6.5em_minmax(0,1fr)] gap-x-2 border-b border-line py-2">
			<dt className="text-small text-ink-weak">{row.k}</dt>
			<dd
				className={`text-body leading-[1.5] text-ink lg:text-body-pc ${row.emphasis ? 'tabular' : ''} ${
					row.strong || row.v === 'なし' || row.v === '不要' ? 'font-bold' : ''
				}`}
			>
				{row.v}
			</dd>
		</div>
	);
	const sectionBody = (sec: Section) =>
		sec.rows ? (
			<dl className="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-8">{sec.rows.map(rowEl)}</dl>
		) : (
			// 左右で中身を分ける区分(J-052・J-054)
			<dl className="grid grid-cols-1 lg:grid-cols-2 lg:gap-x-8">
				<div>{(sec.left ?? []).map(rowEl)}</div>
				<div>{(sec.right ?? []).map(rowEl)}</div>
			</dl>
		);
	const lead = sections.find((sec) => sec.lead);
	const rest = sections.filter((sec) => !sec.lead);

	return (
		<div>
			{/* A:条件の区分。帯(J-047)と同じ白い角丸カードに入れて先に読ませる(J-054)。設備もこの中の最後に置く */}
			{lead && (
				<section aria-labelledby={`info-${lead.title}`} className="rounded-hr border border-line bg-surface p-4">
					<h3 id={`info-${lead.title}`} className="mb-2 text-h3 font-bold text-sumi lg:text-h3-pc">
						{lead.title}
					</h3>
					{/* PC は左右2列、スマホ・タブレットは1列。J-047:枠・ラベル背景なし、項目間は細い横線1本 */}
					{sectionBody(lead)}
					{p.features.length > 0 && (
						<div className="mt-4">
							<h4 className="mb-2 text-small font-bold text-sumi">設備</h4>
							{featureChips}
						</div>
					)}
				</section>
			)}
			{/* B・C:確認用の区分。カードに入れず、見出しを薄い文字色にして強弱をつける(J-054) */}
			<div className="mt-8 space-y-6">
				{rest.map((sec) => (
					<section key={sec.title} aria-labelledby={`info-${sec.title}`}>
						<h3 id={`info-${sec.title}`} className="mb-2 text-h3 font-bold text-ink-weak lg:text-h3-pc">
							{sec.title}
						</h3>
						{sectionBody(sec)}
					</section>
				))}
			</div>
		</div>
	);
}
