'use server';

/**
 * 管理・空室相談フォームの Server Action(実装順 5・J-105 ④ → J-108)。
 * 2段:confirmOwner(検証 → 確認画面の状態を返す)/ sendOwner(Turnstile → Resend)。同一 URL。
 * ロジック(lib/owner.ts・lib/forms/common.ts)と I/O(lib/forms/deliver.ts)は共通、UI と Action の流れは別実装(J-007・J-105 判断6)。
 * 対象物件は持たないので resolve-property.ts は使わない。送信内容を console・ログ・ファイルに出さない(forms.md §2)。
 */
import { company, mainOffice } from '@/config/site';
import { DEPARTMENT, REPLY_BY } from '@/config/forms';
import { sendFormMails, verifyTurnstile } from '@/lib/forms/deliver';
import { ownerRows, ownerSubject, readOwner, validateOwner, type OwnerErrors, type OwnerInput } from '@/lib/owner';
import { OwnerMail } from '@/emails/owner';
import { OwnerReplyMail } from '@/emails/owner-reply';

export type OwnerState = { step: 'input'; values: OwnerInput; errors: OwnerErrors; message?: string } | { step: 'confirm'; values: OwnerInput; message?: string } | { step: 'done' };

/** 1段目:検証して確認画面へ */
export async function confirmOwner(_prev: OwnerState, formData: FormData): Promise<OwnerState> {
	const input = readOwner(formData);
	const r = validateOwner(input);
	if (!r.ok) return { step: 'input', values: input, errors: r.errors };
	return { step: 'confirm', values: r.values };
}

/** 2段目:Turnstile → Resend → 完了。「修正する」で戻る時は入力画面の状態を返す */
export async function sendOwner(_prev: OwnerState, formData: FormData): Promise<OwnerState> {
	const input = readOwner(formData);
	if (formData.get('intent') === 'back') return { step: 'input', values: input, errors: {} };

	// 確認画面の値も信用せず、もう一度検証する
	const r = validateOwner(input);
	if (!r.ok) return { step: 'input', values: input, errors: r.errors };
	const values = r.values;

	const t = await verifyTurnstile(String(formData.get('cf-turnstile-response') ?? ''));
	if (!t.ok) return { step: 'confirm', values, message: t.message };

	const rows = ownerRows(values);
	const sent = await sendFormMails({
		subject: ownerSubject(values),
		notice: OwnerMail({ rows, notice: company.formNotice }),
		replySubject: `【${company.shortName}】管理・空室のご相談を受け付けました`,
		reply: OwnerReplyMail({
			rows,
			notice: company.formNotice,
			department: DEPARTMENT.owner,
			replyBy: REPLY_BY,
			hours: company.hours,
			closed: company.closed,
			tel: mainOffice.tel,
			companyName: company.name,
		}),
		userEmail: values.email,
	});
	if (!sent.ok) return { step: 'confirm', values, message: sent.message };
	return { step: 'done' };
}

/** フォームは1つの action に送る(useActionState は1つの関数しか持てない)。intent で2段を振り分ける */
export async function ownerAction(prev: OwnerState, formData: FormData): Promise<OwnerState> {
	const intent = formData.get('intent');
	if (intent === 'send' || intent === 'back') return sendOwner(prev, formData);
	return confirmOwner(prev, formData);
}
