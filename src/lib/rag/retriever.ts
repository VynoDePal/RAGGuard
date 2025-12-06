// =============================================
// Retriever Service - Lexical + Vector Search
// =============================================

import { SupabaseClient } from '@supabase/supabase-js'
import { config } from '@/lib/config'
import { measureTime } from '@/lib/utils'
import { generateEmbedding, formatEmbeddingForPgVector } from './embedding'
import { datadog } from '@/lib/observability/datadog'
import type {
	DocumentChunk,
	MetadataFilters,
	RetrievalResult,
	ScoredChunk,
	SpanContext,
} from '@/types'

interface RetrieverOptions {
	topK?: number
	similarityThreshold?: number
	useHybrid?: boolean
	lexicalWeight?: number
	vectorWeight?: number
}

/**
 * RetrieverService - Handles lexical and vector search
 */
export class RetrieverService {
	private supabase: SupabaseClient
	private defaultOptions: Required<RetrieverOptions>

	constructor(supabase: SupabaseClient, options: RetrieverOptions = {}) {
		this.supabase = supabase
		this.defaultOptions = {
			topK: options.topK ?? config.rag.topK,
			similarityThreshold: options.similarityThreshold ?? config.rag.similarityThreshold,
			useHybrid: options.useHybrid ?? true,
			lexicalWeight: options.lexicalWeight ?? 0.3,
			vectorWeight: options.vectorWeight ?? 0.7,
		}
	}

	/**
	 * Main retrieval method - combines lexical and vector search
	 */
	async retrieve(
		query: string,
		tenantId: string,
		context: SpanContext,
		filters?: MetadataFilters,
		options?: RetrieverOptions
	): Promise<RetrievalResult> {
		const opts = { ...this.defaultOptions, ...options }

		// Start main retrieval span
		const startTime = Date.now()

		try {
			// Generate query embedding
			const queryEmbedding = await datadog.withSpan(
				'retrieval.embedding',
				context,
				{ tenant: tenantId },
				() => generateEmbedding(query)
			)

			// Run lexical and vector search in parallel
			const [lexicalResult, vectorResult] = await Promise.all([
				this.lexicalSearch(query, tenantId, context, filters, opts.topK * 2),
				this.vectorSearch(
					queryEmbedding.result,
					tenantId,
					context,
					filters,
					opts.topK * 2,
					opts.similarityThreshold
				),
			])

			// Fuse results
			const fusedChunks = this.fuseResults(
				lexicalResult.chunks,
				vectorResult.chunks,
				opts.lexicalWeight,
				opts.vectorWeight,
				opts.topK
			)

			const latencyMs = Date.now() - startTime

			// Record metrics
			datadog.recordRetrievalLatency(latencyMs, tenantId)
			datadog.recordRetrievalSuccess(fusedChunks.length > 0, tenantId)

			return {
				chunks: fusedChunks,
				lexical_hits: lexicalResult.chunks.length,
				vector_hits: vectorResult.chunks.length,
				latency_ms: latencyMs,
			}
		} catch (error) {
			datadog.recordRetrievalSuccess(false, tenantId)
			throw error
		}
	}

