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
| `fv-town.jpg` | トップ FV の背景(**明るいリビング**。J-150 で生活の場面として範囲に入れた) | EVjqpcn79AM | Spacejoy | Unsplash License | [Unsplash](https://unsplash.com/photos/EVjqpcn79AM) | 1920×1080 / 197KB |
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

## 画像生成ツール

**使っていない**(記録シート §4 のガバナンス「画像生成ツールと商用利用可否:不使用」)。
