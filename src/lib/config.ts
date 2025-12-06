// =============================================
// RAGGuard Configuration
// =============================================

import type { LLMProvider } from '@/types'

export const config = {
	// Supabase
	supabase: {
		url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
		anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
		serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
	},

	// LLM
	llm: {
		defaultProvider: (process.env.DEFAULT_LLM_PROVIDER || 'google') as LLMProvider,
		defaultModel: process.env.DEFAULT_LLM_MODEL || 'gemini-2.0-flash-exp',
		google: {
			apiKey: process.env.GOOGLE_API_KEY!,
		},
		openai: {
			apiKey: process.env.OPENAI_API_KEY!,
		},
		anthropic: {
			apiKey: process.env.ANTHROPIC_API_KEY!,
		},
		groq: {
			apiKey: process.env.GROQ_API_KEY!,
		},
	},

	// Embedding
	embedding: {
		model: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
		// Google text-embedding-004 = 768, OpenAI text-embedding-3-small = 1536
		dimensions: parseInt(process.env.EMBEDDING_DIMENSIONS || '768', 10),
	},

	// RAG
	rag: {
		topK: parseInt(process.env.RAG_TOP_K || '5', 10),
		similarityThreshold: parseFloat(process.env.RAG_SIMILARITY_THRESHOLD || '0.7'),
		faithfulnessThreshold: parseFloat(process.env.RAG_FAITHFULNESS_THRESHOLD || '0.75'),
		abstentionThreshold: parseFloat(process.env.RAG_ABSTENTION_THRESHOLD || '0.5'),
		maxContextTokens: parseInt(process.env.RAG_MAX_CONTEXT_TOKENS || '4000', 10),
		maxSelfRAGAttempts: parseInt(process.env.RAG_MAX_SELF_RAG_ATTEMPTS || '2', 10),
	},

	// Datadog
	datadog: {
		apiKey: process.env.DD_API_KEY!,
		appKey: process.env.DD_APP_KEY!,
		site: process.env.DD_SITE || 'datadoghq.eu',
		env: process.env.DD_ENV || 'development',
		service: process.env.DD_SERVICE || 'ragguard',
		version: process.env.DD_VERSION || '1.0.0',
	},

	// Security
	security: {
		jwtSecret: process.env.JWT_SECRET!,
		hashSalt: process.env.HASH_SALT!,
	},
} as const

// LLM Model Pricing (USD per 1K tokens)
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
	// Google Gemini (default)
	'gemini-2.0-flash-exp': { input: 0.0, output: 0.0 }, // Free during preview
	'gemini-1.5-pro': { input: 0.00125, output: 0.005 },
	'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },
	'gemini-1.5-flash-8b': { input: 0.0000375, output: 0.00015 },
	// OpenAI
	'gpt-4o': { input: 0.0025, output: 0.01 },
	'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
	'gpt-4-turbo': { input: 0.01, output: 0.03 },
	'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
	// Anthropic
	'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
	'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
	'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
	// Groq
	'llama-3.1-70b-versatile': { input: 0.00059, output: 0.00079 },
	'llama-3.1-8b-instant': { input: 0.00005, output: 0.00008 },
	'mixtral-8x7b-32768': { input: 0.00024, output: 0.00024 },
}

export function calculateCost(
	model: string,
	inputTokens: number,
	outputTokens: number
): number {
	const pricing = MODEL_PRICING[model] || { input: 0.001, output: 0.002 }
	return (inputTokens * pricing.input + outputTokens * pricing.output) / 1000
}
