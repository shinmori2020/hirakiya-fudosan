'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { Container } from '@/components/layout/Container';
import { company, mainOffice } from '@/config/site';

/**
 * フォーム4本(/viewing /contact /sell /owner)のエラー画面(J-109)。
 * **通信が切れた状態で送信すると、Server Action の要求そのものが失敗する。** そのときの既定の画面は
 * 英語の "This page couldn't load"(実測・09/17)で、回線が戻っても復帰しない。ここで日本語に差し替える。
 *
 * Turnstile の検証失敗・Resend の失敗は Action が **確認画面に赤字で戻す**ので、ここには来ない(触らない)。
 * **入力の復元はここではできない**(状態はクライアントのメモリにあり、この境界に落ちた時点で失われる)。
 * 復元は実装順 9 で扱う。ここでは「もう一度試す」と電話の導線までを出す。
 */
export default function InquiryError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
	useEffect(() => {
		// 送信内容はログに出さない(forms.md §2)。digest だけを残す
		console.error('[forms] 画面の描画または送信の要求が失敗しました', error.digest ?? '');
	}, [error]);

	return (
		<section className="py-6 lg:py-8">
			<Container>
				<div className="max-w-[760px]">
					<h1 className="text-h1 font-bold lg:text-h1-pc">送信できませんでした</h1>
					<p className="mt-4 text-body lg:text-body-pc">通信が途切れたか、サーバーに届きませんでした。入力していた内容は残っていません。お手数ですが、もう一度お試しください。</p>
					<p className="mt-2 text-body lg:text-body-pc">
						お急ぎの場合はお電話ください:
						<a href={`tel:${mainOffice.tel.replace(/-/g, '')}`} className="tabular ml-1 text-accent-strong underline">
							{mainOffice.tel}
						</a>
						<span className="mt-1 block text-small text-ink-weak">
							{company.hours}(定休日:{company.closed})
						</span>
					</p>
					<p className="mt-4 rounded-hr border border-line bg-surface-alt p-4 text-body lg:p-6 lg:text-body-pc" role="note">
						{company.formNotice}
					</p>
					{/* 導線は完了画面と同じ形(主 = やり直す / 副 = トップへ戻る)。640 以上で2列 */}
					<div className="mt-8 grid gap-2 sm:grid-cols-2">
						<button
							type="button"
							onClick={reset}
							className="flex h-12 w-full items-center justify-center rounded-hr bg-accent text-body font-bold text-white hover:bg-accent-strong lg:h-11 lg:text-body-pc"
						>
							もう一度試す
						</button>
						<Link href="/" className="flex h-12 w-full items-center justify-center rounded-hr border border-sumi bg-surface text-body font-medium text-sumi hover:bg-surface-alt lg:h-11 lg:text-body-pc">
							トップへ戻る
						</Link>
					</div>
				</div>
			</Container>
		</section>
	);
}
