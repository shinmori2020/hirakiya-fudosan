---
paths:
  - "web/src/app/**"
  - "web/next.config.ts"
  - "web/src/lib/wordpress.ts"
---

# 静的レンダリングのルール(Nordic Works の教訓を規則化)

**前作 Nordic Works は、後付けの next-intl が `NEXT_LOCALE` cookie を読んだため、公開 HTML が動的レンダリング(Suspense ストリーミング)になり、README の「静的サイト生成」と実物が食い違った**(制作計画 §5-2)。このサイトは多言語なし。cookie を読まない設計で静的化する。

## 1. 全ページを静的に生成する

- ビルドは `DATA_SOURCE=static` で行い、`web/data/*.json` だけを読む。Vercel は手元(Docker)の WordPress に到達できない(README 落とし穴7)
- `fetch` は明示的に `cache: 'force-cache'` を付けるか、そもそも JSON をファイルから読む。`revalidate` を書いても参照先の WP がローカルなので **機能しない**。書かない
- 動的ルート(`/properties/[id]` `/area/[slug]` `/line/[slug]` `/station/[slug]` `/feature/[slug]` `/news/[slug]`)は `generateStaticParams` で全件を列挙する
- ページを静的に固定する route segment config を使う。**Next.js の該当バージョンの公式ドキュメントで指定名を確認してから書く**(バージョンで変わる。推測で書かない)

## 2. Server Component で読んではいけないもの

以下を Server Component / layout / page で呼ぶとそのルートが動的になる。**使う前に SHIN に確認し、使った場合は理由を J-ID で記録する。**

- `cookies()` / `headers()` / `draftMode()`
- `page.tsx` の `searchParams`(検索結果 `/properties` だけは例外候補。判断ポイント → §4)
- `next-intl` などロケール検出を cookie / header で行うライブラリ
- `unstable_noStore` / `dynamic = 'force-dynamic'`

「最近見た物件」はブラウザ側(localStorage)で持ち、Client Component で描画する。サーバーは関与しない。

## 3. ビルド時に確認すること

- `pnpm build` の出力で各ルートが **Static / SSG** になっているか(Dynamic が1つでもあれば原因を特定する)
- `NEXT_PUBLIC_SITE_URL` が本番 URL になっているか(sitemap・canonical・OGP)
- `web/data/meta.json` の件数・取得日時がコミット済みか
- Lighthouse を公開前後で計測し、レポート本体を `docs/metrics/YYYY-MM-DD-*.json` に置く(数字だけでは自己申告になる)

## 4. 検索結果ページ `/properties` の扱い(判断ポイント)

条件付き一覧をどこで処理するかは3案あり、**SHIN が決める(J-ID)**。決まるまで実装しない。

1. 静的な殻 + Client Component で `index.json` を絞る(全ページ静的。JS 必須)
2. `searchParams` を Server Component で読む(このルートだけ動的。JS 不要)
3. 条件固定ルート(`/area/[slug]` 等)は SSG、自由検索だけ 1 の方式

案を出す時は「これは初案」と明示し、各案で静的にならない範囲を書く。

## 5. 入れないもの(WP をローカル運用する限り本番で動かない・Nordic Works で証明済み)

- `api/preview`(下書きプレビュー)
- `api/revalidate`(On-demand Revalidation)
- `save_post` → webhook
- ISR(`revalidate: N`)

営業時の説明は制作計画 §5-2 の文言に従う:「デモは WordPress をローカル運用し静的生成した状態を公開。実案件では WP をサーバーに置き ISR / On-Demand Revalidation で数分以内に反映」。

## 6. noindex(J-011)

構造化データ(Organization / RealEstateListing / FAQ / BreadcrumbList)・`llms.txt`・クロールしやすい HTML は **全部実装した上で `robots.ts` と `<meta name="robots">` で noindex** にする。実装を省いて noindex にしない。記録ページのみ index にするかは別途判断。
