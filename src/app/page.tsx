// =============================================
// RAGGuard - Page d'accueil
// =============================================

import { Shield, Zap, BarChart3, Brain } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ModeToggle } from '@/components/ui/mode-toggle'

export default function Home() {
	return (
		<div className="min-h-screen bg-background">
			{/* Header */}
			<header className="border-b">
				<div className="container mx-auto flex h-16 items-center justify-between px-4">
					<div className="flex items-center gap-2">
						<Shield className="h-8 w-8 text-primary" />
						<span className="text-xl font-bold">RAGGuard</span>
					</div>
					<nav className="flex items-center gap-2 sm:gap-4">
						<Link href="/dashboard">
							<Button variant="ghost" size="sm">Dashboard</Button>
						</Link>
						<Link href="/docs">
							<Button variant="ghost" size="sm">Documentation</Button>
						</Link>
						<ModeToggle />
						<Link href="/login">
							<Button size="sm">Connexion</Button>
						</Link>
					</nav>
				</div>
			</header>

			{/* Hero Section */}
			<section className="container mx-auto px-4 py-16 sm:py-24 text-center">
				<div className="space-y-6 sm:space-y-8">
					<h1 className="text-3xl sm:text-4xl lg:text-6xl xl:text-7xl font-bold tracking-tight animate-in fade-in slide-in-from-bottom-4 duration-1000">
						RAG Production-Ready
						<br />
						<span className="bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent">
							avec Observabilité
						</span>
					</h1>
					<p className="mx-auto max-w-2xl text-base sm:text-lg text-muted-foreground animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200 px-4">
						Un système de Retrieval-Augmented Generation robuste, mesurable et exploitable en production.
						Détection automatique des hallucinations, suivi de la fidélité et alertes en temps réel.
					</p>
					<div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-400 px-4">
						<Link href="/dashboard" className="w-full sm:w-auto">
							<Button size="lg" className="w-full sm:w-auto group">
								<Zap className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" />
								Démarrer
							</Button>
						</Link>
						<Link href="/docs" className="w-full sm:w-auto">
							<Button size="lg" variant="outline" className="w-full sm:w-auto">
								Documentation
							</Button>
						</Link>
					</div>
				</div>
			</section>

			{/* Features Section */}
			<section className="container mx-auto px-4 py-12 sm:py-16">
				<div className="space-y-8 sm:space-y-12">
					<h2 className="text-center text-2xl sm:text-3xl font-bold animate-in fade-in slide-in-from-bottom-4 duration-1000">
						Fonctionnalités clés
					</h2>
					<div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
						{[
							{
								icon: Brain,
								title: 'Retrieval Hybride',
								description: 'Recherche lexicale BM25 + vectorielle avec fusion RRF',
								features: ['Pre-filter par métadonnées', 'Cross-encoder reranking', 'Index HNSW optimisé'],
								delay: 0,
							},
							{
								icon: Shield,
								title: 'Validation Fidélité',
								description: 'Détection automatique des hallucinations',
								features: ['Score de fidélité 0-1', 'Self-RAG automatique', 'Abstention intelligente'],
								delay: 100,
							},
							{
								icon: BarChart3,
								title: 'Observabilité Datadog',
								description: 'Traces APM, métriques et logs structurés',
								features: ['Spans par étape', 'Métriques custom', 'Alertes P1/P2'],
								delay: 200,
							},
							{
								icon: Zap,
								title: 'Multi-Provider LLM',
								description: 'Google Gemini, OpenAI, Anthropic, Groq',
								features: ['Gemini 2.0 par défaut', 'Fallback automatique', 'Suivi des coûts'],
								delay: 300,
							},
						].map((feature, index) => (
							<Card
								key={index}
								className="animate-in fade-in slide-in-from-bottom-4 duration-1000"
								style={{ animationDelay: `${feature.delay}ms` }}
							>
								<CardHeader>
									<feature.icon className="h-8 w-8 sm:h-10 sm:w-10 text-primary transition-transform hover:scale-110" />
									<CardTitle className="mt-4 text-sm sm:text-base">{feature.title}</CardTitle>
									<CardDescription className="text-xs sm:text-sm">{feature.description}</CardDescription>
								</CardHeader>
								<CardContent>
									<ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
										{feature.features.map((item, i) => (
											<li key={i} className="flex items-center gap-2">
												<div className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
												<span className="truncate">{item}</span>
											</li>
										))}
									</ul>
								</CardContent>
							</Card>
						))}
					</div>
				</div>
			</section>

			{/* Architecture Section */}
			<section className="border-t bg-muted/50 py-12 sm:py-16">
				<div className="container mx-auto px-4">
					<div className="space-y-6 sm:space-y-8">
						<h2 className="text-center text-2xl sm:text-3xl font-bold animate-in fade-in slide-in-from-bottom-4 duration-1000">
							Pipeline RAG
						</h2>
						<div className="mx-auto max-w-4xl">
							<div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
								{[
									'API Gateway',
									'Retriever',
									'Reranker',
									'Context Processor',
									'LLM Generation',
									'Faithfulness Validation',
									'Self-RAG',
									'Response',
								].map((step, i) => (
									<div key={step} className="flex items-center gap-1 sm:gap-2">
										<div className="rounded-lg bg-primary px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-primary-foreground shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105">
											{step}
										</div>
										{i < 7 && (
											<span className="text-muted-foreground animate-pulse text-sm sm:text-base">→</span>
										)}
									</div>
								))}
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="border-t py-8">
				<div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
					<p>RAGGuard - Système RAG Production-Ready avec Observabilité Datadog</p>
					<p className="mt-2">Built with Next.js, Supabase, Google Gemini & Datadog</p>
				</div>
			</footer>
		</div>
	)
}
