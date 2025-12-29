'use client'

import {useCallback, useMemo, useRef} from 'react'

// =============================================
// RAGGuard API Configuration
// =============================================

const RAG_API_BASE = process.env.NEXT_PUBLIC_RAG_API_URL || 'http://localhost:3000'
const DEFAULT_TENANT_ID = process.env.NEXT_PUBLIC_RAG_TENANT_ID || '00000000-0000-0000-0000-000000000001'

// =============================================
// Types
// =============================================

export interface RagStats {
	total_documents: number
	total_chunks: number
	total_queries: number
	avg_faithfulness: number
	avg_latency_ms: number
	abstention_rate: number
}

export interface RagTrends {
	last_24h: {
		query_count: number
		avg_faithfulness: number | null
		abstention_rate: number | null
		avg_latency_ms: number | null
	}
}

export interface RagStatsResponse {
	stats: RagStats
	trends: RagTrends
}

export interface RagDocument {
	id: string
	tenant_id: string
	title: string
	content?: string
	content_type: string
	source_url?: string
	metadata?: Record<string, unknown>
	chunk_count?: number
	created_at: string
	updated_at: string
}

export interface RagQuery {
	id: string
	tenant_id: string
	query: string
	response: string
	faithfulness_score: number
	abstained: boolean
	llm_latency_ms: number
	retrieval_latency_ms: number
	model: string
	created_at: string
	sources: Array<{
		chunk_id: string
		document_title: string
		similarity: number
	}>
}

export interface RagChatMessage {
	role: 'user' | 'assistant'
	content: string
	sources?: Array<{
		chunk_id: string
		document_title: string
		similarity: number
	}>
	faithfulness_score?: number
	abstained?: boolean
	latency_ms?: number
}

export interface RagChatRequest {
	query: string
	tenant_id?: string
	user_id?: string
	language?: string
	max_tokens?: number
}

export interface RagChatResponse {
	answer: string
	sources: Array<{
		chunk_id: string
		document_title: string
		content: string
		similarity: number
	}>
	faithfulness_score: number
	abstained: boolean
	metrics: {
		retrieval_latency_ms: number
		llm_latency_ms: number
		total_latency_ms: number
		tokens_used: number
		cost_usd: number
	}
}

export interface DocumentUploadRequest {
	tenant_id?: string
	title: string
	content: string
	content_type?: string
	source_url?: string
	metadata?: Record<string, unknown>
}

export interface DocumentUploadResponse {
	document_id: string
	chunks_created: number
	message: string
}

// =============================================
// Monitoring Types
// =============================================

export interface RagMonitoringMetrics {
	avgLatencyMs: number
	avgRetrievalLatencyMs: number
	avgLlmLatencyMs: number
	avgFaithfulness: number
	abstentionRate: number
	totalCost24h: number
	totalQueries24h: number
	successRate: number
	updatedAt: string
}

export interface ServiceHealth {
	name: string
	status: 'healthy' | 'degraded' | 'down'
	latencyMs?: number
	lastChecked: string
	error?: string
}

export interface RagMonitoringResponse {
	metrics: RagMonitoringMetrics
	services: ServiceHealth[]
	tenant_id: string
}

export interface DatadogPoint {
	timestamp: number
	value: number
}

export interface DatadogTimeseries {
	metric: string
	points: DatadogPoint[]
	tags?: string[]
}

export interface DatadogTimeseriesResponse {
	timeseries: DatadogTimeseries | DatadogTimeseries[]
	from: number
	to: number
}

// =============================================
// Hook useRagApi
// =============================================

