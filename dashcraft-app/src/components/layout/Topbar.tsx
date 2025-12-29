'use client'

import {useCallback, useTransition} from 'react'
import {useLocale, useTranslations} from 'next-intl'
import {useRouter} from 'next/navigation'
import {useDispatch, useSelector} from 'react-redux'
import {setLocaleAction} from '@/app/actions/set-locale'
import {getLocaleDisplayName, type LocaleCode} from '@/config/i18n'
import {Icon} from '@/lib/icons'
import {setThemeMode, type ThemeMode} from '@/store/store'
import type {RootState} from '@/store/store'

/**
 * Topbar
 * Barre supérieure avec recherche, sélecteur de langue et toggle de thème.
 */
export function Topbar() {
	const t = useTranslations('app')
	const locale = useLocale()
	const router = useRouter()
	const dispatch = useDispatch()
	const mode = useSelector((s: RootState) => s.ui.themeMode)
	const [isPending, startTransition] = useTransition()

	function handleToggleTheme() {
		const order: ThemeMode[] = ['system', 'dark', 'light']
		const idx = order.indexOf(mode)
		const next = order[(idx + 1) % order.length]
		dispatch(setThemeMode(next))
	}

	const handleSetLocale = useCallback(
		(loc: LocaleCode) => {
			startTransition(async () => {
				const fd = new FormData()
				fd.set('locale', loc)
				await setLocaleAction(fd)
				router.refresh()
			})
		},
		[router],
	)

	const handleClickFr = useCallback(() => handleSetLocale('fr'), [handleSetLocale])
	const handleClickEn = useCallback(() => handleSetLocale('en'), [handleSetLocale])

	return (
		<header
			className='sticky top-0 z-10 border-b border-white/10 bg-white/5 backdrop-blur p-4'
			aria-label='Topbar'
		>
			<div className='flex items-center gap-3'>
				<form className='flex-1 max-w-md'>
					<label htmlFor='search' className='sr-only'>
						{t('searchPlaceholder')}
					</label>
					<input
						id='search'
						type='search'
						placeholder={t('searchPlaceholder')}
						className='w-full rounded-md bg-white/5 px-3 py-2 text-sm outline-none ring-1 ring-inset ring-white/10 focus:ring-2 focus:ring-blue-500'
					/>
				</form>
				<div className='flex items-center gap-2'>
					<button
						onClick={handleToggleTheme}
						className='rounded-md px-3 py-2 text-sm hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-blue-500'
						aria-label={t('themeToggle')}
					>
						<Icon name='settings' className='h-5 w-5' />
					</button>
					<nav aria-label={t('language')} className='flex items-center gap-1' aria-busy={isPending}>
						<button
							onClick={handleClickFr}
							className='rounded-md px-2 py-1 text-sm hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-blue-500'
							aria-pressed={locale === 'fr'}
						>
							{getLocaleDisplayName('fr')}
						</button>
						<button
							onClick={handleClickEn}
							className='rounded-md px-2 py-1 text-sm hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-blue-500'
							aria-pressed={locale === 'en'}
						>
							{getLocaleDisplayName('en')}
						</button>
					</nav>
				</div>
			</div>
		</header>
	)
}
