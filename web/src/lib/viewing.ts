/**
 * 内見予約フォーム(/viewing)の純関数と Zod スキーマ(実装順 5・J-105 ①)。
 * 共通項目は lib/forms/common.ts、日付は lib/forms/dates.ts を使う。I/O は置かない。テストは viewing.test.ts(J-041)。
 *
 * 固有:対象物件(必須。無い・不正・成約済みは /contact へ・◆1 注記なし)/ 第1希望 日付+時間帯(必須)/ 第2希望 日付+時間帯(任意)。
 * 定休日(水曜)は選べなくせず、確認画面で注記する(J-105)。
 */
import { z } from 'zod';
import { CLOSED_WEEKDAY, TIME_SLOTS, type TimeSlot } from '@/config/viewing';
import { commonRows, commonSchema, EMPTY_COMMON, firstErrors, normalizeCommon, readCommon, str, type CommonInput, type ConfirmRow, type FormLike } from '@/lib/forms/common';
import { isClosedDay, isPastDate, parseDateOnly, preferredLabel } from '@/lib/forms/dates';

const SLOT_SLUGS = TIME_SLOTS.map((s) => s.slug) as [TimeSlot, ...TimeSlot[]];

export function slotLabel(slug: TimeSlot | ''): string {
	return slug ? (TIME_SLOTS.find((s) => s.slug === slug)?.label ?? slug) : '';
}

/** 物件番号の形(HR-R-0001 / HR-S-0001)。実在・成約済みは呼び出し側が index.json で確かめる */
export function isPropertyNo(v: string | null | undefined): v is string {
	return typeof v === 'string' && /^HR-[RS]-\d{4}$/.test(v);
}

export interface ViewingInput extends CommonInput {
	property: string;
	date1: string;
	slot1: TimeSlot | '';
	date2: string;
	slot2: TimeSlot | '';
}

export const EMPTY_VIEWING: ViewingInput = { ...EMPTY_COMMON, property: '', date1: '', slot1: '', date2: '', slot2: '' };

export function readViewing(fd: FormLike): ViewingInput {
	return {
		...readCommon(fd),
		property: str(fd, 'property'),
		date1: str(fd, 'date1'),
		slot1: str(fd, 'slot1') as TimeSlot | '',
		date2: str(fd, 'date2'),
		slot2: str(fd, 'slot2') as TimeSlot | '',
	};
}

export type ViewingErrors = Partial<Record<keyof ViewingInput, string>>;

/** スキーマ。today は 'YYYY-MM-DD'(過去日の判定。Action が渡す) */
export function viewingSchema(today: string) {
	const slot = z.enum(SLOT_SLUGS).or(z.literal(''));
	return commonSchema
		.extend({
			property: z.string().refine(isPropertyNo, '対象の物件が指定されていません'),
			date1: z.string(),
			slot1: slot,
			date2: z.string(),
			slot2: slot,
		})
		.superRefine((v, ctx) => {
			const date = (key: 'date1' | 'date2', required: boolean, label: string) => {
				if (!v[key]) {
					if (required) ctx.addIssue({ code: 'custom', path: [key], message: `${label}の日付を選んでください` });
					return false;
				}
				if (!parseDateOnly(v[key])) {
					ctx.addIssue({ code: 'custom', path: [key], message: '日付の形が違います' });
					return false;
				}
				if (isPastDate(v[key], today)) {
					ctx.addIssue({ code: 'custom', path: [key], message: '今日以降の日付を選んでください' });
					return false;
				}
				return true;
			};
			// 第1希望は 日付+時間帯 の両方が必須。第2希望は日付があれば時間帯も求める(片方だけの希望を残さない)
			if (date('date1', true, '第1希望') && !v.slot1) ctx.addIssue({ code: 'custom', path: ['slot1'], message: '第1希望の時間帯を選んでください' });
			if (date('date2', false, '第2希望') && !v.slot2) ctx.addIssue({ code: 'custom', path: ['slot2'], message: '第2希望の時間帯を選んでください' });
		});
}

export function validateViewing(input: ViewingInput, today: string): { ok: true; values: ViewingInput } | { ok: false; errors: ViewingErrors } {
	const r = viewingSchema(today).safeParse(input);
	if (!r.success) return { ok: false, errors: firstErrors<keyof ViewingInput>(r.error.issues) };
	return { ok: true, values: normalizeCommon(r.data as ViewingInput) };
}

/** 定休日に当たる希望(確認画面の注記に使う)。'第1希望' / '第2希望' の配列。無ければ空 */
export function closedDayHits(v: Pick<ViewingInput, 'date1' | 'date2'>, closedWeekday = CLOSED_WEEKDAY): string[] {
	const out: string[] = [];
	if (v.date1 && isClosedDay(v.date1, closedWeekday)) out.push('第1希望');
	if (v.date2 && isClosedDay(v.date2, closedWeekday)) out.push('第2希望');
	return out;
}

/** 確認画面・メールの行(並びは 03 §6 フォーム部品 7:対象物件 → 希望日時 → 連絡先) */
export function viewingRows(v: ViewingInput, propertyName: string): ConfirmRow[] {
	return [
		{ label: '対象物件', value: `${propertyName}(${v.property})` },
		{ label: '第1希望', value: preferredLabel(v.date1, slotLabel(v.slot1)) || '—' },
		{ label: '第2希望', value: preferredLabel(v.date2, slotLabel(v.slot2)) || '—' },
		...commonRows(v),
	];
}

/** メールの件名。頭に用件、物件番号を添える */
export function viewingSubject(propertyNo: string, type: 'rental' | 'sale'): string {
	return `[${type === 'sale' ? '見学予約' : '内見予約'}] ${propertyNo}`;
}

/** 対象物件が使えない時の行き先(◆1:注記は出さず /contact へ) */
export const VIEWING_FALLBACK = '/contact';
