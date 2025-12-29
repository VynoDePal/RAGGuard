'use client'

import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {useTranslations, useLocale} from 'next-intl'
import {useApi, type FeedbackEntity} from '@/lib/useApi'
import {Icon} from '@/lib/icons'
import {cn} from '@/lib/utils'

/**
 * FeedbacksPage
 * Page Feedbacks avec recherche, filtres (statut + dates), pagination,
 * création, édition inline, sélection et actions groupées (bulk) et suppression
 * (mock via useApi.feedbacks). A11y + i18n.
 */
export function FeedbacksPage() {
	const tNav = useTranslations('nav')
	const t = useTranslations('pages.feedbacks')
	const locale = useLocale()
	const api = useApi()

	const [q, setQ] = useState('')
	const [statusFilter, setStatusFilter] = useState<'all'|'new'|'in_progress'|'resolved'>('all')
	const [dateFrom, setDateFrom] = useState('')
	const [dateTo, setDateTo] = useState('')
	const [page, setPage] = useState(1)
	const [pageSize, setPageSize] = useState(10)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [data, setData] = useState<{items: FeedbackEntity[]; total: number; totalPages: number} | null>(null)

	const [creating, setCreating] = useState(false)
	const [createAuthor, setCreateAuthor] = useState('')
	const [createComment, setCreateComment] = useState('')
	const [createRating, setCreateRating] = useState<number | ''>('')
	const [createStatus, setCreateStatus] = useState<FeedbackEntity['status']>('new')

	const [editingId, setEditingId] = useState<string | null>(null)
	const [editAuthor, setEditAuthor] = useState('')
	const [editComment, setEditComment] = useState('')
	const [editRating, setEditRating] = useState<number>(1)
	const [editStatus, setEditStatus] = useState<FeedbackEntity['status']>('new')

	const [selectedIds, setSelectedIds] = useState<string[]>([])

	const liveRef = useRef<HTMLDivElement | null>(null)

	const statusOptions = useMemo(() => (
		[
			{value: 'new', label: t('status.new')},
			{value: 'in_progress', label: t('status.in_progress')},
			{value: 'resolved', label: t('status.resolved')},
		]
	), [t])

	function speak (message: string) {
		if (!liveRef.current) return
		liveRef.current.textContent = message
	}

	const allOnPageSelected = useMemo(() => {
		if (!data?.items) return false
		if (data.items.length === 0) return false
		return data.items.every(it => selectedIds.includes(it.id))
	}, [data, selectedIds])

	function toggleSelectAllOnPage () {
		if (!data?.items) return
		if (allOnPageSelected) {
			setSelectedIds(prev => prev.filter(id => !data.items.some(it => it.id === id)))
		} else {
			const idsToAdd = data.items.map(it => it.id)
			setSelectedIds(prev => Array.from(new Set([...prev, ...idsToAdd])))
		}
	}

	function toggleSelectOne (id: string) {
		setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
	}

	async function bulkMark (status: FeedbackEntity['status']) {
		try {
			await api.feedbacks.updateBulk(selectedIds, {status})
			speak(t('live.updated'))
			setSelectedIds([])
			await fetchPage()
		} catch (err) {
			setError((err as Error).message)
		}
	}

	async function bulkDelete () {
		const ok = window.confirm(t('bulk.deleteConfirm'))
		if (!ok) return
		try {
			await api.feedbacks.deleteBulk(selectedIds)
			speak(t('live.deleted'))
			setSelectedIds([])
			await fetchPage()
		} catch (err) {
			setError((err as Error).message)
		}
	}

	function formatDateTime (iso: string) {
		try {
			return new Intl.DateTimeFormat(locale, {dateStyle: 'medium', timeStyle: 'short'}).format(new Date(iso))
		} catch {
			return iso
		}
	}

	const fetchPage = useCallback(async () => {
		setLoading(true)
		setError(null)
		try {
			const res = await api.feedbacks.list({
				page,
				pageSize,
				q,
				status: statusFilter === 'all' ? undefined : statusFilter,
				dateFrom: dateFrom ? new Date(dateFrom + 'T00:00:00.000Z').toISOString() : undefined,
				dateTo: dateTo ? new Date(dateTo + 'T23:59:59.999Z').toISOString() : undefined,
			})
			setData({items: res.items, total: res.total, totalPages: res.totalPages})
		} catch (e) {
			setError((e as Error).message)
		} finally {
			setLoading(false)
		}
	}, [api, page, pageSize, q, statusFilter, dateFrom, dateTo])

	useEffect(() => {
		fetchPage()
		setSelectedIds([])
		setEditingId(null)
	}, [fetchPage])

	function resetCreate () {
		setCreateAuthor('')
		setCreateComment('')
		setCreateRating('')
		setCreateStatus('new')
	}

	async function handleCreate (e: React.FormEvent) {
		e.preventDefault()
		setCreating(true)
		try {
			await api.feedbacks.create({
				author: createAuthor,
				comment: createComment,
				rating: typeof createRating === 'number' ? createRating : 1,
				status: createStatus,
			})
			speak(t('live.created'))
			resetCreate()
			setPage(1)
			await fetchPage()
		} catch (err) {
			setError((err as Error).message)
		} finally {
			setCreating(false)
		}
	}

	function startEdit (f: FeedbackEntity) {
		setEditingId(f.id)
		setEditAuthor(f.author)
		setEditComment(f.comment)
		setEditRating(f.rating)
		setEditStatus(f.status)
	}

	function cancelEdit () {
		setEditingId(null)
	}

	async function saveEdit (id: string) {
		try {
			await api.feedbacks.update(id, {
				author: editAuthor,
				comment: editComment,
				rating: editRating,
				status: editStatus,
			})
			speak(t('live.updated'))
			setEditingId(null)
			await fetchPage()
		} catch (err) {
			setError((err as Error).message)
		}
	}

	async function handleDelete (id: string) {
		const ok = window.confirm(t('deleteConfirm'))
		if (!ok) return
		try {
			await api.feedbacks.delete(id)
			speak(t('live.deleted'))
			await fetchPage()
		} catch (err) {
			setError((err as Error).message)
		}
	}

	function mapStatus (s: FeedbackEntity['status']) {
		if (s === 'new') return t('status.new')
		if (s === 'in_progress') return t('status.in_progress')
		return t('status.resolved')
	}

	return (
		<section aria-labelledby='feedbacks-title' className='space-y-8 animate-fade-in'>
			{/* Header */}
			<div className='relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/5 border border-white/10 backdrop-blur-sm p-8'>
				<div className='absolute top-0 right-0 w-32 h-32 bg-green-400/10 rounded-full blur-3xl' />
				<div className='absolute bottom-0 left-0 w-24 h-24 bg-emerald-400/10 rounded-full blur-2xl' />
				
				<div className='relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between'>
					<div className='space-y-3'>
						<h1 id='feedbacks-title' className='text-3xl font-bold flex items-center gap-3 bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent'>
							<div className='rounded-xl bg-gradient-to-br from-green-400/20 to-emerald-400/10 p-3 border border-green-400/20'>
								<Icon name='star' className='h-6 w-6 text-green-400' />
							</div>
							{tNav('feedbacks')}
						</h1>
						<p className='text-white/70 max-w-2xl'>{t('subtitle')}</p>
					</div>
					
					<div className='flex w-full flex-col gap-3 md:max-w-3xl md:flex-row'>
						<div className='flex-1'>
							<label htmlFor='feedbacks-search' className='sr-only'>
								{t('search')}
							</label>
							<div className='relative group'>
								<Icon name='magnifying-glass' className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-green-400 transition-colors' />
								<input
									id='feedbacks-search'
									type='search'
									value={q}
									onChange={e => { setPage(1); setQ(e.target.value) }}
									placeholder={t('searchPlaceholder')}
									className='w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 group-hover:border-white/20'
									aria-label={t('search')}
								/>
								<div className='absolute inset-0 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none' />
							</div>
						</div>
						
						<div className='md:w-56'>
							<label htmlFor='feedbacks-filter' className='block text-sm font-medium text-white/80 mb-2'>
								{t('filter.label')}
							</label>
							<div className='relative group'>
								<Icon name='server' className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-green-400 transition-colors' />
								<select
									id='feedbacks-filter'
									value={statusFilter}
									onChange={e => { setPage(1); setStatusFilter(e.target.value as 'all'|'new'|'in_progress'|'resolved') }}
									className='w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none transition-all duration-300 group-hover:border-white/20'
								>
									<option value='all'>{t('filter.all')}</option>
									<option value='new'>{t('filter.new')}</option>
									<option value='in_progress'>{t('filter.in_progress')}</option>
									<option value='resolved'>{t('filter.resolved')}</option>
								</select>
								<Icon name='chevron-down' className='absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none' />
								<div className='absolute inset-0 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none' />
							</div>
						</div>
						
						<div className='flex gap-3 md:w-[28rem]'>
							<div className='flex-1'>
								<label htmlFor='feedbacks-date-from' className='block text-sm font-medium text-white/80 mb-2'>
									{t('dateFilter.from')}
								</label>
								<div className='relative group'>
									<Icon name='calendar' className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-green-400 transition-colors' />
									<input
										id='feedbacks-date-from'
										type='date'
										value={dateFrom}
										onChange={e => { setPage(1); setDateFrom(e.target.value) }}
										className='w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 group-hover:border-white/20'
									/>
									<div className='absolute inset-0 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none' />
								</div>
							</div>
							<div className='flex-1'>
								<label htmlFor='feedbacks-date-to' className='block text-sm font-medium text-white/80 mb-2'>
									{t('dateFilter.to')}
								</label>
								<div className='relative group'>
									<Icon name='calendar' className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-green-400 transition-colors' />
									<input
										id='feedbacks-date-to'
										type='date'
										value={dateTo}
										onChange={e => { setPage(1); setDateTo(e.target.value) }}
										className='w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 group-hover:border-white/20'
									/>
									<div className='absolute inset-0 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none' />
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Bulk actions toolbar */}
			{selectedIds.length > 0 && (
				<div
					role='region'
					aria-label={t('bulk.label')}
					className='rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm p-6 text-sm animate-slide-down'
				>
					<div className='flex flex-wrap items-center gap-4'>
						<div className='flex items-center gap-3 text-white/80 font-medium'>
							<Icon name='check-circle' className='h-5 w-5 text-green-400' />
							<span>{t('bulk.selected', {count: selectedIds.length})}</span>
						</div>
						<div className='flex flex-wrap gap-3'>
							<button
								onClick={() => bulkMark('new')}
								className='group relative inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white border border-white/20 transition-all duration-300 hover:bg-white/20'
							>
								<Icon name='star' className='h-4 w-4' />
								<span>{t('bulk.markNew')}</span>
							</button>
							<button
								onClick={() => bulkMark('in_progress')}
								className='group relative inline-flex items-center gap-2 rounded-xl bg-yellow-500/20 px-4 py-2 text-sm font-medium text-yellow-300 border border-yellow-400/30 transition-all duration-300 hover:bg-yellow-500/30'
							>
								<Icon name='clock' className='h-4 w-4' />
								<span>{t('bulk.markInProgress')}</span>
							</button>
							<button
								onClick={() => bulkMark('resolved')}
								className='group relative inline-flex items-center gap-2 rounded-xl bg-green-500/20 px-4 py-2 text-sm font-medium text-green-300 border border-green-400/30 transition-all duration-300 hover:bg-green-500/30'
							>
								<Icon name='check-badge' className='h-4 w-4' />
								<span>{t('bulk.markResolved')}</span>
							</button>
							<button
								onClick={bulkDelete}
								className='group relative inline-flex items-center gap-2 rounded-xl bg-red-500/20 px-4 py-2 text-sm font-medium text-red-300 border border-red-400/30 transition-all duration-300 hover:bg-red-500/30'
							>
								<Icon name='trash' className='h-4 w-4' />
								<span>{t('bulk.deleteSelected')}</span>
							</button>
						</div>
					</div>
				</div>
			)}

			<div
				ref={liveRef}
				className='sr-only'
				aria-live='polite'
				aria-atomic='true'
			/>

			{error && (
				<div role='alert' aria-live='assertive' className='rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-500/10 to-red-500/5 backdrop-blur-sm p-6 text-sm text-red-200 animate-slide-down'>
					<div className='flex items-start gap-4'>
						<div className='rounded-xl bg-red-400/20 p-3 border border-red-400/30'>
							<Icon name='exclamation-triangle' className='h-6 w-6 text-red-400' />
						</div>
						<div className='flex-1'>
							<span className='font-medium text-red-300'>{t('error')}</span>
							<span className='text-red-200'>: {error}</span>
						</div>
					</div>
				</div>
			)}

			{/* Creation Form */}
			<div className='rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm p-8'>
				<form onSubmit={handleCreate} aria-label={t('form')} className='space-y-6'>
					<div className='grid grid-cols-1 gap-6 md:grid-cols-6'>
						<div className='md:col-span-2 space-y-2'>
							<label htmlFor='c-author' className='block text-sm font-medium text-white/80'>
								{t('fields.author')}
							</label>
							<div className='relative group'>
								<Icon name='users' className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-green-400 transition-colors' />
								<input 
									id='c-author' 
									value={createAuthor} 
									onChange={e => setCreateAuthor(e.target.value)} 
									required 
									className='w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 group-hover:border-white/20' 
									placeholder={t('authorPlaceholder')}
								/>
								<div className='absolute inset-0 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none' />
							</div>
						</div>
						<div className='md:col-span-3 space-y-2'>
							<label htmlFor='c-comment' className='block text-sm font-medium text-white/80'>
								{t('fields.comment')}
							</label>
							<div className='relative group'>
								<Icon name='chat' className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-green-400 transition-colors' />
								<input 
									id='c-comment' 
									value={createComment} 
									onChange={e => setCreateComment(e.target.value)} 
									required 
									className='w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 group-hover:border-white/20' 
									placeholder={t('commentPlaceholder')}
								/>
								<div className='absolute inset-0 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none' />
							</div>
						</div>
						<div className='space-y-2'>
							<label htmlFor='c-rating' className='block text-sm font-medium text-white/80'>
								{t('fields.rating')}
							</label>
							<div className='relative group'>
								<Icon name='star' className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-green-400 transition-colors' />
								<input 
									id='c-rating' 
									type='number' 
									min={1} 
									max={5} 
									value={createRating} 
									onChange={e => setCreateRating(e.target.value === '' ? '' : Number(e.target.value))} 
									required 
									className='w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-4 py-3 text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 group-hover:border-white/20' 
									placeholder='1-5'
								/>
								<div className='absolute inset-0 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none' />
							</div>
						</div>
						<div className='space-y-2'>
							<label htmlFor='c-status' className='block text-sm font-medium text-white/80'>
								{t('fields.status')}
							</label>
							<div className='relative group'>
								<Icon name='server' className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-green-400 transition-colors' />
								<select 
									id='c-status' 
									value={createStatus} 
									onChange={e => setCreateStatus(e.target.value as FeedbackEntity['status'])} 
									className='w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-10 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none transition-all duration-300 group-hover:border-white/20'
								>
									{statusOptions.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
								</select>
								<Icon name='chevron-down' className='absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none' />
								<div className='absolute inset-0 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none' />
							</div>
						</div>
						<div className='md:self-end'>
							<button 
								type='submit' 
								disabled={creating || !createAuthor.trim() || !createComment.trim() || createRating === ''} 
								className='group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-3 text-sm font-medium text-white transition-all duration-300 hover:from-green-600 hover:to-emerald-600 hover:shadow-lg hover:shadow-green-500/25 disabled:opacity-50 disabled:cursor-not-allowed'
							>
								<div className='absolute inset-0 rounded-xl bg-gradient-to-r from-green-400/20 to-emerald-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300' />
								<Icon name='plus' className='h-4 w-4 relative z-10' />
								<span className='relative z-10'>{t('addFeedback')}</span>
							</button>
						</div>
					</div>
				</form>
			</div>

			{/* Feedbacks Table */}
			<div className='rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm overflow-hidden'>
				<div className='overflow-x-auto'>
					<table className='min-w-full text-sm' aria-label={tNav('feedbacks')}>
						<thead className='text-left text-white/70 border-b border-white/10'>
							<tr className='divide-y divide-white/5'>
								<th scope='col' className='pb-4 pr-4 pl-6 pt-6 font-medium text-white/80'>
									<div className='flex items-center gap-2'>
										<label className='sr-only'>{t('fields.select')}</label>
										<input
											type='checkbox'
											checked={allOnPageSelected}
											onChange={toggleSelectAllOnPage}
											aria-label={t('bulk.selectAll')}
											className='h-4 w-4 rounded border-white/20 bg-white/5 text-green-500 focus:ring-2 focus:ring-green-500'
										/>
										<span>{t('fields.select')}</span>
									</div>
								</th>
								<th scope='col' className='pb-4 pr-4 pt-6 font-medium text-white/80'>{t('fields.author')}</th>
								<th scope='col' className='pb-4 pr-4 pt-6 font-medium text-white/80'>{t('fields.comment')}</th>
								<th scope='col' className='pb-4 pr-4 pt-6 font-medium text-white/80'>{t('fields.rating')}</th>
								<th scope='col' className='pb-4 pr-4 pt-6 font-medium text-white/80'>{t('fields.status')}</th>
								<th scope='col' className='pb-4 pr-4 pt-6 font-medium text-white/80'>{t('fields.time')}</th>
								<th scope='col' className='pb-4 pr-6 pt-6 font-medium text-white/80 text-right'>{t('fields.actions')}</th>
							</tr>
						</thead>
						<tbody className='divide-y divide-white/5'>
							{loading && (
								<tr>
									<td colSpan={7} className='py-8 text-center text-white/70'>
										<div className='flex items-center justify-center gap-3'>
											<div className='h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-green-400' />
											<span>{t('loading')}</span>
										</div>
									</td>
								</tr>
							)}
							{!loading && data?.items.length === 0 && (
								<tr>
									<td colSpan={7} className='py-8 text-center text-white/70'>
										<div className='flex flex-col items-center gap-3'>
											<Icon name='star' className='h-12 w-12 text-white/20' />
											<span>{t('noResults')}</span>
										</div>
									</td>
								</tr>
							)}
							{data?.items.map(f => (
								<tr key={f.id} className='hover:bg-white/5 transition-colors'>
									<td className='py-4 pr-4 pl-6'>
										<input
											type='checkbox'
											checked={selectedIds.includes(f.id)}
											onChange={() => toggleSelectOne(f.id)}
											aria-label={t('bulk.selectRow')}
											className='h-4 w-4 rounded border-white/20 bg-white/5 text-green-500 focus:ring-2 focus:ring-green-500'
										/>
									</td>
									<td className='py-4 pr-4'>
										{editingId === f.id ? (
											<input
												value={editAuthor}
												onChange={ev => setEditAuthor(ev.target.value)}
												className='w-full rounded-lg border border-white/10 bg-white/5 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500'
											/>
										) : (
											<div className='flex items-center gap-3'>
												<div className='rounded-lg bg-white/10 p-2 border border-white/20'>
													<Icon name='users' className='h-4 w-4 text-white/60' />
												</div>
												<span className='text-white font-medium'>{f.author}</span>
											</div>
										)}
									</td>
									<td className='py-4 pr-4'>
										{editingId === f.id ? (
											<input
												value={editComment}
												onChange={ev => setEditComment(ev.target.value)}
												className='w-full rounded-lg border border-white/10 bg-white/5 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500'
											/>
										) : (
											<div className='max-w-md'>
												<p className='text-white/80'>{f.comment}</p>
											</div>
										)}
									</td>
									<td className='py-4 pr-4'>
										{editingId === f.id ? (
											<input
												type='number'
												min={1}
												max={5}
												value={editRating}
												onChange={ev => setEditRating(Number(ev.target.value))}
												className='w-20 rounded-lg border border-white/10 bg-white/5 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500'
											/>
										) : (
											<div className='inline-flex items-center gap-1'>
												{Array.from({length: 5}).map((_, i) => (
													<Icon 
														key={i} 
														name='star' 
														className={cn(
															'h-5 w-5 transition-colors',
															i < f.rating ? 'text-yellow-400' : 'text-white/20'
														)} 
													/>
												))}
												<span className='ml-2 text-sm text-white/60'>({f.rating}/5)</span>
											</div>
										)}
									</td>
									<td className='py-4 pr-4'>
										{editingId === f.id ? (
											<select
												value={editStatus}
												onChange={ev => setEditStatus(ev.target.value as FeedbackEntity['status'])}
												className='w-full rounded-lg border border-white/10 bg-white/5 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500'
											>
												{statusOptions.map(o => (
													<option key={o.value} value={o.value}>{o.label}</option>
												))}
											</select>
										) : (
											<span className='inline-flex items-center gap-2'>
												<div className={cn(
													'rounded-lg px-3 py-1 text-xs font-medium border',
													f.status === 'new' 
														? 'bg-blue-400/20 text-blue-300 border-blue-400/30' 
														: f.status === 'in_progress'
														? 'bg-yellow-400/20 text-yellow-300 border-yellow-400/30'
														: 'bg-green-400/20 text-green-300 border-green-400/30'
												)}>
													<Icon
														name={f.status === 'new' ? 'star' : f.status === 'in_progress' ? 'clock' : 'check-badge'}
														className='h-3 w-3 mr-1'
													/>
													{mapStatus(f.status)}
												</div>
											</span>
										)}
									</td>
									<td className='py-4 pr-4'>
										<span className='text-white/60 text-sm'>{formatDateTime(f.time)}</span>
									</td>
									<td className='py-4 pr-6'>
										<div className='flex items-center justify-end gap-2'>
											{editingId === f.id ? (
												<>
													<button
														onClick={() => saveEdit(f.id)}
														className='group relative inline-flex items-center gap-2 rounded-lg bg-green-500/20 px-3 py-2 text-sm font-medium text-green-300 border border-green-400/30 transition-all duration-300 hover:bg-green-500/30'
													>
														<Icon name='check-circle' className='h-4 w-4' />
														<span>{t('save')}</span>
													</button>
													<button
														onClick={cancelEdit}
														className='group relative inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white border border-white/20 transition-all duration-300 hover:bg-white/20'
													>
														<Icon name='x-mark' className='h-4 w-4' />
														<span>{t('cancel')}</span>
													</button>
												</>
											) : (
												<>
													<button
														onClick={() => startEdit(f)}
														className='group relative inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white border border-white/20 transition-all duration-300 hover:bg-white/20'
														aria-label={t('fields.edit')}
													>
														<Icon name='settings' className='h-4 w-4' />
														<span>{t('fields.edit')}</span>
													</button>
													<button
														onClick={() => handleDelete(f.id)}
														className='group relative inline-flex items-center gap-2 rounded-lg bg-red-500/20 px-3 py-2 text-sm font-medium text-red-300 border border-red-400/30 transition-all duration-300 hover:bg-red-500/30'
														aria-label={t('fields.delete')}
													>
														<Icon name='trash' className='h-4 w-4' />
														<span>{t('fields.delete')}</span>
													</button>
												</>
										)}
									</div>
									</td>
								</tr>
							))}
					</tbody>
				</table>
			</div>
			</div>

			{/* Pagination */}
			<div className='rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm p-6'>
				<div className='flex flex-col items-center gap-6 md:flex-row md:justify-between'>
					<div className='flex items-center gap-4'>
						<button 
							onClick={() => setPage(p => Math.max(1, p - 1))} 
							disabled={loading || (data?.totalPages ?? 1) <= 1 || page <= 1} 
							className='group relative inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white transition-all duration-300 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed'
						>
							<Icon name='arrow-uturn-left' className='h-4 w-4' />
							<span>{t('previous')}</span>
						</button>
						
						<div className='flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10'>
							<span className='text-sm text-white/60'>{t('page')}</span>
							<span className='text-sm font-medium text-white'>{page}</span>
							<span className='text-sm text-white/60'>{t('of')}</span>
							<span className='text-sm font-medium text-white'>{data?.totalPages ?? 1}</span>
						</div>
						
						<button 
							onClick={() => setPage(p => p + 1)} 
							disabled={loading || (data?.totalPages ?? 1) <= 1 || page >= (data?.totalPages ?? 1)} 
							className='group relative inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white transition-all duration-300 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed'
						>
							<span>{t('next')}</span>
							<Icon name='chevron-right' className='h-4 w-4' />
						</button>
					</div>
					
					<div className='flex items-center gap-3'>
						<label htmlFor='page-size' className='text-sm font-medium text-white/80'>
							{t('pageSize')}
						</label>
						<div className='relative group'>
							<Icon name='server' className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-green-400 transition-colors' />
							<select 
								id='page-size' 
								value={pageSize} 
								onChange={e => { setPage(1); setPageSize(Number(e.target.value)) }} 
								className='w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none transition-all duration-300 group-hover:border-white/20'
							>
								<option value={5}>5</option>
								<option value={10}>10</option>
								<option value={20}>20</option>
							</select>
							<Icon name='chevron-down' className='absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 pointer-events-none' />
							<div className='absolute inset-0 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none' />
						</div>
					</div>
				</div>
			</div>
		</section>
	)
}
