import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import type { PropertyDetail } from '@/types/property';
import { AttrLink } from '@/components/property/AttrLink';
import { builtLabel, dateLabel, feeLabel, sqmLabel, walkLabel } from '@/lib/format';
import { addressParts, lineHref, stationHref, townHref, wardHref } from '@/lib/links';

/**
 * 物件概要の表(01 §3-4・03 §6)。J-060 で「決め手 → 設備 → 確認 → 詳細」の4段に整理した。
 *  - 決め手は右カラムに集約したので、ここには出さない(J-070。J-047 の帯・J-059 の3項目は廃止)
 *  - 設備:J-074 で右カラム(スペックの下)へ移した。ここには出さない
 *  - 「入居前に確認すること」(売買は「購入前に確認すること」):J-076 でアコーディオンに揃えた。初期状態だけ開いておく。2列
 *      賃貸 = 管理費・共益費 / 更新料 / 入居可能日 / 向き / 駐車場
 *      売買 = 管理費 / 修繕積立金 / 引渡し / 向き / 駐車場(戸建・土地に無い項目は出さない)
 *      向きを残すのは日当たりが重視条件の上位に入るため。階数は内見で見る情報なので詳細へ送る(J-060)
 *  - 詳細:素の <details> / <summary> のアコーディオンを置く(J-062。1つに 11項目をまとめると開いた時に量が減らないため)。
 *    J-076 で「確認」も同じ形にし、**3つが同列に並ぶ**(確認 / 建物 / 契約・掲載)。見出しの階層は1つだけにする。
 *      賃貸 = 「建物」と「契約・掲載」、売買 = 「土地・建物」と「掲載」。どちらも初期状態は閉じる。JavaScript は使わない(J-056 項目4 と同じ理由)。
 *      閉じている時も中身が分かるよう、見出しの右に小さな説明(hint)を添える
 * 決め手の3項目に出した値(交通の1駅目・家賃・間取り・専有面積・町・初期費用 / 売買は町・価格・管理費+修繕の合計)は表から外す。
 * 沿線と2駅目は 交通 の行ごと消えるため、詳細情報の「建物」に残した(J-060 の重複確認で見つけた穴)。
 * ラベル幅 6.5em(J-052)・保証人の太字(J-055)・リンク(J-051)は畳んだ中でも同じ。
 */
type Row = { k: string; v: ReactNode; strong?: boolean };
/**
 * hint = 閉じている時に見出しの右へ小さく添える中身の説明(J-062)
 * open = 初期状態で開いておく(J-076。確認の区分だけ true)
 */
type Group = { title: string; hint: string; left: Row[]; right: Row[]; open?: boolean };

