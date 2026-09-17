'use server';

/**
 * 査定依頼フォームの Server Action(実装順 5・J-105 ③)。
 * 2段:confirmSell(検証 → 確認画面の状態を返す)/ sendSell(Turnstile → Resend)。同一 URL。
 * ロジック(lib/sell.ts・lib/forms/common.ts)と I/O(lib/forms/deliver.ts)は共通、UI と Action の流れは別実装(J-007・J-105 判断6)。
 * 対象物件は持たないので resolve-property.ts は使わない。送信内容を console・ログ・ファイルに出さない(forms.md §2)。
 */
import { company, mainOffice } from '@/config/site';
import { DEPARTMENT, REPLY_BY } from '@/config/forms';
import { sendFormMails, verifyTurnstile } from '@/lib/forms/deliver';
import { readSell, sellRows, sellSubject, validateSell, type SellErrors, type SellInput } from '@/lib/sell';
import { SellMail } from '@/emails/sell';
import { SellReplyMail } from '@/emails/sell-reply';

export type SellState = { step: 'input'; values: SellInput; errors: SellErrors; message?: string } | { step: 'confirm'; values: SellInput; message?: string } | { step: 'done' };

/** 築年の上限は「送信した時点の年」。ビルド時刻に固定しない */
const thisYear = () => Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric' }).format(new Date()));

/** 1段目:検証して確認画面へ */
export async function confirmSell(_prev: SellState, formData: FormData): Promise<SellState> {
	const input = readSell(formData);
	const r = validateSell(input, thisYear());
	if (!r.ok) return { step: 'input', values: input, errors: r.errors };
	return { step: 'confirm', values: r.values };
}

/** 2段目:Turnstile → Resend → 完了。「修正する」で戻る時は入力画面の状態を返す */
export async function sendSell(_prev: SellState, formData: FormData): Promise<SellState> {
	const input = readSell(formData);
	if (formData.get('intent') === 'back') return { step: 'input', values: input, errors: {} };

	// 確認画面の値も信用せず、もう一度検証する
	const r = validateSell(input, thisYear());
	if (!r.ok) return { step: 'input', values: input, errors: r.errors };
	const values = r.values;

	const t = await verifyTurnstile(String(formData.get('cf-turnstile-response') ?? ''));
	if (!t.ok) return { step: 'confirm', values, message: t.message };

	const rows = sellRows(values);
	const sent = await sendFormMails({
		subject: sellSubject(values),
		notice: SellMail({ rows, notice: company.formNotice }),
		replySubject: `【${company.shortName}】査定のご依頼を受け付けました`,
		reply: SellReplyMail({
			rows,
			notice: company.formNotice,
			department: DEPARTMENT.sell,
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
export async function sellAction(prev: SellState, formData: FormData): Promise<SellState> {
	const intent = formData.get('intent');
	if (intent === 'send' || intent === 'back') return sendSell(prev, formData);
	return confirmSell(prev, formData);
}
