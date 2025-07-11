/* eslint-disable @typescript-eslint/no-explicit-any */
import { headers } from 'next/headers';

interface HolidayData {
	response?: {
		body?: {
			items?: {
				item?: Array<{
					dateKind: string;
					dateName: string;
					isHoliday: string;
					locdate: string;
					seq: string;
				}>;
			};
		};
	};
	cachedAt?: string;
}

export default async function HolidayTest() {
	const headersList = await headers();
	const holidayDataHeader = headersList.get('X-Holiday-Data');
	const cacheInfoHeader = headersList.get('X-Cache-Info');

	let holidayData: HolidayData | null = null;
	let cacheInfo: any = null;

	if (holidayDataHeader) {
		try {
			// Base64로 인코딩된 데이터를 디코딩
			const decodedData = Buffer.from(holidayDataHeader, 'base64').toString(
				'utf-8',
			);
			holidayData = JSON.parse(decodedData);
		} catch (error) {
			console.error('공휴일 데이터 파싱 오류:', error);
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
	const holidays = holidayData?.response?.body?.items?.item || [];

	return (
		<div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
			<h1>🎄 공휴일 API 캐싱 테스트</h1>

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
						? `${Math.round(cacheInfo.cacheAge / 1000)}초`
						: '없음'}
				</p>
				{holidayData?.cachedAt && (
					<p>
						<strong>데이터 생성 시간:</strong>{' '}
						{new Date(holidayData.cachedAt).toLocaleString('ko-KR')}
					</p>
				)}
			</div>

			{/* 새로고침 버튼 */}
			<div style={{ marginBottom: '20px' }}>
				<button
					style={{
						padding: '10px 20px',
						fontSize: '16px',
						backgroundColor: '#007bff',
						color: 'white',
						border: 'none',
						borderRadius: '5px',
						cursor: 'pointer',
					}}
				>
					🔄 새로고침 (캐시 테스트)
				</button>
			</div>

			{/* 공휴일 데이터 */}
			<div>
				<h2>🗓️ {new Date().getFullYear()}년 공휴일 목록</h2>
				{holidays.length > 0 ? (
					<div style={{ display: 'grid', gap: '10px' }}>
						{holidays.map((holiday, index) => (
							<div
								key={index}
								style={{
									padding: '10px',
									border: '1px solid #ddd',
									borderRadius: '5px',
									backgroundColor: '#fff',
								}}
							>
								<strong>{holiday.dateName}</strong> - {holiday.locdate}
								{holiday.isHoliday === 'Y' && ' 🎉'}
							</div>
						))}
					</div>
				) : (
					<p>데이터를 불러오는 중이거나 오류가 발생했습니다.</p>
				)}
			</div>

			{/* 테스트 안내 */}
			<div
				style={{
					marginTop: '30px',
					padding: '15px',
					backgroundColor: '#e7f3ff',
					borderRadius: '8px',
				}}
			>
				<h3>🧪 테스트 방법</h3>
				<ol>
					<li>이 페이지를 여러 번 새로고침 해보세요</li>
					<li>다른 브라우저/시크릿 모드에서도 접속해보세요</li>
					<li>API 호출 횟수가 증가하는지 확인하세요</li>
					<li>5분 후에 다시 접속해서 캐시가 갱신되는지 확인하세요</li>
				</ol>
				<p>
					<strong>예상 결과:</strong> 캐시가 유효한 동안은 여러 명이 접속해도
					API 호출 횟수가 증가하지 않아야 합니다.
				</p>
			</div>
		</div>
	);
}
