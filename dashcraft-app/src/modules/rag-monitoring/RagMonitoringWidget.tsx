'use client'

import { WidgetCard } from '@/components/dashboard/WidgetCard'
import { useTranslations, useLocale } from 'next-intl'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useCallback, useEffect, useState } from 'react'
import { useRagApi, type RagMonitoringMetrics, type ServiceHealth } from '@/lib/useRagApi'
import { Icon } from '@/lib/icons'
import { cn } from '@/lib/utils'

/**
 * RagMonitoringWidget
 * Widget affichant les métriques de monitoring du pipeline RAG
 * et la santé des services externes (LLM, Datadog, etc.)
 */
export function RagMonitoringWidget() {
	const t = useTranslations('widgets.ragMonitoring')
	const locale = useLocale()
	const api = useRagApi()
	const [metrics, setMetrics] = useState<RagMonitoringMetrics | null>(null)
	const [services, setServices] = useState<ServiceHealth[]>([])
	const [loading, setLoading] = useState(true)
	const [, setTick] = useState(0)

	dayjs.extend(relativeTime)
	const effectiveLocale = locale.toLowerCase().split('-')[0] === 'fr' ? 'fr' : 'en'

	useEffect(() => {
		let ignore = false
		async function load() {
			if (effectiveLocale === 'fr') {
				await import('dayjs/locale/fr')
			} else {
				await import('dayjs/locale/en')
			}
			if (!ignore) dayjs.locale(effectiveLocale)
		}
		load()
		return () => {
			ignore = true
		}
	}, [effectiveLocale])

	// Tick périodique pour recalculer le temps relatif
	useEffect(() => {
		const id = setInterval(() => setTick(t => t + 1), 60_000)
		return () => clearInterval(id)
	}, [])

	const fetchMonitoring = useCallback(async () => {
		try {
			setLoading(true)
			const data = await api.monitoring.get(true)
			setMetrics(data.metrics)
			setServices(data.services)
		} catch {
			// Silencieux en cas d'erreur
		} finally {
			setLoading(false)
		}
	}, [api])

	useEffect(() => {
		fetchMonitoring()
	}, []) // eslint-disable-line react-hooks/exhaustive-deps

	const updatedAtAbs = metrics?.updatedAt
		? new Date(metrics.updatedAt).toLocaleString(locale)
		: '—'
	const updatedAtRel = metrics?.updatedAt
		? dayjs(metrics.updatedAt).locale(effectiveLocale).fromNow()
		: null

	const getStatusColor = (status: ServiceHealth['status']) => {
		switch (status) {
			case 'healthy':
				return 'text-emerald-400'
			case 'degraded':
				return 'text-amber-400'
			case 'down':
				return 'text-red-400'
			default:
				return 'text-white/50'
		}
	}

	const getStatusBg = (status: ServiceHealth['status']) => {
		switch (status) {
			case 'healthy':
				return 'bg-emerald-500/20'
			case 'degraded':
				return 'bg-amber-500/20'
			case 'down':
				return 'bg-red-500/20'
			default:
				return 'bg-white/10'
		}
	}

	const getScoreColor = (score: number) => {
		if (score >= 0.8) return 'text-emerald-400'
		if (score >= 0.6) return 'text-amber-400'
		return 'text-red-400'
	}

	return (
		<WidgetCard id='module-rag-monitoring' title={t('title')}>
			<div className='mb-4 flex items-center justify-between'>
				<p className='text-xs text-white/70' aria-live='polite'>
					{t('updatedAt')}:{' '}
					<span className='font-medium text-white/80'>{updatedAtAbs}</span>
					{updatedAtRel && (
						<span className='ml-2 text-white/60'>({updatedAtRel})</span>
					)}
				</p>
				<button
					type='button'
					onClick={fetchMonitoring}
					disabled={loading}
					aria-label={t('refresh')}
					className='inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs hover:opacity-80 disabled:opacity-50'
				>
					<Icon
						name='arrow-path'
						className={cn('h-4 w-4', loading && 'animate-spin')}
					/>
					{t('refresh')}
				</button>
			</div>

			{/* Métriques principales */}
			<div className='mb-4 grid grid-cols-2 gap-3 md:grid-cols-4'>
				<div className='rounded-md bg-white/5 p-3'>
					<p className='text-xs text-white/70'>{t('latency')}</p>
					<p className='text-lg font-semibold'>
						{metrics?.avgLatencyMs || 0}
						<span className='text-xs text-white/50 ml-1'>ms</span>
					</p>
				</div>
				<div className='rounded-md bg-white/5 p-3'>
					<p className='text-xs text-white/70'>{t('faithfulness')}</p>
					<p className={cn('text-lg font-semibold', getScoreColor(metrics?.avgFaithfulness || 0))}>
						{((metrics?.avgFaithfulness || 0) * 100).toFixed(1)}%
					</p>
				</div>
				<div className='rounded-md bg-white/5 p-3'>
					<p className='text-xs text-white/70'>{t('abstentionRate')}</p>
					<p className='text-lg font-semibold'>
						{((metrics?.abstentionRate || 0) * 100).toFixed(1)}%
					</p>
				</div>
				<div className='rounded-md bg-white/5 p-3'>
					<p className='text-xs text-white/70'>{t('cost24h')}</p>
					<p className='text-lg font-semibold'>
						${(metrics?.totalCost24h || 0).toFixed(4)}
					</p>
				</div>
			</div>

			{/* Santé des services */}
			<div className='rounded-md bg-white/5 p-3'>
				<p className='text-xs text-white/70 mb-3'>{t('servicesHealth')}</p>
				<div className='flex flex-wrap gap-2'>
					{services.length === 0 && !loading && (
						<p className='text-xs text-white/50'>{t('noServices')}</p>
					)}
					{services.map(service => (
						<div
							key={service.name}
							className={cn(
								'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs',
								getStatusBg(service.status),
							)}
						>
							<span
								className={cn(
									'h-2 w-2 rounded-full',
									service.status === 'healthy' && 'bg-emerald-400',
									service.status === 'degraded' && 'bg-amber-400',
									service.status === 'down' && 'bg-red-400',
								)}
							/>
							<span className={getStatusColor(service.status)}>
								{service.name}
							</span>
							{service.latencyMs !== undefined && (
								<span className='text-white/40'>{service.latencyMs}ms</span>
							)}
						</div>
					))}
				</div>
			</div>
		</WidgetCard>
	)
}
