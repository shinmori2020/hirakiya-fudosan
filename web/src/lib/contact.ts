/**
 * 内見予約・問い合わせフォーム(/contact)の純関数と Zod スキーマ(実装順 5・J-102)。
 * 検証は境界(Server Action)で行い、クライアントは表示だけ(forms.md §3)。
 * ここには I/O(Resend・Turnstile・JSON の読み込み)を置かない。テストは contact.test.ts(J-041)。
 */
import { z } from 'zod';
import { CONTACT_KINDS, CONTACT_METHODS, DEFAULT_KIND, TIME_SLOTS, type ContactKind, type ContactMethod, type TimeSlot } from '@/config/contact';

const KIND_SLUGS = CONTACT_KINDS.map((k) => k.slug) as [ContactKind, ...ContactKind[]];
const SLOT_SLUGS = TIME_SLOTS.map((s) => s.slug) as [TimeSlot, ...TimeSlot[]];
const METHOD_SLUGS = CONTACT_METHODS.map((m) => m.slug) as [ContactMethod, ...ContactMethod[]];

/* -------------------------------------------------------------------------
 * URL クエリの解釈(`?kind=` `?property=`)。不正な値は落として既定に倒す(parseQuery に新しい解析を足さない・J-095)
 * ---------------------------------------------------------------------- */

/** `?kind=` → 種別。無い・不正なら「質問」 */
export function kindFromQuery(v: string | null | undefined): ContactKind {
	return (KIND_SLUGS as readonly string[]).includes(v ?? '') ? (v as ContactKind) : DEFAULT_KIND;
}

/** 物件番号の形(HR-R-0001 / HR-S-0001)。一覧に実在するかは呼び出し側が index.json で確かめる */
export function isPropertyNo(v: string | null | undefined): v is string {
	return typeof v === 'string' && /^HR-[RS]-\d{4}$/.test(v);
}

export function kindLabel(slug: ContactKind): string {
	return CONTACT_KINDS.find((k) => k.slug === slug)?.label ?? slug;
}
export function slotLabel(slug: TimeSlot): string {
	return TIME_SLOTS.find((s) => s.slug === slug)?.label ?? slug;
}
export function methodLabel(slug: ContactMethod): string {
	return CONTACT_METHODS.find((m) => m.slug === slug)?.label ?? slug;
}

/* -------------------------------------------------------------------------
 * 電話番号。全角数字・空白を許し、判定は数字だけで行う(10〜11桁)。表示はハイフン付きのまま返す
 * ---------------------------------------------------------------------- */
export function normalizePhone(raw: string): string {
	return raw
		.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
		.replace(/[ー－―‐−–—]/g, '-') // 長音・全角ハイフン・ダッシュ類・マイナス記号(U+2212)
		.replace(/[\s()()]/g, '')
		.trim();
}
export function isPhone(v: string): boolean {
	const digits = normalizePhone(v).replace(/-/g, '');
	return /^0\d{9,10}$/.test(digits);
}

/* -------------------------------------------------------------------------
 * 希望日時。`<input type="date">` の 'YYYY-MM-DD' を、時刻に依らず暦日として扱う(タイムゾーンで日付がずれないように)
 * ---------------------------------------------------------------------- */
const WEEKDAY = ['日', '月', '火', '水', '木', '金', '土'];

export function parseDateOnly(v: string): { y: number; m: number; d: number } | null {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
	if (!m) return null;
	const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
	const dt = new Date(Date.UTC(y, mo - 1, d));
	if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null; // 2月30日など
	return { y, m: mo, d };
}

/** 今日(暦日)より前か。today も 'YYYY-MM-DD' で渡す */
export function isPastDate(v: string, today: string): boolean {
	return v < today;
}

/** '2026-09-20' + 'morning' → '2026年9月20日(日) 午前'。日付が無ければ '' */
export function preferredLabel(date: string, slot: TimeSlot | ''): string {
	const p = parseDateOnly(date);
	if (!p) return '';
	const w = WEEKDAY[new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay()];
	return `${p.y}年${p.m}月${p.d}日(${w})${slot ? ` ${slotLabel(slot)}` : ''}`;
}

/* -------------------------------------------------------------------------
 * 入力の型と Zod スキーマ。必須は 氏名・電話・(内見希望のみ)第1希望日・同意(forms.md §1)
 * エラー文言は「何が・どう直すか」。謝らない(forms.md §3)
 * ---------------------------------------------------------------------- */
export interface ContactInput {
	property: string; // 物件番号 or ''
	kind: ContactKind;
	date1: string;
	slot1: TimeSlot | '';
	date2: string;
	slot2: TimeSlot | '';
	name: string;
	kana: string;
	phone: string;
	email: string;
	method: ContactMethod | '';
	note: string;
	agree: boolean;
}

export const EMPTY_INPUT: ContactInput = {
	property: '',
	kind: DEFAULT_KIND,
	date1: '',
	slot1: '',
	date2: '',
	slot2: '',
	name: '',
	kana: '',
	phone: '',
	email: '',
	method: '',
	note: '',
	agree: false,
};

