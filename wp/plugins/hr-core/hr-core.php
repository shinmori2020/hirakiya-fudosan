<?php
/**
 * Plugin Name:       HR Core (ヒラキヤ不動産)
 * Description:       記録用サイト「株式会社ヒラキヤ不動産(架空)」の投稿タイプ・タクソノミー・ACF フィールドを登録するコアプラグイン。構造は本番相当、値はすべて架空。
 * Version:           0.1.0
 * Requires at least: 6.5
 * Requires PHP:      8.1
 * Author:            SHIN
 * License:           GPL-2.0-or-later
 * Text Domain:       hr-core
 */

defined( 'ABSPATH' ) || exit;

/* -------------------------------------------------------------------------
 * ACF Local JSON(Nordic Works と同じ方式)
 * 管理画面で保存すると acf-json/ に書き出され、Git で追跡できる。
 * ---------------------------------------------------------------------- */
add_filter( 'acf/settings/save_json', fn( $path ) => __DIR__ . '/acf-json' );
add_filter(
	'acf/settings/load_json',
	function ( $paths ) {
		$paths[] = __DIR__ . '/acf-json';
		return $paths;
	}
);

/* -------------------------------------------------------------------------
 * 投稿タイプ:property(1つ。賃貸/売買は property_type タクソノミー)
 * ---------------------------------------------------------------------- */
function hr_register_post_types() {
	register_post_type(
		'property',
		array(
			'labels'       => array(
				'name'          => '物件',
				'singular_name' => '物件',
				'menu_name'     => '物件',
				'add_new_item'  => '物件を追加',
				'edit_item'     => '物件を編集',
				'all_items'     => '物件一覧',
			),
			'public'       => true,
			'show_in_rest' => true,
			'rest_base'    => 'properties',
			'supports'     => array( 'title', 'custom-fields', 'revisions' ),
			'has_archive'  => false,
			'rewrite'      => array( 'slug' => 'properties' ),
			'menu_icon'    => 'dashicons-building',
			'menu_position' => 5,
		)
	);
}
add_action( 'init', 'hr_register_post_types' );

/* -------------------------------------------------------------------------
 * タクソノミー 7 種(docs/02-物件データ設計.md §2)
 * ---------------------------------------------------------------------- */
function hr_register_taxonomies() {
	$common = array(
		'public'            => true,
		'show_in_rest'      => true,
		'show_admin_column' => true,
		'query_var'         => true,
	);

	$defs = array(
		// slug => [ 単数ラベル, 階層あり?, rest_base ]
		'property_type' => array( '種別', false, 'property_types' ),
		'property_kind' => array( '物件種目', false, 'property_kinds' ),
		'area'          => array( 'エリア', true, 'areas' ),
		'line'          => array( '沿線', false, 'lines' ),
		'station'       => array( '駅', false, 'stations' ),
		'feature_tag'   => array( '設備', false, 'feature_tags' ),
		'collection'    => array( '特集', false, 'collections' ),
		'status'        => array( 'ステータス', false, 'statuses' ),
	);

	foreach ( $defs as $slug => [ $label, $hierarchical, $rest_base ] ) {
		register_taxonomy(
			$slug,
			'property',
			array_merge(
				$common,
				array(
					'labels'       => array(
						'name'          => $label,
						'singular_name' => $label,
						'menu_name'     => $label,
					),
					'hierarchical' => $hierarchical,
					'rest_base'    => $rest_base,
					'rewrite'      => array( 'slug' => str_replace( '_', '-', $slug ) ),
				)
			)
		);
	}

	// 駅 → 沿線 / 町 の対応(駅を沿線の子にしない。02 §2 判断ポイント)
	register_term_meta(
		'station',
		'lines',
		array(
			'type'         => 'string',
			'single'       => true,
			'show_in_rest' => true,
			'description'  => '沿線 slug をカンマ区切り(例: keisei-main,keisei-oshiage)',
		)
	);
	register_term_meta(
		'station',
		'area_slug',
		array(
			'type'         => 'string',
			'single'       => true,
			'show_in_rest' => true,
			'description'  => '駅が属する町の slug',
		)
	);
	// 町 → 代表座標(シードと地図の中心。02 §8-1)
	foreach ( array( 'lat', 'lng' ) as $k ) {
		register_term_meta(
			'area',
			$k,
			array(
				'type'         => 'number',
				'single'       => true,
				'show_in_rest' => true,
			)
		);
	}
}
add_action( 'init', 'hr_register_taxonomies' );

/* -------------------------------------------------------------------------
 * REST 整形
 *  - property のレスポンスに全タクソノミーの slug 配列を `hr_terms` として同梱
 *    (export-wp-data.mjs が _embed を辿らずに済む)
 *  - ACF フィールドは ACF 側の show_in_rest で `acf` キーに載る
 * ---------------------------------------------------------------------- */
function hr_rest_terms( $post_arr ) {
	$out = array();
	foreach ( array( 'property_type', 'property_kind', 'area', 'line', 'station', 'feature_tag', 'collection', 'status' ) as $tax ) {
		$terms       = get_the_terms( $post_arr['id'], $tax );
		$out[ $tax ] = ( $terms && ! is_wp_error( $terms ) ) ? array_values( wp_list_pluck( $terms, 'slug' ) ) : array();
	}
	return $out;
}
add_action(
	'rest_api_init',
	function () {
		register_rest_field(
			'property',
			'hr_terms',
			array(
				'get_callback' => 'hr_rest_terms',
				'schema'       => array( 'type' => 'object' ),
			)
		);
	}
);

/* -------------------------------------------------------------------------
 * 管理画面:物件一覧に 物件番号 / 家賃・価格 列を出す(運用の確認用)
 * ---------------------------------------------------------------------- */
add_filter(
	'manage_property_posts_columns',
	function ( $cols ) {
		$new = array();
		foreach ( $cols as $k => $v ) {
			$new[ $k ] = $v;
			if ( 'title' === $k ) {
				$new['hr_no']    = '物件番号';
				$new['hr_price'] = '家賃 / 価格';
			}
		}
		return $new;
	}
);
add_action(
	'manage_property_posts_custom_column',
	function ( $col, $post_id ) {
		if ( ! function_exists( 'get_field' ) ) {
			return;
		}
		if ( 'hr_no' === $col ) {
			echo esc_html( (string) get_field( 'property_no', $post_id ) );
		}
		if ( 'hr_price' === $col ) {
			$rent  = get_field( 'rent', $post_id );
			$price = get_field( 'price', $post_id );
			if ( $rent ) {
				echo esc_html( number_format( (int) $rent ) . ' 円' );
			} elseif ( $price ) {
				echo esc_html( number_format( (int) $price ) . ' 万円' );
			}
		}
	},
	10,
	2
);

/* -------------------------------------------------------------------------
 * 架空サイトの注記(管理画面上部)。値を実在に寄せないための常時表示
 * ---------------------------------------------------------------------- */
add_action(
	'admin_notices',
	function () {
		$screen = get_current_screen();
		if ( $screen && 'property' === $screen->post_type ) {
			echo '<div class="notice notice-info"><p>このサイトは制作記録用の架空サイトです。住所は 0-0-0、電話は 0000、物件名は「{町名}{汎用語}0-{数字}」の書式を守ってください。</p></div>';
		}
	}
);
