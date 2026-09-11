/**
 * 会社設定の唯一の出所。18ページに散らさない(制作計画 §8-2・rules/fictional-data.md)。
 * ここの値はすべて架空。番地 0-0-0 / 電話 0000 / 免許番号 000000 / 団体名は「(架空)」。
 */

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export const company = {
	name: '株式会社ヒラキヤ不動産',
	shortName: 'ヒラキヤ不動産',
	abbr: 'HR',
	founded: '2001-04',
	foundedLabel: '2001年4月(創業25年)',
	representative: '架空 太郎',
	license: '東京都知事(5)第000000号',
	association: '(架空)',
	staffCount: 8,
	managedUnits: 800,
	occupancyRate: 96,
	business: ['賃貸仲介', '売買仲介', '賃貸管理'] as const,
	/** 主軸(記録上の位置づけ。文言に使う) */
	mainBusiness: '賃貸管理',
	hours: '9:30〜18:30',
	closed: '水曜',
	tagline: '葛飾で25年。借りる・買う・貸す、全部ここで。',
	notice: 'このサイトは制作記録用の架空サイトです。実在の会社・物件ではありません。',
	formNotice: 'このサイトは制作記録用の架空サイトです。送信内容は実際の対応には使われません。',
} as const;

export interface Office {
	slug: 'aoto' | 'tateishi';
	name: string;
	kind: '本店' | '支店';
	address: string;
	tel: string;
	station: string;
	walk: number;
	lat: number;
	lng: number;
}

export const offices: readonly Office[] = [
	{
		slug: 'aoto',
		name: '青砥本店',
		kind: '本店',
		address: '東京都葛飾区青戸0-0-0',
		tel: '03-0000-0000',
		station: '京成本線・押上線 青砥駅',
		walk: 3,
		lat: 35.7457,
		lng: 139.8547,
	},
	{
		slug: 'tateishi',
		name: '立石支店',
		kind: '支店',
		address: '東京都葛飾区立石0-0-0',
		tel: '03-0000-0001',
		station: '京成押上線 京成立石駅',
		walk: 2,
		lat: 35.7414,
		lng: 139.8487,
	},
] as const;

export const mainOffice = offices[0];

export const history = [
	{ year: 2001, text: '青砥で創業(賃貸仲介)' },
	{ year: 2006, text: '賃貸管理を開始' },
	{ year: 2012, text: '売買仲介を開始' },
	{ year: 2018, text: '立石支店を開設' },
	{ year: 2024, text: '管理戸数800戸' },
] as const;

export interface Staff {
	name: string;
	role: string;
	qualifications: string[];
	/** フォームの宛先になる担当(3本のフォームがそれぞれ別のスタッフに紐づく) */
	formTarget?: 'contact' | 'sell' | 'owner';
	/** 顔写真のプレースホルダー(3:4・架空表記入り。物件写真と同じ作りの SVG。J-053) */
	photo: string;
}
export const staff: readonly Staff[] = [
	{ name: '架空 太郎', role: '代表取締役', qualifications: ['宅建士'], photo: '/placeholders/staff/staff-1.svg' },
	{ name: '見本 花子', role: '賃貸部長', qualifications: ['宅建士', '賃貸不動産経営管理士'], formTarget: 'contact', photo: '/placeholders/staff/staff-2.svg' },
	{ name: '仮名 一郎', role: '売買主任', qualifications: ['宅建士', 'FP2級'], formTarget: 'sell', photo: '/placeholders/staff/staff-3.svg' },
	{ name: '架空 次郎', role: '管理部主任', qualifications: ['賃貸不動産経営管理士'], formTarget: 'owner', photo: '/placeholders/staff/staff-4.svg' },
	{ name: '見本 三郎', role: '賃貸営業', qualifications: ['宅建士'], photo: '/placeholders/staff/staff-5.svg' },
	{ name: '仮名 美咲', role: '賃貸営業', qualifications: [], photo: '/placeholders/staff/staff-6.svg' },
	{ name: '架空 恵', role: '管理事務', qualifications: [], photo: '/placeholders/staff/staff-7.svg' },
	{ name: '見本 健', role: '総務経理', qualifications: [], photo: '/placeholders/staff/staff-8.svg' },
] as const;

