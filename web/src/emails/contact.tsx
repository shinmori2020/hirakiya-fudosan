import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components';
import type { ConfirmRow } from '@/lib/contact';

/**
 * SHIN 宛のメール(内見予約・問い合わせ)。本文は確認画面と同じ項目順(J-102)。
 * 03 の色は持ち込まない(メールは別の媒体)。文字だけの素のテンプレート。
 */
export function ContactMail({ rows, notice }: { rows: ConfirmRow[]; notice: string }) {
	return (
		<Html lang="ja">
			<Head />
			<Preview>{`${rows[1]?.value ?? ''} / ${rows.find((r) => r.label === 'お名前')?.value ?? ''}`}</Preview>
			<Body style={{ fontFamily: 'sans-serif', fontSize: '15px', lineHeight: '1.7', color: '#1f2933' }}>
				<Container>
					<Heading as="h1" style={{ fontSize: '18px' }}>
						お問い合わせがありました
					</Heading>
					<Text style={{ fontSize: '13px', color: '#5f6b75' }}>{notice}</Text>
					<Hr />
					<Section>
						{rows.map((r) => (
							<Text key={r.label} style={{ margin: '0 0 8px' }}>
								<strong>{r.label}</strong>:{r.value}
							</Text>
						))}
					</Section>
				</Container>
			</Body>
		</Html>
	);
}
