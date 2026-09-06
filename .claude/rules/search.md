---
paths:
  - "web/src/components/search/**"
  - "web/src/lib/search.ts"
  - "web/src/app/(search)/**"
---

# 検索・絞り込みのルール

データは `web/data/properties/index.json`(全件の一覧用サブセット)を読む。Algolia・外部検索は使わない(自前実装)。

## 1. 検索条件はタクソノミーの slug で持つ(`docs/02-物件データ設計.md` §2)

| 条件 | slug | 値 | 複数 |
|---|---|---|---|
| 種別 | `property_type` | `rental` / `sale` | 単一 |
| 物件種目 | `property_kind` | `mansion` / `apartment` / `house_rental` / `house` / `land` | 単一 |
| エリア(町) | `area` | 13町の slug(`aoto` `tateishi` `ohanajaya` `kameari` `shinkoiwa` `kanamachi` `horikiri` `koiwa` `hirai` `ayase` `kitasenju` `oshiage` `hikifune`) | 単一(物件側)/ 複数(検索側) |
| 沿線 | `line` | 6本 | 複数 |
| 駅 | `station` | 13駅(沿線の子にしない。駅側に沿線をメタで持つ) | 複数 |
| 設備 | `feature_tag` | 15種 | 複数 |
| 特集 | `collection` | 6種(手動付与) | 複数 |
| ステータス | `status` | `open` / `negotiating` / `sold` | 単一 |

数値レンジ:家賃 `rent` / 価格 `price` / 面積 `area_sqm` / 築年 `built_ym` / 駅徒歩 `walk_minutes`。
**学区は入れない**(02 §8-3)。設備・特集・町・駅の追加は SHIN の判断(J-ID)。

## 2. URL 同期(機能8件の要・J-004)

- **検索条件はすべて URL のクエリに載せる**(例:`/properties?type=rental&area=aoto,tateishi&rent_max=80000&layout=1k,1dk`)
- 共有・ブックマーク・ブラウザの「戻る」で同じ結果が再現できること。state だけで持つ初案は不採用
- 条件タグの「×」で1つ外す操作も URL を書き換える
- ページネーション・並び替え(新着順 / 家賃・価格順 / 広さ順)も URL に載せる
- `/area/[slug]` `/line/[slug]` `/station/[slug]` `/feature/[slug]` は条件固定の一覧を SSG で生成する(`generateStaticParams`)。クエリ付き `/properties` は検索側で処理する
- `web/e2e/` に「条件を変えて戻る → 前の条件が復元される」テストを置く

## 3. バッジ判定は純関数(`web/src/lib/`)

- 新着:`publishedOn` から **14日以内**
- 値下げ:`rentPrevious > rent` または `pricePrevious > price`(期間の条件は付けない)
- 商談中・成約済み:`status`
- 同時表示は最大2つ。優先度は 成約済み > 商談中 > 値下げ > 新着
- 型(`web/src/types/`)に「新着」「値下げ」を持たせない

## 4. 0件時と掲載終了(判断ポイント。初案を出す時は「これは初案」)

- 0件時:「該当なし」で止めない。**条件を1つ緩める候補**(各候補に件数を付ける)+ **近隣エリア**(13町の中だけ)を出す。緩める順序は SHIN が決める
- 成約済み物件の詳細:404 にするか「成約しました + 類似物件」にするかは J-ID 対象。決まるまで実装しない
- 物件数が多い時の地図モード(クラスタリングの有無)も J-ID 対象

## 5. スマホ

- 検索フォーム(トップ)は **3項目**(エリア・駅 / 家賃 / 間取り)+ タブ(賃貸 / 売買)。決定済み
- 一覧の絞り込み:PC は左サイド常時表示。スマホはドロワーかインライン折りたたみか(判断ポイント)
- 物件カードは **家賃・価格を最も大きく**。物件名は最後・最小(`docs/03-デザイン基準.md`)
- `index.json` のサイズとビルド時間(60件 + 13エリア + 13駅 + 6特集)は章4の数字。計測して `docs/metrics/` に残す

## 6. やらないこと

- Algolia / 外部検索 API
- お気に入り・保存検索・新着通知(会員機能)
- 物件比較
- 実在の駅名・地名の追加(一覧の外に出ない)