/** 対応エリア(13町・4区)。タクソノミー area と一致させる。表示順もこの順 */
export const serviceAreas = [
	{ ward: '葛飾区', towns: ['青戸', '立石', 'お花茶屋', '亀有', '新小岩', '金町', '堀切'] },
	{ ward: '江戸川区', towns: ['小岩', '平井'] },
	{ ward: '足立区', towns: ['綾瀬', '北千住'] },
	{ ward: '墨田区', towns: ['押上', '曳舟'] },
] as const;

/** 沿線6本(表示順)。タクソノミー line の slug と一致 */
export const lines = [
	{ slug: 'keisei-main', name: '京成本線' },
	{ slug: 'keisei-oshiage', name: '京成押上線' },
	{ slug: 'keisei-kanamachi', name: '京成金町線' },
	{ slug: 'jr-joban', name: 'JR常磐線' },
	{ slug: 'jr-sobu', name: 'JR総武線' },
	{ slug: 'tobu-skytree', name: '東武スカイツリーライン' },
] as const;

/**
 * お客様の声(架空)。トップは抜粋3件、実装順 6 の /voice でも同じ配列を参照する(J-056 項目9)。
 * 氏名は架空の姓のみ(架空 / 見本 / 仮名)。町・駅は13町・13駅の中だけ。
 */
export interface Voice {
	/** 名乗りは記号だけ(A 様 / B 様 …)。実在しうる氏名は使わない(J-057) */
	who: string;
	/** 属性(01 §16「属性(20代・単身 等)」) */
	attr: string;
	/** 賃貸 / 売買 / 管理 のどれか */
	kind: '賃貸' | '売買' | '管理';
	/** 対応した町(13町の中) */
	town: string;
	text: string;
}
export const voices: readonly Voice[] = [
	{
		who: 'A 様',
		attr: '30代・ご夫婦',
		kind: '賃貸',
		town: '曳舟',
		text: '希望の家賃で見つかるか不安でしたが、駅からの距離と間取りの優先順位を一緒に整理してもらえました。内見の日程も早く、決めるまで迷わずに済みました。',
	},
	{
		who: 'B 様',
		attr: '40代・単身',
		kind: '売買',
		town: '青戸',
		text: '相場の説明が数字と条件つきで分かりやすく、値付けの理由に納得できました。引渡しまでの段取りも先に示してもらえたので、予定を立てやすかったです。',
	},
	{
		who: 'C 様',
		attr: '60代・オーナー',
		kind: '管理',
		town: '立石',
		text: '空室が続いていた部屋について、家賃を下げる前にできることから提案してもらえました。入居後の連絡も同じ担当なので、やり取りが途切れません。',
	},
] as const;

/**
 * お知らせ(架空)。トップは最新3件、実装順 7 の /news でも同じ配列を参照する(J-056 項目9)。
 * 日付は新しい順に並べる。本文は実装順 7 で足す。
 */
/** お知らせのカテゴリー(01 §17-1 の3種。実装順 7 の一覧の絞り込みにも使う) */
export const newsCategories = ['お知らせ', '部屋探しのコツ', '地域情報'] as const;
export type NewsCategory = (typeof newsCategories)[number];

export interface NewsItem {
	slug: string;
	date: string;
	category: NewsCategory;
	title: string;
}
export const news: readonly NewsItem[] = [
	{ slug: 'summer-holiday', date: '2026-09-08', category: 'お知らせ', title: '水曜定休日と営業時間のご案内' },
	{ slug: 'rental-tips', date: '2026-09-02', category: '部屋探しのコツ', title: 'お部屋探しで先に決めておくと早い3つのこと' },
	{ slug: 'aoto-around', date: '2026-08-25', category: '地域情報', title: '青砥駅のまわりで買い物と通勤を確かめる' },
] as const;

/** 数値表示の共通フォーマット */
export function formatRent(yen: number) {
	return `${(yen / 10000).toLocaleString('ja-JP', { maximumFractionDigits: 1 })}万円`;
}
export function formatPrice(man: number) {
	return `${man.toLocaleString('ja-JP')}万円`;
}

export function absoluteUrl(p: string) {
	return `${SITE_URL}${p.startsWith('/') ? p : `/${p}`}`;
}
