<?php
/**
 * HR Core — 物件シーダー(docs/02-物件データ設計.md §6)
 *
 * 賃貸40 / 売買20 = 60件を WordPress 経由で投入する。
 *  - 乱数は固定シード。再実行しても同じ60件(記録の再現性)
 *  - 物件番号(post_name)で冪等。既存はスキップ
 *  - 相関付き乱数:間取り×面積 / 築年×設備 / 駅徒歩×家賃
 *  - 意図的な欠損:写真0枚 3件 / 成約済み 8% / 商談中 12% / 値下げ 賃貸5・売買3
 *  - 架空表記:番地 0-0-0 / 物件名 {町}{汎用語}0-{n} / 地名は 13 町の外に出ない
 *
 * 実行(リポジトリのルートで。WP-CLI 不要:コンテナ内の php で wp-load.php を直接読む)
 *   docker compose exec -u www-data wordpress php wp-content/plugins/hr-core/scripts/seed-properties.php
 * 全消しして入れ直す:
 *   docker compose exec -u www-data wordpress php wp-content/plugins/hr-core/scripts/seed-properties.php --reset
 * (-u www-data:生成する SVG の所有者を Apache と揃えるため)
 */

if ( ! defined( 'ABSPATH' ) ) {
	// /var/www/html/wp-content/plugins/hr-core/scripts/ → 5 つ上が WP ルート(Nordic Works と同じ方式)
	$wp_load = dirname( __FILE__, 5 ) . '/wp-load.php';
	if ( ! file_exists( $wp_load ) ) {
		die( "wp-load.php が見つかりません: $wp_load\nコンテナ内で実行してください: docker compose exec -u www-data wordpress php " . __FILE__ . "\n" );
	}
	$_SERVER['HTTP_HOST'] = $_SERVER['HTTP_HOST'] ?? 'localhost';
	require_once $wp_load;
}
if ( ! function_exists( 'update_field' ) ) {
	die( "ACF が有効化されていません。プラグイン > 新規追加 で Advanced Custom Fields(無料版)を入れて有効化してください。\n" );
}
if ( ! post_type_exists( 'property' ) ) {
	die( "投稿タイプ property が未登録です。HR Core プラグインを有効化してください。\n" );
}

mt_srand( 20260907 ); // 固定シード。変えると60件すべてが変わる(変更は J-ID)

function hr_log( $m ) {
	if ( defined( 'WP_CLI' ) && WP_CLI ) { WP_CLI::log( $m ); } else { echo $m . "\n"; }
}
function hr_rand( $min, $max ) { return mt_rand( $min, $max ); }
function hr_pick( array $a ) { return $a[ mt_rand( 0, count( $a ) - 1 ) ]; }
function hr_chance( $pct ) { return mt_rand( 1, 100 ) <= $pct; }

/* =========================================================================
 * 1. マスタ(docs/02 §2・§8。ここに無い地名・沿線・駅は使わない)
 * ====================================================================== */
$WARDS = array( 'katsushika' => '葛飾区', 'edogawa' => '江戸川区', 'adachi' => '足立区', 'sumida' => '墨田区' );

// slug => [ 町名, 区slug, lat, lng ]
$AREAS = array(
	'aoto'      => array( '青戸', 'katsushika', 35.7457, 139.8547 ),
	'tateishi'  => array( '立石', 'katsushika', 35.7414, 139.8487 ),
	'ohanajaya' => array( 'お花茶屋', 'katsushika', 35.7517, 139.8480 ),
	'kameari'   => array( '亀有', 'katsushika', 35.7601, 139.8483 ),
	'shinkoiwa' => array( '新小岩', 'katsushika', 35.7167, 139.8586 ),
	'kanamachi' => array( '金町', 'katsushika', 35.7666, 139.8703 ),
	'horikiri'  => array( '堀切', 'katsushika', 35.7439, 139.8305 ),
	'koiwa'     => array( '小岩', 'edogawa', 35.7381, 139.8817 ),
	'hirai'     => array( '平井', 'edogawa', 35.7059, 139.8425 ),
	'ayase'     => array( '綾瀬', 'adachi', 35.7622, 139.8247 ),
	'kitasenju' => array( '北千住', 'adachi', 35.7494, 139.8050 ),
	'oshiage'   => array( '押上', 'sumida', 35.7102, 139.8132 ),
	'hikifune'  => array( '曳舟', 'sumida', 35.7182, 139.8153 ),
);

