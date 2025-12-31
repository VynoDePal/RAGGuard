// =============================================
// Monitoring API Route - RAG Pipeline Health & Metrics
// =============================================

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { config } from '@/lib/config'

interface ServiceHealth {
	name: string
	status: 'healthy' | 'degraded' | 'down'
	latencyMs?: number
	lastChecked: string
	error?: string
}

interface MonitoringMetrics {
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

/**
 * Check if a service is healthy by making a simple request
 */
async function checkServiceHealth(
	name: string,
	checkFn: () => Promise<void>
): Promise<ServiceHealth> {
	const start = Date.now()
	try {
		await checkFn()
		return {
			name,
			status: 'healthy',
			latencyMs: Date.now() - start,
			lastChecked: new Date().toISOString(),
		}
	} catch (error) {
		return {
			name,
			status: 'down',
			latencyMs: Date.now() - start,
			lastChecked: new Date().toISOString(),
			error: error instanceof Error ? error.message : 'Unknown error',
		}
	}
}

/**
 * GET /api/monitoring - Get monitoring metrics and service health
 */
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url)
		const tenantId = searchParams.get('tenant_id')
		const includeHealth = searchParams.get('include_health') !== 'false'

		if (!tenantId) {
			return NextResponse.json(
				{ error: 'tenant_id is required' },
				{ status: 400 }
			)
		}

		const supabase = await createServiceRoleClient()

		// Get metrics from last 24 hours
		const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

		const { data: queries24h, error: queriesError } = await supabase
			.from('rag_queries')
			.select('llm_latency_ms, retrieval_latency_ms, faithfulness_score, abstained, cost_usd, created_at')
			.eq('tenant_id', tenantId)
			.gte('created_at', yesterday)
			.order('created_at', { ascending: false })

		if (queriesError) {
			throw queriesError
		}

		// Calculate metrics
		const total = queries24h?.length || 0
		const metrics: MonitoringMetrics = {
			avgLatencyMs: 0,
			avgRetrievalLatencyMs: 0,
			avgLlmLatencyMs: 0,
			avgFaithfulness: 0,
			abstentionRate: 0,
			totalCost24h: 0,
			totalQueries24h: total,
			successRate: 0,
			updatedAt: new Date().toISOString(),
		}

		if (total > 0) {
			const sumLatency = queries24h!.reduce(
				(sum, q) => sum + (q.llm_latency_ms || 0) + (q.retrieval_latency_ms || 0),
				0
			)
			const sumRetrievalLatency = queries24h!.reduce(
				(sum, q) => sum + (q.retrieval_latency_ms || 0),
				0
			)
			const sumLlmLatency = queries24h!.reduce(
				(sum, q) => sum + (q.llm_latency_ms || 0),
				0
			)
			const sumFaithfulness = queries24h!.reduce(
				(sum, q) => sum + (q.faithfulness_score || 0),
				0
			)
			const abstentionCount = queries24h!.filter(q => q.abstained).length
			const totalCost = queries24h!.reduce(
				(sum, q) => sum + (q.cost_usd || 0),
				0
			)
			const successCount = queries24h!.filter(
				q => !q.abstained && (q.faithfulness_score || 0) >= 0.7
			).length

			metrics.avgLatencyMs = Math.round(sumLatency / total)
			metrics.avgRetrievalLatencyMs = Math.round(sumRetrievalLatency / total)
			metrics.avgLlmLatencyMs = Math.round(sumLlmLatency / total)
			metrics.avgFaithfulness = sumFaithfulness / total
			metrics.abstentionRate = abstentionCount / total
			metrics.totalCost24h = totalCost
			metrics.successRate = successCount / total
		}

		// Check service health if requested
		let services: ServiceHealth[] = []
		if (includeHealth) {
			const healthChecks = await Promise.all([
				// Check Supabase
				checkServiceHealth('supabase', async () => {
					const { error } = await supabase.from('tenants').select('id').limit(1)
					if (error) throw error
				}),

				// Check LLM provider (based on config)
				checkServiceHealth(`llm-${config.llm.defaultProvider}`, async () => {
					// Just check if API key is configured
					const provider = config.llm.defaultProvider
					const hasKey = provider === 'google'
						? !!config.llm.google.apiKey
						: provider === 'openai'
							? !!config.llm.openai.apiKey
							: provider === 'anthropic'
								? !!config.llm.anthropic.apiKey
								: !!config.llm.groq.apiKey

					if (!hasKey) {
						throw new Error('API key not configured')
					}
				}),

				// Check Datadog
				checkServiceHealth('datadog', async () => {
					if (!config.datadog.apiKey) {
						throw new Error('Datadog API key not configured')
					}
					// Validate by checking if we can reach the API
					const response = await fetch(
						`https://api.${config.datadog.site}/api/v1/validate`,
						{
							headers: {
								'DD-API-KEY': config.datadog.apiKey,
							},
						}
					)
					if (!response.ok) {
						throw new Error(`Datadog API returned ${response.status}`)
					}
				}),
			])

			services = healthChecks
		}

		return NextResponse.json({
			metrics,
			services,
			tenant_id: tenantId,
		})
	} catch (error) {
		console.error('[Monitoring API] Error:', error)
		return NextResponse.json(
			{ error: 'Failed to fetch monitoring data' },
			{ status: 500 }
		)
	}
}
