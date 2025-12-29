'use client'

import { useTranslations, useLocale } from 'next-intl'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useCallback, useEffect, useState } from 'react'
import {
	useRagApi,
	type RagMonitoringMetrics,
	type ServiceHealth,
	type DatadogTimeseries,
} from '@/lib/useRagApi'
import { Icon } from '@/lib/icons'
import { cn } from '@/lib/utils'

/**
 * RagMonitoringPage
 * Page complète de monitoring du pipeline RAG avec métriques,
 * graphiques Datadog et santé des services.
 */
export function RagMonitoringPage() {
	const t = useTranslations('pages.ragMonitoring')
	const locale = useLocale()
	const api = useRagApi()
	const [metrics, setMetrics] = useState<RagMonitoringMetrics | null>(null)
	const [services, setServices] = useState<ServiceHealth[]>([])
	const [timeseries, setTimeseries] = useState<DatadogTimeseries[]>([])
	const [loading, setLoading] = useState(true)
	const [datadogAvailable, setDatadogAvailable] = useState(true)
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

	useEffect(() => {
		const id = setInterval(() => setTick(t => t + 1), 60_000)
		return () => clearInterval(id)
	}, [])

	const fetchData = useCallback(async () => {
		try {
			setLoading(true)

			// Fetch monitoring data
			const monitoringData = await api.monitoring.get(true)
			setMetrics(monitoringData.metrics)
			setServices(monitoringData.services)

			// Check if Datadog is available (check service health)
			const datadogService = monitoringData.services.find(s => s.name === 'datadog')
			const isDatadogAvailable = datadogService?.status === 'healthy'
			setDatadogAvailable(isDatadogAvailable)

			// Fetch Datadog timeseries if available
			if (isDatadogAvailable) {
				const now = Math.floor(Date.now() / 1000)
				const yesterday = now - 24 * 60 * 60

				const ddData = await api.monitoring.getDatadogMultipleTimeseries(
					[
						'ragguard.llm.response.latency_ms',
						'ragguard.llm.response.faithfulness_score',
						'ragguard.rag.cost_per_request',
					],
					yesterday,
					now,
				)

				if (Array.isArray(ddData.timeseries)) {
					setTimeseries(ddData.timeseries)
				} else if (ddData.timeseries) {
					setTimeseries([ddData.timeseries])
				}
			}
		} catch {
			// Silencieux
		} finally {
			setLoading(false)
		}
	}, [api])

	useEffect(() => {
		fetchData()
	}, []) // eslint-disable-line react-hooks/exhaustive-deps

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
				return 'bg-emerald-500/20 border-emerald-500/30'
			case 'degraded':
				return 'bg-amber-500/20 border-amber-500/30'
			case 'down':
				return 'bg-red-500/20 border-red-500/30'
			default:
				return 'bg-white/10 border-white/10'
		}
	}

	const getScoreColor = (score: number) => {
		if (score >= 0.8) return 'text-emerald-400'
		if (score >= 0.6) return 'text-amber-400'
		return 'text-red-400'
	}

	const updatedAtAbs = metrics?.updatedAt
		? new Date(metrics.updatedAt).toLocaleString(locale)
		: '—'
	const updatedAtRel = metrics?.updatedAt
		? dayjs(metrics.updatedAt).locale(effectiveLocale).fromNow()
		: null

	// Helper to render simple sparkline chart
	const renderSparkline = (points: { timestamp: number; value: number }[]) => {
		if (points.length === 0) return null

		const values = points.map(p => p.value)
		const max = Math.max(...values)
		const min = Math.min(...values)
		const range = max - min || 1

		const width = 200
		const height = 40
		const pathPoints = points.map((p, i) => {
			const x = (i / (points.length - 1)) * width
			const y = height - ((p.value - min) / range) * height
			return `${x},${y}`
		})

		return (
			<svg width={width} height={height} className='text-blue-400'>
				<polyline
					fill='none'
					stroke='currentColor'
					strokeWidth='2'
					points={pathPoints.join(' ')}
				/>
			</svg>
		)
	}

	return (
		<div className='space-y-8 animate-fade-in'>
			{/* Header */}
			<div className='relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/5 border border-white/10 backdrop-blur-sm p-8'>
				<div className='absolute top-0 right-0 w-32 h-32 bg-purple-400/10 rounded-full blur-3xl' />
				<div className='absolute bottom-0 left-0 w-24 h-24 bg-blue-400/10 rounded-full blur-2xl' />
				
				<div className='relative z-10 flex items-center justify-between'>
					<div className='space-y-2'>
						<h1 className='text-3xl font-bold flex items-center gap-3 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent'>
							<div className='rounded-xl bg-gradient-to-br from-purple-400/20 to-blue-400/10 p-3 border border-purple-400/20'>
								<Icon name='chart' className='h-6 w-6 text-purple-400' />
							</div>
							{t('title')}
						</h1>
						<p className='text-white/70 max-w-2xl'>{t('description')}</p>
					</div>
					<button
						type='button'
						onClick={fetchData}
						disabled={loading}
						className='group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-400/30 px-6 py-3 text-sm font-medium text-white transition-all duration-300 hover:from-purple-500/30 hover:to-blue-500/30 hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/20 disabled:opacity-50'
					>
						<div className='absolute inset-0 rounded-xl bg-gradient-to-r from-purple-400/20 to-blue-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
						<Icon
							name='arrow-path'
							className={cn('h-4 w-4 relative z-10', loading && 'animate-spin')}
						/>
						<span className='relative z-10'>{t('refresh')}</span>
					</button>
				</div>
			</div>

			{/* Mise à jour */}
			<div className='flex items-center gap-2 text-xs text-white/50 bg-white/5 rounded-lg px-4 py-2 border border-white/10 backdrop-blur-sm'>
				<Icon name='clock' className='h-3 w-3 text-blue-400' />
				<span>{t('updatedAt')}: {updatedAtAbs}</span>
				{updatedAtRel && <span className='text-white/60'>({updatedAtRel})</span>}
			</div>

			{/* Métriques principales */}
			<div className='grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5'>
				<div className='group relative overflow-hidden rounded-2xl border border-blue-400/20 bg-gradient-to-br from-blue-500/10 to-blue-500/5 backdrop-blur-sm p-6 transition-all duration-300 hover:border-blue-400/40 hover:shadow-lg hover:shadow-blue-500/20'>
					<div className='absolute top-0 right-0 w-16 h-16 bg-blue-400/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500' />
					<div className='relative z-10'>
						<div className='flex items-center gap-3 mb-4'>
							<div className='rounded-xl bg-blue-400/20 p-2.5 border border-blue-400/30'>
								<Icon name='clock' className='h-5 w-5 text-blue-400' />
							</div>
							<p className='text-sm font-medium text-blue-300'>{t('avgLatency')}</p>
						</div>
						<p className='text-3xl font-bold text-white mb-3'>
							{metrics?.avgLatencyMs || 0}
							<span className='text-sm text-blue-300 ml-2'>ms</span>
						</p>
						<div className='space-y-1 text-xs text-white/60'>
							<div className='flex justify-between'>
								<span>LLM:</span>
								<span className='text-white/80'>{metrics?.avgLlmLatencyMs || 0}ms</span>
							</div>
							<div className='flex justify-between'>
								<span>Retrieval:</span>
								<span className='text-white/80'>{metrics?.avgRetrievalLatencyMs || 0}ms</span>
							</div>
						</div>
					</div>
				</div>

				<div className='group relative overflow-hidden rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 backdrop-blur-sm p-6 transition-all duration-300 hover:border-emerald-400/40 hover:shadow-lg hover:shadow-emerald-500/20'>
					<div className='absolute top-0 right-0 w-16 h-16 bg-emerald-400/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500' />
					<div className='relative z-10'>
						<div className='flex items-center gap-3 mb-4'>
							<div className='rounded-xl bg-emerald-400/20 p-2.5 border border-emerald-400/30'>
								<Icon name='check-badge' className='h-5 w-5 text-emerald-400' />
							</div>
							<p className='text-sm font-medium text-emerald-300'>{t('faithfulness')}</p>
						</div>
						<p className={cn('text-3xl font-bold mb-3', getScoreColor(metrics?.avgFaithfulness || 0))}>
							{((metrics?.avgFaithfulness || 0) * 100).toFixed(1)}%
						</p>
						<div className='h-2 bg-emerald-500/20 rounded-full overflow-hidden'>
							<div 
								className='h-full bg-gradient-to-r from-emerald-400 to-emerald-300 rounded-full transition-all duration-1000 ease-out'
								style={{width: `${(metrics?.avgFaithfulness || 0) * 100}%`}}
							/>
						</div>
					</div>
				</div>

				<div className='group relative overflow-hidden rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/10 to-amber-500/5 backdrop-blur-sm p-6 transition-all duration-300 hover:border-amber-400/40 hover:shadow-lg hover:shadow-amber-500/20'>
					<div className='absolute top-0 right-0 w-16 h-16 bg-amber-400/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500' />
					<div className='relative z-10'>
						<div className='flex items-center gap-3 mb-4'>
							<div className='rounded-xl bg-amber-400/20 p-2.5 border border-amber-400/30'>
								<Icon name='exclamation-triangle' className='h-5 w-5 text-amber-400' />
							</div>
							<p className='text-sm font-medium text-amber-300'>{t('abstentionRate')}</p>
						</div>
						<p className='text-3xl font-bold text-amber-400 mb-3'>
							{((metrics?.abstentionRate || 0) * 100).toFixed(1)}%
						</p>
						<div className='h-2 bg-amber-500/20 rounded-full overflow-hidden'>
							<div 
								className='h-full bg-gradient-to-r from-amber-400 to-amber-300 rounded-full transition-all duration-1000 ease-out'
								style={{width: `${(metrics?.abstentionRate || 0) * 100}%`}}
							/>
						</div>
					</div>
				</div>

				<div className='group relative overflow-hidden rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 backdrop-blur-sm p-6 transition-all duration-300 hover:border-cyan-400/40 hover:shadow-lg hover:shadow-cyan-500/20'>
					<div className='absolute top-0 right-0 w-16 h-16 bg-cyan-400/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500' />
					<div className='relative z-10'>
						<div className='flex items-center gap-3 mb-4'>
							<div className='rounded-xl bg-cyan-400/20 p-2.5 border border-cyan-400/30'>
								<Icon name='sparkles' className='h-5 w-5 text-cyan-400' />
							</div>
							<p className='text-sm font-medium text-cyan-300'>{t('queries24h')}</p>
						</div>
						<p className='text-3xl font-bold text-cyan-400 mb-3'>{metrics?.totalQueries24h || 0}</p>
						<div className='flex items-center gap-2 text-xs text-cyan-300/60'>
							<Icon name='chart' className='h-3 w-3' />
							<span>24h volume</span>
						</div>
					</div>
				</div>

				<div className='group relative overflow-hidden rounded-2xl border border-green-400/20 bg-gradient-to-br from-green-500/10 to-green-500/5 backdrop-blur-sm p-6 transition-all duration-300 hover:border-green-400/40 hover:shadow-lg hover:shadow-green-500/20'>
					<div className='absolute top-0 right-0 w-16 h-16 bg-green-400/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500' />
					<div className='relative z-10'>
						<div className='flex items-center gap-3 mb-4'>
							<div className='rounded-xl bg-green-400/20 p-2.5 border border-green-400/30'>
								<Icon name='currency-dollar' className='h-5 w-5 text-green-400' />
							</div>
							<p className='text-sm font-medium text-green-300'>{t('cost24h')}</p>
						</div>
						<p className='text-3xl font-bold text-green-400 mb-3'>
							${(metrics?.totalCost24h || 0).toFixed(4)}
						</p>
						<div className='flex items-center gap-2 text-xs text-green-300/60'>
							<Icon name='chart' className='h-3 w-3' />
							<span>Total cost</span>
						</div>
					</div>
				</div>
			</div>

			{/* Services Health */}
			<div className='rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm p-8'>
				<div className='flex items-center gap-3 mb-6'>
					<div className='rounded-xl bg-purple-400/20 p-3 border border-purple-400/30'>
						<Icon name='server' className='h-5 w-5 text-purple-400' />
					</div>
					<h2 className='text-xl font-semibold text-white'>{t('servicesHealth')}</h2>
				</div>

				<div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
					{services.map(service => (
						<div
							key={service.name}
							className={cn(
								'group relative overflow-hidden rounded-xl border p-5 transition-all duration-300 hover:scale-[1.02]',
								getStatusBg(service.status),
							)}
						>
							<div className={cn(
								'absolute top-0 right-0 w-12 h-12 rounded-full blur-xl opacity-50 group-hover:scale-150 transition-transform duration-500',
								service.status === 'healthy' && 'bg-emerald-400',
								service.status === 'degraded' && 'bg-amber-400',
								service.status === 'down' && 'bg-red-400',
							)} />
							<div className='relative z-10'>
								<div className='flex items-center justify-between mb-3'>
									<div className='flex items-center gap-3'>
										<div className={cn(
											'relative h-3 w-3 rounded-full',
											service.status === 'healthy' && 'bg-emerald-400',
											service.status === 'degraded' && 'bg-amber-400',
											service.status === 'down' && 'bg-red-400',
										)}>
										<span className={cn(
											'absolute inset-0 rounded-full animate-ping',
											service.status === 'healthy' && 'bg-emerald-400/30',
											service.status === 'degraded' && 'bg-amber-400/30',
											service.status === 'down' && 'bg-red-400/30',
										)} />
										</div>
										<span className='font-medium text-white capitalize'>
											{service.name.replace(/-/g, ' ')}
										</span>
									</div>
									<span className={cn('text-sm font-medium px-3 py-1 rounded-full border', getStatusColor(service.status), getStatusBg(service.status))}>
										{t(`status.${service.status}`)}
									</span>
								</div>
								{service.latencyMs !== undefined && (
									<div className='flex items-center gap-2 text-sm text-white/60'>
										<Icon name='clock' className='h-4 w-4' />
										<span>{t('responseTime')}: {service.latencyMs}ms</span>
									</div>
								)}
								{service.error && (
									<div className='mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20'>
										<p className='text-sm text-red-400 flex items-center gap-2'>
											<Icon name='exclamation-triangle' className='h-4 w-4' />
											{service.error}
										</p>
									</div>
								)}
							</div>
						</div>
					))}

					{services.length === 0 && !loading && (
						<div className='col-span-full text-center py-16 space-y-4'>
							<div className='relative mx-auto w-16 h-16'>
								<Icon name='server' className='h-8 w-8 mx-auto text-white/30' />
								<div className='absolute inset-0 h-8 w-8 rounded-full bg-purple-400/20 animate-pulse' />
							</div>
							<p className='text-white/50 text-lg'>{t('noServices')}</p>
							<p className='text-white/30 text-sm'>Configurez les services pour commencer le monitoring</p>
						</div>
					)}
				</div>
			</div>

			{/* Datadog Metrics */}
			<div className='rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm p-8'>
				<div className='flex items-center justify-between mb-6'>
					<div className='flex items-center gap-3'>
						<div className='rounded-xl bg-purple-400/20 p-3 border border-purple-400/30'>
							<Icon name='chart' className='h-5 w-5 text-purple-400' />
						</div>
						<h2 className='text-xl font-semibold text-white'>{t('datadogMetrics')}</h2>
					</div>
					{!datadogAvailable && (
						<span className='text-xs text-amber-400 bg-amber-500/20 px-3 py-1.5 rounded-full border border-amber-500/30 flex items-center gap-2'>
							<Icon name='exclamation-triangle' className='h-3 w-3' />
							{t('datadogNotConfigured')}
						</span>
					)}
				</div>

				{datadogAvailable && timeseries.length > 0 ? (
					<div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
						{timeseries.map((ts, index) => (
							<div key={ts.metric} className='group relative overflow-hidden rounded-xl border border-purple-400/20 bg-gradient-to-br from-purple-500/10 to-purple-500/5 backdrop-blur-sm p-6 transition-all duration-300 hover:border-purple-400/40 hover:shadow-lg hover:shadow-purple-500/20 animate-slide-up' 
								 style={{animationDelay: `${index * 100}ms`}}>
								<div className='absolute top-0 right-0 w-16 h-16 bg-purple-400/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500' />
								<div className='relative z-10'>
									<div className='flex items-center gap-3 mb-4'>
										<div className='rounded-lg bg-purple-400/20 p-2 border border-purple-400/30'>
											<Icon name='chart' className='h-4 w-4 text-purple-400' />
										</div>
										<p className='text-sm font-medium text-purple-300 capitalize'>
											{ts.metric.split('.').pop()?.replace(/_/g, ' ')}
										</p>
									</div>
									{ts.points.length > 0 ? (
										<>
											<div className='relative h-20 mb-4 overflow-hidden rounded-lg bg-purple-500/5 border border-purple-500/10 p-2'>
												{renderSparkline(ts.points)}
												<div className='absolute inset-0 bg-gradient-to-t from-purple-500/10 to-transparent pointer-events-none' />
											</div>
											<div className='flex items-center justify-between text-xs'>
												<span className='text-white/60'>{t('lastValue')}:</span>
												<span className='text-white font-medium'>
													{ts.points[ts.points.length - 1]?.value.toFixed(2)}
												</span>
											</div>
										</>
									) : (
										<div className='text-center py-8 space-y-3'>
											<div className='relative mx-auto w-12 h-12'>
												<Icon name='chart' className='h-6 w-6 mx-auto text-white/30' />
												<div className='absolute inset-0 h-6 w-6 rounded-full bg-purple-400/20 animate-pulse' />
											</div>
											<p className='text-sm text-white/40'>{t('noData')}</p>
										</div>
									)}
								</div>
							</div>
						))}
					</div>
				) : (
					<div className='text-center py-16 space-y-6'>
						<div className='relative mx-auto w-20 h-20'>
							<Icon name='chart' className='h-10 w-10 mx-auto text-white/30' />
							<div className='absolute inset-0 h-10 w-10 rounded-full bg-purple-400/20 animate-pulse' />
						</div>
						<div>
							<p className='text-white/50 text-lg mb-2'>
								{datadogAvailable ? t('noData') : t('configureDatadog')}
							</p>
							{!datadogAvailable && (
								<p className='text-white/30 text-sm max-w-md mx-auto'>
									Configurez Datadog pour voir les métriques historiques et les graphiques de performance
								</p>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
