'use client'

import {useTranslations} from 'next-intl'
import {useCallback, useRef, useState} from 'react'
import ReactMarkdown from 'react-markdown'
import {useRagApi, type RagChatMessage, type RagChatResponse} from '@/lib/useRagApi'
import {Icon} from '@/lib/icons'
import {cn} from '@/lib/utils'
import '../rag-stats/animations.css'

/**
 * RagChatPage
 * Interface de chat complète avec historique et sources.
 */
export function RagChatPage() {
	const t = useTranslations('pages.ragChat')
	const api = useRagApi()
	const [messages, setMessages] = useState<RagChatMessage[]>([])
	const [input, setInput] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const messagesEndRef = useRef<HTMLDivElement>(null)

	const scrollToBottom = useCallback(() => {
		messagesEndRef.current?.scrollIntoView({behavior: 'smooth'})
	}, [])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!input.trim() || loading) return

		const userMessage: RagChatMessage = {
			role: 'user',
			content: input.trim(),
		}

		setMessages(prev => [...prev, userMessage])
		setInput('')
		setLoading(true)
		setError(null)

		try {
			const response: RagChatResponse = await api.chat({query: userMessage.content})

			// Dédupliquer les sources par document_id, en gardant le meilleur score
			const sourceMap = new Map<string, {
				chunk_id: string
				document_title: string
				similarity: number
			}>()

			for (const s of response.sources) {
				const docId = (s as Record<string, unknown>).document_id as string || s.chunk_id
				const title = (s as Record<string, unknown>).title as string || s.document_title || 'Document'
				const similarity = (s as Record<string, unknown>).similarity_score as number ?? s.similarity ?? 0

				const existing = sourceMap.get(docId)
				if (!existing || similarity > existing.similarity) {
					sourceMap.set(docId, {
						chunk_id: s.chunk_id,
						document_title: title,
						similarity,
					})
				}
			}

			const assistantMessage: RagChatMessage = {
				role: 'assistant',
				content: response.answer,
				sources: Array.from(sourceMap.values()),
				faithfulness_score: response.faithfulness_score,
				abstained: response.abstained,
				latency_ms: response.metrics.total_latency_ms,
			}

			setMessages(prev => [...prev, assistantMessage])
			setTimeout(scrollToBottom, 100)
		} catch (err) {
			setError((err as Error).message)
		} finally {
			setLoading(false)
		}
	}

	const clearHistory = () => {
		setMessages([])
		setError(null)
	}

	return (
		<div className='flex flex-col h-[calc(100vh-8rem)] space-y-6 animate-fade-in'>
			{/* Header */}
			<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-slide-down'>
				<div className='space-y-2'>
					<h1 className='text-3xl font-bold flex items-center gap-3 bg-linear-to-r from-white to-white/80 bg-clip-text text-transparent'>
						<div className='relative'>
							<Icon name='chat' className='h-8 w-8 text-blue-400 animate-pulse' />
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
						<span>{messages.length} {t('messages')}</span>
					</div>
				</div>
				<button
					type='button'
					onClick={clearHistory}
					disabled={messages.length === 0}
					className='inline-flex items-center gap-2 rounded-lg border border-white/10 bg-linear-to-r from-white/5 to-white/2 px-4 py-2.5 text-sm font-medium text-white/90 transition-all duration-200 hover:border-white/20 hover:bg-white/10 hover:shadow-lg hover:shadow-white/5 disabled:opacity-50 disabled:hover:border-white/10 disabled:hover:bg-white/5 disabled:hover:shadow-none'
				>
					<Icon name='trash' className='h-4 w-4' />
					{t('clearHistory')}
				</button>
			</div>

			{/* Messages */}
			<div className='flex-1 overflow-y-auto rounded-xl border border-white/10 bg-linear-to-br from-white/5 to-white/2 p-4 sm:p-6 space-y-4 backdrop-blur-sm animate-slide-up'>
				{messages.length === 0 && (
					<div className='flex flex-col items-center justify-center h-full text-center space-y-4'>
						<div className='relative'>
							<Icon name='sparkles' className='h-16 w-16 text-white/20' />
							<div className='absolute inset-0 h-16 w-16 rounded-full bg-blue-400/20 animate-pulse' />
						</div>
						<div>
							<p className='text-xl font-medium text-white/70'>{t('emptyState')}</p>
							<p className='text-sm text-white/40 mt-2 max-w-md'>{t('emptyStateHint')}</p>
						</div>
					</div>
				)}

				{messages.map((msg, idx) => (
					<MessageBubble key={idx} message={msg} t={t} index={idx} />
				))}

				{loading && (
					<div className='flex items-center gap-3 p-4 rounded-lg bg-white/5 animate-pulse'>
						<div className='flex items-center gap-2'>
							<Icon name='arrow-path' className='h-4 w-4 animate-spin text-blue-400' />
							<span className='text-sm text-white/60'>{t('thinking')}</span>
						</div>
						<div className='flex gap-1'>
							<div className='w-2 h-2 rounded-full bg-blue-400 animate-bounce' style={{animationDelay: '0ms'}} />
							<div className='w-2 h-2 rounded-full bg-blue-400 animate-bounce' style={{animationDelay: '150ms'}} />
							<div className='w-2 h-2 rounded-full bg-blue-400 animate-bounce' style={{animationDelay: '300ms'}} />
						</div>
					</div>
				)}

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

				<div ref={messagesEndRef} />
			</div>

			{/* Input */}
			<form onSubmit={handleSubmit} className='space-y-4 animate-slide-up'>
				<div className='relative group'>
					<div className='absolute inset-0 rounded-xl bg-linear-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
					<div className='relative flex gap-3 p-1 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm transition-all duration-300 group-hover:border-white/20'>
						<input
							type='text'
							value={input}
							onChange={e => setInput(e.target.value)}
							placeholder={t('inputPlaceholder')}
							disabled={loading}
							className='flex-1 bg-transparent border-0 px-4 py-3 text-sm placeholder:text-white/40 focus:outline-none focus:ring-0 text-white'
						/>
						<button
							type='submit'
							disabled={loading || !input.trim()}
							className='rounded-lg bg-linear-to-r from-blue-600 to-blue-500 px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg hover:shadow-blue-500/25'
						>
							{loading ? (
								<Icon name='arrow-path' className='h-5 w-5 animate-spin' />
							) : (
								<>
									<Icon name='paper-airplane' className='h-5 w-5' />
									{t('send')}
								</>
							)}
						</button>
					</div>
					{/* Character count */}
					{input.length > 0 && (
						<div className='absolute -top-2 right-3 text-xs text-white/40 bg-black/50 px-2 py-1 rounded'>
							{input.length}/500
						</div>
					)}
				</div>
			</form>
		</div>
	)
}

