'use client'

import {useTranslations} from 'next-intl'
import {useCallback, useEffect, useState, useRef} from 'react'
import {useRagApi, type RagDocument, type DocumentUploadRequest} from '@/lib/useRagApi'
import {Icon} from '@/lib/icons'
import '../rag-stats/animations.css'

const ACCEPTED_FILE_TYPES = {
	'application/pdf': ['.pdf'],
	'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
	'application/msword': ['.doc'],
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

/**
 * RagDocumentsPage
 * Page de gestion des documents RAGGuard avec upload et liste.
 */
export function RagDocumentsPage() {
	const t = useTranslations('pages.ragDocuments')
	const api = useRagApi()
	const [documents, setDocuments] = useState<RagDocument[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [showUpload, setShowUpload] = useState(false)
	const [uploadLoading, setUploadLoading] = useState(false)
	const [uploadSuccess, setUploadSuccess] = useState<string | null>(null)

	// Form state
	const [title, setTitle] = useState('')
	const [content, setContent] = useState('')
	const [contentType, setContentType] = useState('text/plain')
	const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set())

	// File upload state
	const [selectedFile, setSelectedFile] = useState<File | null>(null)
	const [fileProcessing, setFileProcessing] = useState(false)
	const [dragOver, setDragOver] = useState(false)
	const fileInputRef = useRef<HTMLInputElement>(null)

	const toggleExpand = (docId: string) => {
		setExpandedDocs(prev => {
			const next = new Set(prev)
			if (next.has(docId)) {
				next.delete(docId)
			} else {
				next.add(docId)
			}
			return next
		})
	}

	const fetchDocuments = useCallback(async () => {
		try {
			setLoading(true)
			setError(null)
			const docs = await api.documents.list()
			setDocuments(docs)
		} catch (err) {
			setError((err as Error).message)
		} finally {
			setLoading(false)
		}
	}, [api])

	useEffect(() => {
		fetchDocuments()
	}, []) // eslint-disable-line react-hooks/exhaustive-deps

	const handleUpload = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!title.trim() || !content.trim() || uploadLoading) return

		try {
			setUploadLoading(true)
			setError(null)
			setUploadSuccess(null)

			const payload: DocumentUploadRequest = {
				title: title.trim(),
				content: content.trim(),
				content_type: contentType,
			}

			const result = await api.documents.upload(payload)
			setUploadSuccess(t('uploadSuccess', {chunks: result.chunks_created}))
			setTitle('')
			setContent('')
			setShowUpload(false)
			fetchDocuments()
		} catch (err) {
			setError((err as Error).message)
		} finally {
			setUploadLoading(false)
		}
	}

	const handleDelete = async (id: string) => {
		if (!confirm(t('confirmDelete'))) return

		try {
			await api.documents.delete(id)
			fetchDocuments()
		} catch (err) {
			setError((err as Error).message)
		}
	}

	const formatDate = (dateStr: string) => {
		return new Date(dateStr).toLocaleString()
	}

	// Fonction pour extraire le texte d'un fichier
	const extractTextFromFile = async (file: File) => {
		const formData = new FormData()
		formData.append('file', file)

		const response = await fetch('/api/file-extract', {
			method: 'POST',
			body: formData,
		})

		if (!response.ok) {
			const errorData = await response.json()
			throw new Error(errorData.error || 'Failed to extract text from file')
		}

		return response.json()
	}

	// Gestion de la sélection de fichier
	const handleFileSelect = async (file: File) => {
		// Vérifier le type de fichier
		const acceptedTypes = Object.keys(ACCEPTED_FILE_TYPES)
		if (!acceptedTypes.includes(file.type)) {
			setError(t('unsupportedFileType'))
			return
		}

		// Vérifier la taille
		if (file.size > MAX_FILE_SIZE) {
			setError(t('fileTooLarge'))
			return
		}

		setSelectedFile(file)
		setFileProcessing(true)
		setError(null)

		try {
			const result = await extractTextFromFile(file)
			setContent(result.text)
			setContentType('text/plain')
			// Auto-remplir le titre si vide
			if (!title.trim()) {
				const fileName = file.name.replace(/\.[^/.]+$/, '')
				setTitle(fileName)
			}
		} catch (err) {
			setError((err as Error).message)
			setSelectedFile(null)
		} finally {
			setFileProcessing(false)
		}
	}

	// Gestion du changement d'input file
	const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (file) {
			handleFileSelect(file)
		}
	}

	// Gestion du drag and drop
	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault()
		setDragOver(true)
	}

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault()
		setDragOver(false)
	}

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault()
		setDragOver(false)
		const file = e.dataTransfer.files?.[0]
		if (file) {
			handleFileSelect(file)
		}
	}

	// Supprimer le fichier sélectionné
	const clearSelectedFile = () => {
		setSelectedFile(null)
		setContent('')
		if (fileInputRef.current) {
			fileInputRef.current.value = ''
		}
	}

	return (
		<div className='space-y-8 animate-fade-in'>
			{/* Header */}
			<div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 animate-slide-down'>
				<div className='space-y-3'>
					<h1 className='text-3xl font-bold flex items-center gap-3 bg-linear-to-r from-white to-white/80 bg-clip-text text-transparent'>
						<div className='relative'>
							<Icon name='document' className='h-8 w-8 text-blue-400' />
							<div className='absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 animate-ping' />
							<div className='absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-emerald-400' />
						</div>
						{t('title')}
					</h1>
					<p className='text-base text-white/70 max-w-2xl'>{t('description')}</p>
					<div className='flex items-center gap-4 text-sm text-white/50'>
						<span className='flex items-center gap-1'>
							<div className='h-2 w-2 rounded-full bg-emerald-400 animate-pulse' />
							{t('ready')}
						</span>
						<span>•</span>
						<span>{documents.length} {t('documents')}</span>
						<span>•</span>
						<span>{documents.reduce((sum, doc) => sum + (doc.chunk_count || 0), 0)} {t('chunks')}</span>
					</div>
				</div>
				<div className='flex gap-3'>
					<button
						type='button'
						onClick={fetchDocuments}
						disabled={loading}
						className='inline-flex items-center gap-2 rounded-lg border border-white/10 bg-linear-to-r from-white/5 to-white/2 px-4 py-2.5 text-sm font-medium text-white/90 transition-all duration-200 hover:border-white/20 hover:bg-white/10 hover:shadow-lg hover:shadow-white/5 disabled:opacity-50 disabled:hover:border-white/10 disabled:hover:bg-white/5 disabled:hover:shadow-none'
					>
						<Icon name='arrow-path' className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
						{t('refresh')}
					</button>
					<button
						type='button'
						onClick={() => setShowUpload(!showUpload)}
						className='inline-flex items-center gap-2 rounded-lg bg-linear-to-r from-blue-600 to-blue-500 px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:from-blue-500 hover:to-blue-400 shadow-lg hover:shadow-blue-500/25'
					>
						<Icon name='plus' className='h-4 w-4' />
						{t('addDocument')}
					</button>
				</div>
			</div>

			{/* Success message */}
			{uploadSuccess && (
				<div className='rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 backdrop-blur-sm animate-slide-down'>
					<div className='flex items-start gap-3'>
						<Icon name='check-badge' className='h-5 w-5 text-emerald-400 mt-0.5' />
						<div>
							<p className='text-sm font-medium text-emerald-400'>{t('success')}</p>
							<p className='text-sm text-emerald-300 mt-1'>{uploadSuccess}</p>
						</div>
					</div>
				</div>
			)}

			{/* Error */}
			{error && (
				<div className='rounded-xl bg-red-500/10 border border-red-500/20 p-4 backdrop-blur-sm animate-slide-down'>
					<div className='flex items-start gap-3'>
						<Icon name='exclamation-triangle' className='h-5 w-5 text-red-400 mt-0.5' />
						<div>
							<p className='text-sm font-medium text-red-400'>{t('error')}</p>
							<p className='text-sm text-red-300 mt-1'>{error}</p>
						</div>
					</div>
				</div>
			)}

			{/* Upload Form */}
			{showUpload && (
				<div className='rounded-xl border border-white/10 bg-linear-to-br from-white/5 to-white/2 p-6 sm:p-8 backdrop-blur-sm animate-slide-up'>
					<div className='flex items-center gap-3 mb-6'>
						<div className='rounded-lg bg-blue-400/20 p-2'>
							<Icon name='plus' className='h-5 w-5 text-blue-400' />
						</div>
						<h2 className='text-lg font-semibold text-white'>{t('uploadTitle')}</h2>
					</div>
					<form onSubmit={handleUpload} className='space-y-6'>
						{/* File Upload Zone */}
						<div>
							<label className='block text-sm font-medium text-white/80 mb-2'>
								{t('uploadFile')}
							</label>
							<div
								onDragOver={handleDragOver}
								onDragLeave={handleDragLeave}
								onDrop={handleDrop}
								className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
									dragOver
										? 'border-blue-400 bg-blue-500/10'
										: selectedFile
											? 'border-emerald-400/50 bg-emerald-500/5'
											: 'border-white/20 hover:border-white/40 bg-white/5'
								}`}
							>
								<input
									ref={fileInputRef}
									type='file'
									onChange={handleFileInputChange}
									accept='.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'
									className='absolute inset-0 w-full h-full opacity-0 cursor-pointer'
									disabled={fileProcessing}
								/>
								{fileProcessing ? (
									<div className='space-y-3'>
										<Icon name='arrow-path' className='h-10 w-10 mx-auto text-blue-400 animate-spin' />
										<p className='text-sm text-white/70'>{t('processingFile')}</p>
									</div>
								) : selectedFile ? (
									<div className='space-y-3'>
										<div className='flex items-center justify-center gap-3'>
											<Icon name='document' className='h-8 w-8 text-emerald-400' />
											<div className='text-left'>
												<p className='text-sm font-medium text-white'>{selectedFile.name}</p>
												<p className='text-xs text-white/50'>
													{(selectedFile.size / 1024).toFixed(1)} KB • {t('contentExtracted')}
												</p>
											</div>
										</div>
										<button
											type='button'
											onClick={(e) => {
												e.stopPropagation()
												clearSelectedFile()
											}}
											className='inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors'
										>
											<Icon name='x-mark' className='h-4 w-4' />
											{t('clearFile')}
										</button>
									</div>
								) : (
									<div className='space-y-3'>
										<Icon name='cloud-arrow-up' className='h-10 w-10 mx-auto text-white/40' />
										<div>
											<p className='text-sm text-white/70'>
												{t('dragFileHere')}{' '}
												<span className='text-blue-400 hover:text-blue-300 cursor-pointer'>
													{t('browseFiles')}
												</span>
											</p>
											<p className='text-xs text-white/40 mt-2'>{t('supportedFormats')}</p>
										</div>
									</div>
								)}
							</div>
						</div>

						{/* Separator */}
						<div className='flex items-center gap-4'>
							<div className='flex-1 h-px bg-white/10' />
							<span className='text-xs text-white/40 uppercase'>ou</span>
							<div className='flex-1 h-px bg-white/10' />
						</div>

						<div>
							<label htmlFor='doc-title' className='block text-sm font-medium text-white/80 mb-2'>
								{t('docTitle')}
							</label>
							<div className='relative group'>
								<input
									id='doc-title'
									type='text'
									value={title}
									onChange={e => setTitle(e.target.value)}
									placeholder={t('docTitlePlaceholder')}
									required
									className='w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 group-hover:border-white/20'
								/>
								<div className='absolute inset-0 rounded-lg bg-linear-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none' />
							</div>
						</div>

						<div>
							<label htmlFor='content-type' className='block text-sm font-medium text-white/80 mb-2'>
								{t('contentType')}
							</label>
							<div className='relative group'>
								<select
									id='content-type'
									value={contentType}
									onChange={e => setContentType(e.target.value)}
									className='w-full rounded-lg bg-white/10 border border-white/20 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 group-hover:border-white/30 appearance-none cursor-pointer'
								>
									<option value='text/plain' className='bg-gray-800 text-white'>Text</option>
									<option value='text/markdown' className='bg-gray-800 text-white'>Markdown</option>
									<option value='text/html' className='bg-gray-800 text-white'>HTML</option>
									<option value='application/json' className='bg-gray-800 text-white'>JSON</option>
								</select>
								<div className='absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none'>
									<Icon name='chevron-down' className='h-4 w-4 text-white/60' />
								</div>
								<div className='absolute inset-0 rounded-lg bg-linear-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none' />
							</div>
						</div>

						<div>
							<label htmlFor='doc-content' className='block text-sm font-medium text-white/80 mb-2'>
								{t('docContent')}
							</label>
							<div className='relative group'>
								<textarea
									id='doc-content'
									value={content}
									onChange={e => setContent(e.target.value)}
									placeholder={t('docContentPlaceholder')}
									required
									rows={10}
									className='w-full rounded-lg bg-white/5 border border-white/10 px-4 py-3 text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 group-hover:border-white/20 font-mono resize-none'
								/>
								<div className='absolute inset-0 rounded-lg bg-linear-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none' />
								{/* Character count */}
								{content.length > 0 && (
									<div className='absolute -top-2 right-3 text-xs text-white/40 bg-black/50 px-2 py-1 rounded'>
										{content.length}/10000
									</div>
								)}
							</div>
						</div>

						<div className='flex justify-end gap-3 pt-4 border-t border-white/10'>
							<button
								type='button'
								onClick={() => setShowUpload(false)}
								className='rounded-lg border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white/90 transition-all duration-200 hover:border-white/20 hover:bg-white/10'
							>
								{t('cancel')}
							</button>
							<button
								type='submit'
								disabled={uploadLoading || !title.trim() || !content.trim()}
								className='inline-flex items-center gap-2 rounded-lg bg-linear-to-r from-blue-600 to-blue-500 px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-blue-500/25'
							>
								{uploadLoading && <Icon name='arrow-path' className='h-4 w-4 animate-spin' />}
								<Icon name='paper-airplane' className='h-4 w-4' />
								{t('upload')}
							</button>
						</div>
					</form>
				</div>
			)}

			{/* Documents List */}
			<div className='rounded-xl border border-white/10 bg-linear-to-br from-white/5 to-white/2 backdrop-blur-sm animate-slide-up'>
				<div className='px-6 py-4 border-b border-white/10 bg-white/5'>
					<div className='flex items-center justify-between'>
						<h2 className='text-lg font-semibold text-white flex items-center gap-2'>
							<Icon name='folder-open' className='h-5 w-5 text-blue-400' />
							{t('documentsList')} ({documents.length})
						</h2>
						{documents.length > 0 && (
							<div className='flex items-center gap-2 text-sm text-white/50'>
								<span>{documents.reduce((sum, doc) => sum + (doc.chunk_count || 0), 0)} {t('totalChunks')}</span>
							</div>
						)}
					</div>
				</div>

				{documents.length === 0 && !loading && (
					<div className='text-center py-16 space-y-4'>
						<div className='relative mx-auto w-24 h-24'>
							<Icon name='folder-open' className='h-16 w-16 mx-auto text-white/20' />
							<div className='absolute inset-0 h-16 w-16 rounded-full bg-blue-400/20 animate-pulse' />
						</div>
						<div>
							<p className='text-xl font-medium text-white/70'>{t('empty')}</p>
							<p className='text-sm text-white/40 mt-2 max-w-md mx-auto'>{t('emptyHint')}</p>
						</div>
					</div>
				)}

				{loading && (
					<div className='text-center py-16 space-y-4'>
						<div className='relative mx-auto w-16 h-16'>
							<Icon name='arrow-path' className='h-8 w-8 mx-auto text-white/40 animate-spin' />
							<div className='absolute inset-0 h-8 w-8 rounded-full bg-blue-400/20 animate-ping' />
						</div>
						<p className='text-sm text-white/50'>{t('loading')}</p>
					</div>
				)}

				<div className='divide-y divide-white/10'>
					{documents.map((doc, index) => {
						const isExpanded = expandedDocs.has(doc.id)
						return (
							<div key={doc.id} className='px-6 py-4 transition-all duration-200 hover:bg-white/5 animate-fade-in' style={{animationDelay: `${index * 50}ms`}}>
								<div className='flex items-center justify-between'>
									<div className='flex items-center gap-4 min-w-0 flex-1'>
										<button
											type='button'
											onClick={() => toggleExpand(doc.id)}
											className='p-2 rounded-lg hover:bg-white/10 shrink-0 transition-all duration-200 group'
											aria-label={isExpanded ? t('collapse') : t('expand')}
										>
											<Icon 
												name='chevron-right' 
												className={`h-5 w-5 text-white/50 transition-transform duration-200 group-hover:text-white/70 ${isExpanded ? 'rotate-90' : ''}`} 
											/>
										</button>
										<div className='relative group'>
											<div className='absolute inset-0 rounded-lg bg-blue-400/20 scale-0 group-hover:scale-100 transition-transform duration-200' />
											<Icon name='document' className='h-10 w-10 text-blue-400 shrink-0 relative' />
										</div>
										<div className='min-w-0 flex-1'>
											<div className='flex items-start justify-between gap-2'>
												<div className='min-w-0 flex-1'>
													<p className='font-semibold text-white truncate text-base'>{doc.title}</p>
													<div className='flex items-center gap-3 mt-1 text-sm text-white/50'>
														<span className='flex items-center gap-1'>
															<div className='h-2 w-2 rounded-full bg-blue-400' />
															{doc.content_type}
														</span>
														<span>•</span>
														<span>{formatDate(doc.created_at)}</span>
														{doc.chunk_count && (
															<>
																<span>•</span>
																<span className='flex items-center gap-1'>
																	<Icon name='server' className='h-3 w-3' />
																	{doc.chunk_count} {t('chunks')}
																</span>
															</>
														)}
													</div>
												</div>
											</div>
										</div>
									</div>
									<button
										type='button'
										onClick={() => handleDelete(doc.id)}
										className='p-2 rounded-lg hover:bg-red-500/20 text-red-400 hover:text-red-300 transition-all duration-200 group'
										aria-label={t('delete')}
									>
										<Icon name='trash' className='h-5 w-5 group-hover:scale-110 transition-transform duration-200' />
									</button>
								</div>
								{isExpanded && doc.content && (
									<div className='mt-4 ml-14 p-4 bg-white/5 rounded-lg border border-white/10 animate-slide-down'>
										<div className='flex items-start gap-2 mb-3'>
											<Icon name='document' className='h-4 w-4 text-blue-400' />
											<span className='text-sm font-medium text-white/70'>{t('content')}</span>
										</div>
										<pre className='text-sm text-white/70 whitespace-pre-wrap font-mono max-h-64 overflow-y-auto leading-relaxed'>
											{doc.content}
										</pre>
									</div>
								)}
								{isExpanded && !doc.content && (
									<div className='mt-4 ml-14 p-4 bg-white/5 rounded-lg border border-white/10 animate-slide-down'>
										<div className='flex items-center gap-2 text-sm text-white/50'>
											<Icon name='exclamation-triangle' className='h-4 w-4' />
											<span>{t('noContent')}</span>
										</div>
									</div>
								)}
							</div>
						)
					})}
				</div>
			</div>
		</div>
	)
}
