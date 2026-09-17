'use client';

import Link from 'next/link';
import { useActionState, useEffect, useId, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { ownerAction, type OwnerState } from '@/app/actions/owner';
import { Turnstile } from '@/components/forms/Turnstile';
import { CONTACT_METHODS, DEPARTMENT, REPLY_BY, WARDS } from '@/config/forms';
import { OWNER_MANAGES, OWNER_NOTE_LABEL, OWNER_TOPICS, SELL_LINK, UNITS_MAX } from '@/config/owner';
import { company, mainOffice } from '@/config/site';
import { EMPTY_OWNER, ownerRows, type OwnerInput } from '@/lib/owner';

/* -------------------------------------------------------------------------
 * 見た目(03 §6 フォーム部品)。①②③ と同じ値だが、UI は別実装(J-007・J-105)なので class 文字列もここに持つ
 * ---------------------------------------------------------------------- */
const INPUT = 'h-[46px] w-full rounded-hr border bg-surface px-3 text-body text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent lg:text-body-pc';
const border = (err?: string) => (err ? 'border-badge-discount-fg' : 'border-line');
const PRIMARY = 'flex h-12 w-full items-center justify-center rounded-hr bg-accent text-body font-bold text-white hover:bg-accent-strong lg:h-11 lg:text-body-pc';
const SECONDARY = 'flex h-12 w-full items-center justify-center rounded-hr border border-sumi bg-surface text-body font-medium text-sumi hover:bg-surface-alt lg:h-11 lg:text-body-pc';
const CHOICE = 'flex min-h-11 cursor-pointer items-center gap-2 rounded-hr px-1 text-body transition-[background-color] duration-150 hover:bg-badge-new-bg motion-reduce:transition-none lg:text-body-pc';
const REQUIRED = <span className="ml-1 text-xs font-bold text-badge-discount-fg lg:text-xs-pc">必須</span>;
/** 必須の欄(J-111)。見た目の「必須」だけでは読み上げに伝わらないので aria-required を足す。required は入れない(既定の検証を使わない設計) */
const REQUIRED_KEYS: readonly string[] = ['name', 'phone', 'topic', 'ward', 'address'];

function Field({ id, label, required, hint, error, children }: { id: string; label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode }) {
	return (
		<div>
			<label htmlFor={id} className="mb-1 block text-small text-ink-weak">
				{label}
				{required && REQUIRED}
			</label>
			{children}
			{error ? (
				<p id={`${id}-error`} className="mt-1 text-small text-badge-discount-fg">
					{error}
				</p>
			) : hint ? (
				<p id={`${id}-hint`} className="mt-1 text-small text-ink-weak">
					{hint}
				</p>
			) : null}
		</div>
	);
}

/** 進む操作の主ボタン(03 §6 フォーム部品 6)。送信中(pending)と Turnstile の待機中(waiting)は押せない(J-102・J-106) */
function SubmitButton({ idle, busy, waiting, intent, className }: { idle: string; busy: string; waiting?: string; intent: string; className: string }) {
	const { pending } = useFormStatus();
	const isWaiting = !!waiting && !pending;
	return (
		<button type="submit" name="intent" value={intent} disabled={pending || isWaiting} aria-busy={pending || isWaiting} className={className}>
			{pending ? busy : isWaiting ? waiting : idle}
		</button>
	);
}

/* -------------------------------------------------------------------------
 * 本体。入力 → 確認 → 完了 は同一 URL・同じ骨格(03 §7 フォームページ・J-103)。状態は Server Action が返す(J-102 c)
 * 3つの子(H1と説明 / 右カラム / フォーム)を返し、置き場所は page.tsx のグリッドが決める
 * ---------------------------------------------------------------------- */
export function OwnerForm({ turnstileSiteKey }: { turnstileSiteKey: string }) {
	const initial: OwnerState = { step: 'input', values: EMPTY_OWNER, errors: {} };
	const [state, action] = useActionState(ownerAction, initial);

	/**
	 * 段(入力 → 確認 → 完了)が変わったら見出しへフォーカスを移す(J-110)。
	 * 読み上げは画面の差し替えを自分から知らせないので、移さないと「送信しました」が伝わらない(実測:focus が body のまま)。
	 * 完了は h1、確認と入力は左カラムの先頭の見出し。入力にエラーがある時は Input 側が最初のエラー欄へ移すので、ここでは触らない。
	 */
	const h1Ref = useRef<HTMLHeadingElement>(null);
	const colRef = useRef<HTMLDivElement>(null);
	const prevStep = useRef(state.step);
	useEffect(() => {
		if (prevStep.current === state.step) return;
		prevStep.current = state.step;
		if (state.step === 'input' && Object.keys(state.errors).length > 0) return;
		if (state.step === 'done') h1Ref.current?.focus();
		else colRef.current?.querySelector<HTMLElement>('h2')?.focus();
	}, [state]);

	return (
		<>
			{/* A:見出しと説明(左・1行目)。管理サービスの内容・実績・管理料・空室対策は実装順 6 でここより下に足す */}
			<div className="lg:col-start-1 lg:row-start-1">
				<h1 ref={h1Ref} tabIndex={-1} className="text-h1 font-bold lg:text-h1-pc">{state.step === 'done' ? '送信しました' : '管理・空室のご相談'}</h1>
				<p className="mt-4 text-body lg:text-body-pc">賃貸管理の受託・空室のご相談を承ります。他社で管理中のご相談も承ります。</p>
				{/* 相談内容から「売却」を外した分の導線(J-105 ④) */}
				<p className="mt-2 text-body lg:text-body-pc">
					<Link href={SELL_LINK.href} className="text-accent-strong underline">
						{SELL_LINK.text}
					</Link>
				</p>
				<p className="mt-4 rounded-hr border border-line bg-surface-alt p-4 text-body lg:p-6 lg:text-body-pc" role="note">
					{company.formNotice}
				</p>
			</div>

			{/* B:送信したあとどうなるか(右・追従。〜1023 は説明とフォームの間に入る)。対象物件を持たないフォームの右カラム(03 §7・v0.88) */}
			<div className="mt-8 lg:sticky lg:top-16 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:self-start">
				<Aside />
			</div>

			{/* C:フォーム(左・2行目)。フッターの導線が /owner#form なので、ここがアンカーの着地点になる(③ と同じ scroll-mt) */}
			<div ref={colRef} id="form" className="mt-8 max-w-[760px] scroll-mt-24 lg:col-start-1 lg:row-start-2 lg:mt-0">
				{state.step === 'done' ? <Done /> : state.step === 'confirm' ? <Confirm state={state} action={action} siteKey={turnstileSiteKey} /> : <Input state={state} action={action} />}
			</div>
		</>
	);
}

/** 右カラム。管理サービスの内容・実績・管理料の目安(実装順 6)とは重ねず、送信の先だけを書く */
function Aside() {
	return (
		<section aria-labelledby="owner-flow" className="rounded-hr border border-line bg-surface p-4 lg:p-6">
			<h2 id="owner-flow" className="text-h3 font-bold text-sumi lg:text-h3-pc">
				ご相談の進み方
			</h2>
			<ol className="mt-3 space-y-3">
				{[
					{ t: 'ご入力', d: 'この画面のフォームをお送りください。' },
					{ t: '現況のヒアリング', d: `${DEPARTMENT.owner}より${REPLY_BY}にご連絡し、建物と入居の状況をうかがいます。` },
					{ t: 'ご提案・お見積り', d: '管理の内容と費用をお出しします。' },
				].map((s, i) => (
					<li key={s.t} className="flex gap-3">
						<span className="tabular flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-alt text-small font-bold text-sumi">{i + 1}</span>
						<span>
							<span className="block text-small font-bold text-sumi">{s.t}</span>
							<span className="block text-small text-ink">{s.d}</span>
						</span>
					</li>
				))}
			</ol>
			<p className="mt-4 border-t border-line pt-4 text-small text-ink">ご相談は無料です。他社で管理中のご相談も承ります。</p>
			<p className="mt-2 text-small text-ink-weak">
				お電話でも承ります:
				<a href={`tel:${mainOffice.tel.replace(/-/g, '')}`} className="tabular ml-1 text-accent-strong underline">
					{mainOffice.tel}
				</a>
				<span className="mt-1 block">
					{company.hours}(定休日:{company.closed})
				</span>
			</p>
		</section>
	);
}

function Input({ state, action }: { state: Extract<OwnerState, { step: 'input' }>; action: (fd: FormData) => void }) {
	const { values, errors } = state;
	const uid = useId();
	const id = (k: string) => `${uid}-${k}`;
	const formRef = useRef<HTMLFormElement>(null);

	// 確認に進めなかった時は最初のエラー欄へフォーカスを移す(上部にエラー一覧は出さない・03 §6 フォーム部品 4)
	useEffect(() => {
		if (Object.keys(errors).length === 0) return;
		// ラジオは aria-invalid を持てないので、グループの先頭に data-invalid を立てて拾う(J-107)
		// fieldset にも aria-invalid が付くので(J-112)、フォーカスできる欄だけを拾う
		formRef.current?.querySelector<HTMLElement>('input[aria-invalid="true"], select[aria-invalid="true"], textarea[aria-invalid="true"], [data-invalid="true"]')?.focus();
	}, [errors]);

	const inputProps = (k: keyof OwnerInput, extra?: string) => ({
		id: id(k),
		name: k,
		'aria-required': REQUIRED_KEYS.includes(k) ? true : undefined,
		'aria-invalid': !!errors[k],
		'aria-describedby': errors[k] ? `${id(k)}-error` : extra ? `${id(k)}-hint` : undefined,
		className: `${INPUT} ${border(errors[k])}`,
	});

	return (
		<form ref={formRef} action={action} noValidate>
			<noscript>
				<p className="mb-4 rounded-hr border border-line bg-surface-alt p-4 text-body">送信には JavaScript が必要です。</p>
			</noscript>

			<section className="space-y-4">
				<h2 tabIndex={-1} className="text-h3 font-bold text-sumi focus:outline-none lg:text-h3-pc">ご相談の内容</h2>
				<fieldset role="radiogroup" aria-required aria-invalid={!!errors.topic} aria-describedby={errors.topic ? `${id('topic')}-error` : undefined}>
					<legend className="mb-1 text-small text-ink-weak">
						ご相談の種類{REQUIRED}
						{errors.topic && (
							<span id={`${id('topic')}-error`} className="ml-2 text-badge-discount-fg">
								{errors.topic}
							</span>
						)}
					</legend>
					<div className="flex flex-wrap gap-x-3 gap-y-2">
						{OWNER_TOPICS.map((t) => (
							<label key={t.slug} className={CHOICE}>
								<input
									type="radio"
									name="topic"
									value={t.slug}
									defaultChecked={values.topic === t.slug}
									data-invalid={errors.topic && t.slug === OWNER_TOPICS[0].slug ? true : undefined}
									className="size-4 accent-accent"
								/>
								{t.label}
							</label>
						))}
					</div>
				</fieldset>

				<Field id={id('ward')} label="物件所在地(区)" required error={errors.ward}>
					<select {...inputProps('ward')} defaultValue={values.ward}>
						<option value="">選択してください</option>
						{WARDS.map((w) => (
							<option key={w.slug} value={w.slug}>
								{w.label}
							</option>
						))}
					</select>
				</Field>
				<Field id={id('address')} label="物件所在地(町名以下)" required error={errors.address} hint="例:青戸0-0-0。対応エリア外もご相談ください">
					<input type="text" {...inputProps('address', 'hint')} defaultValue={values.address} />
				</Field>
				<Field id={id('units')} label="戸数" error={errors.units} hint={`数字のみ(1〜${UNITS_MAX})。1棟でなくても構いません`}>
					<input type="text" inputMode="numeric" {...inputProps('units', 'hint')} defaultValue={values.units} />
				</Field>

				<fieldset>
					<legend className="mb-1 text-small text-ink-weak">現在の管理状況</legend>
					<div className="flex flex-wrap gap-x-3 gap-y-2">
						{OWNER_MANAGES.map((m) => (
							<label key={m.slug} className={CHOICE}>
								<input type="radio" name="manage" value={m.slug} defaultChecked={values.manage === m.slug} className="size-4 accent-accent" />
								{m.label}
							</label>
						))}
					</div>
				</fieldset>
			</section>

			<section className="mt-8 space-y-4">
				<h2 className="text-h3 font-bold text-sumi lg:text-h3-pc">連絡先</h2>
				<Field id={id('name')} label="お名前" required error={errors.name}>
					<input type="text" autoComplete="name" {...inputProps('name')} defaultValue={values.name} />
				</Field>
				<Field id={id('kana')} label="ふりがな" error={errors.kana}>
					<input type="text" {...inputProps('kana')} defaultValue={values.kana} />
				</Field>
				<Field id={id('phone')} label="電話番号" required error={errors.phone} hint="例:03-0000-0000(ハイフンなしでも可)">
					<input type="tel" inputMode="tel" autoComplete="tel" {...inputProps('phone', 'hint')} defaultValue={values.phone} />
				</Field>
				<Field id={id('email')} label="メールアドレス" error={errors.email} hint="ご入力いただくと、受け付けの自動返信をお送りします">
					<input type="email" inputMode="email" autoComplete="email" {...inputProps('email', 'hint')} defaultValue={values.email} />
				</Field>
				<fieldset>
					<legend className="mb-1 text-small text-ink-weak">希望連絡方法</legend>
					<div className="flex flex-wrap gap-x-3 gap-y-2">
						{CONTACT_METHODS.map((m) => (
							<label key={m.slug} className={CHOICE}>
								<input type="radio" name="method" value={m.slug} defaultChecked={values.method === m.slug} className="size-4 accent-accent" />
								{m.label}
							</label>
						))}
					</div>
				</fieldset>
				<Field id={id('note')} label={OWNER_NOTE_LABEL} error={errors.note}>
					<textarea rows={4} {...inputProps('note')} defaultValue={values.note} className={`${INPUT} h-auto resize-y py-3 ${border(errors.note)}`} />
				</Field>
			</section>

			<section className="mt-8">
				<label className={`${CHOICE} ${errors.agree ? 'text-badge-discount-fg' : ''}`}>
					<input type="checkbox" name="agree" defaultChecked={values.agree} aria-required aria-invalid={!!errors.agree} aria-describedby={errors.agree ? `${id('agree')}-error` : undefined} className="size-4 accent-accent" />
					<span className="text-ink">
						<Link href="/privacy" className="text-accent-strong underline">
							プライバシーポリシー
						</Link>
						に同意する{REQUIRED}
					</span>
				</label>
				{errors.agree && (
					<p id={`${id('agree')}-error`} className="mt-1 text-small text-badge-discount-fg">
						{errors.agree}
					</p>
				)}
			</section>

			<div className="mt-8">
				<SubmitButton idle="確認する" busy="確認しています…" intent="confirm" className={PRIMARY} />
			</div>
		</form>
	);
}

function Confirm({ state, action, siteKey }: { state: Extract<OwnerState, { step: 'confirm' }>; action: (fd: FormData) => void; siteKey: string }) {
	const { values, message } = state;
	const rows = ownerRows(values);
	// Turnstile のトークンが入るまで「送信する」を押せなくする(J-106)。site key が無い開発時は待たない
	const [token, setToken] = useState('');
	const waiting = siteKey && !token ? '確認を準備しています…' : undefined;
	return (
		<>
			<h2 tabIndex={-1} className="text-h2 font-bold lg:text-h2-pc focus:outline-none">入力内容の確認</h2>
			{message && (
				<p className="mt-2 text-small text-badge-discount-fg" role="alert">
					{message}
				</p>
			)}
			<dl className="mt-4">
				{rows.map((r, i) => (
					<div key={r.label} className={`flex gap-4 py-2 ${i < rows.length - 1 ? 'border-b border-line' : ''}`}>
						<dt className="w-[7.5em] shrink-0 text-small text-ink-weak">{r.label}</dt>
						<dd className="max-w-[32em] text-small whitespace-pre-wrap text-ink">{r.value}</dd>
					</div>
				))}
			</dl>

			<form action={action} className="mt-8">
				{(Object.keys(values) as (keyof OwnerInput)[]).map((k) => (
					<input key={k} type="hidden" name={k} value={k === 'agree' ? (values.agree ? 'on' : '') : String(values[k])} />
				))}
				<noscript>
					<p className="mb-4 rounded-hr border border-line bg-surface-alt p-4 text-body">送信には JavaScript が必要です。</p>
				</noscript>
				<Turnstile siteKey={siteKey} onToken={setToken} />
				{/* 640 以上は2列(左=修正する・右=送信する)、〜639 は縦積みで送信するが上 */}
				<div className="mt-4 grid gap-2 sm:grid-cols-2">
					<div className="sm:order-2">
						<SubmitButton idle="送信する" busy="送信しています…" waiting={waiting} intent="send" className={PRIMARY} />
					</div>
					<div className="sm:order-1">
						<button type="submit" name="intent" value="back" formNoValidate className={SECONDARY}>
							修正する
						</button>
					</div>
				</div>
			</form>
		</>
	);
}

function Done() {
	return (
		<>
			<p className="text-body lg:text-body-pc">
				{DEPARTMENT.owner}より、{REPLY_BY}にご連絡します。営業時間 {company.hours}(定休日:{company.closed})。
			</p>
			<p className="mt-2 text-body lg:text-body-pc">
				お急ぎの場合はお電話ください:
				<a href={`tel:${mainOffice.tel.replace(/-/g, '')}`} className="tabular ml-1 text-accent-strong underline">
					{mainOffice.tel}
				</a>
			</p>
			{/* 導線は2つとも同じボタンの形(主 = 物件を探す / 副 = トップへ戻る)。①②③ と同じ(J-105 残件) */}
			<div className="mt-8 grid gap-2 sm:grid-cols-2">
				<Link href="/properties" className={PRIMARY}>
					物件を探す
				</Link>
				<Link href="/" className={SECONDARY}>
					トップへ戻る
				</Link>
			</div>
		</>
	);
}
