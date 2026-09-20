/**
 * フォーム4本の共通項目(氏名 / ふりがな / 電話 / メール / 希望連絡方法 / 備考 / 同意)の純関数(J-105)。
 * 各フォームはこの部分スキーマに固有項目を足す(`commonSchema.extend(...)`)。
 * 必須は 氏名・電話・同意(forms.md §1)。エラー文言は「何が・どう直すか」で謝らない(forms.md §3)。
 * I/O は置かない。テストは common.test.ts(J-041)。
 */
import { z } from 'zod';
import { CONTACT_METHODS, type ContactMethod } from '@/config/forms';

const METHOD_SLUGS = CONTACT_METHODS.map((m) => m.slug) as [ContactMethod, ...ContactMethod[]];

/* -------------------------------------------------------------------------
 * 電話番号。全角数字・空白・ダッシュ類を直し、判定は数字だけで行う(10〜11桁・先頭0)。表示はハイフン付きのまま
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

/**
 * 選択肢の slug → 表示名(③④ が同じ実装を持っていたので共通化した)。
 * 選択肢の配列は `{ slug, label }` の形で config に置く(config/forms.ts・config/sell.ts・config/owner.ts)。
 * 見つからない時は slug をそのまま返す(表示が消えるより、値が見える方が原因を追える)。
 */
export function optionLabel<T extends string>(list: readonly { slug: T; label: string }[], slug: T | ''): string {
	return slug ? (list.find((x) => x.slug === slug)?.label ?? slug) : '';
}

function methodLabel(slug: ContactMethod): string {
	return CONTACT_METHODS.find((m) => m.slug === slug)?.label ?? slug;
}

/* -------------------------------------------------------------------------
 * 共通項目の型・空値・FormData の読み取り
 * ---------------------------------------------------------------------- */
export interface CommonInput {
	name: string;
	kana: string;
	phone: string;
	email: string;
	method: ContactMethod | '';
	note: string;
	agree: boolean;
}

export const EMPTY_COMMON: CommonInput = { name: '', kana: '', phone: '', email: '', method: '', note: '', agree: false };

/** FormData 相当のもの(get だけ使う)。テストでは Map で代用する */
export interface FormLike {
	get(name: string): FormDataEntryValue | null;
}
export const str = (fd: FormLike, k: string): string => {
	const v = fd.get(k);
	return typeof v === 'string' ? v : '';
};

export function readCommon(fd: FormLike): CommonInput {
	return {
		name: str(fd, 'name'),
		kana: str(fd, 'kana'),
		phone: str(fd, 'phone'),
		email: str(fd, 'email'),
		method: str(fd, 'method') as ContactMethod | '',
		note: str(fd, 'note'),
		agree: str(fd, 'agree') === 'on' || str(fd, 'agree') === '1',
	};
}

/* -------------------------------------------------------------------------
 * 部分スキーマ。備考の必須・上限はフォームごとに違うので、ここでは上限だけ(必須は各フォームが superRefine で足す)
 * ---------------------------------------------------------------------- */
export const commonSchema = z.object({
	name: z.string().trim().min(1, 'お名前を入力してください').max(50, 'お名前は50文字以内で入力してください'),
	kana: z.string().trim().max(50, 'ふりがなは50文字以内で入力してください'),
	phone: z.string().trim().min(1, '電話番号を入力してください').refine(isPhone, '電話番号は数字とハイフンで入力してください(10〜11桁)'),
	email: z.string().trim().refine((v) => v === '' || z.email().safeParse(v).success, 'メールアドレスの形が違います(例:name@example.com)'),
	method: z.enum(METHOD_SLUGS).or(z.literal('')),
	note: z.string().max(1000, '備考は1000文字以内で入力してください'),
	agree: z.boolean().refine((v) => v, 'プライバシーポリシーへの同意にチェックを入れてください'),
});

/** Zod の issues → 欄ごとに最初の1件だけ */
export function firstErrors<K extends string>(issues: { path: PropertyKey[]; message: string }[]): Partial<Record<K, string>> {
	const out: Partial<Record<K, string>> = {};
	for (const issue of issues) {
		const key = issue.path[0] as K | undefined;
		if (key !== undefined && !out[key]) out[key] = issue.message;
	}
	return out;
}

/** 通った値の正規化(電話の全角 → 半角) */
export function normalizeCommon<T extends CommonInput>(v: T): T {
	return { ...v, phone: normalizePhone(v.phone) };
}

/* -------------------------------------------------------------------------
 * 確認画面・メールの行(共通部分。並びは 03 §6 フォーム部品 7:任意項目が空なら「—」)
 * ---------------------------------------------------------------------- */
export interface ConfirmRow {
	label: string;
	value: string;
}
const dash = (s: string) => (s ? s : '—');

export function commonRows(v: CommonInput, noteLabel = '備考'): ConfirmRow[] {
	return [
		{ label: 'お名前', value: v.name },
		{ label: 'ふりがな', value: dash(v.kana) },
		{ label: '電話番号', value: v.phone },
		{ label: 'メール', value: dash(v.email) },
		{ label: '希望連絡方法', value: v.method ? methodLabel(v.method) : '—' },
		{ label: noteLabel, value: dash(v.note) },
	];
}
