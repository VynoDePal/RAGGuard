// =============================================
// LLM Service - Multi-Provider Support
// =============================================

import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import Groq from 'groq-sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { config, calculateCost } from '@/lib/config'
import { datadog } from '@/lib/observability/datadog'
import type {
	LLMProvider,
	LLMRequest,
	LLMResponse,
	LLMMessage,
	SpanContext,
} from '@/types'

// Lazy initialization of clients to avoid build errors
let _google: GoogleGenerativeAI | null = null
let _openai: OpenAI | null = null
let _anthropic: Anthropic | null = null
let _groq: Groq | null = null

function getGoogleClient(): GoogleGenerativeAI {
	if (!_google) {
		_google = new GoogleGenerativeAI(config.llm.google.apiKey || '')
	}
	return _google
}

function getOpenAIClient(): OpenAI {
	if (!_openai) {
		_openai = new OpenAI({ apiKey: config.llm.openai.apiKey || '' })
	}
	return _openai
}

function getAnthropicClient(): Anthropic {
	if (!_anthropic) {
		_anthropic = new Anthropic({ apiKey: config.llm.anthropic.apiKey || '' })
	}
	return _anthropic
}

function getGroqClient(): Groq {
	if (!_groq) {
		_groq = new Groq({ apiKey: config.llm.groq.apiKey || '' })
	}
	return _groq
}

/**
 * LLMService - Unified interface for multiple LLM providers
 */
export class LLMService {
	private defaultProvider: LLMProvider
	private defaultModel: string

	constructor(
		provider: LLMProvider = config.llm.defaultProvider,
		model: string = config.llm.defaultModel
	) {
		this.defaultProvider = provider
		this.defaultModel = model
	}

	/**
	 * Generate a response using the specified LLM
	 */
	async generate(
		messages: LLMMessage[],
		context: SpanContext,
		tenantId: string,
		options?: Partial<LLMRequest>
	): Promise<LLMResponse> {
		const provider = options?.provider ?? this.defaultProvider
		const model = options?.model ?? this.defaultModel

		const { result, duration } = await datadog.withSpan(
			'llm.call',
			context,
			{ tenant: tenantId, provider, model },
			async () => {
				switch (provider) {
					case 'google':
						return this.generateGoogle(messages, model, options)
					case 'openai':
						return this.generateOpenAI(messages, model, options)
					case 'anthropic':
						return this.generateAnthropic(messages, model, options)
					case 'groq':
						return this.generateGroq(messages, model, options)
					default:
						throw new Error(`Unsupported provider: ${provider}`)
				}
			}
		)

		// Record metrics
		datadog.recordLLMLatency(duration, model, tenantId)
		const cost = calculateCost(
			model,
			result.usage.prompt_tokens,
			result.usage.completion_tokens
		)
		datadog.recordCost(cost, model, tenantId)

		return {
			...result,
			latency_ms: duration,
		}
	}

	/**
	 * Generate with Google Gemini
	 */
	private async generateGoogle(
		messages: LLMMessage[],
		model: string,
		options?: Partial<LLMRequest>
	): Promise<Omit<LLMResponse, 'latency_ms'>> {
		const geminiModel = getGoogleClient().getGenerativeModel({
			model,
			generationConfig: {
				maxOutputTokens: options?.max_tokens ?? 2000,
				temperature: options?.temperature ?? 0.7,
			},
		})

		// Extract system message and convert to Gemini format
		const systemMessage = messages.find((m) => m.role === 'system')
		const chatMessages = messages.filter((m) => m.role !== 'system')

		// Build history for multi-turn conversation
		const history = chatMessages.slice(0, -1).map((m) => ({
			role: m.role === 'assistant' ? 'model' : 'user',
			parts: [{ text: m.content }],
		}))

		// Get the last user message
		const lastMessage = chatMessages[chatMessages.length - 1]
		const userContent = systemMessage
			? `${systemMessage.content}\n\n${lastMessage.content}`
			: lastMessage.content

		// Start chat with history
		const chat = geminiModel.startChat({
			history: history as Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
		})

		const result = await chat.sendMessage(userContent)
		const response = result.response
		const text = response.text()

		// Estimate token counts (Gemini doesn't always return exact counts)
		const usageMetadata = response.usageMetadata
		const promptTokens = usageMetadata?.promptTokenCount ?? Math.ceil(userContent.length / 4)
		const completionTokens = usageMetadata?.candidatesTokenCount ?? Math.ceil(text.length / 4)

		return {
			content: text,
			model,
			usage: {
				prompt_tokens: promptTokens,
				completion_tokens: completionTokens,
				total_tokens: promptTokens + completionTokens,
			},
		}
	}

