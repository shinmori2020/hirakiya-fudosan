# web/ の土台づくり(C・初案 2026-09-07)— Claude Code への依頼手順

このフォルダの中身は「create-next-app の後に載せるファイル」。順に進める。

## 1. Next.js を作る(リポジトリのルートで)

```powershell
pnpm dlx create-next-app@latest web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --no-turbopack
```
- 質問が出たら:React Compiler は No(初案)。それ以外は既定
- 出来た `web/` に、入った Next.js のバージョンを `pnpm list next` で確認し、CLAUDE.md の技術スタックに書く

## 2. このフォルダのファイルを web/ に置く(既存があれば上書き)

```
web/scripts/export-wp-data.mjs
web/src/lib/wp-map.mjs
web/src/lib/wp-map.d.ts
web/src/lib/properties.ts
web/src/lib/badges.ts
web/src/types/property.ts
web/src/config/site.ts
web/.env.example
```

## 3. package.json に scripts を足す

```json
"export-wp": "node scripts/export-wp-data.mjs"
```

## 4. tsconfig.json を確認

`compilerOptions.allowJs: true` が無ければ足す(`wp-map.mjs` を TS から import するため。d.ts があるので型は付く)。
`paths` の `@/*` → `./src/*` は create-next-app が入れている。

## 5. .env.local を作る

```powershell
cd web
copy .env.example .env.local
```
値は雛形のままで動く(WORDPRESS_API_URL=http://localhost:8080/wp-json / DATA_SOURCE=api)。

## 6. export を通す(Docker の WordPress が起動していること)

```powershell
pnpm run export-wp
```
期待:`properties 60 件` → タクソノミー8種 → `画像: 210 件` → `Export 完了: 物件 60(賃貸 40 / 売買 20 / 写真なし 3)`
- `data/properties/index.json` `data/properties/HR-R-0001.json` … `data/taxonomies/*.json` `data/meta.json` `public/wp-uploads/placeholders/*.svg` が出来る
- 架空表記ルール違反があると exit 2 で止まる(そこで止まったら F-ID 候補)

## 7. 型が通るか

```powershell
pnpm exec tsc --noEmit
pnpm lint
```

## 8. 本番相当のビルドが通るか(ページはまだ無いので既定のトップだけ)

```powershell
$env:DATA_SOURCE="static"; pnpm build
```
`data/` と `public/wp-uploads/` をコミット対象にする(Nordic Works と同じ)。`web/.gitignore` に `data/` が入っていないことを確認。

## 9. コミット

`feat: scaffold web with export script and data layer` → hook が ask を出す。C の初案をそのまま採用なら許可。

## 10. 公式スキル(この時点では入れない)

react-best-practices / web-design-guidelines / webapp-testing は「UI 実装に入る時」に入れる。入れ方は実行時に公式(anthropics/skills)を見て確認する。ここでは推測で手順を書かない。

---

## この初案で私(AI)が決めた箇所(変えるなら J-ID)

| 箇所 | 初案 |
|---|---|
| 変換ロジックの置き場 | `src/lib/wp-map.mjs` の1ファイル。export と lib の両方から使う(Nordic Works は export が生 JSON を吐き、lib 側で読んでいた) |
| 開発時のデータ源 | `DATA_SOURCE=api` で REST 直読み(Nordic Works と同じ) |
| `properties/*.json` の扱い | export のたびに全消しして書き直す(削除物件のファイルが残らない) |
| 架空チェック | export 時に住所・物件番号・担当者の姓・電話らしき数字を検査。違反で中止 |
| 賃貸専用・売買専用の項目 | `detail.rental` / `detail.sale` の入れ子(フラットにしない) |
| 数値の空 | `null`(`0` と区別する)。`rent` / `price` は 0 を既定 |
| meta.json の WP バージョン | トップページの generator メタから。REST に無いため |
| React Compiler | 入れない |
| Turbopack | `--no-turbopack`(export スクリプトや Windows での挙動を安定させるため。dev の速度より確実性) |
