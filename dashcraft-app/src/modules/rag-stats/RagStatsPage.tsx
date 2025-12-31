'use client'

import {useTranslations} from 'next-intl'
import {useCallback, useEffect, useMemo, useState} from 'react'
import {useRagApi, type RagStatsResponse} from '@/lib/useRagApi'
import {Icon} from '@/lib/icons'
import {Line} from 'react-chartjs-2'
import {CHART_CANVAS_CLASS, CHART_HEIGHT_CLASS} from '@/config/ui'
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	Tooltip,
	Legend,
	type ChartData,
	type ChartOptions,
} from 'chart.js'
import './animations.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

/**
 * RagStatsPage
 * Page complète des statistiques RAGGuard avec graphiques et métriques détaillées.
 */
export function RagStatsPage() {
	const t = useTranslations('pages.ragStats')
	const api = useRagApi()
	const [data, setData] = useState<RagStatsResponse | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [currentTime, setCurrentTime] = useState<string>('')
	const [mounted, setMounted] = useState(false)

	// Fix hydration issue
	useEffect(() => {
		setMounted(true)
		setCurrentTime(new Date().toLocaleTimeString())
		const timer = setInterval(() => {
			setCurrentTime(new Date().toLocaleTimeString())
		}, 1000)
		return () => clearInterval(timer)
	}, [])

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

	const formatPercent = (value: number | null | undefined) => {
		if (value === null || value === undefined) return '—'
		return `${(value * 100).toFixed(1)}%`
	}

	const formatLatency = (value: number | null | undefined) => {
		if (value === null || value === undefined) return '—'
		return `${Math.round(value)}ms`
	}

	// Mock chart data - en production, récupérer depuis l'historique
	const chartData: ChartData<'line'> = useMemo(() => ({
		labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
		datasets: [
			{
				label: t('faithfulness'),
				data: [0.85, 0.82, 0.88, 0.79, 0.91, 0.87, data?.stats.avg_faithfulness ?? 0.85],
				borderColor: 'rgb(52, 211, 153)',
				backgroundColor: 'rgba(52, 211, 153, 0.2)',
				tension: 0.3,
			},
			{
				label: t('abstentionRate'),
				data: [0.12, 0.15, 0.08, 0.18, 0.06, 0.10, data?.stats.abstention_rate ?? 0.10],
				borderColor: 'rgb(251, 191, 36)',
				backgroundColor: 'rgba(251, 191, 36, 0.2)',
				tension: 0.3,
			},
		],
	}), [data, t])

	const chartOptions: ChartOptions<'line'> = useMemo(() => ({
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				display: true,
				position: 'top' as const,
				labels: {color: 'rgba(255,255,255,0.7)'},
			},
		},
		scales: {
			y: {
				min: 0,
				max: 1,
				grid: {color: 'rgba(255,255,255,0.06)'},
				ticks: {color: 'rgba(255,255,255,0.5)'},
			},
			x: {
				grid: {color: 'rgba(255,255,255,0.06)'},
				ticks: {color: 'rgba(255,255,255,0.5)'},
			},
		},
	}), [])

	return (
		<div className='space-y-8 animate-fade-in'>
			{/* Header */}
			<div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 animate-slide-down'>
				<div className='space-y-2'>
					<h1 className='text-3xl font-bold flex items-center gap-3 bg-linear-to-r from-white to-white/80 bg-clip-text text-transparent'>
						<Icon name='shield' className='h-8 w-8 text-emerald-400 animate-pulse' />
						{t('title')}
					</h1>
					<p className='text-base text-white/70 max-w-2xl'>{t('description')}</p>
					<div className='flex items-center gap-4 text-sm text-white/50'>
						<span className='flex items-center gap-1'>
							<div className='h-2 w-2 rounded-full bg-emerald-400 animate-pulse' />
							{t('live')}
						</span>
						<span>•</span>
						<span>{t('lastUpdate')}: {mounted ? currentTime : ''}</span>
					</div>
				</div>
				<button
					type='button'
					onClick={fetchStats}
					disabled={loading}
					className='inline-flex items-center gap-2 rounded-lg border border-white/10 bg-linear-to-r from-white/5 to-white/2 px-4 py-2.5 text-sm font-medium text-white/90 transition-all duration-200 hover:border-white/20 hover:bg-white/10 hover:shadow-lg hover:shadow-white/5 disabled:opacity-50 disabled:hover:border-white/10 disabled:hover:bg-white/5 disabled:hover:shadow-none'
				>
					<Icon name='arrow-path' className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
					{t('refresh')}
				</button>
			</div>

			{error && (
				<div className='rounded-xl bg-red-500/10 border border-red-500/20 p-4 backdrop-blur-sm animate-slide-down'>
					<p className='text-sm text-red-400'>{error}</p>
				</div>
			)}

			{/* Key Metrics Section */}
			<div className='space-y-4 animate-slide-up'>
				<div className='flex items-center gap-2 mb-4'>
					<Icon name='chart' className='h-5 w-5 text-white/60' />
					<h2 className='text-lg font-semibold text-white'>{t('keyMetrics')}</h2>
				</div>
				<div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4'>
					<StatCard
						icon='document'
						iconColor='text-blue-400'
						label={t('documents')}
						value={data?.stats.total_documents ?? 0}
						trend={{value: 12, isPositive: true}}
						className='animate-stagger-1'
					/>
					<StatCard
						icon='folder-open'
						iconColor='text-purple-400'
						label={t('chunks')}
						value={data?.stats.total_chunks ?? 0}
						trend={{value: 8, isPositive: true}}
						className='animate-stagger-2'
					/>
					<StatCard
						icon='chat'
						iconColor='text-green-400'
						label={t('queries')}
						value={data?.stats.total_queries ?? 0}
						trend={{value: 15, isPositive: true}}
						className='animate-stagger-3'
					/>
					<StatCard
						icon='check-badge'
						iconColor='text-emerald-400'
						label={t('faithfulness')}
						value={formatPercent(data?.stats.avg_faithfulness)}
						trend={{value: 2.3, isPositive: true}}
						className='animate-stagger-4'
					/>
					<StatCard
						icon='exclamation-triangle'
						iconColor='text-amber-400'
						label={t('abstentionRate')}
						value={formatPercent(data?.stats.abstention_rate)}
						trend={{value: 1.2, isPositive: false}}
						className='animate-stagger-5'
					/>
					<StatCard
						icon='clock'
						iconColor='text-cyan-400'
						label={t('avgLatency')}
						value={formatLatency(data?.stats.avg_latency_ms)}
						trend={{value: 5, isPositive: false}}
						className='animate-stagger-6'
					/>
				</div>
			</div>

			{/* Analytics Section */}
			<div className='grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 animate-fade-in'>
				{/* Chart - Takes 2 columns */}
				<div className='md:col-span-2 space-y-4'>
					<div className='flex items-center gap-2 mb-4'>
						<Icon name='chart' className='h-5 w-5 text-white/60' />
						<h2 className='text-lg font-semibold text-white'>{t('analytics')}</h2>
					</div>
					<div className='rounded-xl border border-white/10 bg-linear-to-br from-white/5 to-white/2 p-4 sm:p-6 backdrop-blur-sm transition-all duration-300 hover:border-white/20'>
						<div className='mb-4 sm:mb-6 flex items-center justify-between'>
							<h2 className='text-lg font-semibold text-white'>{t('weeklyTrends')}</h2>
							<div className='flex items-center gap-2 text-sm text-white/60'>
								<div className='h-2 w-2 rounded-full bg-emerald-400' />
								<span>{t('faithfulness')}</span>
								<div className='ml-4 h-2 w-2 rounded-full bg-amber-400' />
								<span>{t('abstentionRate')}</span>
							</div>
						</div>
						<div className={CHART_HEIGHT_CLASS}>
							<Line data={chartData} options={chartOptions} className={CHART_CANVAS_CLASS} />
						</div>
					</div>
				</div>

				{/* 24h Summary - Takes 1 column */}
				{data?.trends?.last_24h && (
					<div className='space-y-4'>
						<div className='flex items-center gap-2 mb-4'>
							<Icon name='clock' className='h-5 w-5 text-white/60' />
							<h2 className='text-lg font-semibold text-white'>{t('last24hSummary')}</h2>
						</div>
						<div className='rounded-xl border border-white/10 bg-linear-to-br from-white/5 to-white/2 p-4 sm:p-6 backdrop-blur-sm transition-all duration-300 hover:border-white/20'>
							<div className='mb-4 sm:mb-6 flex items-center justify-between'>
								<h2 className='text-lg font-semibold text-white'>{t('last24hSummary')}</h2>
								<span className='rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-400'>
									{t('live')}
								</span>
							</div>
							<div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6'>
								<div className='text-center'>
									<div className='mb-2 rounded-lg bg-white/5 p-3'>
										<p className='text-2xl font-bold text-white'>{data.trends.last_24h.query_count}</p>
									</div>
									<p className='text-sm font-medium text-white/70'>{t('queries')}</p>
								</div>
								<div className='text-center'>
									<div className='mb-2 rounded-lg bg-white/5 p-3'>
										<p className='text-2xl font-bold text-white'>
											{formatPercent(data.trends.last_24h.avg_faithfulness)}
										</p>
									</div>
									<p className='text-sm font-medium text-white/70'>{t('faithfulness')}</p>
								</div>
								<div className='text-center'>
									<div className='mb-2 rounded-lg bg-white/5 p-3'>
										<p className='text-2xl font-bold text-white'>
											{formatPercent(data.trends.last_24h.abstention_rate)}
										</p>
									</div>
									<p className='text-sm font-medium text-white/70'>{t('abstentionRate')}</p>
								</div>
								<div className='text-center'>
									<div className='mb-2 rounded-lg bg-white/5 p-3'>
										<p className='text-2xl font-bold text-white'>
											{formatLatency(data.trends.last_24h.avg_latency_ms)}
										</p>
									</div>
									<p className='text-sm font-medium text-white/70'>{t('avgLatency')}</p>
								</div>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}

function StatCard({
	icon,
	iconColor,
	label,
	value,
	trend,
	className,
}: {
	icon: Parameters<typeof Icon>[0]['name']
	iconColor: string
	label: string
	value: string | number
	trend?: {
		value: number
		isPositive: boolean
	}
	className?: string
}) {
	return (
		<div className={`group relative overflow-hidden rounded-xl border border-white/10 bg-linear-to-br from-white/5 to-white/2 p-4 sm:p-6 transition-all duration-300 hover:border-white/20 hover:bg-white/10 hover:shadow-lg hover:shadow-white/5 animate-slide-up ${className || ''}`}>
			{/* Background decoration */}
			<div className='absolute -right-4 -top-4 h-16 w-16 rounded-full bg-linear-to-br from-white/10 to-transparent opacity-50 transition-opacity duration-300 group-hover:opacity-75' />
			
			<div className='relative z-10 flex items-start justify-between gap-4'>
				<div className='flex-1'>
					<div className='flex items-center gap-3 mb-3'>
						<div className={`rounded-lg bg-white/10 p-2 ${iconColor}`}>
							<Icon name={icon} className='h-5 w-5' />
						</div>
						<span className='text-sm font-medium text-white/70'>{label}</span>
					</div>
					<p className='text-3xl font-bold text-white tabular-nums'>{value}</p>
					{trend && (
						<div className={`mt-2 flex items-center gap-1 text-sm ${trend.isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
							<Icon name={trend.isPositive ? 'arrow-uturn-left' : 'arrow-uturn-left'} className='h-4 w-4' />
							<span>{Math.abs(trend.value)}%</span>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
