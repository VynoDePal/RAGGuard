# Runbook: Hausse de Latence Retrieval

## Alerte P2
**Condition:** `p95(ragguard.rag.retrieval.latency_ms) > 500`

---

## Symptômes
- Temps de réponse utilisateur dégradé
- Latence retrieval au-dessus de 500ms (p95)
- Timeouts potentiels sur les requêtes

---

## Étapes de Diagnostic

### 1. Vérifier l'état de Supabase

```bash
# Dashboard Supabase
# Project > Database > Database Health
```

Vérifier:
- [ ] CPU usage
- [ ] Memory usage
- [ ] Disk I/O
- [ ] Active connections

### 2. Analyser les requêtes lentes

```sql
-- Requêtes lentes (> 500ms)
SELECT 
    query,
    retrieval_latency_ms,
    vector_hits,
    lexical_hits,
    created_at
FROM rag_queries
WHERE retrieval_latency_ms > 500
AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY retrieval_latency_ms DESC
LIMIT 20;
```

### 3. Vérifier l'index HNSW

```sql
-- Taille de l'index
SELECT 
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_indexes
JOIN pg_stat_user_indexes USING (indexrelid)
WHERE tablename = 'document_chunks';

-- Stats de l'index
SELECT * FROM pg_stat_user_indexes 
WHERE relname = 'document_chunks';
```

### 4. Analyser le cache

```sql
-- Hit ratio du cache
SELECT 
    sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as cache_hit_ratio
FROM pg_statio_user_tables
WHERE relname = 'document_chunks';
```

---

## Actions Correctives

### Si fragmentation de l'index

```sql
-- Reconstruire l'index HNSW
REINDEX INDEX CONCURRENTLY idx_document_chunks_embedding;
```

### Si cache inefficace

1. Augmenter le cache Supabase (plan upgrade si nécessaire)
2. Implémenter un cache applicatif:

```typescript
// Ajouter un cache Redis pour les embeddings fréquents
import Redis from 'ioredis'
const redis = new Redis(process.env.REDIS_URL)

async function getCachedEmbedding(query: string): Promise<number[] | null> {
    const cached = await redis.get(`embedding:${hashQuery(query)}`)
    return cached ? JSON.parse(cached) : null
}
```

### Si trop de documents

1. Activer le pre-filtering strict:
```typescript
// Toujours filtrer par tenant + domain
const filters = {
    tenant_id: tenantId,
    domain: request.domain, // Obligatoire
}
```

2. Réduire le Top K initial:
```typescript
topK: 3, // Réduire de 5 à 3
```

### Si surcharge de connexions

```sql
-- Vérifier les connexions actives
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';

-- Killer les connexions idle longues
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE state = 'idle' 
AND query_start < NOW() - INTERVAL '10 minutes';
```

---

## Optimisations Préventives

### 1. Index partiels

```sql
-- Index partiel par tenant actif
CREATE INDEX CONCURRENTLY idx_chunks_active_tenant 
ON document_chunks (tenant_id, embedding)
WHERE tenant_id IN (SELECT id FROM tenants WHERE settings->>'active' = 'true');
```

### 2. Pagination des résultats

```typescript
// Utiliser LIMIT dans les requêtes vectorielles
const { data } = await supabase.rpc('search_chunks_vector', {
    query_embedding: embedding,
    p_limit: 10, // Toujours limiter
    p_tenant_id: tenantId,
})
```

### 3. Parallélisation

```typescript
// Exécuter lexical et vector search en parallèle
const [lexical, vector] = await Promise.all([
    lexicalSearch(query, tenantId),
    vectorSearch(embedding, tenantId),
])
```

---

## Validation Post-Fix

1. Monitorer p95 latency pendant 15 minutes
2. Vérifier que la latence redescend sous 500ms
3. Tester avec des requêtes représentatives
4. Vérifier l'absence d'impact sur la qualité

---

## Escalade

Si le problème persiste:
- Contacter le support Supabase
- Envisager un upgrade de plan
- Activer le mode read-replica si disponible
