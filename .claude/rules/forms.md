---
paths:
  - "web/src/components/forms/**"
  - "web/src/app/actions/**"
  - "web/src/emails/**"
---

# フォームのルール(内見予約 / 査定依頼 / 管理・空室相談)

章3「問い合わせフォームが動く」の記録を取る場所。**3本は別実装(共通化しない・J-007)。** 同じ工程を3回通し、1本目→2本目→3本目で初案・指示・手戻りがどう変わるかを比較する。

## 1. 4本の構成(`docs/01-設計図.md` ページ4・11・12・末尾「フォームの整理」。J-007 の3本 → J-105 で4本)

| フォーム | ルート | Server Action | 固有項目 | 宛先(担当) |
|---|---|---|---|---|
| 内見予約 | `(inquiry)/viewing` | `actions/viewing.ts` | 対象物件(`?property=` で自動表示・**必須**。無い・不正・成約済みは `/contact` へリダイレクト・注記なし)/ 第1希望 日付+時間帯(**必須**)/ 第2希望 日付+時間帯。時間帯は **午前(9:30〜12:00)/ 午後(13:00〜15:00)/ 夕方(15:00〜18:30)** の3区分。**水曜(定休)を選んだ時は確認画面で注記**(選べなくはしない) | 見本 花子(賃貸部長) |
| 問い合わせ | `(inquiry)/contact` | `actions/contact.ts` | 種別(空室確認・質問・来店予約・法人・採用・**必須**。`?kind=` で初期選択:vacancy / question / visit / corporate / recruit。config に置く。**内見希望は含めない**)/ 対象物件(あれば自動表示・任意。無ければ「物件を指定せずに送ります」)/ **備考のラベルは種別で変える**(質問 →「ご質問の内容」、来店予約 →「ご希望の日時」など)。**質問・来店予約では備考を必須** | 見本 花子(賃貸部長) |
| 査定依頼 | `(inquiry)/sell`(説明とフォームを同じページに。フッターは `/sell#form`) | `actions/sell.ts` | 物件種別(mansion / house / land・**必須**)/ 所在地(**区の選択**(katsushika / edogawa / adachi / sumida / **other**)+ 町名以下は自由入力・**両方必須**。対応エリア外も受ける)/ 面積(欄は1つ。**ラベルを種別で変える**:専有面積 / 建物面積 / 土地面積)/ 築年(**土地は欄ごと出さない**)/ 間取り(LAYOUTS + その他。**土地は欄ごと出さない**)/ 現況(live / vacant / rented・**必須**)/ 売却希望時期(3m / 6m / 1y / undecided・任意。日付ではない)/ **査定の種類(desk / visit / later・必須)**。備考のラベルは「ご要望・ご質問」(任意)。**実装済み(J-107・09/17。フォーム部分のみ。説明は実装順 6)** | 仮名 一郎(売買主任) |
| 管理・空室相談 | `(inquiry)/owner`(同上。フッターは `/owner#form`) | `actions/owner.ts` | 相談内容(管理委託 / 空室・必須。**「売却」は外す**)/ 物件所在地(必須)/ 戸数 / 現在の管理状況(自主管理 / 他社管理)。**上部に「売却をご検討の方は査定依頼へ」のリンク** | 架空 次郎(管理部主任) |

作る順序は ① /viewing → ② /contact → ③ /sell → ④ /owner(J-105)。**ロジック(電話・メール・同意の検証、確認行の整形)と I/O(Turnstile の検証・Resend の送信)は `web/src/lib/` で共通化してよい。UI と Server Action の流れは別実装**(J-007 の出所は工程の比較なので、ロジック・I/O の共通化は記録に影響しない・J-105)。共通項目の検証は部分スキーマとして持ち、各フォームが固有項目を足す。確認行の並びは 03 §6 フォーム部品 7 のまま。スマホ固定CTA の右端は、物件詳細では「内見予約」→ `/viewing?property=ID`、それ以外は「問い合わせ」→ `/contact`(J-105)。

共通項目:氏名 / ふりがな / 電話 / メール / 希望連絡方法(電話・メール・LINE)/ 備考 / プライバシーポリシー同意。
共通の必須は **氏名・電話・同意**。フォーム固有の必須は上の表のとおり(内見:対象物件・第1希望 / 問い合わせ:種別・質問と来店予約の備考 / 査定:物件種別・所在地(区+住所)・現況・**査定の種類** / 管理:相談内容・所在地)。**査定の種類を必須にしたのは項目表との差分**(項目表では任意。「相談してから決める」があるので詰まらない、という理由で必須にした・SHIN 09/17・J-107)。メールは任意(入力があれば自動返信)。**項目の正は SHIN の項目表(J-105・09/16)**。01 との差分4点(時間帯3区分と水曜の注記 / 備考のラベルと必須 / 査定の種類・間取り・土地の非表示・所在地の自由入力 / 相談内容から売却を外し査定へのリンク)は SHIN が決めた内容。項目を増やす時は SHIN の判断(J-ID)。

