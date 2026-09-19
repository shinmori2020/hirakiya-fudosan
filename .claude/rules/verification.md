---
paths:
  - "web/**"
  - "docs/screenshots/**"
---

# 見た目の確認と実測のルール(スクショ・Playwright・測り方)

判断の記録は「こう見える」ではなく **測った数字** で残す。ここに書く手順は 2026-09-12〜13 の J-068〜J-076・F-007〜F-009 で実際に使ったもの。

## 1. 確認用サーバーは 3001 で静的ビルド

```bash
cd web
DATA_SOURCE=static pnpm build            # 変更を反映してから撮る(dev の HMR では本番と差が出る)
DATA_SOURCE=static pnpm start -p 3001 &  # 3000 は SHIN の dev サーバー。起動も停止もしない(F-006)
# 起動待ちは curl のループで。sleep で決め打ちしない
for i in $(seq 1 40); do curl -s -o /dev/null -w '%{http_code}' http://localhost:3001/properties/HR-R-0001 | grep -q 200 && break; sleep 1; done
```

**`.env.local` を変えたら再起動ではなく再ビルドしてから 3001 を立てる**(静的ページの環境変数はビルド時に埋まる。F-011:Turnstile の site key が空のまま焼かれ、送信が通らなかった)。

**確認用の送信は実際にメールが飛ぶ**。`.env.local` に本物のキーが入っている間、3001 でフォームを完了画面まで進めると `CONTACT_EMAIL_TO` 宛に本物のメールが届く(09/17 の測定で複数通)。**送信を抑止するフラグは作らない**(本番に残る危険があるため。F-011 と同じ型)。通し確認の回数を必要な分だけにし、繰り返す時は確認画面で止める。

**pnpm・git などのコマンドは実行ディレクトリを確認してから実行する。失敗したコマンドの再試行では特に確認する**(F-010:再試行をルートで実行し、ルートに package.json を作った)。

終わったら **3001 の LISTENING だけを落とす**。ポート番号を確認せずに `taskkill /IM node.exe` のような一括停止をしない。

```bash
for pid in $(netstat -ano | grep ':3001 ' | grep LISTENING | awk '{print $5}' | sort -u); do taskkill //PID $pid //T //F; done
```

## 2. Playwright の使い方(この環境の3点)

1. **読み込み方**:`web` に playwright は入っていない。隣のリポジトリから `playwright-core` を読む。
   ```js
   import { createRequire } from 'node:module';
   const require = createRequire('C:/Users/kiyos/Desktop/shin-portfolio-2026/package.json');
   const { chromium } = require('playwright-core');
   ```
2. **待ち方**:`waitUntil: 'load'` を使う。`networkidle` は本番サーバーでは返らない(タイムアウトする)。読み込み後に 300〜600ms の `waitForTimeout` を足すと、地図(Leaflet)やフォントの描画が落ち着く。地図は 1500ms 前後見る。
3. **セレクタ**:Tailwind のクラスに含まれる `:` は CSS セレクタでエスケープする(`div.lg\\:block`)。JS の文字列では `\\:` と2回重ねる。**ヒアドキュメント越しにスクリプトを書くとバックスラッシュが落ちる**ので、Playwright のスクリプトは Write ツールでファイルに書く(§4 も参照)。`:visible` で見えている方だけを取るのも有効(`button[aria-label$="を拡大する"]:visible`)。
4. **同じ文言が画面に複数ある前提で書く**。`getByRole('link', { name: '物件を探す' })` は、右端の縦タブ・スマホ固定 CTA・パンくずなど**測りたい場所以外**にも当たる(`.first()` `.last()` で逃げると別物を測ってしまう。09/16、完了画面の測定で縦タブの座標を1回測った)。**測る対象を含む箱を先に取ってから、その中で引く**(`page.locator('div.grid:has(> a[href="/properties"]):has(> a[href="/"])')` のように `href` で特定する)。Tab の到達を数える時も、`document.activeElement` が**その箱の中にあるか**を見る。
5. **フォームの完了画面まで自動で進める時は、待ち時間を決め打ちしない**。入力 → 「確認する」→ **送信ボタンが `enabled` になるまでポーリング**(Turnstile のトークンは確認画面が出た1〜2秒後に入る・J-106)→ 「送信する」→ 完了の `h1` を待つ。`waitForTimeout` を固定値で置くと、通る日と通らない日が出る。

