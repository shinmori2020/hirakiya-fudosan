'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useActionState, useEffect, useId, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { contactAction, type ContactState } from '@/app/actions/contact';
import { TargetProperty, type PropertyNames, type PropertyOption } from '@/components/forms/TargetProperty';
import { Turnstile } from '@/components/forms/Turnstile';
import { CONTACT_KINDS, type ContactKind } from '@/config/contact';
import { CONTACT_METHODS, DEPARTMENT, REPLY_BY } from '@/config/forms';
import { company, mainOffice } from '@/config/site';
import { confirmRows, EMPTY_INPUT, isPropertyNo, kindFromQuery, noteField, type ContactInput } from '@/lib/contact';
import { targetPropertyRows } from '@/lib/target-property';

/** 互換のための別名(page.tsx が使う)。中身は TargetProperty の PropertyOption */
export type ContactPropertyOption = PropertyOption;
export type ContactNames = PropertyNames;

/* -------------------------------------------------------------------------
 * 見た目(03 §6 フォーム部品)。/viewing と同じ値だが、UI は別実装(J-007・J-105)なので class 文字列もここに持つ
 * ---------------------------------------------------------------------- */
const INPUT = 'h-[46px] w-full rounded-hr border bg-surface px-3 text-body text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent lg:text-body-pc';
const border = (err?: string) => (err ? 'border-badge-discount-fg' : 'border-line');
const PRIMARY = 'flex h-12 w-full items-center justify-center rounded-hr bg-accent text-body font-bold text-white hover:bg-accent-strong lg:h-11 lg:text-body-pc';
const SECONDARY = 'flex h-12 w-full items-center justify-center rounded-hr border border-sumi bg-surface text-body font-medium text-sumi hover:bg-surface-alt lg:h-11 lg:text-body-pc';
const CHOICE = 'flex min-h-11 cursor-pointer items-center gap-2 rounded-hr px-1 text-body transition-[background-color] duration-150 hover:bg-badge-new-bg motion-reduce:transition-none lg:text-body-pc';
const REQUIRED = <span className="ml-1 text-xs font-bold text-badge-discount-fg lg:text-xs-pc">必須</span>;
/** 必須の欄(J-111)。見た目の「必須」だけでは読み上げに伝わらないので aria-required を足す。required は入れない(既定の検証を使わない設計) */
const REQUIRED_KEYS: readonly string[] = ['name', 'phone', 'kind'];

/** ラベル+必須+補足/エラー。エラーは補足の位置に置き換わる(縦に2つ並べない) */
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
 * 本体。入力 → 確認 → 完了 は同一 URL・同じ骨格(03 §7 フォームページ・J-103)。状態は Server Action が返す(J-102 c)
 * 3つの子(H1と注記 / 対象物件 / フォーム)を返し、置き場所は page.tsx のグリッドが決める
 * ---------------------------------------------------------------------- */
export function ContactForm({ options, turnstileSiteKey, names, nowIso }: { options: PropertyOption[]; turnstileSiteKey: string; names: PropertyNames; nowIso: string }) {
	const sp = useSearchParams();
	// URL は3画面を通して変わらないので、対象物件は**クエリだけ**から決める(左右で二重に解決しない)
	const queryNo = sp.get('property') ?? '';
	const option = isPropertyNo(queryNo) ? options.find((o) => o.no === queryNo) : undefined;
	const property = option && !option.sold ? option : null;
	const sold = !!option?.sold;
	const rows = property ? targetPropertyRows(property, { stationName: (s) => names.stationNames[s] ?? s, areaLabel: (s) => names.areaLabels[s] ?? s }, new Date(nowIso)) : [];

	const initial: ContactState = {
		step: 'input',
		values: { ...EMPTY_INPUT, kind: kindFromQuery(sp.get('kind')), property: property?.no ?? '' },
		errors: {},
	};
	const [state, action] = useActionState(contactAction, initial);

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
			{/* A:見出しと架空注記(左・1行目) */}
			<div className="lg:col-start-1 lg:row-start-1">
				<h1 ref={h1Ref} tabIndex={-1} className="text-h1 font-bold lg:text-h1-pc">{state.step === 'done' ? '送信しました' : 'お問い合わせ'}</h1>
				<p className="mt-4 rounded-hr border border-line bg-surface-alt p-4 text-body lg:p-6 lg:text-body-pc" role="note">
					{company.formNotice}
				</p>
			</div>

			{/* B:対象物件(右・追従。〜1023 は注記とフォームの間に入る) */}
			<div className="mt-8 lg:sticky lg:top-16 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:max-h-[calc(100dvh-4rem-1rem)] lg:self-start lg:overflow-y-auto">
				<TargetProperty property={property} sold={sold} rows={rows} emptyNote="特定の物件についてのお問い合わせは、物件ページの「問い合わせる」からお進みください。物件の情報が引き継がれます。" />
			</div>

			{/* C:フォーム(左・2行目)。入力欄の読み幅 760 はここに残す */}
			<div ref={colRef} className="mt-8 max-w-[760px] lg:col-start-1 lg:row-start-2 lg:mt-0">
				{state.step === 'done' ? <Done /> : state.step === 'confirm' ? <Confirm state={state} action={action} siteKey={turnstileSiteKey} /> : <Input state={state} action={action} propertyNo={property?.no ?? ''} />}
			</div>
		</>
	);
}