// slug => 沿線名(6本。都営新宿線は入れない:02 §8-2 訂正)
$LINES = array(
	'keisei-main'      => '京成本線',
	'keisei-oshiage'   => '京成押上線',
	'keisei-kanamachi' => '京成金町線',
	'jr-joban'         => 'JR常磐線',
	'jr-sobu'          => 'JR総武線',
	'tobu-skytree'     => '東武スカイツリーライン',
);

// slug => [ 駅名, 町slug, [沿線slug] ](02 §8-2)
$STATIONS = array(
	'aoto'             => array( '青砥', 'aoto', array( 'keisei-main', 'keisei-oshiage' ) ),
	'keisei-tateishi'  => array( '京成立石', 'tateishi', array( 'keisei-oshiage' ) ),
	'ohanajaya'        => array( 'お花茶屋', 'ohanajaya', array( 'keisei-main' ) ),
	'kameari'          => array( '亀有', 'kameari', array( 'jr-joban' ) ),
	'shinkoiwa'        => array( '新小岩', 'shinkoiwa', array( 'jr-sobu' ) ),
	'kanamachi'        => array( '金町', 'kanamachi', array( 'jr-joban', 'keisei-kanamachi' ) ),
	'horikiri-shobuen' => array( '堀切菖蒲園', 'horikiri', array( 'keisei-main' ) ),
	'keisei-koiwa'     => array( '京成小岩', 'koiwa', array( 'keisei-main' ) ),
	'hirai'            => array( '平井', 'hirai', array( 'jr-sobu' ) ),
	'ayase'            => array( '綾瀬', 'ayase', array( 'jr-joban' ) ),
	'kitasenju'        => array( '北千住', 'kitasenju', array( 'jr-joban', 'tobu-skytree' ) ),
	'oshiage'          => array( '押上', 'oshiage', array( 'keisei-oshiage', 'tobu-skytree' ) ),
	'hikifune'         => array( '曳舟', 'hikifune', array( 'tobu-skytree' ) ),
);
// 町 → 2駅目の候補(近接する町の駅。無ければ1駅のみ)
$SECOND_STATION = array(
	'aoto' => 'ohanajaya', 'tateishi' => 'aoto', 'ohanajaya' => 'aoto', 'kameari' => 'ayase',
	'shinkoiwa' => 'hirai', 'kanamachi' => 'kameari', 'horikiri' => 'ohanajaya', 'koiwa' => 'shinkoiwa',
	'hirai' => 'shinkoiwa', 'ayase' => 'kitasenju', 'kitasenju' => 'ayase', 'oshiage' => 'hikifune', 'hikifune' => 'oshiage',
);

$FEATURES = array(
	'pet-ok' => 'ペット可', 'autolock' => 'オートロック', 'parking' => '駐車場', 'delivery-box' => '宅配ボックス',
	'separate-bath' => 'バス・トイレ別', 'washstand' => '独立洗面', 'reheating' => '追い焚き', 'aircon' => 'エアコン',
	'south-facing' => '南向き', 'corner-room' => '角部屋', 'upper-floor' => '2階以上', 'zero-deposit' => '敷金礼金ゼロ',
	'move-in-now' => '即入居可', 'instrument-ok' => '楽器可', 'office-ok' => '事務所可',
);
$COLLECTIONS = array(
	'central-30min' => '都心まで30分以内', 'zero-deposit' => '敷礼ゼロ', 'pet-ok' => 'ペット可',
	'house-rental' => '戸建賃貸', 'near-station' => '駅徒歩5分', 'new-built' => '新築・築浅',
);
// 「都心まで30分以内」特集の対象駅(初案:4駅に絞る。全駅を含めると 56/60 件が該当し特集として機能しない)
$CENTRAL_STATIONS = array( 'oshiage', 'kitasenju', 'hikifune', 'ayase' );

$TYPES  = array( 'rental' => '賃貸', 'sale' => '売買' );
$KINDS  = array( 'mansion' => 'マンション', 'apartment' => 'アパート', 'house_rental' => '戸建賃貸', 'house' => '戸建', 'land' => '土地' );
$STATUS = array( 'open' => '公開中', 'negotiating' => '商談中', 'sold' => '成約済み' );

$STAFF     = array( '架空 太郎', '見本 花子', '仮名 一郎', '架空 次郎', '見本 三郎', '仮名 美咲', '架空 恵', '見本 健' );
$BUILDINGS = array( 'ハイツ', 'コーポ', 'レジデンス', 'メゾン', 'テラス', 'ハウス' );

