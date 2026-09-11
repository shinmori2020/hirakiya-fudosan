import { describe, expect, it } from 'vitest';
import { addressParts, featureHref, kindHref, layoutHref, lineHref, listHref, stationHref, townHref, wardHref } from '@/lib/links';

describe('links.ts', () => {
	it('J-051 賃貸のリンクに type は付けない(既定が賃貸)', () => {
		expect(kindHref('rental', 'mansion')).toBe('/properties?kind=mansion');
	});

	it('J-051 売買のリンクだけ type=sale を付ける(J-040 と同じ作り)', () => {
		expect(kindHref('sale', 'house')).toBe('/properties?type=sale&kind=house');
	});

	it('J-051 クエリ名は lib/search.ts と同じ(駅 / 沿線 / 間取り / 設備 / 町)', () => {
		expect(stationHref('rental', 'hikifune')).toBe('/properties?station=hikifune');
		expect(lineHref('rental', 'keisei-oshiage')).toBe('/properties?line=keisei-oshiage');
		expect(layoutHref('rental', '1LDK')).toBe('/properties?layout=1LDK');
		expect(featureHref('rental', 'pet-ok')).toBe('/properties?feature=pet-ok');
		expect(townHref('rental', 'hikifune')).toBe('/properties?area=hikifune');
	});

	it('J-051 区のリンクは一覧に区の絞り込みが無いので、その区の町を OR で並べる', () => {
		expect(wardHref('rental', ['hikifune', 'kyojima', 'higashimukojima'])).toBe('/properties?area=hikifune%2Ckyojima%2Chigashimukojima');
	});

	it('J-051 空の値は URL に載せない', () => {
		expect(listHref('rental', { layout: '' })).toBe('/properties?');
		expect(wardHref('sale', [])).toBe('/properties?type=sale');
	});

	it('J-051 所在地は 区 と 町 だけをリンクにし、残りは素の文字にする', () => {
		expect(addressParts('東京都墨田区曳舟0-0-0', '墨田区', '曳舟')).toEqual([
			{ text: '東京都', link: null },
			{ text: '墨田区', link: 'ward' },
			{ text: '曳舟', link: 'town' },
			{ text: '0-0-0', link: null },
		]);
	});

	it('J-051 町名は区より後ろから探す(区名と町名が同じ字を含む場合の取り違えを防ぐ)', () => {
		expect(addressParts('東京都葛飾区青戸1-2-3', '葛飾区', '青戸')).toEqual([
			{ text: '東京都', link: null },
			{ text: '葛飾区', link: 'ward' },
			{ text: '青戸', link: 'town' },
			{ text: '1-2-3', link: null },
		]);
	});

	it('J-051 区や町が住所に見つからない時はその分だけリンクにしない(文字は落とさない)', () => {
		expect(addressParts('東京都墨田区曳舟0-0-0', '足立区', '曳舟')).toEqual([
			{ text: '東京都墨田区', link: null },
			{ text: '曳舟', link: 'town' },
			{ text: '0-0-0', link: null },
		]);
		expect(addressParts('住所未定', '墨田区', '曳舟')).toEqual([{ text: '住所未定', link: null }]);
	});
});
