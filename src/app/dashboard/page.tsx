// =============================================
// RAGGuard - Dashboard Page
// =============================================

'use client'

import { useState } from 'react'
import { Shield, Settings, FileText, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChatInterface } from '@/components/rag/chat-interface'
import { StatsDashboard } from '@/components/rag/stats-dashboard'
import { ModeToggle } from '@/components/ui/mode-toggle'

// Demo tenant ID - en production, récupérer depuis l'auth
const DEMO_TENANT_ID = '00000000-0000-0000-0000-000000000000'

export default function DashboardPage() {
	const [activeTab, setActiveTab] = useState<'chat' | 'stats' | 'documents'>('chat')

	return (
		<div className="flex h-screen flex-col">
			{/* Header */}
			<header className="border-b">
				<div className="container mx-auto flex h-16 items-center justify-between px-4">
					<Link href="/" className="flex items-center gap-2">
						<Shield className="h-8 w-8 text-primary" />
						<span className="text-xl font-bold">RAGGuard</span>
					</Link>
					<div className="flex items-center gap-2">
						<ModeToggle />
						<Button variant="ghost" size="icon">
							<Settings className="h-5 w-5" />
						</Button>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<div className="flex flex-1 overflow-hidden">
				{/* Sidebar */}
				<aside className="w-64 border-r bg-muted/30 p-4">
					<nav className="space-y-2">
						<Button
							variant={activeTab === 'chat' ? 'secondary' : 'ghost'}
							className="w-full justify-start"
							onClick={() => setActiveTab('chat')}
						>
							<MessageSquare className="mr-2 h-4 w-4" />
							Assistant RAG
						</Button>
						<Button
							variant={activeTab === 'stats' ? 'secondary' : 'ghost'}
							className="w-full justify-start"
							onClick={() => setActiveTab('stats')}
						>
							<Shield className="mr-2 h-4 w-4" />
							Observabilité
						</Button>
						<Button
							variant={activeTab === 'documents' ? 'secondary' : 'ghost'}
							className="w-full justify-start"
							onClick={() => setActiveTab('documents')}
						>
							<FileText className="mr-2 h-4 w-4" />
							Documents
						</Button>
					</nav>

					{/* Info Panel */}
					<div className="mt-8 rounded-lg border bg-card p-4">
						<h3 className="text-sm font-medium">Configuration</h3>
						<div className="mt-2 space-y-1 text-xs text-muted-foreground">
							<p><span className="font-medium">Provider:</span> Google Gemini</p>
							<p><span className="font-medium">Modèle:</span> gemini-2.0-flash-exp</p>
							<p><span className="font-medium">Top K:</span> 5</p>
							<p><span className="font-medium">Seuil fidélité:</span> 0.75</p>
						</div>
					</div>
				</aside>

				{/* Content Area */}
				<main className="flex-1 overflow-hidden">
					{activeTab === 'chat' && (
						<ChatInterface tenantId={DEMO_TENANT_ID} className="h-full" />
					)}

					{activeTab === 'stats' && (
						<div className="h-full overflow-y-auto p-6">
							<StatsDashboard tenantId={DEMO_TENANT_ID} />
						</div>
					)}

					{activeTab === 'documents' && (
						<div className="flex h-full items-center justify-center">
							<div className="text-center text-muted-foreground">
								<FileText className="mx-auto h-12 w-12 opacity-50" />
								<h3 className="mt-4 text-lg font-medium">Gestion des documents</h3>
								<p className="mt-2 text-sm">
									Upload et gestion des documents à indexer.
								</p>
								<Button className="mt-4" variant="outline">
									Uploader un document
								</Button>
							</div>
						</div>
					)}
				</main>
			</div>
		</div>
	)
}
