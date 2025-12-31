// =============================================
// Queries API Route - List RAG query history
// =============================================

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * GET /api/queries - List RAG queries for a tenant
 */
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url)
		const tenantId = searchParams.get('tenant_id')
		const limit = parseInt(searchParams.get('limit') || '50', 10)
		const offset = parseInt(searchParams.get('offset') || '0', 10)

		if (!tenantId) {
			return NextResponse.json(
				{ error: 'tenant_id is required' },
				{ status: 400 }
			)
		}

		const supabase = await createServiceRoleClient()

		const { data, error, count } = await supabase
			.from('rag_queries')
			.select('*', { count: 'exact' })
			.eq('tenant_id', tenantId)
			.order('created_at', { ascending: false })
			.range(offset, offset + limit - 1)

		if (error) {
			throw error
		}

		// Mapper les données pour correspondre à l'interface RagQuery du dashboard
		const queries = (data || []).map(q => {
			// Mapper et dédupliquer les sources par document_id
			const sourceMap = new Map<string, {
				chunk_id: string
				document_title: string
				similarity: number
			}>()

			if (Array.isArray(q.sources)) {
				for (const s of q.sources) {
					const source = s as Record<string, unknown>
					const docId = (source.document_id || source.chunk_id || '') as string
					const title = (source.title || source.document_title || 'Document') as string
					const similarity = (source.similarity_score ?? source.similarity ?? 0) as number

					// Garder la source avec le meilleur score de similarité
					const existing = sourceMap.get(docId)
					if (!existing || similarity > existing.similarity) {
						sourceMap.set(docId, {
							chunk_id: docId,
							document_title: title,
							similarity,
						})
					}
				}
			}

			const sources = Array.from(sourceMap.values())

			return {
				id: q.id,
				tenant_id: q.tenant_id,
				query: q.query,
				response: q.response || '',
				faithfulness_score: q.faithfulness_score || 0,
				abstained: q.abstained || false,
				llm_latency_ms: q.llm_latency_ms || 0,
				retrieval_latency_ms: q.retrieval_latency_ms || 0,
				model: q.llm_model || 'unknown',
				created_at: q.created_at,
				sources,
			}
		})

		return NextResponse.json({
			queries,
			pagination: {
				limit,
				offset,
				total: count,
			},
		})
	} catch (error) {
		console.error('[Queries API] Error:', error)
		return NextResponse.json(
			{ error: 'Failed to fetch queries' },
			{ status: 500 }
		)
	}
}
