'use client'

import {WidgetCard} from '@/components/dashboard/WidgetCard'
import {useTranslations} from 'next-intl'
import {useCallback, useEffect, useState} from 'react'
import {useRagApi, type RagStatsResponse} from '@/lib/useRagApi'
import {Icon} from '@/lib/icons'
import './animations.css'

/**
 * RagStatsWidget
 * Affiche les statistiques RAGGuard: documents, chunks, queries, fidélité, abstention.
 */
export function RagStatsWidget() {
	const t = useTranslations('widgets.ragStats')
	const api = useRagApi()
	const [data, setData] = useState<RagStatsResponse | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	const fetchStats = useCallback(async () => {
		try {
			setLoading(true)
			setError(null)
			const stats = await api.stats.get()
			setData(stats)
		} catch (err) {
			setError((err as Error).message)
		} finally {
			setLoading(false)
		}
	}, [api])

	useEffect(() => {
		fetchStats()
		const interval = setInterval(fetchStats, 30000)
		return () => clearInterval(interval)
	}, []) // eslint-disable-line react-hooks/exhaustive-deps

	const formatPercent = (value: number | null) => {
		if (value === null || value === undefined) return '—'
		return `${(value * 100).toFixed(1)}%`
	}

	const formatLatency = (value: number | null) => {
		if (value === null || value === undefined) return '—'
		return `${Math.round(value)}ms`
	}

	return (
		<WidgetCard id='module-rag-stats' title={t('title')}>
			<div className='space-y-4 animate-fade-in'>
				<div className='flex items-center justify-between'>
					<div className='flex items-center gap-2 text-sm text-white/70'>
						<div className='h-2 w-2 rounded-full bg-emerald-400 animate-pulse' />
						{t('lastUpdate')}: {new Date().toLocaleTimeString()}
					</div>
					<button
						type='button'
						onClick={fetchStats}
						disabled={loading}
						aria-label={t('refresh')}
						className='inline-flex items-center gap-2 rounded-lg border border-white/10 bg-linear-to-r from-white/5 to-white/2 px-3 py-1.5 text-xs font-medium text-white/90 transition-all duration-200 hover:border-white/20 hover:bg-white/10 disabled:opacity-50'
					>
						<Icon name='arrow-path' className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
						{t('refresh')}
					</button>
				</div>

				{error && (
					<div className='rounded-lg bg-red-500/10 border border-red-500/20 p-3 backdrop-blur-sm animate-slide-down'>
						<p className='text-xs text-red-400'>{error}</p>
					</div>
				)}

				<div className='grid grid-cols-2 md:grid-cols-3 gap-3 animate-slide-up'>
					{/* Documents */}
					<div className='group relative overflow-hidden rounded-lg border border-white/10 bg-linear-to-br from-white/5 to-white/2 p-3 transition-all duration-300 hover:border-white/20 hover:bg-white/10 animate-stagger-1'>
						<div className='flex items-center gap-2'>
							<div className='rounded-lg bg-blue-400/20 p-1.5'>
								<Icon name='document' className='h-4 w-4 text-blue-400' />
							</div>
							<p className='text-xs font-medium text-white/70'>{t('documents')}</p>
						</div>
						<p className='mt-2 text-lg font-semibold text-white tabular-nums'>
							{data?.stats.total_documents ?? '—'}
						</p>
					</div>

					{/* Chunks */}
					<div className='group relative overflow-hidden rounded-lg border border-white/10 bg-linear-to-br from-white/5 to-white/2 p-3 transition-all duration-300 hover:border-white/20 hover:bg-white/10 animate-stagger-2'>
						<div className='flex items-center gap-2'>
							<div className='rounded-lg bg-purple-400/20 p-1.5'>
								<Icon name='folder-open' className='h-4 w-4 text-purple-400' />
							</div>
							<p className='text-xs font-medium text-white/70'>{t('chunks')}</p>
						</div>
						<p className='mt-2 text-lg font-semibold text-white tabular-nums'>
							{data?.stats.total_chunks ?? '—'}
						</p>
					</div>

					{/* Queries */}
					<div className='group relative overflow-hidden rounded-lg border border-white/10 bg-linear-to-br from-white/5 to-white/2 p-3 transition-all duration-300 hover:border-white/20 hover:bg-white/10 animate-stagger-3'>
						<div className='flex items-center gap-2'>
							<div className='rounded-lg bg-green-400/20 p-1.5'>
								<Icon name='chat' className='h-4 w-4 text-green-400' />
							</div>
							<p className='text-xs font-medium text-white/70'>{t('queries')}</p>
						</div>
						<p className='mt-2 text-lg font-semibold text-white tabular-nums'>
							{data?.stats.total_queries ?? '—'}
						</p>
					</div>

					{/* Faithfulness */}
					<div className='group relative overflow-hidden rounded-lg border border-white/10 bg-linear-to-br from-white/5 to-white/2 p-3 transition-all duration-300 hover:border-white/20 hover:bg-white/10 animate-stagger-4'>
						<div className='flex items-center gap-2'>
							<div className='rounded-lg bg-emerald-400/20 p-1.5'>
								<Icon name='check-badge' className='h-4 w-4 text-emerald-400' />
							</div>
							<p className='text-xs font-medium text-white/70'>{t('faithfulness')}</p>
						</div>
						<p className='mt-2 text-lg font-semibold text-white tabular-nums'>
							{formatPercent(data?.stats.avg_faithfulness ?? null)}
						</p>
					</div>

					{/* Abstention Rate */}
					<div className='group relative overflow-hidden rounded-lg border border-white/10 bg-linear-to-br from-white/5 to-white/2 p-3 transition-all duration-300 hover:border-white/20 hover:bg-white/10 animate-stagger-5'>
						<div className='flex items-center gap-2'>
							<div className='rounded-lg bg-amber-400/20 p-1.5'>
								<Icon name='exclamation-triangle' className='h-4 w-4 text-amber-400' />
							</div>
							<p className='text-xs font-medium text-white/70'>{t('abstentionRate')}</p>
						</div>
						<p className='mt-2 text-lg font-semibold text-white tabular-nums'>
							{formatPercent(data?.stats.abstention_rate ?? null)}
						</p>
					</div>

					{/* Avg Latency */}
					<div className='group relative overflow-hidden rounded-lg border border-white/10 bg-linear-to-br from-white/5 to-white/2 p-3 transition-all duration-300 hover:border-white/20 hover:bg-white/10 animate-stagger-6'>
						<div className='flex items-center gap-2'>
							<div className='rounded-lg bg-cyan-400/20 p-1.5'>
								<Icon name='clock' className='h-4 w-4 text-cyan-400' />
							</div>
							<p className='text-xs font-medium text-white/70'>{t('avgLatency')}</p>
						</div>
						<p className='mt-2 text-lg font-semibold text-white tabular-nums'>
							{formatLatency(data?.stats.avg_latency_ms ?? null)}
						</p>
					</div>
				</div>

				{/* 24h Trends */}
				{data?.trends?.last_24h && (
					<div className='mt-4 pt-4 border-t border-white/10 space-y-3 animate-fade-in'>
						<div className='flex items-center gap-2 text-xs text-white/50 font-medium'>
							<Icon name='clock' className='h-3 w-3' />
							{t('last24h')}
						</div>
						<div className='grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs'>
							<div className='rounded-lg bg-white/5 p-2 text-center'>
								<p className='text-white/50'>{t('queries')}</p>
								<p className='font-semibold text-white'>{data.trends.last_24h.query_count}</p>
							</div>
							<div className='rounded-lg bg-white/5 p-2 text-center'>
								<p className='text-white/50'>{t('faithfulness')}</p>
								<p className='font-semibold text-white'>
									{formatPercent(data.trends.last_24h.avg_faithfulness)}
								</p>
							</div>
						</div>
					</div>
				)}
			</div>
		</WidgetCard>
	)
}