	/**
	 * Lexical search using PostgreSQL full-text search with trigrams
	 */
	private async lexicalSearch(
		query: string,
		tenantId: string,
		context: SpanContext,
		filters?: MetadataFilters,
		limit: number = 20
	): Promise<{ chunks: ScoredChunk[]; latency: number }> {
		return datadog.withSpan(
			'retrieval.lexical',
			context,
			{ tenant: tenantId, query_length: query.length },
			async () => {
				// Prepare search query - escape special characters
				const searchTerms = query
					.toLowerCase()
					.replace(/[^\w\s]/g, ' ')
					.split(/\s+/)
					.filter((t) => t.length > 2)
					.slice(0, 10)

				if (searchTerms.length === 0) {
					return { chunks: [], latency: 0 }
				}

				// Build the query with trigram similarity
				let queryBuilder = this.supabase
					.from('document_chunks')
					.select(`
						*,
						documents!inner(title, domain, language)
					`)
					.eq('tenant_id', tenantId)

				// Apply filters
				if (filters?.category) {
					queryBuilder = queryBuilder.eq('documents.metadata->>category', filters.category)
				}
				if (filters?.tags && filters.tags.length > 0) {
					queryBuilder = queryBuilder.contains('documents.metadata->tags', filters.tags)
				}

				// Use trigram similarity for fuzzy matching
				// We'll filter and score in application for now
				const { data, error } = await queryBuilder.limit(limit * 3)

				if (error) {
					console.error('Lexical search error:', error)
					return { chunks: [], latency: 0 }
				}

				// Score chunks by term matching
				const scoredChunks: ScoredChunk[] = (data || [])
					.map((chunk) => {
						const content = chunk.content.toLowerCase()
						let matchCount = 0
						let matchScore = 0

						for (const term of searchTerms) {
							if (content.includes(term)) {
								matchCount++
								// Boost exact word matches
								const wordRegex = new RegExp(`\\b${term}\\b`, 'gi')
								const wordMatches = (content.match(wordRegex) || []).length
								matchScore += wordMatches * 2 + 1
							}
						}

						const score = matchCount > 0 ? matchScore / (searchTerms.length * 3) : 0

						return {
							...chunk,
							score: Math.min(score, 1),
							score_type: 'lexical' as const,
						}
					})
					.filter((c) => c.score > 0.1)
					.sort((a, b) => b.score - a.score)
					.slice(0, limit)

				return { chunks: scoredChunks, latency: 0 }
			}
		).then((r) => ({ chunks: r.result.chunks, latency: r.duration }))
	}

	/**
	 * Vector search using pgvector
	 */
	private async vectorSearch(
		queryEmbedding: number[],
		tenantId: string,
		context: SpanContext,
		filters?: MetadataFilters,
		limit: number = 20,
		threshold: number = 0.5
	): Promise<{ chunks: ScoredChunk[]; latency: number }> {
		return datadog.withSpan(
			'retrieval.vector',
			context,
			{ tenant: tenantId },
			async () => {
				// Use RPC function for vector search with filtering
				const { data, error } = await this.supabase.rpc('search_chunks_vector', {
					query_embedding: formatEmbeddingForPgVector(queryEmbedding),
					p_tenant_id: tenantId,
					p_similarity_threshold: threshold,
					p_limit: limit,
					p_domain: filters?.category || null,
				})

				if (error) {
					console.error('Vector search error:', error)
					return { chunks: [], latency: 0 }
				}

				const scoredChunks: ScoredChunk[] = (data || []).map(
					(row: DocumentChunk & { similarity: number }) => ({
						...row,
						score: row.similarity,
						score_type: 'vector' as const,
					})
				)

				return { chunks: scoredChunks, latency: 0 }
			}
		).then((r) => ({ chunks: r.result.chunks, latency: r.duration }))
	}

	/**
	 * Fuse lexical and vector search results using Reciprocal Rank Fusion (RRF)
	 */
	private fuseResults(
		lexicalChunks: ScoredChunk[],
		vectorChunks: ScoredChunk[],
		lexicalWeight: number,
		vectorWeight: number,
		topK: number
	): ScoredChunk[] {
		const chunkScores = new Map<string, { chunk: ScoredChunk; score: number }>()
		const k = 60 // RRF constant

		// Process lexical results
		lexicalChunks.forEach((chunk, rank) => {
			const rrfScore = lexicalWeight * (1 / (k + rank + 1))
			const existing = chunkScores.get(chunk.id)

			if (existing) {
				existing.score += rrfScore
			} else {
				chunkScores.set(chunk.id, {
					chunk: { ...chunk, score_type: 'hybrid' },
					score: rrfScore,
				})
			}
		})

		// Process vector results
		vectorChunks.forEach((chunk, rank) => {
			const rrfScore = vectorWeight * (1 / (k + rank + 1))
			const existing = chunkScores.get(chunk.id)

			if (existing) {
				existing.score += rrfScore
				// Preserve higher similarity score
				if (chunk.score > existing.chunk.score) {
					existing.chunk.score = chunk.score
				}
			} else {
				chunkScores.set(chunk.id, {
					chunk: { ...chunk, score_type: 'hybrid' },
					score: rrfScore,
				})
			}
		})

		// Sort by fused score and return top K
		return Array.from(chunkScores.values())
			.sort((a, b) => b.score - a.score)
			.slice(0, topK)
			.map(({ chunk, score }) => ({
				...chunk,
				score: Math.min(score * 10, 1), // Normalize score
			}))
	}
}
