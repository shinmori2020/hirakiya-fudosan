# 素材の出所(写真・画像)

このサイトの画像は2種類ある。**どちらも仮のもの**で、公開前に差し替えるかは実装順 9 で判断する(J-131)。

1. **プレースホルダー(自作 SVG)** — 物件60件・スタッフ8名・一部の外観。`web/public/placeholders/` と `web/public/wp-uploads/placeholders/`
2. **フリー素材の実写真** — **場所を示すものだけ**(街並み・店舗外観・建物の外観)。`web/public/photos/`

**人(スタッフ)と物件60件は SVG のプレースホルダーのまま**(実在の人・実在の物件に見える度合いが上がるため・`.claude/rules/fictional-data.md` §4)。

---

## web/public/photos/(フリー素材・2026-09-20 取得)

出所はすべて **Wikimedia Commons の CC0**(パブリックドメイン相当・**帰属不要**・商用可)。
写っているのは**実在の場所**で、このサイトの架空の店舗・物件とは関係がない。**架空サイトである旨はページ側の注記で示す**(J-012)。

| ファイル | 使用箇所 | 元の題名 | 撮影者 | ライセンス | 出所 | 現在の寸法 / 容量 |
|---|---|---|---|---|---|---|
| `fv-street.jpg` | トップ FV(街並み・商店街) | Keikyu Kamata Shopping Street Asuto.jpg | Drivephotographer | CC0 | [Commons](https://commons.wikimedia.org/wiki/File:Keikyu_Kamata_Shopping_Street_Asuto.jpg) | 960×540 / 121KB |
| `guide-shop.jpg` | トップ 導線カード「初めての方へ」(店舗の外観) | Bicycles shop in Ebisu.jpg | Syced | CC0 | [Commons](https://commons.wikimedia.org/wiki/File:Bicycles_shop_in_Ebisu.jpg) | 800×600 / 76KB |
| `guide-house.jpg` | トップ 導線カード「売却をお考えの方へ」(戸建の街並み) | Residential district in Tokyo (Unsplash).jpg | Fábio Hanashiro | CC0 | [Commons](https://commons.wikimedia.org/wiki/File:Residential_district_in_Tokyo_(Unsplash).jpg) | 800×533 / 155KB |
| `guide-apartment.jpg` | トップ 導線カード「オーナー様へ」(賃貸マンションの外観) | Residential building in Ebisu.jpg | Syced | CC0 | [Commons](https://commons.wikimedia.org/wiki/File:Residential_building_in_Ebisu.jpg) | 800×602 / 87KB |
| `office-aoto.jpg` | 店舗案内 青砥本店の外観 | Kendo shop in Gotanda.jpg | Syced | CC0 | [Commons](https://commons.wikimedia.org/wiki/File:Kendo_shop_in_Gotanda.jpg) | 900×678 / 146KB |
| `office-tateishi.jpg` | 店舗案内 立石支店の外観 | Yakitori shop in Setagaya.jpg | Syced | CC0 | [Commons](https://commons.wikimedia.org/wiki/File:Yakitori_shop_in_Setagaya.jpg) | 900×678 / 137KB |

**取得と加工の手順(再現用)**

- 探し方:Commons の検索で `haswbstatement:P275=Q6938433`(ライセンス = CC0)を条件に付け、**CC0 だけ**に絞る。CC BY / CC BY-SA は帰属が要るので使わない
- 取り方:`action=query&titles=File:…&prop=imageinfo&iiurlwidth=…` で得た `thumburl` を取得
- 圧縮:PowerShell の `System.Drawing` で幅を 800〜960 に落とし、JPEG 品質 72 で再保存(**1枚 200KB 以下**)
- 表示:`next/image` で最適化する(`unoptimized` は付けない。SVG のプレースホルダーとは扱いが違う)

**Unsplash を使わなかった理由**:検索を数回叩いた時点でボット判定(`Authorization required`)に入り、写真ページのメタデータを確認できなくなった。出所を確認できない素材は置かない。

## web/public/placeholders/(自作 SVG)

| 置き場所 | 中身 | 出所 |
|---|---|---|
| `placeholders/staff/staff-1〜8.svg` | スタッフ8名の顔(人型のシルエット・3:4) | 自作(J-053 → J-077) |
| `placeholders/offices/{aoto,tateishi}.svg` | 店舗の外観(3:2) | 自作(実装順 6)。**写真に差し替え済みだが、SVG は残す** |
| `placeholders/cases/case-1〜3.svg` | 売却事例3件(3:2) | 自作(J-107) |
| `placeholders/guides/{sell,owner}.svg` | トップの導線カード(3:2) | 自作。**写真に差し替え済みだが、SVG は残す** |
| `wp-uploads/placeholders/HR-*.svg` | 物件60件の写真(3:2・単色+物件番号+種目) | シードが生成(02 §6・`fictional-data.md` §4) |

すべて墨系5段階(`#3A3F45` 〜 `#9AA3AB`・03 §2)で、画像の中に「架空・プレースホルダー」と書いてある。

## 画像生成ツール

**使っていない**(記録シート §4 のガバナンス「画像生成ツールと商用利用可否:不使用」)。
