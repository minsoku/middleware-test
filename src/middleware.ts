/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 메모리 캐시 (여러 사용자가 공유)
interface HolidayCache {
	data: any;
	timestamp: number;
	apiCallCount: number;
}

declare global {
	// eslint-disable-next-line no-var
	var holidayCache: HolidayCache | undefined;
}

const CACHE_DURATION = 2 * 60 * 1000; // 5분 (테스트용으로 짧게 설정)
const currentYear = new Date().getFullYear();

async function fetchHolidayData() {
	try {
		console.log(process.env.NEXT_PUBLIC_NOTION_DATABASE_ID);
		console.log(
			`🔄 공휴일 API 호출 시작: ${new Date().toLocaleString('ko-KR')}`,
		);

		const url = `https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getHoliDeInfo?solYear=${currentYear}&ServiceKey=0szWNjrkhUmPh1/J2TNU71esrdu0j6rmcdmfhwNlV6uhQKLTKxAzSy5qxSMfNxAfrQfgcJfBy6MN/rbHDBVY6Q==&_type=json&numOfRows=30`;

		const response = await fetch(url);

		const data = await response.json();

		// 캐시 초기화 또는 업데이트
		if (!global.holidayCache) {
			global.holidayCache = {
				data: null,
				timestamp: 0,
				apiCallCount: 0,
			};
		}

		global.holidayCache.data = {
			...data,
			cachedAt: new Date().toISOString(),
		};
		global.holidayCache.timestamp = Date.now();
		global.holidayCache.apiCallCount += 1;

		console.log(
			`✅ 공휴일 API 호출 완료: ${new Date().toLocaleString('ko-KR')}`,
		);
		console.log(`📊 총 API 호출 횟수: ${global.holidayCache.apiCallCount}`);

		return data;
	} catch (error) {
		console.error('❌ 공휴일 API 호출 실패:', error);
		throw error;
	}
}

export async function middleware(request: NextRequest) {
	// 테스트 페이지 접근 시에만 동작
	if (request.nextUrl.pathname.startsWith('/holiday-test')) {
		const now = Date.now();

		// 캐시 초기화
		if (!global.holidayCache) {
			global.holidayCache = {
				data: null,
				timestamp: 0,
				apiCallCount: 0,
			};
		}

		// 캐시가 없거나 만료된 경우 업데이트
		if (
			!global.holidayCache.data ||
			now - global.holidayCache.timestamp > CACHE_DURATION
		) {
			console.log('🔍 캐시 만료 또는 없음 - 새로운 데이터 로드');
			// 비동기로 업데이트 (응답 지연 방지)
			fetchHolidayData().catch(console.error);
		} else {
			console.log('💾 캐시된 데이터 사용');
		}

		// 캐시 정보를 헤더에 추가 (Base64 인코딩으로 한글 문제 해결)
		const response = NextResponse.next();
		if (global.holidayCache.data) {
			// 한글이 포함된 데이터를 Base64로 인코딩
			const encodedData = Buffer.from(
				JSON.stringify(global.holidayCache.data),
			).toString('base64');
			response.headers.set('X-Holiday-Data', encodedData);
		}
		response.headers.set(
			'X-Cache-Info',
			JSON.stringify({
				hasCache: !!global.holidayCache.data,
				timestamp: global.holidayCache.timestamp,
				apiCallCount: global.holidayCache.apiCallCount,
				cacheAge: now - global.holidayCache.timestamp,
			}),
		);

		return response;
	}

	return NextResponse.next();
}

export const config = {
	matcher: '/holiday-test/:path*',
};
