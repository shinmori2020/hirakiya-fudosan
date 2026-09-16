import 'server-only';
/**
 * フォーム4本の I/O(J-105 で共通化。判断6:ロジックと I/O は共通、UI と Action の流れは別実装)。
 * ここは I/O なので Vitest の対象外(J-041)。純関数は common.ts / dates.ts に置く。
 *
 *  - Turnstile:Cloudflare の siteverify(公式手順)。トークンが無い・検証に失敗した送信は拒否(J-102 b)
 *  - Resend:SHIN 宛の通知1通 + 入力メールがあれば自動返信1通。`@react-email/render` で html / text を作って渡す
 *    (`react:` prop は流用元で本番バンドルが落ちた記録があるため使わない・J-105)
 *  - キー未設定(J-105):開発時はその工程を飛ばして完了まで通し、console にその旨だけ出す。
 *    **本番(NODE_ENV === 'production')では拒否**して「送信できませんでした」を返す(設定漏れを成功に見せない)
 *  - サンドボックス送信元(onboarding@resend.dev)の間は自動返信を送らない(本人以外に送れず 403 になる)
 *  - 送信内容を console・ログ・ファイルに出さない(forms.md §2)
 */
import { render } from '@react-email/render';
import { Resend } from 'resend';
import type { ReactElement } from 'react';

const PROD = process.env.NODE_ENV === 'production';
const SANDBOX_FROM = 'onboarding@resend.dev';
/** 利用者に見せる文言(何が起きたか・どう直すか。謝らない) */
export const MSG_TURNSTILE = '確認に失敗しました。ページを再読み込みして、もう一度お試しください。';
export const MSG_SEND = '送信できませんでした。時間をおいて、もう一度お試しください。';
export const MSG_NOT_CONFIGURED = '現在、送信を受け付けられません。お電話でお問い合わせください。';

export type DeliverResult = { ok: true } | { ok: false; message: string };

/** Turnstile の検証。secret が無ければ 開発時は通す / 本番は拒否 */
export async function verifyTurnstile(token: string): Promise<DeliverResult> {
	const secret = process.env.TURNSTILE_SECRET_KEY;
	if (!secret) {
		if (PROD) return { ok: false, message: MSG_NOT_CONFIGURED };
		console.info('[forms] TURNSTILE_SECRET_KEY 未設定のため、Turnstile の検証を飛ばしました(開発時のみ)');
		return { ok: true };
	}
	if (!token) return { ok: false, message: MSG_TURNSTILE };
	try {
		const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({ secret, response: token }),
			cache: 'no-store',
		});
		const data = (await res.json()) as { success?: boolean };
		return data.success === true ? { ok: true } : { ok: false, message: MSG_TURNSTILE };
	} catch {
		return { ok: false, message: MSG_TURNSTILE };
	}
}

export interface MailJob {
	/** SHIN 宛の件名と本文 */
	subject: string;
	notice: ReactElement;
	/** 自動返信(入力メールが無ければ送らない) */
	replySubject: string;
	reply: ReactElement;
	/** 送信者のメール('' なら自動返信なし) */
	userEmail: string;
}

/** SHIN 宛 + 自動返信。キー未設定は 開発時は飛ばす / 本番は拒否 */
export async function sendFormMails(job: MailJob): Promise<DeliverResult> {
	const apiKey = process.env.RESEND_API_KEY;
	const to = process.env.CONTACT_EMAIL_TO;
	const from = process.env.CONTACT_EMAIL_FROM ?? SANDBOX_FROM;
	if (!apiKey || !to) {
		if (PROD) return { ok: false, message: MSG_NOT_CONFIGURED };
		console.info('[forms] RESEND_API_KEY または CONTACT_EMAIL_TO 未設定のため、メール送信を飛ばしました(開発時のみ)');
		return { ok: true };
	}
	const resend = new Resend(apiKey);
	try {
		const notice = await resend.emails.send({
			from,
			to,
			replyTo: job.userEmail || undefined,
			subject: job.subject,
			html: await render(job.notice),
			text: await render(job.notice, { plainText: true }),
		});
		if (notice.error) throw notice.error;

		// 自動返信。サンドボックス送信元では本人以外に送れないので送らない(J-105)
		if (job.userEmail) {
			if (from.includes(SANDBOX_FROM) && job.userEmail.toLowerCase() !== to.toLowerCase()) {
				console.info('[forms] サンドボックス送信元のため自動返信を飛ばしました(SHIN 宛の通知は送信済み)');
			} else {
				const reply = await resend.emails.send({
					from,
					to: job.userEmail,
					subject: job.replySubject,
					html: await render(job.reply),
					text: await render(job.reply, { plainText: true }),
				});
				// 自動返信の失敗は通知の成功を打ち消さない(内容は出さない)
				if (reply.error) console.warn('[forms] 自動返信に失敗しました(SHIN 宛の通知は送信済み)');
			}
		}
		return { ok: true };
	} catch {
		return { ok: false, message: MSG_SEND };
	}
}
