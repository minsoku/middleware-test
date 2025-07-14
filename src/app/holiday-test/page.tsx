/* eslint-disable @typescript-eslint/no-explicit-any */
import { headers } from 'next/headers';

interface NotionData {
	results?: Array<{
		id: string;
		properties: any;
		created_time: string;
		last_edited_time: string;
	}>;
	next_cursor?: string | null;
	has_more?: boolean;
	cachedAt?: string;
}

export default async function NotionTest() {
	const headersList = await headers();
	const notionDataHeader = headersList.get('X-Notion-Data');
	const cacheInfoHeader = headersList.get('X-Cache-Info');

	let notionData: NotionData | null = null;
	let cacheInfo: any = null;

	if (notionDataHeader) {
		try {
			// Base64로 인코딩된 데이터를 디코딩
			const decodedData = Buffer.from(notionDataHeader, 'base64').toString(
				'utf-8',
			);
			notionData = JSON.parse(decodedData);
		} catch (error) {
			console.error('Notion 데이터 파싱 오류:', error);
		}
	}

	if (cacheInfoHeader) {
		try {
			cacheInfo = JSON.parse(cacheInfoHeader);
		} catch (error) {
			console.error('캐시 정보 파싱 오류:', error);
		}
	}

	const currentTime = new Date().toLocaleString('ko-KR');
	const items = notionData?.results || [];

	return (
		<div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
			<h1>📢 공지사항 (Notion API 스마트 캐싱)</h1>

			{/* 캐시 상태 정보 */}
			<div
				style={{
					background: '#f5f5f5',
					padding: '15px',
					borderRadius: '8px',
					marginBottom: '20px',
				}}
			>
				<h2>📊 캐시 상태</h2>
				<p>
					<strong>현재 시간:</strong> {currentTime}
				</p>
				<p>
					<strong>캐시 존재:</strong>{' '}
					{cacheInfo?.hasCache ? '✅ 있음' : '❌ 없음'}
				</p>
				<p>
					<strong>총 API 호출 횟수:</strong> {cacheInfo?.apiCallCount || 0}회
				</p>
				<p>
					<strong>캐시 생성 시간:</strong>
					{cacheInfo?.timestamp
						? new Date(cacheInfo.timestamp).toLocaleString('ko-KR')
						: '없음'}
				</p>
				<p>
					<strong>캐시 경과 시간:</strong>
					{cacheInfo?.cacheAge
						? `${Math.round(cacheInfo.cacheAge / 1000)}초 (${cacheInfo.cacheHours || 0}시간)`
						: '없음'}
				</p>
				<p>
					<strong>현재 시간:</strong> {cacheInfo?.currentHour || 0}시
				</p>
				<p>
					<strong>마지막 업데이트:</strong> {cacheInfo?.lastUpdateHour >= 0 ? `${cacheInfo.lastUpdateHour}시` : '없음'}
				</p>
				<p>
					<strong>다음 업데이트:</strong> {cacheInfo?.nextUpdateDay === 'tomorrow' ? '내일' : '오늘'} {cacheInfo?.nextUpdateHour}시
				</p>
				<p>
					<strong>업데이트 시간대:</strong> {cacheInfo?.allowedHours?.join(', ')}시
				</p>
				<p>
					<strong>API 호출 상태:</strong> {cacheInfo?.isApiCalling ? '🔄 호출 중' : '✅ 대기 중'}
				</p>
				<p>
					<strong>업데이트 모드:</strong> {cacheInfo?.isEmergencyEligible ? '🚨 긴급 업데이트 가능' : '🕐 정기 업데이트만'}
				</p>
				{notionData?.cachedAt && (
					<p>
						<strong>데이터 생성 시간:</strong>{' '}
						{new Date(notionData.cachedAt).toLocaleString('ko-KR')}
					</p>
				)}
			</div>

			{/* 새로고침 버튼 */}
			<div style={{ marginBottom: '20px' }}>
				<a
					href="/holiday-test"
					style={{
						display: 'inline-block',
						padding: '10px 20px',
						fontSize: '16px',
						backgroundColor: '#007bff',
						color: 'white',
						border: 'none',
						borderRadius: '5px',
						cursor: 'pointer',
						textDecoration: 'none',
					}}
				>
					🔄 새로고침 (캐시 테스트)
				</a>
			</div>

			{/* Notion 데이터 */}
			<div>
				<h2>📄 공지사항 목록</h2>
				{items.length > 0 ? (
					<>
						<p>
							<strong>총 항목 수:</strong> {items.length}개
						</p>
						<div style={{ display: 'grid', gap: '10px' }}>
							{items.map((item, index) => (
								<div
									key={item.id}
									style={{
										padding: '15px',
										border: '1px solid #ddd',
										borderRadius: '8px',
										backgroundColor: '#fff',
									}}
								>
									<div style={{ marginBottom: '10px' }}>
										<strong>항목 {index + 1}</strong>
									</div>
									<div style={{ fontSize: '12px', color: '#666' }}>
										<strong>ID:</strong> {item.id}
									</div>
									<div style={{ fontSize: '12px', color: '#666' }}>
										<strong>생성 시간:</strong>{' '}
										{new Date(item.created_time).toLocaleString('ko-KR')}
									</div>
									<div style={{ fontSize: '12px', color: '#666' }}>
										<strong>수정 시간:</strong>{' '}
										{new Date(item.last_edited_time).toLocaleString('ko-KR')}
									</div>
									{/* 프로퍼티 정보 */}
									<div
										style={{
											marginTop: '10px',
											padding: '10px',
											backgroundColor: '#f8f9fa',
											borderRadius: '4px',
										}}
									>
										<strong>Properties:</strong>
										<pre style={{ fontSize: '10px', overflow: 'auto' }}>
											{JSON.stringify(item.properties, null, 2)}
										</pre>
									</div>
								</div>
							))}
						</div>
					</>
				) : (
					<p>데이터를 불러오는 중이거나 오류가 발생했습니다.</p>
				)}
			</div>

			{/* 페이지네이션 정보 */}
			{notionData && (
				<div
					style={{
						marginTop: '20px',
						padding: '15px',
						backgroundColor: '#e3f2fd',
						borderRadius: '8px',
					}}
				>
					<h3>📄 페이지네이션 정보</h3>
					<p>
						<strong>더 많은 데이터 있음:</strong>{' '}
						{notionData.has_more ? '✅ 예' : '❌ 아니요'}
					</p>
					<p>
						<strong>다음 커서:</strong>{' '}
						{notionData.next_cursor || '없음'}
					</p>
				</div>
			)}
		</div>
	);
}
