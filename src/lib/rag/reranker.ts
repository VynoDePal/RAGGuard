// =============================================
// Reranker Service - Cross-Encoder Reranking
// =============================================

import OpenAI from 'openai'
import { config } from '@/lib/config'
import { datadog } from '@/lib/observability/datadog'
import type { RerankedResult, ScoredChunk, SpanContext } from '@/types'

// Lazy initialization to avoid build errors
let _openai: OpenAI | null = null

function getOpenAIClient(): OpenAI {
	if (!_openai) {
		_openai = new OpenAI({ apiKey: config.llm.openai.apiKey || '' })
	}
	return _openai
}

/**
 * RerankerService - Reranks chunks using LLM-based cross-encoder
 */
export class RerankerService {
	private topK: number

	constructor(topK: number = config.rag.topK) {
		this.topK = topK
	}

	/**
	 * Rerank chunks using LLM-based relevance scoring
	 */
	async rerank(
		query: string,
		chunks: ScoredChunk[],
		context: SpanContext,
		tenantId: string
	): Promise<RerankedResult> {
		if (chunks.length === 0) {
			return {
				chunks: [],
				top_k_similarity: 0,
				latency_ms: 0,
			}
		}

		// If we have few chunks, skip expensive reranking
		if (chunks.length <= this.topK) {
			const avgSimilarity =
				chunks.reduce((sum, c) => sum + c.score, 0) / chunks.length

			return {
				chunks,
				top_k_similarity: avgSimilarity,
				latency_ms: 0,
			}
		}

		const { result, duration } = await datadog.withSpan(
			'retrieval.rerank',
			context,
			{ tenant: tenantId, chunk_count: chunks.length },
			async () => {
				// Prepare passages for reranking
				const passages = chunks.map((c, i) => ({
					id: i,
					content: c.content.substring(0, 500), // Limit content length
				}))

				// Use LLM to score relevance
				const scoredPassages = await this.scorePassagesWithLLM(query, passages)

				// Merge scores with original chunks
				const rerankedChunks = chunks
					.map((chunk, i) => ({
						...chunk,
						score: scoredPassages[i]?.score ?? chunk.score,
					}))
					.sort((a, b) => b.score - a.score)
					.slice(0, this.topK)

				const topKSimilarity =
					rerankedChunks.reduce((sum, c) => sum + c.score, 0) /
					rerankedChunks.length

				return {
					chunks: rerankedChunks,
					top_k_similarity: topKSimilarity,
				}
			}
		)

		// Record metrics
		datadog.recordRerankSimilarity(result.top_k_similarity, tenantId)

		return {
			...result,
			latency_ms: duration,
		}
	}

	/**
	 * Score passages using LLM
	 */
	private async scorePassagesWithLLM(
		query: string,
		passages: Array<{ id: number; content: string }>
	): Promise<Array<{ id: number; score: number }>> {
		const systemPrompt = `Tu es un expert en évaluation de pertinence de documents.
Pour chaque passage, évalue sa pertinence par rapport à la question sur une échelle de 0 à 1.
Réponds UNIQUEMENT avec un JSON array de scores, sans explication.

Critères:
- 1.0: Le passage répond directement et complètement à la question
- 0.8-0.9: Le passage contient des informations très pertinentes
- 0.5-0.7: Le passage contient des informations partiellement pertinentes
- 0.2-0.4: Le passage a un lien indirect avec la question
- 0.0-0.1: Le passage n'est pas pertinent

Format de réponse attendu: [0.8, 0.6, 0.9, ...]`

		const userPrompt = `Question: "${query}"

Passages:
${passages.map((p, i) => `[${i}] ${p.content}`).join('\n\n')}

Scores de pertinence (JSON array):`.trim()

		try {
			const response = await getOpenAIClient().chat.completions.create({
				model: 'gpt-4o-mini', // Use fast model for reranking
				messages: [
					{ role: 'system', content: systemPrompt },
					{ role: 'user', content: userPrompt },
				],
				temperature: 0,
				max_tokens: 200,
			})

			const content = response.choices[0]?.message?.content || '[]'

			// Parse scores from response
			const jsonMatch = content.match(/\[[\d.,\s]+\]/)
			if (!jsonMatch) {
				console.warn('Failed to parse reranker response:', content)
				return passages.map((p) => ({ id: p.id, score: 0.5 }))
			}

			const scores: number[] = JSON.parse(jsonMatch[0])

			return passages.map((p, i) => ({
				id: p.id,
				score: Math.max(0, Math.min(1, scores[i] ?? 0.5)),
			}))
		} catch (error) {
			console.error('Reranking error:', error)
			// Return original order with neutral scores
			return passages.map((p) => ({ id: p.id, score: 0.5 }))
		}
	}

	/**
	 * Simple keyword-based reranking (fallback)
	 */
	keywordRerank(query: string, chunks: ScoredChunk[]): ScoredChunk[] {
		const queryTerms = query
			.toLowerCase()
			.split(/\s+/)
			.filter((t) => t.length > 2)

		return chunks
			.map((chunk) => {
				const content = chunk.content.toLowerCase()
				let boost = 0

				for (const term of queryTerms) {
					if (content.includes(term)) {
						boost += 0.1
					}
				}

				return {
					...chunk,
					score: Math.min(chunk.score + boost, 1),
				}
			})
			.sort((a, b) => b.score - a.score)
			.slice(0, this.topK)
	}
}
