# Architecture RAGGuard

## Vue d'Ensemble

RAGGuard est un système RAG (Retrieval-Augmented Generation) production-ready avec observabilité Datadog intégrée.

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT                                     │
│                    (Next.js Frontend)                                │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      API GATEWAY                                     │
│            ┌─────────────────────────────┐                          │
│            │   JWT/RBAC Authentication   │                          │
│            │   Rate Limiting             │                          │
│            │   Trace ID Generation       │                          │
│            └─────────────────────────────┘                          │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      RAG PIPELINE                                    │
│                                                                      │
│  ┌──────────┐   ┌──────────┐   ┌─────────┐   ┌──────────────────┐  │
│  │ Retriever│──▶│ Reranker │──▶│ Context │──▶│ LLM Generation   │  │
│  │          │   │          │   │Processor│   │ (Google Gemini)  │  │
│  └──────────┘   └──────────┘   └─────────┘   └──────────────────┘  │
│       │                                               │              │
│       ▼                                               ▼              │
│  ┌──────────┐                                 ┌──────────────────┐  │
│  │ BM25 +   │                                 │ Faithfulness     │  │
│  │ Vector   │                                 │ Validation       │  │
│  └──────────┘                                 └──────────────────┘  │
│                                                       │              │
│                                                       ▼              │
│                                               ┌──────────────────┐  │
│                                               │ Self-RAG /       │  │
│                                               │ Abstention       │  │
│                                               └──────────────────┘  │
└─────────────────────────┬───────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  Supabase   │   │   Datadog   │   │   LLM       │
│  (Postgres) │   │   (APM)     │   │   Providers │
│  + pgvector │   │             │   │             │
└─────────────┘   └─────────────┘   └─────────────┘
```

---

## Composants Principaux

### 1. API Layer (`/src/app/api/`)

| Route | Méthode | Description |
|-------|---------|-------------|
| `/api/rag/query` | POST | Requête RAG principale |
| `/api/documents` | GET/POST/DELETE | Gestion des documents |
| `/api/health` | GET | Health check |
| `/api/stats` | GET | Statistiques tenant |

### 2. Retriever (`/src/lib/rag/retriever.ts`)

**Fonctionnalités:**
- Recherche lexicale (trigrams PostgreSQL)
- Recherche vectorielle (pgvector + HNSW)
- Fusion RRF (Reciprocal Rank Fusion)
- Pre-filtering par métadonnées

**Algorithme de fusion:**
```
score_final = lexical_weight * (1 / (k + rank_lexical)) 
            + vector_weight * (1 / (k + rank_vector))
```

### 3. Reranker (`/src/lib/rag/reranker.ts`)

**Méthode:**
- Cross-encoder LLM (gpt-4o-mini)
- Scoring de pertinence 0-1
- Sélection Top K optimale

### 4. Context Processor (`/src/lib/rag/context-processor.ts`)

**Fonctionnalités:**
- Déduplication des chunks similaires
- Token budgeting (limite à 4000 tokens)
- Formatage avec métadonnées sources
- Highlighting des passages pertinents

### 5. LLM Service (`/src/lib/rag/llm-service.ts`)

**Providers supportés:**
| Provider | Modèle par défaut | Statut |
|----------|-------------------|--------|
| Google | gemini-2.0-flash-exp | **Défaut** |
| OpenAI | gpt-4o | Backup |
| Anthropic | claude-3-5-sonnet | Alternative |
| Groq | llama-3.1-70b | Fast |

### 6. Faithfulness Validator (`/src/lib/rag/faithfulness.ts`)

**Métriques:**
- Score de fidélité (0-1)
- Détection d'hallucinations
- Classification des problèmes

**Seuils:**
- `>= 0.75`: Réponse validée
- `0.5 - 0.75`: Self-RAG (retry)
- `< 0.5`: Abstention

### 7. Observability (`/src/lib/observability/datadog.ts`)

**Traces APM:**
- `api.request`
- `retrieval.lexical`
- `retrieval.vector`
- `retrieval.rerank`
- `context.chunking`
- `llm.call`
- `validation.faithfulness`

**Métriques:**
- `rag.retrieval.success_rate`
- `rag.retrieval.latency_ms`
- `llm.response.faithfulness_score`
- `rag.abstention.rate`
- `rag.cost_per_request`

---

## Base de Données (Supabase)

### Tables

```sql
-- Tenants (multi-tenancy)
tenants (id, name, slug, settings)

-- Documents
documents (id, tenant_id, title, content, metadata, language, domain)

-- Chunks avec embeddings
document_chunks (id, document_id, tenant_id, content, embedding, token_count)

-- Logs de requêtes RAG
rag_queries (id, tenant_id, trace_id, query, faithfulness_score, ...)

-- Rôles utilisateurs
user_roles (id, user_id, tenant_id, role)
```

### Index

- **HNSW** pour recherche vectorielle
- **GIN trigram** pour recherche lexicale
- **B-tree** pour filtres métadonnées

---

## Flux de Données

### Requête RAG

```
1. Client envoie query + tenant_id
2. API génère trace_id
3. Retriever:
   a. Génère embedding de la query
   b. Exécute recherche lexicale + vectorielle en parallèle
   c. Fusionne résultats (RRF)
4. Reranker: Score pertinence des chunks
5. Context Processor: Prépare contexte optimisé
6. LLM: Génère réponse
7. Faithfulness: Valide la réponse
8. Self-RAG: Retry si score insuffisant
9. Logging: Enregistre métriques + logs
10. Response: Retourne réponse + sources + score
```

### Ingestion Document

```
1. Client upload document
2. Calcul checksum (déduplication)
3. Chunking (1000 chars, 200 overlap)
4. Génération embeddings (batch)
5. Stockage chunks + embeddings
6. Mise à jour index_version
```

---

## Sécurité

### Authentification
- JWT via Supabase Auth
- Service Role pour API interne

### Autorisation (RBAC)
- `admin`: Accès complet
- `editor`: CRUD documents
- `viewer`: Lecture seule

### Protection des Données
- Masquage PII dans logs
- Hash des user_id
- RLS PostgreSQL par tenant

---

## Déploiement

### Variables d'Environnement

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# LLM
GOOGLE_API_KEY
OPENAI_API_KEY
ANTHROPIC_API_KEY

# Datadog
DD_API_KEY
DD_APP_KEY
DD_SITE
```

### Infrastructure Recommandée

- **Compute**: Vercel / Railway / Docker
- **Database**: Supabase (Postgres + pgvector)
- **Monitoring**: Datadog
- **Cache** (optionnel): Redis

---

## Performance

### Objectifs SLA

| Métrique | Cible | Alerte |
|----------|-------|--------|
| Latence p95 | < 2s | > 3s |
| Retrieval p95 | < 500ms | > 800ms |
| Fidélité moyenne | > 0.8 | < 0.75 |
| Disponibilité | > 99.5% | < 99% |

### Optimisations

1. **Parallélisation** des recherches lexicale/vectorielle
2. **Cache** des embeddings fréquents
3. **Index HNSW** avec paramètres optimisés (m=16, ef=64)
4. **Pre-filtering** pour réduire l'espace de recherche
5. **Batch processing** pour les embeddings
