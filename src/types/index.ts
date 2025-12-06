// =============================================
// RAGGuard - Type Definitions
// =============================================

import { z } from 'zod'

// =============================================
// Database Types
// =============================================

export interface Tenant {
	id: string
	name: string
	slug: string
	settings: TenantSettings
	created_at: string
	updated_at: string
}

export interface TenantSettings {
	default_language?: string
	allowed_domains?: string[]
	max_documents?: number
	custom_prompts?: Record<string, string>
}

export interface Document {
	id: string
	tenant_id: string
	title: string
	content: string
	metadata: DocumentMetadata
	language: string
	domain?: string
	source_url?: string
	checksum?: string
	index_version: number
	created_at: string
	updated_at: string
}

export interface DocumentMetadata {
	author?: string
	tags?: string[]
	category?: string
	version?: string
	[key: string]: unknown
}

export interface DocumentChunk {
	id: string
	document_id: string
	tenant_id: string
	chunk_index: number
	content: string
	embedding?: number[]
	token_count?: number
	metadata: ChunkMetadata
	created_at: string
}

export interface ChunkMetadata {
	start_char?: number
	end_char?: number
	section_title?: string
	[key: string]: unknown
}

export interface RAGQuery {
	id: string
	tenant_id: string
	trace_id: string
	user_id_hash?: string
	query: string
	query_embedding?: number[]
	language: string
	query_type?: string
	lexical_hits: number
	vector_hits: number
	top_k_similarity?: number
	retrieval_latency_ms?: number
	llm_model?: string
	llm_latency_ms?: number
	context_token_count?: number
	response_token_count?: number
	faithfulness_score?: number
	abstained: boolean
	self_rag_attempts: number
	cost_usd?: number
	response?: string
	sources: string[]
	metadata: Record<string, unknown>
	created_at: string
}

export interface UserRole {
	id: string
	user_id: string
	tenant_id: string
	role: 'admin' | 'editor' | 'viewer'
	created_at: string
}

// =============================================
// RAG Pipeline Types
// =============================================

export interface RAGRequest {
	query: string
	tenant_id: string
	user_id?: string
	language?: string
	domain?: string
	filters?: MetadataFilters
	options?: RAGOptions
}

export interface MetadataFilters {
	tags?: string[]
	category?: string
	date_from?: string
	date_to?: string
	[key: string]: unknown
}

export interface RAGOptions {
	top_k?: number
	similarity_threshold?: number
	include_sources?: boolean
	max_context_tokens?: number
	model?: string
	provider?: LLMProvider
}

export type LLMProvider = 'google' | 'openai' | 'anthropic' | 'groq' | 'ollama'

export interface RAGResponse {
	trace_id: string
	answer: string
	sources: SourceReference[]
	faithfulness_score: number
	abstained: boolean
	metrics: RAGMetrics
}

export interface SourceReference {
	document_id: string
	chunk_id: string
	title: string
	content_preview: string
	similarity_score: number
	metadata?: Record<string, unknown>
}

export interface RAGMetrics {
	retrieval_latency_ms: number
	llm_latency_ms: number
	total_latency_ms: number
	context_token_count: number
	response_token_count: number
	cost_usd: number
	self_rag_attempts: number
}

// =============================================
// Retrieval Types
// =============================================

export interface RetrievalResult {
	chunks: ScoredChunk[]
	lexical_hits: number
	vector_hits: number
	latency_ms: number
}

export interface ScoredChunk extends DocumentChunk {
	score: number
	score_type: 'lexical' | 'vector' | 'hybrid'
}

export interface RerankedResult {
	chunks: ScoredChunk[]
	top_k_similarity: number
	latency_ms: number
}

// =============================================
// LLM Types
// =============================================

export interface LLMRequest {
	messages: LLMMessage[]
	model: string
	provider: LLMProvider
	max_tokens?: number
	temperature?: number
}

export interface LLMMessage {
	role: 'system' | 'user' | 'assistant'
	content: string
}

export interface LLMResponse {
	content: string
	model: string
	usage: LLMUsage
	latency_ms: number
}

export interface LLMUsage {
	prompt_tokens: number
	completion_tokens: number
	total_tokens: number
}

// =============================================
// Faithfulness Types
// =============================================

export interface FaithfulnessResult {
	score: number
	is_faithful: boolean
	confidence: number
	issues?: FaithfulnessIssue[]
}

export interface FaithfulnessIssue {
	type: 'hallucination' | 'unsupported_claim' | 'contradiction' | 'uncertainty'
	description: string
	severity: 'low' | 'medium' | 'high'
}

// =============================================
// Observability Types
// =============================================

export interface SpanContext {
	trace_id: string
	span_id: string
	parent_span_id?: string
}

export interface RAGLogEntry {
	trace_id: string
	tenant: string
	query: string
	retrieval: {
		lexical_hits: number
		vector_hits: number
		top_k_similarity: number
	}
	llm: {
		model: string
		latency_ms: number
	}
	faithfulness_score: number
	abstained: boolean
	sources: string[]
	cost_usd: number
	timestamp: string
}

// =============================================
// Zod Schemas for Validation
// =============================================

// UUID regex plus permissive (accepte les UUID de test comme 00000000-...)
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const RAGRequestSchema = z.object({
	query: z.string().min(1).max(10000),
	tenant_id: z.string().regex(uuidRegex, 'Invalid UUID'),
	user_id: z.string().optional(),
	language: z.string().default('fr'),
	domain: z.string().optional(),
	filters: z.object({
		tags: z.array(z.string()).optional(),
		category: z.string().optional(),
		date_from: z.string().optional(),
		date_to: z.string().optional(),
	}).optional(),
	options: z.object({
		top_k: z.number().min(1).max(20).default(5),
		similarity_threshold: z.number().min(0).max(1).default(0.7),
		include_sources: z.boolean().default(true),
		max_context_tokens: z.number().default(4000),
		model: z.string().optional(),
		provider: z.enum(['google', 'openai', 'anthropic', 'groq', 'ollama']).optional(),
	}).optional(),
})

export const DocumentUploadSchema = z.object({
	tenant_id: z.string().regex(uuidRegex, 'Invalid UUID'),
	title: z.string().min(1).max(500),
	content: z.string().min(1),
	metadata: z.record(z.string(), z.unknown()).optional(),
	language: z.string().default('fr'),
	domain: z.string().optional(),
	source_url: z.string().url().optional(),
})

export type RAGRequestInput = z.infer<typeof RAGRequestSchema>
export type DocumentUploadInput = z.infer<typeof DocumentUploadSchema>
