/**
 * 問い合わせフォーム(/contact)の純関数と Zod スキーマ(実装順 5・J-102 → J-105 で内見予約を /viewing に分離)。
 * 共通項目は lib/forms/common.ts。I/O は置かない。テストは contact.test.ts(J-041)。
 *
 * 固有:種別(空室確認 / 質問 / 来店予約 / 法人 / 採用・必須)/ 対象物件(あれば・任意・◆15)。
 * 種別ごとの備考のラベル・必須(項目表)は ② の着手時に入れる。
 */
import { z } from 'zod';
import { CONTACT_KINDS, DEFAULT_KIND, NOTE_FIELD, type ContactKind } from '@/config/contact';
import { commonRows, commonSchema, EMPTY_COMMON, firstErrors, normalizeCommon, readCommon, str, type CommonInput, type ConfirmRow, type FormLike } from '@/lib/forms/common';
import { isPropertyNo } from '@/lib/viewing';

export type { ConfirmRow } from '@/lib/forms/common';
export { isPropertyNo };

const KIND_SLUGS = CONTACT_KINDS.map((k) => k.slug) as [ContactKind, ...ContactKind[]];

/** `?kind=` → 種別。無い・不正(viewing を含む)なら「質問」 */
export function kindFromQuery(v: string | null | undefined): ContactKind {
	return (KIND_SLUGS as readonly string[]).includes(v ?? '') ? (v as ContactKind) : DEFAULT_KIND;
}

export function kindLabel(slug: ContactKind): string {
	return CONTACT_KINDS.find((k) => k.slug === slug)?.label ?? slug;
}

export interface ContactInput extends CommonInput {
	property: string; // 物件番号 or ''
	kind: ContactKind;
}

export const EMPTY_INPUT: ContactInput = { ...EMPTY_COMMON, property: '', kind: DEFAULT_KIND };

/** FormData → ContactInput(未送信のキーは空にする。検証はしない) */
export function readInput(fd: FormLike): ContactInput {
	return { ...readCommon(fd), property: str(fd, 'property'), kind: kindFromQuery(str(fd, 'kind')) };
}

export type FieldErrors = Partial<Record<keyof ContactInput, string>>;

/** 備考のラベル・必須・補足(種別で変わる・J-105 ②) */
export function noteField(kind: ContactKind): { label: string; required: boolean; hint?: string } {
	return NOTE_FIELD[kind];
}

export const contactSchema = commonSchema
	.extend({
		property: z.string().refine((v) => v === '' || isPropertyNo(v), '物件番号の形が違います'),
		kind: z.enum(KIND_SLUGS),
	})
	// 用件を書く欄になる種別(質問・来店予約)では備考を必須にする。文言はその種別のラベルで言う
	.superRefine((v, ctx) => {
		const f = noteField(v.kind);
		if (f.required && v.note.trim() === '') ctx.addIssue({ code: 'custom', path: ['note'], message: `${f.label}を入力してください` });
	});

/** 検証。通れば正規化した値、通らなければ欄ごとのエラー */
export function validateContact(input: ContactInput): { ok: true; values: ContactInput } | { ok: false; errors: FieldErrors } {
	const r = contactSchema.safeParse(input);
	if (!r.success) return { ok: false, errors: firstErrors<keyof ContactInput>(r.error.issues) };
	return { ok: true, values: normalizeCommon(r.data as ContactInput) };
}

/**
 * 確認画面・メールの行(並びは 03 §6 フォーム部品 7:対象物件 → 種別 → 連絡先)。
 * 備考の行は入力画面と同じラベルにする(「ご質問の内容」で書いたものが確認で「備考」になると別の項目に見えるため)。
 */
export function confirmRows(v: ContactInput, propertyName?: string): ConfirmRow[] {
	return [{ label: '対象物件', value: propertyName ? `${propertyName}(${v.property})` : '指定なし' }, { label: '種別', value: kindLabel(v.kind) }, ...commonRows(v, noteField(v.kind).label)];
}

/** メールの件名。頭に種別、物件があれば番号 */
export function mailSubject(kind: ContactKind, propertyNo: string): string {
	return `[${kindLabel(kind)}] お問い合わせ${propertyNo ? `(${propertyNo})` : ''}`;
}
