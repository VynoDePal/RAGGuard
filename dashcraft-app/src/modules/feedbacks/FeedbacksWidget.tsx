'use client'

import {WidgetCard} from '@/components/dashboard/WidgetCard'
import {useTranslations} from 'next-intl'
import {faker} from '@faker-js/faker'
import {Icon} from '@/lib/icons'
import {cn} from '@/lib/utils'

interface FeedbackItem {
	id: string
	rating: number
	comment: string
	author: string
	date: string
}

/**
 * FeedbacksWidget
 * Liste de feedbacks mockée (notes + commentaires) avec données déterministes.
 */
export function FeedbacksWidget() {
	const t = useTranslations('widgets.feedbacks')
	faker.seed(42)
	const items: FeedbackItem[] = Array.from({length: 5}).map(() => ({
		id: faker.string.uuid(),
		rating: faker.number.int({min: 1, max: 5}),
		comment: faker.lorem.sentence({min: 6, max: 12}),
		author: faker.person.fullName(),
		date: faker.date.recent().toISOString(),
	}))
	return (
		<WidgetCard id='module-feedbacks' title={t('title')} className='relative overflow-hidden'>
			{/* Background decoration */}
			<div className='absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-400/10 to-emerald-400/5 rounded-full blur-3xl' />
			<div className='absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-yellow-400/10 to-orange-400/5 rounded-full blur-2xl' />
			
			<div className='relative z-10 space-y-4'>
				{items.map((item, index) => (
					<div 
						key={item.id} 
						role='listitem' 
						className={cn(
							'group rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/2 backdrop-blur-sm p-5 transition-all duration-300 hover:border-white/20 hover:shadow-lg',
							index === 0 && 'animate-fade-in',
							index === 1 && 'animate-fade-in-delay-1',
							index === 2 && 'animate-fade-in-delay-2',
							index === 3 && 'animate-fade-in-delay-3',
							index === 4 && 'animate-fade-in-delay-4'
						)}
					>
						<div className='flex items-start gap-4'>
							{/* Avatar */}
							<div className='rounded-xl bg-gradient-to-br from-green-400/20 to-emerald-400/10 p-3 border border-green-400/20 group-hover:scale-110 transition-transform duration-300'>
								<Icon name='users' className='h-5 w-5 text-green-400' />
							</div>
							
							<div className='flex-1 space-y-3'>
								{/* Header */}
								<div className='flex items-center justify-between'>
									<div className='flex items-center gap-3'>
										<span className='text-sm font-medium text-white'>{item.author}</span>
										<span className='text-xs text-white/50'>
											{new Date(item.date).toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' })}
										</span>
									</div>
									
									{/* Rating */}
									<div className='inline-flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1 border border-white/10'>
										{Array.from({length: 5}).map((_, i) => (
											<Icon 
												key={i} 
												name='star' 
												className={cn(
													'h-4 w-4 transition-colors',
													i < item.rating ? 'text-yellow-400' : 'text-white/20'
												)} 
											/>
										))}
									</div>
								</div>
								
								{/* Comment */}
								<p className='text-sm text-white/80 leading-relaxed'>{item.comment}</p>
								
								{/* Footer */}
								<div className='flex items-center gap-3 pt-2 border-t border-white/5'>
									<span className={cn(
										'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium border',
										item.rating >= 4 
											? 'bg-green-400/20 text-green-300 border-green-400/30' 
											: item.rating >= 3
											? 'bg-yellow-400/20 text-yellow-300 border-yellow-400/30'
											: 'bg-red-400/20 text-red-300 border-red-400/30'
									)}>
										<Icon 
											name={item.rating >= 4 ? 'check-badge' : item.rating >= 3 ? 'star' : 'exclamation-triangle'}
											className='h-3 w-3'
										/>
										{item.rating >= 4 ? t('excellent') : item.rating >= 3 ? t('good') : t('needsImprovement')}
									</span>
								</div>
							</div>
						</div>
					</div>
				))}
			</div>
		</WidgetCard>
	)
}
