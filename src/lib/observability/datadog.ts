// =============================================
// Datadog Observability Service
// =============================================

import { config } from '@/lib/config'
import { generateSpanId, generateTraceId, sanitizeForLogging } from '@/lib/utils'
import type { RAGLogEntry, SpanContext } from '@/types'

// Types for spans and metrics
interface SpanData {
	name: string
	start_time: number
	end_time?: number
	duration_ms?: number
	tags: Record<string, string | number | boolean>
	error?: string
}

interface MetricData {
	name: string
	value: number
	tags: Record<string, string>
	timestamp?: number
}

/**
 * DatadogService - Handles APM traces, metrics, and structured logging
 */
export class DatadogService {
	private static instance: DatadogService
	private isEnabled: boolean
	private spans: Map<string, SpanData> = new Map()
	private metricsBuffer: MetricData[] = []
	private logsBuffer: RAGLogEntry[] = []

	private constructor() {
		this.isEnabled = !!config.datadog.apiKey
	}

	public static getInstance(): DatadogService {
		if (!DatadogService.instance) {
			DatadogService.instance = new DatadogService()
		}
		return DatadogService.instance
	}

	// =============================================
	// Trace / Span Management
	// =============================================

	/**
	 * Create a new trace context
	 */
	createTraceContext(): SpanContext {
		return {
			trace_id: generateTraceId(),
			span_id: generateSpanId(),
		}
	}

	/**
	 * Start a new span
	 */
	startSpan(
		name: string,
		context: SpanContext,
		tags: Record<string, string | number | boolean> = {}
	): string {
		const spanId = generateSpanId()
		const spanKey = `${context.trace_id}:${spanId}`

		this.spans.set(spanKey, {
			name,
			start_time: Date.now(),
			tags: {
				...tags,
				'trace.id': context.trace_id,
				'span.id': spanId,
				'parent.span.id': context.span_id,
				env: config.datadog.env,
				service: config.datadog.service,
				version: config.datadog.version,
			},
		})

		return spanId
	}

	/**
	 * End a span and record its duration
	 */
	endSpan(
		context: SpanContext,
		spanId: string,
		additionalTags: Record<string, string | number | boolean> = {},
		error?: Error
	): number {
		const spanKey = `${context.trace_id}:${spanId}`
		const span = this.spans.get(spanKey)

		if (!span) {
			console.warn(`Span not found: ${spanKey}`)
			return 0
		}

		const endTime = Date.now()
		const durationMs = endTime - span.start_time

		span.end_time = endTime
		span.duration_ms = durationMs
		span.tags = { ...span.tags, ...additionalTags }

		if (error) {
			span.error = error.message
			span.tags['error'] = true
			span.tags['error.message'] = error.message
		}

		// In production, send to Datadog APM
		if (this.isEnabled) {
			this.sendSpanToDatadog(span)
		}

		// Log span for development
		if (process.env.NODE_ENV === 'development') {
			console.log(`[SPAN] ${span.name}: ${durationMs}ms`, span.tags)
		}

		this.spans.delete(spanKey)
		return durationMs
	}

	/**
	 * Create a scoped span that auto-ends
	 */
	async withSpan<T>(
		name: string,
		context: SpanContext,
		tags: Record<string, string | number | boolean>,
		fn: () => Promise<T>
	): Promise<{ result: T; duration: number }> {
		const spanId = this.startSpan(name, context, tags)

		try {
			const result = await fn()
			const duration = this.endSpan(context, spanId)
			return { result, duration }
		} catch (error) {
			this.endSpan(context, spanId, {}, error as Error)
			throw error
		}
	}

	// =============================================
	// Metrics
	// =============================================

	/**
	 * Record a custom metric
	 */
	recordMetric(
		name: string,
		value: number,
		tags: Record<string, string> = {}
	): void {
		const metric: MetricData = {
			name: `${config.datadog.service}.${name}`,
			value,
			tags: {
				...tags,
				env: config.datadog.env,
				service: config.datadog.service,
			},
			timestamp: Date.now(),
		}

		this.metricsBuffer.push(metric)

		// Log metric for development
		if (process.env.NODE_ENV === 'development') {
			console.log(`[METRIC] ${metric.name}: ${value}`, tags)
		}

		// Flush buffer if it gets too large
		if (this.metricsBuffer.length >= 100) {
			this.flushMetrics()
		}
	}

	/**
	 * Record retrieval success rate
	 */
	recordRetrievalSuccess(success: boolean, tenant: string): void {
		this.recordMetric('rag.retrieval.success_rate', success ? 1 : 0, { tenant })
		if (!success) {
			this.recordMetric('rag.retrieval.no_result_count', 1, { tenant })
		}
	}

	/**
	 * Record retrieval latency
	 */
	recordRetrievalLatency(latencyMs: number, tenant: string): void {
		this.recordMetric('rag.retrieval.latency_ms', latencyMs, { tenant })
	}

