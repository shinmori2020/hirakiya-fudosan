---
description: docs/04-実装順.md の1段(または1ページ)を初案として実装し、before スクショと判断ポイントを出して止まる。コミットはしない。引数は実装順の番号か対象名(例: 1, "物件一覧", "2 物件詳細")。
argument-hint: "[実装順の番号 | ページ名]"
disable-model-invocation: true
allowed-tools: Read Grep Glob Edit Write Bash(pnpm *) Bash(git status *) Bash(git diff *)
---

# /build-page $ARGUMENTS

1ページ(または実装順の1段)の**初案**を作る。判断は SHIN がする。**コミットはしない。**

## 手順

1. **読む(必ず・この順)**
   - `docs/04-実装順.md` で対象の段を特定。「先に要るもの」が未完なら止まって報告する
   - `docs/04-実装順.md` の「各段で先に決める判断」に未決の項目があれば、**実装前に SHIN に聞く**(推測で決めない)
   - `docs/01-設計図.md` の該当ページの要素・順序・判断ポイント
   - `docs/03-デザイン基準.md` 全体(色・サイズ・余白・部品・レイアウトの型・§8 やらないこと)
   - `.claude/rules/` の該当ルール(search / forms / static-rendering / fictional-data)
   - `web/src/types/property.ts` `web/src/lib/properties.ts` `web/src/config/site.ts`(値はここから取る。ベタ書きしない)
2. **冒頭に「これは初案」と書く。** 03 から外れる値(色・サイズ・余白)は使わない。必要なら「03 に無いので仮に X」と明示する
3. **スマホ 390px を先に実装し、PC 1280px に展開する**。実データで確認:長い物件名 / 写真0枚(HR-R-0004 等)/ 成約済み / 6枚
4. `pnpm exec tsc --noEmit` と `pnpm lint` を通す。`DATA_SOURCE=static pnpm build` で対象ルートが Static であることを確認
5. **before スクショ**:`pnpm dev` を起動し、Playwright(入っていれば)で 390×844 と 1280×800 を `docs/screenshots/<順>-<ページ>-before-390.png` / `-before-1280.png` に保存。Playwright が無ければ SHIN に撮影を依頼する(採番後に `J-NNN-before.png` へ改名)
6. **報告(この形式で。長くしない)**
   ```
   【初案】<ページ> / 実装順 <N>
   作ったもの:<ファイル一覧>
   03 から外れた箇所:<無ければ「なし」>
   実データで気になった点:<長い名前・0枚・成約済み で崩れた箇所>
   判断が必要な箇所(01 の判断ポイント+実装で出たもの):
   1. …(A 基準違反 / B 基準の不備 / C ページ固有 のどれかを付ける)
   2. …
   スクショ:docs/screenshots/…
   → 判断が付いたら /log-judgment。コミットは「feat: add <page> [J-NNN]」
   ```
7. **止まる。** 修正・コミット・次の段には進まない

## やってはいけないこと

- 判断ポイントを自分で決めて進める(「一般的には〜なので」で埋めない)
- 03 に無い色・余白・書体を足す。足したくなったら「B. 基準の不備」として報告する
- 会社・物件・スタッフの値をコンポーネントに書く(`config/site.ts` と `data/` から読む)
- `cookies()` / `headers()` / `searchParams` を Server Component で読む(rules/static-rendering.md)
- 実在の地名・施設名・団体名を足す(13町・13駅・6沿線の外に出ない)
- 実装順を飛ばす(「ついでに」で次のページに手を付けない)

## 修正の時(2回目以降の /build-page <同じ対象>)

- 直前の判断(記録シート §1 の該当 J-ID)を読み、その条件だけを直す
- 03 を直す判断(B)が含まれていれば、**先に 03 を直して §11 に版を足し**、それからページを直す
- after スクショを `docs/screenshots/J-NNN-after-390.png` / `-after-1280.png` に保存
- 同じ「往復回数」を報告に含める(例:2往復目)。3往復目に入る項目は「章6候補」と明記する