// 担当者コメント:冒頭(立地)/ 中間(設備・間取り)/ 末尾(呼びかけ)各4(02 §6)
$COMMENT_HEAD = array(
	'%s駅から徒歩%d分、平坦な道のりで通勤にも便利な立地です。',
	'%s駅が最寄り。周辺にはスーパーやコンビニがそろい、日常の買い物に困りません。',
	'%s駅まで徒歩%d分。静かな住宅街の一角にあります。',
	'%s駅利用可。都心へのアクセスと落ち着いた住環境を両立できるエリアです。',
);
$COMMENT_MID = array(
	'%sの間取りで、収納も確保されています。',
	'%s・%s㎡。室内は明るく、家具の配置もしやすい形です。',
	'%sタイプ。設備面では%sが備わっています。',
	'%sのお部屋です。%sで、暮らしやすさを重視した造りになっています。',
);
$COMMENT_TAIL = array(
	'内見のご希望はお気軽にお問い合わせください。',
	'現地でのご案内も承ります。まずはお問い合わせを。',
	'空室状況は日々変わります。お早めにご相談ください。',
	'ご不明点は担当までご連絡ください。',
);
$COMMENT_TAIL_SALE = array(
	'資料請求・現地見学のご希望はお気軽にお問い合わせください。',
	'住宅ローンのご相談も承ります。まずはお問い合わせを。',
	'価格のご相談は担当までご連絡ください。',
	'周辺の成約事例もご案内できます。お気軽にどうぞ。',
);

/* =========================================================================
 * 2. --reset(既存の物件とプレースホルダーを削除)
 * ====================================================================== */
$reset = in_array( '--reset', $argv ?? array(), true );
if ( $reset ) {
	$ids = get_posts( array( 'post_type' => 'property', 'post_status' => 'any', 'numberposts' => -1, 'fields' => 'ids' ) );
	foreach ( $ids as $id ) { wp_delete_post( $id, true ); }
	hr_log( '--reset: 物件 ' . count( $ids ) . ' 件を削除' );
	// プレースホルダー SVG も消す(生成は「存在すればスキップ」なので、消さないと色の変更が反映されない)
	$ph_reset_dir = trailingslashit( wp_upload_dir()['basedir'] ) . 'placeholders';
	$ph_files     = is_dir( $ph_reset_dir ) ? glob( $ph_reset_dir . '/*.svg' ) : array();
	foreach ( $ph_files as $f ) { unlink( $f ); }
	hr_log( '--reset: プレースホルダー ' . count( $ph_files ) . ' 件を削除' );
}

/* =========================================================================
 * 3. タクソノミーの用語を投入(冪等)
 * ====================================================================== */
function hr_term( $tax, $slug, $name, $parent = 0, array $meta = array() ) {
	$t = get_term_by( 'slug', $slug, $tax );
	if ( ! $t ) {
		$r = wp_insert_term( $name, $tax, array( 'slug' => $slug, 'parent' => $parent ) );
		if ( is_wp_error( $r ) ) { hr_log( "  ! term [$tax] $slug: " . $r->get_error_message() ); return 0; }
		$id = $r['term_id'];
		hr_log( "  + term [$tax] $slug ($name)" );
	} else {
		$id = $t->term_id;
	}
	foreach ( $meta as $k => $v ) { update_term_meta( $id, $k, $v ); }
	return $id;
}

hr_log( '== タクソノミー' );
foreach ( $TYPES as $s => $n )  { hr_term( 'property_type', $s, $n ); }
foreach ( $KINDS as $s => $n )  { hr_term( 'property_kind', $s, $n ); }
foreach ( $STATUS as $s => $n ) { hr_term( 'status', $s, $n ); }
foreach ( $LINES as $s => $n )  { hr_term( 'line', $s, $n ); }
foreach ( $FEATURES as $s => $n )    { hr_term( 'feature_tag', $s, $n ); }
foreach ( $COLLECTIONS as $s => $n ) { hr_term( 'collection', $s, $n ); }
$ward_ids = array();
foreach ( $WARDS as $s => $n ) { $ward_ids[ $s ] = hr_term( 'area', $s, $n ); }
foreach ( $AREAS as $s => [ $n, $ward, $lat, $lng ] ) {
	hr_term( 'area', $s, $n, $ward_ids[ $ward ], array( 'lat' => $lat, 'lng' => $lng ) );
}
foreach ( $STATIONS as $s => [ $n, $area, $lines ] ) {
	hr_term( 'station', $s, $n, 0, array( 'lines' => implode( ',', $lines ), 'area_slug' => $area ) );
}

/* =========================================================================
 * 4. プレースホルダー画像(SVG)を uploads/placeholders/ に生成
 *    写真ではなく、単色背景+物件番号+種目名。next/image は使わない前提の素の <img>
 * ====================================================================== */
