'use client';

import { ChevronDown } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useActionState, useEffect, useId, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { contactAction, type ContactProperty, type ContactState } from '@/app/actions/contact';
import { Turnstile } from '@/components/forms/Turnstile';
import { CONTACT_DEPARTMENT, CONTACT_KINDS, CONTACT_METHODS, CONTACT_REPLY_BY, TIME_SLOTS, type ContactKind } from '@/config/contact';
import { company, mainOffice } from '@/config/site';
import { confirmRows, EMPTY_INPUT, isPropertyNo, kindFromQuery, type ContactInput } from '@/lib/contact';

/** page.tsx が index.json から渡す最小の項目(表示用。Action は ID から読み直す) */
export interface ContactPropertyOption extends ContactProperty {
	sold: boolean;
}

/* -------------------------------------------------------------------------
 * 見た目(03 §6 フォーム部品・J-102)。3本のフォームは別実装なので、共通化はこの class 文字列の範囲まで
 * ---------------------------------------------------------------------- */
const INPUT = 'h-[46px] w-full rounded-hr border bg-surface px-3 text-body text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent lg:text-body-pc';
const border = (err?: string) => (err ? 'border-badge-discount-fg' : 'border-line');
const PRIMARY = 'flex h-12 w-full items-center justify-center rounded-hr bg-accent text-body font-bold text-white hover:bg-accent-strong lg:h-11 lg:text-body-pc';
const SECONDARY = 'flex h-12 w-full items-center justify-center rounded-hr border border-sumi bg-surface text-body font-medium text-sumi hover:bg-surface-alt lg:h-11 lg:text-body-pc';
const CHOICE = 'flex min-h-11 cursor-pointer items-center gap-2 rounded-hr px-1 text-body transition-[background-color] duration-150 hover:bg-badge-new-bg motion-reduce:transition-none lg:text-body-pc';

function Notice() {
	return (
		<p className="mt-4 rounded-hr border border-line bg-surface-alt p-4 text-body lg:p-6 lg:text-body-pc" role="note">
			{company.formNotice}
		</p>
	);
}

