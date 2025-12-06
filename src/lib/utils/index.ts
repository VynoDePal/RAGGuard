// =============================================
// Utility Functions
// =============================================

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import CryptoJS from 'crypto-js'
import { v4 as uuidv4 } from 'uuid'

/**
 * Merge Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

/**
 * Generate a unique trace ID
 */
export function generateTraceId(): string {
	return uuidv4().replace(/-/g, '').substring(0, 16)
}

/**
 * Generate a span ID
 */
export function generateSpanId(): string {
	return uuidv4().replace(/-/g, '').substring(0, 8)
}

/**
 * Hash a user ID for privacy
 */
export function hashUserId(userId: string, salt?: string): string {
	const saltValue = salt || process.env.HASH_SALT || 'default-salt'
	return CryptoJS.SHA256(userId + saltValue).toString().substring(0, 16)
}

/**
 * Sleep utility for async operations
 */
export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Measure execution time of an async function
 */
export async function measureTime<T>(
	fn: () => Promise<T>
): Promise<{ result: T; duration: number }> {
	const start = performance.now()
	const result = await fn()
	const duration = Math.round(performance.now() - start)
	return { result, duration }
}

/**
 * Truncate text to a maximum length
 */
export function truncateText(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text
	return text.substring(0, maxLength - 3) + '...'
}

/**
 * Sanitize text for safe logging (remove PII patterns)
 */
export function sanitizeForLogging(text: string): string {
	return text
		// Email
		.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
		// Phone numbers (various formats)
		.replace(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, '[PHONE]')
		// Credit card numbers
		.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD]')
		// French SSN (numéro de sécurité sociale)
		.replace(/\b[12]\s?\d{2}\s?\d{2}\s?\d{2}\s?\d{3}\s?\d{3}\s?\d{2}\b/g, '[SSN]')
		// IP addresses
		.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, '[IP]')
}

/**
 * Chunk text into smaller pieces
 */
export function chunkText(
	text: string,
	chunkSize: number = 1000,
	overlap: number = 200
): string[] {
	const chunks: string[] = []
	let start = 0

	while (start < text.length) {
		const end = Math.min(start + chunkSize, text.length)
		let chunk = text.substring(start, end)

		// Try to break at a sentence boundary
		if (end < text.length) {
			const lastSentenceEnd = Math.max(
				chunk.lastIndexOf('. '),
				chunk.lastIndexOf('.\n'),
				chunk.lastIndexOf('! '),
				chunk.lastIndexOf('? ')
			)
			if (lastSentenceEnd > chunkSize * 0.5) {
				chunk = chunk.substring(0, lastSentenceEnd + 1)
			}
		}

		chunks.push(chunk.trim())
		start += chunk.length - overlap

		// Avoid infinite loop
		if (start <= chunks.length * overlap && chunks.length > 1) {
			start = end
		}
	}

	return chunks.filter((c) => c.length > 0)
}

/**
 * Calculate checksum of text content
 */
export function calculateChecksum(content: string): string {
	return CryptoJS.MD5(content).toString()
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
	func: T,
	wait: number
): (...args: Parameters<T>) => void {
	let timeout: NodeJS.Timeout | null = null

	return (...args: Parameters<T>) => {
		if (timeout) clearTimeout(timeout)
		timeout = setTimeout(() => func(...args), wait)
	}
}

/**
 * Retry an async function with exponential backoff
 */
export async function retry<T>(
	fn: () => Promise<T>,
	maxAttempts: number = 3,
	baseDelay: number = 1000
): Promise<T> {
	let lastError: Error | null = null

	for (let attempt = 0; attempt < maxAttempts; attempt++) {
		try {
			return await fn()
		} catch (error) {
			lastError = error as Error
			if (attempt < maxAttempts - 1) {
				await sleep(baseDelay * Math.pow(2, attempt))
			}
		}
	}

	throw lastError
}