$upload = wp_upload_dir();
$ph_dir = trailingslashit( $upload['basedir'] ) . 'placeholders';
if ( ! is_dir( $ph_dir ) ) { wp_mkdir_p( $ph_dir ); }
$PH_COLORS = array( '#3A3F45', '#535A61', '#6C737B', '#858D95', '#9AA3AB' ); // 墨系5段階(03 §2・J-032)

function hr_placeholder_svg( $path, $label1, $label2, $color, $w = 1200, $h = 800 ) {
	if ( file_exists( $path ) ) { return; }
	$svg = sprintf(
		'<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">' .
		'<rect width="100%%" height="100%%" fill="%s"/>' .
		'<text x="50%%" y="46%%" fill="#fff" font-family="sans-serif" font-size="64" text-anchor="middle">%s</text>' .
		'<text x="50%%" y="58%%" fill="#fff" font-family="sans-serif" font-size="36" text-anchor="middle" opacity=".85">%s</text>' .
		'<text x="50%%" y="92%%" fill="#fff" font-family="sans-serif" font-size="24" text-anchor="middle" opacity=".6">架空物件・プレースホルダー</text>' .
		'</svg>',
		$w, $h, $w, $h, $color, esc_html( $label1 ), esc_html( $label2 )
	);
	file_put_contents( $path, $svg );
}
// 間取り図(間取りごとの汎用図形 10 種)
$LAYOUTS = array( '1R', '1K', '1DK', '1LDK', '2K', '2DK', '2LDK', '3DK', '3LDK', '4LDK' );
foreach ( $LAYOUTS as $ly ) {
	$rooms = (int) $ly[0];
	$cells = '';
	for ( $i = 0; $i < $rooms + 1; $i++ ) {
		$x = 60 + ( $i % 3 ) * 360; $y = 60 + intdiv( $i, 3 ) * 300;
		$cells .= sprintf( '<rect x="%d" y="%d" width="320" height="260" fill="#fff" stroke="#556" stroke-width="6"/>', $x, $y );
		$cells .= sprintf( '<text x="%d" y="%d" font-family="sans-serif" font-size="40" fill="#556">%s</text>', $x + 20, $y + 60, $i === $rooms ? 'LDK/K' : '洋室' );
	}
	$plan = sprintf( '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><rect width="100%%" height="100%%" fill="#EEF1F3"/>%s<text x="600" y="760" font-family="sans-serif" font-size="32" fill="#556" text-anchor="middle">%s 汎用間取り図(架空)</text></svg>', $cells, $ly );
	$p = $ph_dir . '/plan-' . strtolower( $ly ) . '.svg';
	if ( ! file_exists( $p ) ) { file_put_contents( $p, $plan ); }
}
$ph_url_base = '/wp-content/uploads/placeholders/';

/* =========================================================================
 * 5. 配分表(02 §6)を先に決めてから 1 件ずつ生成
 * ====================================================================== */
// 種目:賃貸 M20 A15 H5 / 売買 M8 H8 L4
$plan = array();
foreach ( array( 'mansion' => 20, 'apartment' => 15, 'house_rental' => 5 ) as $k => $n ) { for ( $i = 0; $i < $n; $i++ ) { $plan[] = array( 'rental', $k ); } }
foreach ( array( 'mansion' => 8, 'house' => 8, 'land' => 4 ) as $k => $n )               { for ( $i = 0; $i < $n; $i++ ) { $plan[] = array( 'sale', $k ); } }

// エリア:葛飾30 / 江戸川12 / 足立10 / 墨田8 → 町へ均等に割る
$area_pool = array();
$by_ward   = array( 'katsushika' => 30, 'edogawa' => 12, 'adachi' => 10, 'sumida' => 8 );
foreach ( $by_ward as $ward => $n ) {
	$towns = array_keys( array_filter( $AREAS, fn( $a ) => $a[1] === $ward ) );
	for ( $i = 0; $i < $n; $i++ ) { $area_pool[] = $towns[ $i % count( $towns ) ]; }
}
// 決定的にシャッフル
function hr_shuffle( array $a ) { for ( $i = count( $a ) - 1; $i > 0; $i-- ) { $j = mt_rand( 0, $i ); [ $a[ $i ], $a[ $j ] ] = array( $a[ $j ], $a[ $i ] ); } return $a; }
$area_pool = hr_shuffle( $area_pool );

