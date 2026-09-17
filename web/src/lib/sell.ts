/**
 * 査定依頼フォーム(/sell)の純関数と Zod スキーマ(実装順 5・J-105 ③)。
 * 共通項目は lib/forms/common.ts。I/O は置かない。テストは sell.test.ts(J-041)。
 *
 * 固有:物件種別(必須)/ 所在地 = 区の選択 + 町名以下の自由入力(必須・対応エリア外も受ける)/
 * 面積(ラベルは種別で変える)/ 築年・間取り(土地では欄ごと出さない)/ 現況(必須)/
 * 売却希望時期(選択肢。日付ではないので lib/forms/dates.ts は使わない)/ 査定の種類(必須)。
 */
import { z } from 'zod';
import {
	AREA_LABEL,
	hasBuiltAndLayout,
	LAYOUT_OTHER,
	SELL_ASSESSMENTS,
	SELL_CONDITIONS,
	SELL_KINDS,
	SELL_NOTE_LABEL,
	SELL_TIMINGS,
	SELL_WARDS,
	type SellAssessment,
	type SellCondition,
	type SellKind,
	type SellTiming,
	type SellWard,
} from '@/config/sell';
import { commonRows, commonSchema, EMPTY_COMMON, firstErrors, normalizeCommon, readCommon, str, type CommonInput, type ConfirmRow, type FormLike } from '@/lib/forms/common';
import { LAYOUTS } from '@/lib/search';

export type { ConfirmRow } from '@/lib/forms/common';

const KIND_SLUGS = SELL_KINDS.map((k) => k.slug) as [SellKind, ...SellKind[]];
const WARD_SLUGS = SELL_WARDS.map((w) => w.slug) as [SellWard, ...SellWard[]];
const CONDITION_SLUGS = SELL_CONDITIONS.map((c) => c.slug) as [SellCondition, ...SellCondition[]];
const TIMING_SLUGS = SELL_TIMINGS.map((t) => t.slug) as [SellTiming, ...SellTiming[]];
const ASSESSMENT_SLUGS = SELL_ASSESSMENTS.map((a) => a.slug) as [SellAssessment, ...SellAssessment[]];
export const LAYOUT_OPTIONS = [...LAYOUTS, LAYOUT_OTHER] as const;

const label = <T extends string>(list: readonly { slug: T; label: string }[], slug: T | ''): string => (slug ? (list.find((x) => x.slug === slug)?.label ?? slug) : '');

export const kindLabel = (slug: SellKind | '') => label(SELL_KINDS, slug);
export const wardLabel = (slug: SellWard | '') => label(SELL_WARDS, slug);
export const conditionLabel = (slug: SellCondition | '') => label(SELL_CONDITIONS, slug);
export const timingLabel = (slug: SellTiming | '') => label(SELL_TIMINGS, slug);
export const assessmentLabel = (slug: SellAssessment | '') => label(SELL_ASSESSMENTS, slug);
export const layoutLabel = (v: string) => (v === LAYOUT_OTHER ? 'その他' : v);

/** 面積のラベル。種別が未選択の間は中立の「面積」にする */
export const areaLabel = (kind: SellKind | ''): string => (kind ? AREA_LABEL[kind] : '面積');

export interface SellInput extends CommonInput {
	kind: SellKind | '';
	ward: SellWard | '';
	address: string;
	areaSqm: string;
	builtYear: string;
	layout: string;
	condition: SellCondition | '';
	timing: SellTiming | '';
	assessment: SellAssessment | '';
}

export const EMPTY_SELL: SellInput = { ...EMPTY_COMMON, kind: '', ward: '', address: '', areaSqm: '', builtYear: '', layout: '', condition: '', timing: '', assessment: '' };

export function readSell(fd: FormLike): SellInput {
	return {
		...readCommon(fd),
		kind: str(fd, 'kind') as SellKind | '',
		ward: str(fd, 'ward') as SellWard | '',
		address: str(fd, 'address'),
		areaSqm: str(fd, 'areaSqm'),
		builtYear: str(fd, 'builtYear'),
		layout: str(fd, 'layout'),
		condition: str(fd, 'condition') as SellCondition | '',
		timing: str(fd, 'timing') as SellTiming | '',
		assessment: str(fd, 'assessment') as SellAssessment | '',
	};
}

export type SellErrors = Partial<Record<keyof SellInput, string>>;

