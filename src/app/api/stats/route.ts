// =============================================
// Stats API Route
// =============================================

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url)
		const tenantId = searchParams.get('tenant_id')

		if (!tenantId) {
			return NextResponse.json(
				{ error: 'tenant_id is required' },
				{ status: 400 }
			)
		}

		const supabase = await createServiceRoleClient()

		// Get tenant stats using the function
		const { data, error } = await supabase.rpc('get_tenant_stats', {
			p_tenant_id: tenantId,
		})

		if (error) {
			throw error
		}

		// Get recent queries for trend analysis
		const { data: recentQueries } = await supabase
			.from('rag_queries')
			.select('created_at, faithfulness_score, abstained, llm_latency_ms, retrieval_latency_ms')
			.eq('tenant_id', tenantId)
			.order('created_at', { ascending: false })
			.limit(100)

		// Calculate trends
		const last24h = recentQueries?.filter(
			(q) => new Date(q.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
		) || []

		const avgFaithfulness24h = last24h.length > 0
			? last24h.reduce((sum, q) => sum + (q.faithfulness_score || 0), 0) / last24h.length
			: null

		const abstentionRate24h = last24h.length > 0
			? last24h.filter((q) => q.abstained).length / last24h.length
			: null

		const avgLatency24h = last24h.length > 0
			? last24h.reduce((sum, q) => sum + (q.llm_latency_ms || 0) + (q.retrieval_latency_ms || 0), 0) / last24h.length
			: null

		return NextResponse.json({
			stats: data?.[0] || {},
			trends: {
				last_24h: {
					query_count: last24h.length,
					avg_faithfulness: avgFaithfulness24h,
					abstention_rate: abstentionRate24h,
					avg_latency_ms: avgLatency24h,
				},
			},
		})
	} catch (error) {
		console.error('[Stats API] Error:', error)
		return NextResponse.json(
			{ error: 'Failed to fetch stats' },
			{ status: 500 }
		)
	}
}
