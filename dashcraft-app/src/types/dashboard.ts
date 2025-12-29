import type {IconName} from '@/lib/icons'

export type DashboardKey =
	| 'feedbacks'
	| 'chats'
	| 'apis'
	| 'monitoring'
	| 'languages'
	| 'settings'
	// RAGGuard modules
	| 'rag-stats'
	| 'rag-chat'
	| 'rag-documents'
	| 'rag-queries'
	| 'rag-monitoring'

export interface DashboardModule {
	key: DashboardKey
	icon: IconName
	visible: boolean
	order: number
}

export interface DashboardConfig {
	modules: DashboardModule[]
}
