import {NextRequest, NextResponse} from 'next/server'
import mammoth from 'mammoth'
import {PdfReader} from 'pdfreader'

export const runtime = 'nodejs'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const SUPPORTED_TYPES = {
	'application/pdf': 'pdf',
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
	'application/msword': 'doc',
} as const

type SupportedMimeType = keyof typeof SUPPORTED_TYPES

/**
 * API Route pour extraire le texte des fichiers PDF et DOC/DOCX
 * POST /api/file-extract
 */
export async function POST(request: NextRequest) {
	try {
		const formData = await request.formData()
		const file = formData.get('file') as File | null

		if (!file) {
			return NextResponse.json(
				{error: 'No file provided'},
				{status: 400}
			)
		}

		// Vérifier la taille du fichier
		if (file.size > MAX_FILE_SIZE) {
			return NextResponse.json(
				{error: 'File too large. Maximum size is 10MB'},
				{status: 400}
			)
		}

		// Vérifier le type de fichier
		const mimeType = file.type as SupportedMimeType
		if (!SUPPORTED_TYPES[mimeType]) {
			return NextResponse.json(
				{error: 'Unsupported file type. Only PDF, DOC, and DOCX are supported'},
				{status: 400}
			)
		}

		const fileType = SUPPORTED_TYPES[mimeType]
		const buffer = Buffer.from(await file.arrayBuffer())

		let extractedText = ''
		let pageCount = 0

		if (fileType === 'pdf') {
			const pdfReader = new PdfReader()
			let textBuffer = ''
			let pdfPageCount = 0
			
			await new Promise<void>((resolve, reject) => {
				pdfReader.parseBuffer(buffer, (err, item) => {
					if (err) {
						reject(err)
						return
					}
					if (!item) {
						resolve()
						return
					}
					if (item.page) {
						pdfPageCount += 1
					}
					if (item.text) {
						textBuffer += item.text + '\n'
					}
				})
			})
			
			extractedText = textBuffer.trim()
			pageCount = pdfPageCount
		} else {
			// Extraction DOC/DOCX avec mammoth
			const result = await mammoth.extractRawText({buffer})
			extractedText = result.value
			pageCount = 1 // mammoth ne fournit pas le nombre de pages
		}

		// Nettoyer le texte extrait
		extractedText = extractedText
			.replace(/\r\n/g, '\n')
			.replace(/\n{3,}/g, '\n\n')
			.trim()

		if (!extractedText) {
			return NextResponse.json(
				{error: 'Could not extract text from file. The file might be empty or contain only images'},
				{status: 400}
			)
		}

		return NextResponse.json({
			success: true,
			text: extractedText,
			filename: file.name,
			fileType,
			pageCount,
			characterCount: extractedText.length,
		})
	} catch (err) {
		console.error('[file-extract] Error:', err)
		const errorMessage = (err as Error).message || 'Failed to extract text from file'
		return NextResponse.json(
			{error: errorMessage},
			{status: 500}
		)
	}
}
