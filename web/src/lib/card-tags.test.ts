import { describe, expect, it } from 'vitest';
import { cardTags } from '@/lib/card-tags';

const names = {
	collectionName: (s: string) =>
		({ 'central-30min': '都心まで30分以内', 'zero-deposit': '敷礼ゼロ', 'pet-ok': 'ペット可', 'house-rental': '戸建賃貸', 'near-station': '駅徒歩5分', 'new-built': '新築・築浅' })[s] ?? s,
	featureName: (s: string) => ({ 'pet-ok': 'ペット可', autolock: 'オートロック', parking: '駐車場', aircon: 'エアコン', 'zero-deposit': '敷金礼金ゼロ' })[s] ?? s,
};
const tags = (collections: string[], features: string[] = []) => cardTags({ collections, features }, names);

describe('card-tags.ts', () => {
	it('J-044 特集が先、02 §2 の順に並ぶ', () => {
		expect(tags(['near-station', 'central-30min'])).toEqual(['都心まで30分以内', '駅徒歩5分']);
	});

	it('J-044 特集が足りなければ設備で埋める(02 §2 の順)', () => {
		expect(tags(['central-30min'], ['parking', 'autolock'])).toEqual(['都心まで30分以内', 'オートロック']);
	});

	it('J-044 最大2つ(3つ以上該当しても2つ)', () => {
		expect(tags(['central-30min', 'zero-deposit', 'pet-ok'], ['autolock'])).toEqual(['都心まで30分以内', '敷礼ゼロ']);
	});

	it('J-044 0件なら空配列(カードのタグ行を出さない)', () => {
		expect(tags([], [])).toEqual([]);
	});

	it('J-044 エアコンは出さない(全件が持つため)', () => {
		expect(tags([], ['aircon', 'autolock'])).toEqual(['オートロック']);
	});

	it('J-044 特集「ペット可」があれば設備「ペット可」は重ねない', () => {
		expect(tags(['pet-ok'], ['pet-ok', 'autolock'])).toEqual(['ペット可', 'オートロック']);
	});

	it('J-046 駅徒歩・築年はタグにしない(カードに別の行があるため)', () => {
		// near-station は特集なので出るが、「駅徒歩10分以内」「築浅」のような導出タグは含まれない
		expect(tags(['near-station'], [])).toEqual(['駅徒歩5分']);
	});
});
