# RAGGuard

> Système RAG Production-Ready avec Observabilité Datadog

Un système de **Retrieval-Augmented Generation (RAG)** robuste, mesurable et exploitable en production. Détection automatique des hallucinations, suivi de la fidélité et alertes en temps réel.

## Fonctionnalités

- **Retrieval Hybride** : BM25 + Recherche vectorielle avec fusion RRF
- **Reranking** : Cross-encoder LLM pour optimiser la pertinence
- **Multi-Provider LLM** : Google Gemini (défaut), OpenAI, Anthropic, Groq
- **Validation Fidélité** : Score 0-1 avec détection d'hallucinations
- **Self-RAG** : Retry automatique si score insuffisant
- **Abstention Intelligente** : Refuse de répondre si pas d'info fiable
- **Observabilité Datadog** : Traces APM, métriques custom, logs structurés
- **Multi-Tenant** : Isolation des données par tenant avec RBAC

## Stack Technique

- **Frontend** : Next.js 15, React, TypeScript, Tailwind CSS
- **Backend** : Next.js API Routes, Supabase
- **Database** : PostgreSQL + pgvector (Supabase)
- **LLM** : Google Gemini 2.0 Flash (défaut), OpenAI, Anthropic, Groq
- **Monitoring** : Datadog APM

## Installation

```bash
# Cloner le repo
git clone https://github.com/your-repo/ragguard.git
cd ragguard

# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env.local

# Configurer les variables d'environnement dans .env.local
```

## Configuration

Éditer `.env.local` avec vos clés API :

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# LLM (Google Gemini par défaut)
GOOGLE_API_KEY=your_google_api_key
OPENAI_API_KEY=your_openai_api_key  # Optionnel
ANTHROPIC_API_KEY=your_anthropic_api_key  # Optionnel

# Datadog
DD_API_KEY=your_datadog_api_key
DD_APP_KEY=your_datadog_app_key
```

## Démarrage

```bash
# Développement
npm run dev

# Production
npm run build
npm start
```

Ouvrir [http://localhost:3000](http://localhost:3000)

## API Endpoints

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/rag/query` | POST | Requête RAG principale |
| `/api/documents` | GET/POST/DELETE | Gestion documents |
| `/api/health` | GET | Health check |
| `/api/stats` | GET | Statistiques tenant |

### Exemple de requête RAG

```bash
curl -X POST http://localhost:3000/api/rag/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Quelle est la politique de remboursement ?",
    "tenant_id": "your-tenant-uuid",
    "language": "fr",
    "options": {
      "top_k": 5,
      "provider": "google",
      "model": "gemini-2.0-flash-exp"
    }
  }'
```

## Architecture

```
src/
├── app/
│   ├── api/           # API Routes
│   ├── dashboard/     # Dashboard UI
│   └── page.tsx       # Landing page
├── components/
│   ├── rag/           # Composants RAG
│   └── ui/            # Composants UI
├── lib/
│   ├── rag/           # Services RAG
│   │   ├── pipeline.ts
│   │   ├── retriever.ts
│   │   ├── reranker.ts
│   │   ├── llm-service.ts
│   │   └── faithfulness.ts
│   ├── observability/ # Datadog
│   ├── supabase/      # Clients Supabase
│   └── utils/         # Utilitaires
└── types/             # Types TypeScript
```

## Observabilité

### Métriques Datadog

- `rag.retrieval.success_rate` - Taux de succès retrieval
- `rag.retrieval.latency_ms` - Latence retrieval
- `llm.response.faithfulness_score` - Score de fidélité
- `rag.abstention.rate` - Taux d'abstention
- `rag.cost_per_request` - Coût par requête

### Alertes

| Priorité | Condition | Seuil |
|----------|-----------|-------|
| P1 | Faithfulness score | < 0.75 (30min) |
| P1 | Retrieval success rate | < 90% (5min) |
| P2 | Retrieval latency p95 | > 500ms |
| P2 | LLM latency p95 | > 1000ms |

## Documentation

- [**Guide de Test**](./docs/TESTING.md) - Comment tester le système
- [Architecture détaillée](./docs/ARCHITECTURE.md)
- [Runbooks](./docs/runbooks/)
- [Prompts de production](./prompts/production.md)

## Licence

MIT
