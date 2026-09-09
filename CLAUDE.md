# hirakiya-fudosan — 記録用サイト(株式会社ヒラキヤ不動産 / HR)

**架空の不動産会社サイトを AI で一から作り、経緯・意図・判断を記録する。成果物はサイトではなく記録。**
設計ドキュメントは `docs/` にある。**タスク開始前に `docs/00-制作計画.md` §1・§3・§8 を読むこと。**

---

## プロジェクト概要

- 題材:賃貸仲介・売買仲介・賃貸管理を行う地域密着の不動産会社(東京都葛飾区・京成線沿線・2店舗8名・創業2001年・管理800戸)
- **社名・住所・電話・免許番号・人名・物件はすべて架空。** 実在と衝突しないための書式が決まっている(`.claude/rules/fictional-data.md`)
- 証明したいのは「AI で作れる」ことではなく **「AI で作った時に人が何を判断したか」**
- 公開時は「素人が AI で作ると止まる 6 箇所」を章立てにする(章1 スマホ / 2 デザイン基準 / 3 フォーム / 4 公開・速度 / 5 WP(過去実績) / 6 AI に頼んでも直らない箇所)

詳細:`docs/00-制作計画.md` / ページ仕様:`docs/01-設計図.md` / データ:`docs/02-物件データ設計.md` / デザイン:`docs/03-デザイン基準.md`

## 技術スタック

- **フロント**:Next.js 16.3(App Router・Turbopack(Next 16 の既定))/ React 19.2 / TypeScript strict / Tailwind 4 / pnpm 12 / Node 24
- **CMS**:WordPress(Docker compose でローカル運用のみ。`compose.yaml` = WordPress 6 + MySQL 8.4 + phpMyAdmin)+ 自作プラグイン `hr-core`(CPT / タクソノミー / ACF 無料版)
- **データ経路**:WP REST → `scripts/export-wp-data.mjs` → `web/data/*.json` + `web/public/wp-uploads/` → `DATA_SOURCE=static` でビルド(Nordic Works から流用)
- **地図**:Leaflet / MapLibre + OpenStreetMap(Google Maps は使わない)
- **フォーム**:Server Action + Zod + Resend + React Email(3本別実装)
- **デプロイ**:Vercel(Hobby)。Vercel は手元の WordPress に一切アクセスしない
- **入れないもの**:会員機能 / DB / 多言語 / お気に入り / 物件比較 / シミュレーター / `api/preview` / `api/revalidate`

## リポジトリ構成

```
CLAUDE.md               この文書(常時読込)
compose.yaml / .env     Docker(WordPress + MySQL + phpMyAdmin)。.env は Git 管理外
.claude/                AI 運用層:rules(パス単位)/ skills(手順)/ commands(呼び出し)/ hooks(強制)
docs/                   記録層(人間向け・Git 管理)。00〜03 設計、記録シート、decisions/、screenshots/、metrics/、progress/
web/                    Next.js 本体(src/app, components, config/site.ts, lib, types, scripts, data, e2e)
wp/plugins/hr-core/     WordPress 側(Docker にマウント)。CPT・タクソノミー・ACF・シード
wp/themes/ wp/uploads/  同上(uploads は Git 管理外)
```

## 実コマンド

```bash
# ルートで(WordPress)
docker compose up -d                      # http://localhost:8080 / phpMyAdmin :8081
docker compose stop                       # 停止(データは残る)
docker compose exec -u www-data wordpress php wp-content/plugins/hr-core/scripts/seed-properties.php   # 物件60件を投入(冪等・--reset で入れ直し)

# web/ で(Next.js)
pnpm install
pnpm dev                                  # http://localhost:3000(DATA_SOURCE=api で Docker の WP を読む)
pnpm run export-wp                        # WP REST → web/data/*.json + 画像 DL(Docker 起動中のみ)
DATA_SOURCE=static pnpm build && pnpm start   # 本番相当。Vercel はこの形でビルドする
DATA_SOURCE=static pnpm start -p 3001         # 確認用(AI のスクショ等)は -p 3001。3000 は SHIN の dev サーバーなので起動・停止しない
pnpm lint
pnpm test                                 # web/src/lib/**/*.test.ts(Vitest・純関数のユニットテスト)
pnpm exec playwright test                 # web/e2e(フォーム3本・検索 URL 同期)
```

`/export-wp` で「Docker 起動確認 → export → 差分確認 → コミット」を一括で行う。

## 環境変数(`web/.env.local`・Git 管理外。雛形は `web/.env.example`)

| 変数 | 既定値 / 用途 |
|---|---|
| `WORDPRESS_API_URL` | `http://localhost:8080/wp-json`(Docker の WordPress。パーマリンクは「投稿名」) |
| `DATA_SOURCE` | `api`(開発)/ `static`(本番ビルド) |
| `NEXT_PUBLIC_SITE_URL` | 公開 URL。sitemap・canonical・OGP に使う |
| `RESEND_API_KEY` / `CONTACT_EMAIL_FROM` / `CONTACT_EMAIL_TO` | フォーム送信(3本共通・宛先は SHIN のみ) |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | スパム対策(採用時) |

Norton 環境では `npm` / `pnpm` の HTTPS 検証が失敗する。`$env:NODE_OPTIONS="--use-system-ca"` を付けるか、Norton で `npmjs.org` を除外。PowerShell の `curl` は別名なので `curl.exe` を使う。