function MessageBubble({
	message,
	t,
	index,
}: {
	message: RagChatMessage
	t: ReturnType<typeof useTranslations>
	index: number
}) {
	const isUser = message.role === 'user'

	return (
		<div className={cn('flex', isUser ? 'justify-end' : 'justify-start animate-fade-in')} style={{animationDelay: `${index * 100}ms`}}>
			<div
				className={cn(
					'group relative max-w-[80%] sm:max-w-[70%] rounded-2xl p-4 transition-all duration-300 hover:shadow-lg',
					isUser
						? 'bg-linear-to-r from-blue-600 to-blue-500 text-white hover:from-blue-500 hover:to-blue-400'
						: 'bg-linear-to-br from-white/10 to-white/5 text-white border border-white/10 hover:border-white/20',
				)}
			>
				{/* Timestamp */}
				<div className={cn('absolute -top-2 text-xs text-white/40', isUser ? 'right-2' : 'left-2')}>
					{new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
				</div>

				{/* Avatar */}
				<div className={cn('absolute -top-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium', isUser ? '-right-1 bg-blue-600 text-white' : '-left-1 bg-white/20 text-white/80')}>
					{isUser ? 'U' : 'AI'}
				</div>

				<div className='text-sm leading-relaxed prose prose-invert prose-sm max-w-none prose-headings:text-white prose-p:text-white/90 prose-li:text-white/90 prose-strong:text-white prose-em:text-white/80 prose-code:text-white prose-blockquote:text-white/80 prose-blockquote:border-l-white/20 prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline'>
					<ReactMarkdown>{message.content}</ReactMarkdown>
				</div>

				{!isUser && message.sources && message.sources.length > 0 && (
					<div className='mt-4 pt-3 border-t border-white/10 space-y-3'>
						<div className='flex items-center gap-2 text-xs text-white/50 font-medium'>
							<Icon name='document' className='h-3 w-3' />
							{t('sources')} ({message.sources.length})
						</div>
						<div className='space-y-2'>
							{message.sources.slice(0, 3).map((source, idx) => (
								<div
									key={idx}
									className='group/bento rounded-lg bg-white/5 border border-white/10 p-3 transition-all duration-200 hover:bg-white/10 hover:border-white/20'
								>
									<div className='flex items-start justify-between gap-2'>
										<div className='flex-1 min-w-0'>
											<p className='text-xs font-medium text-white truncate'>{source.document_title}</p>
											<p className='text-xs text-white/40 mt-1'>{t('similarity')}: {(source.similarity * 100).toFixed(0)}%</p>
										</div>
										<div className='flex items-center gap-1 text-xs text-emerald-400'>
											<Icon name='check-badge' className='h-3 w-3' />
											<span>{(source.similarity * 100).toFixed(0)}%</span>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				)}

				{!isUser && (
					<div className='mt-3 flex flex-wrap items-center gap-3 text-xs text-white/40'>
						{message.faithfulness_score !== undefined && (
							<span className='flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-400/10 text-emerald-400'>
								<Icon name='check-badge' className='h-3 w-3' />
								{(message.faithfulness_score * 100).toFixed(0)}%
							</span>
						)}
						{message.latency_ms !== undefined && (
							<span className='flex items-center gap-1 px-2 py-1 rounded-full bg-cyan-400/10 text-cyan-400'>
								<Icon name='clock' className='h-3 w-3' />
								{Math.round(message.latency_ms)}ms
							</span>
						)}
						{message.abstained && (
							<span className='flex items-center gap-1 px-2 py-1 rounded-full bg-amber-400/10 text-amber-400'>
								<Icon name='exclamation-triangle' className='h-3 w-3' />
								{t('abstained')}
							</span>
						)}
					</div>
				)}
			</div>
		</div>
	)
}