// 駅徒歩:5分以内を25%(15件)
$walk_pool = array();
for ( $i = 0; $i < 60; $i++ ) { $walk_pool[] = $i < 15 ? hr_rand( 1, 5 ) : hr_rand( 6, 20 ); }
$walk_pool = hr_shuffle( $walk_pool );

// ステータス:open 48 / negotiating 7 / sold 5(80/12/8%)
$status_pool = array_merge( array_fill( 0, 48, 'open' ), array_fill( 0, 7, 'negotiating' ), array_fill( 0, 5, 'sold' ) );
$status_pool = hr_shuffle( $status_pool );

// 写真0枚 3件・値下げ 賃貸5 売買3 の対象インデックス
$no_photo   = array( 3, 27, 44 );
$discount_r = array( 1, 9, 17, 25, 33 );
$discount_s = array( 42, 50, 57 );

// 築年:1990年代・2000年代を厚く(02 §6)
function hr_built_year() {
	$r = mt_rand( 1, 100 );
	if ( $r <= 10 ) { return mt_rand( 1975, 1989 ); }
	if ( $r <= 40 ) { return mt_rand( 1990, 1999 ); }
	if ( $r <= 70 ) { return mt_rand( 2000, 2009 ); }
	if ( $r <= 90 ) { return mt_rand( 2010, 2019 ); }
	return mt_rand( 2020, 2026 );
}
// 間取り → 面積(相関)
function hr_layout_for( $type, $kind ) {
	if ( 'land' === $kind ) { return ''; }
	if ( in_array( $kind, array( 'house', 'house_rental' ), true ) ) { return hr_pick( array( '2LDK', '3DK', '3LDK', '3LDK', '4LDK' ) ); }
	if ( 'apartment' === $kind ) { return hr_pick( array( '1R', '1K', '1K', '1DK', '1LDK', '2K', '2DK' ) ); }
	return 'rental' === $type ? hr_pick( array( '1K', '1DK', '1LDK', '1LDK', '2LDK', '2DK', '3LDK' ) ) : hr_pick( array( '2LDK', '3LDK', '3LDK', '4LDK', '1LDK' ) );
}
function hr_sqm_for( $layout ) {
	if ( in_array( $layout, array( '1R', '1K' ), true ) ) { return hr_rand( 18, 30 ); }
	if ( in_array( $layout, array( '1DK', '1LDK' ), true ) ) { return hr_rand( 28, 45 ); }
	if ( in_array( $layout, array( '2K', '2DK', '2LDK' ), true ) ) { return hr_rand( 40, 65 ); }
	return hr_rand( 60, 95 );
}
// 家賃:間取りの範囲 × 駅徒歩・築年で ±10%
function hr_rent_for( $layout, $walk, $year ) {
	if ( in_array( $layout, array( '1R', '1K' ), true ) ) { $base = hr_rand( 55000, 85000 ); }
	elseif ( in_array( $layout, array( '1DK', '1LDK' ), true ) ) { $base = hr_rand( 70000, 120000 ); }
	elseif ( in_array( $layout, array( '2K', '2DK', '2LDK' ), true ) ) { $base = hr_rand( 90000, 160000 ); }
	else { $base = hr_rand( 120000, 220000 ); }
	$adj = 1.0;
	if ( $walk <= 5 ) { $adj += 0.06; } elseif ( $walk >= 15 ) { $adj -= 0.06; }
	if ( $year >= 2015 ) { $adj += 0.06; } elseif ( $year < 1990 ) { $adj -= 0.08; }
	return (int) ( round( $base * $adj / 1000 ) * 1000 );
}
function hr_price_for( $kind ) {
	if ( 'mansion' === $kind ) { return hr_rand( 250, 650 ) * 10; }
	if ( 'house' === $kind )   { return hr_rand( 300, 700 ) * 10; }
	return hr_rand( 200, 500 ) * 10; // land
}
// 設備:築年と相関
function hr_features_for( $type, $kind, $year, $layout, $walk ) {
	$f = array();
	if ( 'land' === $kind ) { return $f; }
	$f[] = 'aircon';
	if ( hr_chance( $year >= 2010 ? 85 : ( $year >= 2000 ? 55 : 20 ) ) ) { $f[] = 'autolock'; }
	if ( hr_chance( $year >= 2010 ? 70 : ( $year >= 2000 ? 35 : 10 ) ) ) { $f[] = 'delivery-box'; }
	if ( hr_chance( $year >= 1995 ? 80 : 45 ) ) { $f[] = 'separate-bath'; }
	if ( hr_chance( $year >= 2000 ? 65 : 30 ) ) { $f[] = 'washstand'; }
	if ( hr_chance( $year >= 2005 ? 55 : 25 ) ) { $f[] = 'reheating'; }
	if ( hr_chance( 40 ) ) { $f[] = 'south-facing'; }
	if ( hr_chance( 30 ) ) { $f[] = 'corner-room'; }
	if ( 'apartment' === $kind || 'mansion' === $kind ) { if ( hr_chance( 65 ) ) { $f[] = 'upper-floor'; } }
	if ( in_array( $kind, array( 'house', 'house_rental' ), true ) || hr_chance( 25 ) ) { $f[] = 'parking'; }
	if ( 'rental' === $type ) {
		if ( hr_chance( 15 ) ) { $f[] = 'pet-ok'; }
		if ( hr_chance( 18 ) ) { $f[] = 'zero-deposit'; }
		if ( hr_chance( 35 ) ) { $f[] = 'move-in-now'; }
		if ( hr_chance( 8 ) )  { $f[] = 'instrument-ok'; }
		if ( hr_chance( 10 ) ) { $f[] = 'office-ok'; }
	}
	return array_values( array_unique( $f ) );
}
// 特集:条件に合う物件へ自動付与(編集判断の代行。02 §2 は手動付与だが、60件を手で付ける工程は記録にならない)
function hr_collections_for( $type, $kind, $features, $walk, $year, array $stations, array $central ) {
	$c = array();
	if ( 'rental' === $type ) {
		if ( in_array( 'zero-deposit', $features, true ) ) { $c[] = 'zero-deposit'; }
		if ( in_array( 'pet-ok', $features, true ) ) { $c[] = 'pet-ok'; }
		if ( 'house_rental' === $kind ) { $c[] = 'house-rental'; }
	}
	if ( $walk <= 5 ) { $c[] = 'near-station'; }
	if ( $year >= 2021 ) { $c[] = 'new-built'; }
	if ( array_intersect( $stations, $central ) ) { $c[] = 'central-30min'; }
	return $c;
}

