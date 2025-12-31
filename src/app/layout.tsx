import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
})

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
})

export const metadata: Metadata = {
	title: 'RAGGuard - Système RAG Production-Ready',
	description: 'Un système de Retrieval-Augmented Generation robuste, mesurable et exploitable en production. Détection automatique des hallucinations, suivi de la fidélité et alertes en temps réel.',
	keywords: ['RAG', 'AI', 'LLM', 'Observability', 'Production', 'Faithfulness'],
	authors: [{ name: 'RAGGuard Team' }],
	openGraph: {
		title: 'RAGGuard - Système RAG Production-Ready',
		description: 'Un système de Retrieval-Augmented Generation robuste avec observabilité Datadog',
		type: 'website',
		locale: 'fr_FR',
	},
	twitter: {
		card: 'summary_large_image',
		title: 'RAGGuard - Système RAG Production-Ready',
		description: 'Un système de Retrieval-Augmented Generation robuste avec observabilité Datadog',
	},
}

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang='fr' suppressHydrationWarning>
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
				<ThemeProvider
					attribute='class'
					defaultTheme='system'
					enableSystem
					disableTransitionOnChange
				>
					{children}
				</ThemeProvider>
			</body>
		</html>
	)
}
