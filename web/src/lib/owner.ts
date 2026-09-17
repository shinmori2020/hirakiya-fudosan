/**
 * 管理・空室相談フォーム(/owner)の純関数と Zod スキーマ(実装順 5・J-105 ④ → J-108)。
 * 共通項目は lib/forms/common.ts。I/O は置かない。テストは owner.test.ts(J-041)。
 *
 * 固有:相談内容(管理委託 / 空室・必須)/ 物件所在地 = 区の選択 + 自由入力(必須・③ と同じ)/
 * 戸数(任意・1〜1000 の整数)/ 現在の管理状況(自主管理 / 他社管理・任意)。
 * 対象物件は持たないので resolve-property.ts は使わない。
 */
import { z } from 'zod';
import { WARDS, type Ward } from '@/config/forms';
import { OWNER_MANAGES, OWNER_NOTE_LABEL, OWNER_TOPICS, UNITS_MAX, type OwnerManage, type OwnerTopic } from '@/config/owner';
import { commonRows, commonSchema, EMPTY_COMMON, firstErrors, normalizeCommon, readCommon, str, type CommonInput, type ConfirmRow, type FormLike } from '@/lib/forms/common';

export type { ConfirmRow } from '@/lib/forms/common';

const TOPIC_SLUGS = OWNER_TOPICS.map((t) => t.slug) as [OwnerTopic, ...OwnerTopic[]];
const WARD_SLUGS = WARDS.map((w) => w.slug) as [Ward, ...Ward[]];
const MANAGE_SLUGS = OWNER_MANAGES.map((m) => m.slug) as [OwnerManage, ...OwnerManage[]];

const label = <T extends string>(list: readonly { slug: T; label: string }[], slug: T | ''): string => (slug ? (list.find((x) => x.slug === slug)?.label ?? slug) : '');

export const topicLabel = (slug: OwnerTopic | '') => label(OWNER_TOPICS, slug);
export const wardLabel = (slug: Ward | '') => label(WARDS, slug);
export const manageLabel = (slug: OwnerManage | '') => label(OWNER_MANAGES, slug);

export interface OwnerInput extends CommonInput {
	topic: OwnerTopic | '';
	ward: Ward | '';
	address: string;
	units: string;
	manage: OwnerManage | '';
}

export const EMPTY_OWNER: OwnerInput = { ...EMPTY_COMMON, topic: '', ward: '', address: '', units: '', manage: '' };

export function readOwner(fd: FormLike): OwnerInput {
	return {
		...readCommon(fd),
		topic: str(fd, 'topic') as OwnerTopic | '',
		ward: str(fd, 'ward') as Ward | '',
		address: str(fd, 'address'),
		units: str(fd, 'units'),
		manage: str(fd, 'manage') as OwnerManage | '',
	};
}

export type OwnerErrors = Partial<Record<keyof OwnerInput, string>>;

/** 全角数字を半角にし、カンマを外してから数として読む(戸数。面積・電話と同じ扱い) */
export function normalizeUnits(raw: string): string {
	return raw
		.replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
		.replace(/[,,]/g, '')
		.trim();
}

export const ownerSchema = commonSchema
	.extend({
		topic: z.enum(TOPIC_SLUGS, { message: 'ご相談の種類を選んでください' }),
		ward: z.enum(WARD_SLUGS, { message: '所在地の区を選んでください' }),
		address: z.string().trim().min(1, '町名以下の住所を入力してください').max(100, '住所は100文字以内で入力してください'),
		units: z.string(),
		manage: z.enum(MANAGE_SLUGS).or(z.literal('')),
	})
	.superRefine((v, ctx) => {
		// 戸数は任意。入っていれば 1〜1000 の整数(桁の打ち間違いをその場で気づかせる・J-108)
		if (v.units.trim() === '') return;
		const n = Number(normalizeUnits(v.units));
		if (!Number.isInteger(n) || n < 1 || n > UNITS_MAX) ctx.addIssue({ code: 'custom', path: ['units'], message: `戸数は1以上の整数で入力してください(最大${UNITS_MAX})` });
	});

export function validateOwner(input: OwnerInput): { ok: true; values: OwnerInput } | { ok: false; errors: OwnerErrors } {
	const r = ownerSchema.safeParse(input);
	if (!r.success) return { ok: false, errors: firstErrors<keyof OwnerInput>(r.error.issues) };
	const values = normalizeCommon(r.data as OwnerInput);
	return { ok: true, values: { ...values, units: normalizeUnits(values.units) } };
}

/** 確認画面・メールの行(03 §6 フォーム部品 7:物件のこと → 連絡先) */
export function ownerRows(v: OwnerInput): ConfirmRow[] {
	return [
		{ label: 'ご相談の種類', value: topicLabel(v.topic) },
		{ label: '物件所在地', value: `${wardLabel(v.ward)}${v.address}` },
		{ label: '戸数', value: v.units ? `${v.units}戸` : '—' },
		{ label: '現在の管理状況', value: v.manage ? manageLabel(v.manage) : '—' },
		...commonRows(v, OWNER_NOTE_LABEL),
	];
}

/** メールの件名。頭に用件、相談の種類を添える */
export function ownerSubject(v: OwnerInput): string {
	return `[管理・空室のご相談] ${topicLabel(v.topic)}`;
}