/* =========================================================================
 * 6. 生成と投入
 * ====================================================================== */
hr_log( '== 物件 60 件' );
$today  = new DateTimeImmutable( 'today' );
$r_no = 0; $s_no = 0; $created = 0; $skipped = 0;

foreach ( $plan as $i => [ $type, $kind ] ) {
	$no   = 'rental' === $type ? sprintf( 'HR-R-%04d', ++$r_no ) : sprintf( 'HR-S-%04d', ++$s_no );
	$slug = strtolower( $no );

	// 乱数の消費順を固定するため、既存判定より先に全値を生成する
	$area_slug  = $area_pool[ $i ];
	[ $town, $ward, $lat0, $lng0 ] = $AREAS[ $area_slug ];
	$st1        = array_search( $area_slug, array_map( fn( $s ) => $s[1], $STATIONS ), true );
	$st1        = $st1 !== false ? $st1 : 'aoto';
	$st2        = $SECOND_STATION[ $area_slug ] ?? null;
	$st2        = $st2 ? array_search( $st2, array_map( fn( $s ) => $s[1], $STATIONS ), true ) : null;
	$walk       = $walk_pool[ $i ];
	$walk2      = $st2 ? min( 20, $walk + hr_rand( 4, 10 ) ) : null;
	$year       = hr_built_year();
	$built_ym   = sprintf( '%04d-%02d', $year, hr_rand( 1, 12 ) );
	$layout     = hr_layout_for( $type, $kind );
	$sqm        = $layout ? hr_sqm_for( $layout ) : 0;
	$features   = hr_features_for( $type, $kind, $year, $layout, $walk );
	$stations   = array_values( array_filter( array( $st1, $st2 ) ) );
	$lines      = array();
	foreach ( $stations as $s ) { $lines = array_merge( $lines, $STATIONS[ $s ][2] ); }
	$lines      = array_values( array_unique( $lines ) );
	$colls      = hr_collections_for( $type, $kind, $features, $walk, $year, $stations, $CENTRAL_STATIONS );
	$status     = $status_pool[ $i ];
	$floors_tot = 'mansion' === $kind ? hr_rand( 5, 14 ) : ( 'apartment' === $kind ? hr_rand( 2, 3 ) : ( 'land' === $kind ? 0 : 2 ) );
	$floor      = $floors_tot ? hr_rand( 1, $floors_tot ) : 0;
	$structure  = 'mansion' === $kind ? hr_pick( array( 'RC', 'RC', 'SRC' ) ) : ( 'land' === $kind ? '' : hr_pick( array( '木造', '木造', '軽量鉄骨' ) ) );
	// 公開日:直近60日に散らす。14日以内は 1/6(10件)だけに寄せ、残りは 15〜60 日前(02 §6「14日以内が10件前後」)
	$published  = ( $i % 6 === 0 ) ? $today->modify( '-' . hr_rand( 0, 13 ) . ' days' ) : $today->modify( '-' . hr_rand( 15, 60 ) . ' days' );
	$updated    = $published->modify( '+' . hr_rand( 0, 5 ) . ' days' );
	if ( $updated > $today ) { $updated = $today; }
	$next_upd   = $updated->modify( '+14 days' );
	$photos     = in_array( $i, $no_photo, true ) ? 0 : hr_rand( 1, 6 );
	$color      = hr_pick( $PH_COLORS );
	$staff      = 'rental' === $type ? hr_pick( array( '見本 花子', '見本 三郎', '仮名 美咲' ) ) : hr_pick( array( '仮名 一郎', '架空 太郎' ) );
	$title      = 'land' === $kind ? sprintf( '%s 売地 0-%d', $town, $i + 1 ) : sprintf( '%s%s0-%d', $town, hr_pick( $BUILDINGS ), $i + 1 );

	$lat = round( $lat0 + ( hr_rand( -4000, 4000 ) / 1000000 ), 6 );
	$lng = round( $lng0 + ( hr_rand( -4000, 4000 ) / 1000000 ), 6 );

	// 賃貸 / 売買 の専用値
	$rent = $price = null; $extra = array();
	if ( 'rental' === $type ) {
		$rent  = hr_rent_for( $layout, $walk, $year );
		$extra = array(
			'rent'                => $rent,
			'maintenance_fee'     => in_array( 'zero-deposit', $features, true ) ? 0 : hr_pick( array( 0, 3000, 5000, 8000, 10000 ) ),
			'deposit_months'      => in_array( 'zero-deposit', $features, true ) ? 0 : hr_pick( array( 0, 1, 1, 2 ) ),
			'key_money_months'    => in_array( 'zero-deposit', $features, true ) ? 0 : hr_pick( array( 0, 1, 1 ) ),
			'brokerage_fee'       => hr_pick( array( '家賃1ヶ月', '家賃1ヶ月', '0.5ヶ月', '無料' ) ),
			'contract_term'       => '2年',
			'renewal_fee'         => hr_pick( array( '新家賃1ヶ月', 'なし' ) ),
			'guarantor_required'  => hr_chance( 85 ) ? 1 : 0,
			'available_from'      => in_array( 'move-in-now', $features, true ) ? '即入居可' : $today->modify( '+' . hr_rand( 7, 60 ) . ' days' )->format( 'Y-m-d' ),
			'rent_previous'       => in_array( $i, $discount_r, true ) ? (int) ( round( $rent * 1.08 / 1000 ) * 1000 ) : '',
		);
	} else {
		$price = hr_price_for( $kind );
		$extra = array(
			'price'          => $price,
			'price_previous' => in_array( $i, $discount_s, true ) ? (int) ( round( $price * 1.07 / 10 ) * 10 ) : '',
			'land_sqm'       => 'mansion' === $kind ? '' : hr_rand( 60, 140 ),
			'building_sqm'   => 'house' === $kind ? hr_rand( 70, 120 ) : '',
			'mgmt_fee'       => 'mansion' === $kind ? hr_rand( 6, 18 ) * 1000 : '',
			'repair_fund'    => 'mansion' === $kind ? hr_rand( 5, 15 ) * 1000 : '',
			'land_rights'    => hr_chance( 92 ) ? '所有権' : '借地権',
			'zoning'         => hr_pick( array( '第一種住居', '第一種住居', '第二種住居', '近隣商業', '準工業', '第一種低層住居専用' ) ),
			'bcr'            => hr_pick( array( 60, 60, 80 ) ),
			'far'            => hr_pick( array( 200, 200, 300, 400 ) ),
			'road_access'    => sprintf( '%s %.1fm %s', hr_pick( array( '南', '東', '西', '北' ) ), hr_pick( array( 4.0, 4.5, 5.0, 6.0 ) ), hr_pick( array( '公道', '公道', '私道' ) ) ),
			'handover'       => hr_pick( array( '相談', '相談', '即時' ) ),
		);
	}

	// 既存判定(冪等)
	$exists = get_posts( array( 'name' => $slug, 'post_type' => 'property', 'post_status' => 'any', 'numberposts' => 1, 'fields' => 'ids' ) );
	if ( $exists ) { $skipped++; continue; }

	$post_id = wp_insert_post(
		array(
			'post_type'   => 'property',
			'post_status' => 'publish',
			'post_title'  => $title,
			'post_name'   => $slug,
			'post_date'   => $published->format( 'Y-m-d 10:00:00' ),
		),
		true
	);
	if ( is_wp_error( $post_id ) ) { hr_log( "  ! $no: " . $post_id->get_error_message() ); continue; }

	// タクソノミー
	wp_set_object_terms( $post_id, $type, 'property_type' );
	wp_set_object_terms( $post_id, $kind, 'property_kind' );
	wp_set_object_terms( $post_id, $area_slug, 'area' );
	wp_set_object_terms( $post_id, $lines, 'line' );
	wp_set_object_terms( $post_id, $stations, 'station' );
	wp_set_object_terms( $post_id, $features, 'feature_tag' );
	wp_set_object_terms( $post_id, $colls, 'collection' );
	wp_set_object_terms( $post_id, $status, 'status' );

	// 画像
	$img_paths = array();
	for ( $p = 1; $p <= $photos; $p++ ) {
		$file = sprintf( '%s-%d.svg', $no, $p );
		hr_placeholder_svg( $ph_dir . '/' . $file, $no, $KINDS[ $kind ] . ( $p > 1 ? " ($p)" : '' ), $color );
		$img_paths[] = $ph_url_base . $file;
	}

	// コメント
	$st1_name = $STATIONS[ $st1 ][0];
	$feat_ja  = array_map( fn( $s ) => $FEATURES[ $s ], array_slice( array_diff( $features, array( 'aircon' ) ), 0, 2 ) );
	$mid_i    = hr_rand( 0, 3 );
	$mid      = 'land' === $kind ? sprintf( '%s㎡の整形地。', $extra['land_sqm'] ) : sprintf(
		$COMMENT_MID[ $mid_i ],
		$layout,
		$mid_i === 1 ? $sqm : ( $feat_ja ? implode( '・', $feat_ja ) : '基本設備' )
	);
	$comment = sprintf( hr_pick( $COMMENT_HEAD ), $st1_name, $walk ) . $mid . hr_pick( 'rental' === $type ? $COMMENT_TAIL : $COMMENT_TAIL_SALE );

	// ACF(共通)
	$common = array(
		'property_no'     => $no,
		'staff'           => $staff,
		'address'         => sprintf( '東京都%s%s0-0-0', $WARDS[ $ward ], $town ),
		'lat'             => $lat,
		'lng'             => $lng,
		'walk_minutes'    => $walk,
		'walk_minutes_2'  => $walk2 ?? '',
		'layout'          => $layout,
		'area_sqm'        => $sqm ?: '',
		'built_ym'        => 'land' === $kind ? '' : $built_ym,
		'floor'           => $floor ?: '',
		'floors_total'    => $floors_tot ?: '',
		'structure'       => $structure,
		'direction'       => 'land' === $kind ? '' : hr_pick( array( '南', '南', '東', '西', '北', '南東', '南西' ) ),
		'parking'         => in_array( 'parking', $features, true ) ? '空きあり(月額)' : hr_pick( array( 'なし', '近隣' ) ),
		'transaction_type' => 'rental' === $type ? hr_pick( array( '媒介', '媒介', '貸主' ) ) : hr_pick( array( '媒介', '媒介', '売主' ) ),
		'updated_on'      => $updated->format( 'Y-m-d' ),
		'next_update_on'  => $next_upd->format( 'Y-m-d' ),
		'published_on'    => $published->format( 'Y-m-d' ),
		'comment'         => $comment,
		'images'          => implode( "\n", $img_paths ),
		'floorplan'       => $layout ? $ph_url_base . 'plan-' . strtolower( $layout ) . '.svg' : '',
	);
	foreach ( array_merge( $common, $extra ) as $k => $v ) { update_field( $k, $v, $post_id ); }
	// ACF の taxonomy 型フィールド(条件表示用)にも種別を保存
	$type_term = get_term_by( 'slug', $type, 'property_type' );
	if ( $type_term ) { update_field( 'property_type', $type_term->term_id, $post_id ); }

	$created++;
	hr_log( sprintf( '  + %s %-14s %s %s %s %s枚 %s', $no, $title, $TYPES[ $type ], $KINDS[ $kind ], $rent ? number_format( $rent ) . '円' : number_format( $price ) . '万円', $photos, $STATUS[ $status ] ) );
}

hr_log( sprintf( '== 完了: 作成 %d / スキップ %d(既存)', $created, $skipped ) );
hr_log( '次: web/ で pnpm run export-wp(または /export-wp)' );
