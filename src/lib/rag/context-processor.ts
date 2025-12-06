// =============================================
// Context Processor - Prepare context for LLM
// =============================================

import { config } from '@/lib/config'
import { countTokens, truncateToTokenLimit } from '@/lib/utils/tokens'
import { datadog } from '@/lib/observability/datadog'
import type { ScoredChunk, SourceReference, SpanContext } from '@/types'

interface ProcessedContext {
	context: string
	sources: SourceReference[]
	tokenCount: number
}

/**
 * ContextProcessor - Prepares and optimizes context for LLM
 */
export class ContextProcessor {
	private maxTokens: number
	private model: string

	constructor(maxTokens: number = config.rag.maxContextTokens, model: string = 'gpt-4') {
		this.maxTokens = maxTokens
		this.model = model
	}

	/**
	 * Process chunks into optimized context
	 */
	async process(
		chunks: ScoredChunk[],
		query: string,
		context: SpanContext,
		tenantId: string
	): Promise<ProcessedContext> {
		const { result, duration } = await datadog.withSpan(
			'context.chunking',
			context,
			{ tenant: tenantId, chunk_count: chunks.length },
			async () => {
				// Remove duplicates
				const uniqueChunks = this.deduplicateChunks(chunks)

				// Build context with token budgeting
				const { contextText, includedChunks } = this.buildContext(
					uniqueChunks,
					query
				)

				// Build source references
				const sources = this.buildSourceReferences(includedChunks)

				// Count tokens
				const tokenCount = countTokens(contextText, this.model)

				return {
					context: contextText,
					sources,
					tokenCount,
				}
			}
		)

		console.log(`[Context] Processed ${chunks.length} chunks in ${duration}ms`)

		return result
	}

	/**
	 * Remove duplicate or highly similar chunks
	 */
	private deduplicateChunks(chunks: ScoredChunk[]): ScoredChunk[] {
		const seen = new Set<string>()
		const unique: ScoredChunk[] = []

		for (const chunk of chunks) {
			// Create a fingerprint from first 100 chars
			const fingerprint = chunk.content.substring(0, 100).toLowerCase().trim()

			// Check for similar content
			let isDuplicate = false
			for (const existing of seen) {
				if (this.jaccardSimilarity(fingerprint, existing) > 0.7) {
					isDuplicate = true
					break
				}
			}

			if (!isDuplicate) {
				seen.add(fingerprint)
				unique.push(chunk)
			}
		}

		return unique
	}

	/**
	 * Calculate Jaccard similarity between two strings
	 */
	private jaccardSimilarity(a: string, b: string): number {
		const setA = new Set(a.split(/\s+/))
		const setB = new Set(b.split(/\s+/))

		const intersection = new Set([...setA].filter((x) => setB.has(x)))
		const union = new Set([...setA, ...setB])

		return intersection.size / union.size
	}

	/**
	 * Build context string with token budgeting
	 */
	private buildContext(
		chunks: ScoredChunk[],
		query: string
	): { contextText: string; includedChunks: ScoredChunk[] } {
		const includedChunks: ScoredChunk[] = []
		const contextParts: string[] = []

		// Reserve tokens for query and system prompt overhead
		const reservedTokens = countTokens(query, this.model) + 500
		let availableTokens = this.maxTokens - reservedTokens

		for (const chunk of chunks) {
			// Calculate tokens for this chunk with formatting
			const formattedChunk = this.formatChunk(chunk, includedChunks.length + 1)
			const chunkTokens = countTokens(formattedChunk, this.model)

			if (chunkTokens > availableTokens) {
				// Try to fit a truncated version
				if (availableTokens > 100) {
					const truncated = truncateToTokenLimit(
						formattedChunk,
						availableTokens,
						this.model
					)
					contextParts.push(truncated)
					includedChunks.push(chunk)
				}
				break
			}

			contextParts.push(formattedChunk)
			includedChunks.push(chunk)
			availableTokens -= chunkTokens

			// Limit to 8 chunks maximum
			if (includedChunks.length >= 8) {
				break
			}
		}

		// Add context header
		const header = `=== Documents de référence ===\n\n`
		const contextText = header + contextParts.join('\n\n---\n\n')

		return { contextText, includedChunks }
	}

	/**
	 * Format a chunk for inclusion in context
	 */
	private formatChunk(chunk: ScoredChunk, index: number): string {
		const metadata = chunk.metadata || {}
		const title = metadata.section_title || `Document ${chunk.document_id.substring(0, 8)}`

		return `[Source ${index}] ${title}
Pertinence: ${(chunk.score * 100).toFixed(0)}%

${chunk.content}`
	}

	/**
	 * Build source references for response
	 */
	private buildSourceReferences(chunks: ScoredChunk[]): SourceReference[] {
		return chunks.map((chunk) => ({
			document_id: chunk.document_id,
			chunk_id: chunk.id,
			title: (chunk.metadata?.section_title as string) || 'Document',
			content_preview: chunk.content.substring(0, 150) + '...',
			similarity_score: chunk.score,
			metadata: chunk.metadata,
		}))
	}

	/**
	 * Highlight relevant passages in chunks
	 */
	highlightRelevantPassages(
		chunks: ScoredChunk[],
		query: string
	): ScoredChunk[] {
		const queryTerms = query
			.toLowerCase()
			.split(/\s+/)
			.filter((t) => t.length > 3)

		return chunks.map((chunk) => {
			let content = chunk.content

			// Wrap matching terms with highlight markers
			for (const term of queryTerms) {
				const regex = new RegExp(`(${term})`, 'gi')
				content = content.replace(regex, '**$1**')
			}

			return { ...chunk, content }
		})
	}

	/**
	 * Summarize chunks if they exceed token limit significantly
	 */
	async summarizeIfNeeded(
		chunks: ScoredChunk[],
		maxSummaryTokens: number = 1000
	): Promise<string> {
		const fullContent = chunks.map((c) => c.content).join('\n\n')
		const currentTokens = countTokens(fullContent, this.model)

		if (currentTokens <= maxSummaryTokens * 1.5) {
			// No need to summarize
			return fullContent
		}

		// TODO: Implement LLM-based summarization
		// For now, just truncate
		return truncateToTokenLimit(fullContent, maxSummaryTokens, this.model)
	}
}