/** 全角数字を半角にしてから数として読む(面積・築年。電話と同じ扱い) */
function toHalf(v: string): string {
	return v.replace(/[０-９．]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0)).trim();
}

/** thisYear は Action が渡す(築年の上限。ビルド時刻に固定しない) */
export function sellSchema(thisYear: number) {
	return commonSchema
		.extend({
			kind: z.enum(KIND_SLUGS, { message: '物件種別を選んでください' }),
			ward: z.enum(WARD_SLUGS, { message: '所在地の区を選んでください' }),
			address: z.string().trim().min(1, '町名以下の住所を入力してください').max(100, '住所は100文字以内で入力してください'),
			areaSqm: z.string(),
			builtYear: z.string(),
			layout: z.string(),
			condition: z.enum(CONDITION_SLUGS, { message: '現況を選んでください' }),
			timing: z.enum(TIMING_SLUGS).or(z.literal('')),
			assessment: z.enum(ASSESSMENT_SLUGS, { message: '査定の種類を選んでください' }),
		})
		.superRefine((v, ctx) => {
			// 面積は任意。入っていれば数として読めることだけ見る(単位は㎡。ラベルは種別で変わる)
			if (v.areaSqm.trim() !== '') {
				const n = Number(toHalf(v.areaSqm));
				if (!Number.isFinite(n) || n <= 0) ctx.addIssue({ code: 'custom', path: ['areaSqm'], message: `${areaLabel(v.kind)}は数字で入力してください(単位:㎡)` });
			}
			// 土地は築年・間取りを欄ごと出さないので、送られてきても見ない(値は validateSell が落とす)
			if (!hasBuiltAndLayout(v.kind as SellKind)) return;
			if (v.builtYear.trim() !== '') {
				const y = Number(toHalf(v.builtYear));
				if (!Number.isInteger(y) || y < 1900 || y > thisYear) ctx.addIssue({ code: 'custom', path: ['builtYear'], message: `築年は西暦4桁で入力してください(1900〜${thisYear})` });
			}
			if (v.layout !== '' && !(LAYOUT_OPTIONS as readonly string[]).includes(v.layout)) ctx.addIssue({ code: 'custom', path: ['layout'], message: '間取りを選び直してください' });
		});
}

export function validateSell(input: SellInput, thisYear: number): { ok: true; values: SellInput } | { ok: false; errors: SellErrors } {
	const r = sellSchema(thisYear).safeParse(input);
	if (!r.success) return { ok: false, errors: firstErrors<keyof SellInput>(r.error.issues) };
	const values = normalizeCommon(r.data as SellInput);
	// 土地は画面に欄が無いので、値も持たない(確認画面・メールに残さない)
	const stripped = hasBuiltAndLayout(values.kind as SellKind) ? values : { ...values, builtYear: '', layout: '' };
	return { ok: true, values: { ...stripped, areaSqm: toHalf(stripped.areaSqm) } };
}

/** 確認画面・メールの行(03 §6 フォーム部品 7:物件のこと → 連絡先)。土地では築年・間取りの行を出さない */
export function sellRows(v: SellInput): ConfirmRow[] {
	const rows: ConfirmRow[] = [
		{ label: '物件種別', value: kindLabel(v.kind) },
		{ label: '所在地', value: `${wardLabel(v.ward)}${v.address}` },
		{ label: areaLabel(v.kind), value: v.areaSqm ? `${v.areaSqm}㎡` : '—' },
	];
	if (hasBuiltAndLayout(v.kind as SellKind)) {
		rows.push({ label: '築年', value: v.builtYear ? `${v.builtYear}年` : '—' });
		rows.push({ label: '間取り', value: v.layout ? layoutLabel(v.layout) : '—' });
	}
	rows.push({ label: '現況', value: conditionLabel(v.condition) });
	rows.push({ label: '売却希望時期', value: v.timing ? timingLabel(v.timing) : '—' });
	rows.push({ label: '査定の種類', value: assessmentLabel(v.assessment) });
	return [...rows, ...commonRows(v, SELL_NOTE_LABEL)];
}

/** メールの件名。頭に用件、査定の種類と物件種別を添える */
export function sellSubject(v: SellInput): string {
	return `[査定依頼] ${kindLabel(v.kind)}・${assessmentLabel(v.assessment)}`;
}
