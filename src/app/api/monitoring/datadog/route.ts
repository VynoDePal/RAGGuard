// =============================================
// Datadog Metrics API Route - Query historical metrics
// =============================================

import { NextRequest, NextResponse } from 'next/server'
import { config } from '@/lib/config'

interface DatadogPoint {
	timestamp: number
	value: number
}

interface DatadogTimeseries {
	metric: string
	points: DatadogPoint[]
	tags?: string[]
}

/**
 * GET /api/monitoring/datadog - Query Datadog metrics
 * 
 * Query params:
 * - tenant_id: string (required)
 * - metric: string (required) - e.g., "ragguard.llm.response.latency_ms"
 * - from: number (required) - Unix timestamp in seconds
 * - to: number (required) - Unix timestamp in seconds
 */
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url)
		const tenantId = searchParams.get('tenant_id')
		const metric = searchParams.get('metric')
		const from = searchParams.get('from')
		const to = searchParams.get('to')

		if (!tenantId) {
			return NextResponse.json(
				{ error: 'tenant_id is required' },
				{ status: 400 }
			)
		}

		if (!metric) {
			return NextResponse.json(
				{ error: 'metric is required' },
				{ status: 400 }
			)
		}

		if (!from || !to) {
			return NextResponse.json(
				{ error: 'from and to timestamps are required' },
				{ status: 400 }
			)
		}

		// Check if Datadog is configured
		if (!config.datadog.apiKey) {
			return NextResponse.json(
				{ error: 'Datadog is not configured', configured: false },
				{ status: 503 }
			)
		}

		// Build the query with tenant filter
		const query = `avg:${metric}{tenant:${tenantId}}`

		// Query Datadog Metrics API v1
		const response = await fetch(
			`https://api.${config.datadog.site}/api/v1/query?from=${from}&to=${to}&query=${encodeURIComponent(query)}`,
			{
				headers: {
					'DD-API-KEY': config.datadog.apiKey,
					'DD-APPLICATION-KEY': config.datadog.appKey || '',
				},
			}
		)

		if (!response.ok) {
			const errorText = await response.text()
			console.error('[Datadog API] Error:', response.status, errorText)
			return NextResponse.json(
				{ error: `Datadog API error: ${response.status}` },
				{ status: response.status }
			)
		}

		const data = await response.json()

		// Transform Datadog response to our format
		const timeseries: DatadogTimeseries = {
			metric,
			points: [],
			tags: [`tenant:${tenantId}`],
		}

		if (data.series && data.series.length > 0) {
			const series = data.series[0]
			timeseries.points = (series.pointlist || []).map(
				(point: [number, number]) => ({
					timestamp: Math.floor(point[0] / 1000), // Convert ms to seconds
					value: point[1],
				})
			)
		}

		return NextResponse.json({
			timeseries,
			query,
			from: parseInt(from, 10),
			to: parseInt(to, 10),
		})
	} catch (error) {
		console.error('[Datadog Metrics API] Error:', error)
		return NextResponse.json(
			{ error: 'Failed to fetch Datadog metrics' },
			{ status: 500 }
		)
	}
}

/**
 * POST /api/monitoring/datadog - Query multiple metrics at once
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.json()
		const { tenant_id, metrics, from, to } = body as {
			tenant_id: string
			metrics: string[]
			from: number
			to: number
		}

		if (!tenant_id || !metrics || !from || !to) {
			return NextResponse.json(
				{ error: 'tenant_id, metrics, from, and to are required' },
				{ status: 400 }
			)
		}

		if (!config.datadog.apiKey) {
			return NextResponse.json(
				{ error: 'Datadog is not configured', configured: false },
				{ status: 503 }
			)
		}

		// Query each metric
		const results: DatadogTimeseries[] = await Promise.all(
			metrics.map(async (metric) => {
				const query = `avg:${metric}{tenant:${tenant_id}}`

				try {
					const response = await fetch(
						`https://api.${config.datadog.site}/api/v1/query?from=${from}&to=${to}&query=${encodeURIComponent(query)}`,
						{
							headers: {
								'DD-API-KEY': config.datadog.apiKey,
								'DD-APPLICATION-KEY': config.datadog.appKey || '',
							},
						}
					)

					if (!response.ok) {
						return { metric, points: [], tags: [`tenant:${tenant_id}`] }
					}

					const data = await response.json()

					if (data.series && data.series.length > 0) {
						const series = data.series[0]
						return {
							metric,
							points: (series.pointlist || []).map(
								(point: [number, number]) => ({
									timestamp: Math.floor(point[0] / 1000),
									value: point[1],
								})
							),
							tags: [`tenant:${tenant_id}`],
						}
					}

					return { metric, points: [], tags: [`tenant:${tenant_id}`] }
				} catch {
					return { metric, points: [], tags: [`tenant:${tenant_id}`] }
				}
			})
		)

		return NextResponse.json({
			timeseries: results,
			from,
			to,
		})
	} catch (error) {
		console.error('[Datadog Metrics API] Error:', error)
		return NextResponse.json(
			{ error: 'Failed to fetch Datadog metrics' },
			{ status: 500 }
		)
	}
}
