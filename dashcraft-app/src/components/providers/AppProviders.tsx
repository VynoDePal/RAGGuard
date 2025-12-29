'use client'

import {type ReactNode} from 'react'
import {ThemeProvider} from '@/components/providers/ThemeProvider'
import {ReduxProvider} from '@/components/providers/ReduxProvider'

/**
 * AppProviders
 * Compose les providers globaux (theme, redux).
 */
export interface AppProvidersProps {
	children: ReactNode
}

export function AppProviders({children}: AppProvidersProps) {
	return (
		<ReduxProvider>
			<ThemeProvider>{children}</ThemeProvider>
		</ReduxProvider>
	)
}
