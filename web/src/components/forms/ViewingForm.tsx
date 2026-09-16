'use client';

import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useActionState, useEffect, useId, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { viewingAction, type ViewingState } from '@/app/actions/viewing';
import { TargetProperty, type PropertyNames, type PropertyOption } from '@/components/forms/TargetProperty';
import { Turnstile } from '@/components/forms/Turnstile';
import { CONTACT_METHODS, DEPARTMENT, REPLY_BY } from '@/config/forms';
import { company, mainOffice } from '@/config/site';
import { TIME_SLOTS } from '@/config/viewing';
import { targetPropertyRows } from '@/lib/target-property';
import { EMPTY_VIEWING, isPropertyNo, VIEWING_FALLBACK, viewingRows, type ViewingInput } from '@/lib/viewing';

/* -------------------------------------------------------------------------
 * 見た目(03 §6 フォーム部品)。/contact と同じ値だが、UI は別実装(J-007・J-105)なので class 文字列もここに持つ
 * ---------------------------------------------------------------------- */
const INPUT = 'h-[46px] w-full rounded-hr border bg-surface px-3 text-body text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent lg:text-body-pc';
const border = (err?: string) => (err ? 'border-badge-discount-fg' : 'border-line');
const PRIMARY = 'flex h-12 w-full items-center justify-center rounded-hr bg-accent text-body font-bold text-white hover:bg-accent-strong lg:h-11 lg:text-body-pc';
const SECONDARY = 'flex h-12 w-full items-center justify-center rounded-hr border border-sumi bg-surface text-body font-medium text-sumi hover:bg-surface-alt lg:h-11 lg:text-body-pc';
const CHOICE = 'flex min-h-11 cursor-pointer items-center gap-2 rounded-hr px-1 text-body transition-[background-color] duration-150 hover:bg-badge-new-bg motion-reduce:transition-none lg:text-body-pc';
const REQUIRED = <span className="ml-1 text-xs font-bold text-badge-discount-fg lg:text-xs-pc">必須</span>;

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

function SlotSelect({ id, name, value, error }: { id: string; name: string; value: string; error?: string }) {
	return (
		<div className="relative">
			<select id={id} name={name} defaultValue={value} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} className={`${INPUT} appearance-none pr-10 ${border(error)}`}>
				<option value="">時間帯</option>
				{TIME_SLOTS.map((o) => (
					<option key={o.slug} value={o.slug}>
						{o.label}
					</option>
				))}
			</select>
			<ChevronDown size={20} aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-weak" />
		</div>
	);
}

/**
 * 進む操作の主ボタン(03 §6 フォーム部品 6)。状態は文言で示し、色・不透明度は変えない。
 *  送信中(useFormStatus.pending)… 二重送信を止める(J-102)
 *  待機中(waiting)… Turnstile のトークンがまだ無い間。押せると「確認に失敗しました」になるため(J-106)
 */
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
 * 本体。入力 → 確認 → 完了 は同一 URL・同じ骨格(03 §7 フォームページ)。状態は Server Action が返す
 * ---------------------------------------------------------------------- */
export function ViewingForm({ options, names, nowIso, turnstileSiteKey }: { options: PropertyOption[]; names: PropertyNames; nowIso: string; turnstileSiteKey: string }) {
	const sp = useSearchParams();
	const router = useRouter();
	const queryNo = sp.get('property') ?? '';
	const option = isPropertyNo(queryNo) ? options.find((o) => o.no === queryNo) : undefined;
	const property = option && !option.sold ? option : null;

	const initial: ViewingState = { step: 'input', values: { ...EMPTY_VIEWING, property: property?.no ?? '' }, errors: {} };
	const [state, action] = useActionState(viewingAction, initial);

	// 対象物件が無い・不正・成約済み → 問い合わせへ(◆1:注記は出さない)。Action がそう判定した時も同じ
	const redirect = !property || (state.step === 'input' && state.redirect);
	useEffect(() => {
		if (redirect) router.replace(VIEWING_FALLBACK);
	}, [redirect, router]);
	if (redirect || !property) {
		return (
			<div className="lg:col-span-2">
				<p className="text-ink-weak">お問い合わせページに移動しています…</p>
			</div>
		);
	}

	const rows = targetPropertyRows(property, { stationName: (s) => names.stationNames[s] ?? s, areaLabel: (s) => names.areaLabels[s] ?? s }, new Date(nowIso));
	const word = property.type === 'sale' ? '見学' : '内見';

	return (
		<>
			<div className="lg:col-start-1 lg:row-start-1">
				<h1 className="text-h1 font-bold lg:text-h1-pc">{state.step === 'done' ? '送信しました' : `${word}予約`}</h1>
				<p className="mt-4 rounded-hr border border-line bg-surface-alt p-4 text-body lg:p-6 lg:text-body-pc" role="note">
					{company.formNotice}
				</p>
			</div>
			<div className="mt-8 lg:sticky lg:top-16 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:max-h-[calc(100dvh-4rem-1rem)] lg:self-start lg:overflow-y-auto">
				<TargetProperty property={property} sold={false} rows={rows} />
			</div>
			<div className="mt-8 max-w-[760px] lg:col-start-1 lg:row-start-2 lg:mt-0">
				{state.step === 'done' ? <Done word={word} /> : state.step === 'confirm' ? <Confirm state={state} action={action} siteKey={turnstileSiteKey} /> : <Input state={state} action={action} propertyNo={property.no} word={word} />}
			</div>
		</>
	);
}

