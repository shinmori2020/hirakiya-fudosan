import { describe, expect, it } from 'vitest';
import { targetPropertyRows, type TargetPropertyFields } from '@/lib/target-property';

const NOW = new Date('2026-09-16T00:00:00+09:00');
const names = { stationName: (s: string) => ({ hikifune: '曳舟', 'horikiri-shobuen': '堀切菖蒲園' })[s] ?? s, areaLabel: (s: string) => ({ hikifune: '墨田区曳舟', horikiri: '葛飾区堀切' })[s] ?? s };
const mk = (over: Partial<TargetPropertyFields> = {}): TargetPropertyFields => ({
	layout: '1LDK',
	areaSqm: 42,
	builtYm: '2015-04',
	stations: [{ slug: 'hikifune', walk: 8 }],
	area: 'hikifune',
	...over,
});

describe('target-property.ts', () => {
	it('J-104 要約は 間取り / 面積 / 築年 / 最寄駅 / 所在地 の順', () => {
		expect(targetPropertyRows(mk(), names, NOW)).toEqual([
			{ label: '間取り', value: '1LDK' },
			{ label: '面積', value: '42㎡' },
			{ label: '築年', value: '築11年' },
			{ label: '最寄駅', value: '曳舟駅 徒歩8分' },
			{ label: '所在地', value: '墨田区曳舟' },
		]);
	});

	it('J-104 最寄駅は1駅目だけ(2駅目は出さない)', () => {
		const rows = targetPropertyRows(mk({ stations: [{ slug: 'hikifune', walk: 8 }, { slug: 'horikiri-shobuen', walk: 18 }] }), names, NOW);
		expect(rows.filter((r) => r.label === '最寄駅')).toEqual([{ label: '最寄駅', value: '曳舟駅 徒歩8分' }]);
	});

	it('J-104 土地(間取り・面積・築年が空)は行ごと落とし、「—」を並べない', () => {
		expect(targetPropertyRows(mk({ layout: '', areaSqm: null, builtYm: '', area: 'horikiri' }), names, NOW).map((r) => r.label)).toEqual(['最寄駅', '所在地']);
	});

	it('J-104 築年は今日を基準に数え、築0年は「新築」', () => {
		expect(targetPropertyRows(mk({ builtYm: '2026-04' }), names, NOW).find((r) => r.label === '築年')?.value).toBe('新築');
		expect(targetPropertyRows(mk({ builtYm: '2020-10' }), names, NOW).find((r) => r.label === '築年')?.value).toBe('築5年');
	});

	it('J-104 名前の引き当ては呼び出し側から渡す(lib は web/data を読まない)。引けない slug はそのまま出す', () => {
		const rows = targetPropertyRows(mk({ stations: [{ slug: 'unknown', walk: 3 }], area: 'nowhere' }), names, NOW);
		expect(rows.find((r) => r.label === '最寄駅')?.value).toBe('unknown駅 徒歩3分');
		expect(rows.find((r) => r.label === '所在地')?.value).toBe('nowhere');
		// 駅が無い物件は最寄駅の行を出さない
		expect(targetPropertyRows(mk({ stations: [] }), names, NOW).map((r) => r.label)).not.toContain('最寄駅');
	});
});
