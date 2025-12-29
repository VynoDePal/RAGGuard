import type {Metadata} from 'next'
import './globals.css'
import {NextIntlClientProvider} from 'next-intl'
import {AppProviders} from '@/components/providers/AppProviders'
import {cookies} from 'next/headers'

// Polices Google désactivées pour compatibilité hors-ligne.

export const metadata: Metadata = {
	title: 'DashCraft',
	description: 'Dashboard modulaire et personnalisable',
}

/**
 * RootLayout
 * Fournit le provider NextIntl et lit la locale depuis le cookie.
 * Les polices Google sont désactivées pour assurer un build hors-ligne.
 */
export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	const cookieStore = await cookies()
	const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value
	const locale = cookieLocale ?? 'fr'
	let messages
	try {
		messages = (await import(`@/messages/${locale}.json`)).default
	} catch {
		messages = (await import('@/messages/fr.json')).default
	}
	return (
		<html lang={locale} suppressHydrationWarning>
			<body className='antialiased'>
				<NextIntlClientProvider locale={locale} messages={messages}>
					<AppProviders>{children}</AppProviders>
				</NextIntlClientProvider>
			</body>
		</html>
	)
}
