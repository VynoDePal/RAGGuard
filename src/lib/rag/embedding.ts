// =============================================
// Embedding Service - Multi-Provider Support
// =============================================

import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { config } from '@/lib/config'
import { retry } from '@/lib/utils'

// Lazy initialization to avoid build errors
let _openai: OpenAI | null = null
let _google: GoogleGenerativeAI | null = null

function getOpenAIClient(): OpenAI {
	if (!_openai) {
		_openai = new OpenAI({ apiKey: config.llm.openai.apiKey || '' })
	}
	return _openai
}

function getGoogleClient(): GoogleGenerativeAI {
	if (!_google) {
		_google = new GoogleGenerativeAI(config.llm.google.apiKey || '')
	}
	return _google
}

// Determine which provider to use for embeddings
const embeddingProvider = config.llm.openai.apiKey && 
	!config.llm.openai.apiKey.includes('your_') ? 'openai' : 'google'

/**
 * Generate embeddings for a single text
 */
export async function generateEmbedding(text: string): Promise<number[]> {
	return retry(async () => {
		if (embeddingProvider === 'google') {
			return await generateGoogleEmbedding(text)
		}
		
		const response = await getOpenAIClient().embeddings.create({
			model: config.embedding.model,
			input: text,
			dimensions: config.embedding.dimensions,
		})
		return response.data[0].embedding
	}, 3)
}

/**
 * Generate embedding with Google
 */
async function generateGoogleEmbedding(text: string): Promise<number[]> {
	const model = getGoogleClient().getGenerativeModel({ 
		model: 'text-embedding-004' 
	})
	const result = await model.embedContent(text)
	return result.embedding.values
}

/**
 * Generate embeddings for multiple texts (batch)
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
	if (embeddingProvider === 'google') {
		// Google doesn't support batch, so process one by one
		const embeddings: number[][] = []
		for (const text of texts) {
			const embedding = await generateEmbedding(text)
			embeddings.push(embedding)
		}
		return embeddings
	}

	// OpenAI supports batch embedding
	const batchSize = 100
	const allEmbeddings: number[][] = []

	for (let i = 0; i < texts.length; i += batchSize) {
		const batch = texts.slice(i, i + batchSize)

		const response = await retry(async () => {
			return await getOpenAIClient().embeddings.create({
				model: config.embedding.model,
				input: batch,
				dimensions: config.embedding.dimensions,
			})
		}, 3)

		allEmbeddings.push(...response.data.map((d) => d.embedding))
	}

	return allEmbeddings
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
	if (a.length !== b.length) {
		throw new Error('Vectors must have the same length')
	}

	let dotProduct = 0
	let normA = 0
	let normB = 0

	for (let i = 0; i < a.length; i++) {
		dotProduct += a[i] * b[i]
		normA += a[i] * a[i]
		normB += b[i] * b[i]
	}

	return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Format embedding for Supabase pgvector
 */
export function formatEmbeddingForPgVector(embedding: number[]): string {
	return `[${embedding.join(',')}]`
}
