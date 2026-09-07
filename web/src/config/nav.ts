/**
 * ナビゲーションとフッターのサイトマップ(01 §共通要素・03 §7・J-027)。これは初案。
 * ルートのパスは rules/static-rendering.md §1 にあるもの以外は仮。決まったらここだけ直す。
 */

export interface NavItem {
	label: string;
	href: string;
}

/** ヘッダーのメニュー5つ(01 §共通要素の順) */
export const headerNav: readonly NavItem[] = [
	{ label: '賃貸を探す', href: '/properties?type=rental' },
	{ label: '売買を探す', href: '/properties?type=sale' },
	{ label: '売却・査定', href: '/sell' },
	{ label: 'オーナー様', href: '/owner' },
	{ label: '会社案内', href: '/company' },
];

/** フッターのサイトマップ5列(J-027) */
export const footerColumns: readonly { heading: string; items: readonly NavItem[] }[] = [
	{
		heading: '探す',
		items: [
			{ label: '賃貸物件', href: '/properties?type=rental' },
			{ label: '売買物件', href: '/properties?type=sale' },
			{ label: 'エリアから探す', href: '/area' },
			{ label: '沿線・駅から探す', href: '/line' },
			{ label: '特集', href: '/feature' },
		],
	},
	{
		heading: 'サービス',
		items: [
			{ label: '売却・査定のご相談', href: '/sell' },
			{ label: 'オーナー様(管理・空室)', href: '/owner' },
			{ label: '法人向け', href: '/corporate' },
			{ label: '初めての方へ', href: '/guide' },
			{ label: 'よくある質問', href: '/faq' },
		],
	},
	{
		heading: '会社案内',
		items: [
			{ label: '会社概要', href: '/company' },
			{ label: 'スタッフ紹介', href: '/company/staff' },
			{ label: '店舗案内・アクセス', href: '/company/access' },
			{ label: 'お客様の声', href: '/voice' },
			{ label: '採用情報', href: '/recruit' },
		],
	},
	{
		heading: 'お知らせ',
		items: [
			{ label: 'お知らせ・コラム', href: '/news' },
			{ label: '制作記録', href: '/record' },
		],
	},
	{
		heading: 'お問い合わせ',
		items: [
			{ label: '内見予約・お問い合わせ', href: '/contact' },
			{ label: '査定依頼', href: '/sell/request' },
			{ label: '管理のご相談', href: '/owner/request' },
		],
	},
];

/** フッターの矢印リンク2本(J-027) */
export const footerArrows: readonly NavItem[] = [
	{ label: '物件を探す', href: '/properties' },
	{ label: 'オーナー様へ', href: '/owner' },
];

/** フッター最下段 */
export const footerLegal: readonly NavItem[] = [
	{ label: 'プライバシーポリシー', href: '/privacy' },
	{ label: '宅建業法上の表示', href: '/legal' },
];

/** LINE(ダミー)。リンク先は「架空サイトのため利用できません」の説明(01 決定 2026-09-05) */
export const lineDummy: NavItem = { label: 'LINE(ダミー)', href: '/line-dummy' };
