/**
 * 流れ(手順)の部品(03 §7 説明ページ・J-115 → J-123 で形を変えた)。
 *
 * **4段以上は「横の索引 + 縦の本文」**(J-123)。横一列に6段を並べると1列が約200px になり、
 * 説明が4〜5行に折り返して読む方向が「左→右」と「上→下」で混ざる(実測・09/19)。
 *  - 上(索引):番号+見出しだけを横一列に並べ、灰線(03 §2 の線)で繋ぐ。**全体像を見せるだけ**で押せない
 *  - 下(本文):番号+見出し(h3)+説明を縦1列に。読み幅 760
 * **3段以下は縦の本文だけ**(索引を出しても全体像が増えない)。フォームの右カラムの「進み方」(縦積み3段・J-107)と同じ扱い。
 *
 * **`dense`**(J-124):フォームの右カラムの「進み方」(送信の先を示す・J-107)。丸 6・文字は小・段の間を詰める。
 * 3段なので J-123 の規則どおり索引は出ない。**役割は「送信したあとどうなるか」**で、本文の流れ(ページの説明)とは別。
 *
 * 読み上げでは**索引を読ませない**(`aria-hidden`)。同じ語を索引と本文で2回読むことになるため、
 * 見出し要素にもしない(h3 は本文側だけ)。色は付けない(番号の丸は薄灰・墨文字)。説明文は本文(15 / 16px・J-119)。
 * 390 では索引を出さない(**初案**:折り返すと本文の真上に同じ語が2〜3行で並び、本文に届くまでが遠くなる)。
 */
export interface Step {
	title: string;
	text: string;
}

/** 索引を出す段数の下限(03 §7・J-123) */
const INDEX_FROM = 4;

// 丸は白地+灰線(J-139)。薄灰の面(/guide の帯)に薄灰の丸を置くと丸が消えて数字だけ浮いたため、どの面でも同じ見え方になる作りに
const CIRCLE = 'tabular flex shrink-0 items-center justify-center rounded-full border border-line bg-surface text-small font-bold text-sumi';
const SIZE = { normal: 'size-8', dense: 'size-6' };

export function Steps({ steps, label, dense = false }: { steps: readonly Step[]; label: string; dense?: boolean }) {
	const circle = `${CIRCLE} ${dense ? SIZE.dense : SIZE.normal}`;
	return (
		<div>
			{steps.length >= INDEX_FROM && (
				/* 索引:md 以上だけ。読み上げは本文で足りるので読ませない */
				<div aria-hidden="true" className="mb-6 hidden md:flex md:items-center lg:mb-8">
					{steps.map((s, i) => (
						<div key={s.title} className="flex min-w-0 items-center">
							{i > 0 && <span className="mx-2 h-px w-6 shrink bg-line lg:mx-3 lg:w-10" />}
							<span className={circle}>{i + 1}</span>
							<span className="ml-2 truncate text-small font-bold text-sumi lg:text-small-pc">{s.title}</span>
						</div>
					))}
				</div>
			)}

			<ol aria-label={label} className={dense ? 'space-y-3' : 'max-w-[760px] space-y-6'}>
				{steps.map((s, i) => (
					<li key={s.title} className="flex gap-3">
						<span className={circle}>{i + 1}</span>
						<div className="min-w-0">
							<h3 className={dense ? 'text-small font-bold text-sumi' : 'text-h3 font-bold text-sumi lg:text-h3-pc'}>{s.title}</h3>
							<p className={dense ? 'text-small text-ink' : 'mt-1 text-body text-ink lg:text-body-pc'}>{s.text}</p>
						</div>
					</li>
				))}
			</ol>
		</div>
	);
}
