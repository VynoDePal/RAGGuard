'use client'

import {WidgetCard} from '@/components/dashboard/WidgetCard'
import {useTranslations} from 'next-intl'
import {useCallback, useEffect, useState} from 'react'
import {useRagApi, type RagDocument} from '@/lib/useRagApi'
import {Icon} from '@/lib/icons'
import '../rag-stats/animations.css'

/**
 * RagDocumentsWidget
 * Aperçu des documents indexés dans RAGGuard.
 */
export function RagDocumentsWidget() {
	const t = useTranslations('widgets.ragDocuments')
	const api = useRagApi()
	const [documents, setDocuments] = useState<RagDocument[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

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

	const formatDate = (dateStr: string) => {
		return new Date(dateStr).toLocaleDateString()
	}

	return (
		<WidgetCard id='module-rag-documents' title={t('title')}>
			<div className='space-y-4 animate-fade-in'>
				{/* Header */}
				<div className='flex items-center justify-between'>
					<div className='flex items-center gap-2 text-sm text-white/70'>
						<div className='relative'>
							<Icon name='document' className='h-4 w-4 text-blue-400' />
							<div className='absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 animate-ping' />
							<div className='absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400' />
						</div>
						<span>{t('count', {count: documents.length})}</span>
					</div>
					<button
						type='button'
						onClick={fetchDocuments}
						disabled={loading}
						aria-label={t('refresh')}
						className='inline-flex items-center gap-1 rounded-lg border border-white/10 bg-linear-to-r from-white/5 to-white/2 px-2 py-1.5 text-xs font-medium text-white/90 transition-all duration-200 hover:border-white/20 hover:bg-white/10 disabled:opacity-50 disabled:hover:border-white/10 disabled:hover:bg-white/5'
					>
						<Icon name='arrow-path' className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
						{t('refresh')}
					</button>
				</div>

			{/* Error */}
			{error && (
				<div className='rounded-lg bg-red-500/10 border border-red-500/20 p-3 backdrop-blur-sm animate-slide-down'>
					<div className='flex items-start gap-2'>
						<Icon name='exclamation-triangle' className='h-4 w-4 text-red-400 mt-0.5' />
						<div>
							<p className='text-xs font-medium text-red-400'>{t('error')}</p>
							<p className='text-xs text-red-300 mt-1'>{error}</p>
						</div>
					</div>
				</div>
			)}

			{/* Empty State */}
			{documents.length === 0 && !loading && !error && (
				<div className='text-center py-6 space-y-3 animate-fade-in'>
					<div className='relative mx-auto w-12 h-12'>
						<Icon name='document' className='h-8 w-8 mx-auto text-white/20' />
						<div className='absolute inset-0 h-8 w-8 rounded-full bg-blue-400/20 animate-pulse' />
					</div>
					<p className='text-xs text-white/50'>{t('empty')}</p>
				</div>
			)}

			{/* Documents List */}
			<ul role='list' className='space-y-2'>
				{documents.slice(0, 5).map((doc, index) => (
					<li
						key={doc.id}
						role='listitem'
						className='group relative overflow-hidden rounded-lg border border-white/10 bg-linear-to-br from-white/5 to-white/2 p-3 transition-all duration-200 hover:border-white/20 hover:bg-white/10 animate-fade-in'
						style={{animationDelay: `${index * 100}ms`}}
					>
						<div className='flex items-start gap-3'>
							<div className='relative group'>
								<div className='absolute inset-0 rounded bg-blue-400/20 scale-0 group-hover:scale-100 transition-transform duration-200' />
								<Icon name='document' className='h-5 w-5 text-blue-400 mt-0.5 shrink-0 relative' />
							</div>
							<div className='min-w-0 flex-1'>
								<div className='flex items-start justify-between gap-2'>
									<div className='min-w-0 flex-1'>
										<p className='text-sm font-medium text-white truncate'>{doc.title}</p>
										<div className='flex items-center gap-2 mt-1 text-xs text-white/50'>
											<span className='flex items-center gap-1'>
												<div className='h-1.5 w-1.5 rounded-full bg-blue-400' />
												{doc.content_type}
											</span>
											<span>•</span>
											<span>{formatDate(doc.created_at)}</span>
											{doc.chunk_count && (
												<>
													<span>•</span>
													<span className='flex items-center gap-1'>
														<Icon name='server' className='h-3 w-3' />
														{doc.chunk_count}
													</span>
												</>
											)}
										</div>
									</div>
								</div>
							</div>
						</div>
					</li>
				))}
			</ul>

			{/* More Documents */}
			{documents.length > 5 && (
				<div className='pt-3 border-t border-white/10 animate-fade-in'>
					<p className='text-center text-xs text-white/50 flex items-center justify-center gap-2'>
						<Icon name='folder-open' className='h-3 w-3' />
						{t('moreDocuments', {count: documents.length - 5})}
					</p>
				</div>
			)}
		</div>
		</WidgetCard>
	)
}
