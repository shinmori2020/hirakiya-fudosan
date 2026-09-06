---
description: Docker の WordPress から物件データを JSON に書き出し(pnpm run export-wp)、差分を確認してコミットする。docker compose up -d の後に呼ぶ。
disable-model-invocation: true
allowed-tools: Bash(docker compose ps) Bash(pnpm run export-wp) Bash(git status *) Bash(git diff *) Bash(git add web/data *) Bash(git add web/public/wp-uploads *) Bash(git commit -m *) Read
---

# /export-wp — Docker の WP → web/data/*.json → コミット

WordPress は手元の Docker でしか動かない。Vercel はこの JSON だけを読む。**コンテナが起動していないと何も取れない。**

## 手順

1. **Docker の起動確認**
   `docker compose ps` で `hr-wp` が running か見る。止まっていれば「`docker compose up -d` を実行してから再実行」と伝えて止まる。次に `web/.env.local` の `WORDPRESS_API_URL`(既定 `http://localhost:8080/wp-json`)に到達できるか確認する。404 ならパーマリンクが「基本」に戻っている。推測で進めない
2. **書き出し**
   `web/` で `pnpm run export-wp` を実行する(= `node scripts/export-wp-data.mjs`。Nordic Works から流用)。出力先:
   - `web/data/properties/index.json`(一覧用サブセット)
   - `web/data/properties/HR-R-0001.json` …(1物件1ファイル)
   - `web/data/taxonomies/{area,line,station,feature_tag,collection,status}.json`
   - `web/data/meta.json`(取得日時・件数・WordPress のバージョン)
   - `web/public/wp-uploads/`(画像。プレースホルダーのみ)
3. **確認**
   - `meta.json` の件数を報告する(期待:賃貸40 / 売買20 = 60)
   - `git status` と `git diff --stat web/data` で変わったファイルを出す。**1物件の変更が1ファイルに収まっているか**(02 §5 の狙い)
   - 架空ルールの簡易チェック:`web/data` 内に `0-0-0` 以外の番地、`0000` 以外の電話、13町以外の地名が無いか grep する。あれば **コミットせず** に報告する(F-ID 候補)
4. **コミット**
   `git add web/data web/public/wp-uploads` → `git commit -m "chore: update WP data export"`。
   **J-ID は付けない**(データ更新は判断ではない)。シード仕様を変えた場合はそのコミットを別に切り、そちらに J-ID を付ける
5. 結果を3行で報告する:件数 / 変わったファイル数 / コミットハッシュ

## 注意

- `DATA_SOURCE` の切替は触らない(開発 `api` / 本番 `static` は `.env` と Vercel 側の設定)
- 画像は `/wp-uploads/...` の相対パスに書き換わる(スクリプトの仕様)。`nordic-works.local` の文字列が残っていたら流用時の置換漏れ。報告する
- 60件を超える・件数が合わない時はシード側の問題。`wp/plugins/hr-core/scripts/seed-*.php` を見る前に SHIN に報告する