## 3. 測り方(判断の裏付けに使う5種類)

`web/scripts/measure.mjs` にまとめてある。`node scripts/measure.mjs <パス> [幅...]` で動く。

```bash
cd web
node scripts/measure.mjs /properties/HR-R-0001 1280 768 390
```

出るもの(J-068〜J-076 で使った実測の型):

| 種類 | 何を見るか | 使った判断 |
|---|---|---|
| ラベル幅と値の左端 | `dt` の幅と `dd` の左端。全行が揃っているか | J-068(6.5em で揃う)・J-058(日付とタグの固定幅) |
| 下端の座標 | 右カラムの中身の下端とギャラリーの下端。`getBoundingClientRect().bottom + scrollY` | J-050(揃える)・J-068(55px 下がる)・J-074(CTA がファーストビュー内か) |
| 折り返し行数 | 要素の高さ ÷ `line-height` を丸める。全60件を回して0件を確認する | J-073(駅徒歩+町名が1行)・J-075(ボタンの文言) |
| アイコンと文字の中心のずれ | `svg` の中心と、`Range.selectNodeContents` で測った文字の矩形の中心の差 | J-071・J-074(baseline と center の使い分け) |
| 当たり判定 | `document.elementFromPoint(x, y)` で最前面の要素を取る。重なりの検証に使う | F-007(絵の外か)・F-008(選択ハイライト)・F-009(ヘッダーと地図) |

数値は記録シートの「証拠」欄に、測った条件(幅・物件番号)と一緒に書く。

**表示を整理する判断(項目の移動・統合・削除)の前後では、`node scripts/check-fields.mjs` を必ず実行する**(J-082。データにあるのに画面へ出ていない項目を検出する。J-070 の仲介手数料はこれが無くて見落とした)。
**「要確認」が出た時は、まず画面を見る。期待値を直すのは、画面で正しく出ていることを確認した後**(スクリプトを通すために期待値を緩めると、検出そのものが効かなくなる)。
**一覧・入口ページを足した / 変えた時は `node scripts/check-entries.mjs` を実行する**(3001 を起動した状態で。入口の件数と押した先の一覧の件数の一致・入口から出ていくリンクの HTTP・条件を変えた後の URL に固定キーが入らないこと の3点。ページが増えたらスクリプト冒頭の `ENTRIES` に足す)。
**適用範囲**:`check-fields.mjs` は **JSON のフィールドを起点に画面を検査する**。**計算で出している値(J-094 の売買の仲介手数料など)は JSON に無いため検査対象外**。**逆向きの検査(画面にあるがデータに無い値)は現状ない**ので、計算で出す表示を足した時は、その場で実物を確認して記録に残す。

## 4. スクショ

- 置き場所と命名は `.claude/rules/record-keeping.md` §3(`docs/screenshots/J-NNN-before-1280.png` など)。
- 部分を撮る:`locator.screenshot()`。セクション単位は `section:has(h2:text("物件データ"))`、右カラムは `locator('h1').locator('..')`。
- 全体を撮る:`page.screenshot({ fullPage: true })`。ページが長いと縮小されて読めないので、報告に使うなら部分撮影を優先する。
- スマホは `viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2`。
- 撮影スクリプトは scratchpad に置く(リポジトリには入れない)。再現が必要な測定は §3 の `measure.mjs` を使う。
- **`shot-page.mjs` は接尾辞を引数で渡す。`-before-` を上書きしない**(09/19、after を撮るつもりで before を16枚上書きした。git から戻したが、コミット前だと復元できない)。

## 5. 実データで確認する物件番号

| 何を見たい時 | 物件番号 |
|---|---|
| 賃貸の標準(写真5枚+間取り図) | HR-R-0001 |
| 売買マンション(値下げあり) | HR-S-0003 |
| 戸建(土地・建物面積あり) | HR-S-0009 |
| 土地(築年・階数・向きが無い) | HR-S-0017 |
| 写真0枚 | HR-R-0004 / HR-R-0028 / HR-S-0005 |
| 成約済み | HR-R-0025 |
| 設備が最多(10個) | HR-R-0036 |
| 長い駅名・町名(折り返しの確認) | お花茶屋・堀切菖蒲園の物件 |