## 2. 架空サイトである旨(J-012・例外なし)

- **フォーム上部**:「このサイトは制作記録用の架空サイトです。送信内容は実際の対応には使われません」
- **完了画面**:同文 + 折り返しの目安 + 電話番号(`03-0000-0000`)+ 他の物件を見る導線。送信内容は表示しない / 担当者名は出さず部署名まで / 折り返しは一律「翌営業日まで」(J-102)
- **自動返信メール**:同文を本文冒頭に入れる
- 送信データは **SHIN 宛(`CONTACT_EMAIL_TO`)にのみ届け、保存しない**(DB・ログ・ファイルに残さない)
- プライバシーポリシーの記述と整合させる(取得する情報 / 保存しない旨 / 架空である旨)

## 3. 実装(Nordic Works の Resend Server Action を流用)

- Server Action + Zod。バリデーションは境界(Action)で行い、クライアントは表示のみ
- Resend + React Email(`web/src/emails/` に3本分のテンプレート)。`RESEND_API_KEY` / `CONTACT_EMAIL_FROM` / `CONTACT_EMAIL_TO`
- 入力 → **確認画面** → 完了。確認画面を挟む(不動産の慣習)。確認画面は Server Action が返す(検証 → 確認 / 送信 の2段・同一 URL・J-102)
- 二重送信防止(送信中はボタン無効)/ 送信中の表示 / エラー時の表示(何が起きたか・どう直すか。謝らない)
- **Turnstile のトークンが入るまで送信ボタンを無効にする**(J-106)。トークンは確認画面が出てから1〜2秒遅れて入るので、その前に押せると「確認に失敗しました」が出る(F-011)。待機中の文言は「確認を準備しています…」。失効・失敗(`expired-callback` / `error-callback` / `timeout-callback`)では待機中に戻す。site key が無い開発時は待たない。二重送信防止(送信中の無効化)はそのまま残す。**作り**:`Turnstile.tsx` は explicit render(`api.js?onload=…&render=explicit`)で描画し、`callback` と失効・失敗の3つのコールバックを親の `onToken`(`useState` のセッター)に繋ぐ。確認画面は `const waiting = siteKey && !token ? '確認を準備しています…' : undefined` を持ち、`SubmitButton` が `pending`(`useFormStatus`)と `waiting` の**両方**で `disabled` + `aria-busy` にする。「修正する」は待機中も押せる(戻る操作に確認は要らない)
- スパム対策は Cloudflare Turnstile。トークンが無い・検証に失敗した送信は拒否する(J-102)。ハニーポットだけで済ませない
- 物件情報の引き継ぎ(内見予約)は URL パラメータ(`?property=HR-R-0001`)で行う。ブラウザ側には持たせない(J-102)
- Turnstile が JS 前提のため、JS 無効時は送信できない(J-102 で決定)。`<noscript>` で「送信には JavaScript が必要です」と出す
- **本番でキー未設定のときの挙動(J-105)**:`RESEND_API_KEY` / `CONTACT_EMAIL_TO` / `TURNSTILE_SECRET_KEY` が未設定なら、開発時(`NODE_ENV !== 'production'`)はその工程を飛ばして完了まで通し、console にその旨だけ出す。**本番(`NODE_ENV === 'production'`)では送信を拒否してエラーを返す**(設定漏れを「成功」に見せない。流用元と同じ)
- **サンドボックス送信元の扱い(J-105)**:`CONTACT_EMAIL_FROM` が Resend のサンドボックス(`onboarding@resend.dev`)の間は、**自動返信を送らない**(アカウント本人以外に送れず 403 になる)。SHIN 宛の通知は送る。独自ドメインを設定した時点で自動返信が有効になる
- メールは `@react-email/render` で **html と text を作って渡す**。`react:` prop は使わない(流用元で本番バンドルが落ちた記録があるため・J-105)

## 3-A. 共通ロジックと I/O(`web/src/lib/forms/`・J-105)