/** FormData → ContactInput(未送信のキーは空にする。検証はしない) */
export function readInput(fd: { get(name: string): FormDataEntryValue | null }): ContactInput {
	const s = (k: string) => {
		const v = fd.get(k);
		return typeof v === 'string' ? v : '';
	};
	return {
		property: s('property'),
		kind: kindFromQuery(s('kind')),
		date1: s('date1'),
		slot1: s('slot1') as TimeSlot | '',
		date2: s('date2'),
		slot2: s('slot2') as TimeSlot | '',
		name: s('name'),
		kana: s('kana'),
		phone: s('phone'),
		email: s('email'),
		method: s('method') as ContactMethod | '',
		note: s('note'),
		agree: s('agree') === 'on' || s('agree') === '1',
	};
}

export type FieldErrors = Partial<Record<keyof ContactInput, string>>;

/** スキーマ。today は 'YYYY-MM-DD'(過去日の判定に使う。Action が渡す) */
export function contactSchema(today: string) {
	const slot = z.enum(SLOT_SLUGS).or(z.literal(''));
	return z
		.object({
			property: z.string().refine((v) => v === '' || isPropertyNo(v), '物件番号の形が違います'),
			kind: z.enum(KIND_SLUGS),
			date1: z.string(),
			slot1: slot,
			date2: z.string(),
			slot2: slot,
			name: z.string().trim().min(1, 'お名前を入力してください').max(50, 'お名前は50文字以内で入力してください'),
			kana: z.string().trim().max(50, 'ふりがなは50文字以内で入力してください'),
			phone: z.string().trim().min(1, '電話番号を入力してください').refine(isPhone, '電話番号は数字とハイフンで入力してください(10〜11桁)'),
			email: z.string().trim().refine((v) => v === '' || z.email().safeParse(v).success, 'メールアドレスの形が違います(例:name@example.com)'),
			method: z.enum(METHOD_SLUGS).or(z.literal('')),
			note: z.string().max(1000, '備考は1000文字以内で入力してください'),
			agree: z.boolean().refine((v) => v, 'プライバシーポリシーへの同意にチェックを入れてください'),
		})
		.superRefine((v, ctx) => {
			const checkDate = (key: 'date1' | 'date2', required: boolean) => {
				const d = v[key];
				if (!d) {
					if (required) ctx.addIssue({ code: 'custom', path: [key], message: '第1希望の日付を選んでください' });
					return;
				}
				if (!parseDateOnly(d)) ctx.addIssue({ code: 'custom', path: [key], message: '日付の形が違います' });
				else if (isPastDate(d, today)) ctx.addIssue({ code: 'custom', path: [key], message: '今日以降の日付を選んでください' });
			};
			// 希望日時は内見希望の時だけ。他の種別では入っていても見ない(画面にも出さない)
			if (v.kind === 'viewing') {
				checkDate('date1', true);
				checkDate('date2', false);
			}
		});
}

/** 検証。通れば正規化した値(電話の全角→半角・前後の空白を落とす)、通らなければ欄ごとのエラー */
export function validateContact(input: ContactInput, today: string): { ok: true; values: ContactInput } | { ok: false; errors: FieldErrors } {
	const r = contactSchema(today).safeParse(input);
	if (!r.success) {
		const errors: FieldErrors = {};
		for (const issue of r.error.issues) {
			const key = issue.path[0] as keyof ContactInput | undefined;
			if (key && !errors[key]) errors[key] = issue.message;
		}
		return { ok: false, errors };
	}
	const v = r.data as ContactInput;
	const viewing = v.kind === 'viewing';
	return {
		ok: true,
		values: {
			...v,
			phone: normalizePhone(v.phone),
			// 内見希望でない時の希望日時は捨てる(確認画面・メールに出さない)
			date1: viewing ? v.date1 : '',
			slot1: viewing ? v.slot1 : '',
			date2: viewing ? v.date2 : '',
			slot2: viewing ? v.slot2 : '',
		},
	};
}

/* -------------------------------------------------------------------------
 * 確認画面・メールの行(同じ項目順。03 §6 フォーム部品 7:任意項目が空なら「—」)
 * ---------------------------------------------------------------------- */
export interface ConfirmRow {
	label: string;
	value: string;
}
export function confirmRows(v: ContactInput, propertyName?: string): ConfirmRow[] {
	const dash = (s: string) => (s ? s : '—');
	const rows: ConfirmRow[] = [{ label: '対象物件', value: propertyName ? `${propertyName}(${v.property})` : '指定なし' }, { label: '種別', value: kindLabel(v.kind) }];
	if (v.kind === 'viewing') {
		rows.push({ label: '第1希望', value: dash(preferredLabel(v.date1, v.slot1)) });
		rows.push({ label: '第2希望', value: dash(preferredLabel(v.date2, v.slot2)) });
	}
	rows.push(
		{ label: 'お名前', value: v.name },
		{ label: 'ふりがな', value: dash(v.kana) },
		{ label: '電話番号', value: v.phone },
		{ label: 'メール', value: dash(v.email) },
		{ label: '希望連絡方法', value: v.method ? methodLabel(v.method) : '—' },
		{ label: '備考', value: dash(v.note) },
	);
	return rows;
}

/** メールの件名。頭に種別(forms.md / J-102) */
export function mailSubject(kind: ContactKind, propertyNo: string): string {
	return `[${kindLabel(kind)}] お問い合わせ${propertyNo ? `(${propertyNo})` : ''}`;
}
