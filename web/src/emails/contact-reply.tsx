import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components';
import type { ConfirmRow } from '@/lib/contact';

/**
 * 自動返信(入力されたメールがある時だけ)。冒頭に架空文言(forms.md §2・J-012)。
 * 担当者名は出さず部署名まで。折り返しは一律「翌営業日まで」(J-102 d)。
 */
export function ContactReplyMail({
	rows,
	notice,
	department,
	replyBy,
	hours,
	closed,
	tel,
	companyName,
}: {
	rows: ConfirmRow[];
	notice: string;
	department: string;
	replyBy: string;
	hours: string;
	closed: string;
	tel: string;
	companyName: string;
}) {
	return (
		<Html lang="ja">
			<Head />
			<Preview>お問い合わせを受け付けました</Preview>
			<Body style={{ fontFamily: 'sans-serif', fontSize: '15px', lineHeight: '1.7', color: '#1f2933' }}>
				<Container>
					<Text style={{ fontSize: '13px', color: '#5f6b75' }}>{notice}</Text>
					<Heading as="h1" style={{ fontSize: '18px' }}>
						お問い合わせを受け付けました
					</Heading>
					<Text>
						{department}より、{replyBy}にご連絡します。営業時間 {hours}(定休日:{closed})。お急ぎの場合は {tel} までお電話ください。
					</Text>
					<Hr />
					<Section>
						{rows.map((r) => (
							<Text key={r.label} style={{ margin: '0 0 8px' }}>
								<strong>{r.label}</strong>:{r.value}
							</Text>
						))}
					</Section>
					<Hr />
					<Text style={{ fontSize: '13px', color: '#5f6b75' }}>{companyName}</Text>
				</Container>
			</Body>
		</Html>
	);
}
