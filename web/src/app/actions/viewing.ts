'use server';

/**
 * 内見予約フォームの Server Action(実装順 5・J-105 ①)。UI と Action の流れは /contact と別実装、
 * ロジック(lib/viewing.ts・lib/forms/*)と I/O(lib/forms/deliver.ts・resolve-property.ts)は共通(判断6・◆12)。
 * 2段:confirmViewing(検証 → 確認画面の状態)/ sendViewing(Turnstile → Resend → 完了)。同一 URL。
 * 対象物件は必須。ID から読み直して 無い・成約済み なら /contact へ(◆1:注記は出さない)。
 * 送信内容を console・ログ・ファイルに出さない(forms.md §2)。
 */
import { company, mainOffice } from '@/config/site';
import { DEPARTMENT, REPLY_BY } from '@/config/forms';
import { todayJst } from '@/lib/forms/dates';
import { sendFormMails, verifyTurnstile } from '@/lib/forms/deliver';
import { resolveProperty, type ResolvedProperty } from '@/lib/forms/resolve-property';
import { closedDayHits, readViewing, validateViewing, VIEWING_FALLBACK, viewingRows, viewingSubject, type ViewingErrors, type ViewingInput } from '@/lib/viewing';
import { ViewingMail } from '@/emails/viewing';
import { ViewingReplyMail } from '@/emails/viewing-reply';

export type ViewingState =
	| { step: 'input'; values: ViewingInput; errors: ViewingErrors; message?: string; redirect?: string }
	| { step: 'confirm'; values: ViewingInput; property: ResolvedProperty; closedHits: string[]; message?: string }
	| { step: 'done'; type: 'rental' | 'sale' };

/** 1段目:検証 → 対象物件の再解決 → 確認画面 */
export async function confirmViewing(_prev: ViewingState, formData: FormData): Promise<ViewingState> {
	const input = readViewing(formData);
	const r = validateViewing(input, todayJst());
	if (!r.ok) return { step: 'input', values: input, errors: r.errors };
	const { property } = await resolveProperty(r.values.property);
	// 対象物件が使えない(無い・成約済み)→ 問い合わせへ。注記は出さない(◆1)
	if (!property) return { step: 'input', values: input, errors: {}, redirect: VIEWING_FALLBACK };
	return { step: 'confirm', values: r.values, property, closedHits: closedDayHits(r.values) };
}

/** 2段目:Turnstile → Resend → 完了。「修正する」で戻る時は入力画面の状態を返す */
export async function sendViewing(_prev: ViewingState, formData: FormData): Promise<ViewingState> {
	const input = readViewing(formData);
	if (formData.get('intent') === 'back') return { step: 'input', values: input, errors: {} };

	// 確認画面の値も信用せず、もう一度検証・再解決する
	const r = validateViewing(input, todayJst());
	if (!r.ok) return { step: 'input', values: input, errors: r.errors };
	const { property } = await resolveProperty(r.values.property);
	if (!property) return { step: 'input', values: input, errors: {}, redirect: VIEWING_FALLBACK };
	const closedHits = closedDayHits(r.values);

	const t = await verifyTurnstile(String(formData.get('cf-turnstile-response') ?? ''));
	if (!t.ok) return { step: 'confirm', values: r.values, property, closedHits, message: t.message };

	const rows = viewingRows(r.values, property.title);
	const sent = await sendFormMails({
		subject: viewingSubject(property.no, property.type),
		notice: ViewingMail({ rows, notice: company.formNotice, closedHits }),
		replySubject: `【${company.shortName}】${property.type === 'sale' ? '見学' : '内見'}のご予約を受け付けました`,
		reply: ViewingReplyMail({
			rows,
			notice: company.formNotice,
			department: DEPARTMENT.viewing,
			replyBy: REPLY_BY,
			hours: company.hours,
			closed: company.closed,
			tel: mainOffice.tel,
			companyName: company.name,
			closedHits,
		}),
		userEmail: r.values.email,
	});
	if (!sent.ok) return { step: 'confirm', values: r.values, property, closedHits, message: sent.message };
	return { step: 'done', type: property.type };
}

/** フォームは1つの action に送る(useActionState は1つの関数しか持てない)。intent で2段を振り分ける */
export async function viewingAction(prev: ViewingState, formData: FormData): Promise<ViewingState> {
	const intent = formData.get('intent');
	if (intent === 'send' || intent === 'back') return sendViewing(prev, formData);
	return confirmViewing(prev, formData);
}
