import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components';
import type { ConfirmRow } from '@/lib/forms/common';

/**
 * SHIN 宛のメール(管理・空室相談・J-105 ④ → J-108)。本文は確認画面と同じ項目順。
 * 03 の色は持ち込まない(メールは別の媒体)。
 */
export function OwnerMail({ rows, notice }: { rows: ConfirmRow[]; notice: string }) {
	return (
		<Html lang="ja">
			<Head />
			<Preview>{`${rows[0]?.value ?? ''} / ${rows.find((r) => r.label === 'お名前')?.value ?? ''}`}</Preview>
			<Body style={{ fontFamily: 'sans-serif', fontSize: '15px', lineHeight: '1.7', color: '#1f2933' }}>
				<Container>
					<Heading as="h1" style={{ fontSize: '18px' }}>
						管理・空室のご相談がありました
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
