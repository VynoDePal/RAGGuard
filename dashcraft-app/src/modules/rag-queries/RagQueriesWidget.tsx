'use client'

import {WidgetCard} from '@/components/dashboard/WidgetCard'
import {useTranslations} from 'next-intl'
import {useCallback, useEffect, useState} from 'react'
import {useRagApi, type RagQuery} from '@/lib/useRagApi'
import {Icon} from '@/lib/icons'
import {cn} from '@/lib/utils'

/**
 * RagQueriesWidget
 * Aperçu des dernières requêtes RAG avec scores de fidélité.
 */
export function RagQueriesWidget() {
	const t = useTranslations('widgets.ragQueries')
	const api = useRagApi()
	const [queries, setQueries] = useState<RagQuery[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	const fetchQueries = useCallback(async () => {
		try {
			setLoading(true)
			setError(null)
			const data = await api.queries.list(10)
			setQueries(data)
		} catch (err) {
			// Silently fail for queries list if API doesn't exist
			setQueries([])
			setError((err as Error).message)
		} finally {
			setLoading(false)
		}
	}, [api])

	useEffect(() => {
		fetchQueries()
	}, []) // eslint-disable-line react-hooks/exhaustive-deps

	const formatTime = (dateStr: string) => {
		const date = new Date(dateStr)
		const now = new Date()
		const diff = now.getTime() - date.getTime()
		const minutes = Math.floor(diff / 60000)
		
		if (minutes < 1) return t('justNow')
		if (minutes < 60) return t('minutesAgo', {count: minutes})
		const hours = Math.floor(minutes / 60)
		if (hours < 24) return t('hoursAgo', {count: hours})
		return date.toLocaleDateString()
	}

	const getScoreColor = (score: number) => {
		if (score >= 0.8) return 'text-emerald-400'
		if (score >= 0.6) return 'text-amber-400'
		return 'text-red-400'
	}

	return (
		<WidgetCard id='module-rag-queries' title={t('title')}>
			<div className='mb-3 flex items-center justify-between'>
				<p className='text-xs text-white/70'>
					{t('recentQueries')}
				</p>
				<button
					type='button'
					onClick={fetchQueries}
					disabled={loading}
					aria-label={t('refresh')}
					className='inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs hover:opacity-80 disabled:opacity-50'
				>
					<Icon name='arrow-path' className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
				</button>
			</div>

			{error && (
				<div className='mb-3 rounded-md bg-red-500/10 border border-red-500/20 p-2'>
					<p className='text-xs text-red-400'>{error}</p>
				</div>
			)}

			{queries.length === 0 && !loading && (
				<div className='text-center py-4'>
					<Icon name='clock' className='h-8 w-8 mx-auto text-white/20 mb-2' />
					<p className='text-xs text-white/50'>{t('empty')}</p>
				</div>
			)}

			<ul role='list' className='space-y-2'>
				{queries.slice(0, 5).map(query => (
					<li
						key={query.id}
						role='listitem'
						className='rounded-md bg-white/5 p-3'
					>
						<p className='text-sm truncate'>{query.query}</p>
						<div className='mt-2 flex items-center gap-3 text-xs'>
							<span className={cn('flex items-center gap-1', getScoreColor(query.faithfulness_score))}>
								<Icon name='check-badge' className='h-3 w-3' />
								{(query.faithfulness_score * 100).toFixed(0)}%
							</span>
							<span className='text-white/50'>
								{formatTime(query.created_at)}
							</span>
							{query.abstained && (
								<span className='text-amber-400 flex items-center gap-1'>
									<Icon name='exclamation-triangle' className='h-3 w-3' />
									{t('abstained')}
								</span>
							)}
						</div>
					</li>
				))}
			</ul>
		</WidgetCard>
	)
}