function Input({ state, action, propertyNo }: { state: Extract<ContactState, { step: 'input' }>; action: (fd: FormData) => void; propertyNo: string }) {
	const { values, errors } = state;
	// 備考のラベル・必須・補足は種別で変わるので、種別は state で持つ(J-105 ②)
	const [kind, setKind] = useState<ContactKind>(values.kind);
	const note = noteField(kind);
	const uid = useId();
	const id = (k: string) => `${uid}-${k}`;
	const formRef = useRef<HTMLFormElement>(null);

	// 確認に進めなかった時は最初のエラー欄へフォーカスを移す(上部にエラー一覧は出さない・03 §6 フォーム部品 4)
	useEffect(() => {
		if (Object.keys(errors).length === 0) return;
		formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
	}, [errors]);

	const inputProps = (k: keyof ContactInput, extra?: string) => ({
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
			<input type="hidden" name="property" value={propertyNo} />

			<section>
				<h2 tabIndex={-1} className="text-h3 font-bold text-sumi focus:outline-none lg:text-h3-pc">ご用件</h2>
				<fieldset className="mt-4">
					<legend className="mb-1 text-small text-ink-weak">種別{REQUIRED}</legend>
					<div className="flex flex-wrap gap-x-3 gap-y-2">
						{CONTACT_KINDS.map((k) => (
							<label key={k.slug} className={CHOICE}>
								<input type="radio" name="kind" value={k.slug} checked={kind === k.slug} onChange={() => setKind(k.slug)} className="size-4 accent-accent" />
								{k.label}
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
				{/* 備考のラベル・必須・補足は種別で変わる(質問「ご質問の内容」・来店予約「ご希望の日時」は必須・J-105 ②) */}
				<Field id={id('note')} label={note.label} required={note.required} hint={note.hint} error={errors.note}>
					<textarea rows={4} {...inputProps('note', note.hint ? 'hint' : undefined)} defaultValue={values.note} className={`${INPUT} h-auto resize-y py-3 ${border(errors.note)}`} />
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

function Confirm({ state, action, siteKey }: { state: Extract<ContactState, { step: 'confirm' }>; action: (fd: FormData) => void; siteKey: string }) {
	const { values, property, message } = state;
	const rows = confirmRows(values, property?.title);
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
			{/* 対象物件は右カラムに出ているので、ここではカードを出さない(表の行だけ・J-103) */}
			<dl className="mt-4">
				{rows.map((r, i) => (
					<div key={r.label} className={`flex gap-4 py-2 ${i < rows.length - 1 ? 'border-b border-line' : ''}`}>
						<dt className="w-[7.5em] shrink-0 text-small text-ink-weak">{r.label}</dt>
						<dd className="max-w-[32em] text-small whitespace-pre-wrap text-ink">{r.value}</dd>
					</div>
				))}
			</dl>

			<form action={action} className="mt-8">
				{(Object.keys(values) as (keyof ContactInput)[]).map((k) => (
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
				{DEPARTMENT.contact}より、{REPLY_BY}にご連絡します。営業時間 {company.hours}(定休日:{company.closed})。
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