**UI と Server Action の流れは4本とも別実装**(J-007)。**共通化してよいのは、判断が1つしかない検証・整形・送信**だけ。①② で次の4モジュールに固まった。**③ /sell・④ /owner はこの4つをそのまま使い、固有の項目だけを自分の `lib/sell.ts` `lib/owner.ts` に足す**。

| モジュール | 置く物 | 主な export | ③④ での使い方 |
|---|---|---|---|
| `forms/common.ts` | 共通7項目の型・読み取り・部分スキーマ・確認行。**純関数のみ**(I/O・`server-only` を入れない) | `CommonInput` / `EMPTY_COMMON` / `readCommon(fd)` / `str(fd, k)` / `commonSchema` / `firstErrors(issues)` / `normalizeCommon(v)` / `commonRows(v, noteLabel)` / `dash` / `normalizePhone` / `isPhone` / `methodLabel` | そのまま使う。備考のラベルが違うなら `commonRows(v, '相談内容')` のように引数で変える(関数は増やさない) |
| `forms/dates.ts` | 日付だけの純関数。JST 基準 | `parseDateOnly` / `isPastDate(v, today)` / `weekdayOf` / `isClosedDay(v, closedWeekday)` / `preferredLabel` / `todayJst(now?)` | ③ の売却希望時期が「日付」になるなら使う。**「年内」「未定」のような選択肢なら使わない**(日付ではないので無理に通さない) |
| `forms/deliver.ts` | **I/O**。先頭に `'server-only'`。Turnstile の検証と Resend の送信、その失敗文言 | `verifyTurnstile(token)` / `sendFormMails(job: MailJob)` / `MSG_TURNSTILE` / `MSG_SEND` / `MSG_NOT_CONFIGURED` / `DeliverResult` | そのまま使う。`MailJob` は `{ subject, notice, replySubject, reply, userEmail }`。本番でキー未設定なら拒否・サンドボックス送信元なら自動返信を送らない判断も中に入っているので、**各フォームで条件分岐を書かない** |
| `forms/resolve-property.ts` | **I/O**。`?property=` の ID から index.json を引き直す(クライアントの表示を信用しない・J-102 e) | `resolveProperty(no)` → `{ property: ResolvedProperty \| null, sold: boolean }` | **③④ は対象物件を持たないので使わない**。③ の所在地は自由入力、④ は物件所在地を自由入力で受ける |

**Zod の足し方(①② と同じ形にする)**:`commonSchema` は `z.object` のまま置いてあるので、各フォームは `commonSchema.extend({ 固有項目 }).superRefine((v, ctx) => { 条件つき必須 })` の順で組む。`.extend` は `superRefine` の**前**にしか書けない(`superRefine` を付けると `ZodEffects` になり `.extend` が消える)ため、この並びを崩さない。

```ts
export function sellSchema() {
	return commonSchema
		.extend({ kind: z.enum(KIND_SLUGS), ward: z.string().min(1, '…'), address: z.string().min(1, '…') })
		.superRefine((v, ctx) => {
			// 土地は築年・間取りを見ない、のような「他の項目に依存する必須」はここに書く
			if (v.kind !== 'land' && !v.layout) ctx.addIssue({ code: 'custom', path: ['layout'], message: '…' });
		});
}
```

- **備考の必須は `commonSchema` に書かない**。上限(1000文字)だけ共通で、必須は各フォームの `superRefine` が足す(② の種別ごとの必須がこれで入った)
- 検証の入口は `read〇〇(fd)` → `validate〇〇(input, today?)` の2段。`firstErrors` で欄ごとに最初の1件だけ返す
- **`lib/forms/common.ts` `dates.ts` は `web/data/` を読まない**(J-041 のテスト方針。I/O が要るものは `deliver.ts` `resolve-property.ts` の側に置く)

## 4. 記録すべきこと(章3の数字)

- 送信テスト件数:自分宛 + 別ドメイン宛。到達 / 不達 / 迷惑メール判定
- SPF / DKIM の設定有無(Resend の送信ドメイン)
- 1本目・2本目・3本目で AI の初案が何行目で崩れたか、指示が何回で通ったか
- 初案が出さないもの(確認画面・二重送信防止・架空注記・迷惑メール対策)を SHIN が足した箇所は J-ID

## 5. やらないこと

- 3本の共通コンポーネント化(見た目の共通化は CSS の範囲まで。ロジックは分ける)
- 送信内容の保存・管理画面・返信機能(会員機能・DB は入れない)
- カレンダー UI での日時選択(来店予約カレンダーは対象外)
