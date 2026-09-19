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
	/** 平均空室期間(日)。01 §12 の架空値。入居率 96% と矛盾しない範囲で置いた初案(実装順 6) */
	avgVacancyDays: 28,
	/** 管理料の目安(家賃に対する %)。01 §12「一般的な水準に合わせる」の案(SHIN が書き換えてよい) */
	managementFeeRate: 5,
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
	/** 駐車場(01 §9 要素3)。架空 */
	parking: string;
	/** 最寄駅からの道順(01 §9 要素2)。実在の目印は書かない(架空) */
	directions: string;
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
		parking: '2台(架空)。満車の場合は近隣のコインパーキングをご案内します',
		directions: '青砥駅の改札を出て、駅前の通りを直進。1つ目の信号を渡って左側、徒歩3分です。',
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
		parking: 'なし(架空)。近隣のコインパーキングをご利用ください',
		directions: '京成立石駅の改札を出て右へ。商店街の入口を過ぎてすぐ、徒歩2分です。',
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
	/** ひとこと(01 §8 要素4)。初案。実在の人物・店名は書かない */
	comment: string;
}
export const staff: readonly Staff[] = [
	{ name: '架空 太郎', role: '代表取締役', qualifications: ['宅建士'], photo: '/placeholders/staff/staff-1.svg', comment: '創業から25年、青砥と立石で見てきた物件の話をします。' },
	{ name: '見本 花子', role: '賃貸部長', qualifications: ['宅建士', '賃貸不動産経営管理士'], formTarget: 'contact', photo: '/placeholders/staff/staff-2.svg', comment: '内見は「ここが気になる」を先に聞いてから回ります。' },
	{ name: '仮名 一郎', role: '売買主任', qualifications: ['宅建士', 'FP2級'], formTarget: 'sell', photo: '/placeholders/staff/staff-3.svg', comment: '査定の数字は、根拠になった条件と一緒にお出しします。' },
	{ name: '架空 次郎', role: '管理部主任', qualifications: ['賃貸不動産経営管理士'], formTarget: 'owner', photo: '/placeholders/staff/staff-4.svg', comment: '空室は、家賃を下げる前にできることから一緒に探します。' },
	{ name: '見本 三郎', role: '賃貸営業', qualifications: ['宅建士'], photo: '/placeholders/staff/staff-5.svg', comment: '駅からの道は、雨の日の目線でも歩いて確かめています。' },
	{ name: '仮名 美咲', role: '賃貸営業', qualifications: [], photo: '/placeholders/staff/staff-6.svg', comment: '初めての部屋探しの方には、順番から説明します。' },
	{ name: '架空 恵', role: '管理事務', qualifications: [], photo: '/placeholders/staff/staff-7.svg', comment: '入居中の困りごとは、まず私が受けて担当につなぎます。' },
	{ name: '見本 健', role: '総務経理', qualifications: [], photo: '/placeholders/staff/staff-8.svg', comment: '契約書類と費用の説明を、分かるまで何度でも。' },
] as const;

/**
 * 売却事例(01 §11 要素3・架空3件)。実装順 6 の /sell が読む。02 のシード(今売っている物件)とは別建て。
 * 町は 02 §8 の13町の中。番地は書かない(書くなら 0-0-0)。物件名は架空の書式(町名+ハイツ等+0-数字)、戸建・土地は名前を持たない。
 * 数字は 02 §6 の売買20件の価格帯・面積・築年の内側。実際の相場は参照していない。担当者や売主のコメントは入れない(実在の声に見えるため)。
 */
export interface SaleCase {
	kind: '戸建' | 'マンション' | '土地';
	ward: string;
	town: string;
	name?: string;
	areaSqm: number;
	builtYear?: number;
	/** 査定額(万円) */
	assessedMan: number;
	/** 成約価格(万円) */
	soldMan: number;
	/** 売り出しから成約までの日数 */
	days: number;
	/** 経過(事実だけ。形容を入れない) */
	note: string;
}
export const saleCases: readonly SaleCase[] = [
	{ kind: 'マンション', ward: '葛飾区', town: '青戸', name: '青戸レジデンス0-4', areaSqm: 68, builtYear: 2008, assessedMan: 3480, soldMan: 3400, days: 47, note: '管理物件の入居者の方からの紹介で、内覧2件目で申込。' },
	{ kind: '戸建', ward: '葛飾区', town: '立石', areaSqm: 92, builtYear: 1999, assessedMan: 3980, soldMan: 3850, days: 73, note: '売却後は買主様が居住。引渡しまでに残置物の整理を当社で手配。' },
	{ kind: '土地', ward: '葛飾区', town: 'お花茶屋', areaSqm: 80, assessedMan: 4200, soldMan: 4200, days: 35, note: '建物解体後に更地で売り出し。査定額のまま成約。' },
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
 * 特集6件の説明文(01 §7「説明文+該当物件一覧」・J-095 判断7)。slug は 02 §2 の collection と一致。
 * 名前はタクソノミーから取り、ここには説明だけを持つ。**その特集の絞り込み条件の説明に留め、
 * 物件データに無い形容(閑静・人気 等)は書かない**(03 §1)。実装順 4 の /feature と /feature/[slug] が参照する。
 */
export const collectionDescriptions: Readonly<Record<string, string>> = {
	'central-30min': '最寄駅から都心方面へ30分以内で出られる物件。通勤・通学を優先して探す方向けです。',
	'zero-deposit': '敷金・礼金がかからない物件。入居時にまとまった費用を抑えたい方向けです。',
	'pet-ok': 'ペットと暮らせる物件。飼育の条件は物件ごとに異なるので、詳細でご確認ください。',
	'house-rental': '一戸建ての賃貸物件。集合住宅より生活音を気にせず暮らしたい方向けです。',
	'near-station': '最寄駅まで徒歩5分以内の物件。雨の日や荷物が多い日の移動が短く済みます。',
	'new-built': '築5年以内の物件。設備が新しく、修繕の心配が少ない住まいです。',
};

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