	/**
	 * Generate with OpenAI
	 */
	private async generateOpenAI(
		messages: LLMMessage[],
		model: string,
		options?: Partial<LLMRequest>
	): Promise<Omit<LLMResponse, 'latency_ms'>> {
		const response = await getOpenAIClient().chat.completions.create({
			model,
			messages: messages.map((m) => ({
				role: m.role,
				content: m.content,
			})),
			max_tokens: options?.max_tokens ?? 2000,
			temperature: options?.temperature ?? 0.7,
		})

		const choice = response.choices[0]

		return {
			content: choice?.message?.content || '',
			model: response.model,
			usage: {
				prompt_tokens: response.usage?.prompt_tokens || 0,
				completion_tokens: response.usage?.completion_tokens || 0,
				total_tokens: response.usage?.total_tokens || 0,
			},
		}
	}

	/**
	 * Generate with Anthropic
	 */
	private async generateAnthropic(
		messages: LLMMessage[],
		model: string,
		options?: Partial<LLMRequest>
	): Promise<Omit<LLMResponse, 'latency_ms'>> {
		// Extract system message
		const systemMessage = messages.find((m) => m.role === 'system')
		const chatMessages = messages.filter((m) => m.role !== 'system')

		const response = await getAnthropicClient().messages.create({
			model,
			max_tokens: options?.max_tokens ?? 2000,
			system: systemMessage?.content,
			messages: chatMessages.map((m) => ({
				role: m.role as 'user' | 'assistant',
				content: m.content,
			})),
		})

		const content =
			response.content[0]?.type === 'text' ? response.content[0].text : ''

		return {
			content,
			model: response.model,
			usage: {
				prompt_tokens: response.usage.input_tokens,
				completion_tokens: response.usage.output_tokens,
				total_tokens: response.usage.input_tokens + response.usage.output_tokens,
			},
		}
	}

	/**
	 * Generate with Groq
	 */
	private async generateGroq(
		messages: LLMMessage[],
		model: string,
		options?: Partial<LLMRequest>
	): Promise<Omit<LLMResponse, 'latency_ms'>> {
		const response = await getGroqClient().chat.completions.create({
			model,
			messages: messages.map((m) => ({
				role: m.role,
				content: m.content,
			})),
			max_tokens: options?.max_tokens ?? 2000,
			temperature: options?.temperature ?? 0.7,
		})

		const choice = response.choices[0]

		return {
			content: choice?.message?.content || '',
			model: response.model || model,
			usage: {
				prompt_tokens: response.usage?.prompt_tokens || 0,
				completion_tokens: response.usage?.completion_tokens || 0,
				total_tokens: response.usage?.total_tokens || 0,
			},
		}
	}

	/**
	 * Generate RAG response with context
	 */
	async generateRAGResponse(
		query: string,
		context: string,
		spanContext: SpanContext,
		tenantId: string,
		options?: Partial<LLMRequest>
	): Promise<LLMResponse> {
		const systemPrompt = `Tu es un assistant IA expert qui répond aux questions en te basant UNIQUEMENT sur les documents fournis.

RÈGLES STRICTES:
1. Base ta réponse UNIQUEMENT sur les informations présentes dans les documents fournis
2. Si l'information n'est pas dans les documents, dis-le clairement
3. Cite les sources pertinentes dans ta réponse
4. Ne fais JAMAIS d'affirmations non supportées par les documents
5. Si tu n'es pas sûr, exprime ton incertitude
6. Réponds de manière structurée et concise

FORMAT DE RÉPONSE:
- Commence par une réponse directe
- Ajoute des détails si nécessaire
- Termine par les sources utilisées`

		const userPrompt = `${context}

=== Question ===
${query}

=== Ta réponse (basée uniquement sur les documents ci-dessus) ===`

		const messages: LLMMessage[] = [
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: userPrompt },
		]

		return this.generate(messages, spanContext, tenantId, options)
	}
}
