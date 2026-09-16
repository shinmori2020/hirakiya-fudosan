'use server';

/**
 * 問い合わせフォームの Server Action(実装順 5・J-102 c → J-105 で内見予約を /viewing に分離)。
 * 2段:confirmContact(検証 → 確認画面の状態を返す)/ sendContact(Turnstile → Resend)。同一 URL。
 * ロジック(lib/contact.ts・lib/forms/*)と I/O(lib/forms/deliver.ts・resolve-property.ts)は4本で共通、
 * UI と Action の流れは別実装(J-105 判断6)。送信内容を console・ログ・ファイルに出さない(forms.md §2)。
 * 対象物件は任意(◆15)。成約済み・不正な ID は物件なしとして受ける(J-037 と整合)。
 */
import { company, mainOffice } from '@/config/site';
import { DEPARTMENT, REPLY_BY } from '@/config/forms';
import { sendFormMails, verifyTurnstile } from '@/lib/forms/deliver';
import { resolveProperty, type ResolvedProperty } from '@/lib/forms/resolve-property';
import { confirmRows, mailSubject, readInput, validateContact, type ContactInput, type FieldErrors } from '@/lib/contact';
import { ContactMail } from '@/emails/contact';
import { ContactReplyMail } from '@/emails/contact-reply';

export type ContactProperty = ResolvedProperty;

export type ContactState =
	| { step: 'input'; values: ContactInput; errors: FieldErrors; message?: string }
	| { step: 'confirm'; values: ContactInput; property: ContactProperty | null; message?: string }
	| { step: 'done' };

const SOLD_MESSAGE = 'ご指定の物件は成約しています。物件を指定しないお問い合わせとして受け付けます。';

/** 1段目:検証して確認画面へ */
export async function confirmContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
	const input = readInput(formData);
	const r = validateContact(input);
	if (!r.ok) return { step: 'input', values: input, errors: r.errors };
	const { property, sold } = await resolveProperty(r.values.property);
	const values = property ? r.values : { ...r.values, property: '' };
	return { step: 'confirm', values, property, message: sold ? SOLD_MESSAGE : undefined };
}

/** 2段目:Turnstile → Resend → 完了。「修正する」で戻る時は入力画面の状態を返す */
export async function sendContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
	const input = readInput(formData);
	if (formData.get('intent') === 'back') return { step: 'input', values: input, errors: {} };

	// 確認画面の値も信用せず、もう一度検証・再解決する
	const r = validateContact(input);
	if (!r.ok) return { step: 'input', values: input, errors: r.errors };
	const { property } = await resolveProperty(r.values.property);
	const values = property ? r.values : { ...r.values, property: '' };

	const t = await verifyTurnstile(String(formData.get('cf-turnstile-response') ?? ''));
	if (!t.ok) return { step: 'confirm', values, property, message: t.message };

	const rows = confirmRows(values, property?.title);
	const sent = await sendFormMails({
		subject: mailSubject(values.kind, values.property),
		notice: ContactMail({ rows, notice: company.formNotice }),
		replySubject: `【${company.shortName}】お問い合わせを受け付けました`,
		reply: ContactReplyMail({
			rows,
			notice: company.formNotice,
			department: DEPARTMENT.contact,
			replyBy: REPLY_BY,
			hours: company.hours,
			closed: company.closed,
			tel: mainOffice.tel,
			companyName: company.name,
		}),
		userEmail: values.email,
	});
	if (!sent.ok) return { step: 'confirm', values, property, message: sent.message };
	return { step: 'done' };
}

/** フォームは1つの action に送る(useActionState は1つの関数しか持てない)。intent で2段を振り分ける */
export async function contactAction(prev: ContactState, formData: FormData): Promise<ContactState> {
	const intent = formData.get('intent');
	if (intent === 'send' || intent === 'back') return sendContact(prev, formData);
	return confirmContact(prev, formData);
}
