'use server';

/**
 * 内見予約・問い合わせフォームの Server Action(実装順 5・J-102 c)。
 * 2段:confirmContact(検証 → 確認画面の状態を返す)/ sendContact(Turnstile 検証 → Resend で送信)。
 * 入力 → 確認 → 完了 は同一 URL。クライアントは表示だけ(forms.md §3)。
 *
 * 守ること:
 *  - 送信内容を console・ログ・ファイルに出さない(forms.md §2。保存しない)
 *  - クライアントの表示を信用しない:物件は ID から index.json を読み直して再解決する
 *  - RESEND_API_KEY / TURNSTILE_SECRET_KEY が未設定なら、その工程を飛ばして完了まで通す(開発時)。飛ばしたことだけを console に出す
 */
import { Resend } from 'resend';
import { company, mainOffice } from '@/config/site';
import { CONTACT_DEPARTMENT, CONTACT_REPLY_BY } from '@/config/contact';
import { confirmRows, isPropertyNo, mailSubject, readInput, validateContact, type ContactInput, type FieldErrors } from '@/lib/contact';
import { mainPrice } from '@/lib/format';
import { getProperties } from '@/lib/properties';
import { ContactMail } from '@/emails/contact';
import { ContactReplyMail } from '@/emails/contact-reply';

/** 対象物件のうち、画面・メールに出す最小の項目 */
export interface ContactProperty {
	no: string;
	title: string;
	priceLabel: string;
	thumb: string | null;
	type: 'rental' | 'sale';
}

export type ContactState =
	| { step: 'input'; values: ContactInput; errors: FieldErrors; message?: string }
	| { step: 'confirm'; values: ContactInput; property: ContactProperty | null; message?: string }
	| { step: 'done' };

/** 今日(日本時間)の 'YYYY-MM-DD'。過去日の判定に使う */
function todayJst(): string {
	return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * ID から物件を読み直す。無い・形が違う → null(物件を指定しない問い合わせ)。
 * 成約済み → { sold: true } を返し、呼び出し側で物件なしに落とす(J-037 と整合)
 */
async function resolveProperty(no: string): Promise<{ property: ContactProperty | null; sold: boolean }> {
	if (!isPropertyNo(no)) return { property: null, sold: false };
	const p = (await getProperties()).find((x) => x.no === no);
	if (!p) return { property: null, sold: false };
	if (p.status === 'sold') return { property: null, sold: true };
	return { property: { no: p.no, title: p.title, priceLabel: mainPrice(p), thumb: p.thumb, type: p.type }, sold: false };
}

/** 1段目:検証して確認画面へ */
export async function confirmContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
	const input = readInput(formData);
	const r = validateContact(input, todayJst());
	if (!r.ok) return { step: 'input', values: input, errors: r.errors };
	const { property, sold } = await resolveProperty(r.values.property);
	const values = property ? r.values : { ...r.values, property: '' };
	return {
		step: 'confirm',
		values,
		property,
		message: sold ? 'ご指定の物件は成約しています。物件を指定しないお問い合わせとして受け付けます。' : undefined,
	};
}

/** Cloudflare Turnstile の siteverify(公式ドキュメントの手順)。secret が無ければ検証を飛ばす(開発時) */
async function verifyTurnstile(token: string): Promise<boolean> {
	const secret = process.env.TURNSTILE_SECRET_KEY;
	if (!secret) {
		console.info('[contact] TURNSTILE_SECRET_KEY 未設定のため、Turnstile の検証を飛ばしました(開発時のみ)');
		return true;
	}
	if (!token) return false;
	try {
		const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({ secret, response: token }),
			cache: 'no-store',
		});
		const data = (await res.json()) as { success?: boolean };
		return data.success === true;
	} catch {
		return false;
	}
}

/** 2段目:Turnstile → Resend → 完了。「修正する」で戻る時は入力画面の状態を返す */
export async function sendContact(prev: ContactState, formData: FormData): Promise<ContactState> {
	const input = readInput(formData);
	if (formData.get('intent') === 'back') return { step: 'input', values: input, errors: {} };

	// 確認画面の値も信用せず、もう一度検証する
	const r = validateContact(input, todayJst());
	if (!r.ok) return { step: 'input', values: input, errors: r.errors };
	const { property } = await resolveProperty(r.values.property);
	const values = property ? r.values : { ...r.values, property: '' };

	const token = String(formData.get('cf-turnstile-response') ?? '');
	if (!(await verifyTurnstile(token))) {
		return { step: 'confirm', values, property, message: '確認に失敗しました。ページを再読み込みして、もう一度お試しください。' };
	}

	const apiKey = process.env.RESEND_API_KEY;
	const to = process.env.CONTACT_EMAIL_TO;
	const from = process.env.CONTACT_EMAIL_FROM ?? 'noreply@example.com';
	if (!apiKey || !to) {
		console.info('[contact] RESEND_API_KEY または CONTACT_EMAIL_TO 未設定のため、メール送信を飛ばしました(開発時のみ)');
		return { step: 'done' };
	}

	const rows = confirmRows(values, property?.title);
	const subject = mailSubject(values.kind, values.property);
	const resend = new Resend(apiKey);
	try {
		await resend.emails.send({
			from,
			to,
			replyTo: values.email || undefined,
			subject,
			react: ContactMail({ rows, notice: company.formNotice }),
		});
		if (values.email) {
			await resend.emails.send({
				from,
				to: values.email,
				subject: `【${company.shortName}】お問い合わせを受け付けました`,
				react: ContactReplyMail({
					rows,
					notice: company.formNotice,
					department: CONTACT_DEPARTMENT,
					replyBy: CONTACT_REPLY_BY,
					hours: company.hours,
					closed: company.closed,
					tel: mainOffice.tel,
					companyName: company.name,
				}),
			});
		}
	} catch {
		// 内容は出さない。何が起きたか・どう直すかだけ返す
		return { step: 'confirm', values, property, message: '送信できませんでした。時間をおいて、もう一度お試しください。' };
	}
	void prev;
	return { step: 'done' };
}

/** フォームは1つの action に送る(useActionState は1つの関数しか持てないため)。intent で2段を振り分ける */
export async function contactAction(prev: ContactState, formData: FormData): Promise<ContactState> {
	const intent = formData.get('intent');
	if (intent === 'send' || intent === 'back') return sendContact(prev, formData);
	return confirmContact(prev, formData);
}
