// =============================================
// RAGGuard - Page d'accueil
// =============================================

import { Shield, Zap, BarChart3, Brain } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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
					<nav className="flex items-center gap-4">
						<Link href="/dashboard">
							<Button variant="ghost">Dashboard</Button>
						</Link>
						<Link href="/docs">
							<Button variant="ghost">Documentation</Button>
						</Link>
						<Link href="/login">
							<Button>Connexion</Button>
						</Link>
					</nav>
				</div>
			</header>

			{/* Hero Section */}
			<section className="container mx-auto px-4 py-24 text-center">
				<h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
					RAG Production-Ready
					<br />
					<span className="text-primary">avec Observabilité</span>
				</h1>
				<p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
					Un système de Retrieval-Augmented Generation robuste, mesurable et exploitable en production.
					Détection automatique des hallucinations, suivi de la fidélité et alertes en temps réel.
				</p>
				<div className="mt-10 flex items-center justify-center gap-4">
					<Link href="/dashboard">
						<Button size="lg">
							<Zap className="mr-2 h-4 w-4" />
							Démarrer
						</Button>
					</Link>
					<Link href="/docs">
						<Button size="lg" variant="outline">
							Documentation
						</Button>
					</Link>
				</div>
			</section>

			{/* Features Section */}
			<section className="container mx-auto px-4 py-16">
				<h2 className="mb-12 text-center text-3xl font-bold">Fonctionnalités clés</h2>
				<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
					<Card>
						<CardHeader>
							<Brain className="h-10 w-10 text-primary" />
							<CardTitle className="mt-4">Retrieval Hybride</CardTitle>
							<CardDescription>
								Recherche lexicale BM25 + vectorielle avec fusion RRF
							</CardDescription>
						</CardHeader>
						<CardContent>
							<ul className="text-sm text-muted-foreground space-y-1">
								<li>- Pre-filter par métadonnées</li>
								<li>- Cross-encoder reranking</li>
								<li>- Index HNSW optimisé</li>
							</ul>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<Shield className="h-10 w-10 text-primary" />
							<CardTitle className="mt-4">Validation Fidélité</CardTitle>
							<CardDescription>
								Détection automatique des hallucinations
							</CardDescription>
						</CardHeader>
						<CardContent>
							<ul className="text-sm text-muted-foreground space-y-1">
								<li>- Score de fidélité 0-1</li>
								<li>- Self-RAG automatique</li>
								<li>- Abstention intelligente</li>
							</ul>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<BarChart3 className="h-10 w-10 text-primary" />
							<CardTitle className="mt-4">Observabilité Datadog</CardTitle>
							<CardDescription>
								Traces APM, métriques et logs structurés
							</CardDescription>
						</CardHeader>
						<CardContent>
							<ul className="text-sm text-muted-foreground space-y-1">
								<li>- Spans par étape</li>
								<li>- Métriques custom</li>
								<li>- Alertes P1/P2</li>
							</ul>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<Zap className="h-10 w-10 text-primary" />
							<CardTitle className="mt-4">Multi-Provider LLM</CardTitle>
							<CardDescription>
								Google Gemini, OpenAI, Anthropic, Groq
							</CardDescription>
						</CardHeader>
						<CardContent>
							<ul className="text-sm text-muted-foreground space-y-1">
								<li>- Gemini 2.0 par défaut</li>
								<li>- Fallback automatique</li>
								<li>- Suivi des coûts</li>
							</ul>
						</CardContent>
					</Card>
				</div>
			</section>

			{/* Architecture Section */}
			<section className="border-t bg-muted/50 py-16">
				<div className="container mx-auto px-4">
					<h2 className="mb-8 text-center text-3xl font-bold">Pipeline RAG</h2>
					<div className="mx-auto max-w-4xl">
						<div className="flex flex-wrap items-center justify-center gap-2">
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
								<div key={step} className="flex items-center gap-2">
									<div className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
										{step}
									</div>
									{i < 7 && <span className="text-muted-foreground">→</span>}
								</div>
							))}
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