export function InfoTable({
	p,
	stationName,
	lineName,
	area,
	now,
}: {
	p: PropertyDetail;
	stationName: (s: string) => string;
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

	// ---- 3つのアコーディオン(確認 / 建物 / 契約・掲載)を種別ごとに組み立てる(J-076)
	let checkTitle = '入居前に確認すること';
	let checkHint = '管理費・更新料・駐車場など';
	const checkLeft: Row[] = [];
	const checkRight: Row[] = [];
	const detail: Group[] = [];

	if (p.type === 'rental' && p.rental) {
		const r = p.rental;
		// 左 = お金(J-061)、右 = 住まいの条件と時期
		checkLeft.push(
			{ k: '管理費・共益費', v: feeLabel(r.maintenanceFee) },
			{ k: '更新料', v: r.renewalFee || '—' },
			{ k: '駐車場', v: p.parking || '—' },
		);
		checkRight.push({ k: '向き', v: p.direction || '—' }, { k: '入居可能日', v: dateLabel(r.availableFrom) });
		detail.push(
			{
				title: '建物',
				hint: '所在地・築年月・構造など',
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
				hint: '契約期間・保証人・取引態様など',
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
		// 補足は中身に合わせる(管理費・修繕積立金はマンションだけ、向きは建物がある種別だけ)
		checkHint = s.mgmtFee != null ? '管理費・修繕積立金・駐車場など' : p.kind === 'land' ? '駐車場・引渡しなど' : '駐車場・向き・引渡しなど';
		// 管理費・修繕積立金はマンションだけ(戸建・土地には無い項目なので出さない)
		// 左 = お金(J-061)、右 = 住まいの条件と時期
		if (s.mgmtFee != null) checkLeft.push({ k: '管理費', v: `${yen(s.mgmtFee)}/月` });
		if (s.repairFund != null) checkLeft.push({ k: '修繕積立金', v: `${yen(s.repairFund)}/月` });
		checkLeft.push({ k: '駐車場', v: p.parking || '—' });
		if (p.kind !== 'land') checkRight.push({ k: '向き', v: p.direction || '—' });
		checkRight.push({ k: '引渡し', v: dateLabel(s.handover) });

		const left: Row[] = [
			{ k: '所在地', v: addressRow },
			{ k: '交通', v: traffic },
			{ k: '沿線', v: linesRow },
		];
		if (p.kind !== 'land') left.push({ k: '築年月', v: built }, { k: '構造', v: p.structure || '—' }, { k: '階数', v: floor });
		// 面積(J-070):J-059 で決め手の3項目へ移し、J-060 で表から落ちていた。3項目の廃止で行き先が無くなるため表に戻す
		if (p.kind === 'mansion') left.push({ k: '専有面積', v: sqmLabel(p.areaSqm) });
		if (p.kind === 'house') left.push({ k: '専有面積', v: sqmLabel(p.areaSqm) }, { k: '建物面積', v: sqmLabel(s.buildingSqm) });
		if (s.landSqm != null) left.push({ k: '土地面積', v: sqmLabel(s.landSqm) });
		const right: Row[] = [
			{ k: '土地権利', v: s.landRights || '—' },
			{ k: '用途地域', v: s.zoning || '—' },
		];
		if (s.bcr != null || s.far != null) right.push({ k: '建ぺい率 / 容積率', v: `${s.bcr ?? '—'}% / ${s.far ?? '—'}%` });
		right.push({ k: '接道', v: s.roadAccess || '—' });
		detail.push(
			{
				title: '土地・建物',
				hint: p.kind === 'land' ? '所在地・土地面積・用途地域など' : '所在地・築年月・面積など',
				left,
				right,
			},
			{
				title: '掲載',
				hint: '取引態様・物件番号・情報更新日など',
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

	// 確認を先頭に置き、3つとも同じアコーディオンにする(J-076)。確認だけ初期状態で開く
	const groups: Group[] =
		checkLeft.length > 0 || checkRight.length > 0
			? [{ title: checkTitle, hint: checkHint, left: checkLeft, right: checkRight, open: true }, ...detail]
			: detail;

	return (
		<div>
			{/*
			 * 素の details(JS なし)を3つ。初期は確認だけ開き、他は閉じる。
			 * 閉じていても中身は HTML に存在するので、クロールと構造化データに影響しない(J-060)。
			 * 開閉する見出しの作り(左の印・行全体の hover)は J-061、閉じた時の説明は J-062 のまま。
			 */}
			<div>
				{groups.map((g) => (
					<details key={g.title} open={g.open} className="hr-accordion group border-t border-line last:border-b">
						<summary className="-mx-2 flex cursor-pointer list-none items-baseline gap-2 rounded-hr px-2 py-3 transition-colors duration-150 hover:bg-badge-new-bg motion-reduce:transition-none">
							<ChevronRight
								size={20}
								aria-hidden="true"
								className="shrink-0 translate-y-0.5 text-ink-weak transition-transform duration-200 group-open:rotate-90 motion-reduce:transition-none"
							/>
							<span className="text-h3 font-bold text-sumi lg:text-h3-pc">{g.title}</span>
							<span className="min-w-0 truncate text-small text-ink-weak lg:text-small-pc">{g.hint}</span>
						</summary>
						<div className="pb-4">{twoColumns(g.left, g.right)}</div>
					</details>
				))}
			</div>
		</div>
	);
}
