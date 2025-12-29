import {DashboardLayout} from '@/components/layout/DashboardLayout'
import type {DashboardModule} from '@/types/dashboard'
// RAGGuard pages
import {RagStatsPage} from '@/modules/rag-stats/RagStatsPage'
import {RagChatPage} from '@/modules/rag-chat/RagChatPage'
import {RagDocumentsPage} from '@/modules/rag-documents/RagDocumentsPage'
import {RagQueriesPage} from '@/modules/rag-queries/RagQueriesPage'
import {RagMonitoringPage} from '@/modules/rag-monitoring/RagMonitoringPage'
import {FeedbacksPage} from '@/modules/feedbacks/FeedbacksPage'
import {ApisPage} from '@/modules/apis/ApisPage'
import {ChatsPage} from '@/modules/chats/ChatsPage'
import {MonitoringPage} from '@/modules/monitoring/MonitoringPage'
import {LanguagesPage} from '@/modules/languages/LanguagesPage'
import {SettingsPage} from '@/modules/settings/SettingsPage'
import {getTranslations} from 'next-intl/server'

interface ModulePageProps {
	params: {key: DashboardModule['key']}
}

/**
 * ModulePage
 * Route dynamique rendant la page spécifique au module. Next.js 15
 * exige d'attendre `params` avant d'utiliser ses propriétés.
 */
type AwaitedModulePageProps = {params: Promise<ModulePageProps['params']>}

/**
 * renderModulePage
 * Renvoie le composant de page correspondant à la clé du module.
 */
function renderModulePage(key: DashboardModule['key']) {
	switch (key) {
		// RAGGuard pages
		case 'rag-stats':
			return <RagStatsPage />
		case 'rag-chat':
			return <RagChatPage />
		case 'rag-documents':
			return <RagDocumentsPage />
		case 'rag-queries':
			return <RagQueriesPage />
		case 'rag-monitoring':
			return <RagMonitoringPage />
		// Standard pages
		case 'feedbacks':
			return <FeedbacksPage />
		case 'apis':
			return <ApisPage />
		case 'monitoring':
			return <MonitoringPage />
		case 'languages':
			return <LanguagesPage />
		case 'chats':
			return <ChatsPage />
		case 'settings':
			return <SettingsPage />
		default:
			return null
	}
}
export default async function ModulePage({params}: AwaitedModulePageProps) {
	const {key} = await params
	const t = await getTranslations('pages.generic')
	const page = renderModulePage(key)
	return (
		<DashboardLayout>
			{page ? (
				page
			) : (
				<div className='rounded-lg border border-white/10 bg-white/5 p-4'>
					<p className='text-sm text-white/80'>
						{t('moduleLabel')}: {key}
					</p>
					<p className='text-xs text-white/60 mt-1'>
						{t('comingSoon')}
					</p>
				</div>
			)}
		</DashboardLayout>
	)
}