GraphQL・Algolia・preview/revalidate 用の変数は **使わない**(Nordic Works から持ち込まない)。

## 記録の原則(最重要・`.claude/rules/record-keeping.md` に詳細)

1. **AI が案を出す時は「これは初案」と明示する。** 公式スキル(react-best-practices 等)が出した案も初案
2. **SHIN が却下・条件追加・自分で決定した時だけ J-ID を採番**し、`docs/記録シート.md` §1 に下書き行を追加する。そのまま採用は「そのまま採用」1行のみ
3. **「判断の出所」列は AI が埋めない。** SHIN が書く
4. 判断を伴うコミットは末尾に `[J-ID]`。コミット前に hook が J-ID の有無と記録シートの行を確認する
5. スクリーンショットは `docs/screenshots/J-ID-before.png` / `-after.png`。撮り逃すと復元不可
6. AI が間違えて SHIN が気づいた箇所は記録シート §3(F-ID)。地名・沿線・駅は必ず `docs/02-物件データ設計.md` §8 と突合する
7. 反証は結論の位置に置かず、「この条件で効く」の形で後ろに置く
8. **推測で埋めない。** 分からないことは実物(リポジトリ・公式ドキュメント・`docs/`)を先に読むか、SHIN に聞く

## コミット規約

英語・Conventional Commits。判断を伴うものだけ末尾に `[J-ID]`。

```
feat: add search url sync [J-031]
fix: keep rent larger than title on property card [J-028]
docs: add week-02 progress log
chore: update WP data export
```

## rules / skills / commands / hooks の役割

| 層 | 何をするか |
|---|---|
| `rules/record-keeping.md` | 常時。記録運用の全体ルール |
| `rules/fictional-data.md` | `web/src/config/**` `web/scripts/seed/**` `web/data/**` `wp/plugins/**` を触る時に架空表記ルールを強制 |
| `rules/forms.md` | `web/src/components/forms/**` `web/src/app/actions/**` |
| `rules/search.md` | `web/src/components/search/**` `web/src/lib/search.ts` |
| `rules/static-rendering.md` | `web/src/app/**`。cookie を読まない・動的化しない |
| `skills/record-judgment` | AI が判断の発生を検知したら、記録シートの下書き行を提案する(自動) |
| `/log-judgment` | SHIN が判断を記録する時に呼ぶ。行の追加と `docs/decisions/J-xxx.md` の生成 |
| `/export-wp` | Docker の WP → JSON の書き出しとコミット |
| `hooks/check-jid.mjs` | `git commit` の前に J-ID とコミット規約を検査(settings.json で登録) |

公式スキル `react-best-practices` / `web-design-guidelines` / `webapp-testing` は `.claude/skills/` にインストール済みの前提。出力はすべて初案として扱う。

## ドキュメント参照ガイド

| 何をしたい時 | 参照 |
|---|---|
| 目的・記録の設計・章立て・時間の上限を確認する | `docs/00-制作計画.md` |
| ページの要素・導線・判断ポイントを見る | `docs/01-設計図.md` |
| 投稿タイプ・タクソノミー・フィールド・JSON 分割・シード仕様 | `docs/02-物件データ設計.md` |
| 色・書体・余白・バッジ・カードの基準 | `docs/03-デザイン基準.md` |
| 判断ログ・実測・失敗・ガバナンスを書く | `docs/記録シート.md` + `docs/templates/` |
| 週次ログを書く | `docs/templates/weekly.md` → `docs/progress/week-NN.md` |

## 開発時の留意事項

- 物件・会社・スタッフの値は `web/src/config/site.ts` と `web/data/` 以外に書かない。コンポーネントに数値をベタ書きしない
- `web/src/types/` は `export-wp-data.mjs` の JSON と一致させる。バッジ判定(新着・値下げ)は `lib/` の純関数
- **`web/src/lib/` の純関数を作る・変える時は、同じコミットに隣の `<name>.test.ts` を含める**(Vitest・1テスト1ルール・見出しは日本語で先頭に根拠 ID・入力は最小のダミー・境界値を含める・`web/data/` は読まない。J-041)。落ちたテストは直す前に SHIN に報告する
- `fetch` は明示的にキャッシュ戦略を指定する(Next.js の既定はキャッシュなし)
- 画像は `next/image`。プレースホルダー画像のみ。実写真は使わない
- スマホ幅(390px)を先に作り、PC(1280px)へ展開する
- テストと CI は後回しにしない(`web/e2e/` はフォーム3本の送信と検索の戻る動作)

## トラブルシューティング

- **`pnpm run export-wp` が失敗する** → `docker compose ps` で hr-wp が running か、`WORDPRESS_API_URL` が `http://localhost:8080/wp-json` か、`/wp-json` が 404 ならパーマリンクが「基本」のままでないか確認
- **WordPress の更新** → 管理画面から更新するとコンテナ再作成で消える。上げるなら `compose.yaml` の `image:` を変える
- **Vercel で物件が出ない** → `DATA_SOURCE=static` になっているか、`web/data/` がコミットされているか
- **ページが動的レンダリングになる** → `cookies()` / `headers()` / `searchParams` を Server Component で読んでいないか。`.claude/rules/static-rendering.md`
- **コミットが hook に止められる** → J-ID の書式(`[J-024]`)と、記録シート §1 にその行があるか
