// =============================================
// RAG Query API Route
// =============================================

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { RAGPipeline } from '@/lib/rag'
import { RAGRequestSchema } from '@/types'
import { datadog } from '@/lib/observability/datadog'

export async function POST(request: NextRequest) {
	const startTime = Date.now()

	try {
		// Parse and validate request
		const body = await request.json()
		const parseResult = RAGRequestSchema.safeParse(body)

		if (!parseResult.success) {
			return NextResponse.json(
				{
					error: 'Invalid request',
					details: parseResult.error.flatten(),
				},
				{ status: 400 }
			)
		}

		const ragRequest = parseResult.data

		// Get authenticated user (if any)
		const supabase = await createServiceRoleClient()

		// Execute RAG pipeline
		const pipeline = new RAGPipeline(supabase)
		const response = await pipeline.execute({
			...ragRequest,
			user_id: request.headers.get('x-user-id') || undefined,
		})

		return NextResponse.json(response, {
			headers: {
				'X-Trace-ID': response.trace_id,
				'X-Response-Time': `${Date.now() - startTime}ms`,
			},
		})
	} catch (error) {
		console.error('[RAG API] Error:', error)

		datadog.recordMetric('rag.api.error', 1, {
			error_type: (error as Error).name,
		})

		return NextResponse.json(
			{
				error: 'Internal server error',
				message: (error as Error).message,
			},
			{ status: 500 }
		)
	} finally {
		// Ensure we flush buffers in both success and error cases.
		try {
			await datadog.flushAll()
		} catch (flushError) {
			console.error('[RAG API] Datadog flush error:', flushError)
		}
	}
}

export async function OPTIONS() {
	return NextResponse.json(
		{},
		{
			headers: {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Methods': 'POST, OPTIONS',
				'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID',
			},
		}
	)
}