/** ラベル+必須+補足/エラー。エラーは補足の位置に置き換わる(縦に2つ並べない) */
function Field({ id, label, required, hint, error, children }: { id: string; label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode }) {
	return (
		<div>
			<label htmlFor={id} className="mb-1 block text-small text-ink-weak">
				{label}
				{required && <span className="ml-1 text-xs font-bold text-badge-discount-fg lg:text-xs-pc">必須</span>}
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

function Select({ id, name, value, error, onChange, blank, options }: { id: string; name: string; value: string; error?: string; onChange?: (v: string) => void; blank: string; options: readonly { slug: string; label: string }[] }) {
	return (
		<div className="relative">
			<select id={id} name={name} defaultValue={value} onChange={(e) => onChange?.(e.target.value)} aria-invalid={!!error} className={`${INPUT} appearance-none pr-10 ${border(error)}`}>
				<option value="">{blank}</option>
				{options.map((o) => (
					<option key={o.slug} value={o.slug}>
						{o.label}
					</option>
				))}
			</select>
			<ChevronDown size={20} aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-weak" />
		</div>
	);
}

/** 対象物件のカード(一覧カードと同じ要素:写真1枚・物件名・家賃(価格)。リンクにはしない) */
function PropertyCard({ p }: { p: ContactProperty }) {
	return (
		<div className="flex gap-4 rounded-hr border border-line bg-surface p-3">
			<div className="relative aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-hr bg-surface-alt">
				{p.thumb && <Image src={p.thumb} alt="" fill unoptimized className="object-cover" />}
			</div>
			<div className="min-w-0">
				<p className="text-price-card font-bold text-sumi lg:text-price-card-pc">{p.priceLabel}</p>
				<p className="mt-1 text-small text-ink">{p.title}</p>
				<p className="tabular text-xs text-ink-weak lg:text-xs-pc">{p.no}</p>
			</div>
		</div>
	);
}

function SubmitButton({ idle, busy, intent, className }: { idle: string; busy: string; intent: string; className: string }) {
	const { pending } = useFormStatus();
	return (
		<button type="submit" name="intent" value={intent} disabled={pending} aria-busy={pending} className={className}>
			{pending ? busy : idle}
		</button>
	);
}

/* -------------------------------------------------------------------------
 * 本体。入力 → 確認 → 完了 は同一 URL・同じ部品。状態は Server Action が返す(J-102 c)
 * ---------------------------------------------------------------------- */
export function ContactForm({ options, turnstileSiteKey }: { options: ContactPropertyOption[]; turnstileSiteKey: string }) {
	const sp = useSearchParams();
	const queryNo = sp.get('property') ?? '';
	const initialOption = isPropertyNo(queryNo) ? options.find((o) => o.no === queryNo) : undefined;
	const initial: ContactState = {
		step: 'input',
		values: { ...EMPTY_INPUT, kind: kindFromQuery(sp.get('kind')), property: initialOption && !initialOption.sold ? initialOption.no : '' },
		errors: {},
		message: initialOption?.sold ? 'ご指定の物件は成約しています。物件を指定しないお問い合わせとして受け付けます。' : undefined,
	};
	const [state, action] = useActionState(contactAction, initial);

	if (state.step === 'done') return <Done />;
	if (state.step === 'confirm') return <Confirm state={state} action={action} siteKey={turnstileSiteKey} />;
	const option = state.values.property ? options.find((o) => o.no === state.values.property) : undefined;
	return <Input state={state} action={action} property={option && !option.sold ? option : null} />;
}

function Input({ state, action, property }: { state: Extract<ContactState, { step: 'input' }>; action: (fd: FormData) => void; property: ContactProperty | null }) {
	const { values, errors, message } = state;
	const [kind, setKind] = useState<ContactKind>(values.kind);
	const uid = useId();
	const id = (k: string) => `${uid}-${k}`;
	const formRef = useRef<HTMLFormElement>(null);

	// 確認に進めなかった時は最初のエラー欄へフォーカスを移す(上部にエラー一覧は出さない・03 §6 フォーム部品 4)
	useEffect(() => {
		if (Object.keys(errors).length === 0) return;
		const first = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
		first?.focus();
	}, [errors]);

	const inputProps = (k: keyof ContactInput, extra?: string) => ({
		id: id(k),
		name: k,
		'aria-invalid': !!errors[k],
		'aria-describedby': errors[k] ? `${id(k)}-error` : extra ? `${id(k)}-hint` : undefined,
		className: `${INPUT} ${border(errors[k])}`,
	});

	return (
		<>
			<h1 className="text-h1 font-bold lg:text-h1-pc">内見予約・お問い合わせ</h1>
			<Notice />
			<form ref={formRef} action={action} noValidate className="mt-8">
				<noscript>
					<p className="mb-4 rounded-hr border border-line bg-surface-alt p-4 text-body">送信には JavaScript が必要です。</p>
				</noscript>
				<input type="hidden" name="property" value={property?.no ?? ''} />

				{(property || message) && (
					<section className="mb-8">
						<h2 className="text-h3 font-bold text-sumi lg:text-h3-pc">対象物件</h2>
						{message && <p className="mt-2 text-small text-ink-weak">{message}</p>}
						{property && (
							<div className="mt-2">
								<PropertyCard p={property} />
							</div>
						)}
					</section>
				)}

				<section>
					<h2 className="text-h3 font-bold text-sumi lg:text-h3-pc">ご希望</h2>
					<fieldset className="mt-4">
						<legend className="mb-1 text-small text-ink-weak">
							種別<span className="ml-1 text-xs font-bold text-badge-discount-fg lg:text-xs-pc">必須</span>
						</legend>
						<div className="flex flex-wrap gap-x-3 gap-y-2">
							{CONTACT_KINDS.map((k) => (
								<label key={k.slug} className={CHOICE}>
									<input type="radio" name="kind" value={k.slug} checked={kind === k.slug} onChange={() => setKind(k.slug)} className="size-4 accent-accent" />
									{k.label}
								</label>
							))}
						</div>
					</fieldset>

					{kind === 'viewing' && (
						<div className="mt-4 space-y-4">
							{([1, 2] as const).map((n) => {
								const dk = `date${n}` as 'date1' | 'date2';
								const sk = `slot${n}` as 'slot1' | 'slot2';
								return (
									<Field key={n} id={id(dk)} label={`第${n}希望`} required={n === 1} error={errors[dk]} hint={n === 1 ? '日付と時間帯をお選びください' : undefined}>
										<div className="flex gap-2">
											<input type="date" {...inputProps(dk, 'hint')} defaultValue={values[dk]} className={`${INPUT} ${border(errors[dk])} min-w-0 flex-1`} />
											<div className="w-40 shrink-0">
												<Select id={id(sk)} name={sk} value={values[sk]} blank="時間帯" options={TIME_SLOTS} />
											</div>
										</div>
									</Field>
								);
							})}
						</div>
					)}
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
							に同意する<span className="ml-1 text-xs font-bold text-badge-discount-fg lg:text-xs-pc">必須</span>
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
		</>
	);
}

function Confirm({ state, action, siteKey }: { state: Extract<ContactState, { step: 'confirm' }>; action: (fd: FormData) => void; siteKey: string }) {
	const { values, property, message } = state;
	const rows = confirmRows(values, property?.title);
	return (
		<>
			<h1 className="text-h1 font-bold lg:text-h1-pc">内見予約・お問い合わせ</h1>
			<Notice />
			<h2 className="mt-8 text-h2 font-bold lg:text-h2-pc">入力内容の確認</h2>
			{message && (
				<p className="mt-2 text-small text-badge-discount-fg" role="alert">
					{message}
				</p>
			)}
			{property && (
				<div className="mt-4">
					<PropertyCard p={property} />
				</div>
			)}
			{/* 情報表と同じ組み方(J-090):ラベル 7.5em・値は 32em 上限・行の下に線・最終行には引かない */}
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
				<Turnstile siteKey={siteKey} />
				{/* 640 以上は2列(左=修正する・右=送信する)、〜639 は縦積みで送信するが上 */}
				<div className="mt-4 grid gap-2 sm:grid-cols-2">
					<div className="sm:order-2">
						<SubmitButton idle="送信する" busy="送信しています…" intent="send" className={PRIMARY} />
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
			<h1 className="text-h1 font-bold lg:text-h1-pc">送信しました</h1>
			<Notice />
			<p className="mt-6 text-body lg:text-body-pc">
				{CONTACT_DEPARTMENT}より、{CONTACT_REPLY_BY}にご連絡します。営業時間 {company.hours}(定休日:{company.closed})。
			</p>
			<p className="mt-2 text-body lg:text-body-pc">
				お急ぎの場合はお電話ください:
				<a href={`tel:${mainOffice.tel.replace(/-/g, '')}`} className="tabular ml-1 text-accent-strong underline">
					{mainOffice.tel}
				</a>
			</p>
			<div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
				<Link href="/properties" className={`${SECONDARY} sm:w-auto sm:px-6`}>
					物件を探す
				</Link>
				<Link href="/" className="text-body text-accent-strong underline lg:text-body-pc">
					トップへ戻る
				</Link>
			</div>
		</>
	);
}
