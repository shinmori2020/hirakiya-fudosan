# 素材の出所(写真・画像)

このサイトの画像は2種類ある。**どちらも仮のもの**で、公開前に差し替えるかは実装順 9 で判断する(J-131)。

1. **プレースホルダー(自作 SVG)** — 物件60件・スタッフ8名・一部の外観。`web/public/placeholders/` と `web/public/wp-uploads/placeholders/`
2. **フリー素材の実写真** — **場所と生活の場面を示すものだけ**(街並み・店舗外観・建物の外観 / 室内などの生活の場面。人・実在の物件・実在の店名や表札が写らないもの・J-150)。`web/public/photos/`

**人(スタッフ)と物件60件は SVG のプレースホルダーのまま**(実在の人・実在の物件に見える度合いが上がるため・`.claude/rules/fictional-data.md` §4)。

---

## web/public/photos/(フリー素材・2026-09-20 取得)

出所は **Wikimedia Commons の CC0**(パブリックドメイン相当)と **Unsplash License**。**どちらも商用可・帰属不要**。
写っているのは**実在の場所**で、このサイトの架空の店舗・物件とは関係がない。**架空サイトである旨はページ側の注記で示す**(J-012)。

| ファイル | 使用箇所 | 元の題名 | 撮影者 | ライセンス | 出所 | 現在の寸法 / 容量 |
|---|---|---|---|---|---|---|
| `fv-town.jpg` | **使っていない**(J-167 でトップの FV を路線図ヒーローに替えたため。ファイルは残している)。それまでは トップ FV の背景(**明るいリビング**。J-150 で生活の場面として範囲に入れた) | EVjqpcn79AM | Spacejoy | Unsplash License | [Unsplash](https://unsplash.com/photos/EVjqpcn79AM) | 1920×1080 / 197KB |
| `guide-apartment.jpg` | トップ 導線カード「オーナー様へ」(賃貸の建物の外観) | Residential building in Ebisu.jpg | Syced | CC0 | [Commons](https://commons.wikimedia.org/wiki/File:Residential_building_in_Ebisu.jpg) | 800×602 / 87KB |

**FV の写真の差し替え ②(2026-09-21・街区 → 生活の場面)**:`fv-town.jpg` の中身を **Spacejoy のリビング(Unsplash)** に入れ替えた。**外した理由**:街区の俯瞰(Tokyo, Japan / Matt Milton)は**都会の雑然とした感じが出ており**、探しているのが「住む場所」だと伝わらない。**明るい生活の場面**(窓から自然光・白と木・人と商品名が写らない)に替えた。ファイル名は `fv-town.jpg` のまま(参照箇所を増やさないため。中身は街ではなくなっている)。
**膜は 50% → 60%**:この写真は明るく、50% では補足(白80%)が **4.14〜4.26** と 4.5:1 を切った。60% で **5.50〜5.65**(03 §2 J-133 の「50〜60%」の内側なので版は上げない)。
**Commons の CC0 で先に探した3枚は採らなかった**(スクショ `docs/screenshots/fv-room-{a,b,c}-{390,1280}.png`)。**a**(Living room / Jarosław Ceborski)はラジエーターとヘリンボーンの床が明らかに欧州。**b**(Nordfjordeid, Norway / Steinar Engeland)は 390 で窓辺の「1」の札が画面中央の主役になる。**c**(Furnitures in the sunlight / Harry Tang)は数値は最良だが共用廊下に見え、「住む」に繋がらない。**CC0 に日本の室内は1枚も無かった**(7ラウンド・約30クエリ)。

**FV の写真の差し替え ①(2026-09-21・解像度)**:同じ `fv-town.jpg` の中身を入れ替えた。**外したもの**:Residential district in Tokyo(Fábio Hanashiro・CC0)。**理由**:遠景の俯瞰で、FV の全面に敷くと拡大されて荒い(800×533 で置いていた)。同じ写真の高解像度版も試したが、**密集した俯瞰は圧縮が効かず 1600幅・品質42 でも 355KB**(目安の 300KB を超える)。
**採らなかったもう1つの候補**:Urban Tokyo panorama(Joe Lewandowski・CC0)。**空が明るく、膜 50% では補足(白80%)のコントラストが 3.48〜3.59 と 4.5:1 を下回る**(見出しは 4.61〜4.75 で辛うじて超える)。採るなら膜を 60% に上げる必要があり、写真が沈むので見送った。比較のスクショは `docs/screenshots/fv-cand-{b,c}-{390,1280}.png`。

**置いたが外した写真(2026-09-20)**:商店街(Keikyu Kamata Shopping Street Asuto)・自転車店(Bicycles shop in Ebisu)・剣道具店(Kendo shop in Gotanda)・焼き鳥店(Yakitori shop in Setagaya)の4枚は、**実在の店名・施設名が読める**ため使わないことにした(`fictional-data.md` §3。「京急 あすと 蒲田」「東京正武堂」等)。**店舗の外観(青砥・立石)と、店舗が写る導線カード2枚はプレースホルダーのまま**。看板が読めない写真が見つかれば差し替える(SHIN の判断待ち)。

**取得と加工の手順(再現用)**

- 探し方:Commons の検索で `haswbstatement:P275=Q6938433`(ライセンス = CC0)を条件に付け、**CC0 だけ**に絞る。CC BY / CC BY-SA は帰属が要るので使わない
- 取り方:`action=query&titles=File:…&prop=imageinfo&iiurlwidth=…` で得た `thumburl` を取得
- 圧縮:PowerShell の `System.Drawing` で幅を落として再保存(**1枚 200KB 以下**)。**FV の背景だけは全面に敷くので幅 1920 を優先し、300KB 以下を目安にする**(現在は 1920×1280・品質70 で 237KB)
- **選ぶ時の条件(J-132 で足した)**:**実在の店名・施設名・表札・車のナンバーが読める写真は使わない**。架空の会社のページに実在の店が写ると、`fictional-data.md` §3 に触れる
- 表示:`next/image` で最適化する(`unoptimized` は付けない。SVG のプレースホルダーとは扱いが違う)

**Unsplash からの取り方(09/21 に判明)**:写真ページ(`https://unsplash.com/photos/<id>`)と `napi/photos/<id>` は **401**(ボット判定)で読めないが、**`https://unsplash.com/photos/<id>/download` は 200 で画像が返る**。原寸で落として手元で縮める(`?w=` を付けると縮小済みが返る)。**メタデータ(撮影者・ライセンス)はページから取れないので、SHIN から渡された値をこの表に書く**。
**ライセンス**:Unsplash License は**商用可・帰属不要**だが CC0 ではない(「素材をそのまま再配布して同種のサービスを作ること」を禁じている)。このサイトの使い方(自分のページの背景に置く)は許諾の範囲内。

## web/public/placeholders/(自作 SVG)

| 置き場所 | 中身 | 出所 |
|---|---|---|
| `placeholders/staff/staff-1〜8.svg` | スタッフ8名の顔(人型のシルエット・3:4) | 自作(J-053 → J-077) |
| `placeholders/offices/{aoto,tateishi}.svg` | 店舗の外観(3:2) | 自作(実装順 6)。**店舗案内とトップの「初めての方へ」で使用中**(実在の店名が読める写真を避けたため・J-132) |
| `placeholders/cases/case-1〜3.svg` | 売却事例3件(3:2) | 自作(J-107) |
| `placeholders/guides/{sell,owner}.svg` | トップの導線カード(3:2) | 自作。**sell は使用中**(オーナー様のカードだけ写真に差し替え・J-132) |
| `wp-uploads/placeholders/HR-*.svg` | 物件60件の写真(3:2・単色+物件番号+種目) | シードが生成(02 §6・`fictional-data.md` §4) |

すべて墨系5段階(`#3A3F45` 〜 `#9AA3AB`・03 §2)で、画像の中に「架空・プレースホルダー」と書いてある。

## web/public/vendor/(外から持ち込んだ JS・2026-10-13 から置いた)

**書き換えない**(直す時は出所の側で直した版を、版の番号の入った別のフォルダに置く)。読み込みは **`web/src/lib/vendor-script.ts` を必ず通す**(ページや部品が自分で `<script>` を書かない。置き場所と版はこの関数の1か所。1回だけ読み、読めない・版が違う・時間切れ〔8秒〕なら「無い」として、その部品を出さない)。lint の対象から外している(`web/eslint.config.mjs`)。

| ファイル | 使用箇所 | 版 | 出所 | 作者・ライセンス | SHA-256 | 容量 |
|---|---|---|---|---|---|---|
| `vendor/route-hero/2.0.0/route-hero.js` | 路線図ヒーロー(`components/search/RouteMap.tsx`)。トップの FV(J-167) | 2.0.0 | `_kits/route-hero-kit/route-hero.js`(SHIN が別の場所で作らせた部品・10/13 受け取り。`_kits/` はコミットしない控え) | **このプロジェクト用に作成・第三者のコードなし**(別のチャットの Claude が作った・SHIN の確認 10/14) | `a9f2bed6948af999fa6a857ecdfc4564bf19aff24caa71c4769e0a587ad5918a`(`_kits` 側と一致) | 33,717 B |
| `vendor/three/0.147.0/three.min.js` | トップの FV の路線図(`components/home/FvRouteMap.tsx` が `block-map.js` の前に読む・**768 以上の時だけ**・J-173)。J-171〜J-172 は FV の背景の街(`FvTown.tsx`)で読んでいた。後で物件詳細(間取りの 3D)でも読む予定 | 0.147.0(global build・REVISION "147") | npm の three@0.147.0 の `build/three.min.js` そのまま(`_kits/block-town-kit/vendor/three/0.147.0/` で受け取り、jsDelivr の `https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js` と SHA-256 が同じことを 10/14 に確かめた)。**npm からは入れていない** | three.js authors・**MIT**(同じフォルダの `LICENSE`) | `f34446bf875b5fb0dcd93819ffe1d9e182d46634ee855f5d904c6c4ac7cdbc95` | 607,784 B |
| `vendor/three/0.147.0/LICENSE` | three.min.js のライセンス(MIT・Copyright © 2010-2022 three.js authors) | — | 同上(jsDelivr の `three@0.147.0/LICENSE` と同じ) | — | `fbf3943930dacbf56aabb8dc5d816440bd16aa6f4cc78ddbdf12106ee1807832` | 1,081 B |
| `vendor/block-town/1.0.0/block-town.js` | **J-173 で外した**(ファイルと `FvTown.tsx` はサイトから消した。J-171〜J-172 はトップの FV の背景の街) | 1.0.0 | `_kits/block-town-kit/block-town.js`(10/14 受け取り。`_kits/` はコミットしない控え) | **このプロジェクト用に作成・第三者のコードなし**(別のチャットの Claude が作った・SHIN の確認 10/14)。three.js を使う | `9267bbf6e1caad1e53d17b85bed3091ea1e2503f0c6793603521e3d12de3205b`(`_kits` 側と一致) | 20,750 B |

| `vendor/block-map/1.0.0/block-map.js` | トップの FV の路線図(`components/home/FvRouteMap.tsx`・J-173)。768 以上の時だけ、three.js の後に読む | 1.0.0 | `_kits/block-map-kit/block-map.js`(10/15 受け取り。`_kits/` はコミットしない控え) | **このプロジェクト用に作成・第三者のコードなし**(別のチャットの Claude が作った)。three.js を使う | `01eb6077a9fa9779534556bceea30bd257d1600506c55a9fdadd9878164867a8`(`_kits` 側と一致) | 61,796 B |

**three.js を読むページ(J-171 → J-173)**:**J-173 から、トップで読むのは 768 以上の時だけ**(767 以下は 3D を描かないので読まない。後で 768 以上になった時〔画面の回転など〕にその時に読む・SHIN の条件)。**トップ(FV の背景の街)**。以前の計画(間取りビューアの組み込みの計画・チャットの中だけ)では「物件詳細のページだけで読む」としていたが、J-171 でトップでも読む形に変えた。読み込みは `loadThree()` 1か所から、**最初の表示の後**(requestIdleCallback)に行う(トップの LCP は前と比べて伸びていない・記録シート J-171)。物件詳細で読むかは、間取りビューアを組み込む時に決める。

**路線図のデータ** `web/data/route-map/schematic.json`(駅13・沿線6・件数なし)も同じ出所(`_kits/route-hero-kit/data/schematic.json`・SHA-256 `ecea454699c0b3e41c674594c423cadad26d4242bb77528120d4de11aa7e5ae3`・2,535 B・`_kits` 側と一致)。vendor ではなく web/data に置いたのは、店舗の札と「徒歩3分 / 2分」の文が会社の値で、CLAUDE.md の「会社の値は site.ts と web/data 以外に書かない」に当たるため。ビルドの時に `lib/properties.ts` の `getRouteMap()` が読み、**駅がサイトの駅(02 §8 の13駅)とずれていたらビルドを止める**(`lib/route-map.ts` の `checkStations`)。駅の並びを確かめた資料は **02 §8-5** に移した(受け取った `_kits/route-hero-kit/data/SOURCES.md` の中身)。

**ブロックの路線図の駅の位置** `web/data/route-map/block-layout.json`(J-173)は `_kits/block-map-kit/block-layout.json` をそのまま置いた(SHA-256 `d4f306fbe5ffff27a4da8f8535f700566da7932d870cab950a045e3d9b9901c4`・1,493 B・`_kits` 側と一致)。**このプロジェクト用に作成・第三者のコードなし**。駅の位置は、隣の駅までの営業キロを 0.8 乗して比率をそろえたもの(出典は README の表:railway.sidearrow.net の各路線のページ・2026 年 10 月に確認)。平面の路線図(schematic.json)とは別の配置。`getRouteMap()` が `lib/route-map.ts` の `checkLayout` で、駅と路線の id と、**路線ごとの駅の並び順**が schematic.json と同じかを確かめ、ずれていたらビルドを止める(SHIN の条件)。

## 画像生成ツール

**使っていない**(記録シート §4 のガバナンス「画像生成ツールと商用利用可否:不使用」)。
