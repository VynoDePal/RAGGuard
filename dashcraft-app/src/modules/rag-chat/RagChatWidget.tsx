'use client'

import {WidgetCard} from '@/components/dashboard/WidgetCard'
import {useTranslations} from 'next-intl'
import {useState} from 'react'
import {useRagApi} from '@/lib/useRagApi'
import {Icon} from '@/lib/icons'
import '../rag-stats/animations.css'

/**
 * RagChatWidget
 * Widget compact pour tester rapidement le RAG.
 */
export function RagChatWidget() {
	const t = useTranslations('widgets.ragChat')
	const api = useRagApi()
	const [query, setQuery] = useState('')
	const [answer, setAnswer] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!query.trim() || loading) return

		try {
			setLoading(true)
			setError(null)
			setAnswer(null)
			const response = await api.chat({query: query.trim()})
			setAnswer(response.answer)
		} catch (err) {
			setError((err as Error).message)
		} finally {
			setLoading(false)
		}
	}

	return (
		<WidgetCard id='module-rag-chat' title={t('title')}>
			<div className='space-y-4 animate-fade-in'>
				{/* Header */}
				<div className='flex items-center justify-between'>
					<div className='flex items-center gap-2 text-sm text-white/70'>
						<div className='relative'>
							<Icon name='chat' className='h-4 w-4 text-blue-400' />
							<div className='absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 animate-ping' />
							<div className='absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400' />
						</div>
						<span>{t('quickTest')}</span>
					</div>
				</div>

				{/* Input Form */}
				<form onSubmit={handleSubmit} className='space-y-3'>
					<div className='relative group'>
						<div className='absolute inset-0 rounded-lg bg-linear-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
						<div className='relative flex gap-2 p-1 bg-white/5 rounded-lg border border-white/10 backdrop-blur-sm transition-all duration-300 group-hover:border-white/20'>
							<input
								type='text'
								value={query}
								onChange={e => setQuery(e.target.value)}
								placeholder={t('placeholder')}
								disabled={loading}
								className='flex-1 bg-transparent border-0 px-3 py-2 text-sm placeholder:text-white/40 focus:outline-none focus:ring-0 text-white'
							/>
							<button
								type='submit'
								disabled={loading || !query.trim()}
								className='rounded-md bg-linear-to-r from-blue-600 to-blue-500 px-3 py-2 text-sm font-medium text-white transition-all duration-200 hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-blue-500/25'
							>
								{loading ? (
									<Icon name='arrow-path' className='h-4 w-4 animate-spin' />
								) : (
									<Icon name='paper-airplane' className='h-4 w-4' />
								)}
							</button>
						</div>
					</div>
				</form>

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

			{/* Answer */}
			{answer && (
				<div className='rounded-xl border border-white/10 bg-linear-to-br from-white/5 to-white/2 p-4 backdrop-blur-sm animate-slide-up'>
					<div className='flex items-start gap-3'>
						<div className='rounded-lg bg-emerald-400/20 p-2'>
							<Icon name='check-badge' className='h-4 w-4 text-emerald-400' />
						</div>
						<div className='flex-1 min-w-0'>
							<p className='text-xs font-medium text-emerald-400 mb-2'>{t('answer')}</p>
							<p className='text-sm text-white/90 leading-relaxed line-clamp-4'>{answer}</p>
						</div>
					</div>
				</div>
			)}

			{/* Hint */}
			<div className='flex items-center gap-2 text-xs text-white/40 animate-fade-in'>
				<Icon name='sparkles' className='h-3 w-3' />
				<p>{t('hint')}</p>
			</div>
		</div>
		</WidgetCard>
	)
}
