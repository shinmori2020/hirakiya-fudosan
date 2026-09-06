# hr-core — ヒラキヤ不動産(架空)の WordPress 側(初案 v0.1 / 2026-09-07)

`docs/02-物件データ設計.md` を WordPress に載せるプラグイン。Nordic Works の `nordic-works-core` と同じ構造(本体 PHP / `acf-json/` / `scripts/seed-*.php`)。

```
wp/plugins/hr-core/
├── hr-core.php                      投稿タイプ property・タクソノミー7種・駅/町の term meta・REST 整形・管理画面の列と注記
├── acf-json/group_hr_property.json  ACF フィールド 48 項目(共通 / 賃貸 / 売買。種別で表示切替。show_in_rest 有効)
├── scripts/seed-properties.php      タクソノミー投入 + 物件 60 件 + プレースホルダー SVG 生成(固定シード・冪等)
└── README.md
```

## 1. 有効化(1回だけ)

1. `http://localhost:8080/wp-admin` → **プラグイン → 新規追加** → `Advanced Custom Fields` を検索 → インストール → 有効化(無料版で足りる)
2. **プラグイン** 一覧に「HR Core(ヒラキヤ不動産)」が出るので → 有効化
3. 左メニューに「物件」が出る。「物件 → 物件を追加」でフィールド 48 項目が見えれば ACF JSON が読めている
4. **設定 → パーマリンク** を開いて「変更を保存」を1回押す(投稿タイプ追加後のリライトルール更新)

## 2. シード投入(60 件)

リポジトリのルートで:

```powershell
docker compose exec -u www-data wordpress php wp-content/plugins/hr-core/scripts/seed-properties.php
```

- 2〜3 分。1 行ずつ `+ HR-R-0001 曳舟テラス0-1 賃貸 マンション 82,000円 4枚 公開中` のように出る
- 再実行しても既存(物件番号)はスキップされる
- 全部消して入れ直す:末尾に `--reset`
- 生成物:`wp/uploads/placeholders/*.svg`(物件写真 約200 + 間取り図 10)。`.gitignore` 対象

## 3. 確認

```powershell
curl "http://localhost:8080/wp-json/wp/v2/properties?per_page=1"
```

1 件返り、`acf` に家賃・住所などが、`hr_terms` に全タクソノミーの slug が入っていれば `export-wp-data.mjs` が読める形になっている。

管理画面 → 物件一覧 で 60 件・「物件番号」「家賃 / 価格」列が出る。

## 4. 仕様で決まっていなかった箇所(初案。変えるなら J-ID)

| 箇所 | 初案 |
|---|---|
| 沿線 slug | `keisei-main` `keisei-oshiage` `keisei-kanamachi` `jr-joban` `jr-sobu` `tobu-skytree` |
| 設備 slug | `pet-ok` `autolock` `parking` `delivery-box` `separate-bath` `washstand` `reheating` `aircon` `south-facing` `corner-room` `upper-floor` `zero-deposit` `move-in-now` `instrument-ok` `office-ok` |
| 特集 slug | `central-30min` `zero-deposit` `pet-ok` `house-rental` `near-station` `new-built` |
| 「都心まで30分以内」の対象駅 | 押上・北千住・曳舟・綾瀬の 4 駅(全駅にすると 56/60 件が該当) |
| 種別による表示切替 | ACF の taxonomy 型フィールド `property_type`(save_terms)で条件表示。ACF 無料版は素のタクソノミー欄を条件にできない |
| 間取り図 | `image` 型ではなく **パス(text)**。`images` と同じ扱い |
| プレースホルダー | SVG のまま(PNG 変換しない)。`/wp-content/uploads/placeholders/` |
| 特集の付与 | seed が条件で自動付与(02 §2 の「手動付与」の代行) |
| 2駅目 | 町ごとに近接する町の駅を固定で割当(`$SECOND_STATION`) |
| 乱数 | `mt_srand(20260907)`。仕様を変えると 60 件全部が変わる |

## 5. 検証済み(WP スタブで生成ロジックだけ実行・2026-09-07)

賃貸40/売買20 ・ 種目 M28/A15/HR5/H8/L4 ・ 葛飾30/江戸川12/足立10/墨田8 ・ open48/negotiating7/sold5 ・ 写真0枚3 ・ 徒歩5分以内15 ・ 14日以内新着10 ・ 値下げ8 ・ タイトル重複0 ・ 番地はすべて 0-0-0 ・ 面積と家賃が間取りに追随(1K 23〜28㎡ 7.1〜9.2万 / 3LDK 62〜71㎡ 18.6〜22.7万)

## 6. やらないこと

学区フィールド(02 §8-3)/ 実写真 / 実在の物件名・施設名 / GraphQL / `api/preview` `api/revalidate` / 管理画面からの WP 本体更新
