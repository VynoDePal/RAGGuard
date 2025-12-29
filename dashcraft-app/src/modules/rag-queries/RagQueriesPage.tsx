'use client'

import {useTranslations} from 'next-intl'
import {useCallback, useEffect, useState} from 'react'
import {useRagApi, type RagQuery} from '@/lib/useRagApi'
import {Icon} from '@/lib/icons'
import {cn} from '@/lib/utils'
import '../rag-stats/animations.css'

/**
 * RagQueriesPage
 * Page d'historique des requêtes RAG avec détails et métriques.
 */
export function RagQueriesPage() {
	const t = useTranslations('pages.ragQueries')
	const api = useRagApi()
	const [queries, setQueries] = useState<RagQuery[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [selectedQuery, setSelectedQuery] = useState<RagQuery | null>(null)

	const fetchQueries = useCallback(async () => {
		try {
			setLoading(true)
			setError(null)
			const data = await api.queries.list(50)
			setQueries(data)
		} catch (err) {
			setQueries([])
		} finally {
			setLoading(false)
		}
	}, [api])

	useEffect(() => {
		fetchQueries()
	}, []) // eslint-disable-line react-hooks/exhaustive-deps

	const formatDate = (dateStr: string) => {
		return new Date(dateStr).toLocaleString()
	}

	const getScoreColor = (score: number) => {
		if (score >= 0.8) return 'text-emerald-400'
		if (score >= 0.6) return 'text-amber-400'
		return 'text-red-400'
	}

	const getScoreBg = (score: number) => {
		if (score >= 0.8) return 'bg-emerald-500/20'
		if (score >= 0.6) return 'bg-amber-500/20'
		return 'bg-red-500/20'
	}

	return (
		<div className='space-y-8 animate-fade-in'>
			{/* Header */}
			<div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 animate-slide-down'>
				<div className='space-y-3'>
					<h1 className='text-3xl font-bold flex items-center gap-3 bg-linear-to-r from-white to-white/80 bg-clip-text text-transparent'>
						<div className='relative'>
							<Icon name='clock' className='h-8 w-8 text-cyan-400' />
							<div className='absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 animate-ping' />
							<div className='absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-emerald-400' />
						</div>
						{t('title')}
					</h1>
					<p className='text-base text-white/70 max-w-2xl'>{t('description')}</p>
					<div className='flex items-center gap-4 text-sm text-white/50'>
						<span className='flex items-center gap-1'>
								<div className='h-2 w-2 rounded-full bg-emerald-400 animate-pulse' />
								{t('live')}
							</span>
							<span>•</span>
							<span>{queries.length} {t('queries')}</span>
							<span>•</span>
							<span>{queries.filter(q => q.faithfulness_score >= 0.8).length} {t('highFaithfulness')}</span>
						</div>
				</div>
				<button
					type='button'
					onClick={fetchQueries}
					disabled={loading}
					className='inline-flex items-center gap-2 rounded-lg border border-white/10 bg-linear-to-r from-white/5 to-white/2 px-4 py-2.5 text-sm font-medium text-white/90 transition-all duration-200 hover:border-white/20 hover:bg-white/10 hover:shadow-lg hover:shadow-white/5 disabled:opacity-50 disabled:hover:border-white/10 disabled:hover:bg-white/5 disabled:hover:shadow-none'
				>
					<Icon name='arrow-path' className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
					{t('refresh')}
				</button>
			</div>

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

			<div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
				{/* Queries List */}
				<div className='lg:col-span-2 rounded-xl border border-white/10 bg-linear-to-br from-white/5 to-white/2 backdrop-blur-sm animate-slide-up'>
					<div className='px-6 py-4 border-b border-white/10 bg-white/5'>
						<div className='flex items-center justify-between'>
							<h2 className='text-lg font-semibold text-white flex items-center gap-2'>
								<Icon name='magnifying-glass' className='h-5 w-5 text-cyan-400' />
								{t('queryHistory')} ({queries.length})
							</h2>
							<div className='flex items-center gap-2 text-sm text-white/50'>
								<span>{queries.filter(q => q.faithfulness_score >= 0.8).length} {t('highScore')}</span>
							</div>
						</div>
					</div>

					{queries.length === 0 && !loading && (
						<div className='text-center py-16 space-y-4'>
							<div className='relative mx-auto w-24 h-24'>
								<Icon name='magnifying-glass' className='h-16 w-16 mx-auto text-white/20' />
								<div className='absolute inset-0 h-16 w-16 rounded-full bg-cyan-400/20 animate-pulse' />
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
								<div className='absolute inset-0 h-8 w-8 rounded-full bg-cyan-400/20 animate-ping' />
							</div>
							<p className='text-sm text-white/50'>{t('loading')}</p>
						</div>
					)}

					<div className='divide-y divide-white/10 max-h-[600px] overflow-y-auto'>
						{queries.map((query, index) => (
							<button
								key={query.id}
								type='button'
								onClick={() => setSelectedQuery(query)}
								className={cn(
									'w-full px-6 py-4 text-left transition-all duration-200 hover:bg-white/5 animate-fade-in',
									selectedQuery?.id === query.id && 'bg-white/10 border-l-4 border-cyan-400',
								)}
								style={{animationDelay: `${index * 50}ms`}}
							>
								<div className='flex items-start justify-between gap-4'>
									<div className='min-w-0 flex-1'>
										<div className='flex items-start gap-3'>
											<div className='relative group'>
												<div className='absolute inset-0 rounded-lg bg-cyan-400/20 scale-0 group-hover:scale-100 transition-transform duration-200' />
												<Icon name='magnifying-glass' className='h-5 w-5 text-cyan-400 shrink-0 relative mt-0.5' />
											</div>
											<div className='min-w-0 flex-1'>
												<p className='font-semibold text-white truncate text-base'>{query.query}</p>
												<p className='text-sm text-white/60 mt-1 line-clamp-2 leading-relaxed'>
													{query.response}
												</p>
											</div>
										</div>
									</div>
									<div className='shrink-0 text-right'>
										<span
											className={cn(
												'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border',
												query.faithfulness_score >= 0.8 ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' :
												query.faithfulness_score >= 0.6 ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' :
												'bg-red-500/20 border-red-500/30 text-red-400'
											)}
										>
											<Icon name='check-badge' className='h-3 w-3' />
											{(query.faithfulness_score * 100).toFixed(0)}%
										</span>
										<p className='text-xs text-white/40 mt-2'>
											{formatDate(query.created_at)}
										</p>
									</div>
								</div>

								<div className='mt-3 flex items-center gap-4 text-xs text-white/50'>
									<span className='flex items-center gap-1'>
										<Icon name='cpu' className='h-3 w-3' />
										{query.model}
									</span>
									<span className='flex items-center gap-1'>
										<Icon name='clock' className='h-3 w-3' />
										{query.llm_latency_ms + query.retrieval_latency_ms}ms
									</span>
									{query.abstained && (
										<span className='text-amber-400 flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded'>
											<Icon name='exclamation-triangle' className='h-3 w-3' />
											{t('abstained')}
										</span>
									)}
								</div>
							</button>
						))}
					</div>
				</div>

				{/* Query Details */}
				<div className='rounded-xl border border-white/10 bg-linear-to-br from-white/5 to-white/2 p-6 backdrop-blur-sm animate-slide-up'>
					<div className='flex items-center gap-3 mb-6'>
						<div className='rounded-lg bg-cyan-400/20 p-2'>
							<Icon name='magnifying-glass' className='h-5 w-5 text-cyan-400' />
						</div>
						<h2 className='text-lg font-semibold text-white'>{t('queryDetails')}</h2>
					</div>

					{!selectedQuery && (
						<div className='text-center py-12 space-y-4'>
							<div className='relative mx-auto w-16 h-16'>
								<Icon name='magnifying-glass' className='h-8 w-8 mx-auto text-white/20' />
								<div className='absolute inset-0 h-8 w-8 rounded-full bg-cyan-400/20 animate-pulse' />
							</div>
							<p className='text-sm text-white/50'>{t('selectQuery')}</p>
						</div>
					)}

					{selectedQuery && (
						<div className='space-y-6 animate-fade-in'>
							<div>
								<div className='flex items-center gap-2 mb-3'>
									<Icon name='chat' className='h-4 w-4 text-cyan-400' />
									<label className='text-sm font-medium text-white/80'>{t('queryLabel')}</label>
								</div>
								<div className='rounded-lg bg-white/5 border border-white/10 p-4'>
									<p className='text-sm text-white leading-relaxed'>{selectedQuery.query}</p>
								</div>
							</div>

							<div>
								<div className='flex items-center gap-2 mb-3'>
									<Icon name='document' className='h-4 w-4 text-cyan-400' />
									<label className='text-sm font-medium text-white/80'>{t('responseLabel')}</label>
								</div>
								<div className='rounded-lg bg-white/5 border border-white/10 p-4 max-h-48 overflow-y-auto'>
									<p className='text-sm text-white leading-relaxed whitespace-pre-wrap'>{selectedQuery.response}</p>
								</div>
							</div>

							<div className='grid grid-cols-2 gap-4'>
								<div className='rounded-xl bg-linear-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 p-4'>
									<div className='flex items-center gap-2 mb-2'>
										<Icon name='check-badge' className='h-4 w-4 text-emerald-400' />
										<span className='text-sm font-medium text-emerald-400'>{t('faithfulness')}</span>
									</div>
									<p className={cn('text-2xl font-bold', getScoreColor(selectedQuery.faithfulness_score))}>
										{(selectedQuery.faithfulness_score * 100).toFixed(1)}%
									</p>
								</div>
								<div className='rounded-xl bg-linear-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/20 p-4'>
									<div className='flex items-center gap-2 mb-2'>
										<Icon name='clock' className='h-4 w-4 text-amber-400' />
										<span className='text-sm font-medium text-amber-400'>{t('latency')}</span>
									</div>
									<p className='text-2xl font-bold text-amber-400'>
										{selectedQuery.llm_latency_ms + selectedQuery.retrieval_latency_ms}ms
									</p>
								</div>
							</div>

							<div>
								<div className='flex items-center gap-2 mb-3'>
									<Icon name='chart' className='h-4 w-4 text-cyan-400' />
									<span className='text-sm font-medium text-white/80'>{t('breakdown')}</span>
								</div>
								<div className='rounded-lg bg-white/5 border border-white/10 p-4 space-y-3'>
									<div className='flex justify-between items-center'>
										<span className='text-white/60 flex items-center gap-2'>
											<Icon name='server' className='h-3 w-3' />
											{t('retrievalLatency')}
										</span>
										<span className='text-white font-medium'>{selectedQuery.retrieval_latency_ms}ms</span>
									</div>
									<div className='flex justify-between items-center'>
										<span className='text-white/60 flex items-center gap-2'>
											<Icon name='cpu' className='h-3 w-3' />
											{t('llmLatency')}
										</span>
										<span className='text-white font-medium'>{selectedQuery.llm_latency_ms}ms</span>
									</div>
									<div className='flex justify-between items-center'>
										<span className='text-white/60 flex items-center gap-2'>
											<Icon name='cpu' className='h-3 w-3' />
											{t('model')}
										</span>
										<span className='text-white font-medium'>{selectedQuery.model}</span>
									</div>
								</div>
							</div>

							{selectedQuery.sources && selectedQuery.sources.length > 0 && (
								<div>
									<div className='flex items-center gap-2 mb-3'>
										<Icon name='folder-open' className='h-4 w-4 text-cyan-400' />
										<span className='text-sm font-medium text-white/80'>{t('sources')}</span>
									</div>
									<div className='space-y-2 max-h-48 overflow-y-auto'>
										{selectedQuery.sources.map((source, idx) => (
											<div
												key={idx}
												className='group rounded-lg bg-white/5 border border-white/10 p-3 flex justify-between items-center transition-all duration-200 hover:bg-white/10 hover:border-white/20'
											>
												<div className='flex items-center gap-2 min-w-0 flex-1'>
													<Icon name='document' className='h-4 w-4 text-blue-400 shrink-0' />
													<span className='text-sm text-white truncate'>{source.document_title}</span>
												</div>
												<div className='flex items-center gap-2 shrink-0'>
													<span className='text-xs font-medium px-2 py-1 rounded bg-blue-500/20 text-blue-400'>
														{(source.similarity * 100).toFixed(0)}%
													</span>
												</div>
											</div>
										))}
									</div>
								</div>
							)}

							<div className='pt-4 border-t border-white/10'>
								<div className='flex items-center gap-2 text-xs text-white/40'>
									<Icon name='calendar' className='h-3 w-3' />
									{formatDate(selectedQuery.created_at)}
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
