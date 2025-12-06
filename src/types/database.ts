// =============================================
// Types Supabase générés automatiquement
// =============================================

export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[]

export type Database = {
	public: {
		Tables: {
			document_chunks: {
				Row: {
					chunk_index: number
					content: string
					created_at: string | null
					document_id: string
					embedding: string | null
					id: string
					metadata: Json | null
					tenant_id: string
					token_count: number | null
				}
				Insert: {
					chunk_index: number
					content: string
					created_at?: string | null
					document_id: string
					embedding?: string | null
					id?: string
					metadata?: Json | null
					tenant_id: string
					token_count?: number | null
				}
				Update: {
					chunk_index?: number
					content?: string
					created_at?: string | null
					document_id?: string
					embedding?: string | null
					id?: string
					metadata?: Json | null
					tenant_id?: string
					token_count?: number | null
				}
				Relationships: [
					{
						foreignKeyName: 'document_chunks_document_id_fkey'
						columns: ['document_id']
						isOneToOne: false
						referencedRelation: 'documents'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'document_chunks_tenant_id_fkey'
						columns: ['tenant_id']
						isOneToOne: false
						referencedRelation: 'tenants'
						referencedColumns: ['id']
					}
				]
			}
			documents: {
				Row: {
					checksum: string | null
					content: string
					created_at: string | null
					domain: string | null
					id: string
					index_version: number | null
					language: string | null
					metadata: Json | null
					source_url: string | null
					tenant_id: string
					title: string
					updated_at: string | null
				}
				Insert: {
					checksum?: string | null
					content: string
					created_at?: string | null
					domain?: string | null
					id?: string
					index_version?: number | null
					language?: string | null
					metadata?: Json | null
					source_url?: string | null
					tenant_id: string
					title: string
					updated_at?: string | null
				}
				Update: {
					checksum?: string | null
					content?: string
					created_at?: string | null
					domain?: string | null
					id?: string
					index_version?: number | null
					language?: string | null
					metadata?: Json | null
					source_url?: string | null
					tenant_id?: string
					title?: string
					updated_at?: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'documents_tenant_id_fkey'
						columns: ['tenant_id']
						isOneToOne: false
						referencedRelation: 'tenants'
						referencedColumns: ['id']
					}
				]
			}
			rag_queries: {
				Row: {
					abstained: boolean | null
					context_token_count: number | null
					cost_usd: number | null
					created_at: string | null
					faithfulness_score: number | null
					id: string
					language: string | null
					lexical_hits: number | null
					llm_latency_ms: number | null
					llm_model: string | null
					metadata: Json | null
					query: string
					query_embedding: string | null
					query_type: string | null
					response: string | null
					response_token_count: number | null
					retrieval_latency_ms: number | null
					self_rag_attempts: number | null
					sources: Json | null
					tenant_id: string | null
					top_k_similarity: number | null
					trace_id: string
					user_id_hash: string | null
					vector_hits: number | null
				}
				Insert: {
					abstained?: boolean | null
					context_token_count?: number | null
					cost_usd?: number | null
					created_at?: string | null
					faithfulness_score?: number | null
					id?: string
					language?: string | null
					lexical_hits?: number | null
					llm_latency_ms?: number | null
					llm_model?: string | null
					metadata?: Json | null
					query: string
					query_embedding?: string | null
					query_type?: string | null
					response?: string | null
					response_token_count?: number | null
					retrieval_latency_ms?: number | null
					self_rag_attempts?: number | null
					sources?: Json | null
					tenant_id?: string | null
					top_k_similarity?: number | null
					trace_id: string
					user_id_hash?: string | null
					vector_hits?: number | null
				}
				Update: {
					abstained?: boolean | null
					context_token_count?: number | null
					cost_usd?: number | null
					created_at?: string | null
					faithfulness_score?: number | null
					id?: string
					language?: string | null
					lexical_hits?: number | null
					llm_latency_ms?: number | null
					llm_model?: string | null
					metadata?: Json | null
					query?: string
					query_embedding?: string | null
					query_type?: string | null
					response?: string | null
					response_token_count?: number | null
					retrieval_latency_ms?: number | null
					self_rag_attempts?: number | null
					sources?: Json | null
					tenant_id?: string | null
					top_k_similarity?: number | null
					trace_id?: string
					user_id_hash?: string | null
					vector_hits?: number | null
				}
				Relationships: [
					{
						foreignKeyName: 'rag_queries_tenant_id_fkey'
						columns: ['tenant_id']
						isOneToOne: false
						referencedRelation: 'tenants'
						referencedColumns: ['id']
					}
				]
			}
			tenants: {
				Row: {
					created_at: string | null
					id: string
					name: string
					settings: Json | null
					slug: string
					updated_at: string | null
				}
				Insert: {
					created_at?: string | null
					id?: string
					name: string
					settings?: Json | null
					slug: string
					updated_at?: string | null
				}
				Update: {
					created_at?: string | null
					id?: string
					name?: string
					settings?: Json | null
					slug?: string
					updated_at?: string | null
				}
				Relationships: []
			}
			user_roles: {
				Row: {
					created_at: string | null
					id: string
					role: string
					tenant_id: string
					user_id: string
				}
				Insert: {
					created_at?: string | null
					id?: string
					role: string
					tenant_id: string
					user_id: string
				}
				Update: {
					created_at?: string | null
					id?: string
					role?: string
					tenant_id?: string
					user_id?: string
				}
				Relationships: [
					{
						foreignKeyName: 'user_roles_tenant_id_fkey'
						columns: ['tenant_id']
						isOneToOne: false
						referencedRelation: 'tenants'
						referencedColumns: ['id']
					}
				]
			}
		}
		Views: {
			[_ in never]: never
		}
		Functions: {
			get_tenant_stats: {
				Args: { p_tenant_id: string }
				Returns: {
					abstention_rate: number
					avg_faithfulness: number
					avg_latency_ms: number
					total_chunks: number
					total_documents: number
					total_queries: number
				}[]
			}
			get_user_tenant_ids: { Args: never; Returns: string[] }
			search_chunks_hybrid: {
				Args: {
					p_lexical_weight?: number
					p_limit?: number
					p_query: string
					p_similarity_threshold?: number
					p_tenant_id: string
					p_vector_weight?: number
					query_embedding: string
				}
				Returns: {
					combined_score: number
					content: string
					document_id: string
					id: string
					lexical_score: number
					metadata: Json
					vector_score: number
				}[]
			}
			search_chunks_vector: {
				Args: {
					p_domain?: string
					p_limit?: number
					p_similarity_threshold?: number
					p_tenant_id: string
					query_embedding: string
				}
				Returns: {
					chunk_index: number
					content: string
					created_at: string
					document_id: string
					id: string
					metadata: Json
					similarity: number
					tenant_id: string
					token_count: number
				}[]
			}
			user_has_role: {
				Args: { p_roles: string[]; p_tenant_id: string }
				Returns: boolean
			}
		}
		Enums: {
			[_ in never]: never
		}
		CompositeTypes: {
			[_ in never]: never
		}
	}
}

export type Tables<T extends keyof Database['public']['Tables']> =
	Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> =
	Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> =
	Database['public']['Tables'][T]['Update']
