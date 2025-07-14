/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Client } from '@notionhq/client';

// 메모리 캐시 (같은 서버 instance 내에서 공유)
interface NotionCache {
	data: any;
	timestamp: number;
	apiCallCount: number;
	lastUpdateHour: number; // 마지막 업데이트 시간(시) 추가
}

declare global {
	// eslint-disable-next-line no-var
	var notionCache: NotionCache | undefined;
}

// 🕐 API 호출 허용 시간 (24시간 형식)
const ALLOWED_HOURS = [10, 12, 14, 16, 18, 20];

function getNextAllowedHour(currentHour: number): number {
	// 현재 시간 이후의 다음 허용 시간 찾기
	const nextHour = ALLOWED_HOURS.find(hour => hour > currentHour);
	return nextHour || ALLOWED_HOURS[0]; // 없으면 다음날 첫 번째 시간
}

function shouldUpdateCache(currentHour: number, lastUpdateHour: number): boolean {
	// 허용된 시간이 아니면 업데이트 안함
	if (!ALLOWED_HOURS.includes(currentHour)) {
		return false;
	}
	
	// 마지막 업데이트 시간과 다르면 업데이트
	return currentHour !== lastUpdateHour;
}

async function fetchNotionData(currentHour: number) {
	try {
		console.log(
			`🔄 Notion API 호출 시작: ${new Date().toLocaleString('ko-KR')} (${currentHour}시 정기 업데이트)`,
		);

		const client = new Client({
			auth: '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',
		});
		
		const response = await client.databases.query({
			database_id: '22b9d3de552e80b3aa9fc4808eff82c3',
		});

		// 캐시 초기화 또는 업데이트
		if (!global.notionCache) {
			global.notionCache = {
				data: null,
				timestamp: 0,
				apiCallCount: 0,
				lastUpdateHour: -1,
			};
		}

		global.notionCache.data = {
			...response,
			cachedAt: new Date().toISOString(),
		};
		global.notionCache.timestamp = Date.now();
		global.notionCache.apiCallCount += 1;
		global.notionCache.lastUpdateHour = currentHour;

		const nextHour = getNextAllowedHour(currentHour);
		const isNextDay = nextHour <= currentHour;

		console.log(
			`✅ Notion API 호출 완료: ${new Date().toLocaleString('ko-KR')}`,
		);
		console.log(`📊 총 API 호출 횟수: ${global.notionCache.apiCallCount}`);
		console.log(`⏰ 다음 업데이트 시간: ${isNextDay ? '내일' : '오늘'} ${nextHour}시`);

		return response;
	} catch (error) {
		console.error('❌ Notion API 호출 실패:', error);
		throw error;
	}
}

export async function middleware(request: NextRequest) {
	// 테스트 페이지 접근 시에만 동작
	if (request.nextUrl.pathname.startsWith('/holiday-test')) {
		const now = Date.now();
		const currentHour = new Date().getHours();

		// 캐시 초기화
		if (!global.notionCache) {
			global.notionCache = {
				data: null,
				timestamp: 0,
				apiCallCount: 0,
				lastUpdateHour: -1,
			};
		}

		// 🕐 정해진 시간에만 API 호출
		if (shouldUpdateCache(currentHour, global.notionCache.lastUpdateHour)) {
			console.log(`🔍 ${currentHour}시 정기 업데이트 시간 - 새로운 데이터 로드`);
			try {
				await fetchNotionData(currentHour);
			} catch (error) {
				console.error('API 호출 실패, 기존 캐시 사용:', error);
			}
		} else {
			const nextHour = getNextAllowedHour(currentHour);
			const isNextDay = nextHour <= currentHour;
			console.log(`💾 캐시된 데이터 사용 (다음 업데이트: ${isNextDay ? '내일' : '오늘'} ${nextHour}시)`);
		}

		// 응답 헤더 설정
		const response = NextResponse.next();
		
		if (global.notionCache.data) {
			// 한글이 포함된 데이터를 Base64로 인코딩
			const encodedData = Buffer.from(
				JSON.stringify(global.notionCache.data),
			).toString('base64');
			response.headers.set('X-Notion-Data', encodedData);
		}

		// 캐시 정보 헤더 설정
		const nextHour = getNextAllowedHour(currentHour);
		const isNextDay = nextHour <= currentHour;
		const cacheInfo = {
			hasCache: !!global.notionCache.data,
			timestamp: global.notionCache.timestamp,
			apiCallCount: global.notionCache.apiCallCount,
			cacheAge: now - global.notionCache.timestamp,
			cacheHours: Math.round((now - global.notionCache.timestamp) / (1000 * 60 * 60)),
			currentHour,
			lastUpdateHour: global.notionCache.lastUpdateHour,
			nextUpdateHour: nextHour,
			nextUpdateDay: isNextDay ? 'tomorrow' : 'today',
			allowedHours: ALLOWED_HOURS,
		};

		response.headers.set('X-Cache-Info', JSON.stringify(cacheInfo));

		return response;
	}

	return NextResponse.next();
}

export const config = {
	matcher: '/holiday-test/:path*',
};
