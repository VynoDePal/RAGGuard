// =============================================
// RAG Pipeline - Main Orchestrator
// =============================================

import { SupabaseClient } from '@supabase/supabase-js'
import { config, calculateCost } from '@/lib/config'
import { generateTraceId, hashUserId } from '@/lib/utils'
import { datadog } from '@/lib/observability/datadog'
import { RetrieverService } from './retriever'
import { RerankerService } from './reranker'
import { ContextProcessor } from './context-processor'
import { LLMService } from './llm-service'
import { FaithfulnessValidator } from './faithfulness'
import type {
	RAGRequest,
	RAGResponse,
	RAGMetrics,
	RAGLogEntry,
	SpanContext,
} from '@/types'

/**
 * RAGPipeline - Orchestrates the complete RAG workflow
 */
export class RAGPipeline {
	private supabase: SupabaseClient
	private retriever: RetrieverService
	private reranker: RerankerService
	private contextProcessor: ContextProcessor
	private llmService: LLMService
	private faithfulnessValidator: FaithfulnessValidator
	private maxSelfRAGAttempts: number

	constructor(supabase: SupabaseClient) {
		this.supabase = supabase
		this.retriever = new RetrieverService(supabase)
		this.reranker = new RerankerService()
		this.contextProcessor = new ContextProcessor()
		this.llmService = new LLMService()
		this.faithfulnessValidator = new FaithfulnessValidator()
		this.maxSelfRAGAttempts = config.rag.maxSelfRAGAttempts
	}

	/**
	 * Execute the complete RAG pipeline
	 */
	async execute(request: RAGRequest): Promise<RAGResponse> {
		const startTime = Date.now()
		const traceContext = datadog.createTraceContext()
		const traceId = traceContext.trace_id

		// Hash user ID for privacy
		const userIdHash = request.user_id
			? hashUserId(request.user_id)
			: undefined

		// Initialize metrics
		const metrics: RAGMetrics = {
			retrieval_latency_ms: 0,
			llm_latency_ms: 0,
			total_latency_ms: 0,
			context_token_count: 0,
			response_token_count: 0,
			cost_usd: 0,
			self_rag_attempts: 0,
		}

		try {
			// Start API request span
			const apiSpanId = datadog.startSpan('api.request', traceContext, {
				tenant: request.tenant_id,
				user_id_hash: userIdHash || 'anonymous',
				lang: request.language || 'fr',
				query_type: this.classifyQueryType(request.query),
			})

			// Execute Self-RAG loop
			const response = await this.executeWithSelfRAG(
				request,
				traceContext,
				metrics
			)

			// End API span
			datadog.endSpan(traceContext, apiSpanId, {
				faithfulness_score: response.faithfulness_score,
				abstained: response.abstained,
			})

			// Calculate total metrics
			metrics.total_latency_ms = Date.now() - startTime

			// Log the query
			await this.logQuery(request, response, metrics, traceId, userIdHash)

			return {
				...response,
				trace_id: traceId,
				metrics,
			}
		} catch (error) {
			console.error('[RAG Pipeline] Error:', error)

			// Log error
			datadog.recordMetric('rag.pipeline.error', 1, {
				tenant: request.tenant_id,
				error_type: (error as Error).name,
			})

			throw error
		}
	}

