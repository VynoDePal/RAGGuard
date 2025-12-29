import {redirect} from 'next/navigation'

/**
 * Page d'accueil
 * Redirige vers le premier module disponible (rag-stats)
 */
export default function Home() {
    redirect('/modules/rag-stats')
}
