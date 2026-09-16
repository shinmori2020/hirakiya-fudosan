import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components';
import type { ConfirmRow } from '@/lib/forms/common';

/**
 * 自動返信(内見予約・入力されたメールがある時だけ)。冒頭に架空文言(forms.md §2・J-012)。
 * 担当者名は出さず部署名まで。折り返しは一律「翌営業日まで」(J-102 d)。定休日の希望には1行添える(J-105)。
 */
export function ViewingReplyMail({
	rows,
	notice,
	department,
	replyBy,
	hours,
	closed,
	tel,
	companyName,
	closedHits,
}: {
	rows: ConfirmRow[];
	notice: string;
	department: string;
	replyBy: string;
	hours: string;
	closed: string;
	tel: string;
	companyName: string;
	closedHits: string[];
}) {
	return (
		<Html lang="ja">
			<Head />
			<Preview>内見のご予約を受け付けました</Preview>
			<Body style={{ fontFamily: 'sans-serif', fontSize: '15px', lineHeight: '1.7', color: '#1f2933' }}>
				<Container>
					<Text style={{ fontSize: '13px', color: '#5f6b75' }}>{notice}</Text>
					<Heading as="h1" style={{ fontSize: '18px' }}>
						ご予約を受け付けました
					</Heading>
					<Text>
						{department}より、{replyBy}にご希望の日時をご相談のうえご連絡します。営業時間 {hours}(定休日:{closed})。お急ぎの場合は {tel} までお電話ください。
					</Text>
					{closedHits.length > 0 && <Text>※ {closedHits.join('・')}は定休日({closed})に当たります。ご案内できる日時を折り返しでご相談させてください。</Text>}
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