	/**
	 * Record rerank similarity
	 */
	recordRerankSimilarity(similarity: number, tenant: string): void {
		this.recordMetric('rag.rerank.top_k_similarity_mean', similarity, { tenant })
	}

	/**
	 * Record LLM response latency
	 */
	recordLLMLatency(latencyMs: number, model: string, tenant: string): void {
		this.recordMetric('llm.response.latency_ms', latencyMs, { model, tenant })
	}

	/**
	 * Record faithfulness score
	 */
	recordFaithfulnessScore(score: number, tenant: string): void {
		this.recordMetric('llm.response.faithfulness_score', score, { tenant })
	}

	/**
	 * Record abstention
	 */
	recordAbstention(tenant: string): void {
		this.recordMetric('rag.abstention.rate', 1, { tenant })
	}

	/**
	 * Record cost per request
	 */
	recordCost(costUsd: number, model: string, tenant: string): void {
		this.recordMetric('rag.cost_per_request', costUsd, { model, tenant })
	}

	// =============================================
	// Structured Logging
	// =============================================

	/**
	 * Log a RAG query with structured data
	 */
	logRAGQuery(entry: RAGLogEntry): void {
		// Sanitize sensitive data
		const sanitizedEntry: RAGLogEntry = {
			...entry,
			query: sanitizeForLogging(entry.query),
		}

		this.logsBuffer.push(sanitizedEntry)

		// Log for development
		if (process.env.NODE_ENV === 'development') {
			console.log('[RAG LOG]', JSON.stringify(sanitizedEntry, null, 2))
		}

		// Flush buffer if it gets too large
		if (this.logsBuffer.length >= 50) {
			this.flushLogs()
		}
	}

	// =============================================
	// Flush Operations
	// =============================================

	/**
	 * Send span to Datadog APM
	 */
	private async sendSpanToDatadog(span: SpanData): Promise<void> {
		if (!this.isEnabled) return

		try {
			// Format span for Datadog APM API
			const ddSpan = {
				name: span.name,
				service: config.datadog.service,
				resource: span.name,
				type: 'web',
				start: span.start_time * 1000000, // nanoseconds
				duration: (span.duration_ms || 0) * 1000000, // nanoseconds
				meta: Object.fromEntries(
					Object.entries(span.tags)
						.filter(([, v]) => typeof v === 'string')
						.map(([k, v]) => [k, String(v)])
				),
				metrics: Object.fromEntries(
					Object.entries(span.tags)
						.filter(([, v]) => typeof v === 'number')
						.map(([k, v]) => [k, v as number])
				),
				error: span.error ? 1 : 0,
			}

			await fetch(`https://trace.agent.${config.datadog.site}/api/v0.2/traces`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					'DD-API-KEY': config.datadog.apiKey,
				},
				body: JSON.stringify([[ddSpan]]),
			})
		} catch (error) {
			console.error('Failed to send span to Datadog:', error)
		}
	}

	/**
	 * Flush metrics to Datadog
	 */
	async flushMetrics(): Promise<void> {
		if (!this.isEnabled || this.metricsBuffer.length === 0) return

		const metrics = [...this.metricsBuffer]
		this.metricsBuffer = []

		try {
			const series = metrics.map((m) => ({
				metric: m.name,
				type: 'gauge',
				points: [[Math.floor((m.timestamp || Date.now()) / 1000), m.value]],
				tags: Object.entries(m.tags).map(([k, v]) => `${k}:${v}`),
			}))

			await fetch(`https://api.${config.datadog.site}/api/v1/series`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'DD-API-KEY': config.datadog.apiKey,
				},
				body: JSON.stringify({ series }),
			})
		} catch (error) {
			console.error('Failed to flush metrics to Datadog:', error)
			// Re-add failed metrics to buffer
			this.metricsBuffer.push(...metrics)
		}
	}

	/**
	 * Flush logs to Datadog
	 */
	async flushLogs(): Promise<void> {
		if (!this.isEnabled || this.logsBuffer.length === 0) return

		const logs = [...this.logsBuffer]
		this.logsBuffer = []

		try {
			const ddLogs = logs.map((log) => ({
				ddsource: 'nodejs',
				ddtags: `env:${config.datadog.env},service:${config.datadog.service},version:${config.datadog.version}`,
				hostname: 'ragguard',
				message: JSON.stringify(log),
				service: config.datadog.service,
				status: log.abstained ? 'warn' : 'info',
			}))

			await fetch(`https://http-intake.logs.${config.datadog.site}/api/v2/logs`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'DD-API-KEY': config.datadog.apiKey,
				},
				body: JSON.stringify(ddLogs),
			})
		} catch (error) {
			console.error('Failed to flush logs to Datadog:', error)
			// Re-add failed logs to buffer
			this.logsBuffer.push(...logs)
		}
	}

	/**
	 * Flush all buffers
	 */
	async flushAll(): Promise<void> {
		await Promise.all([this.flushMetrics(), this.flushLogs()])
	}
}

// Export singleton instance
export const datadog = DatadogService.getInstance()