export function useRagApi() {
	const tenantIdRef = useRef(DEFAULT_TENANT_ID)

	const setTenantId = useCallback((id: string) => {
		tenantIdRef.current = id
	}, [])

	const getTenantId = useCallback(() => tenantIdRef.current, [])

	// ---------- Stats ----------
	const getStats = useCallback(async (): Promise<RagStatsResponse> => {
		try {
			const res = await fetch(
				`${RAG_API_BASE}/api/stats?tenant_id=${tenantIdRef.current}`,
			)
			if (!res.ok) {
				throw new Error(`Failed to fetch stats: ${res.status}`)
			}
			return res.json()
		} catch {
			// Fallback avec données mock si l'API n'est pas disponible
			console.warn('RAGGuard API not available, using mock data')
			return {
				stats: {
					total_documents: 0,
					total_chunks: 0,
					total_queries: 0,
					avg_faithfulness: 0,
					avg_latency_ms: 0,
					abstention_rate: 0,
				},
				trends: {
					last_24h: {
						query_count: 0,
						avg_faithfulness: null,
						abstention_rate: null,
						avg_latency_ms: null,
					},
				},
			}
		}
	}, [])

	// ---------- Documents ----------
	const listDocuments = useCallback(async (): Promise<RagDocument[]> => {
		try {
			const res = await fetch(
				`${RAG_API_BASE}/api/documents?tenant_id=${tenantIdRef.current}`,
			)
			if (!res.ok) {
				const errorData = await res.json().catch(() => ({}))
				console.error('[Documents] API Error:', res.status, errorData)
				throw new Error(errorData.error || `Failed to fetch documents: ${res.status}`)
			}
			const data = await res.json()
			console.log('[Documents] Fetched:', data)
			return data.documents || []
		} catch (err) {
			console.error('[Documents] Fetch error:', err)
			throw err
		}
	}, [])

	const uploadDocument = useCallback(
		async (payload: DocumentUploadRequest): Promise<DocumentUploadResponse> => {
			const res = await fetch(`${RAG_API_BASE}/api/documents`, {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify({
					...payload,
					tenant_id: payload.tenant_id || tenantIdRef.current,
				}),
			})
			if (!res.ok) {
				const err = await res.json().catch(() => ({}))
				throw new Error(err.error || `Failed to upload document: ${res.status}`)
			}
			return res.json()
		},
		[],
	)

	const deleteDocument = useCallback(async (id: string): Promise<void> => {
		const res = await fetch(
			`${RAG_API_BASE}/api/documents/${id}?tenant_id=${tenantIdRef.current}`,
			{method: 'DELETE'},
		)
		if (!res.ok) {
			throw new Error(`Failed to delete document: ${res.status}`)
		}
	}, [])

	// ---------- RAG Chat ----------
	const chat = useCallback(
		async (request: RagChatRequest): Promise<RagChatResponse> => {
			const res = await fetch(`${RAG_API_BASE}/api/rag/query`, {
				method: 'POST',
				headers: {'Content-Type': 'application/json'},
				body: JSON.stringify({
					...request,
					tenant_id: request.tenant_id || tenantIdRef.current,
				}),
			})
			if (!res.ok) {
				const err = await res.json().catch(() => ({}))
				throw new Error(err.error || `RAG query failed: ${res.status}`)
			}
			return res.json()
		},
		[],
	)

	// ---------- Queries History ----------
	const listQueries = useCallback(
		async (limit = 50): Promise<RagQuery[]> => {
			try {
				const res = await fetch(
					`${RAG_API_BASE}/api/queries?tenant_id=${tenantIdRef.current}&limit=${limit}`,
				)
				if (!res.ok) {
					if (res.status === 404) return []
					throw new Error(`Failed to fetch queries: ${res.status}`)
				}
				const data = await res.json()
				return data.queries || []
			} catch {
				console.warn('RAGGuard API not available for queries')
				return []
			}
		},
		[],
	)

	// ---------- Monitoring ----------
	const getMonitoring = useCallback(
		async (includeHealth = true): Promise<RagMonitoringResponse> => {
			try {
				const res = await fetch(
					`${RAG_API_BASE}/api/monitoring?tenant_id=${tenantIdRef.current}&include_health=${includeHealth}`,
				)
				if (!res.ok) {
					throw new Error(`Failed to fetch monitoring: ${res.status}`)
				}
				return res.json()
			} catch {
				console.warn('RAGGuard Monitoring API not available')
				return {
					metrics: {
						avgLatencyMs: 0,
						avgRetrievalLatencyMs: 0,
						avgLlmLatencyMs: 0,
						avgFaithfulness: 0,
						abstentionRate: 0,
						totalCost24h: 0,
						totalQueries24h: 0,
						successRate: 0,
						updatedAt: new Date().toISOString(),
					},
					services: [],
					tenant_id: tenantIdRef.current,
				}
			}
		},
		[],
	)

	const getDatadogTimeseries = useCallback(
		async (
			metric: string,
			from: number,
			to: number
		): Promise<DatadogTimeseriesResponse> => {
			try {
				const res = await fetch(
					`${RAG_API_BASE}/api/monitoring/datadog?tenant_id=${tenantIdRef.current}&metric=${encodeURIComponent(metric)}&from=${from}&to=${to}`,
				)
				if (!res.ok) {
					if (res.status === 503) {
						// Datadog not configured
						return { timeseries: { metric, points: [] }, from, to }
					}
					throw new Error(`Failed to fetch Datadog metrics: ${res.status}`)
				}
				return res.json()
			} catch {
				console.warn('Datadog API not available')
				return { timeseries: { metric, points: [] }, from, to }
			}
		},
		[],
	)

	const getDatadogMultipleTimeseries = useCallback(
		async (
			metrics: string[],
			from: number,
			to: number
		): Promise<DatadogTimeseriesResponse> => {
			try {
				const res = await fetch(`${RAG_API_BASE}/api/monitoring/datadog`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						tenant_id: tenantIdRef.current,
						metrics,
						from,
						to,
					}),
				})
				if (!res.ok) {
					if (res.status === 503) {
						return {
							timeseries: metrics.map(m => ({ metric: m, points: [] })),
							from,
							to,
						}
					}
					throw new Error(`Failed to fetch Datadog metrics: ${res.status}`)
				}
				return res.json()
			} catch {
				console.warn('Datadog API not available')
				return {
					timeseries: metrics.map(m => ({ metric: m, points: [] })),
					from,
					to,
				}
			}
		},
		[],
	)

	// Mémoriser l'objet retourné pour éviter les re-rendus infinis
	return useMemo(
		() => ({
			setTenantId,
			getTenantId,
			stats: {
				get: getStats,
			},
			documents: {
				list: listDocuments,
				upload: uploadDocument,
				delete: deleteDocument,
			},
			chat,
			queries: {
				list: listQueries,
			},
			monitoring: {
				get: getMonitoring,
				getDatadogTimeseries,
				getDatadogMultipleTimeseries,
			},
		}),
		[
			setTenantId,
			getTenantId,
			getStats,
			listDocuments,
			uploadDocument,
			deleteDocument,
			chat,
			listQueries,
			getMonitoring,
			getDatadogTimeseries,
			getDatadogMultipleTimeseries,
		],
	)
}
