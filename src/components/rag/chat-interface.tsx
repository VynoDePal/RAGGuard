// =============================================
// RAG Chat Interface Component
// =============================================

'use client'

import * as React from 'react'
import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, AlertCircle, Sparkles, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { RAGResponse, SourceReference } from '@/types'

interface Message {
	id: string
	role: 'user' | 'assistant'
	content: string
	sources?: SourceReference[]
	faithfulness_score?: number
	abstained?: boolean
	trace_id?: string
	timestamp: Date
}

interface ChatInterfaceProps {
	tenantId: string
	className?: string
}

export function ChatInterface({ tenantId, className }: ChatInterfaceProps) {
	const [messages, setMessages] = useState<Message[]>([])
	const [input, setInput] = useState('')
	const [isLoading, setIsLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const messagesEndRef = useRef<HTMLDivElement>(null)

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}

	useEffect(() => {
		scrollToBottom()
	}, [messages])

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!input.trim() || isLoading) return

		const userMessage: Message = {
			id: crypto.randomUUID(),
			role: 'user',
			content: input.trim(),
			timestamp: new Date(),
		}

		setMessages((prev) => [...prev, userMessage])
		setInput('')
		setIsLoading(true)
		setError(null)

		try {
			const response = await fetch('/api/rag/query', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					query: userMessage.content,
					tenant_id: tenantId,
					language: 'fr',
					options: {
						top_k: 5,
						include_sources: true,
					},
				}),
			})

			if (!response.ok) {
				throw new Error('Erreur lors de la requête')
			}

			const data: RAGResponse = await response.json()

			const assistantMessage: Message = {
				id: crypto.randomUUID(),
				role: 'assistant',
				content: data.answer,
				sources: data.sources,
				faithfulness_score: data.faithfulness_score,
				abstained: data.abstained,
				trace_id: data.trace_id,
				timestamp: new Date(),
			}

			setMessages((prev) => [...prev, assistantMessage])
		} catch (err) {
			setError((err as Error).message)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className={cn('flex h-full flex-col', className)}>
			{/* Messages Area */}
			<div className="flex-1 overflow-y-auto p-4 space-y-4">
				{messages.length === 0 && (
					<div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
						<Sparkles className="h-12 w-12 mb-4 opacity-50" />
						<h3 className="text-lg font-medium">RAGGuard Assistant</h3>
						<p className="text-sm max-w-md mt-2">
							Posez une question et je vous répondrai en me basant sur les documents disponibles.
						</p>
					</div>
				)}

				{messages.map((message) => (
					<div
						key={message.id}
						className={cn(
							'flex',
							message.role === 'user' ? 'justify-end' : 'justify-start'
						)}
					>
						<div
							className={cn(
								'max-w-[80%] rounded-lg px-4 py-3',
								message.role === 'user'
									? 'bg-primary text-primary-foreground'
									: 'bg-muted'
							)}
						>
							<p className="whitespace-pre-wrap">{message.content}</p>

							{/* Sources */}
							{message.sources && message.sources.length > 0 && (
								<div className="mt-3 pt-3 border-t border-border/50">
									<p className="text-xs font-medium mb-2 opacity-70">Sources:</p>
									<div className="space-y-1">
										{message.sources.map((source, idx) => (
											<div
												key={source.chunk_id}
												className="flex items-start gap-2 text-xs opacity-80"
											>
												<FileText className="h-3 w-3 mt-0.5 shrink-0" />
												<span>
													[{idx + 1}] {source.title} ({(source.similarity_score * 100).toFixed(0)}%)
												</span>
											</div>
										))}
									</div>
								</div>
							)}

							{/* Faithfulness indicator */}
							{message.faithfulness_score !== undefined && (
								<div className="mt-2 flex items-center gap-2 text-xs opacity-60">
									<div
										className={cn(
											'h-2 w-2 rounded-full',
											message.faithfulness_score >= 0.75
												? 'bg-green-500'
												: message.faithfulness_score >= 0.5
													? 'bg-yellow-500'
													: 'bg-red-500'
										)}
									/>
									<span>Fidélité: {(message.faithfulness_score * 100).toFixed(0)}%</span>
									{message.trace_id && (
										<span className="ml-2 font-mono">ID: {message.trace_id}</span>
									)}
								</div>
							)}
						</div>
					</div>
				))}

				{isLoading && (
					<div className="flex justify-start">
						<div className="bg-muted rounded-lg px-4 py-3">
							<Loader2 className="h-5 w-5 animate-spin" />
						</div>
					</div>
				)}

				{error && (
					<div className="flex justify-center">
						<div className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 flex items-center gap-2">
							<AlertCircle className="h-4 w-4" />
							<span>{error}</span>
						</div>
					</div>
				)}

				<div ref={messagesEndRef} />
			</div>

			{/* Input Area */}
			<div className="border-t p-4">
				<form onSubmit={handleSubmit} className="flex gap-2">
					<Input
						value={input}
						onChange={(e) => setInput(e.target.value)}
						placeholder="Posez votre question..."
						disabled={isLoading}
						className="flex-1"
					/>
					<Button type="submit" disabled={isLoading || !input.trim()}>
						{isLoading ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Send className="h-4 w-4" />
						)}
					</Button>
				</form>
			</div>
		</div>
	)
}