	/**
	 * Execute RAG with Self-RAG retry mechanism
	 */
	private async executeWithSelfRAG(
		request: RAGRequest,
		context: SpanContext,
		metrics: RAGMetrics
	): Promise<Omit<RAGResponse, 'trace_id' | 'metrics'>> {
		let attempt = 0
		let expandedTopK = request.options?.top_k ?? config.rag.topK

		while (attempt <= this.maxSelfRAGAttempts) {
			metrics.self_rag_attempts = attempt

			// Step 1: Retrieval
			const retrievalResult = await this.retriever.retrieve(
				request.query,
				request.tenant_id,
				context,
				request.filters,
				{ topK: expandedTopK }
			)

			metrics.retrieval_latency_ms = retrievalResult.latency_ms

			// Check for empty retrieval
			if (retrievalResult.chunks.length === 0) {
				datadog.recordAbstention(request.tenant_id)
				return {
					answer: this.faithfulnessValidator.getAbstentionMessage(),
					sources: [],
					faithfulness_score: 0,
					abstained: true,
				}
			}

			// Step 2: Rerank
			const rerankedResult = await this.reranker.rerank(
				request.query,
				retrievalResult.chunks,
				context,
				request.tenant_id
			)

			// Step 3: Process context
			const processedContext = await this.contextProcessor.process(
				rerankedResult.chunks,
				request.query,
				context,
				request.tenant_id
			)

			metrics.context_token_count = processedContext.tokenCount

			// Step 4: Generate LLM response
			const llmResponse = await this.llmService.generateRAGResponse(
				request.query,
				processedContext.context,
				context,
				request.tenant_id,
				{
					provider: request.options?.provider,
					model: request.options?.model,
				}
			)

			metrics.llm_latency_ms = llmResponse.latency_ms
			metrics.response_token_count = llmResponse.usage.completion_tokens
			metrics.cost_usd += calculateCost(
				llmResponse.model,
				llmResponse.usage.prompt_tokens,
				llmResponse.usage.completion_tokens
			)

			// Step 5: Validate faithfulness
			const faithfulness = await this.faithfulnessValidator.validate(
				llmResponse.content,
				processedContext.context,
				request.query,
				context,
				request.tenant_id
			)

			// Check if we should abstain
			if (this.faithfulnessValidator.shouldAbstain(faithfulness.score)) {
				datadog.recordAbstention(request.tenant_id)
				return {
					answer: this.faithfulnessValidator.getAbstentionMessage(),
					sources: processedContext.sources,
					faithfulness_score: faithfulness.score,
					abstained: true,
				}
			}

			// Check if we should retry with expanded context
			if (
				this.faithfulnessValidator.shouldRetry(faithfulness.score) &&
				attempt < this.maxSelfRAGAttempts
			) {
				console.log(
					`[Self-RAG] Retry ${attempt + 1}/${this.maxSelfRAGAttempts} - Score: ${faithfulness.score.toFixed(2)}`
				)
				attempt++
				expandedTopK = Math.min(expandedTopK + 3, 15) // Expand search
				continue
			}

			// Success!
			return {
				answer: llmResponse.content,
				sources: processedContext.sources,
				faithfulness_score: faithfulness.score,
				abstained: false,
			}
		}

		// Should never reach here, but just in case
		datadog.recordAbstention(request.tenant_id)
		return {
			answer: this.faithfulnessValidator.getAbstentionMessage(),
			sources: [],
			faithfulness_score: 0,
			abstained: true,
		}
	}

	/**
	 * Classify the type of query
	 */
	private classifyQueryType(query: string): string {
		const lowerQuery = query.toLowerCase()

		if (lowerQuery.match(/^(qui|what|who|quel|quelle)/)) return 'factual'
		if (lowerQuery.match(/^(pourquoi|why)/)) return 'reasoning'
		if (lowerQuery.match(/^(comment|how)/)) return 'procedural'
		if (lowerQuery.match(/^(compare|différence|versus)/)) return 'comparison'
		if (lowerQuery.length > 200) return 'complex'

		return 'general'
	}

	/**
	 * Log the RAG query to database and Datadog
	 */
	private async logQuery(
		request: RAGRequest,
		response: Omit<RAGResponse, 'trace_id' | 'metrics'>,
		metrics: RAGMetrics,
		traceId: string,
		userIdHash?: string
	): Promise<void> {
		// Log to Datadog
		const logEntry: RAGLogEntry = {
			trace_id: traceId,
			tenant: request.tenant_id,
			query: request.query,
			retrieval: {
				lexical_hits: 0, // TODO: Get from retrieval result
				vector_hits: 0,
				top_k_similarity: 0,
			},
			llm: {
				model: request.options?.model || config.llm.defaultModel,
				latency_ms: metrics.llm_latency_ms,
			},
			faithfulness_score: response.faithfulness_score,
			abstained: response.abstained,
			sources: response.sources.map((s) => s.document_id),
			cost_usd: metrics.cost_usd,
			timestamp: new Date().toISOString(),
		}

		datadog.logRAGQuery(logEntry)

		// Log to database
		try {
			await this.supabase.from('rag_queries').insert({
				trace_id: traceId,
				tenant_id: request.tenant_id,
				user_id_hash: userIdHash,
				query: request.query,
				language: request.language || 'fr',
				query_type: this.classifyQueryType(request.query),
				retrieval_latency_ms: metrics.retrieval_latency_ms,
				llm_model: request.options?.model || config.llm.defaultModel,
				llm_latency_ms: metrics.llm_latency_ms,
				context_token_count: metrics.context_token_count,
				response_token_count: metrics.response_token_count,
				faithfulness_score: response.faithfulness_score,
				abstained: response.abstained,
				self_rag_attempts: metrics.self_rag_attempts,
				cost_usd: metrics.cost_usd,
				response: response.answer,
				sources: response.sources.map((s) => s.document_id),
			})
		} catch (error) {
			console.error('[RAG Pipeline] Failed to log query:', error)
		}
	}
}
