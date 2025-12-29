'use client'

import {useTranslations} from 'next-intl'
import {Icon} from '@/lib/icons'
import config from '@/config/dashboard.json'
import {cn} from '@/lib/utils'
import type {DashboardConfig, DashboardModule} from '@/types/dashboard'
import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {useSelector} from 'react-redux'
import type {RootState} from '@/store/store'

/**
 * Sidebar
 * Navigation persistante basée sur la config JSON.
 */
export function Sidebar() {
	const t = useTranslations('nav')
	const cfg = config as DashboardConfig
	const pathname = usePathname()
	const visibility = useSelector((s: RootState) => s.ui.moduleVisibility)
	return (
		<nav
			role='navigation'
			aria-label='Sidebar'
			className='w-64 shrink-0 border-r border-white/10 p-4 hidden md:block'
			data-testid='sidebar-nav'
		>
			<ul className='space-y-2'>
				{cfg.modules
					// Combine visibilité statique et préférences utilisateur
					.filter((m: DashboardModule) => m.visible && visibility[m.key])
					.sort((a: DashboardModule, b: DashboardModule) => a.order - b.order)
					.map((m: DashboardModule) => (
						<li key={m.key}>
							<Link
								href={`/modules/${m.key}`}
								className={cn(
									'flex items-center gap-3 rounded-md px-3 py-2',
									'hover:bg-white/5 focus:outline-none focus:ring-2',
									'focus:ring-blue-500',
									pathname === `/modules/${m.key}` ? 'bg-white/10' : ''
								)}
								aria-label={t(m.key)}
								aria-current={pathname === `/modules/${m.key}` ? 'page' : undefined}
							>
								<Icon name={m.icon} className='h-5 w-5' />
								<span className='text-sm'>{t(m.key)}</span>
							</Link>
						</li>
					))}
			</ul>
		</nav>
	)
}