function Input({ state, action, propertyNo, word }: { state: Extract<ViewingState, { step: 'input' }>; action: (fd: FormData) => void; propertyNo: string; word: string }) {
	const { values, errors } = state;
	const uid = useId();
	const id = (k: string) => `${uid}-${k}`;
	const formRef = useRef<HTMLFormElement>(null);

	// 確認に進めなかった時は最初のエラー欄へフォーカス(上部に一覧は出さない・03 §6 フォーム部品 4)
	useEffect(() => {
		if (Object.keys(errors).length === 0) return;
		formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
	}, [errors]);

	const inputProps = (k: keyof ViewingInput, extra?: string) => ({
		id: id(k),
		name: k,
		'aria-invalid': !!errors[k],
		'aria-describedby': errors[k] ? `${id(k)}-error` : extra ? `${id(k)}-hint` : undefined,
		className: `${INPUT} ${border(errors[k])}`,
	});

	return (
		<form ref={formRef} action={action} noValidate>
			<noscript>
				<p className="mb-4 rounded-hr border border-line bg-surface-alt p-4 text-body">送信には JavaScript が必要です。</p>
			</noscript>
			<input type="hidden" name="property" value={propertyNo} />

			<section className="space-y-4">
				<h2 className="text-h3 font-bold text-sumi lg:text-h3-pc">{word}のご希望</h2>
				{([1, 2] as const).map((n) => {
					const dk = `date${n}` as 'date1' | 'date2';
					const sk = `slot${n}` as 'slot1' | 'slot2';
					const err = errors[dk] ?? errors[sk];
					return (
						<Field key={n} id={id(dk)} label={`第${n}希望`} required={n === 1} error={err} hint={n === 1 ? `日付と時間帯をお選びください(定休日:${company.closed})` : undefined}>
							<div className="flex gap-2">
								<input type="date" {...inputProps(dk, 'hint')} defaultValue={values[dk]} className={`${INPUT} ${border(errors[dk])} min-w-0 flex-1`} />
								<div className="w-44 shrink-0">
									<SlotSelect id={id(sk)} name={sk} value={values[sk]} error={errors[sk]} />
								</div>
							</div>
						</Field>
					);
				})}
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
				<Field id={id('note')} label="備考" error={errors.note}>
					<textarea rows={4} {...inputProps('note')} defaultValue={values.note} className={`${INPUT} h-auto resize-y py-3 ${border(errors.note)}`} />
				</Field>
			</section>

			<section className="mt-8">
				<label className={`${CHOICE} ${errors.agree ? 'text-badge-discount-fg' : ''}`}>
					<input type="checkbox" name="agree" defaultChecked={values.agree} aria-invalid={!!errors.agree} aria-describedby={errors.agree ? `${id('agree')}-error` : undefined} className="size-4 accent-accent" />
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

function Confirm({ state, action, siteKey }: { state: Extract<ViewingState, { step: 'confirm' }>; action: (fd: FormData) => void; siteKey: string }) {
	const { values, property, closedHits, message } = state;
	const rows = viewingRows(values, property.title);
	// Turnstile のトークンが入るまで「送信する」を押せなくする(J-106)。site key が無い開発時は待たない
	const [token, setToken] = useState('');
	const waiting = siteKey && !token ? '確認を準備しています…' : undefined;
	return (
		<>
			<h2 className="text-h2 font-bold lg:text-h2-pc">入力内容の確認</h2>
			{message && (
				<p className="mt-2 text-small text-badge-discount-fg" role="alert">
					{message}
				</p>
			)}
			{/* 定休日(水曜)の希望は選べなくせず、ここで注記する(J-105) */}
			{closedHits.length > 0 && (
				<p className="mt-2 text-small text-ink-weak" role="note">
					{closedHits.join('・')}は定休日({company.closed})に当たります。ご案内できる日時を折り返しでご相談させてください。
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
				{(Object.keys(values) as (keyof ViewingInput)[]).map((k) => (
					<input key={k} type="hidden" name={k} value={k === 'agree' ? (values.agree ? 'on' : '') : String(values[k])} />
				))}
				<noscript>
					<p className="mb-4 rounded-hr border border-line bg-surface-alt p-4 text-body">送信には JavaScript が必要です。</p>
				</noscript>
				<Turnstile siteKey={siteKey} onToken={setToken} />
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

function Done({ word }: { word: string }) {
	return (
		<>
			<p className="text-body lg:text-body-pc">
				{DEPARTMENT.viewing}より、{REPLY_BY}に{word}の日時をご相談のうえご連絡します。営業時間 {company.hours}(定休日:{company.closed})。
			</p>
			<p className="mt-2 text-body lg:text-body-pc">
				お急ぎの場合はお電話ください:
				<a href={`tel:${mainOffice.tel.replace(/-/g, '')}`} className="tabular ml-1 text-accent-strong underline">
					{mainOffice.tel}
				</a>
			</p>
			{/* 導線は2つとも同じボタンの形にする(主 = 物件を探す / 副 = トップへ戻る)。並びは詳細ページの CTA と同じ 640 以上で2列(J-105 残件) */}
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
