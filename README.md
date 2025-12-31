 # RAGGuard
 
 Un système **Retrieval-Augmented Generation (RAG)** orienté production avec :
 - **Validation de fidélité** (anti-hallucinations)
 - **Self-RAG** (retry automatique quand la fidélité est insuffisante)
 - **Abstention** (refus de répondre si la réponse n’est pas fiable)
 - **Observabilité Datadog** (spans, métriques, logs)
 - **Multi-tenant** (isolation des données par `tenant_id`)
 
 Ce dépôt est un **monorepo** contenant :
 - **Backend/API + mini UI** (Next.js) à la racine (`/src/...`)
 - **Dashboard avancé** séparé dans `dashcraft-app/` (Next.js)
 
 ## Table des matières
 
 - [1. Stack & objectifs](#1-stack--objectifs)
 - [2. Architecture globale](#2-architecture-globale)
 - [3. Structure du dépôt (monorepo)](#3-structure-du-dépôt-monorepo)
 - [4. Démarrage rapide (local)](#4-démarrage-rapide-local)
 - [5. Variables d’environnement](#5-variables-denvironnement)
 - [6. Base de données Supabase / pgvector](#6-base-de-données-supabase--pgvector)
 - [7. Pipeline RAG (détails)](#7-pipeline-rag-détails)
 - [8. API Reference](#8-api-reference)
 - [9. Observabilité (Datadog)](#9-observabilité-datadog)
 - [10. Déploiement (Netlify)](#10-déploiement-netlify)
 - [11. Tests](#11-tests)
 - [12. Sécurité & multi-tenant](#12-sécurité--multi-tenant)
 - [13. Troubleshooting & runbooks](#13-troubleshooting--runbooks)
 - [14. Limitations connues / Roadmap](#14-limitations-connues--roadmap)
 - [Licence](#licence)
 
 ## 1. Stack & objectifs
 
 - **Backend/API**
   - **Next.js** `16.0.7` (API Routes + pages)
   - **TypeScript**
   - **Supabase** (PostgreSQL + `pgvector`) via `@supabase/ssr` et `@supabase/supabase-js`
 - **Front (mini UI)**
   - **React** `19.x` + Tailwind
   - `/dashboard` (chat + stats simplifiées)
 - **Dashboard avancé (monorepo)**
   - `dashcraft-app/` : **Next.js** `15.4.10` + `next-intl`
 - **LLM**
   - Génération : Google Gemini (par défaut) / OpenAI / Anthropic / Groq
   - Reranking & validation fidélité : **OpenAI** (modèle `gpt-4o-mini`)
 - **Observabilité**
   - Envoi HTTP vers Datadog : métriques, logs, spans
   
 Objectif : fournir une base “production-like” pour une API RAG (ingestion de documents + requêtes) avec **mesure**, **traçabilité** et **garde-fous** contre les hallucinations.
 
 ## 2. Architecture globale
 
 Flux principal d’une requête RAG (`POST /api/rag/query`) :
 
 1. **Validation** de la requête (Zod)
 2. **Création d’un `trace_id`** (pour Datadog + debugging)
 3. **Retriever** (hybride) :
    - Embedding de la requête
    - Recherche lexicale + recherche vectorielle en parallèle
    - Fusion des résultats (RRF)
 4. **Reranker** (LLM cross-encoder) : rescoring de la pertinence
 5. **Context processor** : déduplication + budget tokens + formatage du contexte
 6. **LLM** : génération de réponse guidée par des prompts “stricts”
 7. **Faithfulness validator** : score de fidélité `0..1`
 8. **Self-RAG** : retry si score dans une zone “moyenne”, sinon abstention
 9. **Logging** : insertion dans `rag_queries` + métriques/logs Datadog
 
 Références code :
 - Orchestrateur : `src/lib/rag/pipeline.ts`
 - Recherche : `src/lib/rag/retriever.ts`
 - Reranking : `src/lib/rag/reranker.ts`
 - Contexte : `src/lib/rag/context-processor.ts`
 - LLM : `src/lib/rag/llm-service.ts`
 - Fidélité : `src/lib/rag/faithfulness.ts`
 - Observabilité : `src/lib/observability/datadog.ts`
 
 ## 3. Structure du dépôt (monorepo)
 
 ```text
 RAGGuard/
 ├── src/                       # App Next.js (API + mini UI)
 │   ├── app/
 │   │   ├── api/                # Endpoints REST (Next.js route handlers)
 │   │   ├── dashboard/          # Mini dashboard (chat + stats)
 │   │   └── page.tsx            # Landing page
 │   ├── components/             # UI + composants RAG
 │   ├── lib/
 │   │   ├── rag/                # Pipeline RAG
 │   │   ├── observability/      # Datadog service
 │   │   ├── supabase/           # Clients server/browser + middleware
 │   │   └── utils/              # Utils + tokens
 │   └── types/                  # Types métier + Zod schemas + Database types
 ├── dashcraft-app/              # Dashboard avancé (se connecte au backend)
 ├── docs/                       # Architecture / tests / runbooks
 ├── prompts/                    # Prompts de production versionnés
 ├── netlify.toml                # Netlify backend config
 ├── deploy-netlify.sh           # Déploiement via Netlify CLI
 ├── start-dev.js                # Lance backend + dashboard (ports 3000/3001)
 └── start-dev.sh
 ```
 
 ## 4. Démarrage rapide (local)
 
 ### 4.1 Prérequis
 
 - **Node.js** : recommandé `20.x` (aligné avec Netlify)
 - Un projet **Supabase** (Postgres + `pgvector`) avec :
   - tables : `tenants`, `documents`, `document_chunks`, `rag_queries`, `user_roles`
   - RPC : `search_chunks_vector`, `get_tenant_stats` (et autres, voir plus bas)
 - Clés LLM :
   - **`OPENAI_API_KEY` est requise** (reranking + validation fidélité utilisent OpenAI)
   - `GOOGLE_API_KEY` recommandée si vous utilisez Gemini en génération
 
 ### 4.2 Installation
 
 ```bash
 npm install
 cp .env.example .env.local
 ```
 
 ### 4.3 Configurer `.env.local`
 
 Basez-vous sur `.env.example` et complétez les secrets (voir section [5](#5-variables-denvironnement)).
 
 ### 4.4 Lancer le backend (API + mini UI)
 
 ```bash
 npm run dev
 ```
 
 Accès :
 - UI (landing) : `http://localhost:3000/`
 - Mini dashboard : `http://localhost:3000/dashboard`
 - API : `http://localhost:3000/api/...`
 
 ### 4.5 Lancer backend + dashboard avancé (monorepo)
 
 Option A (script Node) :
 
 ```bash
 npm run dev:both
 ```
 
 Option B (script bash) :
 
 ```bash
 npm run dev:both:sh
 ```
 
 Accès :
 - Backend : `http://localhost:3000`
 - Dashboard avancé : `http://localhost:3001`
 
 ## 5. Variables d’environnement
 
 Les variables sont lues via `src/lib/config.ts` (avec des `!` : en production, **définissez-les toutes**).
 
 ### 5.1 Backend (racine)
 
 Exemple (voir `.env.example`) :
 
 ```bash
 # Supabase
 NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
 NEXT_PUBLIC_SUPABASE_ANON_KEY=...
 SUPABASE_SERVICE_ROLE_KEY=...
 
 # LLM Providers
 GOOGLE_API_KEY=...
 OPENAI_API_KEY=...
 ANTHROPIC_API_KEY=...
 GROQ_API_KEY=...
 
 # Defaults (génération)
 DEFAULT_LLM_PROVIDER=google
 DEFAULT_LLM_MODEL=gemini-2.0-flash-exp
 
 # Embeddings
 EMBEDDING_MODEL=text-embedding-3-small
 EMBEDDING_DIMENSIONS=1536
 
 # RAG
 RAG_TOP_K=5
 RAG_SIMILARITY_THRESHOLD=0.7
 RAG_FAITHFULNESS_THRESHOLD=0.75
 RAG_ABSTENTION_THRESHOLD=0.5
 RAG_MAX_CONTEXT_TOKENS=4000
 RAG_MAX_SELF_RAG_ATTEMPTS=2
 
 # Datadog
 DD_API_KEY=...
 DD_APP_KEY=...
 DD_SITE=datadoghq.eu
 DD_ENV=development
 DD_SERVICE=ragguard
 DD_VERSION=1.0.0
 
 # Security
 JWT_SECRET=...
 HASH_SALT=...
 ```
 
 Notes importantes :
 - **`OPENAI_API_KEY`** : utilisé par
   - `src/lib/rag/reranker.ts` (modèle `gpt-4o-mini`)
   - `src/lib/rag/faithfulness.ts` (modèle `gpt-4o-mini`)
 - **Embeddings** :
   - si `OPENAI_API_KEY` est renseignée (et ne contient pas `your_`), embeddings OpenAI
   - sinon embeddings Google `text-embedding-004`
 
 ### 5.2 Dashboard avancé (`dashcraft-app/`)
 
 Fichier : `dashcraft-app/env.example`
 
 ```bash
 NEXT_PUBLIC_RAG_API_URL=http://localhost:3000
 NEXT_PUBLIC_RAG_TENANT_ID=00000000-0000-0000-0000-000000000001
 ```
 
 ## 6. Base de données Supabase / pgvector
 
 ### 6.1 Tables (aperçu)
 
 Les types générés Supabase se trouvent dans `src/types/database.ts`.
 
 - **`tenants`**
   - **[id]** UUID, **[name]**, **[slug]**, **[settings]** JSON
 - **`documents`**
   - **[id]**, **[tenant_id]**, **[title]**, **[content]**, **[metadata]**, **[language]**, **[domain]**, **[checksum]**, **[source_url]**
 - **`document_chunks`**
   - **[id]**, **[document_id]**, **[tenant_id]**, **[chunk_index]**, **[content]**, **[embedding]**, **[token_count]**, **[metadata]**
 - **`rag_queries`**
   - historise chaque requête : **[trace_id]**, **[query]**, **[response]**, **[faithfulness_score]**, **[abstained]**, latences, coûts, etc.
 - **`user_roles`**
   - **[user_id]**, **[tenant_id]**, **[role]** (`admin|editor|viewer`)
 
 ### 6.2 Fonctions RPC (utilisées / disponibles)
 
 D’après `src/types/database.ts` :
 
 - **`search_chunks_vector`**
   - **Args** :
     - `query_embedding: string` (format pgvector, ex: `"[0.1,0.2,...]"`)
     - `p_tenant_id: string`
     - `p_similarity_threshold?: number`
     - `p_limit?: number`
     - `p_domain?: string`
   - **Returns** : chunks + `similarity`
 - **`search_chunks_hybrid`** (présent côté DB mais non utilisé dans le code actuel)
 - **`get_tenant_stats`**
   - **Args** : `p_tenant_id: string`
   - **Returns** : agrégats (`total_documents`, `total_chunks`, `total_queries`, `avg_faithfulness`, etc.)
 - **`user_has_role`**, **`get_user_tenant_ids`**
 
 ### 6.3 Indices recommandés (extraits des runbooks)
 
 Le projet mentionne l’index HNSW. Exemple (à adapter à votre schéma exact) :
 
 ```sql
 CREATE INDEX idx_document_chunks_embedding ON public.document_chunks
 USING hnsw (embedding extensions.vector_cosine_ops)
 WITH (m = 16, ef_construction = 64);
 ```
 
 Voir :
 - `docs/runbooks/retrieval-failure.md`
 - `docs/runbooks/retrieval-latency.md`
 
 ## 7. Pipeline RAG (détails)
 
 Cette section décrit le comportement **tel qu’implémenté**.
 
 ### 7.1 Contrat d’entrée (RAGRequest)
 
 Endpoint : `POST /api/rag/query`
 
 Champs principaux (`src/types/index.ts`) :
 - **`query`** (string) : question utilisateur
 - **`tenant_id`** (UUID) : tenant ciblé
 - **`language`** (string, défaut `fr`)
 - **`filters`** : filtres métadonnées (tags, category, date...)
 - **`options`** :
   - `top_k` (1..20)
   - `similarity_threshold` (0..1)
   - `max_context_tokens`
   - `provider` / `model`
 
 ### 7.2 Étape 1 — Retrieval (hybride)
 
 Fichier : `src/lib/rag/retriever.ts`
 
 - **Embedding requête** : `generateEmbedding(query)`
 - **Recherche lexicale** : récupération de chunks + scoring “keyword-like”
 - **Recherche vectorielle** : RPC Supabase `search_chunks_vector`
 - **Fusion** : RRF (Reciprocal Rank Fusion)
   - poids par défaut : lexical `0.3`, vectoriel `0.7`
 
 ### 7.3 Étape 2 — Reranking
 
 Fichier : `src/lib/rag/reranker.ts`
 
 - Si `chunks.length <= topK` : skip reranking (économie)
 - Sinon : appel OpenAI `gpt-4o-mini` pour produire un tableau de scores `[0..1]`
 
 ### 7.4 Étape 3 — Context processing
 
 Fichier : `src/lib/rag/context-processor.ts`
 
 - Déduplication (fingerprint + similarité de Jaccard)
 - Budget tokens :
   - réserve : tokens(query) + `500`
   - maximum : `RAG_MAX_CONTEXT_TOKENS` (défaut 4000)
 - Max 8 chunks dans le contexte
 - Format :
 
 ```text
 === Documents de référence ===
 
 [Source 1] <title>
 Pertinence: <score>%
 
 <content>
 ```
 
 ### 7.5 Étape 4 — Génération LLM
 
 Fichier : `src/lib/rag/llm-service.ts`
 
 - Prompt système strict (voir aussi `prompts/production.md`)
 - Support providers : `google | openai | anthropic | groq`
 - `ollama` est présent dans les types mais **non implémenté** dans `LLMService` (actuel).
 
 ### 7.6 Étape 5 — Validation de fidélité
 
 Fichier : `src/lib/rag/faithfulness.ts`
 
 - Évaluation LLM (OpenAI `gpt-4o-mini`) renvoyant un JSON de type :
   - `score` (0..1)
   - `issues[]` (hallucination / unsupported_claim / contradiction / uncertainty)
 - Seuils (config) :
   - **valide** : `score >= RAG_FAITHFULNESS_THRESHOLD` (défaut 0.75)
   - **retry Self-RAG** : `RAG_ABSTENTION_THRESHOLD <= score < RAG_FAITHFULNESS_THRESHOLD`
   - **abstention** : `score < RAG_ABSTENTION_THRESHOLD` (défaut 0.5)
 
 ### 7.7 Self-RAG
 
 Fichier : `src/lib/rag/pipeline.ts`
 
 - Si fidélité moyenne : retry avec `top_k` élargi (+3 à chaque tentative, max 15)
 - Nombre de tentatives : `RAG_MAX_SELF_RAG_ATTEMPTS` (défaut 2)
 
 ## 8. API Reference
 
 Base path : `http://localhost:3000/api`
 
 ### 8.1 `GET /api/health`
 
 Vérifie :
 - connexion Supabase (table `tenants`)
 - variables d’environnement requises (actuellement : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OPENAI_API_KEY`)
 
 Réponse :
 - `status: healthy|degraded`
 - `checks: { supabase: {status, latency_ms}, environment: {status, error?} }`
 
 ### 8.2 `POST /api/rag/query`
 
 Corps : conforme à `RAGRequestSchema`.
 
 Headers utiles :
 - `x-user-id` (optionnel) : l’API hash ce user id et l’insère dans `rag_queries.user_id_hash`
 
 Réponse : `RAGResponse` :
 - `trace_id`
 - `answer`
 - `sources[]`
 - `faithfulness_score`
 - `abstained`
 - `metrics` (latences, tokens, coût, self_rag_attempts)
 
 Exemple :
 
 ```bash
 curl -s -X POST "http://localhost:3000/api/rag/query" \
   -H "Content-Type: application/json" \
   -H "x-user-id: user_123" \
   -d '{
     "query": "Quel est le délai de remboursement ?",
     "tenant_id": "00000000-0000-0000-0000-000000000001",
     "language": "fr",
     "options": { "top_k": 5, "include_sources": true }
   }' | jq
 ```
 
 ### 8.3 `GET /api/documents?tenant_id=...`
 
 Query params :
 - `tenant_id` (required)
 - `page` (default 1)
 - `limit` (default 20)
 
 Réponse :
 - `documents[]`
 - `pagination`
 
 ### 8.4 `POST /api/documents`
 
 Corps : `DocumentUploadSchema`
 - `tenant_id`, `title`, `content` (required)
 - `metadata`, `language`, `domain`, `source_url` (optional)
 
 Traitement :
 - checksum (déduplication)
 - chunking (`chunkSize=1000`, `overlap=200`)
 - embeddings
 - insertion dans `documents` puis `document_chunks`
 
 ### 8.5 `DELETE /api/documents?id=<documentId>`
 
 Supprime un document (suppression cascade des chunks côté DB).
 
 ### 8.6 `GET /api/stats?tenant_id=...`
 
 - appelle `get_tenant_stats(p_tenant_id)`
 - calcule tendances sur les 24 dernières heures à partir de `rag_queries`
 
 ### 8.7 `GET /api/queries?tenant_id=...`
 
 Liste l’historique des requêtes RAG (`rag_queries`) pour un tenant.
 
 ### 8.8 `GET /api/monitoring?tenant_id=...&include_health=true|false`
 
 Calcule des métriques sur les 24h (latences, coût, fidélité, abstention, succès) + checks de santé optionnels.
 
 ### 8.9 `GET /api/monitoring/datadog`
 
 Permet de requêter Datadog (si configuré) :
 - `tenant_id` (required)
 - `metric` (required) ex: `ragguard.rag.retrieval.latency_ms`
 - `from` / `to` (timestamps en secondes)
 
 ## 9. Observabilité (Datadog)
 
 Code : `src/lib/observability/datadog.ts`
 
 ### 9.1 Spans
 
 - `api.request`
 - `retrieval.embedding`
 - `retrieval.lexical`
 - `retrieval.vector`
 - `retrieval.rerank`
 - `context.chunking`
 - `llm.call`
 - `validation.faithfulness`
 
 ### 9.2 Métriques
 
 Les métriques sont préfixées par `DD_SERVICE` (défaut `ragguard`).
 Exemples de noms effectifs :
 - `ragguard.rag.retrieval.success_rate`
 - `ragguard.rag.retrieval.latency_ms`
 - `ragguard.llm.response.latency_ms`
 - `ragguard.llm.response.faithfulness_score`
 - `ragguard.rag.abstention.rate`
 - `ragguard.rag.cost_per_request`
 
 ### 9.3 Runbooks & alerting
 
 - `docs/runbooks/retrieval-failure.md` (P1)
 - `docs/runbooks/faithfulness-drop.md` (P1)
 - `docs/runbooks/retrieval-latency.md` (P2)
 
 ## 10. Déploiement (Netlify)
 
 Deux sites Netlify sont prévus (voir `DEPLOYMENT_STATUS.md`) :
 - Backend : `ragguard-backend-api`
 - Dashboard : `ragguard-dashboard`
 
 Config :
 - Backend : `netlify.toml` (build racine)
 - Dashboard : `dashcraft-app/netlify.toml` (base `dashcraft-app`)
 
 Guide :
 - `NETLIFY_DEPLOYMENT.md`
 - `DEPLOYMENT_STATUS.md`
 
 ## 11. Tests
 
 - Guide E2E / cURL : `docs/TESTING.md`
 - Dashboard avancé : `dashcraft-app/` inclut Vitest + Playwright (scripts dans `dashcraft-app/package.json`).
 
 ## 12. Sécurité & multi-tenant
 
 - **Multi-tenant** : toutes les entités clés sont filtrées par `tenant_id`.
 - **Hash user id** : `hashUserId(user_id)` stocké en base (privacy).
 - **Sanitization logs** : masquage d’emails/tel/SSN/CB/IP dans les logs (`sanitizeForLogging`).
 - **CORS** : configuré via `next.config.ts`, middleware Next et `netlify.toml`.
 
 Note : certaines routes utilisent `SUPABASE_SERVICE_ROLE_KEY` (bypass RLS). Pour une production stricte, appliquez RLS + vérifications de rôle côté API (`user_has_role`).
 
 ## 13. Troubleshooting & runbooks
 
 - **Retrieval sans résultats** : voir `docs/runbooks/retrieval-failure.md`
 - **Latence retrieval** : voir `docs/runbooks/retrieval-latency.md`
 - **Baisse de fidélité** : voir `docs/runbooks/faithfulness-drop.md`
 
 Debug rapide :
 - `GET /api/health`
 - vérifier les env vars
 - vérifier `document_chunks.embedding IS NULL`
 
 ## 14. Limitations connues / Roadmap
 
 - **BM25** : la “recherche lexicale” actuelle est un scoring simple côté app (pas du BM25 natif).
 - **Sources persistées** : l’historisation dans `rag_queries.sources` n’est pas un format riche exploitable partout (amélioration recommandée).
 - **`ollama`** : présent dans les types mais non supporté dans `LLMService`.
 - **RBAC** : base DB présente, mais enforcement API à renforcer.
 
 ## Licence
 
 MIT
