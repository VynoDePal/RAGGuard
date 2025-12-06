// =============================================
// RAG Stats Dashboard Component
// =============================================

'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import {
	Activity,
	FileText,
	MessageSquare,
	TrendingUp,
	AlertTriangle,
	Clock,
	RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Stats {
	total_documents: number
	total_chunks: number
	total_queries: number
	avg_faithfulness: number | null
	abstention_rate: number | null
	avg_latency_ms: number | null
}

interface Trends {
	last_24h: {
		query_count: number
		avg_faithfulness: number | null
		abstention_rate: number | null
		avg_latency_ms: number | null
	}
}

interface StatsDashboardProps {
	tenantId: string
	className?: string
}

export function StatsDashboard({ tenantId, className }: StatsDashboardProps) {
	const [stats, setStats] = useState<Stats | null>(null)
	const [trends, setTrends] = useState<Trends | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	const fetchStats = async () => {
		setIsLoading(true)
		setError(null)

		try {
			const response = await fetch(`/api/stats?tenant_id=${tenantId}`)
			if (!response.ok) throw new Error('Erreur lors du chargement des stats')

			const data = await response.json()
			setStats(data.stats)
			setTrends(data.trends)
		} catch (err) {
			setError((err as Error).message)
		} finally {
			setIsLoading(false)
		}
	}

	useEffect(() => {
		fetchStats()
		// Refresh every 30 seconds
		const interval = setInterval(fetchStats, 30000)
		return () => clearInterval(interval)
	}, [tenantId])

	const formatNumber = (num: number | null | undefined): string => {
		if (num === null || num === undefined) return '-'
		return num.toLocaleString('fr-FR')
	}

	const formatPercent = (num: number | null | undefined): string => {
		if (num === null || num === undefined) return '-'
		return `${(num * 100).toFixed(1)}%`
	}

	const formatLatency = (ms: number | null | undefined): string => {
		if (ms === null || ms === undefined) return '-'
		if (ms < 1000) return `${Math.round(ms)}ms`
		return `${(ms / 1000).toFixed(2)}s`
	}

	const getHealthColor = (faithfulness: number | null): string => {
		if (faithfulness === null) return 'text-muted-foreground'
		if (faithfulness >= 0.75) return 'text-green-600'
		if (faithfulness >= 0.5) return 'text-yellow-600'
		return 'text-red-600'
	}

	if (error) {
		return (
			<div className={cn('p-4', className)}>
				<Card className="border-destructive">
					<CardContent className="flex items-center gap-2 py-4 text-destructive">
						<AlertTriangle className="h-5 w-5" />
						<span>{error}</span>
						<Button variant="outline" size="sm" onClick={fetchStats} className="ml-auto">
							<RefreshCw className="h-4 w-4 mr-2" />
							Réessayer
						</Button>
					</CardContent>
				</Card>
			</div>
		)
	}

	return (
		<div className={cn('space-y-4', className)}>
			{/* Header */}
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">Tableau de bord RAG</h2>
				<Button variant="outline" size="sm" onClick={fetchStats} disabled={isLoading}>
					<RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
					Actualiser
				</Button>
			</div>

			{/* Main Stats */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Documents</CardTitle>
						<FileText className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{isLoading ? '...' : formatNumber(stats?.total_documents)}
						</div>
						<p className="text-xs text-muted-foreground">
							{formatNumber(stats?.total_chunks)} chunks
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Requêtes</CardTitle>
						<MessageSquare className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{isLoading ? '...' : formatNumber(stats?.total_queries)}
						</div>
						<p className="text-xs text-muted-foreground">
							{formatNumber(trends?.last_24h.query_count)} dernières 24h
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Fidélité</CardTitle>
						<TrendingUp className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className={cn('text-2xl font-bold', getHealthColor(stats?.avg_faithfulness ?? null))}>
							{isLoading ? '...' : formatPercent(stats?.avg_faithfulness)}
						</div>
						<p className="text-xs text-muted-foreground">
							24h: {formatPercent(trends?.last_24h.avg_faithfulness)}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">Latence</CardTitle>
						<Clock className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">
							{isLoading ? '...' : formatLatency(stats?.avg_latency_ms)}
						</div>
						<p className="text-xs text-muted-foreground">
							24h: {formatLatency(trends?.last_24h.avg_latency_ms)}
						</p>
					</CardContent>
				</Card>
			</div>

			{/* Health Indicators */}
			<Card>
				<CardHeader>
					<CardTitle className="text-sm font-medium flex items-center gap-2">
						<Activity className="h-4 w-4" />
						Indicateurs de santé
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{/* Faithfulness indicator */}
						<div className="flex items-center justify-between">
							<span className="text-sm">Score de fidélité</span>
							<div className="flex items-center gap-2">
								<div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
									<div
										className={cn(
											'h-full transition-all',
											(stats?.avg_faithfulness ?? 0) >= 0.75
												? 'bg-green-500'
												: (stats?.avg_faithfulness ?? 0) >= 0.5
													? 'bg-yellow-500'
													: 'bg-red-500'
										)}
										style={{ width: `${(stats?.avg_faithfulness ?? 0) * 100}%` }}
									/>
								</div>
								<span className="text-sm font-medium w-12 text-right">
									{formatPercent(stats?.avg_faithfulness)}
								</span>
							</div>
						</div>

						{/* Abstention rate indicator */}
						<div className="flex items-center justify-between">
							<span className="text-sm">Taux d&apos;abstention</span>
							<div className="flex items-center gap-2">
								<div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
									<div
										className={cn(
											'h-full transition-all',
											(stats?.abstention_rate ?? 0) <= 0.1
												? 'bg-green-500'
												: (stats?.abstention_rate ?? 0) <= 0.25
													? 'bg-yellow-500'
													: 'bg-red-500'
										)}
										style={{ width: `${(stats?.abstention_rate ?? 0) * 100}%` }}
									/>
								</div>
								<span className="text-sm font-medium w-12 text-right">
									{formatPercent(stats?.abstention_rate)}
								</span>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
