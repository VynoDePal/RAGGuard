# Runbook: Échec de Retrieval

## Alerte P1
**Condition:** `avg(last_5m): ragguard.rag.retrieval.success_rate < 0.9`

---

## Symptômes
- Taux de succès retrieval en dessous de 90%
- Nombreuses abstentions
- Erreurs "No documents found"

---

## Étapes de Diagnostic

### 1. Vérifier la connectivité Supabase

```bash
# Health check API
curl -s https://lygrprcknlxdgrltqdqt.supabase.co/rest/v1/ \
  -H "apikey: $SUPABASE_ANON_KEY" | jq .
```

### 2. Analyser les erreurs récentes

```sql
-- Requêtes sans résultats
SELECT 
    query,
    vector_hits,
    lexical_hits,
    created_at
FROM rag_queries
WHERE (vector_hits = 0 AND lexical_hits = 0)
AND created_at > NOW() - INTERVAL '15 minutes'
ORDER BY created_at DESC
LIMIT 20;
```

### 3. Vérifier l'état des embeddings

```sql
-- Chunks sans embedding
SELECT COUNT(*) as missing_embeddings
FROM document_chunks 
WHERE embedding IS NULL;

-- Distribution par tenant
SELECT 
    tenant_id,
    COUNT(*) as total,
    COUNT(embedding) as with_embedding
FROM document_chunks
GROUP BY tenant_id;
```

### 4. Tester le service d'embedding

```bash
# Test API OpenAI embeddings
curl https://api.openai.com/v1/embeddings \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"input": "test", "model": "text-embedding-3-small"}'
```

---

## Actions Correctives

### Si problème de connectivité Supabase

1. Vérifier le status Supabase: https://status.supabase.com
2. Vérifier les credentials:
```bash
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY | head -c 20
```

### Si embeddings manquants

```typescript
// Script de reindexation
async function reindexMissingEmbeddings() {
    const { data: chunks } = await supabase
        .from('document_chunks')
        .select('id, content')
        .is('embedding', null)
        .limit(100)
    
    for (const chunk of chunks) {
        const embedding = await generateEmbedding(chunk.content)
        await supabase
            .from('document_chunks')
            .update({ embedding: formatEmbeddingForPgVector(embedding) })
            .eq('id', chunk.id)
    }
}
```

### Si seuil de similarité trop élevé

```typescript
// Baisser temporairement le seuil
rag: {
    similarityThreshold: 0.5, // Baisser de 0.7 à 0.5
}
```

### Si index corrompu

```sql
-- Reconstruire l'index
DROP INDEX IF EXISTS idx_document_chunks_embedding;

CREATE INDEX idx_document_chunks_embedding ON public.document_chunks 
USING hnsw (embedding extensions.vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

---

## Mode Dégradé

Si le retrieval vectoriel échoue complètement:

```typescript
// Fallback vers recherche lexicale uniquement
async function fallbackSearch(query: string, tenantId: string) {
    const { data } = await supabase
        .from('document_chunks')
        .select('*')
        .eq('tenant_id', tenantId)
        .ilike('content', `%${query}%`)
        .limit(10)
    
    return data
}
```

---

## Validation Post-Fix

1. Monitorer le taux de succès pendant 10 minutes
2. Vérifier que le taux remonte au-dessus de 90%
3. Tester des requêtes variées
4. Confirmer la qualité des résultats

---

## Post-Mortem

Après résolution, documenter:
- Cause racine
- Timeline de l'incident
- Actions prises
- Mesures préventives
