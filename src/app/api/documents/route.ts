// =============================================
// Documents API Route
// =============================================

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/supabase/server'
import { generateEmbeddings } from '@/lib/rag/embedding'
import { chunkText, calculateChecksum } from '@/lib/utils'
import { countTokens } from '@/lib/utils/tokens'
import { DocumentUploadSchema } from '@/types'

/**
 * GET /api/documents - List documents for a tenant
 */
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url)
		const tenantId = searchParams.get('tenant_id')
		const page = parseInt(searchParams.get('page') || '1', 10)
		const limit = parseInt(searchParams.get('limit') || '20', 10)

		if (!tenantId) {
			return NextResponse.json(
				{ error: 'tenant_id is required' },
				{ status: 400 }
			)
		}

		const supabase = await createServerSupabaseClient()

		const { data, error, count } = await supabase
			.from('documents')
			.select('*', { count: 'exact' })
			.eq('tenant_id', tenantId)
			.order('created_at', { ascending: false })
			.range((page - 1) * limit, page * limit - 1)

		if (error) {
			throw error
		}

		return NextResponse.json({
			documents: data,
			pagination: {
				page,
				limit,
				total: count,
				pages: Math.ceil((count || 0) / limit),
			},
		})
	} catch (error) {
		console.error('[Documents API] GET error:', error)
		return NextResponse.json(
			{ error: 'Failed to fetch documents' },
			{ status: 500 }
		)
	}
}

/**
 * POST /api/documents - Upload and index a new document
 */
export async function POST(request: NextRequest) {
	try {
		// Parse and validate request
		const body = await request.json()
		const parseResult = DocumentUploadSchema.safeParse(body)

		if (!parseResult.success) {
			return NextResponse.json(
				{
					error: 'Invalid request',
					details: parseResult.error.flatten(),
				},
				{ status: 400 }
			)
		}

		const doc = parseResult.data
		const supabase = await createServiceRoleClient()

		// Calculate checksum to detect duplicates
		const checksum = calculateChecksum(doc.content)

		// Check for duplicate
		const { data: existing } = await supabase
			.from('documents')
			.select('id')
			.eq('tenant_id', doc.tenant_id)
			.eq('checksum', checksum)
			.single()

		if (existing) {
			return NextResponse.json(
				{
					error: 'Document already exists',
					document_id: existing.id,
				},
				{ status: 409 }
			)
		}

		// Insert document
		const { data: document, error: docError } = await supabase
			.from('documents')
			.insert({
				tenant_id: doc.tenant_id,
				title: doc.title,
				content: doc.content,
				metadata: doc.metadata || {},
				language: doc.language,
				domain: doc.domain,
				source_url: doc.source_url,
				checksum,
			})
			.select()
			.single()

		if (docError) {
			throw docError
		}

		// Chunk the content
		const chunks = chunkText(doc.content, 1000, 200)

		// Generate embeddings for all chunks
		const embeddings = await generateEmbeddings(chunks)

		// Insert chunks with embeddings
		const chunkRecords = chunks.map((content, index) => ({
			document_id: document.id,
			tenant_id: doc.tenant_id,
			chunk_index: index,
			content,
			embedding: `[${embeddings[index].join(',')}]`,
			token_count: countTokens(content),
			metadata: {
				start_char: doc.content.indexOf(content),
				end_char: doc.content.indexOf(content) + content.length,
			},
		}))

		const { error: chunksError } = await supabase
			.from('document_chunks')
			.insert(chunkRecords)

		if (chunksError) {
			// Rollback document if chunks fail
			await supabase.from('documents').delete().eq('id', document.id)
			throw chunksError
		}

		return NextResponse.json(
			{
				document_id: document.id,
				chunks_created: chunks.length,
				message: 'Document indexed successfully',
			},
			{ status: 201 }
		)
	} catch (error) {
		console.error('[Documents API] POST error:', error)
		return NextResponse.json(
			{ error: 'Failed to upload document' },
			{ status: 500 }
		)
	}
}

/**
 * DELETE /api/documents - Delete a document and its chunks
 */
export async function DELETE(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url)
		const documentId = searchParams.get('id')

		if (!documentId) {
			return NextResponse.json(
				{ error: 'Document id is required' },
				{ status: 400 }
			)
		}

		const supabase = await createServerSupabaseClient()

		// Delete document (chunks will be deleted by cascade)
		const { error } = await supabase
			.from('documents')
			.delete()
			.eq('id', documentId)

		if (error) {
			throw error
		}

		return NextResponse.json({ message: 'Document deleted successfully' })
	} catch (error) {
		console.error('[Documents API] DELETE error:', error)
		return NextResponse.json(
			{ error: 'Failed to delete document' },
			{ status: 500 }
		)
	}
}
