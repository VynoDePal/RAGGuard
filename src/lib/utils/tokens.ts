// =============================================
// Token Counting Utilities
// =============================================

// Simple token estimation without tiktoken (avoids WASM issues in Next.js)
// Average: 1 token ≈ 4 characters for English, ~3 for code

/**
 * Count tokens in a text string (estimation)
 * Uses character-based heuristics to avoid WASM dependencies
 */
export function countTokens(text: string, _model: string = 'gpt-4'): number {
	if (!text) return 0

	// Count different character types for better estimation
	const words = text.split(/\s+/).filter(Boolean).length
	const chars = text.length
	const codeBlocks = (text.match(/```[\s\S]*?```/g) || []).length
	const numbers = (text.match(/\d+/g) || []).length

	// Heuristic: 
	// - Regular text: ~0.75 tokens per word + punctuation
	// - Code: more tokens due to symbols
	// - Numbers: often 1 token each
	let estimate = words * 1.3 + numbers * 0.5

	// Add overhead for code blocks
	estimate += codeBlocks * 10

	// Fallback to character-based if word count is low
	if (words < 10) {
		estimate = Math.max(estimate, chars / 4)
	}

	return Math.ceil(estimate)
}

/**
 * Count tokens in messages array
 */
export function countMessagesTokens(
	messages: Array<{ role: string; content: string }>,
	model: string = 'gpt-4'
): number {
	// Token overhead per message (role, delimiters, etc.)
	const tokensPerMessage = 4
	const tokensReplyPrimer = 3

	let total = 0

	for (const message of messages) {
		total += tokensPerMessage
		total += countTokens(message.role, model)
		total += countTokens(message.content, model)
	}

	total += tokensReplyPrimer

	return total
}

/**
 * Truncate text to fit within a token limit
 */
export function truncateToTokenLimit(
	text: string,
	maxTokens: number,
	model: string = 'gpt-4'
): string {
	const currentTokens = countTokens(text, model)

	if (currentTokens <= maxTokens) {
		return text
	}

	// Binary search for the right length
	let low = 0
	let high = text.length
	let result = ''

	while (low < high) {
		const mid = Math.floor((low + high) / 2)
		const truncated = text.substring(0, mid)
		const tokens = countTokens(truncated, model)

		if (tokens <= maxTokens) {
			result = truncated
			low = mid + 1
		} else {
			high = mid
		}
	}

	// Try to end at a sentence boundary
	const lastSentenceEnd = Math.max(
		result.lastIndexOf('. '),
		result.lastIndexOf('.\n'),
		result.lastIndexOf('! '),
		result.lastIndexOf('? ')
	)

	if (lastSentenceEnd > result.length * 0.7) {
		return result.substring(0, lastSentenceEnd + 1)
	}

	return result + '...'
}

/**
 * Split text into chunks that fit within a token limit
 */
export function splitByTokenLimit(
	text: string,
	maxTokens: number,
	overlapTokens: number = 50,
	model: string = 'gpt-4'
): string[] {
	const chunks: string[] = []
	let remainingText = text

	while (remainingText.length > 0) {
		const chunk = truncateToTokenLimit(remainingText, maxTokens, model)
		chunks.push(chunk)

		if (chunk.length >= remainingText.length) {
			break
		}

		// Calculate overlap in characters (rough estimate)
		const overlapChars = Math.floor(overlapTokens * 4)
		const startIndex = Math.max(0, chunk.length - overlapChars)
		remainingText = remainingText.substring(startIndex)
	}

	return chunks
}
