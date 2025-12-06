// =============================================
// Faithfulness Validation Service
// =============================================

import OpenAI from 'openai'
import { config } from '@/lib/config'
import { datadog } from '@/lib/observability/datadog'
import type { FaithfulnessResult, FaithfulnessIssue, SpanContext } from '@/types'

// Lazy initialization to avoid build errors
let _openai: OpenAI | null = null

function getOpenAIClient(): OpenAI {
	if (!_openai) {
		_openai = new OpenAI({ apiKey: config.llm.openai.apiKey || '' })
	}
	return _openai
}

/**
 * FaithfulnessValidator - Validates LLM responses against source documents
 */
export class FaithfulnessValidator {
	private faithfulnessThreshold: number
	private abstentionThreshold: number

	constructor(
		faithfulnessThreshold: number = config.rag.faithfulnessThreshold,
		abstentionThreshold: number = config.rag.abstentionThreshold
	) {
		this.faithfulnessThreshold = faithfulnessThreshold
		this.abstentionThreshold = abstentionThreshold
	}

	/**
	 * Validate faithfulness of a response against source context
	 */
	async validate(
		response: string,
		context: string,
		query: string,
		spanContext: SpanContext,
		tenantId: string
	): Promise<FaithfulnessResult> {
		const { result, duration } = await datadog.withSpan(
			'validation.faithfulness',
			spanContext,
			{ tenant: tenantId },
			async () => {
				// Use LLM to evaluate faithfulness
				const evaluation = await this.evaluateWithLLM(response, context, query)

				// Record metrics
				datadog.recordFaithfulnessScore(evaluation.score, tenantId)

				return evaluation
			}
		)

		console.log(`[Faithfulness] Score: ${result.score.toFixed(2)} (${duration}ms)`)

		return result
	}

	/**
	 * Evaluate faithfulness using LLM
	 */
	private async evaluateWithLLM(
		response: string,
		context: string,
		query: string
	): Promise<FaithfulnessResult> {
		const systemPrompt = `Tu es un évaluateur expert de la fidélité des réponses IA.
Ton rôle est de vérifier si une réponse est fidèle aux documents sources.

Évalue la réponse selon ces critères:
1. ANCRAGE: Chaque affirmation est-elle supportée par les documents?
2. PRÉCISION: Les informations citées sont-elles exactes?
3. COMPLÉTUDE: Les informations importantes sont-elles incluses?
4. COHÉRENCE: La réponse est-elle cohérente avec les sources?

Réponds UNIQUEMENT avec un JSON valide dans ce format:
{
  "score": 0.85,
  "is_faithful": true,
  "confidence": 0.9,
  "issues": [
    {
      "type": "unsupported_claim",
      "description": "L'affirmation X n'est pas dans les documents",
      "severity": "medium"
    }
  ]
}

Types de problèmes possibles:
- hallucination: Information inventée
- unsupported_claim: Affirmation non supportée
- contradiction: Contradiction avec les sources
- uncertainty: Incertitude non exprimée`

		const userPrompt = `=== Documents Sources ===
${context}

=== Question ===
${query}

=== Réponse à évaluer ===
${response}

=== Évaluation (JSON) ===`

		try {
			const completion = await getOpenAIClient().chat.completions.create({
				model: 'gpt-4o-mini',
				messages: [
					{ role: 'system', content: systemPrompt },
					{ role: 'user', content: userPrompt },
				],
				temperature: 0,
				max_tokens: 500,
			})

			const content = completion.choices[0]?.message?.content || '{}'

			// Parse JSON response
			const jsonMatch = content.match(/\{[\s\S]*\}/)
			if (!jsonMatch) {
				console.warn('Failed to parse faithfulness response:', content)
				return this.fallbackEvaluation(response, context)
			}

			const evaluation = JSON.parse(jsonMatch[0]) as {
				score: number
				is_faithful: boolean
				confidence: number
				issues?: FaithfulnessIssue[]
			}

			return {
				score: Math.max(0, Math.min(1, evaluation.score)),
				is_faithful: evaluation.score >= this.faithfulnessThreshold,
				confidence: evaluation.confidence || 0.8,
				issues: evaluation.issues || [],
			}
		} catch (error) {
			console.error('Faithfulness evaluation error:', error)
			return this.fallbackEvaluation(response, context)
		}
	}

	/**
	 * Fallback evaluation using heuristics
	 */
	private fallbackEvaluation(
		response: string,
		context: string
	): FaithfulnessResult {
		const issues: FaithfulnessIssue[] = []
		let score = 0.7

		// Check for uncertainty indicators
		const uncertaintyPhrases = [
			'je ne suis pas sûr',
			"je n'ai pas trouvé",
			'il semble que',
			'peut-être',
			'probablement',
		]

		for (const phrase of uncertaintyPhrases) {
			if (response.toLowerCase().includes(phrase)) {
				score -= 0.05
				issues.push({
					type: 'uncertainty',
					description: `Expression d'incertitude détectée: "${phrase}"`,
					severity: 'low',
				})
			}
		}

		// Check for content overlap
		const responseWords = new Set(
			response.toLowerCase().split(/\s+/).filter((w) => w.length > 4)
		)
		const contextWords = new Set(
			context.toLowerCase().split(/\s+/).filter((w) => w.length > 4)
		)

		const overlap = [...responseWords].filter((w) => contextWords.has(w)).length
		const overlapRatio = overlap / responseWords.size

		if (overlapRatio < 0.3) {
			score -= 0.2
			issues.push({
				type: 'unsupported_claim',
				description: 'Faible chevauchement entre la réponse et les sources',
				severity: 'medium',
			})
		}

		// Check response length
		if (response.length > context.length * 0.8) {
			score -= 0.1
			issues.push({
				type: 'hallucination',
				description: 'Réponse potentiellement trop détaillée par rapport aux sources',
				severity: 'low',
			})
		}

		return {
			score: Math.max(0, Math.min(1, score)),
			is_faithful: score >= this.faithfulnessThreshold,
			confidence: 0.5,
			issues,
		}
	}

	/**
	 * Check if response should trigger abstention
	 */
	shouldAbstain(score: number): boolean {
		return score < this.abstentionThreshold
	}

	/**
	 * Check if response should trigger self-RAG retry
	 */
	shouldRetry(score: number): boolean {
		return score >= this.abstentionThreshold && score < this.faithfulnessThreshold
	}

	/**
	 * Get abstention message
	 */
	getAbstentionMessage(): string {
		return "Désolé, je n'ai pas trouvé d'information fiable dans mes sources pour répondre à cette question. Pourriez-vous reformuler ou préciser votre demande ?"
	}
}
