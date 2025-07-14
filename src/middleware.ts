/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Client } from '@notionhq/client';

// 메모리 캐시 (여러 사용자가 공유)
interface NotionCache {
	data: any;
	timestamp: number;
	apiCallCount: number;
}

declare global {
	// eslint-disable-next-line no-var
	var notionCache: NotionCache | undefined;
}

const CACHE_DURATION = 120 * 60 * 1000; // 2시간

async function fetchNotionData() {
	try {
		console.log(
			`🔄 Notion API 호출 시작: ${new Date().toLocaleString('ko-KR')}`,
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
			};
		}

		global.notionCache.data = {
			...response,
			cachedAt: new Date().toISOString(),
		};
		global.notionCache.timestamp = Date.now();
		global.notionCache.apiCallCount += 1;

		console.log(
			`✅ Notion API 호출 완료: ${new Date().toLocaleString('ko-KR')}`,
		);
		console.log(`📊 총 API 호출 횟수: ${global.notionCache.apiCallCount}`);

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

		// 캐시 초기화
		if (!global.notionCache) {
			global.notionCache = {
				data: null,
				timestamp: 0,
				apiCallCount: 0,
			};
		}

		// 캐시가 없거나 만료된 경우 업데이트
		if (
			!global.notionCache.data ||
			now - global.notionCache.timestamp > CACHE_DURATION
		) {
			console.log('🔍 캐시 만료 또는 없음 - 새로운 데이터 로드');
			// 비동기로 업데이트 (응답 지연 방지)
			fetchNotionData().catch(console.error);
		} else {
			console.log('💾 캐시된 데이터 사용');
		}

		// 캐시 정보를 헤더에 추가 (Base64 인코딩으로 한글 문제 해결)
		const response = NextResponse.next();
		if (global.notionCache.data) {
			// 한글이 포함된 데이터를 Base64로 인코딩
			const encodedData = Buffer.from(
				JSON.stringify(global.notionCache.data),
			).toString('base64');
			response.headers.set('X-Notion-Data', encodedData);
		}
		response.headers.set(
			'X-Cache-Info',
			JSON.stringify({
				hasCache: !!global.notionCache.data,
				timestamp: global.notionCache.timestamp,
				apiCallCount: global.notionCache.apiCallCount,
				cacheAge: now - global.notionCache.timestamp,
			}),
		);

		return response;
	}

	return NextResponse.next();
}

export const config = {
	matcher: '/holiday-test/:path*',
};
